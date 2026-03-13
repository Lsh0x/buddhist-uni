"""Name the 6 remaining unnamed clusters using claude-opus-4-5."""
from __future__ import annotations
import asyncio, json
from collections import Counter, defaultdict
from pathlib import Path
import anthropic
from qdrant_client import QdrantClient

QDRANT_URL  = "http://localhost:6333"
COLLECTION  = "buddhist_suttas"
MODEL       = "claude-opus-4-5"
TARGET_IDS  = [0, 1, 5, 45, 54, 70]
REPO_ROOT   = Path(__file__).parent.parent


def build_prompt(cluster_id: int, suttas: list[dict]) -> str:
    top = sorted(suttas, key=lambda s: s.get("word_count") or 0, reverse=True)[:15]
    lines = []
    for s in top:
        sid   = s.get("sutta_id", "?")
        nname = s.get("nikaya_name") or s.get("nikaya", "?").upper()
        title = s.get("title", "?")
        blurb = (s.get("blurb") or "")[:150].replace("\n", " ")
        lines.append(f"- {sid} ({nname}) — {title}: {blurb}")
    nikaya_dist    = Counter(s.get("nikaya", "?") for s in suttas)
    nikaya_summary = ", ".join(f"{n}:{c}" for n, c in nikaya_dist.most_common())
    return f"""You are a Buddhist scholar analyzing a cluster of {len(suttas)} suttas grouped by semantic similarity (HDBSCAN on Bhikkhu Sujato's English Pāli Canon translations).

Nikāya distribution: {nikaya_summary}

Sample suttas (richest by word count):
{chr(10).join(lines)}

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "name": "<concise theme, 3-6 words, English>",
  "description": "<1-2 sentences: what teaching or topic unifies these texts>",
  "keywords": ["<4-8 Pali or English keywords>"],
  "theme_category": "<one of: practice|doctrine|ethics|cosmology|community|psychology|narrative|poetry|mixed>"
}}
Be precise and scholarly. Examples of good names: "Dependent Origination & Conditionality", "Factors of Awakening", "Brahmaviharā: Four Divine Abidings"."""


async def main() -> None:
    qdrant = QdrantClient(url=QDRANT_URL)

    print("📥 Fetching sutta payloads from Qdrant…")
    clusters: dict[int, list] = defaultdict(list)
    offset = None
    while True:
        results, offset = qdrant.scroll(
            collection_name=COLLECTION,
            limit=500,
            with_vectors=False,
            with_payload=True,
            offset=offset,
        )
        for p in results:
            cid = p.payload.get("cluster_id")
            if cid in TARGET_IDS:
                clusters[cid].append({"id": p.id, **p.payload})
        if offset is None:
            break

    print(f"   ✅ Found data for clusters: {sorted(clusters.keys())}\n")

    aclient  = anthropic.AsyncAnthropic()
    named: dict[int, dict] = {}

    for cid in sorted(TARGET_IDS):
        suttas = clusters.get(cid, [])
        if not suttas:
            print(f"  [{cid}] ⚠️  No data in Qdrant — skipping")
            continue

        print(f"  [{cid}] Naming ({len(suttas)} suttas)…")
        resp = await aclient.messages.create(
            model=MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": build_prompt(cid, suttas)}],
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"):
            raw = "\n".join(raw.split("\n")[1:]).rsplit("```", 1)[0].strip()

        parsed     = json.loads(raw)
        named[cid] = {
            "name":           parsed.get("name", f"Cluster {cid}"),
            "description":    parsed.get("description", ""),
            "keywords":       parsed.get("keywords", []),
            "theme_category": parsed.get("theme_category", "mixed"),
        }
        print(f"       → {named[cid]['name']} ({named[cid]['theme_category']})")

    # ── Update clusters.json ─────────────────────────────────────────────────
    clusters_json = REPO_ROOT / "clusters.json"
    with open(clusters_json) as f:
        data = json.load(f)

    for cid, info in named.items():
        k = str(cid)
        if k in data["clusters"]:
            data["clusters"][k].update({
                "name":           info["name"],
                "description":    info["description"],
                "keywords":       info["keywords"],
                "theme_category": info["theme_category"],
            })

    with open(clusters_json, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── Update study_plans.json if it exists ─────────────────────────────────
    study_plans_json = REPO_ROOT / "search" / "data" / "study_plans.json"
    if study_plans_json.exists():
        with open(study_plans_json) as f:
            plans = json.load(f)
        for plan in plans:
            cid = plan.get("cluster_id")
            if cid in named:
                plan.update({
                    "name":           named[cid]["name"],
                    "description":    named[cid]["description"],
                    "keywords":       named[cid]["keywords"],
                    "theme_category": named[cid]["theme_category"],
                })
        with open(study_plans_json, "w") as f:
            json.dump(plans, f, ensure_ascii=False, indent=2)

    print("\n✅ Done!")
    print("\n📋 Results:")
    for cid, info in sorted(named.items()):
        print(f"  [{cid}] {info['name']}")
        print(f"       {info['description'][:90]}")


if __name__ == "__main__":
    asyncio.run(main())
