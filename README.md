# The World in One Day — 17 November 2026

[![make.fun · news-image-20261117](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)
[![rank](https://make.fun/badge/news-image-20261117/cuanhij/news-image-20261117/rank.svg)](https://make.fun/bounty/news-image-20261117/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)
[![reward](https://make.fun/badge/news-image-20261117/cuanhij/news-image-20261117/reward.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)

A one-image summary of the world's news on Tuesday, 17 November 2026,
drawn entirely from code as a newspaper front page: a masthead with the
date, six stories with headlines, short summaries and simple geometric
icons — the Kerch Bridge strike, tankers hit near Hormuz, Trump in Asia
and the Xi–Trump–Putin summit, the EU states' Rwanda return hub, the
JPMorgan outage, and the Vulcan rocket failure.

## How it works

`main.ts` (Node 22, standard library only, no network) draws a 1024x1024
image pixel by pixel: a 5x7 bitmap font defined in the code, layout and
icons drawn with rectangles, lines, circles and triangles, and a PNG
encoder written from scratch (DEFLATE via `node:zlib` plus a hand-written
CRC32). The program is deterministic — two runs write byte-identical
files.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).
