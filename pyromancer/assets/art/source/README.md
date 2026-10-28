# Painted artwork: source images

Put the original paintings here, named after their slot (`location-tower.png`,
`portrait-pip.jpg`, …), then run `python3 tools/art.py` from the `pyromancer` folder, or ask
Claude to process them. The game uses the cropped and compressed copies the tool writes to
`assets/art/`. See [docs/ART-PROMPTS.md](../../../docs/ART-PROMPTS.md) for the slot list, the
prompts and the steps.

An optional `focus.json` here moves a crop's centre, for example
`{ "location-tower": [0.5, 0.35] }`.

## Credits

Record where each picture came from, so the game's credits stay accurate:

| Slot | Made with | Date | Notes |
|---|---|---|---|
| | | | |
