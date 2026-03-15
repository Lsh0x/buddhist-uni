import type { CourseProgress } from "./types";

const STORAGE_KEY = "buddhist-uni:progress";

function getAll(): Record<string, CourseProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, CourseProgress>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getProgress(courseId: string): CourseProgress | null {
  return getAll()[courseId] ?? null;
}

export function markCompleted(courseId: string, itemUrl: string): CourseProgress {
  const all = getAll();
  const now = new Date().toISOString();
  const existing = all[courseId] ?? {
    courseId,
    completedItems: [],
    lastAccessedItem: itemUrl,
    lastAccessedAt: now,
    startedAt: now,
  };

  const completed = new Set(existing.completedItems);
  if (completed.has(itemUrl)) {
    completed.delete(itemUrl);
  } else {
    completed.add(itemUrl);
  }

  all[courseId] = {
    ...existing,
    completedItems: [...completed],
    lastAccessedItem: itemUrl,
    lastAccessedAt: now,
  };
  saveAll(all);
  return all[courseId];
}

export function setLastAccessed(courseId: string, itemUrl: string): void {
  const all = getAll();
  const now = new Date().toISOString();
  if (all[courseId]) {
    all[courseId].lastAccessedItem = itemUrl;
    all[courseId].lastAccessedAt = now;
    saveAll(all);
  }
}

export function getAllInProgress(): CourseProgress[] {
  return Object.values(getAll())
    .filter((p) => p.completedItems.length > 0)
    .sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt));
}

export function resetProgress(courseId: string): void {
  const all = getAll();
  delete all[courseId];
  saveAll(all);
}
