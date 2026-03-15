import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Colour tokens — mirrors the web app's Tailwind palette.
class AppColors {
  // Saffron
  static const saffron = Color(0xFFD97706);
  static const saffronLight = Color(0xFFFBBF24);
  static const saffronMuted = Color(0xFFFEF3C7);

  // Burgundy
  static const burgundy = Color(0xFF7C1D2A);

  // Sage
  static const sage = Color(0xFF4D7C5F);

  // Lotus
  static const lotus = Color(0xFFAD4F7B);

  // Neutrals
  static const ink = Color(0xFF1C1917);
  static const inkMuted = Color(0xFF57534E);
  static const parchment = Color(0xFFFAF7F2);
  static const border = Color(0xFFE7E5E4);
  static const card = Color(0xFFFFFFFF);

  // Dark mode
  static const darkBg = Color(0xFF1C1917);
  static const darkCard = Color(0xFF292524);
  static const darkBorder = Color(0xFF44403C);
  static const darkFg = Color(0xFFF5F5F4);
  static const darkFgMuted = Color(0xFFA8A29E);
}

class AppTheme {
  static ThemeData light() => _build(
        brightness: Brightness.light,
        bg: AppColors.parchment,
        card: AppColors.card,
        fg: AppColors.ink,
        fgMuted: AppColors.inkMuted,
        border: AppColors.border,
      );

  static ThemeData dark() => _build(
        brightness: Brightness.dark,
        bg: AppColors.darkBg,
        card: AppColors.darkCard,
        fg: AppColors.darkFg,
        fgMuted: AppColors.darkFgMuted,
        border: AppColors.darkBorder,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color bg,
    required Color card,
    required Color fg,
    required Color fgMuted,
    required Color border,
  }) {
    final base = brightness == Brightness.light
        ? ThemeData.light(useMaterial3: true)
        : ThemeData.dark(useMaterial3: true);

    final serif = GoogleFonts.loraTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.lora(
          fontSize: 28, fontWeight: FontWeight.w700, color: fg),
      displayMedium: GoogleFonts.lora(
          fontSize: 22, fontWeight: FontWeight.w700, color: fg),
      titleLarge:
          GoogleFonts.lora(fontSize: 18, fontWeight: FontWeight.w600, color: fg),
      titleMedium:
          GoogleFonts.lora(fontSize: 16, fontWeight: FontWeight.w500, color: fg),
      bodyLarge: GoogleFonts.lora(fontSize: 16, height: 1.75, color: fg),
      bodyMedium:
          GoogleFonts.lora(fontSize: 14, height: 1.6, color: fgMuted),
      labelLarge:
          GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: fg),
      labelMedium: GoogleFonts.inter(fontSize: 12, color: fgMuted),
    );

    return base.copyWith(
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.saffron,
        brightness: brightness,
        primary: AppColors.saffron,
        secondary: AppColors.burgundy,
        surface: bg,
        onSurface: fg,
      ),
      scaffoldBackgroundColor: bg,
      textTheme: serif,
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: border),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerColor: border,
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        foregroundColor: fg,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle:
            GoogleFonts.lora(fontSize: 18, fontWeight: FontWeight.w600, color: fg),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: card,
        indicatorColor: AppColors.saffronMuted,
        labelTextStyle: WidgetStateTextStyle.resolveWith(
          (s) => GoogleFonts.inter(
            fontSize: 11,
            fontWeight:
                s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w400,
            color: s.contains(WidgetState.selected)
                ? AppColors.saffron
                : fgMuted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(
            color: s.contains(WidgetState.selected) ? AppColors.saffron : fgMuted,
            size: 22,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.saffron, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
