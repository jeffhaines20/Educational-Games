# Fonts

Self-hosted so the game needs no third-party font service (privacy, school networks,
`file://` and LMS frames, strict Content-Security-Policies). Latin subsets, as served by
Google Fonts / Fontsource. Loaded by `css/fonts.css`; characters outside the Latin subset
fall back to system fonts.

| File | Family | Used for | Licence |
|---|---|---|---|
| `special-elite-latin.woff2` | Special Elite (Astigmatic) | typewriter headings, stamps, folder tabs | Apache License 2.0 — `LICENSE-SpecialElite-Apache-2.0.txt` |
| `inter-latin.woff2` | Inter (variable, 100–900) | body text | SIL Open Font License 1.1 — `OFL-Inter.txt` |
| `jetbrains-mono-latin.woff2` | JetBrains Mono (variable, 100–800) | vital signs, lab values, numbers | SIL Open Font License 1.1 — `OFL-JetBrainsMono.txt` |

Sources: Special Elite from the `@fontsource/special-elite` npm package (5.2.5, file
`special-elite-latin-400-normal.woff2`; the font's own name table states "Available under the
Apache 2.0 licence"); Inter and JetBrains Mono as in `../pyromancer/assets/fonts/`.
