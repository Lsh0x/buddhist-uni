#!/usr/bin/env node
/**
 * Analyze content clusters for generating study plans.
 * Groups content by tags and courses, identifies natural learning paths.
 */

import fs from "fs";

const all = JSON.parse(fs.readFileSync("public/content/all-content.json", "utf-8"));
const suttas = JSON.parse(fs.readFileSync("public/content/suttas.json", "utf-8"));
const localSuttas = suttas.filter(s => s.local);

console.log(`=== Content Analysis for Study Plans ===\n`);
console.log(`Total content: ${all.length}`);
console.log(`Local suttas: ${localSuttas.length}\n`);

// Find tag co-occurrences (tags that appear together)
const tagPairs = {};
all.forEach(item => {
  const tags = item.tags.filter(t => !t.includes("#") && !t.includes("//"));
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const pair = [tags[i], tags[j]].sort().join(" + ");
      tagPairs[pair] = (tagPairs[pair] || 0) + 1;
    }
  }
});

console.log("=== Top Tag Clusters (co-occurring tags) ===");
Object.entries(tagPairs)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([pair, count]) => console.log(`  ${pair}: ${count}`));

// Courses with LOCAL content available
console.log("\n=== Courses with LOCAL sutta content ===");
const coursesWithLocal = {};
localSuttas.forEach(s => {
  if (s.course) {
    if (!coursesWithLocal[s.course]) coursesWithLocal[s.course] = { count: 0, featured: 0, samples: [] };
    coursesWithLocal[s.course].count++;
    if (s.status === "featured") coursesWithLocal[s.course].featured++;
    if (coursesWithLocal[s.course].samples.length < 3) coursesWithLocal[s.course].samples.push(s.title);
  }
});
Object.entries(coursesWithLocal)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([course, data]) => {
    console.log(`  ${course}: ${data.count} local (${data.featured} featured)`);
    data.samples.forEach(t => console.log(`    - ${t}`));
  });

// Tag-based themes with rich local content
console.log("\n=== Tags with most LOCAL content (potential study plan themes) ===");
const tagLocalCounts = {};
localSuttas.forEach(s => {
  s.tags.filter(t => !t.includes("#")).forEach(t => {
    tagLocalCounts[t] = (tagLocalCounts[t] || 0) + 1;
  });
});
Object.entries(tagLocalCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)
  .forEach(([tag, count]) => console.log(`  ${tag}: ${count} local suttas`));

// Suggested study plan groupings
console.log("\n=== Suggested Study Plan Groupings ===\n");
const themes = [
  { name: "The Path to Liberation", tags: ["path", "stages", "nibbana"], courses: ["path", "nibbana", "stages"] },
  { name: "Meditation & Mind Training", tags: ["meditation", "samadhi", "sati", "vipassana", "samatha"], courses: ["meditation", "samadhi", "sati", "vipassana"] },
  { name: "Ethics & Right Living", tags: ["ethics", "karma", "speech"], courses: ["ethics", "karma", "speech", "communication"] },
  { name: "Understanding Reality", tags: ["philosophy", "view", "emptiness", "origination"], courses: ["philosophy", "view", "origination", "emptiness"] },
  { name: "The Buddha & His World", tags: ["buddha", "characters", "cosmology", "setting"], courses: ["buddha", "characters", "cosmology", "setting"] },
  { name: "Monastic Life", tags: ["sangha", "monastic", "monastic-advice"], courses: ["sangha", "monastic-advice", "vinaya-studies"] },
  { name: "Feelings & Inner Life", tags: ["feeling", "inner", "thought"], courses: ["feeling", "inner", "thought"] },
  { name: "Buddhism in the World", tags: ["engaged", "social", "modern", "west"], courses: ["engaged", "social", "modern", "west"] },
  { name: "Imagery & Poetry", tags: ["imagery", "canonical-poetry"], courses: ["imagery", "canonical-poetry"] },
  { name: "Death & Rebirth", tags: ["death", "rebirth", "cosmology"], courses: ["death", "rebirth-stories"] },
];

themes.forEach(theme => {
  const matching = localSuttas.filter(s =>
    s.tags.some(t => theme.tags.includes(t)) || theme.courses.includes(s.course)
  );
  const featured = matching.filter(s => s.status === "featured");
  console.log(`${theme.name}:`);
  console.log(`  ${matching.length} local suttas (${featured.length} featured)`);
  console.log(`  Tags: ${theme.tags.join(", ")}`);
  console.log(`  Sample titles:`);
  featured.slice(0, 3).forEach(s => console.log(`    ★ ${s.title}`));
  matching.filter(s => s.status !== "featured").slice(0, 2).forEach(s => console.log(`    - ${s.title}`));
  console.log();
});
