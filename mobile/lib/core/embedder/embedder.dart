import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'tflite_embedder.dart';

/// Abstract interface so the embedding backend can be swapped
/// (TFLite → ONNX, remote API, etc.) without changing callers.
abstract class Embedder {
  /// Encode [text] into a unit-normalised float vector (384 dims).
  Future<List<double>> encode(String text);

  Future<void> dispose();
}

// ─── Provider ─────────────────────────────────────────────────────────────

final embedderProvider = Provider<Embedder>((ref) {
  final embedder = TfliteEmbedder();
  ref.onDispose(embedder.dispose);
  return embedder;
});
