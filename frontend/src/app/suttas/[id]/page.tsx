"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, ArrowLeft, Layers, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSuttaDetail, getSimilarSuttas } from "@/lib/api";
import { getSuttaText, type SuttaText } from "@/lib/local-content";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SuttaSearchResult } from "@/lib/types";

const NIKAYA_NAMES: Record<string, string> = {
  an: "Aṅguttara Nikāya",
  sn: "Saṁyutta Nikāya",
  mn: "Majjhima Nikāya",
  dn: "Dīgha Nikāya",
  kn: "Khuddaka Nikāya",
};

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

export default function SuttaReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sutta, setSutta] = useState<SuttaText | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuttaText(id).then((data) => {
      setSutta(data);
      setLoading(false);
    });
  }, [id]);

  // Sutta metadata + cluster from API
  const { data: suttaMeta } = useQuery({
    queryKey: ["sutta-detail", id],
    queryFn: () => getSuttaDetail(id),
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-saffron-dark"
      >
        <ArrowLeft size={14} /> Back to Library
      </Link>

      <div className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2.5 py-0.5 text-xs font-medium text-sage">
            <BookOpen size={12} /> Available offline
          </span>
          {suttaMeta?.nikaya_name && (
            <span className="text-xs text-fg-subtle">
              {suttaMeta.nikaya_name}
            </span>
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

        {/* Quick stats */}
        {(suttaMeta?.word_count || suttaMeta?.segment_count) && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-fg-subtle">
            {suttaMeta.word_count && (
              <span>{suttaMeta.word_count.toLocaleString()} words</span>
            )}
            {suttaMeta.segment_count && (
              <span>{suttaMeta.segment_count} segments</span>
            )}
          </div>
        )}
      </div>

      {/* Sutta text */}
      <article className="sutta-text font-serif text-lg leading-relaxed text-fg">
        {sutta.text.split("\n\n").map((paragraph, i) => {
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
          if (paragraph.startsWith("\u201c") || paragraph.startsWith('"')) {
            return (
              <p key={i} className="my-3 text-fg">
                {paragraph}
              </p>
            );
          }
          return (
            <p key={i} className="my-3">
              {paragraph}
            </p>
          );
        })}
      </article>

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
    </div>
  );
}
