/*
 * 99RIM rhyme engine. Runs in the browser (window.Rim) and in Node (for tests).
 *
 * Every word in data/da.tsv comes with its pronunciation in IPA (from eSpeak NG).
 * Two words rhyme when their sounds match from a stressed vowel to the end.
 * We compare those "tails" right to left, one, two and three syllables deep,
 * and reward the deeper matches. Ported from the Cadence engine.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Rim = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const NON_SYLL = "̯"; // combining mark: this vowel is a glide, not a syllable (ɐ̯)
  const COMBINING = /[̀-ͯ]/;

  // Vowels a rhyme can anchor on. Schwa (ə) never anchors: "gade" rhymes on the a, not the e.
  const FULL_VOWELS = new Set(["a", "e", "i", "o", "u", "y", "æ", "ø", "å", "ɐ", "ʌ", "ε", "ɛ", "ɑ", "ɒ", "œ", "ɔ", "ɜ", "ʊ", "ɪ", "ʏ", "ɵ"]);
  const VOWELS = new Set([...FULL_VOWELS, "ə"]);

  // Consonants in the same class are a near match (t/d/ð, m/n/ŋ, ...).
  const CONSONANT_CLASSES = [
    ["b", "p"], ["d", "t", "ð", "θ"], ["g", "ɡ", "k", "x", "ɣ"], ["f", "v", "ʋ", "β", "w"],
    ["s", "z", "ʃ", "ʒ"], ["m", "n", "ŋ"], ["l", "r", "ʁ", "ɾ", "ɹ"], ["j", "h"],
  ];
  const CLASS_OF = {};
  CONSONANT_CLASSES.forEach((cls, i) => cls.forEach((c) => (CLASS_OF[c] = i)));

  // How close two different vowels sound. Unlisted pairs don't rhyme at all.
  const VOWEL_PAIRS = [
    ["e", "ε", 0.7], ["e", "ɛ", 0.7], ["ε", "ɛ", 0.95], ["e", "i", 0.4],
    ["æ", "ε", 0.55], ["æ", "ɛ", 0.55], ["æ", "a", 0.4], ["a", "ɑ", 0.85], ["ɑ", "ɒ", 0.65], ["a", "ɒ", 0.5],
    ["o", "ɔ", 0.65], ["o", "ɒ", 0.5], ["o", "ʌ", 0.55], ["ɔ", "ʌ", 0.7], ["ɒ", "ʌ", 0.7],
    ["å", "ɔ", 0.85], ["å", "ʌ", 0.65], ["å", "o", 0.5], ["å", "ɒ", 0.6],
    ["i", "ɪ", 0.85], ["y", "ʏ", 0.85], ["u", "ʊ", 0.85], ["i", "y", 0.5], ["o", "u", 0.4],
    ["ø", "œ", 0.85], ["ø", "y", 0.4], ["ə", "ɐ", 0.6],
  ];
  const VOWEL_SIM = new Map();
  for (const [a, b, s] of VOWEL_PAIRS) { VOWEL_SIM.set(a + b, s); VOWEL_SIM.set(b + a, s); }

  // Strip what doesn't decide a rhyme: stress, stød, length, joiners, spaces between words.
  function cleanIpa(raw) {
    return String(raw || "")
      .replace(/[ˈˌʔ?ː()\-\s]/g, "")
      .replace(/‍/g, "")
      .replace(/aɪ/g, "ɑj")
      .replace(/ε/g, "ɛ");
  }

  // One unit per sound: a base character plus any combining marks (ɐ̯ is one unit).
  function toUnits(clean) {
    const units = [];
    for (const ch of clean) {
      if (COMBINING.test(ch) && units.length) units[units.length - 1] += ch;
      else units.push(ch);
    }
    return units;
  }
  const base = (u) => u[0];
  const syllabic = (u) => u.length === 1 || !u.includes(NON_SYLL);

  function sim(a, b) {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const av = VOWELS.has(a), bv = VOWELS.has(b);
    if (av && bv) return VOWEL_SIM.get(a + b) || 0;
    if (!av && !bv) return CLASS_OF[a] !== undefined && CLASS_OF[a] === CLASS_OF[b] ? 0.65 : 0;
    return 0;
  }

  // Index of each vowel that can carry a rhyme.
  function anchors(units) {
    const out = [];
    units.forEach((u, i) => { if (FULL_VOWELS.has(base(u)) && syllabic(u)) out.push(i); });
    return out;
  }

  // For each rhyme vowel (same order as anchors()), is its syllable stressed?
  // eSpeak puts ˈ or ˌ before the stressed syllable. A word with no marks at all counts as stressed.
  function stressOf(ipa) {
    const marked = String(ipa || "").replace(/[ʔ?ː()\-\s\u200D]/g, "").replace(/aɪ/g, "ɑj").replace(/ε/g, "ɛ");
    if (!/[ˈˌ]/.test(marked)) return null;
    const out = [];
    let pending = false;
    for (const u of toUnits(marked)) {
      if (u === "ˈ" || u === "ˌ") pending = true;
      else if (FULL_VOWELS.has(base(u)) && syllabic(u)) { out.push(pending); pending = false; }
      else if (VOWELS.has(base(u))) pending = false;
    }
    return out;
  }

  // Everything a lookup needs, computed once per word.
  function prepare(ipa) {
    const units = toUnits(cleanIpa(ipa));
    const anc = anchors(units);
    const st = stressOf(ipa);
    const tails = [], stressed = [];
    for (let d = 1; d <= 3; d++) {
      const at = anc[anc.length - d];
      if (at == null) break;
      tails.push(units.slice(at).map(base));
      stressed.push(!st || st.length !== anc.length ? true : st[anc.length - d]);
    }
    const nucleus = anc.length ? base(units[anc[anc.length - 1]]) : null;
    const syl = Math.max(1, units.filter((u) => VOWELS.has(base(u)) && syllabic(u)).length);
    return { units, tails, stressed, nucleus, depthMax: Math.max(1, anc.length), syl };
  }

  const FINAL_MIN = 0.4;

  // How well two tails rhyme, 0..1. Each tail starts with its anchor vowel.
  function scoreTails(a, b) {
    const anchor = sim(a[0], b[0]);
    if (!anchor || !FULL_VOWELS.has(a[0]) || !FULL_VOWELS.has(b[0])) return 0;
    const ra = a.slice(1), rb = b.slice(1);
    // The very last sounds must be related: if the end doesn't sound alike, it isn't an end rhyme.
    const fa = ra.length ? ra[ra.length - 1] : a[0];
    const fb = rb.length ? rb[rb.length - 1] : b[0];
    if (sim(fa, fb) < FINAL_MIN) return 0;
    const len = Math.max(ra.length, rb.length);
    let total = 0, weight = 0;
    for (let i = 0; i < len; i++) {
      const ca = ra[ra.length - 1 - i], cb = rb[rb.length - 1 - i];
      const s = ca && cb ? sim(ca, cb) : 0;
      // The end counts most. In long tails the sound right after the stressed vowel
      // matters too: "kærlighed" rhymes with "færdighed", not just anything on "-ighed".
      const endDecay = 1 / (1 + i);
      const anchorBoost = i === len - 1 ? Math.max(0, (len - 3) / 4) : 0;
      const w = Math.max(endDecay, anchorBoost);
      total += s * w; weight += w;
    }
    const rest = weight ? total / weight : 1;
    return Math.min(1, anchor * 0.55 + rest * 0.45);
  }

  const NUCLEUS_MIN = 0.6;
  // A rhyme on a stressed syllable against one on an unstressed syllable ("hus" / "fo-kus")
  // only sounds half right: it can't be perfect.
  const STRESS_MISMATCH = 0.85;

  function scorePair(q, c) {
    if (!q.nucleus || !c.nucleus) return null;
    if (q.nucleus !== c.nucleus && (VOWEL_SIM.get(q.nucleus + c.nucleus) || 0) < NUCLEUS_MIN) return null;
    const maxD = Math.min(q.tails.length, c.tails.length, 3);
    let best = null;
    for (let d = 1; d <= maxD; d++) {
      let b = scoreTails(q.tails[d - 1], c.tails[d - 1]);
      if (!b) continue;
      if (q.stressed[d - 1] !== c.stressed[d - 1]) b *= STRESS_MISMATCH;
      const total = b + (d - 1) * 0.2;
      if (!best || total > best.total) best = { base: b, total, depth: d };
    }
    return best;
  }

  // "hus" and "huse" are the same word, not a rhyme.
  const ENDINGS = ["s", "t", "e", "n", "en", "et", "er", "es", "ene", "erne", "ens"];
  function inflection(a, b) {
    if (a === b) return true;
    for (const e of ENDINGS) if (a + e === b || b + e === a) return true;
    return false;
  }

  class Dict {
    constructor(tsv) {
      this.words = [];
      this.byWord = new Map();
      for (const line of tsv.split("\n")) {
        if (!line) continue;
        const [w, ipa, z, flags = ""] = line.split("\t");
        const e = { w, ipa, z: parseFloat(z), name: flags.includes("n"), p: prepare(ipa) };
        this.words.push(e);
        this.byWord.set(w, e);
      }
      this.rank = new Map(this.words.map((e, i) => [e.w, i]));
    }

    has(w) { return this.byWord.has(w); }

    // A word we don't know: borrow the sound of the known word whose spelling ends the same way.
    guess(w) {
      let best = null, bestLen = 1;
      for (const e of this.words) {
        const a = e.w;
        let n = 0;
        while (n < a.length && n < w.length && a[a.length - 1 - n] === w[w.length - 1 - n]) n++;
        if (n > bestLen || (n === bestLen && best && Math.abs(a.length - w.length) < Math.abs(best.w.length - w.length))) {
          best = e; bestLen = n;
        }
      }
      return bestLen >= 2 ? best : null;
    }

    // Sound of a word or a whole phrase ("os to"). guessed lists words we had to estimate.
    pronounce(text) {
      const parts = normalize(text).split(" ").filter(Boolean);
      const ipa = [], guessed = [];
      for (const p of parts) {
        const e = this.byWord.get(p) || this.guess(p);
        if (!e) return null;
        if (e.w !== p) guessed.push(p);
        ipa.push(e.ipa);
      }
      return parts.length ? { ipa: ipa.join(" "), guessed } : null;
    }

    /*
     * Rhymes for a word or phrase, best first.
     * score: 0..100, how fully and cleanly it rhymes (100 = every sound of the
     * input's rhyme matches). depth: syllables matched. syl: syllables in the word.
     */
    find(text, { minScore = 0.55, limit = 600 } = {}) {
      const q = normalize(text);
      const sound = this.pronounce(q);
      if (!sound) return { query: q, results: [], total: 0, guessed: [] };
      const qp = prepare(sound.ipa);
      const last = q.split(" ").pop();
      const inSyl = qp.depthMax;
      const out = [];
      for (const e of this.words) {
        if (e.w === q || inflection(last, e.w)) continue;
        const s = scorePair(qp, e.p);
        if (!s || s.total < minScore) continue;
        // Matching only the last of three syllables isn't a full rhyme: score it lower.
        const coverage = Math.min(1, s.depth / Math.max(1, Math.min(inSyl, 3)));
        const score = Math.round(Math.min(100, s.base * Math.max(0.5, coverage) * 100));
        // "sommerhus" for "hus" is the same word again: keep it, but below the real rhymes.
        const same = e.w.endsWith(last) || last.endsWith(e.w);
        const sort = (s.total + Math.max(0, (e.z - 3) * 0.008)) * (0.5 + 0.5 * coverage) - (same ? 0.5 : 0);
        out.push({ word: e.w, score, depth: s.depth, syl: e.p.syl, z: e.z, same, name: e.name, sort });
      }
      out.sort((a, b) => b.sort - a.sort || b.z - a.z);
      return { query: q, ipa: cleanIpa(sound.ipa), syl: qp.syl, guessed: sound.guessed, total: out.length, results: out.slice(0, limit) };
    }
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-zæøåäöüé\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Strength label for a 0..100 score. "perfect" means every sound matches (natten/katten),
  // not just close ones (natten/gaden).
  function band(score) { return score >= 98 ? "perfect" : score >= 70 ? "strong" : "near"; }

  return { Dict, cleanIpa, prepare, band, normalize };
});
