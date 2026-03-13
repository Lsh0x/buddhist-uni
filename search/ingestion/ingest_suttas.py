"""
Sutta ingestion pipeline: indexes all English (Sujato) translations from sc-data
into a dedicated Qdrant collection 'buddhist_suttas'.

Sources:
  - sc-data/sc_bilara_data/translation/en/sujato/sutta/ (Bilara JSON)
  - sc-data/sc_bilara_data/root/en/blurb/ (per-sutta blurbs)
  - sc-data/additional-info/difficulties.json (1-3 difficulty scale, DN+MN)

Covers: AN (1408), SN (1819), MN (152), DN (34), KN (754) = ~4167 suttas

Usage:
    cd /path/to/buddhist-uni.github.io
    python -m search.ingestion.ingest_suttas               # full index
    python -m search.ingestion.ingest_suttas --limit 50    # test mode
    python -m search.ingestion.ingest_suttas --recreate    # full re-index
    python -m search.ingestion.ingest_suttas --nikaya dn   # one nikaya only
    python -m search.ingestion.ingest_suttas --dry-run     # parse only, no upsert
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Iterator

from tqdm import tqdm
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    OptimizersConfigDiff,
    PointStruct,
    VectorParams,
)

from .embedder import get_embedder

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

COLLECTION_NAME = "buddhist_suttas"
VECTOR_SIZE = 384
QDRANT_URL = "http://localhost:6333"
BATCH_SIZE = 64

REPO_ROOT = Path(__file__).parent.parent.parent
SC_DATA = REPO_ROOT / "sc-data"
TRANSLATIONS_DIR = SC_DATA / "sc_bilara_data" / "translation" / "en" / "sujato" / "sutta"
BLURBS_DIR = SC_DATA / "sc_bilara_data" / "root" / "en" / "blurb"
DIFFICULTIES_FILE = SC_DATA / "additional-info" / "difficulties.json"

# Nikaya human-readable names
NIKAYA_NAMES: dict[str, str] = {
    "an": "Aṅguttara Nikāya",
    "dn": "Dīgha Nikāya",
    "mn": "Majjhima Nikāya",
    "sn": "Saṁyutta Nikāya",
    # KN sub-collections
    "dhp": "Dhammapada",
    "ud": "Udāna",
    "iti": "Itivuttaka",
    "snp": "Sutta Nipāta",
    "thag": "Theragāthā",
    "thig": "Therīgāthā",
    "ja": "Jātaka",
    "kp": "Khuddakapāṭha",
    "cp": "Cariyāpiṭaka",
}

# Blurb file map: nikaya prefix → blurb JSON filename stem
BLURB_FILES: dict[str, str] = {
    "an": "an-blurbs_root-en",
    "dn": "dn-blurbs_root-en",
    "mn": "mn-blurbs_root-en",
    "sn": "sn-blurbs_root-en",
    "snp": "snp-blurbs_root-en",
    "ud": "ud-blurbs_root-en",
    "iti": "iti-blurbs_root-en",
    "ja": "ja-blurbs_root-en",
    "kp": "kp-blurbs_root-en",
    "pv": "pv-blurbs_root-en",
    "vv": "vv-blurbs_root-en",
}


# ---------------------------------------------------------------------------
# Blurb & difficulty loading
# ---------------------------------------------------------------------------

def load_blurbs() -> dict[str, dict[str, str]]:
    """
    Load all blurb files into a dict: {nikaya_prefix → {sutta_id → blurb}}.
    Blurb keys in JSON are like 'an-blurbs:an3.1' → normalised to 'an3.1'.
    """
    blurbs: dict[str, dict[str, str]] = {}
    for nikaya, stem in BLURB_FILES.items():
        fpath = BLURBS_DIR / f"{stem}.json"
        if not fpath.exists():
            continue
        raw = json.loads(fpath.read_text())
        # Strip the prefix: 'an-blurbs:an3.1' → 'an3.1'
        cleaned = {}
        for k, v in raw.items():
            sutta_id = k.split(":", 1)[-1] if ":" in k else k
            if v and v.strip():
                cleaned[sutta_id] = v.strip()
        blurbs[nikaya] = cleaned
    return blurbs


def load_difficulties() -> dict[str, int]:
    """
    Load difficulty scores (1–3) for DN and MN.
    Returns flat dict: {'dn1': 3, 'mn1': 1, ...}
    """
    if not DIFFICULTIES_FILE.exists():
        return {}
    raw = json.loads(DIFFICULTIES_FILE.read_text())
    result = {}
    for _nikaya, entries in raw.items():
        if isinstance(entries, dict):
            result.update(entries)
    return result


# ---------------------------------------------------------------------------
# Sutta file discovery & parsing
# ---------------------------------------------------------------------------

def get_sutta_files(nikaya_filter: str | None = None) -> list[Path]:
    """
    Return all Sujato translation JSON files, optionally filtered by nikaya.
    """
    if not TRANSLATIONS_DIR.exists():
        raise FileNotFoundError(f"Translations dir not found: {TRANSLATIONS_DIR}")

    if nikaya_filter:
        target = TRANSLATIONS_DIR / nikaya_filter.lower()
        if not target.exists():
            raise FileNotFoundError(f"Nikaya dir not found: {target}")
        files = list(target.rglob("*_translation-en-sujato.json"))
    else:
        files = list(TRANSLATIONS_DIR.rglob("*_translation-en-sujato.json"))

    return sorted(files)


def extract_sutta_id(file_path: Path) -> str:
    """
    'dn8_translation-en-sujato.json' → 'dn8'
    'sn1.12_translation-en-sujato.json' → 'sn1.12'
    """
    return file_path.name.split("_translation")[0]


def extract_nikaya(file_path: Path) -> str:
    """
    Determine the nikaya from path parts.
    e.g. .../sutta/dn/dn8... → 'dn'
         .../sutta/kn/dhp/... → 'dhp'
         .../sutta/sn/sn1/... → 'sn'
    """
    parts = file_path.parts
    try:
        sutta_idx = parts.index("sutta")
        nikaya = parts[sutta_idx + 1]  # 'dn', 'mn', 'sn', 'an', 'kn'
        if nikaya == "kn":
            # Use the sub-collection (dhp, ud, iti, ...)
            return parts[sutta_idx + 2] if len(parts) > sutta_idx + 2 else "kn"
        return nikaya
    except (ValueError, IndexError):
        # Fallback: infer from filename
        sutta_id = extract_sutta_id(file_path)
        return re.match(r"[a-z-]+", sutta_id).group()


def parse_sutta(
    file_path: Path,
    blurbs: dict[str, dict[str, str]],
    difficulties: dict[str, int],
) -> dict | None:
    """
    Parse a Bilara JSON translation file into a structured sutta record.

    Returns None if the file is empty or cannot be parsed.
    """
    try:
        raw = json.loads(file_path.read_text())
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return None

    if not raw:
        return None

    sutta_id = extract_sutta_id(file_path)
    nikaya = extract_nikaya(file_path)

    # --- Title: first two segments are collection name + sutta name ---
    segments = list(raw.values())
    title = ""
    if len(segments) >= 2:
        # e.g. ["Long Discourses 8 ", "The Lion's Roar to the Naked Ascetic Kassapa "]
        coll_name = segments[0].strip()
        sutta_name = segments[1].strip()
        if sutta_name:
            title = sutta_name
        elif coll_name:
            title = coll_name
    if not title:
        title = sutta_id.upper()

    # --- Full English text (all segments joined) ---
    full_text = " ".join(s.strip() for s in segments if s.strip())
    word_count = len(full_text.split())
    text_preview = full_text[:800]

    # --- Blurb lookup ---
    nikaya_blurbs = blurbs.get(nikaya, {})
    blurb = nikaya_blurbs.get(sutta_id, "")

    # --- Difficulty ---
    difficulty = difficulties.get(sutta_id, None)

    # --- URL ---
    url = f"https://suttacentral.net/{sutta_id}/en/sujato"

    return {
        "sutta_id": sutta_id,
        "nikaya": nikaya,
        "nikaya_name": NIKAYA_NAMES.get(nikaya, nikaya.upper()),
        "title": title,
        "blurb": blurb,
        "difficulty": difficulty,
        "word_count": word_count,
        "segment_count": len(raw),
        "text_preview": text_preview,
        "full_text": full_text,  # used for embedding only, not stored
        "url": url,
        "translator": "sujato",
    }


# ---------------------------------------------------------------------------
# Embedding text construction
# ---------------------------------------------------------------------------

def build_embed_text(sutta: dict) -> str:
    """
    Build rich text for embedding with weighted repetition.
    - Title: 3x (most discriminative)
    - Blurb: 2x (curated semantic summary)
    - Text preview: 1x
    """
    parts: list[str] = []

    title = sutta["title"].strip()
    if title:
        parts.extend([title] * 3)

    blurb = sutta["blurb"].strip()
    if blurb:
        parts.extend([blurb] * 2)

    preview = sutta["text_preview"].strip()
    if preview:
        parts.append(preview)

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Qdrant collection setup
# ---------------------------------------------------------------------------

def setup_suttas_collection(client: QdrantClient, recreate: bool = False) -> None:
    """Create or verify the 'buddhist_suttas' Qdrant collection."""
    existing = [c.name for c in client.get_collections().collections]

    if COLLECTION_NAME in existing:
        if recreate:
            print(f"🗑️  Suppression de la collection existante '{COLLECTION_NAME}'...")
            client.delete_collection(COLLECTION_NAME)
        else:
            info = client.get_collection(COLLECTION_NAME)
            print(f"✅ Collection '{COLLECTION_NAME}' existante ({info.points_count} points)")
            return

    print(f"🔧 Création de la collection '{COLLECTION_NAME}'...")
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE,
        ),
        optimizers_config=OptimizersConfigDiff(
            indexing_threshold=1000,  # build HNSW after 1000 points (~4k suttas → always indexed)
        ),
    )

    # Payload indexes for fast filtering
    keyword_fields = ["nikaya", "translator"]
    integer_fields = ["difficulty", "word_count", "segment_count"]

    for field in keyword_fields:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name=field,
            field_schema="keyword",
        )
    for field in integer_fields:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name=field,
            field_schema="integer",
        )

    print(f"✅ Collection '{COLLECTION_NAME}' créée")
    print(f"   Dimensions: {VECTOR_SIZE}, Distance: COSINE, HNSW threshold: 1000")


# ---------------------------------------------------------------------------
# ID generation
# ---------------------------------------------------------------------------

def sutta_to_id(sutta_id: str) -> int:
    """Stable integer ID for a sutta (for Qdrant point ID)."""
    return int(hashlib.md5(sutta_id.encode()).hexdigest()[:16], 16) % (2**63)


# ---------------------------------------------------------------------------
# Main ingestion
# ---------------------------------------------------------------------------

def iter_batches(items: list, batch_size: int) -> Iterator[list]:
    for i in range(0, len(items), batch_size):
        yield items[i : i + batch_size]


def ingest(
    limit: int | None = None,
    batch_size: int = BATCH_SIZE,
    recreate: bool = False,
    nikaya: str | None = None,
    dry_run: bool = False,
    verbose: bool = False,
) -> int:
    """
    Run the full sutta ingestion pipeline.

    Returns:
        Number of suttas successfully indexed.
    """
    print("📖 Chargement des blurbs et difficultés...")
    blurbs = load_blurbs()
    difficulties = load_difficulties()

    total_blurbs = sum(len(v) for v in blurbs.values())
    print(f"   {total_blurbs} blurbs chargés, {len(difficulties)} scores de difficulté")

    print(f"🔍 Recherche des fichiers Sujato EN ({nikaya or 'toutes nikayas'})...")
    all_files = get_sutta_files(nikaya_filter=nikaya)
    if limit:
        all_files = all_files[:limit]
    print(f"   {len(all_files)} fichiers trouvés")

    if dry_run:
        print("\n🧪 Mode dry-run — parsing seulement, pas d'upsert Qdrant")
        errors = []
        ok = 0
        for f in tqdm(all_files, desc="Parsing"):
            sutta = parse_sutta(f, blurbs, difficulties)
            if sutta is None:
                errors.append(f.name)
                continue
            ok += 1
            if verbose:
                print(f"  ✓ {sutta['sutta_id']:12s} | {sutta['nikaya']:5s} | "
                      f"{sutta['word_count']:5d} mots | blurb={'oui' if sutta['blurb'] else 'non':3s} | "
                      f"{sutta['title'][:50]}")
        print(f"\n✅ {ok} suttas parsés, {len(errors)} erreurs")
        if errors and verbose:
            for e in errors[:10]:
                print(f"  ❌ {e}")

        # Stats by nikaya
        _print_nikaya_stats(all_files, blurbs, difficulties)
        return ok

    # --- Live ingestion ---
    client = QdrantClient(url=QDRANT_URL)
    setup_suttas_collection(client, recreate=recreate)
    embedder = get_embedder()

    print(f"\n🚀 Ingestion de {len(all_files)} suttas dans '{COLLECTION_NAME}'...")

    total_indexed = 0
    errors: list[tuple[str, str]] = []

    with tqdm(total=len(all_files), unit="sutta", desc="Ingestion") as pbar:
        for batch_files in iter_batches(all_files, batch_size):
            embed_texts: list[str] = []
            payloads: list[dict] = []
            ids: list[int] = []

            for file_path in batch_files:
                sutta = parse_sutta(file_path, blurbs, difficulties)
                if sutta is None:
                    errors.append((file_path.name, "parse error"))
                    pbar.update(1)
                    continue

                embed_text = build_embed_text(sutta)
                if not embed_text.strip():
                    errors.append((file_path.name, "empty embed text"))
                    pbar.update(1)
                    continue

                # Build payload (exclude full_text — too large to store)
                payload = {k: v for k, v in sutta.items() if k != "full_text"}

                embed_texts.append(embed_text)
                payloads.append(payload)
                ids.append(sutta_to_id(sutta["sutta_id"]))

            if not embed_texts:
                continue

            # Embed
            vectors = embedder.encode(embed_texts, batch_size=batch_size)

            # Upsert (idempotent)
            points = [
                PointStruct(id=pid, vector=vec.tolist(), payload=pl)
                for pid, vec, pl in zip(ids, vectors, payloads)
            ]
            client.upsert(collection_name=COLLECTION_NAME, points=points)
            total_indexed += len(points)
            pbar.update(len(batch_files))

    # --- Summary ---
    print(f"\n✅ Ingestion terminée!")
    print(f"   📊 {total_indexed} suttas indexés dans '{COLLECTION_NAME}'")
    if errors:
        print(f"   ⚠️  {len(errors)} erreurs:")
        for name, reason in errors[:5]:
            print(f"      {name}: {reason}")

    info = client.get_collection(COLLECTION_NAME)
    print(f"   🔍 Qdrant total: {info.points_count} points")
    print(f"   📐 Index HNSW: {'construit' if info.points_count >= 1000 else 'en attente (< 1000 pts)'}")

    return total_indexed


def _print_nikaya_stats(
    files: list[Path],
    blurbs: dict[str, dict[str, str]],
    difficulties: dict[str, int],
) -> None:
    """Print a breakdown of suttas parsed, by nikaya."""
    from collections import defaultdict
    stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "with_blurb": 0, "with_diff": 0})

    for f in files:
        sutta = parse_sutta(f, blurbs, difficulties)
        if sutta is None:
            continue
        n = sutta["nikaya"]
        stats[n]["total"] += 1
        if sutta["blurb"]:
            stats[n]["with_blurb"] += 1
        if sutta["difficulty"] is not None:
            stats[n]["with_diff"] += 1

    print(f"\n{'Nikaya':<8} {'Suttas':>7} {'Blurbs':>8} {'Difficulté':>11}")
    print("-" * 40)
    grand_total = 0
    for nikaya, s in sorted(stats.items()):
        pct_blurb = 100 * s["with_blurb"] // s["total"] if s["total"] else 0
        pct_diff = 100 * s["with_diff"] // s["total"] if s["total"] else 0
        print(f"{nikaya:<8} {s['total']:>7} {s['with_blurb']:>6} ({pct_blurb:2d}%) "
              f"{s['with_diff']:>8} ({pct_diff:2d}%)")
        grand_total += s["total"]
    print("-" * 40)
    print(f"{'TOTAL':<8} {grand_total:>7}")


def quick_test(query: str = "impermanence suffering liberation") -> None:
    """Quick semantic search test after ingestion."""
    client = QdrantClient(url=QDRANT_URL)
    embedder = get_embedder()

    print(f'\n🔍 Test recherche: "{query}"')
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=embedder.encode_query(query),
        limit=5,
    ).points

    if not results:
        print("  ⚠️  Aucun résultat — collection vide?")
        return

    for hit in results:
        p = hit.payload
        blurb_preview = p.get("blurb", "")[:60] + "..." if p.get("blurb") else "(pas de blurb)"
        print(f"  [{hit.score:.3f}] {p.get('sutta_id','?'):12s} {p.get('title','?')[:45]:<45} | {blurb_preview}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Indexer les suttas Sujato (EN) dans Qdrant 'buddhist_suttas'"
    )
    parser.add_argument("--limit", type=int, help="Limiter à N suttas (mode test)")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--recreate", action="store_true", help="Recréer la collection")
    parser.add_argument("--nikaya", type=str, help="Indexer une seule nikaya: dn, mn, sn, an, kn")
    parser.add_argument("--dry-run", action="store_true", help="Parser seulement, sans upsert Qdrant")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--test-query", type=str, help="Lancer une recherche test après ingestion")
    args = parser.parse_args()

    try:
        n = ingest(
            limit=args.limit,
            batch_size=args.batch_size,
            recreate=args.recreate,
            nikaya=args.nikaya,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )
        if not args.dry_run and n > 0:
            quick_test(args.test_query or "impermanence suffering liberation")
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except Exception as e:
        import traceback
        print(f"❌ Erreur: {e}")
        if args.verbose:
            traceback.print_exc()
        sys.exit(1)
