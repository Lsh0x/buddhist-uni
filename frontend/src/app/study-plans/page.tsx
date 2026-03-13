"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, Clock, ChevronRight, Loader2 } from "lucide-react";
import { listStudyPlans, findStudyPlansByTopic } from "@/lib/api";
import type { StudyPlanSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

const THEMES = ["mixed", "wisdom", "ethics", "meditation", "path", "rebirth", "community"];
const NIKAYAS = ["an", "sn", "mn", "dn", "kn"];
const NIKAYA_LABELS: Record<string, string> = {
  an: "AN", sn: "SN", mn: "MN", dn: "DN", kn: "KN",
};

function PlanCard({ plan }: { plan: StudyPlanSummary }) {
  const topNikayas = Object.entries(plan.nikaya_breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Link
      href={`/study-plans/${plan.cluster_id}`}
      className="group flex flex-col rounded-xl border border-bg-border bg-bg-card p-6 transition-all hover:border-saffron/40 hover:shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="inline-block rounded-full bg-saffron/10 px-2.5 py-0.5 text-xs font-medium text-saffron-dark capitalize">
          {plan.theme_category}
        </span>
        <span className="flex items-center gap-1 text-xs text-fg-subtle">
          <Clock size={11} />
          {Math.round(plan.reading_minutes / 60)}h
        </span>
      </div>

      <h2 className="font-serif text-lg font-bold text-fg group-hover:text-saffron-dark line-clamp-2">
        {plan.name}
      </h2>

      {plan.description && (
        <p className="mt-2 text-sm text-fg-muted line-clamp-2">{plan.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {plan.keywords.slice(0, 4).map((kw) => (
          <span
            key={kw}
            className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs text-fg-subtle"
          >
            {kw}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {topNikayas.map(([nikaya, count]) => (
            <span key={nikaya} className="text-xs text-fg-subtle">
              {NIKAYA_LABELS[nikaya] ?? nikaya.toUpperCase()} {count}
            </span>
          ))}
        </div>
        <span className="text-xs font-medium text-fg-subtle">
          {plan.size} suttas
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-saffron-dark">
        Begin reading <ChevronRight size={13} />
      </div>
    </Link>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}

export default function StudyPlansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [theme, setTheme] = useState("");
  const [nikaya, setNikaya] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  const isSearching = debouncedQuery.trim().length > 0;

  const { data: browsePlans, isLoading: browseLoading } = useQuery({
    queryKey: ["study-plans-browse", theme, nikaya],
    queryFn: () => listStudyPlans({ theme: theme || undefined, nikaya: nikaya || undefined, limit: 60 }),
    enabled: !isSearching,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["study-plans-search", debouncedQuery],
    queryFn: () => findStudyPlansByTopic(debouncedQuery, 20),
    enabled: isSearching,
  });

  const plans: StudyPlanSummary[] = isSearching
    ? (searchResults ?? [])
    : (browsePlans ?? []);

  const isLoading = isSearching ? searchLoading : browseLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold text-fg">Study Plans</h1>
        <p className="mt-2 text-lg text-fg-muted">
          {plans.length > 0
            ? `${plans.length} themed study paths discovered from 4,167 suttas`
            : "Themed study paths discovered from 4,167 suttas"}
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by topic (e.g. mindfulness, impermanence, jhāna…)"
            className="w-full rounded-lg border border-bg-border bg-bg-card py-2.5 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-saffron/50 focus:outline-none focus:ring-1 focus:ring-saffron/30"
          />
          {searchLoading && debouncedQuery && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fg-subtle" />
          )}
        </div>

        {!isSearching && (
          <>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-card px-3 py-2.5 text-sm text-fg focus:border-saffron/50 focus:outline-none"
            >
              <option value="">All themes</option>
              {THEMES.filter((t) => t !== "mixed").map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={nikaya}
              onChange={(e) => setNikaya(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-card px-3 py-2.5 text-sm text-fg focus:border-saffron/50 focus:outline-none"
            >
              <option value="">All nikāyas</option>
              {NIKAYAS.map((n) => (
                <option key={n} value={n}>
                  {NIKAYA_LABELS[n]}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Results grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => <PlanCardSkeleton key={i} />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl">&#10047;</p>
          <p className="mt-4 text-fg-muted">
            {isSearching
              ? `No study plans found for "${debouncedQuery}". Try a different topic.`
              : "No study plans match this filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.cluster_id} plan={plan} />
          ))}
        </div>
      )}

      {/* Footer note */}
      {!isSearching && plans.length > 0 && (
        <p className="mt-8 text-center text-xs text-fg-subtle">
          Study plans generated automatically via HDBSCAN clustering of {" "}
          <Link href="/suttas" className="text-saffron-dark hover:underline">
            Bhikkhu Sujato&apos;s translations
          </Link>
        </p>
      )}
    </div>
  );
}
