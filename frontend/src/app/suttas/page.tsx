"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, ExternalLink, BookOpen } from "lucide-react";
import Link from "next/link";
import { searchSuttas } from "@/lib/api";
import type { SuttaSearchResult } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

const NIKAYAS = [
  { value: "", label: "All nikāyas" },
  { value: "an", label: "AN — Aṅguttara Nikāya" },
  { value: "sn", label: "SN — Saṁyutta Nikāya" },
  { value: "mn", label: "MN — Majjhima Nikāya" },
  { value: "dn", label: "DN — Dīgha Nikāya" },
  { value: "kn", label: "KN — Khuddaka Nikāya" },
];

const NIKAYA_NAMES: Record<string, string> = {
  an: "AN", sn: "SN", mn: "MN", dn: "DN", kn: "KN",
};

function SuttaCard({ sutta }: { sutta: SuttaSearchResult }) {
  return (
    <a
      href={sutta.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-bg-border bg-bg-card p-5 transition-all hover:border-saffron/40 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-saffron-dark">{sutta.sutta_id}</span>
          <span className="text-xs text-fg-subtle">
            {sutta.nikaya_name || NIKAYA_NAMES[sutta.nikaya] || sutta.nikaya.toUpperCase()}
          </span>
        </div>
        <ExternalLink size={13} className="shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>

      <h3 className="font-serif text-base font-bold text-fg group-hover:text-saffron-dark">
        {sutta.title}
      </h3>

      {sutta.blurb && (
        <p className="mt-1.5 text-sm text-fg-muted line-clamp-2">{sutta.blurb}</p>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between text-xs text-fg-subtle">
        <div className="flex items-center gap-3">
          {sutta.word_count && <span>{sutta.word_count.toLocaleString()} words</span>}
          {sutta.difficulty && (
            <span className={
              sutta.difficulty <= 3 ? "text-sage" : sutta.difficulty <= 6 ? "text-saffron-dark" : "text-burgundy"
            }>
              {sutta.difficulty <= 3 ? "beginner" : sutta.difficulty <= 6 ? "intermediate" : "advanced"}
            </span>
          )}
        </div>
        {sutta.cluster_name && (
          <Link
            href={`/study-plans/${sutta.cluster_id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-full bg-saffron/10 px-2 py-0.5 text-xs text-saffron-dark hover:bg-saffron/20"
          >
            {sutta.cluster_name}
          </Link>
        )}
      </div>
    </a>
  );
}

function SuttaCardSkeleton() {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5 space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function SuttasPage() {
  const [query, setQuery] = useState("impermanence");
  const [debouncedQuery, setDebouncedQuery] = useState("impermanence");
  const [nikaya, setNikaya] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["suttas-search", debouncedQuery, nikaya],
    queryFn: () => searchSuttas({ q: debouncedQuery, nikaya: nikaya || undefined, limit: 24 }),
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold text-fg">Sutta Search</h1>
        <p className="mt-2 text-lg text-fg-muted">
          Search 4,167 suttas by Bhikkhu Sujato — semantic search across the Pāli Canon
        </p>
      </div>

      {/* Search + Filter */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suttas (e.g. mindfulness of breathing, loving kindness, dependent origination…)"
            className="w-full rounded-lg border border-bg-border bg-bg-card py-2.5 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-saffron/50 focus:outline-none focus:ring-1 focus:ring-saffron/30"
          />
          {isLoading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fg-subtle" />
          )}
        </div>

        <select
          value={nikaya}
          onChange={(e) => setNikaya(e.target.value)}
          className="rounded-lg border border-bg-border bg-bg-card px-3 py-2.5 text-sm text-fg focus:border-saffron/50 focus:outline-none"
        >
          {NIKAYAS.map((n) => (
            <option key={n.value} value={n.value}>{n.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => <SuttaCardSkeleton key={i} />)}
        </div>
      ) : results && results.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-fg-subtle">{results.length} suttas found</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((s) => (
              <SuttaCard key={s.sutta_id} sutta={s} />
            ))}
          </div>
        </>
      ) : results && results.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl">&#10047;</p>
          <p className="mt-4 text-fg-muted">No suttas found. Try a different query.</p>
        </div>
      ) : null}

      {/* CTA */}
      <div className="mt-12 rounded-xl border border-saffron/20 bg-saffron/5 p-6 text-center">
        <BookOpen size={28} className="mx-auto mb-3 text-saffron-dark" />
        <h2 className="font-serif text-xl font-bold text-fg">Explore Study Plans</h2>
        <p className="mt-2 text-sm text-fg-muted">
          166 thematic study paths discovered by clustering all 4,167 suttas. Find related texts on any topic.
        </p>
        <Link
          href="/study-plans"
          className="mt-4 inline-block rounded-full bg-saffron px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-saffron-dark transition-colors"
        >
          Browse study plans
        </Link>
      </div>
    </div>
  );
}
