# Pyromancer art prompt pack

The game is complete with its icon set. Paintings are an optional upgrade. Each painting you
add replaces an icon in a few places, and you can add them **one at a time, in any order**.
A slot without a painting keeps its icon, so a half-finished set still looks deliberate.

This page lists the 13 paintings the game has room for, what each should show, and how to
add them. The prompts are written to match the title painting:
`assets/source/Pyromancer_ Python Magic at Midnight.png`.

---

## What to make

| File name | Shape | Where it appears | Priority |
|---|---|---|---|
| `location-tower` | landscape 3:2 | Chapter 1's map medallion, its chapter banner, and the backdrop behind its challenges | ★ first |
| `location-hall` | landscape 3:2 | the same, for chapter 2 | ★ first |
| `location-circle` | landscape 3:2 | the same, for chapter 3 | ★ first |
| `location-library` | landscape 3:2 | the same, for chapter 4 | ★ first |
| `location-workshop` | landscape 3:2 | the same, for chapter 5 | ★ first |
| `location-labyrinth` | landscape 3:2 | the same, for chapter 6 | ★ first |
| `location-hydra` | landscape 3:2 | the same, for chapter 7 | ★ first |
| `portrait-ada` | square | wherever Archmage Ada speaks: story scenes and lessons | second |
| `portrait-pip` | square | Pip's hints and story scenes | second |
| `portrait-glitch` | square | story scenes | second |
| `portrait-hydra` | square | story scenes in the last chapter and the ending | second |
| `map` | wide 16:9 | the background of the academy map | optional |
| `ending` | landscape 3:2 | the epilogue and the certificate | optional |

The seven **locations** make the biggest difference: each one appears on the map, at the top
of its chapter and behind every challenge in that chapter. Start with those.

**Sizes.** Bigger is fine, because the tool shrinks and crops for you. Aim for at least
1200×800 for locations and the ending, 640×640 for portraits, and 1600×900 for the map.
ChatGPT's *landscape* (1536×1024) and *square* (1024×1024) sizes work for everything. The map
can be landscape too: it is cropped to 1536×864, which is fine.

---

## Step 1 — set the style

Use an image tool that accepts a **reference image**. ChatGPT, Gemini, Adobe Firefly ("style
reference") and Midjourney (`--sref`) all do. Upload the title painting as the reference.
Make two to four versions of each picture and keep the best one.

**In a chat tool (ChatGPT, Gemini):** start a new conversation, attach the title painting,
and send this first:

```text
I'm making artwork for an educational fantasy game called Pyromancer. I've attached its
title painting. For every image I ask for in this conversation, match that painting's
style, colours and lighting exactly, but don't copy its layout, its text or its logo.
Style: dark fantasy digital oil painting, rich painterly brushwork, cinematic lighting.
Deep midnight-blue and indigo shadows lit by warm ember-orange and gold magical light,
candlelight and drifting glowing embers. Family-friendly and suitable for school
students: wondrous, never gory or frightening. Absolutely no text, letters, numbers,
logos, watermarks, signatures or borders anywhere in the image.
Wait for me to describe each image.
```

Then paste one prompt from below at a time and say which shape you want ("landscape" or
"square").

**In a tool without memory (Midjourney, Firefly, Stable Diffusion):** paste the *style
block* after every prompt:

```text
Dark fantasy digital oil painting, rich painterly brushwork, cinematic lighting. Deep
midnight-blue and indigo shadows lit by warm ember-orange and gold magical light,
candlelight and drifting glowing embers. Family-friendly, wondrous, not frightening.
No text, letters, numbers, logos, watermarks, signatures or borders.
```

If the tool has a separate "negative prompt" box, use:
`text, letters, words, writing, numbers, logo, watermark, signature, border, frame, blurry,
extra fingers, deformed hands, gore, blood, skulls, pentagram, horror`.
In Midjourney, add `--ar 3:2` (locations and ending), `--ar 1:1` (portraits) or `--ar 16:9`
(map).

### How the game uses the pictures

* **Keep the subject in the middle.** The game shows each location three ways: a circle cut
  from the centre (the map medallion), a wide strip through the middle (the chapter banner)
  and a dimmed backdrop behind the challenge. Keep everything important in the central area
  and let the edges be sky, mist or shadow. The prompts below already ask for this.
* **Keep it medium-dark.** Text and spell effects are drawn on top of the locations.
* **Portraits are shown small, inside a circle.** Frame the head and shoulders, put the face in
  the middle (slightly above centre) and use a plain dark background. Leave hands out of
  shot, because image tools often draw them badly.
* **Leave the player out of the locations.** The student is the hero, so no apprentice's face
  should appear in a location. The ending shows the apprentice small and from behind, so
  every student can picture themselves there.
* **Keep each character consistent.** The character descriptions in the prompts are repeated
  word for word, so leave them as they are. When a portrait comes out well, attach it as a
  second reference whenever that character appears again (for example in the ending).

---

## Step 2 — the prompts

### Locations (landscape 3:2)

**`location-tower` — The Apprentice's Tower** (chapter 1: first words of power)

```text
The Apprentice's Tower of Coilspire Academy at night: a tall, ancient stone tower that
spirals up into the clouds like a sleeping serpent, with lantern-lit windows on each of
its seven floors and a winding outer staircase. On its very top stands a standing stone
carved with softly glowing runes. Full moon, drifting clouds, the rest of the gothic
academy in silhouette far below. The tower stands in the centre of the picture, with
sky and mist all around it.
```

**`location-hall` — The Hall of Forking Paths** (chapter 2: choices and repetition)

```text
The Hall of Forking Paths: a vast gothic hall seen from its entrance. Its stone floor
leads to a corridor that splits in two, and each branch splits in two again, with
arched doorways and staircases climbing up and winding down. Candles in iron sconces
line the walls, a small round stone wishing well stands in the foreground, and at the
far end a huge iron-bound gate glows faintly. Symmetrical composition, with the forking
paths in the centre of the picture.
```

**`location-circle` — The Summoning Circle** (chapter 3: spells bound to names)

```text
The Summoning Circle: a round, quiet stone chamber lit by dozens of candles. On the
floor, a great circle of concentric chalk rings and abstract golden runes glows softly,
and small friendly spirits like wisps of warm light float above it. On the far wall
stands a tall ornate mirror showing an endless corridor of reflections, and an hourglass
rests on a stone plinth. Calm and wondrous, not spooky. Plain rings and runes only: no
pentagrams or star symbols. The glowing circle is in the centre of the picture.
```

**`location-library` — The Library of Infinite Shelves** (chapter 4: lists, dictionaries and sets)

```text
The Library of Infinite Shelves: towering dark-wood bookshelves that rise into shadow and
curve away forever, with spiral staircases, rolling ladders and a thousand small reading
lamps glowing gold. Loose pages and a few books flutter through the air like birds. In
the centre foreground, a reading desk holds a single open book giving off a soft golden
glow. The book spines are plain, with no lettering.
```

**`location-workshop` — The Golem Workshop** (chapter 5: classes and objects)

```text
The Golem Workshop: a high-ceilinged stone workshop where rows of clay and stone golems
stand quietly at attention, friendly rather than menacing, with gently glowing eyes.
Workbenches are covered in rolled-up blueprints, brass tools and gears, and a forge
glows bright orange at the back. A trail of tiny clay footprints crosses the floor
towards a wooden trapdoor. The nearest golem stands in the centre of the picture, warm
firelight against blue shadows.
```

**`location-labyrinth` — The Labyrinth of Echoes** (chapter 6: data structures and algorithms)

```text
The Labyrinth of Echoes: an underground maze of ancient stone tunnels, lit by a single
brass lantern standing on the floor in the centre of the picture. Passages branch away
in every direction and fade into blue mist; a spiral stair descends from above, faint
glowing arrows are chalked on the walls, and a shallow stream reflects the lantern
light. Mysterious and inviting rather than scary.
```

**`location-hydra` — The Hydra's Lair** (chapter 7: dynamic programming)

```text
The Hydra's Lair: a vast cavern deep underground with stalagmites and glittering blue
crystals. In the foreground, a towering stone door carved with seven serpent heads stands
half open. Beyond it, in the centre of the picture, the huge silhouette of a seven-headed
Hydra lies coiled on a hill of old scrolls, its ember-orange eyes glowing in the dark.
Dramatic and awe-inspiring but not frightening: no blood, bones or skulls.
```

### Portraits (square)

**`portrait-ada` — Archmage Ada**, headmistress of Coilspire Academy and the player's mentor.
She should look clearly older than the young witch in the title painting, who can stand for the
player.

```text
Head-and-shoulders portrait of Archmage Ada, the kind but formidable headmistress of a
magic academy: a woman in her sixties with silver hair in a long braid, small round gold
spectacles, warm eyes and a knowing half-smile. She wears deep-navy velvet robes
embroidered with gold and a wide-brimmed pointed navy hat with a brass band. The top of a
dark-wood staff with a glowing ember crystal rises beside her shoulder. Her face is in the
centre, looking at the viewer. Plain dark-blue background, soft warm rim light, a few
drifting embers.
```

**`portrait-pip` — Pip**, the player's owl familiar, who gives the hints.

```text
Portrait of Pip, a small, round barn owl familiar with cream and golden-brown feathers, a
heart-shaped white face, big dark friendly eyes and a curious tilt of the head, perched on
a stack of old leather-bound books. A tiny rolled scroll is tied to one leg with red
string. Cute and appealing, but painted realistically rather than as a cartoon. Warm
candlelight from one side, plain deep-blue background, the owl in the centre filling most
of the picture.
```

**`portrait-glitch` — Glitch**, a mischievous gremlin who scrambles spells (and, in the end,
becomes the academy's first spell-tester).

```text
Portrait of Glitch, a mischievous gremlin about the size of a cat: big pointed ears,
mottled slate-grey skin, bright teal eyes and a wide cheeky grin with one crooked tooth,
its hands dusted with clay. Three tiny glowing beetles crawl over its shoulders. Comical
and lovable rather than scary, like a troublemaking house spirit. Its face is in the
centre. Plain dark-blue background, warm candlelight from below, a few ember sparks.
```

**`portrait-hydra` — The Hydra of Overlapping Subproblems**, the final challenge. Several of its
heads look exactly alike, a joke about *overlapping subproblems*.

```text
Portrait of the Hydra of Overlapping Subproblems: an enormous seven-headed serpent-dragon
with midnight-blue scales edged in gold and ember-orange eyes. One head is close to the
viewer in the centre of the picture, looking down with a sly, sleepy expression; the
other heads curve behind it in soft focus, several of them exactly alike. Majestic and a
little comical rather than terrifying: no blood or wounds. Dark cavern background,
ember light glowing from below.
```

### Extras

**`map` — Coilspire Academy** (wide 16:9). The game draws the chapter path on top, so keep
the picture calm, with no strong focal point in the middle.

```text
A wide aerial view of Coilspire Academy at night: a spiralling stone tower rising above
the clouds on a rocky crag, gothic halls and courtyards around its foot, a great domed
library, a workshop with glowing forge chimneys, and dark cave mouths leading down into
the mountain below. Lantern-lit paths wind between the buildings. Quiet, dark and
atmospheric, darker towards the edges, with no labels, writing or map symbols.
```

**`ending` — The ceremony** (landscape 3:2), shown when the game is finished. Attach your Ada,
Pip, Glitch and Hydra portraits as extra references if your tool allows it.

```text
A joyful celebration on the moonlit roof of the Apprentice's Tower: the whole academy has
gathered under bursts of golden ember fireworks. Archmage Ada, a silver-haired older
witch with round gold spectacles and deep-navy robes, raises her glowing staff; Pip, a
small barn owl, flies overhead; Glitch, a little grey gremlin with big ears, cheers.
Far below, an enormous seven-headed Hydra sleeps peacefully, coiled around the foot of
the tower. A young apprentice in a navy robe, seen small and from behind, stands in the
centre of the picture. Warm and triumphant.
```

---

## Step 3 — check each picture

Before you keep a picture, check it:

- [ ] There is **no writing anywhere**, real or fake. Look closely at books, scrolls, signs and
      banners. Image tools like to add squiggly pseudo-text.
- [ ] The main subject sits in the middle, with nothing important near the edges.
- [ ] It matches the title painting: blue shadows, ember and gold light, night-time.
- [ ] Hands, faces and eyes look right, or are out of shot.
- [ ] Recurring characters look like themselves. For example, Ada in the ending should look like
      her portrait.
- [ ] Nothing is gory or frightening, and there are no pentagrams or other occult symbols, since
      the game is used in schools.
- [ ] There are no logos. The title painting's Python logo shouldn't be copied into new pictures.

---

## Step 4 — add the pictures to the game

1. Save each picture as PNG, JPG or WebP, named after its slot, for example
   `location-tower.png` or `portrait-pip.jpg`.
2. Put the files in **`pyromancer/assets/art/source/`**. On GitHub, open that folder on your
   branch, choose **Add file → Upload files**, and commit.
3. Then either:
   * **ask Claude** to "process the new art". It crops, compresses, checks the result on screen and
   rebuilds the ready-made bundles; or
   * do it yourself (needs Python 3 and Pillow, `python3 -m pip install pillow`):

     ```bash
     cd pyromancer
     python3 tools/art.py          # crops and compresses into assets/art/*.webp
     python3 tools/build.py        # refreshes dist/pyromancer.html and the SCORM zip
     ```

     and commit the changes.

`python3 tools/art.py --check` lists which slots are filled.

**If a crop cuts off something important,** add `assets/art/source/focus.json`, giving the point
to centre the crop on (x and y as fractions of the width and height), and run the tool again:

```json
{ "location-tower": [0.5, 0.35], "portrait-ada": [0.45, 0.4] }
```

**To replace a picture,** upload a new file with the same name and run the tool again. **To
remove one,** delete both `assets/art/source/<slot>.*` and `assets/art/<slot>.webp`, then run
the tool again. The tool keeps finished pictures whose source has been removed. That means
you can keep the large originals out of the repository if you like.

**File size.** Each finished painting is about 80–160 KB, so a full set adds about 1.6 MB.
The single-file bundle (`dist/pyromancer.html`) grows by about 2 MB, because pictures are
stored inside it as text. The online version loads each painting only when it is first
shown.

---

## Using the images responsibly

* Check that your image tool's terms let you use and share its pictures in an educational
  game. Most do, but some free plans restrict use.
* Keep the art original. Don't name living artists or existing franchises in prompts (for
  example "Hogwarts" or "in the style of …").
* Record which tool you used, and when, in `assets/art/source/README.md`, so the credits stay
  accurate.
