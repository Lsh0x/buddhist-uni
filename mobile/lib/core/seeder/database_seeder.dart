import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:objectbox/objectbox.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/study_plan.dart';
import '../../models/sutta.dart';
import '../database/objectbox_store.dart';

/// Seeding state exposed to the UI.
sealed class SeedState {
  const SeedState();
}

class SeedIdle extends SeedState {
  const SeedIdle();
}

class SeedRunning extends SeedState {
  final String message;
  final double progress; // 0.0 – 1.0
  const SeedRunning(this.message, this.progress);
}

class SeedDone extends SeedState {
  const SeedDone();
}

class SeedError extends SeedState {
  final String error;
  const SeedError(this.error);
}

// ─── Provider ──────────────────────────────────────────────────────────────

final seederProvider =
    StateNotifierProvider<DatabaseSeeder, SeedState>((ref) {
  return DatabaseSeeder(
    ref.watch(objectBoxStoreProvider),
    ref.watch(sharedPrefsProvider),
  );
});

// ─── Seeder ────────────────────────────────────────────────────────────────

/// Imports sutta texts + embeddings from bundled assets into ObjectBox.
///
/// Runs once on first launch. Progress is streamed to [SeedState] so the
/// splash screen can show a progress bar.
class DatabaseSeeder extends StateNotifier<SeedState> {
  static const _seedKey = 'db_seeded_v1';
  static const _batchSize = 100;

  final ObjectBoxStore _store;
  final dynamic _prefs; // SharedPreferences

  DatabaseSeeder(this._store, this._prefs) : super(const SeedIdle());

  bool get isSeeded => _prefs.getBool(_seedKey) == true;

  Future<void> seed() async {
    if (isSeeded) {
      state = const SeedDone();
      return;
    }

    try {
      state = const SeedRunning('Loading sutta data…', 0.0);

      // 1. Load suttas metadata JSON
      final suttasRaw =
          await rootBundle.loadString('assets/data/suttas_seed.json');
      final suttasList = jsonDecode(suttasRaw) as List<dynamic>;
      final total = suttasList.length;

      // 2. Load embeddings binary (float32, 384 dims per sutta, same order)
      final embeddingsData =
          await rootBundle.load('assets/data/embeddings.bin');
      final bytes = embeddingsData.buffer.asFloat32List();
      const dims = 384;

      state = SeedRunning('Importing $total suttas…', 0.02);

      // 3. Insert in batches
      final box = _store.suttas;
      var inserted = 0;

      for (var batchStart = 0;
          batchStart < total;
          batchStart += _batchSize) {
        final batchEnd = (batchStart + _batchSize).clamp(0, total);
        final batch = <Sutta>[];

        for (var i = batchStart; i < batchEnd; i++) {
          final raw = suttasList[i] as Map<String, dynamic>;
          final sutta = Sutta()
            ..suttaId = raw['sutta_id'] as String
            ..nikaya = raw['nikaya'] as String
            ..nikayaName = raw['nikaya_name'] as String? ?? ''
            ..title = raw['title'] as String? ?? ''
            ..blurb = raw['blurb'] as String? ?? ''
            ..textJson = jsonEncode(raw['text'] ?? [])
            ..clusterId = raw['cluster_id'] as int? ?? -1
            ..wordCount = raw['word_count'] as int? ?? 0
            ..embedding = _extractEmbedding(bytes, i, dims);
          batch.add(sutta);
        }

        box.putMany(batch);
        inserted += batch.length;
        state = SeedRunning(
          'Importing suttas… ($inserted / $total)',
          0.02 + 0.78 * inserted / total,
        );
      }

      // 4. Load study plans
      state = const SeedRunning('Importing study plans…', 0.82);
      await _importStudyPlans();

      // 5. Mark done
      await _prefs.setBool(_seedKey, true);
      state = const SeedDone();
    } catch (e, st) {
      state = SeedError('Seeding failed: $e\n$st');
    }
  }

  Future<void> _importStudyPlans() async {
    final raw = await rootBundle.loadString('assets/data/study_plans.json');
    final plans = jsonDecode(raw) as List<dynamic>;
    final box = _store.studyPlans;

    final entities = plans.map((p) {
      final m = p as Map<String, dynamic>;
      final suttaOrder = (m['suttas'] as List<dynamic>)
          .map((s) => (s as Map<String, dynamic>)['sutta_id'] as String)
          .toList();

      return StudyPlan()
        ..clusterId = m['cluster_id'] as int
        ..name = m['name'] as String
        ..description = m['description'] as String? ?? ''
        ..themeCategory = m['theme_category'] as String? ?? ''
        ..suttaOrderJson = jsonEncode(suttaOrder)
        ..size = m['size'] as int? ?? 0
        ..readingMinutes = m['reading_minutes'] as int? ?? 0;
    }).toList();

    box.putMany(entities);
  }

  /// Extracts the 384-dim float32 vector for sutta at [index].
  List<double> _extractEmbedding(
      Float32List bytes, int index, int dims) {
    final start = index * dims;
    return List<double>.generate(
        dims, (i) => bytes[start + i].toDouble());
  }
}
