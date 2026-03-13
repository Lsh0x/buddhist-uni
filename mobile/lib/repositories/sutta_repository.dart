import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:objectbox/objectbox.dart';

import '../core/database/objectbox_store.dart';
import '../core/embedder/embedder.dart';
import '../models/sutta.dart';
import '../objectbox.g.dart';

class SuttaRepository {
  final Box<Sutta> _box;
  final Embedder _embedder;

  SuttaRepository(this._box, this._embedder);

  // ─── Lookups ─────────────────────────────────────────────────────────────

  Sutta? getById(String suttaId) {
    final q = _box
        .query(Sutta_.suttaId.equals(suttaId))
        .build();
    final result = q.findFirst();
    q.close();
    return result;
  }

  List<Sutta> getByNikaya(String nikaya) {
    final q = _box
        .query(Sutta_.nikaya.equals(nikaya))
        .order(Sutta_.suttaId)
        .build();
    final result = q.find();
    q.close();
    return result;
  }

  List<Sutta> getByCluster(int clusterId) {
    final q = _box
        .query(Sutta_.clusterId.equals(clusterId))
        .build();
    final result = q.find();
    q.close();
    return result;
  }

  // ─── Semantic search ─────────────────────────────────────────────────────

  /// Encodes [query] with TFLite, then runs ObjectBox HNSW nearest-neighbour.
  Future<List<SuttaSearchResult>> search(
    String query, {
    int limit = 20,
    String? nikayaFilter,
  }) async {
    final vector = await _embedder.encode(query);

    final qb = _box.query(
      Sutta_.embedding.nearestNeighborsF32(vector, limit * 2),
    );

    if (nikayaFilter != null) {
      qb.and(Sutta_.nikaya.equals(nikayaFilter));
    }

    final q = qb.build()
      ..limit = limit;

    final suttas = q.find();
    final scores = q.findWithScores();
    q.close();

    return scores.map((s) {
      // ObjectBox returns squared distances for cosine; convert to similarity
      final similarity = 1.0 - (s.score / 2.0).clamp(0.0, 1.0);
      return SuttaSearchResult(sutta: s.object, score: similarity);
    }).toList();
  }

  // ─── Text segments ───────────────────────────────────────────────────────

  /// Returns parsed segments from the stored JSON field.
  List<SuttaSegment> getSegments(Sutta sutta) {
    final raw = jsonDecode(sutta.textJson) as List<dynamic>;
    return raw
        .map((s) => SuttaSegment(
              segmentId: s['segment_id'] as String? ?? '',
              text: s['text'] as String? ?? '',
            ))
        .toList();
  }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────

class SuttaSearchResult {
  final Sutta sutta;
  final double score; // 0.0 – 1.0

  const SuttaSearchResult({required this.sutta, required this.score});
}

class SuttaSegment {
  final String segmentId;
  final String text;

  const SuttaSegment({required this.segmentId, required this.text});
}

// ─── Provider ─────────────────────────────────────────────────────────────

final suttaRepositoryProvider = Provider<SuttaRepository>((ref) {
  return SuttaRepository(
    ref.watch(suttaBoxProvider),
    ref.watch(embedderProvider),
  );
});
