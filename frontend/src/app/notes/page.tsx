"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  StickyNote, BookOpen, Layers, LayoutList, Clock,
  Quote, Pencil, Trash2, Check, X, ChevronDown, ChevronUp,
  Download,
} from "lucide-react";
import {
  getAllNotes, getNotesByNikaya, getNotesByCluster, getNotesBySutta,
  updateNote, deleteNote,
  NIKAYA_LABELS,
  type SuttaNote,
} from "@/lib/notes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "all" | "nikaya" | "cluster" | "sutta";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "all",     label: "Toutes",         icon: <Clock size={14} /> },
  { id: "nikaya",  label: "Par Nikāya",      icon: <BookOpen size={14} /> },
  { id: "cluster", label: "Par plan d'étude", icon: <Layers size={14} /> },
  { id: "sutta",   label: "Par sutta",       icon: <LayoutList size={14} /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}

function nikayaLabel(n: string): string {
  return NIKAYA_LABELS[n] ?? n.toUpperCase();
}

function clusterLabel(key: string): string {
  const parts = key.split("::");
  return parts[1] ?? key;
}

// ---------------------------------------------------------------------------
// Single note card (with inline edit + delete)
// ---------------------------------------------------------------------------

function NoteCard({
  note,
  showSutta = false,
  onChanged,
}: {
  note: SuttaNote;
  showSutta?: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    if (draft.trim()) {
      updateNote(note.sutta_id, note.id, draft.trim());
      note.content = draft.trim(); // local mutation for instant feedback
      setEditing(false);
      onChanged();
    }
  };

  const handleDelete = () => {
    deleteNote(note.sutta_id, note.id);
    onChanged();
  };

  const LIMIT = 150;
  const needsTruncate = note.passage && note.passage.length > LIMIT;
  const shownPassage = note.passage && needsTruncate && !quoteExpanded
    ? note.passage.slice(0, LIMIT) + "…"
    : note.passage;

  return (
    <div className="group rounded-xl border border-bg-border bg-bg-card p-4 space-y-2.5 hover:border-saffron/20 transition-colors">
      {/* Sutta link (shown in flat / grouped views) */}
      {showSutta && (
        <Link
          href={`/suttas/${note.sutta_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-saffron-dark hover:underline"
        >
          <BookOpen size={12} />
          <span className="font-mono">{note.sutta_id}</span>
          <span className="text-fg-subtle">·</span>
          <span className="truncate max-w-[200px]">{note.sutta_title}</span>
        </Link>
      )}

      {/* Quoted passage */}
      {note.passage && (
        <div
          className={needsTruncate ? "cursor-pointer" : ""}
          onClick={() => needsTruncate && setQuoteExpanded((v) => !v)}
        >
          <blockquote className="flex gap-2 border-l-4 border-saffron/30 pl-3">
            <Quote size={12} className="mt-0.5 shrink-0 text-saffron/40" />
            <p className="text-xs italic text-fg-muted leading-relaxed">{shownPassage}</p>
          </blockquote>
          {needsTruncate && (
            <button className="mt-0.5 ml-5 flex items-center gap-0.5 text-[10px] text-fg-subtle hover:text-saffron-dark">
              {quoteExpanded ? <><ChevronUp size={10} /> Réduire</> : <><ChevronDown size={10} /> Voir tout</>}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
              if (e.key === "Escape") { setDraft(note.content); setEditing(false); }
            }}
            className="w-full resize-none rounded-lg border border-saffron/30 bg-bg px-3 py-2 text-sm text-fg outline-none focus:ring-1 focus:ring-saffron/20"
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setDraft(note.content); setEditing(false); }}
              className="rounded-lg px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-subtle"
            >Annuler</button>
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="flex items-center gap-1 rounded-lg bg-saffron/20 px-2.5 py-1 text-xs font-medium text-saffron-dark hover:bg-saffron/30 disabled:opacity-40"
            >
              <Check size={12} /> Sauvegarder
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-fg leading-relaxed">{note.content}</p>
      )}

      {/* Footer */}
      {!editing && (
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-fg-subtle">{formatDate(note.updated_at)}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              title="Modifier"
            >
              <Pencil size={13} />
            </button>
            {confirmDelete ? (
              <>
                <button onClick={handleDelete} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-500/10">
                  Confirmer
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-md p-1 text-fg-subtle hover:bg-bg-subtle">
                  <X size={13} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-md p-1.5 text-fg-subtle hover:bg-red-500/10 hover:text-red-500"
                title="Supprimer"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group block (collapsible)
// ---------------------------------------------------------------------------

function NoteGroup({
  title,
  subtitle,
  notes,
  showSutta,
  onChanged,
}: {
  title: string;
  subtitle?: string;
  notes: SuttaNote[];
  showSutta?: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-bg-subtle transition-colors text-left"
      >
        <div>
          <h3 className="font-serif text-base font-semibold text-fg">{title}</h3>
          {subtitle && <p className="text-xs text-fg-subtle mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="rounded-full bg-saffron/10 px-2.5 py-0.5 text-xs font-medium text-saffron-dark">
            {notes.length}
          </span>
          {open ? <ChevronUp size={16} className="text-fg-subtle" /> : <ChevronDown size={16} className="text-fg-subtle" />}
        </div>
      </button>

      {/* Notes */}
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} showSutta={showSutta} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NotesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [allNotes, setAllNotes] = useState<SuttaNote[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    setAllNotes(getAllNotes());
  }, []);

  useEffect(() => {
    reload();
    setLoaded(true);
  }, [reload]);

  // Build grouped views from allNotes
  const byNikaya = useMemo(() => getNotesByNikaya(), [allNotes]); // eslint-disable-line react-hooks/exhaustive-deps
  const byCluster = useMemo(() => getNotesByCluster(), [allNotes]); // eslint-disable-line react-hooks/exhaustive-deps
  const bySutta = useMemo(() => getNotesBySutta(), [allNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Export all notes as JSON
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(allNotes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buddhist-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-fg-subtle">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={22} className="text-saffron" />
            <h1 className="font-serif text-3xl font-bold text-fg">Mes notes</h1>
          </div>
          {allNotes.length > 0 ? (
            <p className="text-fg-muted">
              {allNotes.length} note{allNotes.length > 1 ? "s" : ""} sur{" "}
              {new Set(allNotes.map((n) => n.sutta_id)).size} sutta
              {new Set(allNotes.map((n) => n.sutta_id)).size > 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-fg-muted">Aucune note pour l'instant.</p>
          )}
        </div>
        {allNotes.length > 0 && (
          <button
            onClick={handleExport}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-bg-border px-3 py-2 text-xs font-medium text-fg-muted hover:border-saffron/40 hover:text-saffron-dark transition-colors"
          >
            <Download size={13} /> Exporter JSON
          </button>
        )}
      </div>

      {/* Empty state */}
      {allNotes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-bg-border p-12 text-center">
          <p className="text-4xl mb-4">📖</p>
          <p className="font-serif text-lg text-fg-muted">
            Commence à lire des suttas pour prendre des notes.
          </p>
          <Link
            href="/suttas"
            className="mt-4 inline-flex items-center gap-1 text-sm text-saffron-dark hover:underline"
          >
            Explorer les suttas →
          </Link>
        </div>
      )}

      {allNotes.length > 0 && (
        <>
          {/* Tabs */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-bg-border bg-bg-subtle p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-bg-card shadow-sm text-fg"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── All notes (flat, newest first) ── */}
          {activeTab === "all" && (
            <div className="space-y-3">
              {allNotes.map((note) => (
                <NoteCard key={note.id} note={note} showSutta onChanged={reload} />
              ))}
            </div>
          )}

          {/* ── By Nikāya ── */}
          {activeTab === "nikaya" && (
            <div className="space-y-4">
              {/* Sort: DN, MN, SN, AN first; then rest alphabetically */}
              {[...byNikaya.entries()]
                .sort(([a], [b]) => {
                  const ORDER = ["dn", "mn", "sn", "an", "dhp", "ud", "iti", "snp", "thag", "thig", "ja"];
                  const ia = ORDER.indexOf(a);
                  const ib = ORDER.indexOf(b);
                  if (ia !== -1 && ib !== -1) return ia - ib;
                  if (ia !== -1) return -1;
                  if (ib !== -1) return 1;
                  return a.localeCompare(b);
                })
                .map(([nikaya, notes]) => (
                  <NoteGroup
                    key={nikaya}
                    title={nikayaLabel(nikaya)}
                    subtitle={`${notes.length} note${notes.length > 1 ? "s" : ""} · ${new Set(notes.map((n) => n.sutta_id)).size} sutta${new Set(notes.map((n) => n.sutta_id)).size > 1 ? "s" : ""}`}
                    notes={notes}
                    showSutta
                    onChanged={reload}
                  />
                ))}
            </div>
          )}

          {/* ── By Study Plan / Cluster ── */}
          {activeTab === "cluster" && (
            <div className="space-y-4">
              {[...byCluster.entries()]
                .sort(([a], [b]) => {
                  // uncategorized last
                  if (a === "uncategorized") return 1;
                  if (b === "uncategorized") return -1;
                  return byCluster.get(b)!.length - byCluster.get(a)!.length;
                })
                .map(([key, notes]) => {
                  const isUncategorized = key === "uncategorized";
                  const parts = key.split("::");
                  const clusterId = isUncategorized ? null : parseInt(parts[0]);
                  const name = isUncategorized ? "Sans plan d'étude" : (parts[1] ?? key);

                  return (
                    <NoteGroup
                      key={key}
                      title={name}
                      subtitle={
                        clusterId != null
                          ? `Plan #${clusterId} · ${notes.length} note${notes.length > 1 ? "s" : ""}`
                          : `${notes.length} note${notes.length > 1 ? "s" : ""}`
                      }
                      notes={notes}
                      showSutta
                      onChanged={reload}
                    />
                  );
                })}
            </div>
          )}

          {/* ── By Sutta ── */}
          {activeTab === "sutta" && (
            <div className="space-y-4">
              {[...bySutta.entries()]
                .sort(([, a], [, b]) => b.length - a.length) // most notes first
                .map(([key, notes]) => {
                  const [suttaId, suttaTitle] = key.split("::");
                  return (
                    <NoteGroup
                      key={key}
                      title={suttaTitle ?? suttaId}
                      subtitle={`${suttaId} · ${notes.length} note${notes.length > 1 ? "s" : ""}`}
                      notes={notes}
                      showSutta={false}
                      onChanged={reload}
                    />
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
