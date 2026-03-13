import fs from "fs";
const suttas = JSON.parse(fs.readFileSync("public/content/suttas.json", "utf-8"));
const unmatched = suttas.filter(s => !s.local);
console.log("Total unmatched:", unmatched.length);
console.log("With ATI URL:", unmatched.filter(s => s.external_url?.includes("accesstoinsight")).length);
console.log("With SC URL:", unmatched.filter(s => s.external_url?.includes("suttacentral")).length);
const other = unmatched.filter(s => s.external_url && !s.external_url.includes("accesstoinsight") && !s.external_url.includes("suttacentral"));
console.log("Other sources:", other.length);
other.slice(0, 10).forEach(s => console.log("  ", s.id, s.external_url));
