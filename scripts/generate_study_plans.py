"""
Study plan generator: builds a pedagogically-ordered reading sequence
for each HDBSCAN cluster in 'buddhist_suttas'.

Scoring heuristic (simple → advanced within a cluster):
  1. Known difficulty (1-3, available for DN+MN)
  2. Word count percentile (shorter = simpler, normalized per cluster)
  3. Nikaya weight (Ud/Kp/short KN < AN1-3 < SN < MN < DN)
  4. Canonical sub-position (e.g. AN1 before AN11, SN1 before SN56)

Output: study_plans.json  (one plan per cluster)
        Each plan: cluster metadata + ordered list of suttas

Usage:
    cd /path/to/buddhist-uni.github.io
    python scripts/generate_study_plans.py
    python scripts/generate_study_plans.py --output search/data/study_plans.json
    python scripts/generate_study_plans.py --min-size 5  # include tiny clusters too
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from qdrant_client import QdrantClient

QDRANT_URL = "http://localhost:6333"
SUTTA_COLLECTION = "buddhist_suttas"
REPO_ROOT = Path(__file__).parent.parent
DEFAULT_OUTPUT = REPO_ROOT / "search" / "data" / "study_plans.json"


# ---------------------------------------------------------------------------
# Pedagogical difficulty scoring
# ---------------------------------------------------------------------------

# Nikaya base weight (lower = more accessible)
NIKAYA_WEIGHT: dict[str, float] = {
    "kp": 0.1,    # Khuddakapāṭha — very short refuge/precept texts
    "dhp": 0.2,   # Dhammapada — accessible verse sayings
    "ud": 0.2,    # Udāna — short inspired utterances
    "iti": 0.3,   # Itivuttaka — brief prose+verse
    "snp": 0.35,  # Sutta Nipāta — mixed, some very accessible
    "thig": 0.3,  # Therīgāthā — lyric poetry
    "thag": 0.3,  # Theragāthā — lyric poetry (mostly)
    "an": 0.45,   # Aṅguttara — numerically structured, good for beginners
    "sn": 0.5,    # Saṁyutta — linked discourses, moderate complexity
    "ja": 0.5,    # Jātaka — narrative but can be complex
    "cp": 0.5,    # Cariyāpiṭaka
    "mn": 0.65,   # Majjhima — medium-length, often doctrinally rich
    "dn": 0.75,   # Dīgha — longest, most complex discourses
}

# AN sub-book weight: AN1 simpler than AN11
AN_BOOK_WEIGHT = {str(i): i / 11 for i in range(1, 12)}

# SN samyutta weight (approximate): earlier samyuttas tend to be shorter/simpler
def sn_subweight(sutta_id: str) -> float:
    m = re.match(r"sn(\d+)", sutta_id)
    if m:
        n = int(m.group(1))
        return min(n / 56, 1.0)
    return 0.5


def canonical_sub_position(sutta: dict) -> float:
    """
    Returns 0.0–1.0 representing position within the nikaya.
    Lower = earlier in the canon = generally simpler.
    """
    sid = sutta.get("sutta_id", "")
    nikaya = sutta.get("nikaya", "")

    if nikaya == "an":
        # an3.65 → book 3
        m = re.match(r"an(\d+)", sid)
        if m:
            book = int(m.group(1))
            return book / 11
    elif nikaya == "sn":
        return sn_subweight(sid)
    elif nikaya == "dn":
        m = re.match(r"dn(\d+)", sid)
        if m:
            return int(m.group(1)) / 34
    elif nikaya == "mn":
        m = re.match(r"mn(\d+)", sid)
        if m:
            return int(m.group(1)) / 152
    elif nikaya == "thag":
        # thag1.x = Book of Ones (shortest), thag21 = longest
        m = re.match(r"thag(\d+)", sid)
        if m:
            return int(m.group(1)) / 21
    elif nikaya == "thig":
        m = re.match(r"thig(\d+)", sid)
        if m:
            return int(m.group(1)) / 16

    return 0.5  # unknown → middle


def score_difficulty(sutta: dict, cluster_word_counts: list[int]) -> float:
    """
    Compute a pedagogical difficulty score for a sutta (0=easy, 1=hard).
    Lower scores will be read first in a study plan.
    """
    nikaya = sutta.get("nikaya", "sn")
    word_count = sutta.get("word_count", 500)
    known_diff = sutta.get("difficulty")  # 1-3 (only DN+MN), or None

    # 1. Nikaya base weight (40%)
    nikaya_score = NIKAYA_WEIGHT.get(nikaya, 0.5)

    # 2. Word count percentile within cluster (35%)
    if cluster_word_counts:
        sorted_wc = sorted(cluster_word_counts)
        rank = sorted_wc.index(min(sorted_wc, key=lambda x: abs(x - word_count)))
        wc_score = rank / max(len(sorted_wc) - 1, 1)
    else:
        wc_score = 0.5

    # 3. Known difficulty score (20%)
    if known_diff is not None:
        diff_score = (known_diff - 1) / 2  # 1→0.0, 2→0.5, 3→1.0
    else:
        diff_score = nikaya_score  # fallback to nikaya weight

    # 4. Canonical sub-position (5%)
    canon_score = canonical_sub_position(sutta)

    return (
        0.40 * nikaya_score +
        0.35 * wc_score +
        0.20 * diff_score +
        0.05 * canon_score
    )


# ---------------------------------------------------------------------------
# Study plan generation
# ---------------------------------------------------------------------------

def fetch_cluster_suttas(client: QdrantClient) -> dict[int, list[dict]]:
    """
    Fetch all payloads from Qdrant, grouped by cluster_id.
    Outliers (cluster_id=None) are excluded.
    """
    print("📥 Chargement des suttas depuis Qdrant...")
    all_points = []
    offset = None
    while True:
        results, offset = client.scroll(
            collection_name=SUTTA_COLLECTION,
            limit=500, with_vectors=False, with_payload=True, offset=offset,
        )
        all_points.extend(results)
        if offset is None:
            break

    clusters: dict[int, list[dict]] = defaultdict(list)
    for point in all_points:
        p = point.payload
        cid = p.get("cluster_id")
        if cid is not None:
            clusters[int(cid)].append(p)

    print(f"   ✅ {len(all_points)} suttas, {len(clusters)} clusters chargés")
    return clusters


def build_study_plan(cluster_id: int, suttas: list[dict], clusters_meta: dict) -> dict:
    """
    Build a single study plan from a cluster of suttas.
    Returns a dict ready for JSON serialization.
    """
    # Pedagogical scoring
    word_counts = [s.get("word_count", 0) for s in suttas]
    scored = [
        (score_difficulty(s, word_counts), s)
        for s in suttas
    ]
    ordered = [s for _, s in sorted(scored, key=lambda x: x[0])]

    # Cluster metadata from clusters.json
    meta = clusters_meta.get(str(cluster_id), {})
    name = meta.get("name") or f"Cluster {cluster_id}"
    description = meta.get("description", "")
    keywords = meta.get("keywords", [])
    theme_category = meta.get("theme_category", "mixed")
    nikaya_breakdown = meta.get("nikaya_breakdown", {})

    # Build ordered sutta list
    sutta_list = []
    for i, sutta in enumerate(ordered, 1):
        sutta_list.append({
            "order": i,
            "sutta_id": sutta.get("sutta_id"),
            "nikaya": sutta.get("nikaya"),
            "nikaya_name": sutta.get("nikaya_name"),
            "title": sutta.get("title"),
            "blurb": sutta.get("blurb") or "",
            "word_count": sutta.get("word_count"),
            "difficulty": sutta.get("difficulty"),
            "url": sutta.get("url"),
        })

    # Estimate total reading time (avg 200 words/min for sacred texts)
    total_words = sum(s.get("word_count", 0) for s in suttas)
    reading_minutes = round(total_words / 200)

    return {
        "cluster_id": cluster_id,
        "name": name,
        "description": description,
        "keywords": keywords,
        "theme_category": theme_category,
        "nikaya_breakdown": nikaya_breakdown,
        "size": len(suttas),
        "total_words": total_words,
        "reading_minutes": reading_minutes,
        "suttas": sutta_list,
    }


def generate_all_plans(
    min_size: int = 5,
    output_path: Path = DEFAULT_OUTPUT,
) -> list[dict]:
    """
    Generate study plans for all clusters, save to JSON.
    Returns the list of plans (sorted by size desc).
    """
    client = QdrantClient(url=QDRANT_URL)
    cluster_suttas = fetch_cluster_suttas(client)

    # Load cluster metadata (names, keywords, theme)
    clusters_json = REPO_ROOT / "clusters.json"
    clusters_meta = {}
    if clusters_json.exists():
        data = json.loads(clusters_json.read_text())
        clusters_meta = data.get("clusters", {})

    print(f"\n📐 Génération des study plans (min_size={min_size})...")
    plans = []
    skipped = 0

    for cluster_id, suttas in sorted(cluster_suttas.items()):
        if len(suttas) < min_size:
            skipped += 1
            continue
        plan = build_study_plan(cluster_id, suttas, clusters_meta)
        plans.append(plan)

    # Sort by size descending
    plans.sort(key=lambda p: -p["size"])

    print(f"   ✅ {len(plans)} plans générés ({skipped} clusters trop petits ignorés)")
    print(f"   📚 {sum(p['size'] for p in plans)} suttas couverts au total")
    print(f"   ⏱️  {sum(p['reading_minutes'] for p in plans)} min de lecture totale")

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(plans, indent=2, ensure_ascii=False))
    print(f"\n💾 Sauvegardé: {output_path}")

    # Print top 15 plans
    print(f"\n{'':=<72}")
    print("  TOP 15 STUDY PLANS")
    print(f"{'':=<72}")
    for plan in plans[:15]:
        kw = " · ".join(plan["keywords"][:3]) if plan["keywords"] else "—"
        print(f"  [{plan['cluster_id']:3d}] {plan['size']:3d} suttas  "
              f"{plan['reading_minutes']:4d}min  {plan['theme_category']:<12}  {plan['name']}")
        print(f"         {kw}")

    return plans


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Générer les study plans depuis les clusters Qdrant")
    parser.add_argument("--min-size", type=int, default=5,
                        help="Taille minimale d'un cluster pour générer un plan (défaut: 5)")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT),
                        help=f"Fichier JSON de sortie (défaut: {DEFAULT_OUTPUT})")
    args = parser.parse_args()

    try:
        generate_all_plans(min_size=args.min_size, output_path=Path(args.output))
    except Exception as e:
        import traceback, sys
        print(f"❌ {e}")
        traceback.print_exc()
        sys.exit(1)
