import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:objectbox/objectbox.dart';

import '../core/database/objectbox_store.dart';
import '../models/note.dart';
import '../objectbox.g.dart';

class NotesRepository {
  final Box<Note> _box;

  NotesRepository(this._box);

  // ─── CRUD ─────────────────────────────────────────────────────────────

  Note save(Note note) {
    note.updatedAt = DateTime.now();
    _box.put(note);
    return note;
  }

  void delete(int noteId) => _box.remove(noteId);

  List<Note> all() => _box.getAll()
    ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

  // ─── Filtered queries ─────────────────────────────────────────────────

  List<Note> forSutta(String suttaId) {
    final q = _box
        .query(Note_.suttaId.equals(suttaId))
        .order(Note_.createdAt, flags: Order.descending)
        .build();
    final result = q.find();
    q.close();
    return result;
  }

  List<Note> forCluster(int clusterId) {
    final q = _box
        .query(Note_.clusterId.equals(clusterId))
        .order(Note_.createdAt, flags: Order.descending)
        .build();
    final result = q.find();
    q.close();
    return result;
  }

  /// Returns all distinct nikāyas that have at least one attached note.
  List<String> nikayasWithNotes() {
    final all = _box.getAll();
    return all
        .where((n) => n.suttaId != null)
        .map((n) => n.suttaId!.replaceAll(RegExp(r'\d.*'), ''))
        .toSet()
        .toList()
      ..sort();
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────

final notesRepositoryProvider = Provider<NotesRepository>((ref) {
  return NotesRepository(ref.watch(noteBoxProvider));
});
