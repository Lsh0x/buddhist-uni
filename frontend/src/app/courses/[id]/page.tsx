"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RotateCcw } from "lucide-react";
import { getCourse } from "@/lib/api";
import { getProgress, markCompleted, resetProgress } from "@/lib/progress";
import { ContentCard } from "@/components/content/ContentCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import type { CourseProgress } from "@/lib/types";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: () => getCourse(id),
  });

  const [progress, setProgress] = useState<CourseProgress | null>(null);

  useEffect(() => {
    setProgress(getProgress(id));
  }, [id]);

  const handleToggle = useCallback((url: string) => {
    const updated = markCompleted(id, url);
    setProgress(updated);
  }, [id]);

  const handleReset = useCallback(() => {
    resetProgress(id);
    setProgress(null);
  }, [id]);

  const completedCount = progress?.completedItems.length ?? 0;
  const totalCount = course?.content.length ?? 0;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {isLoading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {course && (
        <>
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-fg">{course.title}</h1>
            {course.subtitle && (
              <p className="mt-2 text-lg text-fg-muted">{course.subtitle}</p>
            )}
            {course.description && (
              <p className="mt-4 text-fg-muted">{course.description}</p>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-6 rounded-xl border border-bg-border bg-bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-bg-border">
                  <div
                    className="h-full rounded-full bg-sage transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-fg-muted">
                  {completedCount}/{totalCount} completed ({pct}%)
                </span>
              </div>
              {completedCount > 0 && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg-muted"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
            {progress?.lastAccessedItem && (
              <p className="mt-2 text-xs text-fg-subtle">
                Last accessed: {new Date(progress.lastAccessedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Curriculum */}
          <div className="space-y-3">
            {course.content.map((item, i) => (
              <ContentCard
                key={`${item.url}-${i}`}
                item={item}
                showCheckbox
                checked={progress?.completedItems.includes(item.url)}
                onToggle={() => handleToggle(item.url)}
              />
            ))}
          </div>

          {/* Next courses */}
          {course.next_courses.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 font-serif text-xl font-bold text-fg">Next Courses</h2>
              <div className="flex flex-wrap gap-3">
                {course.next_courses.map((next) => (
                  <Link
                    key={next}
                    href={`/courses/${next}`}
                    className="flex items-center gap-2 rounded-full border border-bg-border bg-bg-card px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-saffron/40 hover:text-saffron-dark"
                  >
                    {next} <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
