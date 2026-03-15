# Buddhist Study — Mobile App

Offline Flutter app for studying the Pāli Canon. No server, no network required after install.

## Features

- **Semantic search** — on-device query embedding (TFLite) + ObjectBox HNSW nearest-neighbour
- **4,200+ suttas** — full text, offline, seeded from project assets on first launch
- **166 study plans** — thematic HDBSCAN clusters, progress tracking, prev/next navigation
- **Notes** — cite passages, annotate suttas, browse by sutta / plan / date

## Stack

| Layer | Technology |
|---|---|
| Framework | Flutter 3.19+, Dart 3.3+ |
| DB / Vector search | ObjectBox 4 (HNSW, cosine) |
| On-device embedding | TFLite — all-MiniLM-L6-v2 (384 dims) |
| State management | Riverpod 2 |
| Navigation | go_router |

## Prerequisites

- Flutter ≥ 3.19 ([install](https://docs.flutter.dev/get-started/install))
- Xcode ≥ 15 (iOS) or Android Studio (Android)
- Node.js ≥ 18 (for sutta text generation)
- Python 3.11+ (for asset preparation and model conversion)
- `sc-bilara-data` cloned under `sc-data/` (see root README)

## Setup — step by step

> All commands are run from the **repo root** unless otherwise noted.

---

### Step 1 — Install Flutter

```bash
# macOS
brew install flutter
flutter doctor   # fix anything not green before continuing
```

---

### Step 2 — Generate sutta texts (if not already done)

The frontend build script extracts ~4,200 sutta texts from the bilara data
and writes them to `frontend/public/content/texts/*.json`.
This is shared with the web app — skip if already done.

```bash
# Requires sc-data/sc_bilara_data to be present (see root README)
cd frontend
npm install
node scripts/build-local-content.mjs
cd ..
# → frontend/public/content/texts/  (~4,200 JSON files)
```

---

### Step 3 — Prepare mobile assets

Assets are **not committed to git** (too large). Generate them once from the sutta texts:

```bash
pip install sentence-transformers tqdm numpy
python mobile/scripts/prepare_assets.py
```

This outputs:
```
mobile/assets/data/suttas_seed.json   ~20 MB  (metadata + text segments)
mobile/assets/data/embeddings.bin     ~6 MB   (float32, 384 dims × N suttas)
mobile/assets/data/study_plans.json   ~1 MB   (166 thematic clusters)
```

**Already have embeddings in Qdrant?** Skip recomputing (~10 min) and pull directly:
```bash
# Qdrant must be running (cd search && docker-compose up -d)
python mobile/scripts/prepare_assets.py --source qdrant
```

---

### Step 4 — Convert the embedding model to TFLite

The TFLite model (~22 MB) encodes user queries on-device at search time.
The sutta embeddings are pre-computed (step 3) — only queries need live inference.

```bash
pip install transformers torch onnx optimum
python mobile/scripts/convert_model.py
```

Outputs:
```
mobile/assets/model/all-MiniLM-L6-v2.tflite   ~22 MB
mobile/assets/model/vocab.txt                  WordPiece vocabulary
```

> **If TFLite conversion fails** (env issues), the script falls back to ONNX and prints
> instructions for `onnxruntime` Flutter — a drop-in alternative.

---

### Step 5 — Add fonts

Download [Lora](https://fonts.google.com/specimen/Lora) and place in `mobile/assets/fonts/`:
```
assets/fonts/Lora-Regular.ttf
assets/fonts/Lora-Italic.ttf
assets/fonts/Lora-Bold.ttf
```

---

### Step 6 — Run

```bash
cd mobile
flutter pub get
# Generate ObjectBox bindings (required once, re-run if models change)
flutter pub run build_runner build --delete-conflicting-outputs
flutter run
```

On first launch the app seeds ~4,200 suttas into ObjectBox (10–30 s, one-time only).
A progress screen is shown during this import.

---

## Full generation summary

```
# 1. Sutta texts (shared with web app)
cd frontend && node scripts/build-local-content.mjs && cd ..

# 2. Mobile assets
python mobile/scripts/prepare_assets.py          # ~10 min (embedding)
python mobile/scripts/convert_model.py           # ~5 min (TFLite)

# 3. Flutter
cd mobile
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run
```

## Project structure

```
lib/
├── main.dart               — app entry point + provider overrides
├── app.dart                — MaterialApp + go_router
├── core/
│   ├── database/           — ObjectBox store + box providers
│   ├── embedder/           — TFLite embedder + WordPiece tokenizer
│   ├── seeder/             — first-launch import pipeline
│   └── theme/              — design tokens (saffron/burgundy/sage palette)
├── models/                 — ObjectBox entities (Sutta, StudyPlan, Note, …)
├── repositories/           — typed data access layer
└── features/
    ├── splash/             — first-launch seeding progress screen
    ├── home/               — bottom nav shell
    ├── search/             — semantic search
    ├── reader/             — sutta reader + inline notes
    ├── study_plans/        — plan list + plan detail with progress
    └── notes/              — notes browser (filter by sutta/plan/date)
scripts/
├── prepare_assets.py       — generates suttas_seed.json + embeddings.bin
└── convert_model.py        — converts all-MiniLM-L6-v2 → TFLite
```

## Adding sync later

All user data (notes, reading progress) lives in ObjectBox.
When sync becomes needed:
- Notes → export as JSON (NotesRepository already has `all()`)
- Progress → export StudyPlanProgress entities
- Sync target could be iCloud (CloudKit), Google Drive JSON, or a simple REST API

The architecture is intentionally minimal — no network layer to remove.
