# 99RIM

Danish rhyme finder, plain HTML/CSS/JS with no build step. See README.md.

## Where changes go

- Every change goes to prod first: the `main` branch of `rodriguez594/99rim-prod`, served at https://prod.99rim.dk.
- Only when the user says "deploy", copy prod to live: the `main` branch of `rodriguez594/99rim` (this repo), served at https://99rim.dk.
- Each repo keeps its own `CNAME` file (`prod.99rim.dk` vs `99rim.dk`). Never copy `CNAME` between them.
- When a deploy changes app files, bump `CACHE` in `sw.js` so phones pick up the new version.
