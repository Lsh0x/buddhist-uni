import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/sutta.dart';
import '../../repositories/sutta_repository.dart';

// ─── State ─────────────────────────────────────────────────────────────────

final _queryProvider = StateProvider<String>((ref) => '');
final _nikayaFilterProvider = StateProvider<String?>((ref) => null);

final _searchResultsProvider =
    FutureProvider.autoDispose<List<SuttaSearchResult>>((ref) async {
  final query = ref.watch(_queryProvider);
  final nikaya = ref.watch(_nikayaFilterProvider);
  if (query.trim().length < 2) return [];
  return ref
      .watch(suttaRepositoryProvider)
      .search(query, limit: 20, nikayaFilter: nikaya);
});

// ─── Screen ────────────────────────────────────────────────────────────────

class SearchScreen extends ConsumerWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: _SearchBar(),
              ),
              _NikayaFilter(),
            ],
          ),
        ),
      ),
      body: _SearchResults(),
    );
  }
}

class _SearchBar extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return TextField(
      autofocus: false,
      textInputAction: TextInputAction.search,
      decoration: const InputDecoration(
        hintText: 'Search suttas…',
        prefixIcon: Icon(Icons.search, size: 20),
        suffixIcon: Icon(Icons.mic_none_rounded, size: 20),
      ),
      onChanged: (v) =>
          ref.read(_queryProvider.notifier).state = v,
    );
  }
}

class _NikayaFilter extends ConsumerWidget {
  static const _nikayas = [
    (code: null, label: 'All'),
    (code: 'dn', label: 'DN'),
    (code: 'mn', label: 'MN'),
    (code: 'sn', label: 'SN'),
    (code: 'an', label: 'AN'),
    (code: 'kn', label: 'KN'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(_nikayaFilterProvider);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.only(left: 16, bottom: 8),
      child: Row(
        children: _nikayas.map((n) {
          final isActive = selected == n.code;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(n.label),
              selected: isActive,
              onSelected: (_) =>
                  ref.read(_nikayaFilterProvider.notifier).state = n.code,
              selectedColor: AppColors.saffronMuted,
              checkmarkColor: AppColors.saffron,
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SearchResults extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(_queryProvider);
    final results = ref.watch(_searchResultsProvider);

    if (query.trim().length < 2) {
      return _EmptyState();
    }

    return results.when(
      data: (list) => list.isEmpty
          ? const Center(child: Text('No results.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _SuttaCard(result: list[i]),
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('☸', style: TextStyle(fontSize: 40)),
          const SizedBox(height: 16),
          Text(
            'Enter a topic to search\nthe Pāli Canon',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SuttaCard extends StatelessWidget {
  final SuttaSearchResult result;

  const _SuttaCard({required this.result});

  @override
  Widget build(BuildContext context) {
    final s = result.sutta;
    final pct = (result.score * 100).round();

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/reader/${s.suttaId}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.title.isEmpty ? s.suttaId.toUpperCase() : s.title,
                      style: Theme.of(context).textTheme.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _Badge(s.suttaId.toUpperCase(),
                            color: AppColors.saffronMuted),
                        const SizedBox(width: 6),
                        _Badge(s.nikayaName,
                            color: AppColors.sage.withAlpha(30)),
                      ],
                    ),
                    if (s.blurb.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        s.blurb,
                        style: Theme.of(context).textTheme.bodyMedium,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _ScoreBadge(pct),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge(this.label, {required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: Theme.of(context).textTheme.labelMedium),
    );
  }
}

class _ScoreBadge extends StatelessWidget {
  final int pct;
  const _ScoreBadge(this.pct);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.saffronMuted,
      ),
      alignment: Alignment.center,
      child: Text(
        '$pct%',
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: AppColors.saffron,
        ),
      ),
    );
  }
}
