#!/usr/bin/env python3
"""
Prepare mobile app assets from existing project data.

Outputs:
  mobile/assets/data/suttas_seed.json   — sutta metadata + text segments
  mobile/assets/data/embeddings.bin     — float32 embeddings (384 dims × N suttas)
  mobile/assets/data/study_plans.json   — 166 study plans (simplified)

Usage:
  # Install deps (in the search venv or a new one):
  pip install sentence-transformers qdrant-client tqdm numpy

  # Run (from repo root):
  python mobile/scripts/prepare_assets.py

  # Optional: pull embeddings from Qdrant instead of re-computing
  python mobile/scripts/prepare_assets.py --source qdrant
"""

import argparse
import json
import os
import struct
import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]
TEXTS_DIR = ROOT / "frontend" / "public" / "content" / "texts"
STUDY_PLANS_JSON = ROOT / "search" / "data" / "study_plans.json"
OUT_DIR = ROOT / "mobile" / "assets" / "data"

DIMS = 384
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def load_sutta_texts() -> dict[str, dict]:
    """Load all sutta text files → {sutta_id: {id, title, text: [...], ...}}"""
    print("Loading sutta texts…")
    suttas = {}
    for p in TEXTS_DIR.glob("*.json"):
        with open(p) as f:
            data = json.load(f)
        sutta_id = p.stem
        suttas[sutta_id] = data
    print(f"  {len(suttas)} sutta files loaded")
    return suttas


def load_study_plans() -> list[dict]:
    with open(STUDY_PLANS_JSON) as f:
        return json.load(f)


def nikaya_from_id(sutta_id: str) -> str:
    for prefix in ("dn", "mn", "sn", "an", "thig", "thag", "ud", "iti",
                   "snp", "dhp", "vv", "pv", "ja", "mil", "ne", "pe", "kp"):
        if sutta_id.startswith(prefix):
            return prefix
    return "kn"


NIKAYA_NAMES = {
    "dn": "Dīgha Nikāya", "mn": "Majjhima Nikāya",
    "sn": "Saṁyutta Nikāya", "an": "Aṅguttara Nikāya",
    "thig": "Therīgāthā", "thag": "Theragāthā",
    "ud": "Udāna", "iti": "Itivuttaka", "snp": "Sutta Nipāta",
    "dhp": "Dhammapada", "ja": "Jātaka", "kn": "Khuddaka Nikāya",
}


def build_sutta_records(
    suttas: dict[str, dict],
    plans: list[dict],
) -> list[dict]:
    """Build ordered list of sutta records for seeding."""
    # Build sutta_id → cluster_id map
    cluster_map: dict[str, int] = {}
    for plan in plans:
        for s in plan.get("suttas", []):
            cluster_map[s["sutta_id"]] = plan["cluster_id"]

    records = []
    for sutta_id, data in suttas.items():
        nikaya = nikaya_from_id(sutta_id)
        records.append({
            "sutta_id": sutta_id,
            "nikaya": nikaya,
            "nikaya_name": NIKAYA_NAMES.get(nikaya, "Khuddaka Nikāya"),
            "title": data.get("title", ""),
            "blurb": data.get("description", ""),
            "text": data.get("text", []),      # list of {segment_id, text}
            "cluster_id": cluster_map.get(sutta_id, -1),
            "word_count": sum(
                len(s.get("text", "").split())
                for s in data.get("text", [])
            ),
        })

    # Stable ordering: by nikaya + sutta_id
    records.sort(key=lambda r: (r["nikaya"], r["sutta_id"]))
    print(f"  {len(records)} sutta records built")
    return records


# ─── Embedding sources ────────────────────────────────────────────────────────

def embed_with_model(records: list[dict]) -> list[list[float]]:
    """Compute embeddings locally using sentence-transformers."""
    try:
        from sentence_transformers import SentenceTransformer
        from tqdm import tqdm
    except ImportError:
        print("ERROR: pip install sentence-transformers tqdm")
        sys.exit(1)

    print(f"Loading model {MODEL_NAME}…")
    model = SentenceTransformer(MODEL_NAME)

    # Build text for each sutta: title + blurb + first ~200 words of text
    def make_text(r: dict) -> str:
        parts = [r["title"], r["blurb"]]
        words = []
        for seg in r["text"]:
            words.extend(seg.get("text", "").split())
            if len(words) >= 200:
                break
        parts.append(" ".join(words[:200]))
        return " ".join(p for p in parts if p)

    texts = [make_text(r) for r in records]

    print(f"Embedding {len(texts)} suttas (batch=64)…")
    embeddings = model.encode(
        texts,
        batch_size=64,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    return [e.tolist() for e in embeddings]


def embed_from_qdrant(records: list[dict]) -> list[list[float]]:
    """Pull pre-computed embeddings from local Qdrant."""
    try:
        from qdrant_client import QdrantClient
        from tqdm import tqdm
    except ImportError:
        print("ERROR: pip install qdrant-client tqdm")
        sys.exit(1)

    client = QdrantClient(host="localhost", port=6333)
    collection = "buddhist_suttas"

    id_to_idx = {r["sutta_id"]: i for i, r in enumerate(records)}
    embeddings: list[Optional[list[float]]] = [None] * len(records)
    missing = []

    print("Fetching embeddings from Qdrant…")
    offset = None
    fetched = 0
    with __import__("tqdm").tqdm(total=len(records)) as pbar:
        while True:
            result, offset = client.scroll(
                collection_name=collection,
                with_vectors=True,
                limit=200,
                offset=offset,
            )
            for point in result:
                sid = point.payload.get("sutta_id", "")
                if sid in id_to_idx:
                    embeddings[id_to_idx[sid]] = point.vector
                    fetched += 1
                    pbar.update(1)
            if offset is None:
                break

    # Fill missing with zeros (will trigger re-embedding on device if needed)
    for i, e in enumerate(embeddings):
        if e is None:
            missing.append(records[i]["sutta_id"])
            embeddings[i] = [0.0] * DIMS

    if missing:
        print(f"  WARNING: {len(missing)} suttas missing from Qdrant, "
              f"zeroed out: {missing[:5]}…")

    return embeddings  # type: ignore


# ─── Writers ─────────────────────────────────────────────────────────────────

def write_suttas_json(records: list[dict]) -> None:
    out = OUT_DIR / "suttas_seed.json"
    # Strip embeddings — those go in the binary file
    clean = [{k: v for k, v in r.items()} for r in records]
    with open(out, "w") as f:
        json.dump(clean, f, ensure_ascii=False)
    size_mb = out.stat().st_size / 1_000_000
    print(f"  suttas_seed.json  ({size_mb:.1f} MB)")


def write_embeddings_bin(embeddings: list[list[float]]) -> None:
    out = OUT_DIR / "embeddings.bin"
    with open(out, "wb") as f:
        for vec in embeddings:
            f.write(struct.pack(f"{DIMS}f", *vec))
    size_mb = out.stat().st_size / 1_000_000
    print(f"  embeddings.bin    ({size_mb:.1f} MB, {len(embeddings)} × {DIMS})")


def write_study_plans(plans: list[dict]) -> None:
    out = OUT_DIR / "study_plans.json"
    # Keep only fields needed by the app
    simplified = []
    for p in plans:
        simplified.append({
            "cluster_id": p["cluster_id"],
            "name": p["name"],
            "description": p.get("description", ""),
            "theme_category": p.get("theme_category", ""),
            "size": p.get("size", 0),
            "reading_minutes": p.get("reading_minutes", 0),
            "suttas": [
                {"sutta_id": s["sutta_id"], "order": s["order"]}
                for s in p.get("suttas", [])
            ],
        })
    with open(out, "w") as f:
        json.dump(simplified, f, ensure_ascii=False)
    size_mb = out.stat().st_size / 1_000_000
    print(f"  study_plans.json  ({size_mb:.1f} MB, {len(plans)} plans)")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare mobile assets")
    parser.add_argument(
        "--source",
        choices=["model", "qdrant"],
        default="model",
        help="Where to get embeddings (default: compute locally with the model)",
    )
    parser.add_argument(
        "--skip-embeddings",
        action="store_true",
        help="Skip embedding computation (use existing embeddings.bin)",
    )
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Buddhist Study — asset preparation ===\n")

    # 1. Load raw data
    suttas = load_sutta_texts()
    plans = load_study_plans()

    # 2. Build ordered records
    records = build_sutta_records(suttas, plans)

    # 3. Embeddings
    if args.skip_embeddings:
        print("Skipping embedding computation.")
        embeddings = None
    else:
        print(f"\nComputing embeddings (source={args.source})…")
        if args.source == "qdrant":
            embeddings = embed_from_qdrant(records)
        else:
            embeddings = embed_with_model(records)

    # 4. Write outputs
    print("\nWriting assets…")
    write_suttas_json(records)
    if embeddings is not None:
        write_embeddings_bin(embeddings)
    write_study_plans(plans)

    print("\n✓ Done. Copy assets/ to mobile/assets/data/ and run flutter build.")


if __name__ == "__main__":
    main()
