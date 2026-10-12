# 99RIM

Danish rhyme finder. Type a word, a phrase or a whole line and get perfect rhymes, near rhymes and multi-syllable rhymes, found from pronunciation rather than spelling. Sort them by best match, syllables, how common they are, A–Å, or (once it's switched on) AI.

Part of 99, same look as 99MS.

- No build step: `index.html`, `styles.css`, `app.js`.
- `rhyme.js` is the rhyme engine (ported from the old Cadence project). It runs in the browser, so searching is instant and works offline.
- `data/da.tsv` is the word list: about 28,700 common Danish words with IPA from eSpeak NG, a frequency score, and an `n` flag on names and places. Abbreviations and roman numerals are left out. Rebuild it with `pip install spylls` and `python3 tools/build_da.py path/to/cadence/data/dictionary.json path/to/da_DK` (the Danish Hunspell dictionary from Stavekontrolden.dk, used to spot names).
- `tests/rhymes.tsv` lists word pairs and what should happen to them. Run `node tools/test_rhymes.js` after any change to the engine or the word list.
- `sw.js` and `manifest.webmanifest` make it installable on a phone and usable offline.
- Your saved words and lyrics stay in the browser (localStorage). There is no login yet.

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Hosting

| | Address | Repo | Updates |
|---|---|---|---|
| Prod (changes land here first) | https://prod.99rim.dk | `rodriguez594/99rim-prod` | every change |
| Live | https://99rim.dk | `rodriguez594/99rim` (this repo) | only on "deploy" |

Both are GitHub Pages from the `main` branch, root folder. The `CNAME` file sets each repo's domain, so it differs between the two repos: never copy it across. The prod site shows a yellow PROD badge and isn't indexed by search engines.

DNS for 99rim.dk:
- `A` records for `99rim.dk` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- `CNAME` `www` → `rodriguez594.github.io`
- `CNAME` `prod` → `rodriguez594.github.io`

Then in each repo, Settings → Pages: source "Deploy from a branch", `main`, `/ (root)`; check the custom domain; tick "Enforce HTTPS" once GitHub has issued the certificate.

## AI sort

The app finds the rhymes itself. The AI sort option only reorders them (best words to write with first), so it can't add words that don't rhyme. It runs as a Supabase Edge Function so the API key never reaches the browser.

1. Create a Supabase project (or use the 99MS one).
2. `supabase functions deploy rim-ai --no-verify-jwt`
3. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
4. Optional: `supabase secrets set ALLOWED_ORIGIN=https://your-domain` so only the app can call it.
5. In `app.js`, set `AI.url` to `https://<project>.supabase.co/functions/v1/rim-ai` and `AI.anonKey` to the project's anon key.

Until `AI.url` is set, the AI sort option is hidden.

The function uses `claude-opus-5-5` at low effort. Set the `RIM_MODEL` secret to use a different model. Each request costs money, and the function only has a simple per-IP limit (20 per minute), so watch usage once it's public.
