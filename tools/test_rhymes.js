// Runs tests/rhymes.tsv against the rhyme engine and data/da.tsv.
// Usage: node tools/test_rhymes.js        (prints failures and the score)
//        node tools/test_rhymes.js -v     (prints every case)
const fs = require("fs");
const path = require("path");
const { Dict, band } = require("../rhyme.js");

const root = path.join(__dirname, "..");
const dict = new Dict(fs.readFileSync(path.join(root, "data/da.tsv"), "utf8"));
const verbose = process.argv.includes("-v");
const cache = new Map();
const results = (q) => {
  if (!cache.has(q)) cache.set(q, dict.find(q, { limit: 1e6 }).results);
  return cache.get(q);
};

let pass = 0, fail = 0;
for (const line of fs.readFileSync(path.join(root, "tests/rhymes.tsv"), "utf8").split("\n")) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [q, w, expect, note = ""] = line.split("\t");
  const r = results(q).find((x) => x.word === w);
  const perfect = !!r && band(r.score) === "perfect";
  const ok = {
    perfect: perfect,
    rhymes: !!r,
    notperfect: !perfect,
    absent: !r,
    name: !!r && !!r.name,
    notname: !!r && !r.name,
  }[expect];
  if (ok === undefined) throw new Error(`Unknown expectation "${expect}" in: ${line}`);
  ok ? pass++ : fail++;
  if (!ok || verbose) {
    const got = r ? `score ${r.score}${r.name ? ", name" : ""}` : "not found";
    console.log(`${ok ? "ok  " : "FAIL"}  ${q} → ${w}: expected ${expect}, got ${got}${note ? `  (${note})` : ""}`);
  }
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
