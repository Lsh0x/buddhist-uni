/**
 * Notes — localStorage-backed note-taking per sutta.
 *
 * Storage key: `sutta-notes:{suttaId}` → JSON array of SuttaNote[]
 * (newest first after each write)
 */

export interface SuttaNote {
  id: string;
  sutta_id: string;
  sutta_title: string;
  nikaya?: string;        // "dn", "mn", "sn", "an", "ud", etc.
  cluster_id?: number;    // HDBSCAN cluster (study plan)
  cluster_name?: string;  // human-readable cluster name
  /** Optional quoted passage from the sutta text */
  passage?: string;
  /** User's own reflection / note text */
  content: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function storageKey(suttaId: string): string {
  return `sutta-notes:${suttaId}`;
}

/** Derive nikaya prefix from sutta_id, e.g. "sn12.15" → "sn" */
export function deriveNikaya(suttaId: string): string {
  const m = suttaId.match(/^([a-z]+)/i);
  return m ? m[1].toLowerCase() : "other";
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getNotes(suttaId: string): SuttaNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(suttaId));
    return raw ? (JSON.parse(raw) as SuttaNote[]) : [];
  } catch {
    return [];
  }
}

export interface CreateNoteOptions {
  suttaId: string;
  suttaTitle: string;
  content: string;
  passage?: string;
  nikaya?: string;
  clusterId?: number;
  clusterName?: string;
}

export function createNote(opts: CreateNoteOptions): SuttaNote {
  const notes = getNotes(opts.suttaId);
  const now = new Date().toISOString();
  const note: SuttaNote = {
    id: uid(),
    sutta_id: opts.suttaId,
    sutta_title: opts.suttaTitle,
    content: opts.content,
    passage: opts.passage?.trim() || undefined,
    nikaya: opts.nikaya ?? deriveNikaya(opts.suttaId),
    cluster_id: opts.clusterId,
    cluster_name: opts.clusterName,
    created_at: now,
    updated_at: now,
  };
  notes.unshift(note);
  localStorage.setItem(storageKey(opts.suttaId), JSON.stringify(notes));
  return note;
}

export function updateNote(
  suttaId: string,
  id: string,
  content: string,
): SuttaNote | null {
  const notes = getNotes(suttaId);
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = { ...notes[idx], content, updated_at: new Date().toISOString() };
  localStorage.setItem(storageKey(suttaId), JSON.stringify(notes));
  return notes[idx];
}

export function deleteNote(suttaId: string, id: string): void {
  const notes = getNotes(suttaId).filter((n) => n.id !== id);
  localStorage.setItem(storageKey(suttaId), JSON.stringify(notes));
}

// ---------------------------------------------------------------------------
// Global (all suttas)
// ---------------------------------------------------------------------------

/** Return all note storage keys present in localStorage */
export function getAllNoteKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("sutta-notes:")) keys.push(k);
  }
  return keys;
}

export function getAllNotes(): SuttaNote[] {
  return getAllNoteKeys()
    .flatMap((k) => {
      try {
        const raw = localStorage.getItem(k);
        return raw ? (JSON.parse(raw) as SuttaNote[]) : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getTotalNoteCount(): number {
  return getAllNoteKeys().reduce((sum, k) => {
    try {
      const raw = localStorage.getItem(k);
      return sum + (raw ? (JSON.parse(raw) as SuttaNote[]).length : 0);
    } catch {
      return sum;
    }
  }, 0);
}

/** Group notes by nikaya prefix */
export function getNotesByNikaya(): Map<string, SuttaNote[]> {
  const all = getAllNotes();
  const map = new Map<string, SuttaNote[]>();
  for (const note of all) {
    const n = note.nikaya ?? deriveNikaya(note.sutta_id);
    if (!map.has(n)) map.set(n, []);
    map.get(n)!.push(note);
  }
  return map;
}

/** Group notes by cluster_id / cluster_name */
export function getNotesByCluster(): Map<string, SuttaNote[]> {
  const all = getAllNotes();
  const map = new Map<string, SuttaNote[]>();
  for (const note of all) {
    const key = note.cluster_id != null
      ? `${note.cluster_id}::${note.cluster_name ?? "Study Plan " + note.cluster_id}`
      : "uncategorized";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  return map;
}

/** Group notes by sutta */
export function getNotesBySutta(): Map<string, SuttaNote[]> {
  const all = getAllNotes();
  const map = new Map<string, SuttaNote[]>();
  for (const note of all) {
    const key = `${note.sutta_id}::${note.sutta_title}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  return map;
}

// Human-readable nikaya names
export const NIKAYA_LABELS: Record<string, string> = {
  dn:   "Dīgha Nikāya",
  mn:   "Majjhima Nikāya",
  sn:   "Saṁyutta Nikāya",
  an:   "Aṅguttara Nikāya",
  dhp:  "Dhammapada",
  ud:   "Udāna",
  iti:  "Itivuttaka",
  snp:  "Sutta Nipāta",
  thag: "Theragāthā",
  thig: "Therīgāthā",
  ja:   "Jātaka",
  other: "Other",
};
