#!/usr/bin/env node
/**
 * Build local content index from _content/ + sc-data HTML texts + AccessToInsight.
 * Generates:
 *   - public/content/suttas.json     (index of all canon suttas with metadata)
 *   - public/content/all-content.json (index of ALL content items)
 *   - public/content/texts/{id}.json  (individual sutta full text)
 */

import fs from "fs";
import path from "path";
import { parse as parseHTML } from "node-html-parser";
import https from "https";
import http from "http";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CANON_DIR = path.join(ROOT, "_content/canon");
const SC_DATA = path.join(ROOT, "sc-data/html_text/en/pli/sutta");
const BILARA_EN = path.join(ROOT, "sc-data/sc_bilara_data/translation/en/sujato/sutta");
const OUT_DIR = path.join(ROOT, "frontend/public/content");
const TEXTS_DIR = path.join(OUT_DIR, "texts");
const ATI_CACHE = path.join(OUT_DIR, ".ati-cache");
const CONTENT_DIR = path.join(ROOT, "_content");
const CATEGORIES = ["articles", "av", "booklets", "canon", "essays", "excerpts", "monographs", "papers", "reference"];

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: "" };
  const body = match[2].trim();
  const meta = {};
  let currentKey = null;
  let currentList = null;

  for (const line of match[1].split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const listItem = line.match(/^\s+-\s+"?(.+?)"?\s*$/);
    if (listItem && currentKey) {
      if (!currentList) currentList = [];
      currentList.push(listItem[1]);
      meta[currentKey] = currentList;
      continue;
    }
    if (currentList) currentList = null;
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      let val = kv[2].trim().replace(/^["']|["']$/g, "");
      if (val === "") {
        currentList = [];
        meta[currentKey] = currentList;
      } else if (val.startsWith("[") && val.endsWith("]")) {
        meta[currentKey] = val.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
      } else if (val === "true") meta[currentKey] = true;
      else if (val === "false") meta[currentKey] = false;
      else if (/^\d+$/.test(val)) meta[currentKey] = parseInt(val);
      else meta[currentKey] = val;
    }
  }
  return { meta, body };
}

function htmlToText(html, isATI = false) {
  const root = parseHTML(html);

  if (isATI) {
    // ATI pages: content is in div.text or the main body
    root.querySelectorAll("script, style, .menu, .navbar, .footer, .breadcrumb").forEach(el => el.remove());
    const textDiv = root.querySelector("div.text") || root.querySelector("body") || root;
    return extractText(textDiv);
  }

  // SuttaCentral format
  root.querySelectorAll("a.ref").forEach(el => el.remove());
  root.querySelectorAll("header").forEach(el => el.remove());
  const article = root.querySelector("article") || root;
  return extractText(article);
}

function extractText(node) {
  let text = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      text += child.rawText;
    } else if (child.tagName) {
      const tag = child.tagName.toLowerCase();
      const content = child.text.trim();
      if (!content) continue;
      if (tag === "h1" || tag === "h2") text += `\n## ${content}\n\n`;
      else if (tag === "h3") text += `\n### ${content}\n\n`;
      else if (tag === "h4") text += `\n#### ${content}\n\n`;
      else if (tag === "blockquote") text += content.split("\n").map(l => `> ${l.trim()}`).join("\n") + "\n\n";
      else if (tag === "ul" || tag === "ol") {
        child.querySelectorAll("li").forEach(li => { text += `- ${li.text.trim()}\n`; });
        text += "\n";
      } else if (tag === "p" || tag === "div") text += content + "\n\n";
      else if (tag === "br") text += "\n";
      else text += content + "\n\n";
    }
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

// Build a full index of all sc-data HTML files for fast lookup
function buildScIndex() {
  const index = new Map();
  if (!fs.existsSync(SC_DATA)) return index;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".html")) {
        const id = entry.name.replace(".html", "");
        // Only keep the first match (avoid translator duplicates)
        if (!index.has(id)) {
          index.set(id, path.join(dir, entry.name));
        }
      }
    }
  }
  walk(SC_DATA);
  return index;
}

function extractSuttaId(filename) {
  let base = filename.replace(".md", "");
  // Remove translator suffix: dhp1_kmas -> dhp1, dhp1_suddhaso -> dhp1
  base = base.replace(/_[a-z-]+$/, "");
  if (/^(an|sn|mn|dn|dhp|snp|ud|iti|thig|thag|kp|pv|vv|ja|mil|ne|pe|ps)\d/i.test(base)) return base;
  if (/^(tha-ap|thi-ap)/i.test(base)) return base;
  return null;
}

// For range-based files like dhp1-20.html, check if a sutta ID falls within the range
function findInRangeFile(id, scIndex) {
  // Direct match first
  if (scIndex.has(id)) return scIndex.get(id);

  // Try range match (e.g., dhp1 -> dhp1-20.html)
  const match = id.match(/^([a-z-]+?)(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const [, prefix, numStr] = match;
  const num = parseFloat(numStr);

  for (const [key, filepath] of scIndex.entries()) {
    const rangeMatch = key.match(new RegExp(`^${prefix}(\\d+)-(\\d+)$`));
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (num >= start && num <= end) return filepath;
    }
  }
  return null;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "BuddhistUni-Indexer/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function downloadATI(url, cacheKey) {
  const cacheFile = path.join(ATI_CACHE, `${cacheKey}.html`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile, "utf-8");
  }
  try {
    const html = await fetchUrl(url);
    fs.writeFileSync(cacheFile, html);
    return html;
  } catch (e) {
    console.error(`  Failed to download ${url}: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bilara JSON → readable text
// ---------------------------------------------------------------------------

/**
 * Assemble a bilara segment JSON into readable plain text.
 * Segments are keyed like "sn56.61:1.1", "sn56.61:2.3", etc.
 * - :0.x → title/header segments (skip :0.1 book title, use :0.3 as sutta title)
 * - :x.y (x>=1) → text, group by paragraph number x
 */
function bilaraToText(segments) {
  /**
   * Bilara keys come in two formats:
   *   2-level: "sn56.61:1.1"  → paragraph=1, sentence=1
   *   3-level: "dn3:1.2.1"    → section=1, paragraph=2, sentence=1
   *
   * We normalise to a sortable tuple and group by (section, paragraph).
   */
  function parseKey(k) {
    // Match everything after the colon
    const m = k.match(/:(\d+)\.(\d+)(?:\.(\d+))?$/);
    if (!m) return null;
    const a = parseInt(m[1]);
    const b = parseInt(m[2]);
    const c = m[3] !== undefined ? parseInt(m[3]) : null;
    return { a, b, c };
  }

  const entries = Object.entries(segments)
    .map(([k, v]) => ({ k, v: (v || "").trim(), p: parseKey(k) }))
    .filter(e => e.p !== null)
    .sort((x, y) => {
      if (x.p.a !== y.p.a) return x.p.a - y.p.a;
      if (x.p.b !== y.p.b) return x.p.b - y.p.b;
      return (x.p.c ?? 0) - (y.p.c ?? 0);
    });

  // Group into paragraphs by (section, paragraph) — i.e. the first two numbers
  // For 2-level keys: group key = "a" (paragraph); for 3-level: "a.b" (section.paragraph)
  const paragraphs = new Map();
  let chapterTitle = "";

  for (const { p, v } of entries) {
    if (!v) continue;

    // Header segments: a===0
    if (p.a === 0) {
      // b===2 → chapter/vagga title
      if (p.b === 2) chapterTitle = v;
      // skip :0.1 (book name), :0.3 (often same as sutta title)
      continue;
    }

    // Build paragraph group key
    const groupKey = p.c !== null ? `${p.a}.${p.b}` : `${p.a}`;
    if (!paragraphs.has(groupKey)) paragraphs.set(groupKey, []);
    paragraphs.get(groupKey).push(v);
  }

  // Sort group keys numerically (handle "1.2" < "1.10" < "2.1")
  const sortedKeys = [...paragraphs.keys()].sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  let result = "";
  if (chapterTitle) result += `## ${chapterTitle}\n\n`;
  for (const key of sortedKeys) {
    result += paragraphs.get(key).join(" ").trim() + "\n\n";
  }

  return result.trim();
}

/**
 * Build an index of all bilara Sujato EN translation files.
 * Returns Map<sutta_id, filepath>
 */
function buildBilaraIndex() {
  const index = new Map();
  if (!fs.existsSync(BILARA_EN)) return index;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith("_translation-en-sujato.json")) {
        // e.g. sn56.61_translation-en-sujato.json → sn56.61
        const id = entry.name.replace("_translation-en-sujato.json", "");
        index.set(id, path.join(dir, entry.name));
      }
    }
  }
  walk(BILARA_EN);
  return index;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Building local content index...\n");
  fs.mkdirSync(TEXTS_DIR, { recursive: true });
  fs.mkdirSync(ATI_CACHE, { recursive: true });

  // Build sc-data file index
  console.log("Indexing sc-data files...");
  const scIndex = buildScIndex();
  console.log(`  Found ${scIndex.size} HTML files in sc-data\n`);

  const suttas = [];
  let matchedSC = 0;
  let matchedATI = 0;
  let total = 0;

  const canonFiles = fs.readdirSync(CANON_DIR).filter(f => f.endsWith(".md"));

  // First pass: SC matches
  console.log("Pass 1: Matching with SuttaCentral data...");
  const atiQueue = [];

  for (const file of canonFiles) {
    const raw = fs.readFileSync(path.join(CANON_DIR, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    const suttaId = extractSuttaId(file);
    total++;

    let isLocal = false;

    if (suttaId) {
      const scFile = findInRangeFile(suttaId, scIndex);
      if (scFile) {
        const html = fs.readFileSync(scFile, "utf-8");
        const localText = htmlToText(html, false);
        isLocal = true;
        matchedSC++;

        fs.writeFileSync(
          path.join(TEXTS_DIR, `${suttaId}.json`),
          JSON.stringify({
            id: suttaId,
            title: meta.title || suttaId,
            translator: meta.translator || "",
            text: localText,
            description: body,
            source: "suttacentral",
          })
        );
      } else if (meta.external_url && (
        meta.external_url.includes("accesstoinsight") ||
        meta.external_url.includes("dhammatalks.org") ||
        meta.external_url.includes("suttafriends.org") ||
        meta.external_url.includes("ancient-buddhist-texts.net") ||
        meta.external_url.includes("suttareadings.net") ||
        meta.external_url.includes("bhantesuddhaso.com") ||
        meta.external_url.includes("readingfaithfully.org")
      )) {
        atiQueue.push({ file, meta, body, suttaId });
      }
    }

    suttas.push({
      id: suttaId || file.replace(".md", ""),
      file,
      title: meta.title || file.replace(".md", ""),
      translator: meta.translator || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      course: meta.course || null,
      year: meta.year || null,
      stars: meta.stars || null,
      pages: meta.pages || null,
      status: meta.status || null,
      external_url: meta.external_url || null,
      description: body.slice(0, 300),
      local: isLocal,
      _downloadPending: false,
    });
  }

  console.log(`  Matched: ${matchedSC}\n`);

  // Second pass: Download from free sources (ATI, DhammaTalks, SuttaFriends)
  if (atiQueue.length > 0) {
    console.log(`Pass 2: Downloading ${atiQueue.length} texts from free sources...`);
    for (const { file, meta, body, suttaId } of atiQueue) {
      const url = meta.external_url;
      const cacheKey = suttaId || file.replace(".md", "");
      const html = await downloadATI(url, cacheKey);
      if (html) {
        const localText = htmlToText(html, true);
        if (localText.length > 100) {
          matchedATI++;
          fs.writeFileSync(
            path.join(TEXTS_DIR, `${suttaId}.json`),
            JSON.stringify({
              id: suttaId,
              title: meta.title || suttaId,
              translator: meta.translator || "",
              text: localText,
              description: body,
              source: new URL(url).hostname.replace("www.", ""),
            })
          );
          // Update the sutta entry
          const entry = suttas.find(s => s.id === suttaId);
          if (entry) entry.local = true;
        }
      }
    }
    console.log(`  Downloaded: ${matchedATI}\n`);
  }

  // Clean up temp field
  suttas.forEach(s => delete s._downloadPending);

  // Pass 3: Bilara — index ALL Sujato translations not yet covered
  console.log("Pass 3: Indexing remaining suttas from sc_bilara_data (Sujato EN)...");
  const bilaraIndex = buildBilaraIndex();
  console.log(`  Found ${bilaraIndex.size} bilara translation files`);
  let bilaraNew = 0;

  for (const [suttaId, bilaraFile] of bilaraIndex.entries()) {
    const textOut = path.join(TEXTS_DIR, `${suttaId}.json`);
    // Skip if already written by HTML or ATI passes
    if (fs.existsSync(textOut)) continue;

    try {
      const raw = JSON.parse(fs.readFileSync(bilaraFile, "utf-8"));
      const text = bilaraToText(raw);
      if (text.length < 20) continue; // skip empty/trivial

      // Derive title: first segment keyed ":0.3" (sutta name), fallback to ":0.2" or suttaId
      let title = suttaId;
      for (const [k, v] of Object.entries(raw)) {
        if (k.endsWith(":0.3") && v.trim()) { title = v.trim(); break; }
      }
      if (title === suttaId) {
        for (const [k, v] of Object.entries(raw)) {
          if (k.endsWith(":0.2") && v.trim()) { title = v.trim(); break; }
        }
      }

      fs.writeFileSync(textOut, JSON.stringify({
        id: suttaId,
        title,
        translator: "Bhikkhu Sujato",
        text,
        description: "",
        source: "suttacentral-bilara",
      }));
      bilaraNew++;
    } catch {
      // skip malformed files
    }
  }
  console.log(`  Added: ${bilaraNew} new local texts from bilara\n`);

  // Build full content index (all categories)
  console.log("Building full content index...");
  const allContent = [];
  for (const category of CATEGORIES) {
    const catDir = path.join(CONTENT_DIR, category);
    if (!fs.existsSync(catDir)) continue;
    const files = fs.readdirSync(catDir).filter(f => f.endsWith(".md"));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(catDir, file), "utf-8");
      const { meta, body } = parseFrontmatter(raw);
      const slug = file.replace(".md", "");
      const isCanonLocal = category === "canon" && suttas.find(s => s.file === file)?.local;

      allContent.push({
        slug,
        category,
        title: meta.title || slug,
        authors: Array.isArray(meta.authors) ? meta.authors : (meta.translator ? [meta.translator] : []),
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        course: meta.course || null,
        year: meta.year || null,
        stars: meta.stars || null,
        pages: meta.pages || null,
        minutes: meta.minutes || null,
        status: meta.status || null,
        external_url: meta.external_url || null,
        description: body.slice(0, 200),
        local: isCanonLocal || false,
      });
    }
  }

  // Write indexes
  fs.writeFileSync(path.join(OUT_DIR, "suttas.json"), JSON.stringify(suttas));
  fs.writeFileSync(path.join(OUT_DIR, "all-content.json"), JSON.stringify(allContent));

  const totalLocal = suttas.filter(s => s.local).length;
  const totalTextFiles = fs.readdirSync(TEXTS_DIR).filter(f => f.endsWith(".json")).length;
  console.log(`\n=== Summary ===`);
  console.log(`Canon files:        ${total}`);
  console.log(`SC matched:         ${matchedSC}`);
  console.log(`ATI downloaded:     ${matchedATI}`);
  console.log(`Bilara added:       ${bilaraNew}`);
  console.log(`Total text files:   ${totalTextFiles}`);
  console.log(`Total local texts:  ${totalLocal} (in index)`);
  console.log(`Total content:      ${allContent.length}`);
  console.log(`Output: ${OUT_DIR}/`);
}

main().catch(console.error);
