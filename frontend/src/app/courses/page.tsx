"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { listCourses } from "@/lib/api";
import { getProgress } from "@/lib/progress";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default function CoursesPage() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-fg">Courses</h1>
        <p className="mt-2 text-fg-muted">Structured learning paths through Buddhist teachings</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {courses && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => {
            const progress = getProgress(course.id);
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              >
                <Link
                  href={`/courses/${course.id}`}
                  className="group flex h-full flex-col rounded-xl border border-bg-border bg-bg-card p-5 transition-all hover:border-saffron/40 hover:shadow-md"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
                    <BookOpen size={20} />
                  </div>
                  <h2 className="font-serif text-lg font-bold text-fg group-hover:text-saffron-dark">
                    {course.title}
                  </h2>
                  {course.subtitle && (
                    <p className="mt-1 text-sm text-fg-muted line-clamp-2">{course.subtitle}</p>
                  )}
                  {progress && progress.completedItems.length > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-border">
                        <div
                          className="h-full rounded-full bg-sage transition-all"
                          style={{ width: `${Math.min((progress.completedItems.length / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-sage">{progress.completedItems.length} completed</p>
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-1 pt-4 text-xs text-saffron-dark">
                    Explore <ArrowRight size={12} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
