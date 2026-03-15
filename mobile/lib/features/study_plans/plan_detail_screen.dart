import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/database/objectbox_store.dart';
import '../../core/theme/app_theme.dart';
import '../../models/study_plan.dart';
import '../../objectbox.g.dart';
import '../../repositories/sutta_repository.dart';

class PlanDetailScreen extends ConsumerWidget {
  final int planId;
  const PlanDetailScreen({super.key, required this.planId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final box = ref.watch(studyPlanBoxProvider);
    final q = box
        .query(StudyPlan_.clusterId.equals(planId))
        .build();
    final plan = q.findFirst();
    q.close();

    if (plan == null) {
      return Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('Plan not found.')));
    }

    final suttaOrder =
        (jsonDecode(plan.suttaOrderJson) as List).cast<String>();

    // Load progress
    final progressBox = ref.watch(progressBoxProvider);
    final pq = progressBox
        .query(StudyPlanProgress_.clusterId.equals(planId))
        .build();
    final progress = pq.findFirst();
    pq.close();

    final completedSet = progress != null &&
            progress.completedJson.isNotEmpty
        ? Set<String>.from(
            (jsonDecode(progress.completedJson) as List).cast<String>())
        : <String>{};

    return Scaffold(
      appBar: AppBar(
        title: Text(plan.name),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text(
              '${completedSet.length} / ${plan.size}',
              style: Theme.of(context)
                  .textTheme
                  .labelLarge
                  ?.copyWith(color: AppColors.sage),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          if (completedSet.isNotEmpty)
            LinearProgressIndicator(
              value: completedSet.length / plan.size,
              minHeight: 3,
              backgroundColor: AppColors.saffronMuted,
              valueColor: const AlwaysStoppedAnimation(AppColors.sage),
            ),

          // Sutta list
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: suttaOrder.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final suttaId = suttaOrder[i];
                final isDone = completedSet.contains(suttaId);

                return _PlanSuttaTile(
                  index: i + 1,
                  suttaId: suttaId,
                  planId: planId,
                  isDone: isDone,
                  onToggle: () => _toggleDone(ref, plan, suttaId,
                      completedSet, progress),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _toggleDone(
    WidgetRef ref,
    StudyPlan plan,
    String suttaId,
    Set<String> completedSet,
    StudyPlanProgress? existing,
  ) {
    final newSet = Set<String>.from(completedSet);
    if (newSet.contains(suttaId)) {
      newSet.remove(suttaId);
    } else {
      newSet.add(suttaId);
    }

    final p = existing ?? StudyPlanProgress()
      ..clusterId = plan.clusterId;
    p
      ..completedJson = jsonEncode(newSet.toList())
      ..lastReadAt = DateTime.now();

    ref.read(progressBoxProvider).put(p);
  }
}

class _PlanSuttaTile extends ConsumerWidget {
  final int index;
  final String suttaId;
  final int planId;
  final bool isDone;
  final VoidCallback onToggle;

  const _PlanSuttaTile({
    required this.index,
    required this.suttaId,
    required this.planId,
    required this.isDone,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sutta = ref.watch(suttaRepositoryProvider).getById(suttaId);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () =>
            context.push('/reader/$suttaId?planId=$planId'),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              // Index
              SizedBox(
                width: 28,
                child: Text(
                  '$index',
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(color: AppColors.saffron),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 10),
              // Title
              Expanded(
                child: Text(
                  sutta?.title.isNotEmpty == true
                      ? sutta!.title
                      : suttaId.toUpperCase(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        decoration: isDone
                            ? TextDecoration.lineThrough
                            : null,
                        color: isDone ? AppColors.inkMuted : null,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              // Done checkbox
              GestureDetector(
                onTap: onToggle,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isDone
                        ? AppColors.sage
                        : Colors.transparent,
                    border: Border.all(
                      color:
                          isDone ? AppColors.sage : AppColors.border,
                      width: 2,
                    ),
                  ),
                  child: isDone
                      ? const Icon(Icons.check,
                          size: 14, color: Colors.white)
                      : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
