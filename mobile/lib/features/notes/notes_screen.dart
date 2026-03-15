import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/note.dart';
import '../../repositories/notes_repository.dart';

// ─── Filter state ──────────────────────────────────────────────────────────

enum NoteFilter { all, bySutta, byPlan }

final _filterProvider = StateProvider<NoteFilter>((ref) => NoteFilter.all);
final _searchProvider = StateProvider<String>((ref) => '');

// ─── Screen ────────────────────────────────────────────────────────────────

class NotesScreen extends ConsumerWidget {
  const NotesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(_filterProvider);
    final search = ref.watch(_searchProvider);
    final repo = ref.watch(notesRepositoryProvider);

    List<Note> notes = switch (filter) {
      NoteFilter.all => repo.all(),
      NoteFilter.bySutta => repo.all()
          .where((n) => n.suttaId != null)
          .toList(),
      NoteFilter.byPlan => repo.all()
          .where((n) => n.clusterId != null)
          .toList(),
    };

    if (search.trim().length >= 2) {
      final q = search.trim().toLowerCase();
      notes = notes
          .where((n) =>
              n.content.toLowerCase().contains(q) ||
              (n.passage?.toLowerCase().contains(q) ?? false) ||
              (n.suttaId?.toLowerCase().contains(q) ?? false))
          .toList();
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notes'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(90),
          child: Column(
            children: [
              // Search bar
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search notes…',
                    prefixIcon: Icon(Icons.search, size: 20),
                  ),
                  onChanged: (v) =>
                      ref.read(_searchProvider.notifier).state = v,
                ),
              ),
              // Filter tabs
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(left: 16, bottom: 8),
                child: Row(
                  children: [
                    _FilterChip(
                        label: 'All',
                        value: NoteFilter.all,
                        current: filter),
                    const SizedBox(width: 8),
                    _FilterChip(
                        label: 'By sutta',
                        value: NoteFilter.bySutta,
                        current: filter),
                    const SizedBox(width: 8),
                    _FilterChip(
                        label: 'By plan',
                        value: NoteFilter.byPlan,
                        current: filter),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: notes.isEmpty
          ? _EmptyNotes()
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: notes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _NoteItem(note: notes[i]),
            ),
    );
  }
}

// ─── Widgets ───────────────────────────────────────────────────────────────

class _FilterChip extends ConsumerWidget {
  final String label;
  final NoteFilter value;
  final NoteFilter current;

  const _FilterChip(
      {required this.label, required this.value, required this.current});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isActive = value == current;
    return FilterChip(
      label: Text(label),
      selected: isActive,
      onSelected: (_) =>
          ref.read(_filterProvider.notifier).state = value,
      selectedColor: AppColors.saffronMuted,
      checkmarkColor: AppColors.saffron,
    );
  }
}

class _NoteItem extends ConsumerWidget {
  final Note note;
  const _NoteItem({required this.note});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Source link (sutta or plan)
            if (note.suttaId != null)
              GestureDetector(
                onTap: () =>
                    context.push('/reader/${note.suttaId}'),
                child: Row(
                  children: [
                    const Icon(Icons.book_outlined,
                        size: 14, color: AppColors.saffron),
                    const SizedBox(width: 4),
                    Text(
                      note.suttaId!.toUpperCase(),
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: AppColors.saffron,
                            decoration: TextDecoration.underline,
                          ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 6),

            // Quoted passage
            if (note.passage != null) ...[
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.saffronMuted,
                  borderRadius: BorderRadius.circular(6),
                  border: const Border(
                      left: BorderSide(
                          color: AppColors.saffron, width: 3)),
                ),
                child: Text(
                  note.passage!,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontStyle: FontStyle.italic),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 8),
            ],

            // Note content
            Text(note.content,
                style: Theme.of(context).textTheme.bodyMedium),

            const SizedBox(height: 8),

            // Footer
            Row(
              children: [
                Text(
                  _formatDate(note.updatedAt),
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () {
                    ref.read(notesRepositoryProvider).delete(note.id);
                  },
                  child: const Icon(Icons.delete_outline,
                      size: 16, color: Colors.red),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) =>
      '${dt.day}/${dt.month}/${dt.year}';
}

class _EmptyNotes extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.sticky_note_2_outlined,
              size: 48, color: AppColors.saffron),
          const SizedBox(height: 16),
          Text(
            'No notes yet.\nStart reading and cite passages.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
