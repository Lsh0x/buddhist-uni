import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

import 'embedder.dart';
import 'wordpiece_tokenizer.dart';

/// TFLite-based encoder using all-MiniLM-L6-v2.
///
/// Model inputs (int32, shape [1, 128]):
///   0 → input_ids
///   1 → attention_mask
///   2 → token_type_ids
///
/// Model output (float32, shape [1, 128, 384]):
///   → last hidden state; we mean-pool attended tokens → 384-dim vector
class TfliteEmbedder implements Embedder {
  static const _modelAsset = 'assets/model/all-MiniLM-L6-v2.tflite';
  static const _vocabAsset = 'assets/model/vocab.txt';
  static const _maxLength = 128;
  static const _dims = 384;

  Interpreter? _interpreter;
  WordpieceTokenizer? _tokenizer;

  Future<void> _init() async {
    if (_interpreter != null) return;

    // Load vocab
    final vocabRaw = await rootBundle.loadString(_vocabAsset);
    _tokenizer = WordpieceTokenizer(vocabRaw.split('\n'));

    // Load TFLite model
    _interpreter = await Interpreter.fromAsset(
      _modelAsset,
      options: InterpreterOptions()..threads = 2,
    );
  }

  @override
  Future<List<double>> encode(String text) async {
    await _init();

    final encoded = _tokenizer!.encode(text, maxLength: _maxLength);

    // Build int32 tensors shaped [1, 128]
    final inputIds = _toTensor(encoded['input_ids']!);
    final attentionMask = _toTensor(encoded['attention_mask']!);
    final tokenTypeIds = _toTensor(encoded['token_type_ids']!);

    // Output: last hidden state [1, 128, 384]
    final outputBuffer = List.generate(
      1,
      (_) => List.generate(_maxLength, (_) => List<double>.filled(_dims, 0.0)),
    );

    _interpreter!.runForMultipleInputs(
      [inputIds, attentionMask, tokenTypeIds],
      {0: outputBuffer},
    );

    // Mean-pool over attended tokens
    final mask = encoded['attention_mask']!;
    return _meanPool(outputBuffer[0], mask);
  }

  @override
  Future<void> dispose() async {
    _interpreter?.close();
    _interpreter = null;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  List<List<int>> _toTensor(List<int> ids) =>
      [List<int>.from(ids)];

  /// Mean pool the hidden states for non-padding tokens, then L2-normalise.
  List<double> _meanPool(List<List<double>> hidden, List<int> mask) {
    final pooled = List<double>.filled(_dims, 0.0);
    var count = 0;

    for (var t = 0; t < _maxLength; t++) {
      if (mask[t] == 0) continue;
      count++;
      for (var d = 0; d < _dims; d++) {
        pooled[d] += hidden[t][d];
      }
    }

    if (count > 0) {
      for (var d = 0; d < _dims; d++) {
        pooled[d] /= count;
      }
    }

    return _l2Normalize(pooled);
  }

  List<double> _l2Normalize(List<double> v) {
    var norm = 0.0;
    for (final x in v) {
      norm += x * x;
    }
    norm = sqrt(norm);
    if (norm == 0) return v;
    return v.map((x) => x / norm).toList();
  }
}
