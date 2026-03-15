import 'dart:math';

/// Minimal BERT WordPiece tokenizer.
///
/// Handles: lowercasing, basic whitespace/punctuation splitting,
/// WordPiece subword segmentation, [CLS]/[SEP] framing, padding/truncation.
///
/// Vocabulary must be loaded from `assets/model/vocab.txt`
/// (one token per line, line number = token id).
class WordpieceTokenizer {
  static const int _clsId = 101; // [CLS]
  static const int _sepId = 102; // [SEP]
  static const int _padId = 0;   // [PAD]
  static const int _unkId = 100; // [UNK]

  final Map<String, int> _vocab;

  WordpieceTokenizer(List<String> vocabLines)
      : _vocab = {
          for (var i = 0; i < vocabLines.length; i++) vocabLines[i].trim(): i,
        };

  /// Returns {input_ids, attention_mask, token_type_ids} each as int32 List.
  Map<String, List<int>> encode(String text, {int maxLength = 128}) {
    final tokens = _tokenize(text.toLowerCase());

    // Truncate to maxLength - 2 ([CLS] + [SEP])
    final clipped = tokens.take(maxLength - 2).toList();

    final ids = [_clsId, ...clipped.map(_toId), _sepId];
    final seqLen = ids.length;

    final inputIds = List<int>.filled(maxLength, _padId);
    final attentionMask = List<int>.filled(maxLength, 0);
    final tokenTypeIds = List<int>.filled(maxLength, 0);

    for (var i = 0; i < seqLen; i++) {
      inputIds[i] = ids[i];
      attentionMask[i] = 1;
    }

    return {
      'input_ids': inputIds,
      'attention_mask': attentionMask,
      'token_type_ids': tokenTypeIds,
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────

  List<String> _tokenize(String text) {
    final words = _basicTokenize(text);
    final subwords = <String>[];
    for (final word in words) {
      subwords.addAll(_wordpiece(word));
    }
    return subwords;
  }

  /// Splits on whitespace + basic punctuation.
  List<String> _basicTokenize(String text) {
    final result = <String>[];
    final buf = StringBuffer();

    for (final ch in text.runes) {
      final c = String.fromCharCode(ch);
      if (_isWhitespace(ch)) {
        if (buf.isNotEmpty) {
          result.add(buf.toString());
          buf.clear();
        }
      } else if (_isPunctuation(ch)) {
        if (buf.isNotEmpty) {
          result.add(buf.toString());
          buf.clear();
        }
        result.add(c);
      } else {
        buf.write(c);
      }
    }
    if (buf.isNotEmpty) result.add(buf.toString());
    return result;
  }

  /// Standard WordPiece algorithm.
  List<String> _wordpiece(String word) {
    if (word.length > 200) return [word];

    final subwords = <String>[];
    var start = 0;
    var failed = false;

    while (start < word.length) {
      var end = word.length;
      String? found;

      while (start < end) {
        final substr =
            (start == 0 ? '' : '##') + word.substring(start, end);
        if (_vocab.containsKey(substr)) {
          found = substr;
          break;
        }
        end--;
      }

      if (found == null) {
        failed = true;
        break;
      }
      subwords.add(found);
      start = end;
    }

    return failed ? ['[UNK]'] : subwords;
  }

  int _toId(String token) => _vocab[token] ?? _unkId;

  static bool _isWhitespace(int ch) =>
      ch == 0x20 || ch == 0x09 || ch == 0x0A || ch == 0x0D;

  static bool _isPunctuation(int ch) {
    if (ch >= 33 && ch <= 47) return true;
    if (ch >= 58 && ch <= 64) return true;
    if (ch >= 91 && ch <= 96) return true;
    if (ch >= 123 && ch <= 126) return true;
    return false;
  }
}
