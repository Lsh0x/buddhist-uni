import type {
  SearchResponse, CourseSummary, CourseDetail, ReadingPathItem, SearchResult,
  StudyPlanSummary, StudyPlanDetail, SuttaSearchResult, SuttaDetail,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function fetchAPI<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else if (value) {
        url.searchParams.set(key, value);
      }
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function search(params: {
  q: string;
  tags?: string[];
  category?: string;
  min_stars?: number;
  limit?: number;
}): Promise<SearchResponse> {
  const query: Record<string, string | string[]> = { q: params.q };
  if (params.tags?.length) query["tags[]"] = params.tags;
  if (params.category) query.category = params.category;
  if (params.min_stars) query.min_stars = String(params.min_stars);
  if (params.limit) query.limit = String(params.limit);
  return fetchAPI<SearchResponse>("/search", query);
}

export async function listCourses(): Promise<CourseSummary[]> {
  return fetchAPI<CourseSummary[]>("/courses");
}

export async function getCourse(id: string): Promise<CourseDetail> {
  return fetchAPI<CourseDetail>(`/courses/${id}`);
}

export async function getTeacher(slug: string, limit = 20): Promise<SearchResult[]> {
  return fetchAPI<SearchResult[]>(`/teachers/${slug}`, { limit: String(limit) });
}

export async function getReadingPath(params: {
  topic: string;
  level?: string;
  limit?: number;
}): Promise<ReadingPathItem[]> {
  const query: Record<string, string> = { topic: params.topic };
  if (params.level) query.level = params.level;
  if (params.limit) query.limit = String(params.limit);
  return fetchAPI<ReadingPathItem[]>("/reading-path", query);
}

// ---------------------------------------------------------------------------
// Study Plans (HDBSCAN clusters)
// ---------------------------------------------------------------------------

export async function listStudyPlans(params?: {
  theme?: string;
  nikaya?: string;
  min_size?: number;
  limit?: number;
}): Promise<StudyPlanSummary[]> {
  const query: Record<string, string> = {};
  if (params?.theme) query.theme = params.theme;
  if (params?.nikaya) query.nikaya = params.nikaya;
  if (params?.min_size) query.min_size = String(params.min_size);
  if (params?.limit) query.limit = String(params.limit);
  return fetchAPI<StudyPlanSummary[]>("/study-plans", query);
}

export async function findStudyPlansByTopic(topic: string, limit = 6): Promise<StudyPlanSummary[]> {
  return fetchAPI<StudyPlanSummary[]>("/study-plans/search", { topic, limit: String(limit) });
}

export async function getStudyPlanById(clusterId: number): Promise<StudyPlanDetail> {
  return fetchAPI<StudyPlanDetail>(`/study-plans/${clusterId}`);
}

// ---------------------------------------------------------------------------
// Sutta Search
// ---------------------------------------------------------------------------

export async function searchSuttas(params: {
  q: string;
  nikaya?: string;
  cluster_id?: number;
  limit?: number;
}): Promise<SuttaSearchResult[]> {
  const query: Record<string, string> = { q: params.q };
  if (params.nikaya) query.nikaya = params.nikaya;
  if (params.cluster_id != null) query.cluster_id = String(params.cluster_id);
  if (params.limit) query.limit = String(params.limit);
  return fetchAPI<SuttaSearchResult[]>("/suttas/search", query);
}

export async function getSuttaDetail(suttaId: string): Promise<SuttaDetail> {
  return fetchAPI<SuttaDetail>(`/suttas/${suttaId}`);
}

export async function getSimilarSuttas(suttaId: string, limit = 6): Promise<SuttaSearchResult[]> {
  return fetchAPI<SuttaSearchResult[]>(`/suttas/${suttaId}/similar`, { limit: String(limit) });
}
