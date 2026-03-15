import 'package:objectbox/objectbox.dart';

/// A user note, optionally anchored to a sutta and/or a passage.
@Entity()
class Note {
  @Id()
  int id = 0;

  /// Free-form note content (markdown supported)
  String content = '';

  // ─── Optional anchors ─────────────────────────────────────────────────

  /// The sutta this note is attached to (nullable)
  @Index()
  String? suttaId;

  /// The study plan cluster (nullable)
  @Index()
  int? clusterId;

  /// Exact quoted passage (nullable — set when created via "cite passage")
  String? passage;

  /// Segment id within the sutta text (e.g. "mn1:1.3") for precise anchor
  String? segmentId;

  // ─── Timestamps ────────────────────────────────────────────────────────

  @Property(type: PropertyType.date)
  DateTime createdAt = DateTime.now();

  @Property(type: PropertyType.date)
  DateTime updatedAt = DateTime.now();
}
