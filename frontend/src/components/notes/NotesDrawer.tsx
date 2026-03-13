"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, Trash2, Pencil, Check, Quote, StickyNote, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import { getNotes, createNote, updateNote, deleteNote, type SuttaNote } from "@/lib/notes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  suttaId: string;
  suttaTitle: string;
  nikaya?: string;
  clusterId?: number;
  clusterName?: string;
  /** Pre-filled passage (from text selection or paragraph cite) */
  pendingQuote?: string;
  onQuoteConsumed: () => void;
  onNotesChanged?: (count: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Single note card (view + inline edit)
// ---------------------------------------------------------------------------

function NoteCard({
  note,
  onUpdate,
  onDelete,
}: {
  note: SuttaNote;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
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
      onUpdate(note.id, draft.trim());
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    if (e.key === "Escape") { setDraft(note.content); setEditing(false); }
  };

  const PASSAGE_LIMIT = 120;
  const passageNeedsTruncate = note.passage && note.passage.length > PASSAGE_LIMIT;
  const shownPassage =
    note.passage && passageNeedsTruncate && !quoteExpanded
      ? note.passage.slice(0, PASSAGE_LIMIT) + "…"
      : note.passage;

  return (
    <div className="rounded-xl border border-bg-border bg-bg p-3.5 space-y-2 group">
      {note.passage && (
        <div
          className={passageNeedsTruncate ? "cursor-pointer" : ""}
          onClick={() => passageNeedsTruncate && setQuoteExpanded((v) => !v)}
        >
          <blockquote className="border-l-4 border-saffron/40 pl-3 text-xs italic text-fg-muted leading-relaxed">
            {shownPassage}
          </blockquote>
          {passageNeedsTruncate && (
            <button className="mt-0.5 flex items-center gap-0.5 text-[10px] text-fg-subtle hover:text-saffron-dark">
              {quoteExpanded
                ? <><ChevronUp size={10} /> Réduire</>
                : <><ChevronDown size={10} /> Voir tout</>}
            </button>
          )}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full resize-none rounded-lg border border-saffron/30 bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-saffron/60 focus:ring-1 focus:ring-saffron/20"
            placeholder="Ta réflexion…"
            rows={3}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-fg-subtle">⌘↵ sauvegarder · Échap annuler</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setDraft(note.content); setEditing(false); }}
                className="rounded-lg px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-subtle"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.trim()}
                className="flex items-center gap-1 rounded-lg bg-saffron/20 px-2.5 py-1 text-xs font-medium text-saffron-dark hover:bg-saffron/30 disabled:opacity-40"
              >
                <Check size={12} /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-fg leading-relaxed">{note.content}</p>
      )}

      {!editing && (
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-fg-subtle">{formatDate(note.updated_at)}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              title="Modifier"
            >
              <Pencil size={13} />
            </button>
            {confirmDelete ? (
              <>
                <button
                  onClick={() => onDelete(note.id)}
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-500/10"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md p-1 text-fg-subtle hover:bg-bg-subtle"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-md p-1 text-fg-subtle hover:bg-red-500/10 hover:text-red-500"
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
// New note form
// ---------------------------------------------------------------------------

function NewNoteForm({
  suttaId,
  suttaTitle,
  nikaya,
  clusterId,
  clusterName,
  passage,
  onSaved,
  onClearPassage,
  autoFocus,
}: {
  suttaId: string;
  suttaTitle: string;
  nikaya?: string;
  clusterId?: number;
  clusterName?: string;
  passage?: string;
  onSaved: (note: SuttaNote) => void;
  onClearPassage: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, passage]);

  const handleSave = () => {
    if (!content.trim()) return;
    const note = createNote({
      suttaId,
      suttaTitle,
      content: content.trim(),
      passage,
      nikaya,
      clusterId,
      clusterName,
    });
    setContent("");
    onSaved(note);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  };

  return (
    <div className="space-y-2">
      {passage && (
        <div className="flex items-start gap-2 rounded-lg bg-saffron/5 border border-saffron/20 p-2.5">
          <Quote size={14} className="mt-0.5 shrink-0 text-saffron/60" />
          <div className="flex-1 min-w-0">
            <p className="text-xs italic text-fg-muted leading-relaxed line-clamp-3">{passage}</p>
          </div>
          <button
            onClick={onClearPassage}
            className="shrink-0 text-fg-subtle hover:text-fg"
            title="Retirer la citation"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder={passage ? "Ta réflexion sur ce passage…" : "Prends une note…"}
        className="w-full resize-none rounded-xl border border-bg-border bg-bg-subtle px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-saffron/40 focus:ring-2 focus:ring-saffron/10 transition-colors"
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-fg-subtle">⌘↵ pour sauvegarder</span>
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-saffron px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-saffron-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={13} /> Ajouter
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Drawer
// ---------------------------------------------------------------------------

export function NotesDrawer({
  isOpen,
  onClose,
  suttaId,
  suttaTitle,
  nikaya,
  clusterId,
  clusterName,
  pendingQuote,
  onQuoteConsumed,
  onNotesChanged,
}: NotesDrawerProps) {
  const [notes, setNotes] = useState<SuttaNote[]>([]);
  const [activeQuote, setActiveQuote] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) setNotes(getNotes(suttaId));
  }, [isOpen, suttaId]);

  useEffect(() => {
    if (isOpen && pendingQuote) {
      setActiveQuote(pendingQuote);
      onQuoteConsumed();
    }
  }, [isOpen, pendingQuote, onQuoteConsumed]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Notify parent of count changes
  useEffect(() => {
    onNotesChanged?.(notes.length);
  }, [notes.length, onNotesChanged]);

  const handleSaved = useCallback((note: SuttaNote) => {
    setNotes((prev) => [note, ...prev]);
    setActiveQuote(undefined);
  }, []);

  const handleUpdate = useCallback((id: string, content: string) => {
    updateNote(suttaId, id, content);
    setNotes(getNotes(suttaId));
  }, [suttaId]);

  const handleDelete = useCallback((id: string) => {
    deleteNote(suttaId, id);
    setNotes(getNotes(suttaId));
  }, [suttaId]);

  return (
    <>
      {/* Backdrop — no blur, light overlay so text stays readable */}
      <div
        className={`fixed inset-0 z-[110] bg-black/20 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[120] flex w-full flex-col bg-bg-card shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal
        aria-label="Notes"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-bg-border px-5 py-4">
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-saffron" />
            <div>
              <h2 className="text-sm font-semibold text-fg">Mes notes</h2>
              <p className="text-[11px] text-fg-subtle line-clamp-1">{suttaTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {notes.length > 0 && (
              <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-[11px] font-medium text-saffron-dark">
                {notes.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-fg-subtle hover:bg-bg-subtle hover:text-fg transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* New note form */}
          <div className="border-b border-bg-border px-5 py-4">
            <NewNoteForm
              suttaId={suttaId}
              suttaTitle={suttaTitle}
              nikaya={nikaya}
              clusterId={clusterId}
              clusterName={clusterName}
              passage={activeQuote}
              onSaved={handleSaved}
              onClearPassage={() => setActiveQuote(undefined)}
              autoFocus={isOpen}
            />
          </div>

          {/* Existing notes */}
          <div className="px-5 py-4 space-y-3">
            {notes.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl">📝</p>
                <p className="mt-3 text-sm text-fg-muted">Aucune note pour ce sutta.</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  Sélectionne un passage ou écris directement ci-dessus.
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
