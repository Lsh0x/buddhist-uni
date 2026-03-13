import 'package:objectbox/objectbox.dart';

@Entity()
class StudyPlan {
  @Id()
  int id = 0;

  /// Maps to cluster_id (0..165)
  @Index()
  int clusterId = 0;

  String name = '';
  String description = '';
  String themeCategory = '';

  /// JSON-encoded ordered list of sutta IDs: ["mn1", "mn2", ...]
  String suttaOrderJson = '';

  int size = 0;
  int readingMinutes = 0;
}

@Entity()
class StudyPlanProgress {
  @Id()
  int id = 0;

  @Index()
  int clusterId = 0;

  /// JSON-encoded set of completed sutta IDs: ["mn1", "mn2"]
  String completedJson = '';

  DateTime lastReadAt = DateTime.now();
}
