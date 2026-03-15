# Buddhist University - Development Guide

## Project Overview

A modern Buddhist education platform with 4,495+ resources, 71 courses, and 591+ locally available sutta texts from the Pali Canon.

## Architecture

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS) in `frontend/`
- **Search Backend**: FastAPI + Qdrant vector DB in `search/`
- **Content**: Markdown files with YAML frontmatter in `_content/`
- **Local Texts**: Downloaded sutta texts from SuttaCentral and AccessToInsight in `frontend/public/content/texts/`
- **MCP Server**: Claude integration via `.mcp.json`

## Key Commands

```bash
cd frontend
npm run build:content   # Index all Buddhist teachings from _content/ + sc-data/
npm run build           # Build frontend (runs build:content first via prebuild)
npm run dev             # Start dev server
```

## Critical Rule: Always Index Buddhist Teachings

**Every Buddhist teaching MUST be indexed locally when possible.** When adding new content or updating the site:

1. All sutta/canon texts from SuttaCentral (`sc-data/`) must be matched and indexed
2. AccessToInsight texts must be downloaded and cached in `frontend/public/content/.ati-cache/`
3. Run `npm run build:content` after any content changes to rebuild the index
4. The build script (`frontend/scripts/build-local-content.mjs`) handles:
   - Parsing `_content/canon/*.md` frontmatter
   - Matching against `sc-data/html_text/en/pli/sutta/` HTML files
   - Downloading AccessToInsight texts (with cache)
   - Generating `suttas.json`, `all-content.json`, and individual `texts/*.json`
5. Local texts enable offline reading — this is a core feature

## Content Sources (freely licensed)

- **SuttaCentral** (sc-data/): CC BY-NC license, cloned as git repo — primary source (742 texts)
- **AccessToInsight**: Free distribution, texts cached locally
- **DhammaTalks.org**: Free distribution by Thanissaro Bhikkhu
- **SuttaFriends.org**: Free distribution
- **Ancient Buddhist Texts**: Free distribution
- **ReadingFaithfully.org**: Free distribution
- **SuttaReadings.net**: Free distribution
- **BhanteSuddhaso.com**: Free distribution

### Sources to add in future
- **84000.co**: Tibetan/Mahayana sutras (Kangyur) — CC BY-NC-ND
- **BDK America** (bdkamerica.org): Chinese canon translations — free PDFs
- **CBETA** (cbeta.org): Chinese Taishō Tripitaka — digital archive
- **Sacred Texts** (sacred-texts.com): Various Buddhist texts

## Local vs External Content

- Content with `local: true` in the index has full text available offline
- Content with `local: false` links to external URLs
- The Library page (`/library`) shows a toggle for "Offline only" mode
- Sutta reader page (`/suttas/[id]`) renders local texts

## Color Palette

Buddhist-inspired: saffron (#E8A317), burgundy (#6B1D2A), cream (#FDF6E3), lotus pink (#D4829C), sage green (#5B7F5E), dharma gold (#C9A84C)
