"""Pydantic models for the Buddhist University Search API."""

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    score: float
    title: str
    category: str
    tags: list[str] = []
    authors: list[str] = []
    course: str | None = None
    year: int | None = None
    stars: int | None = None
    url: str
    external_url: str | None = None
    minutes: int | None = None
    pages: str | None = None


class SearchResponse(BaseModel):
    query: str
    total: int
    results: list[SearchResult]


class CourseItem(BaseModel):
    title: str
    category: str
    tags: list[str] = []
    authors: list[str] = []
    year: int | None = None
    stars: int | None = None
    url: str
    minutes: int | None = None
    pages: str | None = None


class CourseDetail(BaseModel):
    id: str
    title: str
    subtitle: str = ""
    description: str = ""
    icon: str = ""
    next_courses: list[str] = []
    content_count: int
    content: list[CourseItem]


class CourseSummary(BaseModel):
    id: str
    title: str
    subtitle: str = ""
    icon: str = ""
    next_courses: list[str] = []


class ReadingPathItem(BaseModel):
    path_order: int
    level: str
    score: float
    title: str
    category: str
    tags: list[str] = []
    authors: list[str] = []
    stars: int | None = None
    url: str
    minutes: int | None = None
    pages: str | None = None


# ---------------------------------------------------------------------------
# Suttas & Study Plans
# ---------------------------------------------------------------------------

class SuttaInPlan(BaseModel):
    order: int
    sutta_id: str
    nikaya: str
    nikaya_name: str = ""
    title: str
    blurb: str = ""
    word_count: int | None = None
    difficulty: int | None = None
    url: str


class StudyPlanSummary(BaseModel):
    cluster_id: int
    name: str
    description: str = ""
    keywords: list[str] = []
    theme_category: str = "mixed"
    nikaya_breakdown: dict[str, int] = {}
    size: int
    reading_minutes: int
    relevance_score: float | None = None


class StudyPlanDetail(StudyPlanSummary):
    total_words: int
    suttas: list[SuttaInPlan]


class SuttaSearchResult(BaseModel):
    score: float | None = None
    sutta_id: str
    nikaya: str
    nikaya_name: str = ""
    title: str
    blurb: str = ""
    word_count: int | None = None
    difficulty: int | None = None
    cluster_id: int | None = None
    cluster_name: str | None = None
    url: str


class SuttaDetail(BaseModel):
    sutta_id: str
    nikaya: str
    nikaya_name: str = ""
    title: str
    blurb: str = ""
    word_count: int | None = None
    segment_count: int | None = None
    difficulty: int | None = None
    translator: str | None = None
    cluster_id: int | None = None
    cluster_name: str | None = None
    url: str
