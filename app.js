(() => {
  "use strict";
  const VERSION = "0.2.0";

  // ---------- AI (Linje tab) ----------
  // Fill in after deploying supabase/functions/rim-ai (see README). Empty = the app runs without AI.
  // The anon key is meant to be public.
  const AI = { url: "", anonKey: "" };

  // prod.99rim.dk is where changes land first; 99rim.dk is the live site.
  if (location.hostname.startsWith("prod.")) {
    document.getElementById("env-badge").hidden = false;
    document.title = "99RIM · prod";
    const robots = document.createElement("meta"); robots.name = "robots"; robots.content = "noindex"; document.head.appendChild(robots);
  }

  // ---------- Phone view on desktop (same as 99MS) ----------
  const framed = window.self !== window.top;
  if (framed) document.documentElement.classList.add("in-frame");
  const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches && Math.min(screen.width, window.innerWidth) >= 820;
  const PV_KEY = "99rim-phone-view";
  const pvGet = () => { try { return localStorage.getItem(PV_KEY) === "1"; } catch { return false; } };
  const pvSet = (on) => { try { on ? localStorage.setItem(PV_KEY, "1") : localStorage.removeItem(PV_KEY); } catch {} };
  const toggle = document.getElementById("view-toggle");
  if (desktop && !framed) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => { pvSet(!pvGet()); location.reload(); });
    if (pvGet()) {
      document.body.classList.add("phone-host");
      toggle.title = toggle.ariaLabel = "Computervisning";
      toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="1.6"></rect><path d="M9 20h6M12 16.5V20"></path></svg>';
      const stage = document.getElementById("phone-stage");
      stage.innerHTML = `
        <div class="device" id="device">
          <div class="device-screen">
            <iframe title="99RIM telefonvisning"></iframe>
            <div class="statusbar" aria-hidden="true"><span class="sb-time" id="sb-time"></span></div>
            <div class="island" aria-hidden="true"></div>
            <div class="home-ind" aria-hidden="true"></div>
          </div>
        </div>`;
      stage.querySelector("iframe").src = location.pathname + "?frame=1" + location.hash;
      stage.hidden = false;
      const device = document.getElementById("device");
      const fit = () => device.style.setProperty("--s", Math.min(1, (innerHeight - 40) / 896, (innerWidth - 40) / 424).toFixed(4));
      fit(); addEventListener("resize", fit);
      const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
      const tick = () => { document.getElementById("sb-time").textContent = fmt.format(new Date()).replace(/\s?[AP]M$/i, ""); };
      tick(); setInterval(tick, 10000);
      return; // the framed copy runs the app
    }
  }

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = new Intl.NumberFormat("da-DK");

  // ---------- Saved state (this device only) ----------
  const KEY = "99rim";
  const state = Object.assign({ tab: "find", ui: "da", same: false, recent: [], saved: [], pad: "" }, (() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  })());
  let saveT = null;
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, 200); };

  // ---------- Text ----------
  const TEXT = {
    da: {
      "tab.find": "Find", "tab.book": "Noter", "tab.settings": "Indstillinger",
      "find.placeholder": "Ord eller linje", "find.meaning": "Betydning", "find.more": "Vis flere", "find.recent": "Seneste",
      "find.intro": "Skriv et ord, en vending eller en hel linje, fx \"kærlighed\" eller \"os to\". En linje rimer på sit sidste ord. Rimene findes på din telefon ud fra udtalen, så det går hurtigt og virker uden net.",
      "find.loading": "Henter ordbogen…", "find.loadFail": "Ordbogen kunne ikke hentes. Tjek din forbindelse og genindlæs siden.",
      "band.all": "Alle", "band.perfect": "Perfekte", "band.near": "Næsten",
      "find.none": "Ingen rim fundet. Prøv et andet ord eller en kortere vending.",
      "find.noneFilter": "Ingen rim med det filter.",
      "find.count": (n) => `${num.format(n)} rim`,
      "find.syl": (n) => `${n} ${n === 1 ? "stavelse" : "stavelser"}`,
      "find.guessed": (w) => `udtalen af "${w}" er gættet`,
      "find.depth": (d) => d === 1 ? "Rimer på sidste stavelse" : `Rimer på ${d} stavelser`,
      "find.sylLabel": "Stavelser", "find.sortLabel": "Sortér",
      "find.sylGroup": (n) => n >= 4 ? "4+ stavelser" : `${n} ${n === 1 ? "stavelse" : "stavelser"}`,
      "find.target": (w) => `rimer på "${w}"`,
      "find.all": (n) => `Vis alle ${num.format(n)}`,
      "find.aiBusy": "AI sorterer…", "find.aiFail": "AI'en svarede ikke. Sorterer efter bedste rim.",
      "sort.best": "Bedste", "sort.syl": "Stavelser", "sort.common": "Almindelige", "sort.abc": "A–Å", "sort.ai": "AI",
      "book.title": "Noter", "book.pad": "Tekst", "book.padPlaceholder": "Skriv din tekst her. Den gemmes på denne enhed.",
      "book.rhymeLast": "Rim på sidste ord", "book.saved": "Gemte ord", "book.empty": "Tryk på et rim og vælg \"Gem i noter\" for at gemme det her.",
      "book.savedAt": "Gemt", "book.remove": "Fjern",
      "set.title": "Indstillinger", "set.ui": "Sprog i appen", "set.rhymes": "Rim", "set.soon": "snart",
      "set.same": "Vis sammensatte ord med samme slutning (fx \"sommerhus\" til \"hus\")", "set.about": "Om 99RIM",
      "set.aboutText": "99RIM finder rim ud fra udtale, ikke stavning. Ordbogen har ca. 29.000 almindelige danske ord med udtale fra eSpeak NG. Enkelte udtaler kan være forkerte. AI-sortering ændrer kun rækkefølgen på de rim, appen selv har fundet.",
      "ws.copy": "Kopiér", "ws.save": "Gem i noter", "ws.unsave": "Fjern fra noter", "ws.search": "Find rim på dette ord", "ws.meaning": "Betydning (ordnet.dk)", "ws.close": "Luk",
      "ws.info": (r) => `${r.score} / 100 · ${r.syl} ${r.syl === 1 ? "stavelse" : "stavelser"}`,
      "toast.copied": "Kopieret", "toast.saved": "Gemt i noter", "toast.removed": "Fjernet fra noter", "toast.noWord": "Skriv noget først",
    },
    en: {
      "tab.find": "Find", "tab.book": "Notes", "tab.settings": "Settings",
      "find.placeholder": "Word or line", "find.meaning": "Meaning", "find.more": "Show more", "find.recent": "Recent",
      "find.intro": "Type a Danish word, phrase or whole line, like \"kærlighed\" or \"os to\". A line rhymes on its last word. Rhymes are found on your phone from the pronunciation, so it's fast and works offline.",
      "find.loading": "Loading the dictionary…", "find.loadFail": "Couldn't load the dictionary. Check your connection and reload.",
      "band.all": "All", "band.perfect": "Perfect", "band.near": "Near",
      "find.none": "No rhymes found. Try another word or a shorter phrase.",
      "find.noneFilter": "No rhymes with that filter.",
      "find.count": (n) => `${num.format(n)} rhymes`,
      "find.syl": (n) => `${n} ${n === 1 ? "syllable" : "syllables"}`,
      "find.guessed": (w) => `pronunciation of "${w}" is a guess`,
      "find.depth": (d) => d === 1 ? "Rhymes on the last syllable" : `Rhymes on ${d} syllables`,
      "find.sylLabel": "Syllables", "find.sortLabel": "Sort",
      "find.sylGroup": (n) => n >= 4 ? "4+ syllables" : `${n} ${n === 1 ? "syllable" : "syllables"}`,
      "find.target": (w) => `rhymes on "${w}"`,
      "find.all": (n) => `Show all ${num.format(n)}`,
      "find.aiBusy": "AI is sorting…", "find.aiFail": "The AI didn't answer. Sorting by best rhyme.",
      "sort.best": "Best", "sort.syl": "Syllables", "sort.common": "Common", "sort.abc": "A–Z", "sort.ai": "AI",
      "book.title": "Notes", "book.pad": "Lyrics", "book.padPlaceholder": "Write your lyrics here. They're saved on this device.",
      "book.rhymeLast": "Rhyme the last word", "book.saved": "Saved words", "book.empty": "Tap a rhyme and choose \"Save to notes\" to keep it here.",
      "book.savedAt": "Saved", "book.remove": "Remove",
      "set.title": "Settings", "set.ui": "App language", "set.rhymes": "Rhymes", "set.soon": "soon",
      "set.same": "Show compounds with the same ending (like \"sommerhus\" for \"hus\")", "set.about": "About 99RIM",
      "set.aboutText": "99RIM finds rhymes by sound, not spelling. The dictionary has about 29,000 common Danish words with pronunciations from eSpeak NG. A few pronunciations may be wrong. AI sorting only reorders the rhymes the app found itself.",
      "ws.copy": "Copy", "ws.save": "Save to notes", "ws.unsave": "Remove from notes", "ws.search": "Find rhymes for this word", "ws.meaning": "Meaning (ordnet.dk)", "ws.close": "Close",
      "ws.info": (r) => `${r.score} / 100 · ${r.syl} ${r.syl === 1 ? "syllable" : "syllables"}`,
      "toast.copied": "Copied", "toast.saved": "Saved to notes", "toast.removed": "Removed from notes", "toast.noWord": "Type something first",
    },
  };
  const t = (k, ...a) => { const v = TEXT[state.ui][k] ?? TEXT.da[k]; return typeof v === "function" ? v(...a) : v; };
  function applyText() {
    document.documentElement.lang = state.ui;
    document.querySelectorAll("[data-t]").forEach((n) => { n.textContent = t(n.dataset.t); });
    document.querySelectorAll("[data-tp]").forEach((n) => { n.placeholder = t(n.dataset.tp); });
    $("version").textContent = `v${VERSION}`;
  }

  let toastT = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 1600);
  }

  // ---------- Tabs ----------
  const TABS = ["find", "book", "settings"];
  const tabBtns = [...document.querySelectorAll(".tabbar [data-tab]")];
  function go(tab) {
    if (!TABS.includes(tab)) tab = "find";
    const view = $("v-" + tab);
    if (state.tab === tab && !view.hidden) { view.scrollTo({ top: 0, behavior: "smooth" }); return; }
    state.tab = tab; persist();
    TABS.forEach((k) => { $("v-" + k).hidden = k !== tab; });
    tabBtns.forEach((b) => (b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
    if (tab === "book") renderBook();
    if (tab === "settings") renderSettings();
  }
  tabBtns.forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));

  // ---------- Dictionary ----------
  let dict = null;
  const ready = fetch("data/da.tsv")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((txt) => { dict = new Rim.Dict(txt); $("loading").hidden = true; })
    .catch(() => { $("loading").textContent = t("find.loadFail"); });

  // ---------- Find ----------
  const PAGE = 150;
  const SORTS = ["best", "syl", "common", "abc", "ai"];
  if (!SORTS.includes(state.sort) || (state.sort === "ai" && !AI.url)) state.sort = "best";
  const find = { input: "", res: null, band: "all", syl: 0, shown: PAGE, open: new Set(), ai: null, aiFor: "", aiBusy: false };
  const q = $("q");
  const collator = new Intl.Collator("da");
  let typeT = null;

  // A whole line rhymes on its end: the last word, or the last two when the last one is short ("os to").
  function rhymeTarget(text) {
    const words = text.split(" ");
    if (words.length <= 2) return text;
    const last = words[words.length - 1];
    return last.length <= 3 ? words.slice(-2).join(" ") : last;
  }

  function search(text, { keep = true } = {}) {
    text = Rim.normalize(text);
    // While typing, leave the field alone: normalizing would eat the space in "os to".
    if (keep) q.value = text;
    const url = new URL(location.href);
    text ? url.searchParams.set("q", text) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    if (!text) { find.input = ""; find.res = null; renderFind(); return; }
    ready.then(() => {
      if (!dict || Rim.normalize(q.value) !== text) return;
      find.input = text;
      find.res = dict.find(rhymeTarget(text), { limit: 5000 });
      find.syl = 0; find.shown = PAGE; find.open.clear();
      if (keep) remember(text);
      renderFind();
      if (keep && state.sort === "ai") aiSort();
    });
  }

  function remember(text) {
    if (!find.res || find.input !== text || !find.res.total) return;
    state.recent = [text, ...state.recent.filter((r) => r !== text)].slice(0, 12); persist();
  }

  const perfect = (r) => Rim.band(r.score) === "perfect";
  function visible() {
    if (!find.res) return [];
    return find.res.results.filter((r) =>
      (state.same || !r.same) &&
      (find.band === "all" || (find.band === "perfect") === perfect(r)) &&
      (!find.syl || (find.syl === 4 ? r.syl >= 4 : r.syl === find.syl)));
  }

  // Order the words, then cut them into labelled groups (or one unlabelled group).
  function arrange(list) {
    const l = list.slice();
    const by = state.sort;
    if (by === "syl") l.sort((a, b) => a.syl - b.syl || b.sort - a.sort);
    else if (by === "common") l.sort((a, b) => b.z - a.z);
    else if (by === "abc") l.sort((a, b) => collator.compare(a.word, b.word));
    else if (by === "ai" && find.ai && find.aiFor === find.input) {
      // AI's order first; words it left out keep their best-match order after them.
      const rank = new Map(find.ai.map((w, i) => [w, i]));
      l.sort((a, b) => (rank.get(a.word) ?? 1e9) - (rank.get(b.word) ?? 1e9));
    }
    return l;
  }
  function groupOf(r) {
    if (state.sort === "best") return r.depth;
    if (state.sort === "syl") return Math.min(4, r.syl);
    if (state.sort === "abc") return r.word[0];
    return "";
  }
  function groupTitle(k) {
    if (state.sort === "best") return t("find.depth", k);
    if (state.sort === "syl") return t("find.sylGroup", k);
    return k.toUpperCase();
  }

  const isSaved = (w) => state.saved.some((s) => s.w === w);
  const wordBtn = (r) =>
    `<button type="button" class="w${perfect(r) ? "" : " near"}${r.same ? " same" : ""}${isSaved(r.word) ? " saved" : ""}" data-w="${esc(r.word)}">${esc(r.word)}${perfect(r) ? "" : `<i>${r.score}</i>`}</button>`;

  function renderFind() {
    const res = find.res;
    const has = !!(res && find.input);
    $("find-empty").hidden = has;
    $("meta").hidden = $("filters").hidden = !has || !res.total;
    $("more").hidden = true;
    if (!has) { $("results").innerHTML = ""; renderRecent(); return; }
    if (!res.total) { $("results").innerHTML = `<p class="empty">${esc(t("find.none"))}</p>`; return; }

    const target = res.query !== find.input ? `${t("find.target", res.query)} · ` : "";
    const g = res.guessed.length ? ` · ${t("find.guessed", res.guessed.join(", "))}` : "";
    $("meta-ipa").textContent = `${target}/${res.ipa}/ · ${t("find.syl", res.syl)}${g}`;
    const all = res.results.filter((r) => state.same || !r.same);
    $("meta-count").textContent = t("find.count", all.length);
    $("meta-def").href = `https://ordnet.dk/ddo/ordbog?query=${encodeURIComponent(res.query.split(" ").pop())}`;

    // Syllable chips only for lengths that exist
    const lens = [...new Set(all.map((r) => Math.min(4, r.syl)))].sort();
    $("syl-chips").innerHTML = [0, ...lens].map((n) =>
      `<button type="button" class="chip" data-syl="${n}" aria-pressed="${find.syl === n}">${n ? (n === 4 ? "4+" : n) : esc(t("band.all"))}</button>`).join("");
    document.querySelectorAll("#sort-chips [data-sort]").forEach((c) => {
      c.setAttribute("aria-pressed", c.dataset.sort === state.sort);
      if (c.dataset.sort === "ai") c.hidden = !AI.url;
    });

    const list = visible();
    if (!list.length) { $("results").innerHTML = `<p class="empty">${esc(t("find.noneFilter"))}</p>`; return; }
    const busy = find.aiBusy ? `<p class="busy"><span class="spinner"></span>${esc(t("find.aiBusy"))}</p>` : "";
    const sorted = arrange(list);
    if (!["best", "syl", "abc"].includes(state.sort)) {
      // One list: page through it.
      $("results").innerHTML = busy + `<div class="words">${sorted.slice(0, find.shown).map(wordBtn).join("")}</div>`;
      $("more").hidden = list.length <= find.shown;
      return;
    }
    // Groups: each shows its first words and can be opened in full, so a big group never hides the next.
    const groups = new Map();
    for (const r of sorted) { const k = groupOf(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    const keys = [...groups.keys()];
    if (state.sort === "best") keys.sort((a, b) => b - a);
    const cap = state.sort === "abc" ? 24 : 60;
    $("results").innerHTML = busy + keys.map((k) => {
      const g = groups.get(k), open = find.open.has(String(k));
      return `
      <section class="group">
        <h3 class="sec-title">${esc(groupTitle(k))} <span>${g.length}</span></h3>
        <div class="words">${(open ? g : g.slice(0, cap)).map(wordBtn).join("")}</div>
        ${!open && g.length > cap ? `<button type="button" class="link" data-open="${esc(k)}">${esc(t("find.all", g.length))}</button>` : ""}
      </section>`;
    }).join("");
  }

  // AI sort: Claude orders the rhymes the app found by how good they are to write with.
  async function aiSort() {
    const res = find.res, key = find.input;
    if (!res || !res.total || !AI.url || find.aiBusy || (find.aiFor === key && find.ai)) return renderFind();
    find.aiBusy = true; renderFind();
    try {
      const r = await fetch(AI.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: AI.anonKey, Authorization: `Bearer ${AI.anonKey}` },
        body: JSON.stringify({ text: key, lang: "da", candidates: res.results.filter((x) => !x.same).slice(0, 150).map((x) => x.word) }),
      });
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      find.ai = data.words; find.aiFor = key;
    } catch {
      toast(t("find.aiFail"));
      if (find.input === key) { state.sort = "best"; persist(); }
    } finally {
      find.aiBusy = false;
      renderFind();
      if (state.sort === "ai" && find.input !== key) aiSort(); // the search changed while we waited
    }
  }

  function renderRecent() {
    $("recent-wrap").hidden = !state.recent.length;
    $("recent").innerHTML = state.recent.map((r) => `<button type="button" class="chip word" data-q="${esc(r)}">${esc(r)}</button>`).join("");
  }

  q.addEventListener("input", () => { clearTimeout(typeT); typeT = setTimeout(() => search(q.value, { keep: false }), 160); });
  $("search-form").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(typeT); search(q.value); q.blur(); });
  q.addEventListener("blur", () => remember(Rim.normalize(q.value)));
  document.querySelectorAll('input[name="band"]').forEach((r) => r.addEventListener("change", () => { find.band = r.value; find.shown = PAGE; find.open.clear(); renderFind(); }));
  $("syl-chips").addEventListener("click", (e) => { const c = e.target.closest("[data-syl]"); if (c) { find.syl = +c.dataset.syl; find.shown = PAGE; find.open.clear(); renderFind(); } });
  $("sort-chips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-sort]");
    if (!c) return;
    state.sort = c.dataset.sort; persist(); find.shown = PAGE; find.open.clear();
    state.sort === "ai" ? aiSort() : renderFind();
  });
  $("more").addEventListener("click", () => { find.shown += PAGE; renderFind(); });
  $("results").addEventListener("click", (e) => { const o = e.target.closest("[data-open]"); if (o) { find.open.add(o.dataset.open); renderFind(); } });
  $("recent").addEventListener("click", (e) => { const c = e.target.closest("[data-q]"); if (c) search(c.dataset.q); });

  // ---------- Word actions ----------
  let current = null;
  function openWord(word, from) {
    const r = find.res && find.res.results.find((x) => x.word === word);
    current = { word, from: from || (find.res && find.res.query) || "" };
    $("ws-word").textContent = word;
    $("ws-info").textContent = r ? t("ws.info", r) : "";
    $("ws-save").textContent = t(isSaved(word) ? "ws.unsave" : "ws.save");
    $("ws-def").href = `https://ordnet.dk/ddo/ordbog?query=${encodeURIComponent(word.split(" ").pop())}`;
    $("word-sheet").hidden = false;
    $("word-sheet").querySelector(".ws-btn").focus();
  }
  const closeWord = () => { $("word-sheet").hidden = true; };
  document.addEventListener("click", (e) => {
    const w = e.target.closest(".w[data-w]");
    if (w) openWord(w.dataset.w, w.dataset.from);
  });
  $("word-sheet").addEventListener("click", async (e) => {
    if (e.target === $("word-sheet")) return closeWord();
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act || !current) return;
    if (act === "copy") {
      try { await navigator.clipboard.writeText(current.word); toast(t("toast.copied")); } catch { toast(current.word); }
    } else if (act === "save") {
      if (isSaved(current.word)) { state.saved = state.saved.filter((s) => s.w !== current.word); toast(t("toast.removed")); }
      else { state.saved.unshift({ w: current.word, from: current.from, at: Date.now() }); toast(t("toast.saved")); }
      persist(); renderFind(); renderBook();
    } else if (act === "search") {
      go("find"); search(current.word);
    }
    closeWord();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeWord();
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); go("find"); q.focus(); q.select(); }
  });

  // ---------- Notebook ----------
  const pad = $("pad");
  pad.value = state.pad;
  pad.addEventListener("input", () => { state.pad = pad.value; persist(); });
  $("pad-rhyme").addEventListener("click", () => {
    const words = Rim.normalize(pad.value).split(" ").filter(Boolean);
    if (!words.length) return toast(t("toast.noWord"));
    go("find"); search(words[words.length - 1]);
  });
  function renderBook() {
    if (!state.saved.length) { $("saved").innerHTML = `<p class="empty">${esc(t("book.empty"))}</p>`; return; }
    const groups = new Map();
    for (const s of state.saved) { const k = s.from || "–"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    $("saved").innerHTML = [...groups].map(([from, list]) => `
      <div class="saved-row">
        <div><div class="from">${esc(from)}</div><div class="words">${list.map((s) => `<button type="button" class="w" data-w="${esc(s.w)}" data-from="${esc(s.from)}">${esc(s.w)}</button>`).join("")}</div></div>
        <button type="button" class="x" data-rm="${esc(from)}">${esc(t("book.remove"))}</button>
      </div>`).join("");
  }
  $("saved").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (!rm) return;
    state.saved = state.saved.filter((s) => (s.from || "–") !== rm.dataset.rm);
    persist(); renderBook(); renderFind();
  });

  // ---------- Settings ----------
  function renderSettings() {
    $("ui-" + state.ui).checked = true;
    $("opt-same").checked = state.same;
  }
  document.querySelectorAll('input[name="ui"]').forEach((r) => r.addEventListener("change", () => {
    state.ui = r.value; persist(); applyText(); renderFind(); renderBook();
  }));
  $("opt-same").addEventListener("change", (e) => { state.same = e.target.checked; persist(); renderFind(); });

  // ---------- Start ----------
  applyText();
  const startQ = new URL(location.href).searchParams.get("q");
  go(startQ ? "find" : state.tab);
  renderFind();
  if (startQ) search(startQ);
  else if (state.tab === "find" && desktop) q.focus();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
