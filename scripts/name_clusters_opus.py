"""
Re-name the 166 existing clusters using claude-opus-4-5.

Does NOT re-run UMAP/HDBSCAN. Reads cluster assignments from Qdrant,
sends rich context to Opus, writes results back to:
  - Qdrant payloads (cluster_name, cluster_keywords)
  - clusters.json
  - search/data/study_plans.json

Usage:
    cd /path/to/buddhist-uni.github.io
    ANTHROPIC_API_KEY=sk-... python scripts/name_clusters_opus.py
    # or:
    ANTHROPIC_API_KEY=sk-... uv run --with anthropic python scripts/name_clusters_opus.py

Options:
    --dry-run       Print prompts/responses, don't write anything
    --start N       Resume from cluster N (useful after interruption)
    --concurrency N Parallel API calls (default: 5)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import anthropic
from qdrant_client import QdrantClient
from qdrant_client.models import PointIdsList, PointStruct
from tqdm import tqdm

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "buddhist_suttas"
REPO_ROOT = Path(__file__).parent.parent
CLUSTERS_JSON = REPO_ROOT / "clusters.json"
STUDY_PLANS_JSON = REPO_ROOT / "search" / "data" / "study_plans.json"

MODEL = "claude-opus-4-5"
MAX_TOKENS = 400


# ---------------------------------------------------------------------------
# Fetch & group
# ---------------------------------------------------------------------------

def fetch_all_points(client: QdrantClient) -> list[dict]:
    """Scroll all points from buddhist_suttas, return list of payloads with id."""
    print("📥 Fetching all sutta payloads from Qdrant…")
    all_points = []
    offset = None
    while True:
        results, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=500,
            with_vectors=False,
            with_payload=True,
            offset=offset,
        )
        all_points.extend(results)
        if offset is None:
            break
    print(f"   ✅ {len(all_points)} suttas fetched")
    return all_points


def group_by_cluster(points) -> dict[int, list]:
    """Group qdrant points by their cluster_id payload field."""
    clusters: dict[int, list] = defaultdict(list)
    noise = 0
    for p in points:
        cid = p.payload.get("cluster_id")
        if cid is None or cid == -1:
            noise += 1
            continue
        clusters[cid].append({"id": p.id, **p.payload})
    print(f"   📊 {len(clusters)} clusters, {noise} noise points")
    return dict(clusters)


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

def build_prompt(cluster_id: int, suttas: list[dict]) -> str:
    # Rich sample: top 15 by word_count (most substantial suttas)
    top = sorted(suttas, key=lambda s: s.get("word_count") or 0, reverse=True)[:15]

    lines = []
    for s in top:
        sid   = s.get("sutta_id", "?")
        nname = s.get("nikaya_name") or s.get("nikaya", "?").upper()
        title = s.get("title", "?")
        blurb = (s.get("blurb") or "")[:150].replace("\n", " ")
        lines.append(f"- {sid} ({nname}) — {title}: {blurb}")

    nikaya_dist = Counter(s.get("nikaya", "?") for s in suttas)
    nikaya_summary = ", ".join(f"{n}:{c}" for n, c in nikaya_dist.most_common())

    return f"""You are a Buddhist scholar analyzing a cluster of {len(suttas)} suttas grouped together by semantic similarity (sentence-embedding HDBSCAN clustering of Bhikkhu Sujato's English translations of the Pāli Canon).

Your task: identify the precise unifying theme or teaching that connects these suttas.

Nikāya distribution: {nikaya_summary}

Sample suttas (richest by word count):
{chr(10).join(lines)}

Respond ONLY with a valid JSON object — no markdown, no explanation:
{{
  "name": "<concise theme, 3-6 words, English>",
  "description": "<1-2 sentences: what teaching or topic unifies these texts>",
  "keywords": ["<4-8 Pali or English keywords>"],
  "theme_category": "<one of: practice|doctrine|ethics|cosmology|community|psychology|narrative|poetry|mixed>"
}}

Be precise and scholarly. Prefer specific Dhamma terminology over vague labels.
Examples of good names: "Dependent Origination & Conditionality", "Brahmaviharā: Four Divine Abidings", "Kamma and its Fruits", "Factors of Awakening".
"""


# ---------------------------------------------------------------------------
# LLM call (async for concurrency)
# ---------------------------------------------------------------------------

async def name_cluster(
    sem: asyncio.Semaphore,
    aclient: anthropic.AsyncAnthropic,
    cluster_id: int,
    suttas: list[dict],
    dry_run: bool,
) -> dict:
    async with sem:
        prompt = build_prompt(cluster_id, suttas)
        nikaya_breakdown = dict(Counter(s.get("nikaya", "?") for s in suttas).most_common())

        if dry_run:
            print(f"\n--- Cluster {cluster_id} ({len(suttas)} suttas) ---")
            print(prompt[:600])
            return {
                "cluster_id": cluster_id,
                "name": f"[DRY RUN] Cluster {cluster_id}",
                "description": "",
                "keywords": [],
                "theme_category": "mixed",
                "size": len(suttas),
                "nikaya_breakdown": nikaya_breakdown,
            }

        try:
            response = await aclient.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
                raw = raw.rsplit("```", 1)[0].strip()

            parsed = json.loads(raw)
            return {
                "cluster_id": cluster_id,
                "name": parsed.get("name", f"Cluster {cluster_id}"),
                "description": parsed.get("description", ""),
                "keywords": parsed.get("keywords", []),
                "theme_category": parsed.get("theme_category", "mixed"),
                "size": len(suttas),
                "nikaya_breakdown": nikaya_breakdown,
            }

        except (json.JSONDecodeError, IndexError, anthropic.APIError) as e:
            print(f"  ⚠️  Cluster {cluster_id} error: {e}")
            return {
                "cluster_id": cluster_id,
                "name": f"Cluster {cluster_id}",
                "description": "",
                "keywords": [],
                "theme_category": "mixed",
                "size": len(suttas),
                "nikaya_breakdown": nikaya_breakdown,
            }


# ---------------------------------------------------------------------------
# Write back to Qdrant
# ---------------------------------------------------------------------------

def update_qdrant(client: QdrantClient, clusters: dict[int, list], names: dict[int, dict]):
    """Update cluster_name and cluster_keywords for every sutta point."""
    print("\n✍️  Writing cluster names back to Qdrant…")
    batch_size = 100
    updates: list[tuple[str | int, str, list[str]]] = []

    for cid, suttas in clusters.items():
        info = names.get(cid, {})
        name = info.get("name", f"Cluster {cid}")
        keywords = info.get("keywords", [])
        for s in suttas:
            updates.append((s["id"], name, keywords))

    for i in range(0, len(updates), batch_size):
        batch = updates[i:i + batch_size]
        client.set_payload(
            collection_name=COLLECTION_NAME,
            payload={},  # we use overwrite_payload per point below
            points=[],
        )
        # Use individual set_payload per point (Qdrant doesn't support batch heterogeneous payload)
        for point_id, name, keywords in batch:
            client.set_payload(
                collection_name=COLLECTION_NAME,
                payload={"cluster_name": name, "cluster_keywords": keywords},
                points=[point_id],
            )

    print(f"   ✅ {len(updates)} sutta payloads updated")


# ---------------------------------------------------------------------------
# Write JSON files
# ---------------------------------------------------------------------------

def update_clusters_json(names: dict[int, dict]):
    if not CLUSTERS_JSON.exists():
        print(f"  ⚠️  {CLUSTERS_JSON} not found, skipping")
        return

    with open(CLUSTERS_JSON) as f:
        data = json.load(f)

    # data is a dict: {cluster_id_str: {name, description, keywords, suttas: [...]}}
    for cid_str, cluster in data.items():
        cid = int(cid_str)
        if cid in names:
            cluster["name"] = names[cid]["name"]
            cluster["description"] = names[cid]["description"]
            cluster["keywords"] = names[cid]["keywords"]
            cluster["theme_category"] = names[cid].get("theme_category", "mixed")

    with open(CLUSTERS_JSON, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {CLUSTERS_JSON.name} updated")


def update_study_plans_json(names: dict[int, dict]):
    if not STUDY_PLANS_JSON.exists():
        print(f"  ⚠️  {STUDY_PLANS_JSON} not found, skipping")
        return

    with open(STUDY_PLANS_JSON) as f:
        plans = json.load(f)

    # plans is a list of dicts with cluster_id field
    for plan in plans:
        cid = plan.get("cluster_id")
        if cid in names:
            plan["name"] = names[cid]["name"]
            plan["description"] = names[cid].get("description", "")
            plan["keywords"] = names[cid].get("keywords", [])
            plan["theme_category"] = names[cid].get("theme_category", "mixed")

    with open(STUDY_PLANS_JSON, "w") as f:
        json.dump(plans, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {STUDY_PLANS_JSON.name} updated")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def run(args):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        print("❌ ANTHROPIC_API_KEY not set. Export it or use --dry-run.")
        sys.exit(1)

    qdrant = QdrantClient(url=QDRANT_URL)
    points = fetch_all_points(qdrant)
    clusters = group_by_cluster(points)

    # Filter: only clusters >= start index
    cluster_ids = sorted(clusters.keys())
    if args.start > 0:
        cluster_ids = [c for c in cluster_ids if c >= args.start]
        print(f"   ▶️  Resuming from cluster {args.start} ({len(cluster_ids)} remaining)")

    print(f"\n🤖 Naming {len(cluster_ids)} clusters with {MODEL} "
          f"(concurrency={args.concurrency})…\n")

    aclient = anthropic.AsyncAnthropic(api_key=api_key or "dummy")
    sem = asyncio.Semaphore(args.concurrency)

    tasks = [
        name_cluster(sem, aclient, cid, clusters[cid], args.dry_run)
        for cid in cluster_ids
    ]

    results: list[dict] = []
    for coro in tqdm(asyncio.as_completed(tasks), total=len(tasks), unit="cluster"):
        result = await coro
        results.append(result)

    names: dict[int, dict] = {r["cluster_id"]: r for r in results}

    # Print sample
    print("\n📋 Sample results:")
    for cid in sorted(names)[:5]:
        n = names[cid]
        print(f"  [{cid}] {n['name']} ({n['theme_category']}) — {', '.join(n['keywords'][:4])}")

    if args.dry_run:
        print("\n🔵 Dry run — no changes written.")
        return

    # Write back
    update_qdrant(qdrant, {cid: clusters[cid] for cid in cluster_ids}, names)
    update_clusters_json(names)
    update_study_plans_json(names)

    print(f"\n✅ Done! {len(names)} clusters renamed with {MODEL}.")
    print("   Restart the FastAPI to serve fresh names: uvicorn search.api.main:app --reload")


def main():
    parser = argparse.ArgumentParser(description="Rename sutta clusters with claude-opus-4-5")
    parser.add_argument("--dry-run", action="store_true", help="Don't write, just print")
    parser.add_argument("--start", type=int, default=0, help="Resume from cluster id N")
    parser.add_argument("--concurrency", type=int, default=5, help="Parallel API calls")
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
