# Fonts

Self-hosted so the game needs no third-party font service (privacy, school networks,
strict Content-Security-Policies). Latin subsets of the variable fonts, as served by
Google Fonts; each file covers every weight.

| File | Family | License |
|---|---|---|
| `cinzel-latin.woff2` | Cinzel (titles) | SIL Open Font License 1.1 — `OFL-Cinzel.txt` |
| `inter-latin.woff2` | Inter (text) | SIL Open Font License 1.1 — `OFL-Inter.txt` |
| `jetbrains-mono-latin.woff2` | JetBrains Mono (code) | SIL Open Font License 1.1 — `OFL-JetBrainsMono.txt` |

Loaded by `css/fonts.css`. Characters outside the Latin subset fall back to system fonts.
