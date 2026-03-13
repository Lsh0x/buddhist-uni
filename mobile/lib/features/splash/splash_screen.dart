import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/seeder/database_seeder.dart';
import '../../core/theme/app_theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(seederProvider.notifier).seed();
    });
  }

  @override
  Widget build(BuildContext context) {
    final seedState = ref.watch(seederProvider);

    ref.listen<SeedState>(seederProvider, (_, next) {
      if (next is SeedDone) {
        context.go('/search');
      }
    });

    return Scaffold(
      backgroundColor: AppColors.parchment,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Dhamma wheel icon (placeholder text)
              const Text('☸', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 24),
              Text(
                'Buddhist Study',
                style: Theme.of(context).textTheme.displayMedium,
              ),
              const SizedBox(height: 48),
              _buildStatus(context, seedState),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatus(BuildContext context, SeedState state) {
    return switch (state) {
      SeedIdle() => const SizedBox.shrink(),
      SeedDone() => const SizedBox.shrink(),
      SeedRunning(message: final msg, progress: final pct) => Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 4,
                backgroundColor: AppColors.saffronMuted,
                valueColor:
                    const AlwaysStoppedAnimation(AppColors.saffron),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              msg,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'This only happens once.',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(fontStyle: FontStyle.italic),
            ),
          ],
        ),
      SeedError(error: final err) => Column(
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 32),
            const SizedBox(height: 8),
            Text(
              err,
              style: const TextStyle(color: Colors.red, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
    };
  }
}
