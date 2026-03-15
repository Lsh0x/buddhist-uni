"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { search } from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";
import { ContentCard } from "@/components/content/ContentCard";
import { CardSkeleton } from "@/components/ui/Skeleton";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [minStars, setMinStars] = useState(Number(searchParams.get("min_stars")) || 0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (minStars) params.set("min_stars", String(minStars));
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, category, minStars, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery, category, minStars],
    queryFn: () =>
      search({
        q: debouncedQuery,
        category: category || undefined,
        min_stars: minStars || undefined,
        limit: 20,
      }),
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 font-serif text-3xl font-bold text-fg">Search</h1>

      <div className="mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the Dharma..."
            className="w-full rounded-xl border border-bg-border bg-bg-card py-3 pl-12 pr-4 text-fg placeholder:text-fg-subtle focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/30"
            autoFocus
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mt-3 flex items-center gap-2 text-sm text-fg-muted hover:text-saffron-dark"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-4 rounded-xl border border-bg-border bg-bg-card p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-bg-border bg-bg px-3 py-1.5 text-sm text-fg"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">Min stars</label>
              <select
                value={minStars}
                onChange={(e) => setMinStars(Number(e.target.value))}
                className="rounded-lg border border-bg-border bg-bg px-3 py-1.5 text-sm text-fg"
              >
                <option value="0">Any</option>
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>{s}+ stars</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {debouncedQuery.length < 2 && (
        <p className="text-center text-fg-subtle">Type at least 2 characters to search</p>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {data && (
        <>
          <p className="mb-4 text-sm text-fg-muted">
            {data.total} result{data.total !== 1 ? "s" : ""} for &ldquo;{data.query}&rdquo;
          </p>
          {data.results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl">&#10047;</p>
              <p className="mt-4 text-fg-muted">No results found. Try different keywords.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.results.map((item, i) => (
                <ContentCard key={`${item.url}-${i}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
