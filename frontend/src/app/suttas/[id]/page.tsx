"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen, ExternalLink, ArrowLeft, Layers, ChevronRight,
  ChevronLeft, Check, BookMarked, StickyNote, Quote,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSuttaDetail, getSimilarSuttas, getStudyPlanById } from "@/lib/api";
import { getSuttaText, type SuttaText } from "@/lib/local-content";
import { Skeleton } from "@/components/ui/Skeleton";
import { NotesDrawer } from "@/components/notes/NotesDrawer";
import { getNotes } from "@/lib/notes";
import type { SuttaSearchResult, StudyPlanDetail } from "@/lib/types";

const NIKAYA_NAMES: Record<string, string> = {
  an: "Aṅguttara Nikāya",
  sn: "Saṁyutta Nikāya",
  mn: "Majjhima Nikāya",
  dn: "Dīgha Nikāya",
  kn: "Khuddaka Nikāya",
};

// ---------------------------------------------------------------------------
// Study Plan Navigation — sticky bottom bar
// ---------------------------------------------------------------------------

function StudyPlanNav({
  clusterId,
  currentSuttaId,
  plan,
}: {
  clusterId: number;
  currentSuttaId: string;
  plan: StudyPlanDetail;
}) {
  const [readItems, setReadItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`cluster-plan:${clusterId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggle = useCallback(() => {
    setReadItems((prev) => {
      const next = new Set(prev);
      if (next.has(currentSuttaId)) next.delete(currentSuttaId);
      else next.add(currentSuttaId);
      try {
        localStorage.setItem(`cluster-plan:${clusterId}`, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, [clusterId, currentSuttaId]);

  const idx = plan.suttas.findIndex((s) => s.sutta_id === currentSuttaId);
  if (idx === -1) return null;

  const prev = idx > 0 ? plan.suttas[idx - 1] : null;
  const next = idx < plan.suttas.length - 1 ? plan.suttas[idx + 1] : null;
  const isRead = readItems.has(currentSuttaId);
  const readCount = plan.suttas.filter((s) => readItems.has(s.sutta_id)).length;
  const progressPct = plan.suttas.length > 0
    ? Math.round((readCount / plan.suttas.length) * 100)
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-bg-border bg-bg-card/95 backdrop-blur-sm shadow-lg">
      {/* Progress bar */}
      <div className="h-1 bg-bg-border">
        <div
          className="h-full bg-saffron transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center gap-2">
        {/* ← Prev */}
        {prev ? (
          <Link
            href={`/suttas/${prev.sutta_id}`}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-bg-border bg-bg px-3 py-1.5 text-xs font-medium text-fg-muted hover:border-saffron/40 hover:text-saffron-dark transition-colors"
            title={prev.title}
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <div className="w-[4.5rem]" />
        )}

        {/* Center: position + plan name */}
        <div className="flex-1 min-w-0 text-center">
          <div className="text-xs text-fg-subtle">
            <span className="font-semibold text-fg">{idx + 1}</span>
            <span className="mx-0.5 text-fg-subtle">/</span>
            <span>{plan.suttas.length}</span>
            <span className="mx-1.5 text-fg-subtle">·</span>
            <Link
              href={`/study-plans/${clusterId}`}
              className="truncate text-saffron-dark hover:underline"
            >
              {plan.name}
            </Link>
          </div>
          {readCount > 0 && (
            <div className="mt-0.5 text-[10px] text-fg-subtle">
              {readCount} of {plan.suttas.length} read ({progressPct}%)
            </div>
          )}
        </div>

        {/* Mark read + Next → */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleToggle}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isRead
                ? "border-sage/40 bg-sage/10 text-sage hover:bg-sage/20"
                : "border-bg-border bg-bg text-fg-muted hover:border-saffron/40 hover:text-saffron-dark"
            }`}
            title={isRead ? "Mark as unread" : "Mark as read"}
          >
            <Check size={13} />
            <span className="hidden sm:inline">{isRead ? "Read" : "Mark read"}</span>
          </button>

          {next ? (
            <Link
              href={`/suttas/${next.sutta_id}`}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-bg-border bg-bg px-3 py-1.5 text-xs font-medium text-fg-muted hover:border-saffron/40 hover:text-saffron-dark transition-colors"
              title={next.title}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={14} />
            </Link>
          ) : (
            <Link
              href={`/study-plans/${clusterId}`}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-sage/40 bg-sage/10 px-3 py-1.5 text-xs font-medium text-sage hover:bg-sage/20 transition-colors"
              title="Back to study plan"
            >
              <BookMarked size={13} />
              <span className="hidden sm:inline">Done</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection bubble — appears near selected text
// ---------------------------------------------------------------------------

function SelectionBubble({
  position,
  onQuote,
  onDismiss,
}: {
  position: { x: number; y: number };
  onQuote: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed z-[90] flex items-center gap-1 rounded-xl border border-saffron/30 bg-bg-card px-2.5 py-1.5 shadow-lg"
      style={{ left: position.x, top: position.y, transform: "translateX(-50%)" }}
    >
      <button
        onMouseDown={(e) => {
          e.preventDefault(); // keep selection alive
          onQuote();
        }}
        className="flex items-center gap-1.5 text-xs font-medium text-saffron-dark hover:text-saffron"
      >
        <Quote size={13} /> Citer dans une note
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onDismiss(); }}
        className="ml-1 text-fg-subtle hover:text-fg"
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Annotated article — renders paragraphs with cite buttons + selection bubble
// ---------------------------------------------------------------------------

function AnnotatedArticle({
  text,
  noteCountByPassage,
  onCitePassage,
}: {
  text: string;
  noteCountByPassage: Map<string, number>;
  onCitePassage: (passage: string) => void;
}) {
  const [selBubble, setSelBubble] = useState<{ x: number; y: number; text: string } | null>(null);
  const articleRef = useRef<HTMLElement>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelBubble(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 15) {
      setSelBubble(null);
      return;
    }
    // Position bubble above the selection
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelBubble({
      x: rect.left + rect.width / 2,
      y: rect.top - 8 + window.scrollY,
      text,
    });
  }, []);

  const handleQuote = useCallback(() => {
    if (!selBubble) return;
    onCitePassage(selBubble.text);
    setSelBubble(null);
    window.getSelection()?.removeAllRanges();
  }, [selBubble, onCitePassage]);

  const paragraphs = text.split("\n\n");

  return (
    <>
      {selBubble && (
        <SelectionBubble
          position={{ x: selBubble.x, y: selBubble.y }}
          onQuote={handleQuote}
          onDismiss={() => setSelBubble(null)}
        />
      )}

      <article
        ref={articleRef}
        className="sutta-text font-serif text-lg leading-relaxed text-fg"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {paragraphs.map((paragraph, i) => {
          if (paragraph.startsWith("## ")) {
            return (
              <h2 key={i} className="mb-4 mt-8 text-2xl font-bold text-burgundy-dark">
                {paragraph.replace("## ", "")}
              </h2>
            );
          }
          if (paragraph.startsWith("### ")) {
            return (
              <h3 key={i} className="mb-3 mt-6 text-xl font-bold text-burgundy">
                {paragraph.replace("### ", "")}
              </h3>
            );
          }
          if (paragraph.startsWith("> ")) {
            return (
              <blockquote key={i} className="my-4 border-l-4 border-saffron/30 pl-4 italic text-fg-muted">
                {paragraph.replace(/^> /gm, "")}
              </blockquote>
            );
          }
          if (paragraph.startsWith("- ")) {
            return (
              <ul key={i} className="my-4 list-disc pl-6 text-fg-muted">
                {paragraph.split("\n").map((li, j) => (
                  <li key={j}>{li.replace("- ", "")}</li>
                ))}
              </ul>
            );
          }

          // Regular paragraphs — add cite button on hover
          const clean = paragraph.trim();
          if (!clean) return null;
          const count = noteCountByPassage.get(clean) ?? 0;

          return (
            <div key={i} className="group relative my-3">
              <p className={
                paragraph.startsWith("\u201c") || paragraph.startsWith('"')
                  ? "text-fg"
                  : ""
              }>
                {paragraph}
              </p>
              {/* Cite button — visible on hover (or if already has notes) */}
              <button
                onClick={() => onCitePassage(clean)}
                title="Citer dans une note"
                className={`absolute -right-7 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-all
                  ${count > 0
                    ? "border-saffron/40 bg-saffron/10 text-saffron opacity-100"
                    : "border-bg-border bg-bg-card text-fg-subtle opacity-0 group-hover:opacity-100 hover:border-saffron/40 hover:text-saffron-dark"
                  }`}
              >
                {count > 0 ? (
                  <span className="text-[10px] font-bold">{count}</span>
                ) : (
                  <Quote size={11} />
                )}
              </button>
            </div>
          );
        })}
      </article>
    </>
  );
}

// ---------------------------------------------------------------------------
// Similar sutta card
// ---------------------------------------------------------------------------

function SimilarSuttaCard({ sutta }: { sutta: SuttaSearchResult }) {
  const inner = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-fg-subtle">{sutta.sutta_id}</span>
        {sutta.local
          ? <span className="text-[10px] font-medium text-sage">offline</span>
          : <ExternalLink size={11} className="shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </div>
      <p className="font-serif text-sm font-medium text-fg group-hover:text-saffron-dark line-clamp-2">
        {sutta.title}
      </p>
      {sutta.blurb && (
        <p className="mt-1 text-xs text-fg-muted line-clamp-2">{sutta.blurb}</p>
      )}
      <div className="mt-auto pt-2 flex items-center justify-between text-xs text-fg-subtle">
        <span>{sutta.nikaya_name || NIKAYA_NAMES[sutta.nikaya] || sutta.nikaya.toUpperCase()}</span>
        {sutta.word_count && <span>{sutta.word_count.toLocaleString()} words</span>}
      </div>
    </>
  );

  if (sutta.local) {
    return (
      <Link
        href={`/suttas/${sutta.sutta_id}`}
        className="group flex flex-col rounded-lg border border-bg-border bg-bg-card p-4 transition-all hover:border-saffron/40"
      >
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={sutta.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-lg border border-bg-border bg-bg-card p-4 transition-all hover:border-saffron/40"
    >
      {inner}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SuttaReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sutta, setSutta] = useState<SuttaText | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [notesOpen, setNotesOpen] = useState(false);
  const [pendingQuote, setPendingQuote] = useState<string | undefined>();
  const [noteCount, setNoteCount] = useState(0);
  // Map of passage text → number of notes citing it (for inline markers)
  const [noteCountByPassage, setNoteCountByPassage] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setLoading(true);
    getSuttaText(id).then((data) => {
      setSutta(data);
      setLoading(false);
    });
  }, [id]);

  // Load note count from localStorage
  useEffect(() => {
    const notes = getNotes(id);
    setNoteCount(notes.length);
    const map = new Map<string, number>();
    for (const n of notes) {
      if (n.passage) map.set(n.passage, (map.get(n.passage) ?? 0) + 1);
    }
    setNoteCountByPassage(map);
  }, [id, notesOpen]); // refresh when drawer closes

  const handleCitePassage = useCallback((passage: string) => {
    setPendingQuote(passage);
    setNotesOpen(true);
  }, []);

  // Sutta metadata + cluster from API
  const { data: suttaMeta } = useQuery({
    queryKey: ["sutta-detail", id],
    queryFn: () => getSuttaDetail(id),
  });

  // Study plan (fetched only when cluster_id is known)
  const { data: studyPlan } = useQuery({
    queryKey: ["study-plan-cluster", suttaMeta?.cluster_id],
    queryFn: () => getStudyPlanById(suttaMeta!.cluster_id!),
    enabled: suttaMeta?.cluster_id != null,
  });

  // Similar suttas
  const { data: similar } = useQuery({
    queryKey: ["sutta-similar", id],
    queryFn: () => getSimilarSuttas(id, 6),
    enabled: !!suttaMeta,
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/4" />
        <Skeleton className="mt-8 h-96 w-full" />
      </div>
    );
  }

  if (!sutta) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">&#10047;</p>
        <p className="mt-4 text-fg-muted">Sutta not found locally.</p>
        <Link href="/library" className="mt-4 inline-block text-saffron-dark hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const hasNav = studyPlan != null && suttaMeta?.cluster_id != null;

  return (
    <div className={`mx-auto max-w-3xl px-4 py-8 ${hasNav ? "pb-28" : "pb-24"}`}>

      {/* Breadcrumb */}
      {hasNav ? (
        <Link
          href={`/study-plans/${suttaMeta!.cluster_id}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-saffron-dark"
        >
          <ArrowLeft size={14} /> {studyPlan!.name}
        </Link>
      ) : (
        <Link
          href="/library"
          className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-saffron-dark"
        >
          <ArrowLeft size={14} /> Back to Library
        </Link>
      )}

      {/* Position indicator (within study plan) */}
      {hasNav && (() => {
        const idx = studyPlan!.suttas.findIndex((s) => s.sutta_id === id);
        if (idx === -1) return null;
        return (
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-border">
              <div
                className="h-full rounded-full bg-saffron/60 transition-all duration-500"
                style={{ width: `${((idx + 1) / studyPlan!.suttas.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-fg-subtle">
              {idx + 1} / {studyPlan!.suttas.length}
            </span>
          </div>
        );
      })()}

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2.5 py-0.5 text-xs font-medium text-sage">
            <BookOpen size={12} /> Available offline
          </span>
          {suttaMeta?.nikaya_name && (
            <span className="text-xs text-fg-subtle">{suttaMeta.nikaya_name}</span>
          )}
          {suttaMeta?.cluster_id != null && suttaMeta.cluster_name && (
            <Link
              href={`/study-plans/${suttaMeta.cluster_id}`}
              className="inline-flex items-center gap-1 rounded-full bg-saffron/10 px-2.5 py-0.5 text-xs font-medium text-saffron-dark hover:bg-saffron/20"
            >
              <Layers size={11} /> {suttaMeta.cluster_name} <ChevronRight size={10} />
            </Link>
          )}
        </div>

        <h1 className="font-serif text-3xl font-bold leading-tight text-fg">{sutta.title}</h1>

        {suttaMeta?.translator && (
          <p className="mt-2 text-fg-muted">
            Translated by{" "}
            <Link href={`/teachers/${suttaMeta.translator}`} className="text-saffron-dark hover:underline">
              {suttaMeta.translator}
            </Link>
          </p>
        )}
        {!suttaMeta?.translator && sutta.translator && (
          <p className="mt-2 text-fg-muted">
            Translated by{" "}
            <Link href={`/teachers/${sutta.translator}`} className="text-saffron-dark hover:underline">
              {sutta.translator}
            </Link>
          </p>
        )}

        {suttaMeta?.blurb ? (
          <blockquote className="mt-4 border-l-4 border-saffron/30 pl-4 italic text-fg-muted">
            {suttaMeta.blurb}
          </blockquote>
        ) : sutta.description ? (
          <blockquote className="mt-4 border-l-4 border-saffron/30 pl-4 italic text-fg-muted">
            {sutta.description}
          </blockquote>
        ) : null}

        {(suttaMeta?.word_count || suttaMeta?.segment_count) && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-fg-subtle">
            {suttaMeta.word_count && <span>{suttaMeta.word_count.toLocaleString()} words</span>}
            {suttaMeta.segment_count && <span>{suttaMeta.segment_count} segments</span>}
          </div>
        )}
      </div>

      {/* Article with annotations */}
      <AnnotatedArticle
        text={sutta.text}
        noteCountByPassage={noteCountByPassage}
        onCitePassage={handleCitePassage}
      />

      {/* Inline prev/next */}
      {hasNav && (() => {
        const idx = studyPlan!.suttas.findIndex((s) => s.sutta_id === id);
        if (idx === -1) return null;
        const prev = idx > 0 ? studyPlan!.suttas[idx - 1] : null;
        const next = idx < studyPlan!.suttas.length - 1 ? studyPlan!.suttas[idx + 1] : null;
        return (
          <div className="mt-10 grid grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={`/suttas/${prev.sutta_id}`}
                className="group flex flex-col rounded-xl border border-bg-border bg-bg-card p-4 hover:border-saffron/40 transition-colors"
              >
                <span className="mb-1 flex items-center gap-1 text-xs text-fg-subtle">
                  <ChevronLeft size={12} /> Previous
                </span>
                <span className="font-mono text-[11px] text-fg-subtle">{prev.sutta_id}</span>
                <span className="mt-0.5 font-serif text-sm font-medium text-fg group-hover:text-saffron-dark line-clamp-2">
                  {prev.title}
                </span>
              </Link>
            ) : <div />}

            {next ? (
              <Link
                href={`/suttas/${next.sutta_id}`}
                className="group flex flex-col rounded-xl border border-bg-border bg-bg-card p-4 hover:border-saffron/40 transition-colors text-right"
              >
                <span className="mb-1 flex items-center justify-end gap-1 text-xs text-fg-subtle">
                  Next <ChevronRight size={12} />
                </span>
                <span className="font-mono text-[11px] text-fg-subtle">{next.sutta_id}</span>
                <span className="mt-0.5 font-serif text-sm font-medium text-fg group-hover:text-saffron-dark line-clamp-2">
                  {next.title}
                </span>
              </Link>
            ) : (
              <Link
                href={`/study-plans/${suttaMeta!.cluster_id}`}
                className="group flex flex-col items-end rounded-xl border border-sage/30 bg-sage/5 p-4 hover:bg-sage/10 transition-colors text-right"
              >
                <span className="mb-1 flex items-center justify-end gap-1 text-xs text-sage">
                  <BookMarked size={12} /> Plan complete!
                </span>
                <span className="font-serif text-sm font-medium text-sage line-clamp-2">
                  Back to {studyPlan!.name}
                </span>
              </Link>
            )}
          </div>
        );
      })()}

      {/* Similar suttas */}
      {similar && similar.length > 0 && (
        <div className="mt-12 border-t border-bg-border pt-8">
          <h2 className="mb-4 font-serif text-xl font-bold text-fg">Similar Suttas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {similar.map((s) => (
              <SimilarSuttaCard key={s.sutta_id} sutta={s} />
            ))}
          </div>
          {suttaMeta?.cluster_id != null && (
            <div className="mt-4 text-center">
              <Link
                href={`/study-plans/${suttaMeta.cluster_id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-saffron-dark hover:underline"
              >
                View full study plan <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-12 border-t border-bg-border pt-6 text-center text-sm text-fg-subtle">
        <p>
          Text from{" "}
          <a
            href="https://suttacentral.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-saffron-dark hover:underline"
          >
            SuttaCentral <ExternalLink size={12} />
          </a>
        </p>
        <p className="mt-1">Licensed under Creative Commons CC BY 4.0</p>
      </div>

      {/* Sticky bottom nav (study plan) */}
      {hasNav && (
        <StudyPlanNav
          clusterId={suttaMeta!.cluster_id!}
          currentSuttaId={id}
          plan={studyPlan!}
        />
      )}

      {/* ── Floating notes button ───────────────────────────────── */}
      <button
        onClick={() => setNotesOpen(true)}
        className={`fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-full shadow-lg px-4 py-3 text-sm font-medium transition-all
          ${hasNav ? "bottom-20" : "bottom-6"}
          ${noteCount > 0
            ? "bg-saffron text-white hover:bg-saffron-dark"
            : "bg-bg-card border border-bg-border text-fg-muted hover:border-saffron/40 hover:text-saffron-dark"
          }`}
        title="Mes notes"
      >
        <StickyNote size={16} />
        {noteCount > 0 && (
          <span className="font-semibold">{noteCount}</span>
        )}
      </button>

      {/* Notes Drawer */}
      <NotesDrawer
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        suttaId={id}
        suttaTitle={sutta.title}
        nikaya={suttaMeta?.nikaya}
        clusterId={suttaMeta?.cluster_id ?? undefined}
        clusterName={suttaMeta?.cluster_name ?? undefined}
        pendingQuote={pendingQuote}
        onQuoteConsumed={() => setPendingQuote(undefined)}
        onNotesChanged={(count) => setNoteCount(count)}
      />
    </div>
  );
}
