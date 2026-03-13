import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/note.dart';
import '../../models/sutta.dart';
import '../../repositories/notes_repository.dart';
import '../../repositories/sutta_repository.dart';

// ─── State ─────────────────────────────────────────────────────────────────

final _readerSuttaProvider =
    FutureProvider.family<Sutta?, String>((ref, suttaId) async {
  return ref.watch(suttaRepositoryProvider).getById(suttaId);
});

// ─── Screen ────────────────────────────────────────────────────────────────

class ReaderScreen extends ConsumerStatefulWidget {
  final String suttaId;
  final int? planId;

  const ReaderScreen({super.key, required this.suttaId, this.planId});

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  bool _notesOpen = false;

  @override
  Widget build(BuildContext context) {
    final suttaAsync = ref.watch(_readerSuttaProvider(widget.suttaId));

    return suttaAsync.when(
      data: (sutta) => sutta == null
          ? Scaffold(
              appBar: AppBar(),
              body: const Center(child: Text('Sutta not found.')))
          : _ReaderContent(
              sutta: sutta,
              planId: widget.planId,
              notesOpen: _notesOpen,
              onToggleNotes: () =>
                  setState(() => _notesOpen = !_notesOpen),
            ),
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error: $e')),
      ),
    );
  }
}

class _ReaderContent extends ConsumerWidget {
  final Sutta sutta;
  final int? planId;
  final bool notesOpen;
  final VoidCallback onToggleNotes;

  const _ReaderContent({
    required this.sutta,
    this.planId,
    required this.notesOpen,
    required this.onToggleNotes,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(suttaRepositoryProvider);
    final segments = repo.getSegments(sutta);

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () {
          if (planId != null) {
            context.go('/plans/$planId');
          } else {
            context.go('/search');
          }
        }),
        title: Text(sutta.suttaId.toUpperCase()),
        actions: [
          IconButton(
            icon: Icon(notesOpen
                ? Icons.sticky_note_2
                : Icons.sticky_note_2_outlined),
            tooltip: 'Notes',
            onPressed: onToggleNotes,
          ),
        ],
      ),
      body: Row(
        children: [
          // ── Main text ──────────────────────────────────────────────────
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Title
                      Text(
                        sutta.title,
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                      if (sutta.blurb.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          sutta.blurb,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(fontStyle: FontStyle.italic),
                        ),
                      ],
                      const Divider(height: 32),
                      // Text segments
                      ...segments.map((seg) => _ParagraphTile(
                            segment: seg,
                            suttaId: sutta.suttaId,
                            clusterId: sutta.clusterId,
                          )),
                    ]),
                  ),
                ),
              ],
            ),
          ),

          // ── Notes side panel ──────────────────────────────────────────
          if (notesOpen)
            _NotesSidePanel(
              suttaId: sutta.suttaId,
              clusterId: sutta.clusterId,
            ),
        ],
      ),
    );
  }
}

// ─── Paragraph with cite action ────────────────────────────────────────────

class _ParagraphTile extends ConsumerStatefulWidget {
  final SuttaSegment segment;
  final String suttaId;
  final int clusterId;

  const _ParagraphTile({
    required this.segment,
    required this.suttaId,
    required this.clusterId,
  });

  @override
  ConsumerState<_ParagraphTile> createState() => _ParagraphTileState();
}

class _ParagraphTileState extends ConsumerState<_ParagraphTile> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    if (widget.segment.text.trim().isEmpty) return const SizedBox.shrink();

    return MouseRegion(
      onEnter: (_) => setState(() => _hovering = true),
      onExit: (_) => setState(() => _hovering = false),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text(
              widget.segment.text,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          // Cite button (visible on hover / long-press)
          if (_hovering)
            Positioned(
              right: 0,
              top: 6,
              child: _CiteButton(
                passage: widget.segment.text,
                segmentId: widget.segment.segmentId,
                suttaId: widget.suttaId,
                clusterId: widget.clusterId,
              ),
            ),
        ],
      ),
    );
  }
}

class _CiteButton extends ConsumerWidget {
  final String passage;
  final String segmentId;
  final String suttaId;
  final int clusterId;

  const _CiteButton({
    required this.passage,
    required this.segmentId,
    required this.suttaId,
    required this.clusterId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _openNoteEditor(context, ref),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.saffronMuted,
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Icon(Icons.format_quote, size: 16,
            color: AppColors.saffron),
      ),
    );
  }

  void _openNoteEditor(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _NoteEditor(
        suttaId: suttaId,
        clusterId: clusterId,
        passage: passage,
        segmentId: segmentId,
      ),
    );
  }
}

// ─── Notes side panel ──────────────────────────────────────────────────────

class _NotesSidePanel extends ConsumerWidget {
  final String suttaId;
  final int clusterId;

  const _NotesSidePanel(
      {required this.suttaId, required this.clusterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(notesRepositoryProvider).forSutta(suttaId);

    return Container(
      width: 300,
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(
              color: Theme.of(context).dividerColor),
        ),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Text('Notes',
                    style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                TextButton.icon(
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add'),
                  onPressed: () => showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    useSafeArea: true,
                    builder: (_) => _NoteEditor(
                      suttaId: suttaId,
                      clusterId: clusterId,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Note list
          Expanded(
            child: notes.isEmpty
                ? Center(
                    child: Text('No notes yet.',
                        style: Theme.of(context).textTheme.bodyMedium))
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: notes.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: 8),
                    itemBuilder: (_, i) =>
                        _NoteCard(note: notes[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

// ─── Note card ─────────────────────────────────────────────────────────────

class _NoteCard extends ConsumerWidget {
  final Note note;
  const _NoteCard({required this.note});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (note.passage != null) ...[
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.saffronMuted,
                  borderRadius: BorderRadius.circular(6),
                  border: const Border(
                    left: BorderSide(
                        color: AppColors.saffron, width: 3),
                  ),
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
            Text(note.content,
                style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  _formatDate(note.updatedAt),
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const Spacer(),
                InkWell(
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

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

// ─── Note editor (bottom sheet) ────────────────────────────────────────────

class _NoteEditor extends ConsumerStatefulWidget {
  final String suttaId;
  final int clusterId;
  final String? passage;
  final String? segmentId;
  final Note? editingNote;

  const _NoteEditor({
    required this.suttaId,
    required this.clusterId,
    this.passage,
    this.segmentId,
    this.editingNote,
  });

  @override
  ConsumerState<_NoteEditor> createState() => _NoteEditorState();
}

class _NoteEditorState extends ConsumerState<_NoteEditor> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
        text: widget.editingNote?.content ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Quoted passage
            if (widget.passage != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.saffronMuted,
                  borderRadius: BorderRadius.circular(8),
                  border: const Border(
                    left: BorderSide(color: AppColors.saffron, width: 3),
                  ),
                ),
                child: Text(
                  widget.passage!,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontStyle: FontStyle.italic),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Note input
            TextField(
              controller: _controller,
              autofocus: true,
              maxLines: 6,
              minLines: 3,
              decoration: const InputDecoration(
                hintText: 'Your note…',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),

            // Save button
            FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.saffron),
              onPressed: _save,
              child: const Text('Save note'),
            ),
          ],
        ),
      ),
    );
  }

  void _save() {
    final content = _controller.text.trim();
    if (content.isEmpty) return;

    final note = (widget.editingNote ?? Note())
      ..suttaId = widget.suttaId
      ..clusterId = widget.clusterId
      ..passage = widget.passage
      ..segmentId = widget.segmentId
      ..content = content;

    ref.read(notesRepositoryProvider).save(note);
    Navigator.of(context).pop();
  }
}
