import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'features/home/home_screen.dart';
import 'features/notes/notes_screen.dart';
import 'features/reader/reader_screen.dart';
import 'features/search/search_screen.dart';
import 'features/splash/splash_screen.dart';
import 'features/study_plans/plan_detail_screen.dart';
import 'features/study_plans/plans_screen.dart';

final _router = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (_, __) => const SplashScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => HomeScreen(child: child),
      routes: [
        GoRoute(
          path: '/search',
          builder: (_, __) => const SearchScreen(),
        ),
        GoRoute(
          path: '/plans',
          builder: (_, __) => const PlansScreen(),
          routes: [
            GoRoute(
              path: ':planId',
              builder: (_, state) => PlanDetailScreen(
                planId: int.parse(state.pathParameters['planId']!),
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/notes',
          builder: (_, __) => const NotesScreen(),
        ),
      ],
    ),
    // Full-screen reader (pushed over the shell)
    GoRoute(
      path: '/reader/:suttaId',
      builder: (_, state) => ReaderScreen(
        suttaId: state.pathParameters['suttaId']!,
        planId: state.uri.queryParameters['planId'] != null
            ? int.tryParse(state.uri.queryParameters['planId']!)
            : null,
      ),
    ),
  ],
);

class BuddhistStudyApp extends ConsumerWidget {
  const BuddhistStudyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Buddhist Study',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
