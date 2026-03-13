"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Wifi, WifiOff, Search } from "lucide-react";
import { getAllContent, type ContentItem } from "@/lib/local-content";
import { CATEGORIES } from "@/lib/constants";
import { StarRating } from "@/components/ui/StarRating";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LibraryPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [localOnly, setLocalOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    getAllContent().then((data) => {
      setContent(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let items = content;
    if (category) items = items.filter((c) => c.category === category);
    if (localOnly) items = items.filter((c) => c.local);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.tags.some((t) => t.includes(q)) ||
          c.authors.some((a) => a.toLowerCase().includes(q))
      );
    }
    return items;
  }, [content, category, localOnly, query]);

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const localCount = content.filter((c) => c.local).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-fg">Library</h1>
        <p className="mt-2 text-fg-muted">
          {content.length.toLocaleString()} resources &middot;{" "}
          <span className="text-sage">{localCount} available offline</span>
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Filter by title, tag, or author..."
            className="w-full rounded-lg border border-bg-border bg-bg-card py-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-saffron focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(0); }}
          className="rounded-lg border border-bg-border bg-bg-card px-3 py-2 text-sm text-fg"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <button
          onClick={() => { setLocalOnly(!localOnly); setPage(0); }}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            localOnly
              ? "border-sage bg-sage/10 text-sage"
              : "border-bg-border text-fg-muted hover:border-sage/40"
          }`}
        >
          {localOnly ? <WifiOff size={14} /> : <Wifi size={14} />}
          {localOnly ? "Offline only" : "All resources"}
        </button>
      </div>

      <p className="mb-4 text-sm text-fg-subtle">
        Showing {paginated.length} of {filtered.length.toLocaleString()} results
      </p>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Content list */}
      <div className="space-y-1">
        {paginated.map((item, i) => {
          const href = item.local
            ? `/suttas/${item.slug}`
            : item.external_url || `#`;
          const isExternal = !item.local && item.external_url;

          return (
            <a
              key={`${item.category}-${item.slug}-${i}`}
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg-card"
            >
              {/* Local/External indicator */}
              <div className="shrink-0">
                {item.local ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage/10 text-sage" title="Available offline">
                    <BookOpen size={14} />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-border text-fg-subtle" title="External resource">
                    <ExternalLink size={14} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={item.category} />
                  <h3 className="truncate font-serif text-sm font-medium text-fg group-hover:text-saffron-dark">
                    {item.title}
                  </h3>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                  {item.authors.length > 0 && (
                    <span>{item.authors.slice(0, 2).join(", ")}</span>
                  )}
                  {item.year && <span>{item.year}</span>}
                  {item.tags.length > 0 && (
                    <span className="hidden sm:inline">{item.tags.slice(0, 3).join(", ")}</span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <StarRating stars={item.stars} />
              </div>
            </a>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setPage(page + 1)}
          className="mx-auto mt-6 block rounded-full border border-bg-border px-6 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-saffron/40 hover:text-saffron-dark"
        >
          Load more ({filtered.length - paginated.length} remaining)
        </button>
      )}
    </div>
  );
}
