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
- Python 3.11+ (for asset preparation only)

## Setup

### 1. Install Flutter

```bash
# macOS (via homebrew)
brew install flutter
flutter doctor   # check everything is green
```

### 2. Prepare assets

Assets are not committed to git (too large). Generate them once:

```bash
# From repo root
pip install sentence-transformers tqdm numpy
python mobile/scripts/prepare_assets.py
# → mobile/assets/data/suttas_seed.json  (~20 MB)
# → mobile/assets/data/embeddings.bin    (~6 MB)
# → mobile/assets/data/study_plans.json  (~1 MB)

# Already have embeddings in Qdrant? Faster:
python mobile/scripts/prepare_assets.py --source qdrant
```

### 3. Prepare the TFLite model

```bash
pip install transformers torch onnx optimum
python mobile/scripts/convert_model.py
# → mobile/assets/model/all-MiniLM-L6-v2.tflite  (~22 MB)
# → mobile/assets/model/vocab.txt
```

### 4. Add fonts

Download [Lora](https://fonts.google.com/specimen/Lora) and place in `assets/fonts/`:
- `Lora-Regular.ttf`
- `Lora-Italic.ttf`
- `Lora-Bold.ttf`

### 5. Run

```bash
cd mobile
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs  # generates objectbox.g.dart
flutter run
```

On first launch, the app imports ~4,200 suttas into ObjectBox (~10-30 seconds).
This only happens once — subsequent launches are instant.

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
