import type { SearchResult } from "./types";

export interface LocalSutta {
  id: string;
  file: string;
  title: string;
  translator: string;
  tags: string[];
  course: string | null;
  year: number | null;
  stars: number | null;
  pages: number | null;
  status: string | null;
  external_url: string | null;
  description: string;
  local: boolean;
}

export interface SuttaText {
  id: string;
  title: string;
  translator: string;
  text: string;
  description: string;
}

export interface ContentItem {
  slug: string;
  category: string;
  title: string;
  authors: string[];
  tags: string[];
  course: string | null;
  year: number | null;
  stars: number | null;
  pages: number | null;
  minutes: number | null;
  status: string | null;
  external_url: string | null;
  description: string;
  local: boolean;
}

let suttasCache: LocalSutta[] | null = null;
let allContentCache: ContentItem[] | null = null;

export async function getSuttas(): Promise<LocalSutta[]> {
  if (suttasCache) return suttasCache;
  const res = await fetch("/content/suttas.json");
  suttasCache = await res.json();
  return suttasCache!;
}

export async function getAllContent(): Promise<ContentItem[]> {
  if (allContentCache) return allContentCache;
  const res = await fetch("/content/all-content.json");
  allContentCache = await res.json();
  return allContentCache!;
}

export async function getSuttaText(id: string): Promise<SuttaText | null> {
  try {
    const res = await fetch(`/content/texts/${id}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function contentToSearchResult(item: ContentItem): SearchResult {
  return {
    score: 0,
    title: item.title,
    category: item.category,
    tags: item.tags,
    authors: item.authors,
    course: item.course,
    year: item.year,
    stars: item.stars,
    url: item.local ? `/suttas/${item.slug}` : (item.external_url || `/content/${item.category}/${item.slug}`),
    external_url: item.local ? null : item.external_url,
    minutes: item.minutes,
    pages: item.pages ? String(item.pages) : null,
  };
}
