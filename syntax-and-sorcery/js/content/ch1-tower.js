/*
 * Chapter 1 — The Apprentice's Tower (easy)
 * Concepts: print, strings, variables, numbers & arithmetic, f-strings, input(), type conversion.
 */
(function () {
  "use strict";
  var py = SS.py;

  SS.defineChapter({
    id: "tower",
    order: 1,
    title: "The Apprentice's Tower",
    subtitle: "First words of power",
    icon: "🗼",
    concepts: ["print()", "strings", "variables", "arithmetic", "f-strings", "input()"],
    intro: [
      "Welcome to the Apprentice's Tower, the oldest part of Coilspire Academy. Every wizard who ever lived here began on this staircase, learning to speak in Python — the tongue that magic understands.",
      "Speak clearly and precisely: Python does exactly what you say, nothing more and nothing less."
    ],
    outro: [
      "The tower's lanterns blaze to life, one floor after another. You can make words appear, remember things in variables, do arithmetic and even listen to visitors.",
      "But listen — a clatter echoes from the Hall of Forking Paths. Glitch has been meddling with the doors…"
    ],
    challenges: [
      {
        id: "tower-first-words",
        title: "The First Words",
        difficulty: "easy",
        concepts: ["print()", "strings"],
        story: [
          "Every spell begins with words. Archmage Ada hands you a blank page of enchanted parchment.",
          "\"Speak the first words every apprentice learns,\" she says, \"and watch them appear.\""
        ],
        task: [
          "Cast a spell that makes the words **Hello world** appear on the page.",
          { output: "Hello world" }
        ],
        lesson: [
          "In Python, `print()` makes words appear. Whatever you put between the parentheses is shown in the scrying pool below your spell.",
          "Text must be wrapped in quotes so Python knows it's text and not a command. Text in quotes is called a **string**.",
          { code: py`
            print("Greetings, traveller")
            print("Magic is just precise instructions")
          `, output: "Greetings, traveller\nMagic is just precise instructions" },
          { tip: "Capital letters, spaces and punctuation all matter. Python is very literal!" }
        ],
        starter: py`
          # Make the words Hello world appear on the page.
          # Write your spell on the line below, then press "Cast Spell".

        `,
        hints: [
          "You need the `print()` spell, with your words between the parentheses.",
          "Text needs quotes around it, like `\"some words\"`.",
          "Try exactly: `print(\"Hello world\")`"
        ],
        solution: py`
          print("Hello world")
        `,
        altSolutions: [
          py`print('Hello world')`,
          py`
            words = "Hello world"
            print(words)
          `
        ],
        wrongSolutions: [
          py`print("hello world")`,
          py`print("Hello, world!")`,
          py`"Hello world"`
        ],
        tests: py`
          @test("The words appear on the page")
          def _():
              expect(output.strip() != "", "Nothing appeared! Use print() to make words show up.")

          @test("They say exactly: Hello world")
          def _():
              expect_output("Hello world")
        `,
        scene: { icon: "📜", successIcon: "✨", successText: "Glowing letters blossom across the parchment!", effect: "manifest" }
      }
    ]
  });
})();
