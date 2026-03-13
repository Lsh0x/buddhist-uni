export interface SearchResult {
  score: number;
  title: string;
  category: string;
  tags: string[];
  authors: string[];
  course: string | null;
  year: number | null;
  stars: number | null;
  url: string;
  external_url: string | null;
  minutes: number | null;
  pages: string | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export interface CourseItem {
  title: string;
  category: string;
  tags: string[];
  authors: string[];
  year: number | null;
  stars: number | null;
  url: string;
  minutes: number | null;
  pages: string | null;
}

export interface CourseDetail {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  next_courses: string[];
  content_count: number;
  content: CourseItem[];
}

export interface CourseSummary {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  next_courses: string[];
}

export interface ReadingPathItem {
  path_order: number;
  level: string;
  score: number;
  title: string;
  category: string;
  tags: string[];
  authors: string[];
  stars: number | null;
  url: string;
  minutes: number | null;
  pages: string | null;
}

export interface CourseProgress {
  courseId: string;
  completedItems: string[];
  lastAccessedItem: string;
  lastAccessedAt: string;
  startedAt: string;
}

// ---------------------------------------------------------------------------
// Suttas & Study Plans (from HDBSCAN clustering)
// ---------------------------------------------------------------------------

export interface SuttaInPlan {
  order: number;
  sutta_id: string;
  nikaya: string;
  nikaya_name: string;
  title: string;
  blurb: string;
  word_count: number | null;
  difficulty: number | null;
  url: string;
}

export interface StudyPlanSummary {
  cluster_id: number;
  name: string;
  description: string;
  keywords: string[];
  theme_category: string;
  nikaya_breakdown: Record<string, number>;
  size: number;
  reading_minutes: number;
  relevance_score?: number;
}

export interface StudyPlanDetail extends StudyPlanSummary {
  total_words: number;
  suttas: SuttaInPlan[];
}

export interface SuttaSearchResult {
  score?: number;
  sutta_id: string;
  nikaya: string;
  nikaya_name: string;
  title: string;
  blurb: string;
  word_count: number | null;
  difficulty: number | null;
  cluster_id: number | null;
  cluster_name: string | null;
  url: string;
}

export interface SuttaDetail {
  sutta_id: string;
  nikaya: string;
  nikaya_name: string;
  title: string;
  blurb: string;
  word_count: number | null;
  segment_count: number | null;
  difficulty: number | null;
  translator: string | null;
  cluster_id: number | null;
  cluster_name: string | null;
  url: string;
}

// Legacy hardcoded study plans (kept for backward compat)
export type StudyPlanSlug =
  | "taming-the-mind"
  | "facing-pain"
  | "helping-others"
  | "beginning-the-path"
  | "path-to-liberation"
  | "understanding-reality"
  | "ethics-right-living"
  | "the-buddha-his-world"
  | "feelings-inner-life"
  | "imagery-poetry";

export interface StudyPlanStage {
  title: string;
  description: string;
  searchQuery: string;
  tags: string[];
}

export interface StudyPlan {
  slug: StudyPlanSlug;
  title: string;
  subtitle: string;
  icon: string;
  stages: StudyPlanStage[];
}
