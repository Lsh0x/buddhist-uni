"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clock, ChevronRight, ExternalLink, Layers, Wifi } from "lucide-react";
import { getStudyPlanById } from "@/lib/api";
import { getStudyPlan } from "@/lib/study-plans";
import { search } from "@/lib/api";
import { getProgress, markCompleted } from "@/lib/progress";
import { ContentCard } from "@/components/content/ContentCard";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import type { CourseProgress, SuttaInPlan } from "@/lib/types";

const NIKAYA_NAMES: Record<string, string> = {
  an: "Aṅguttara Nikāya",
  sn: "Saṁyutta Nikāya",
  mn: "Majjhima Nikāya",
  dn: "Dīgha Nikāya",
  kn: "Khuddaka Nikāya",
};

function SuttaRow({
  sutta,
  index,
  checked,
  onToggle,
}: {
  sutta: SuttaInPlan;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-sage/30 bg-sage/5"
          : "border-bg-border bg-bg-card hover:border-saffron/30"
      }`}
    >
      <button
        onClick={onToggle}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked
            ? "border-sage bg-sage text-white"
            : "border-fg-subtle hover:border-saffron"
        }`}
        aria-label={checked ? "Mark as unread" : "Mark as read"}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 3.5 6.5 9 1" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-fg-subtle">{sutta.sutta_id}</span>
          <span className="text-xs text-fg-subtle opacity-50">·</span>
          <span className="text-xs text-fg-subtle">{sutta.nikaya_name || NIKAYA_NAMES[sutta.nikaya] || sutta.nikaya.toUpperCase()}</span>
          {sutta.local && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-sage/10 px-1.5 py-0.5 text-[10px] font-medium text-sage">
              <Wifi size={9} /> offline
            </span>
          )}
        </div>
        {sutta.local ? (
          <Link
            href={`/suttas/${sutta.sutta_id}`}
            className="group/link mt-1 flex items-center gap-1"
          >
            <span className="font-serif font-medium text-fg group-hover/link:text-saffron-dark">
              {sutta.title}
            </span>
          </Link>
        ) : (
          <a
            href={sutta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link mt-1 flex items-center gap-1"
          >
            <span className="font-serif font-medium text-fg group-hover/link:text-saffron-dark">
              {sutta.title}
            </span>
            <ExternalLink size={12} className="shrink-0 text-fg-subtle opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
        )}
        {sutta.blurb && (
          <p className="mt-1 text-sm text-fg-muted line-clamp-2">{sutta.blurb}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-fg-subtle">
          {sutta.word_count && <span>{sutta.word_count.toLocaleString()} words</span>}
          {sutta.difficulty && (
            <span>
              Difficulty{" "}
              <span className={`font-medium ${
                sutta.difficulty <= 3 ? "text-sage" : sutta.difficulty <= 6 ? "text-saffron-dark" : "text-burgundy"
              }`}>
                {sutta.difficulty <= 3 ? "beginner" : sutta.difficulty <= 6 ? "intermediate" : "advanced"}
              </span>
            </span>
          )}
        </div>
      </div>

      <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-saffron/10 text-xs font-bold text-saffron-dark">
        {index + 1}
      </span>
    </div>
  );
}

// ─── Legacy plan page (hardcoded 10 plans) ───────────────────────────────────

function StageSection({
  stageIndex,
  title,
  description,
  searchQuery,
  tags,
  planSlug,
  progress,
  onToggle,
}: {
  stageIndex: number;
  title: string;
  description: string;
  searchQuery: string;
  tags: string[];
  planSlug: string;
  progress: CourseProgress | null;
  onToggle: (url: string) => void;
}) {
  const [open, setOpen] = useState(stageIndex === 0);

  const { data, isLoading } = useQuery({
    queryKey: ["study-plan-stage", planSlug, stageIndex],
    queryFn: () => search({ q: searchQuery, tags, limit: 5 }),
    enabled: open,
  });

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron/10 text-sm font-bold text-saffron-dark">
          {stageIndex + 1}
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-lg font-bold text-fg">{title}</h3>
          <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
        </div>
        {open ? <ChevronRight size={20} className="rotate-90 text-fg-subtle" /> : <ChevronRight size={20} className="text-fg-subtle" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-5 pb-5">
              {isLoading && Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}
              {data?.results.map((item, i) => (
                <ContentCard
                  key={`${item.url}-${i}`}
                  item={item}
                  showCheckbox
                  checked={progress?.completedItems.includes(item.url)}
                  onToggle={() => onToggle(item.url)}
                />
              ))}
              {data && data.results.length === 0 && (
                <p className="py-4 text-center text-sm text-fg-subtle">No content found for this stage.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegacyStudyPlanPage({ slug }: { slug: string }) {
  const plan = getStudyPlan(slug);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const planId = `study-plan:${slug}`;

  useEffect(() => {
    setProgress(getProgress(planId));
  }, [planId]);

  const handleToggle = useCallback((url: string) => {
    const updated = markCompleted(planId, url);
    setProgress(updated);
  }, [planId]);

  if (!plan) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">&#10047;</p>
        <p className="mt-4 text-fg-muted">Study plan not found.</p>
        <Link href="/study-plans" className="mt-4 inline-block text-saffron-dark hover:underline">
          Back to Study Plans
        </Link>
      </div>
    );
  }

  const completedCount = progress?.completedItems.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/study-plans" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-saffron-dark">
        <ArrowLeft size={14} /> Back to Study Plans
      </Link>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-fg">{plan.title}</h1>
        <p className="mt-2 text-lg text-fg-muted">{plan.subtitle}</p>
        {completedCount > 0 && (
          <p className="mt-2 text-sm text-sage">{completedCount} items completed</p>
        )}
      </div>
      <div className="space-y-4">
        {plan.stages.map((stage, i) => (
          <StageSection
            key={i}
            stageIndex={i}
            title={stage.title}
            description={stage.description}
            searchQuery={stage.searchQuery}
            tags={stage.tags}
            planSlug={slug}
            progress={progress}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

// ─── New cluster-based study plan page ───────────────────────────────────────

function ClusterStudyPlanPage({ clusterId }: { clusterId: number }) {
  const [readItems, setReadItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`cluster-plan:${clusterId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const persistRead = useCallback((next: Set<string>) => {
    setReadItems(next);
    try {
      localStorage.setItem(`cluster-plan:${clusterId}`, JSON.stringify([...next]));
    } catch {
      // ignore storage errors
    }
  }, [clusterId]);

  const handleToggle = useCallback((suttaId: string) => {
    setReadItems((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(suttaId)) next.delete(suttaId);
      else next.add(suttaId);
      persistRead(next);
      return next;
    });
  }, [persistRead]);

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ["study-plan-cluster", clusterId],
    queryFn: () => getStudyPlanById(clusterId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-6 h-4 w-32" />
        <Skeleton className="mb-3 h-8 w-2/3" />
        <Skeleton className="mb-2 h-5 w-full" />
        <Skeleton className="mb-8 h-5 w-3/4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl border border-bg-border bg-bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">&#10047;</p>
        <p className="mt-4 text-fg-muted">Study plan not found.</p>
        <Link href="/study-plans" className="mt-4 inline-block text-saffron-dark hover:underline">
          Back to Study Plans
        </Link>
      </div>
    );
  }

  const readCount = plan.suttas.filter((s) => readItems.has(s.sutta_id)).length;
  const progressPct = plan.suttas.length > 0 ? Math.round((readCount / plan.suttas.length) * 100) : 0;

  const nikayaBreakdown = Object.entries(plan.nikaya_breakdown).sort(([, a], [, b]) => b - a);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/study-plans" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-saffron-dark">
        <ArrowLeft size={14} /> Back to Study Plans
      </Link>

      {/* Plan header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-saffron/10 px-2.5 py-0.5 text-xs font-medium text-saffron-dark capitalize">
            <Layers size={11} /> {plan.theme_category}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
            <Clock size={11} /> {Math.round(plan.reading_minutes / 60)}h reading
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
            <BookOpen size={11} /> {plan.size} suttas
          </span>
        </div>

        <h1 className="font-serif text-3xl font-bold text-fg">{plan.name}</h1>
        {plan.description && (
          <p className="mt-3 text-fg-muted">{plan.description}</p>
        )}

        {plan.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {plan.keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs text-fg-subtle">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Nikaya breakdown */}
        {nikayaBreakdown.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-fg-subtle">
            {nikayaBreakdown.map(([n, count]) => (
              <span key={n}>
                <span className="font-medium text-fg">{NIKAYA_NAMES[n] ?? n.toUpperCase()}</span>
                {" "}{count}
              </span>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {readCount > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-fg-subtle">
              <span>{readCount} of {plan.size} read</span>
              <span className="text-sage font-medium">{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-bg-border">
              <div
                className="h-full rounded-full bg-sage transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sutta list */}
      <div className="space-y-3">
        {plan.suttas.map((sutta, i) => (
          <SuttaRow
            key={sutta.sutta_id}
            sutta={sutta}
            index={i}
            checked={readItems.has(sutta.sutta_id)}
            onToggle={() => handleToggle(sutta.sutta_id)}
          />
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-fg-subtle">
        Translations by{" "}
        <a href="https://suttacentral.net" target="_blank" rel="noopener noreferrer" className="text-saffron-dark hover:underline">
          Bhikkhu Sujato via SuttaCentral
        </a>
        {" "}· CC BY 4.0
      </p>
    </div>
  );
}

// ─── Entry point — routes by slug type ───────────────────────────────────────

export default function StudyPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  // If slug is a number → new cluster-based plan
  const numericId = parseInt(slug, 10);
  if (!isNaN(numericId) && String(numericId) === slug) {
    return <ClusterStudyPlanPage clusterId={numericId} />;
  }

  // Otherwise → legacy hardcoded plan
  return <LegacyStudyPlanPage slug={slug} />;
}
