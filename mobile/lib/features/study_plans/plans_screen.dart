import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/database/objectbox_store.dart';
import '../../core/theme/app_theme.dart';
import '../../models/study_plan.dart';
import '../../objectbox.g.dart';

final _plansProvider = Provider<List<StudyPlan>>((ref) {
  return ref
      .watch(studyPlanBoxProvider)
      .getAll()
    ..sort((a, b) => a.name.compareTo(b.name));
});

class PlansScreen extends ConsumerWidget {
  const PlansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(_plansProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Study Plans')),
      body: plans.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: plans.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _PlanCard(plan: plans[i]),
            ),
    );
  }
}

class _PlanCard extends ConsumerWidget {
  final StudyPlan plan;
  const _PlanCard({required this.plan});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Read progress for this plan
    final progressBox = ref.watch(progressBoxProvider);
    final q = progressBox
        .query(StudyPlanProgress_.clusterId.equals(plan.clusterId))
        .build();
    final progress = q.findFirst();
    q.close();

    final completed = progress != null
        ? (progress.completedJson.isNotEmpty
            ? (progress.completedJson
                    .replaceAll('[', '')
                    .replaceAll(']', '')
                    .replaceAll('"', '')
                    .split(',')
                    .where((s) => s.isNotEmpty)
                    .length)
            : 0)
        : 0;

    final pct = plan.size > 0 ? completed / plan.size : 0.0;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/plans/${plan.clusterId}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                plan.name,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                plan.description,
                style: Theme.of(context).textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _Chip('${plan.size} suttas'),
                  const SizedBox(width: 6),
                  _Chip('${plan.readingMinutes} min'),
                  const Spacer(),
                  if (pct > 0)
                    Text(
                      '$completed / ${plan.size}',
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium
                          ?.copyWith(color: AppColors.sage),
                    ),
                ],
              ),
              if (pct > 0) ...[
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 3,
                    backgroundColor: AppColors.saffronMuted,
                    valueColor:
                        const AlwaysStoppedAnimation(AppColors.sage),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  const _Chip(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.saffronMuted,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, style: Theme.of(context).textTheme.labelMedium),
    );
  }
}
