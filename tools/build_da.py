"""Build data/da.tsv, the Danish word list 99RIM searches.

Input: dictionary.json from the old Cadence project (word, eSpeak NG IPA, zipf frequency).
Output: one line per word, "word<TAB>ipa<TAB>zipf", most common words first.

The IPA keeps stress marks (ˈ ˌ) and drops what the rhyme engine ignores anyway:
stød, zero-width joiners, length marks and eSpeak's language-switch tags.

Run: python3 tools/build_da.py path/to/dictionary.json
"""
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "da.tsv"
WORD = re.compile(r"^[a-zæøå]+(?:-[a-zæøå]+)?$")


def clean(ipa: str) -> str:
    ipa = ipa.replace("‍", "")      # zero-width joiner
    ipa = re.sub(r"[ʔ?]", "", ipa)       # stød
    ipa = ipa.replace("ː", "")           # length
    ipa = ipa.replace("ε", "ɛ")          # eSpeak writes the same vowel two ways
    return ipa.strip()


def main(src: str) -> None:
    entries = json.loads(Path(src).read_text(encoding="utf-8"))
    seen, rows = set(), []
    for e in entries:
        w, ipa = e["word"].strip().lower(), e["phonemes"]
        # "(en)" marks a word eSpeak read as English: its Danish IPA is unreliable.
        if not WORD.match(w) or "(" in ipa or w in seen:
            continue
        if len(w) == 1 and w not in ("å", "ø", "ö"):
            continue
        ipa = clean(ipa)
        if not ipa:
            continue
        seen.add(w)
        rows.append((float(e["zipf"]), w, ipa))
    rows.sort(key=lambda r: (-r[0], r[1]))
    OUT.write_text("".join(f"{w}\t{ipa}\t{z:.2f}\n" for z, w, ipa in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} words to {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
