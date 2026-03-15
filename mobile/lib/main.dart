import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/database/objectbox_store.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialise ObjectBox store
  final store = await ObjectBoxStore.open();

  // Initialise SharedPreferences
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        objectBoxStoreProvider.overrideWithValue(store),
        sharedPrefsProvider.overrideWithValue(prefs),
      ],
      child: const BuddhistStudyApp(),
    ),
  );
}
