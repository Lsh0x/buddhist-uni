import 'package:objectbox/objectbox.dart';

@Entity()
class Sutta {
  @Id()
  int id = 0;

  /// e.g. "mn1", "dn16", "sn12.23"
  @Index()
  String suttaId = '';

  /// e.g. "mn", "dn", "sn", "an", "kn"
  @Index()
  String nikaya = '';

  String nikayaName = '';

  String title = '';

  String blurb = '';

  /// Full text as JSON: [{"segment_id": "...", "text": "..."}]
  String textJson = '';

  /// Cluster / study plan id (0..165)
  @Index()
  int clusterId = -1;

  int wordCount = 0;

  // ─── Vector embedding (384 dims, all-MiniLM-L6-v2) ─────────────────────
  @HnswIndex(dimensions: 384, distanceType: VectorDistanceType.cosine)
  @Property(type: PropertyType.floatVector)
  List<double>? embedding;
}
