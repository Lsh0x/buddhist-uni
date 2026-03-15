"""
Sutta clustering pipeline: extracts vectors from Qdrant 'buddhist_suttas',
applies UMAP + HDBSCAN to discover emergent thematic clusters, names each
cluster via Claude API, then writes cluster assignments back to Qdrant.

No predefined themes — clusters emerge from the data.

Dependencies (install via uv --with or pip):
    umap-learn, hdbscan, numpy, scikit-learn, anthropic, qdrant-client

Usage:
    cd /path/to/buddhist-uni.github.io
    python scripts/cluster_suttas.py                         # full run
    python scripts/cluster_suttas.py --explore               # tune params, no save
    python scripts/cluster_suttas.py --min-cluster 20        # larger clusters
    python scripts/cluster_suttas.py --no-llm                # skip LLM naming
    python scripts/cluster_suttas.py --output clusters.json  # save results
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import PointIdsList
from tqdm import tqdm

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "buddhist_suttas"
REPO_ROOT = Path(__file__).parent.parent


# ---------------------------------------------------------------------------
# Step 1 — Extract vectors from Qdrant
# ---------------------------------------------------------------------------

def fetch_all_points(client: QdrantClient) -> tuple[list, np.ndarray]:
    """
    Fetch all points (vectors + payloads) from 'buddhist_suttas'.
    Returns (payloads list, vectors numpy array).
    """
    print("📥 Extraction des vecteurs depuis Qdrant...")
    all_points = []
    offset = None

    while True:
        results, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=500,
            with_vectors=True,
            with_payload=True,
            offset=offset,
        )
        all_points.extend(results)
        if offset is None:
            break

    payloads = [p.payload for p in all_points]
    vectors = np.array([p.vector for p in all_points], dtype=np.float32)

    print(f"   ✅ {len(payloads)} suttas, vecteurs shape: {vectors.shape}")
    return payloads, vectors


# ---------------------------------------------------------------------------
# Step 2 — UMAP reduction
# ---------------------------------------------------------------------------

def reduce_dimensions(vectors: np.ndarray, n_components: int = 50) -> np.ndarray:
    """
    Reduce 384-dim vectors to n_components dims via UMAP (cosine metric).
    UMAP preserves local structure better than PCA for semantic embeddings.
    """
    import umap

    print(f"\n🔭 UMAP: {vectors.shape[1]} → {n_components} dimensions...")
    reducer = umap.UMAP(
        n_components=n_components,
        metric="cosine",
        n_neighbors=15,       # local neighborhood size
        min_dist=0.0,         # tight clusters (good for HDBSCAN downstream)
        random_state=42,
        verbose=False,
    )
    reduced = reducer.fit_transform(vectors)
    print(f"   ✅ Réduction terminée: {reduced.shape}")
    return reduced


# ---------------------------------------------------------------------------
# Step 3 — HDBSCAN clustering
# ---------------------------------------------------------------------------

def cluster_hdbscan(
    reduced: np.ndarray,
    min_cluster_size: int = 15,
    min_samples: int = 5,
) -> np.ndarray:
    """
    Cluster via HDBSCAN — no predefined k, emergent groupings.

    min_cluster_size: minimum suttas per cluster (tune for granularity)
    min_samples: conservative noise classification
    Returns labels array (−1 = noise/outlier).
    """
    import hdbscan

    print(f"\n🌊 HDBSCAN clustering (min_cluster={min_cluster_size}, min_samples={min_samples})...")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric="euclidean",       # euclidean on UMAP-reduced space
        cluster_selection_method="eom",  # excess of mass — finds varied-density clusters
        prediction_data=True,
    )
    labels = clusterer.fit_predict(reduced)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = np.sum(labels == -1)
    noise_pct = 100 * n_noise / len(labels)

    print(f"   ✅ {n_clusters} clusters découverts")
    print(f"   📊 {n_noise} outliers ({noise_pct:.1f}% du corpus)")

    # Cluster size distribution
    counts = Counter(labels)
    sizes = sorted([v for k, v in counts.items() if k != -1], reverse=True)
    if sizes:
        print(f"   📏 Taille clusters: min={min(sizes)}, max={max(sizes)}, "
              f"médiane={int(np.median(sizes))}, total={sum(sizes)}")

    return labels


# ---------------------------------------------------------------------------
# Step 4 — Silhouette score (quality check)
# ---------------------------------------------------------------------------

def evaluate_clustering(reduced: np.ndarray, labels: np.ndarray) -> float:
    """Compute silhouette score on non-noise points."""
    from sklearn.metrics import silhouette_score

    mask = labels != -1
    if mask.sum() < 2 or len(set(labels[mask])) < 2:
        return 0.0

    score = silhouette_score(reduced[mask], labels[mask], sample_size=2000, random_state=42)
    print(f"   📐 Silhouette score: {score:.3f} (>0.3 = bon, >0.5 = très bon)")
    return score


# ---------------------------------------------------------------------------
# Step 5 — LLM cluster naming via Claude
# ---------------------------------------------------------------------------

def build_cluster_context(cluster_payloads: list[dict]) -> str:
    """
    Build a compact description of a cluster for the LLM prompt.
    Uses title + blurb of the top suttas (by word count, as a quality proxy).
    """
    # Sort by word count desc (longer/richer suttas first) then take top 12
    sorted_suttas = sorted(cluster_payloads, key=lambda p: p.get("word_count", 0), reverse=True)
    top = sorted_suttas[:12]

    lines = []
    for p in top:
        sid = p.get("sutta_id", "?")
        title = p.get("title", "?")
        blurb = p.get("blurb", "")[:120].replace("\n", " ")
        nikaya = p.get("nikaya_name", "?")
        lines.append(f"- {sid} ({nikaya}) — {title}: {blurb}")

    return "\n".join(lines)


def name_cluster_with_llm(cluster_id: int, cluster_payloads: list[dict], client_llm) -> dict:
    """
    Ask Claude to name a cluster based on a sample of its suttas.
    Returns dict with name, description, keywords, theme.
    """
    context = build_cluster_context(cluster_payloads)
    nikaya_counts = Counter(p.get("nikaya", "?") for p in cluster_payloads)
    nikaya_summary = ", ".join(f"{n}:{c}" for n, c in nikaya_counts.most_common(5))

    prompt = f"""You are analyzing a cluster of {len(cluster_payloads)} Buddhist suttas that were grouped together by semantic similarity (HDBSCAN clustering of sentence embeddings). Your task is to identify the unifying theme.

Nikaya distribution: {nikaya_summary}

Sample suttas from this cluster:
{context}

Based on these suttas, provide a JSON object with:
- "name": a concise theme name (3-6 words, in English)
- "description": 1-2 sentence description of what unifies these suttas (what teaching or topic they share)
- "keywords": list of 4-6 Pali or English keywords that characterize this cluster
- "theme_category": one of: practice, doctrine, ethics, cosmology, community, psychology, narrative, poetry, mixed

Respond ONLY with valid JSON, no markdown, no explanation."""

    response = client_llm.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # Strip possible markdown fences
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1])

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: minimal info
        return {
            "name": f"Cluster {cluster_id}",
            "description": "Theme to be determined.",
            "keywords": [],
            "theme_category": "mixed",
        }


def name_all_clusters(
    cluster_map: dict[int, list[dict]],
    use_llm: bool = True,
) -> dict[int, dict]:
    """
    Name all clusters. Returns dict: cluster_id → {name, description, keywords, ...}
    """
    if not use_llm:
        print("\n⏭️  LLM naming skipped (--no-llm)")
        return {
            cid: {
                "name": f"Cluster {cid}",
                "description": "",
                "keywords": [],
                "theme_category": "mixed",
                "size": len(payloads),
                "cluster_id": cid,
                "nikaya_breakdown": dict(Counter(p.get("nikaya", "?") for p in payloads).most_common()),
            }
            for cid, payloads in cluster_map.items()
        }

    try:
        import anthropic
        client_llm = anthropic.Anthropic()
    except ImportError:
        print("⚠️  Package 'anthropic' non installé — naming skipped. Install: uv pip install anthropic")
        return name_all_clusters(cluster_map, use_llm=False)
    except Exception as e:
        print(f"⚠️  Anthropic client error: {e} — naming skipped")
        return name_all_clusters(cluster_map, use_llm=False)

    print(f"\n🤖 Nommage de {len(cluster_map)} clusters via Claude Haiku...")
    cluster_info: dict[int, dict] = {}

    for cluster_id, payloads in tqdm(sorted(cluster_map.items()), desc="Naming"):
        info = name_cluster_with_llm(cluster_id, payloads, client_llm)
        info["size"] = len(payloads)
        info["cluster_id"] = cluster_id
        # Nikaya breakdown
        info["nikaya_breakdown"] = dict(Counter(p.get("nikaya", "?") for p in payloads).most_common())
        cluster_info[cluster_id] = info

    return cluster_info


# ---------------------------------------------------------------------------
# Step 6 — Persist to Qdrant + save JSON
# ---------------------------------------------------------------------------

def _sutta_to_id(sutta_id: str) -> int:
    """Stable integer ID for a sutta (mirrors ingest_suttas.sutta_to_id)."""
    import hashlib
    return int(hashlib.md5(sutta_id.encode()).hexdigest()[:16], 16) % (2**63)


def update_qdrant_payloads(
    client: QdrantClient,
    payloads: list[dict],
    labels: np.ndarray,
    cluster_info: dict[int, dict],
) -> None:
    """
    Update each sutta's Qdrant payload with its cluster_id and cluster_name.
    Outliers (label=-1) get cluster_id=None.
    """
    print("\n💾 Mise à jour des payloads Qdrant...")

    batch_ids = []
    batch_payloads = []

    for payload, label in zip(payloads, labels):
        sutta_id = payload["sutta_id"]
        point_id = _sutta_to_id(sutta_id)
        label_int = int(label)

        cluster_update = {
            "cluster_id": label_int if label_int != -1 else None,
            "cluster_name": cluster_info[label_int]["name"] if label_int in cluster_info else None,
        }

        batch_ids.append(point_id)
        batch_payloads.append(cluster_update)

        if len(batch_ids) >= 500:
            _flush_payload_batch(client, batch_ids, batch_payloads)
            batch_ids, batch_payloads = [], []

    if batch_ids:
        _flush_payload_batch(client, batch_ids, batch_payloads)

    print(f"   ✅ {len(payloads)} payloads mis à jour")


def _flush_payload_batch(client, ids, payloads_list):
    for pid, pl in zip(ids, payloads_list):
        client.set_payload(
            collection_name=COLLECTION_NAME,
            payload=pl,
            points=PointIdsList(points=[pid]),
        )


def save_results(
    output_path: Path,
    cluster_info: dict[int, dict],
    payloads: list[dict],
    labels: np.ndarray,
    silhouette: float,
) -> None:
    """Save full clustering results to JSON."""
    # Build sutta → cluster mapping
    sutta_clusters = {}
    for payload, label in zip(payloads, labels):
        sutta_clusters[payload["sutta_id"]] = int(label)

    results = {
        "meta": {
            "total_suttas": len(payloads),
            "n_clusters": len(cluster_info),
            "n_outliers": int(np.sum(labels == -1)),
            "silhouette_score": round(silhouette, 4),
        },
        "clusters": {
            str(cid): info for cid, info in sorted(cluster_info.items())
        },
        "sutta_assignments": sutta_clusters,
    }

    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n📄 Résultats sauvegardés: {output_path}")


# ---------------------------------------------------------------------------
# Exploration mode — parameter tuning
# ---------------------------------------------------------------------------

def explore_params(vectors: np.ndarray) -> None:
    """
    Try several HDBSCAN parameter combinations and report metrics.
    Useful for finding the right granularity before committing.
    """
    print("\n🔬 Mode exploration — test de paramètres HDBSCAN")
    reduced = reduce_dimensions(vectors)

    configs = [
        (10, 3),
        (15, 5),
        (20, 5),
        (30, 10),
        (50, 10),
    ]

    print(f"\n{'min_cluster':>12} {'min_samples':>12} {'clusters':>9} {'outliers%':>10} {'silhouette':>11}")
    print("-" * 60)

    for min_cluster, min_samples in configs:
        labels = cluster_hdbscan(reduced, min_cluster, min_samples)
        sil = evaluate_clustering(reduced, labels)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        noise_pct = 100 * np.sum(labels == -1) / len(labels)
        print(f"{min_cluster:>12} {min_samples:>12} {n_clusters:>9} {noise_pct:>9.1f}% {sil:>11.3f}")

    print("\n💡 Conseil: choisis le paramétrage avec silhouette > 0.3 et < 15% d'outliers")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Clustering HDBSCAN des suttas depuis Qdrant 'buddhist_suttas'"
    )
    parser.add_argument("--min-cluster", type=int, default=15,
                        help="Taille minimale d'un cluster (défaut: 15)")
    parser.add_argument("--min-samples", type=int, default=5,
                        help="Paramètre min_samples HDBSCAN (défaut: 5)")
    parser.add_argument("--umap-dims", type=int, default=50,
                        help="Dimensions UMAP (défaut: 50)")
    parser.add_argument("--explore", action="store_true",
                        help="Mode exploration: tester plusieurs paramètres")
    parser.add_argument("--no-llm", action="store_true",
                        help="Désactiver le nommage LLM (plus rapide)")
    parser.add_argument("--no-qdrant-update", action="store_true",
                        help="Ne pas mettre à jour Qdrant (résultats JSON seulement)")
    parser.add_argument("--output", type=str, default="clusters.json",
                        help="Fichier JSON de sortie (défaut: clusters.json)")
    args = parser.parse_args()

    try:
        client = QdrantClient(url=QDRANT_URL)
        info = client.get_collection(COLLECTION_NAME)
        print(f"🗄️  Collection '{COLLECTION_NAME}': {info.points_count} points")
    except Exception as e:
        print(f"❌ Impossible de se connecter à Qdrant ({QDRANT_URL}): {e}")
        sys.exit(1)

    # Fetch vectors
    payloads, vectors = fetch_all_points(client)

    if args.explore:
        explore_params(vectors)
        return

    # Full pipeline
    reduced = reduce_dimensions(vectors, n_components=args.umap_dims)
    labels = cluster_hdbscan(reduced, args.min_cluster, args.min_samples)
    silhouette = evaluate_clustering(reduced, labels)

    # Build cluster_id → payloads map
    cluster_map: dict[int, list[dict]] = defaultdict(list)
    for payload, label in zip(payloads, labels):
        if label != -1:
            cluster_map[int(label)].append(payload)

    # Name clusters
    cluster_info = name_all_clusters(cluster_map, use_llm=not args.no_llm)

    # Print summary
    print(f"\n{'':=<70}")
    print(f"  RÉSUMÉ DES CLUSTERS ({len(cluster_info)} groupes)")
    print(f"{'':=<70}")
    for cid, info in sorted(cluster_info.items(), key=lambda x: -x[1]["size"]):
        breakdown = " | ".join(f"{n}:{c}" for n, c in list(info.get("nikaya_breakdown", {}).items())[:4])
        print(f"  [{cid:3d}] {info['size']:4d} suttas — {info['name']}")
        print(f"         {info.get('description', '')[:90]}")
        print(f"         Nikayas: {breakdown}")
        if info.get("keywords"):
            print(f"         Mots-clés: {', '.join(info['keywords'])}")
        print()

    # Update Qdrant
    if not args.no_qdrant_update:
        update_qdrant_payloads(client, payloads, labels, cluster_info)

    # Save JSON
    output_path = REPO_ROOT / args.output
    save_results(output_path, cluster_info, payloads, labels, silhouette)


if __name__ == "__main__":
    main()
