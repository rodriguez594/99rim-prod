"""Build data/da.tsv, the Danish word list 99RIM searches.

Inputs:
- dictionary.json from the old Cadence project (word, eSpeak NG IPA, zipf frequency)
- da_DK.dic + da_DK.aff, the Danish Hunspell dictionary from Stavekontrolden.dk
  (https://github.com/LibreOffice/dictionaries/tree/master/da_DK), used to spot names.
  Needs spylls (pip install spylls) to read it.

Output: one line per word, "word<TAB>ipa<TAB>zipf<TAB>flags", most common words first.
flags is "n" for a name or place, otherwise empty.

The IPA keeps stress marks (ˈ ˌ) and drops what the rhyme engine ignores anyway:
stød, zero-width joiners, length marks and eSpeak's language-switch tags.

Run: python3 tools/build_da.py path/to/dictionary.json path/to/da_DK   (no extension)
"""
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "da.tsv"
WORD = re.compile(r"^[a-zæøå]+(?:-[a-zæøå]+)?$")
VOWEL = re.compile(r"[aeiouyæøå]")
ROMAN = re.compile(r"^(?:x{0,3})(?:ix|iv|v?i{0,3})$")


def clean(ipa: str) -> str:
    ipa = ipa.replace("‍", "")      # zero-width joiner
    ipa = re.sub(r"[ʔ?]", "", ipa)       # stød
    ipa = ipa.replace("ː", "")           # length
    ipa = ipa.replace("ε", "ɛ")          # eSpeak writes the same vowel two ways
    return ipa.strip()


def junk(w: str) -> bool:
    """Abbreviations (km, tv, pdf, hmm) have no vowel; roman numerals aren't words. "vi" is."""
    if len(w) == 1 and w not in ("å", "ø"):
        return True
    if not VOWEL.search(w):
        return True
    return w != "vi" and bool(ROMAN.match(w))


def is_name(speller, w: str) -> bool:
    """The spell checker accepts it with a capital letter only: Rasmus, Aarhus. "sol" is also fine lowercase."""
    return speller.lookup(w.capitalize()) and not speller.lookup(w)


def main(src: str, dic: str) -> None:
    from spylls.hunspell import Dictionary
    speller = Dictionary.from_files(dic)
    entries = json.loads(Path(src).read_text(encoding="utf-8"))
    seen, rows, dropped = set(), [], 0
    for e in entries:
        w, ipa = e["word"].strip().lower(), e["phonemes"]
        # "(en)" marks a word eSpeak read as English: its Danish IPA is unreliable.
        if not WORD.match(w) or "(" in ipa or w in seen:
            continue
        if junk(w):
            dropped += 1
            continue
        ipa = clean(ipa)
        if not ipa:
            continue
        seen.add(w)
        rows.append((float(e["zipf"]), w, ipa, "n" if is_name(speller, w) else ""))
    rows.sort(key=lambda r: (-r[0], r[1]))
    OUT.write_text("".join(f"{w}\t{ipa}\t{z:.2f}\t{f}\n" for z, w, ipa, f in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} words to {OUT} ({dropped} junk words dropped, {sum(1 for r in rows if r[3])} names)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
