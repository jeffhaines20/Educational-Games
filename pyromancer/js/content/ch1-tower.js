/*
 * Chapter 1 — The Apprentice's Tower (easy)
 * Concepts: print, strings, comments, numbers & arithmetic, variables, f-strings,
 * input(), int()/float()/str(), len(), .upper()/.lower().
 *
 * Programs in this chapter have no functions yet, so several trials re-run the
 * whole spell with run_again() (defined in TRIAL_HELPERS below and prepended to
 * those challenges' trials):
 *   * run_again(["17"]) answers input() with "17". Unlike run_program(), the
 *     prompts and typed answers are left out, and .lines holds only what the
 *     spell printed AFTER its last input() call — so players may word their
 *     prompts (or print a question first) however they like.
 *   * run_again(values={"students": 10}) swaps the value in the spell's first
 *     top-level line "students = <plain value>", proving that the spell really
 *     calculates with its variables instead of printing typed-in answers.
 */
(function () {
  "use strict";
  var py = SS.py;

  var TRIAL_HELPERS = py`
    # ---- Trial helpers shared by this chapter --------------------------------
    import ast as _ast
    import builtins as _builtins
    import re as _re

    _ASKED = "\x00input\x00"


    def _clean(text):
        return [line.rstrip() for line in text.split("\n") if line.strip()]


    class SpellRun:
        """What one quiet re-run of the spell printed."""

        def __init__(self, text, asked):
            parts = text.split(_ASKED)
            self.asked = asked                        # how many times input() was called
            self.lines = _clean(parts[-1])            # lines printed after the last input()
            self.all_lines = _clean("".join(parts))   # every line printed (prompts left out)


    def run_again(inputs=(), values=None):
        """Run the whole spell again with these input() answers, leaving prompts out."""
        tree = _ast.parse(source)
        if values:
            todo = dict(values)
            for node in tree.body:
                if (isinstance(node, _ast.Assign) and len(node.targets) == 1
                        and isinstance(node.targets[0], _ast.Name)
                        and node.targets[0].id in todo
                        and isinstance(node.value, _ast.Constant)):
                    new_value = _ast.Constant(todo.pop(node.targets[0].id))
                    node.value = _ast.copy_location(new_value, node.value)
            if todo:
                name = sorted(todo)[0]
                fail("Keep the starter's line " + code(name + " = ...") + " at the top of your spell, with a "
                     "plain value after the " + code("=") + ". The trials change that value to check that "
                     "your spell really uses the variable.")
        compiled = compile(tree, "<spell>", "exec")
        answers = [str(value) for value in inputs]
        asked = [0]

        def fake_input(prompt=""):
            if asked[0] >= len(answers):
                if not answers:
                    fail("This spell doesn't need " + code("input()") + ". Use the variables at the top instead.")
                fail("Your spell called " + code("input()") + " too many times. In this trial it is given "
                     + ", ".join(answers) + ", and it should stop asking after that.")
            asked[0] += 1
            print(_ASKED)
            return answers[asked[0] - 1]

        saved = _builtins.input
        _builtins.input = fake_input
        try:
            printed = capture(exec, compiled, {"__name__": "__main__"})[1]
        finally:
            _builtins.input = saved
        return SpellRun(printed, asked[0])


    def near_miss(want, got):
        """A short hint when two lines differ only a little."""
        if want.lower() == got.lower():
            return " Check your capital letters."
        if want.replace(" ", "") == got.replace(" ", ""):
            return " Check the spaces."
        if _re.sub(r"[^\w\s]", "", want) == _re.sub(r"[^\w\s]", "", got):
            return " Check the punctuation."
        return ""


    def expect_lines(got, want, label, after_input=False):
        """Compare printed lines with the expected ones and explain the first difference."""
        if got == want:
            return
        if not got:
            fail(label + ", your spell didn't print anything" + (" after reading its input" if after_input else "")
                 + ". It should print:\n" + "\n".join(want))
        for wanted, printed in zip(want, got):
            if wanted != printed:
                fail(label + ", your spell printed " + short(printed) + " where it should print "
                     + short(wanted) + "." + near_miss(wanted, printed))
        if len(got) > len(want):
            fail(label + ", your spell printed an extra line: " + short(got[len(want)]) + ".")
        fail(label + ", your spell stopped too soon. The next line should be " + short(want[len(got)]) + ".")


    def must_ask(run, what):
        if run.asked == 0:
            fail("Your spell never calls " + code("input()") + ", so it can't hear " + what + ". Call "
                 + code("input()") + " and store what it gives you in a variable.")
    # ---------------------------------------------------------------------------
  `;

  SS.defineChapter({
    id: "tower",
    order: 1,
    title: "The Apprentice's Tower",
    subtitle: "First words of power",
    icon: "🏰",
    concepts: ["print()", "strings", "comments", "variables", "arithmetic", "f-strings", "input()", "int()", "len()", ".upper()"],
    intro: [
      "Welcome to the Apprentice's Tower, the oldest part of Coilspire Academy. Every wizard who ever lived here began on this staircase, learning to speak in Python — the tongue that magic understands.",
      "Seven floors, seven lessons. Climb them all and you'll carve your own name into the Rune Stone at the top.",
      "Speak clearly and precisely: Python does exactly what you say, nothing more and nothing less."
    ],
    outro: [
      "Your name gleams on the Rune Stone, and the tower's lanterns blaze to life, floor after floor. You can make words appear, keep values in variables, calculate, and listen to anyone who visits.",
      "Then a clatter and a giggle echo up the stairs from the Hall of Forking Paths. Ada frowns. \"That,\" she says, \"sounds like Glitch, our resident gremlin. Doors, beware…\""
    ],
    challenges: [
      // ------------------------------------------------------------------ 1
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
          "In Python, `print()` makes words appear. Whatever you put between its brackets (also called parentheses) is shown in the scrying pool below your spell.",
          "Text must be wrapped in quotes so Python knows it's text and not a command. Text in quotes is called a **string**. Double quotes `\"like this\"` and single quotes `'like this'` both work, as long as the two ends match.",
          { code: py`
            print("Greetings, traveller")
            print("Magic is just precise instructions")
          `, output: "Greetings, traveller\nMagic is just precise instructions" },
          "Python follows your spell from the top line to the bottom, and each `print()` shows its words on a new line.",
          { tip: "Capital letters, spaces and punctuation all matter. Python is very literal!" }
        ],
        starter: py`
          # Make the words Hello world appear on the page.
          # Write your spell on the line below, then press "Cast Spell".

        `,
        hints: [
          "You need the `print()` spell, with your words between the brackets.",
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
          import re

          @test("The words appear on the page")
          def _():
              expect(output.strip() != "", "Nothing appeared! Use " + code("print()") + " to make words show up.")

          @test("The page shows the two words Hello and world")
          def _():
              expect(output.strip() != "", "Nothing appeared yet, so there are no words to check.")
              words = re.sub(r"[^a-z\s]", "", output.lower()).split()
              expect(words == ["hello", "world"],
                     "The page says " + short(output.strip()) + ". It should show just the two words Hello world.")

          @test("They say exactly: Hello world")
          def _():
              expect_output("Hello world")
        `,
        scene: { icon: "📜", successIcon: "✨", successText: "Glowing letters blossom across the parchment!", effect: "manifest" }
      },

      // ------------------------------------------------------------------ 2
      {
        id: "tower-pips-scribble",
        title: "Pip's Scribble",
        difficulty: "easy",
        concepts: ["several lines", "numbers", "print with commas", "comments"],
        story: [
          "The storeroom on the second floor needs a new label, and Pip insisted on helping. He has already scribbled a line of his own into your spell.",
          "\"Owls,\" sighs Ada. \"Don't delete it, or he'll sulk for a week. Turn it into a comment so Python skips it. And let Python do the adding. That's what it's for.\""
        ],
        task: [
          "Change the spell so that it prints exactly these four lines:",
          { output: "Tower Storeroom\nCandles: 12\nOwl treats: 30\nTotal: 42" },
          { list: [
            "Keep Pip's line in your spell, but turn it into a **comment** so that it doesn't print.",
            "Let Python work out the total: write the sum `12 + 30` in your spell instead of typing `42` yourself."
          ] }
        ],
        lesson: [
          "Python runs your spell from top to bottom, one line at a time, and every `print()` starts a new line of output.",
          "**Numbers** don't need quotes, and Python can calculate with them. Quotes mean \"show exactly this text\", so `print(7 + 5)` shows `12`, but `print(\"7 + 5\")` shows `7 + 5`.",
          "To print several things on one line, separate them with **commas**. Python puts one space between them.",
          "A **comment** starts with `#`. Python ignores everything from the `#` to the end of the line, so comments are perfect for notes to humans, or for switching a line off without deleting it.",
          { code: py`
            # A note for humans: Python skips this line.
            print("Spell book")
            print("Pages:", 100)
            print(7 + 5)
            print("7 + 5")
            # print("This line is switched off")
          `, output: "Spell book\nPages: 100\n12\n7 + 5" },
          { tip: "`print()` adds the space between items for you, so write `print(\"Pages:\", 100)`, not `print(\"Pages: \", 100)`." }
        ],
        starter: py`
          # The storeroom label (Pip "helped" with the first line)
          print("Hoot hoot! Pip was here!")
          print("Tower Storeroom")

          # Add the candles, owl treats and total lines below.

        `,
        hints: [
          "Put a `#` at the very start of Pip's line. From then on, Python skips it.",
          "Each new line of the label needs its own `print()`. Put text in quotes, but leave numbers and sums outside them, after a comma: `print(\"Candles:\", 12)`.",
          "For the last line, let Python add: `print(\"Total:\", 12 + 30)`."
        ],
        solution: py`
          # The storeroom label (Pip "helped" with the first line)
          # print("Hoot hoot! Pip was here!")
          print("Tower Storeroom")
          print("Candles:", 12)
          print("Owl treats:", 30)
          print("Total:", 12 + 30)
        `,
        altSolutions: [
          py`
            #print("Hoot hoot! Pip was here!")   <- Pip's line, switched off
            print("Tower Storeroom")
            print("Candles: 12")
            print("Owl treats: 30")
            print("Total: " + str(12 + 30))
          `,
          py`
            # print("Hoot hoot! Pip was here!")
            candles = 12
            treats = 30
            print("Tower Storeroom")
            print("Candles:", candles)
            print("Owl treats:", treats)
            print("Total:", candles + treats)
          `
        ],
        wrongSolutions: [
          // Deleted Pip's line instead of turning it into a comment.
          py`
            print("Tower Storeroom")
            print("Candles:", 12)
            print("Owl treats:", 30)
            print("Total:", 12 + 30)
          `,
          // Typed the total instead of letting Python add.
          py`
            # print("Hoot hoot! Pip was here!")
            print("Tower Storeroom")
            print("Candles: 12")
            print("Owl treats: 30")
            print("Total: 42")
          `,
          // The sum is inside the quotes, so it is printed as text.
          py`
            # print("Hoot hoot! Pip was here!")
            print("Tower Storeroom")
            print("Candles:", 12)
            print("Owl treats:", 30)
            print("Total: 12 + 30")
          `
        ],
        tests: py`
          import ast
          import io
          import tokenize

          LABEL = ["Tower Storeroom", "Candles: 12", "Owl treats: 30", "Total: 42"]


          def comments():
              found = []
              try:
                  for token in tokenize.generate_tokens(io.StringIO(source).readline):
                      if token.type == tokenize.COMMENT:
                          found.append(token.string.lower())
              except (tokenize.TokenError, SyntaxError):
                  pass
              return found


          @test("Pip's line is a comment, so it no longer prints")
          def _():
              expect("pip was here" not in output.lower(),
                     "Pip's line still prints! Put a " + code("#") + " at the very start of that line to turn it into a comment.")
              if any("pip was here" in text for text in comments()):
                  return
              if "pip was here" in source.lower():
                  fail("Pip's line is still in your spell, but it isn't a comment. A comment starts with " + code("#")
                       + " (quotes make a string, not a comment): " + code('# print("Hoot hoot! Pip was here!")'))
              fail("Pip's line has vanished from your spell! Ada asked you to keep it, as a comment. Put it back "
                   "with a " + code("#") + " in front: " + code('# print("Hoot hoot! Pip was here!")'))


          @test("The label shows exactly the four lines")
          def _():
              for line in output_lines:
                  if "1230" in line or "3012" in line:
                      fail("Your spell printed " + short(line) + ". Numbers in quotes are text, and " + code("+")
                           + " glues two pieces of text together: " + code('"12" + "30"') + " makes " + code('"1230"')
                           + ". Leave the quotes off the numbers: " + code("12 + 30") + ".")
                  if "12 + 30" in line or "12+30" in line:
                      fail("Your spell printed " + short(line) + ". Inside quotes, " + code("12 + 30")
                           + " is just text. Put the sum outside the quotes: " + code('print("Total:", 12 + 30)') + ".")
                  if ":  " in line:
                      fail("Your spell printed " + short(line) + ", with two spaces after the colon. " + code("print()")
                           + " already puts one space between the items, so leave the space out of the quotes.")
              expect_output(LABEL)


          @test("Python does the adding")
          def _():
              if not any(line.lower().startswith("total") for line in output_lines):
                  fail("There's no Total line yet. Add one, and let Python work out the sum: "
                       + code('print("Total:", 12 + 30)') + ".")
              for node in ast.walk(ast.parse(source)):
                  if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
                      sides = [node.left, node.right]
                  elif isinstance(node, ast.AugAssign) and isinstance(node.op, ast.Add):
                      sides = [node.value]
                  else:
                      continue
                  texts = [side.value for side in sides if isinstance(side, ast.Constant) and isinstance(side.value, str)]
                  if len(texts) == len(sides) and all(text.strip().isdigit() for text in texts):
                      fail("Numbers in quotes are text, and " + code("+") + " glues two pieces of text together: "
                           + code('"12" + "30"') + " makes " + code('"1230"') + ". Leave the quotes off the numbers: "
                           + code("12 + 30") + ".")
                  if texts:
                      continue  # joining text, such as "Total: " + str(...)
                  # A real sum of the supplies: the numbers 12 and 30, or variables holding them.
                  if any(not isinstance(side, ast.Constant) or side.value in (12, 30) for side in sides):
                      return
              fail("It looks like you typed the total yourself. Let Python work it out: write the sum "
                   + code("12 + 30") + " in your spell, outside of any quotes.")
        `,
        scene: { icon: "📦", successIcon: "🏷️", successText: "The label glows on the storeroom door, and Pip hoots proudly from his comment.", effect: "manifest" }
      },

      // ------------------------------------------------------------------ 3
      {
        id: "tower-potion-for-a-crowd",
        title: "Potion for a Crowd",
        difficulty: "easy",
        concepts: ["variables", "arithmetic", "decimals"],
        story: [
          "The whole first-year class needs a Potion of Courage before tomorrow's broomstick lesson, but Ada's recipe makes only one potion.",
          "\"Scale it up,\" she says, sliding her measuring spoons across the bench. \"Precisely, please. Too much dragon pepper and they'll be breathing fire for a week.\""
        ],
        task: [
          "The four variables at the top of the spell hold Ada's recipe. Use them to print exactly these three lines:",
          { output: "Pepper needed: 78\nPepper left in the jar: 22\nMoonwater in litres: 6.5" },
          { list: [
            "**Pepper needed**: pinches per potion × the number of students.",
            "**Pepper left in the jar**: the pinches in the jar minus the pepper needed.",
            "**Moonwater in litres**: millilitres per potion × students, divided by 1000."
          ] },
          "Calculate with the variable names, not the numbers: the trials change the recipe to make sure your spell keeps up."
        ],
        lesson: [
          "A **variable** is a name that remembers a value. Create one with `=`, then use the name wherever you need the value:",
          { code: py`
            owls = 4
            treats_each = 3
            print("Treats needed:", owls * treats_each)
            owls = 10    # a variable can change
            print("Treats needed:", owls * treats_each)
          `, output: "Treats needed: 12\nTreats needed: 30" },
          "In Python, `=` doesn't mean \"is equal to\". It means **store**: work out the value on the right, then keep it under the name on the left. Names can use letters, digits and underscores (no spaces), and capitals matter: `owls` and `Owls` are different names.",
          "Python's arithmetic symbols:",
          { list: [
            "`+` add, `-` subtract, `*` multiply",
            "`/` divide. It always gives a decimal number (a **float**): `7 / 2` is `3.5`, and even `6 / 2` is `3.0`.",
            "`//` divide and drop the remainder: `7 // 2` is `3`",
            "`%` the remainder: `7 % 2` is `1`",
            "`**` power: `2 ** 3` is `8`"
          ] },
          "Like in maths class, `*` and `/` happen before `+` and `-`: `10 - 2 * 3` is `4`. Brackets change the order: `(10 - 2) * 3` is `24`.",
          { tip: "Calculate with variable names, not their values. If the recipe changes, `owls * treats_each` stays right, but a typed-in `12` goes stale." }
        ],
        starter: py`
          # Ada's recipe for ONE Potion of Courage
          pepper = 3         # pinches of dragon pepper per potion
          moonwater = 250    # millilitres of moonwater per potion
          students = 26      # how many potions we need
          jar = 100          # pinches of pepper in the jar

          # Use the variables to print the three lines of the label.

        `,
        hints: [
          "Each line is a `print()` with some text and a calculation, like `print(\"Pepper needed:\", ...)`. Build the calculation from the variable names.",
          "Pepper needed is `pepper * students`. Store it in a new variable, such as `needed = pepper * students`, so you can reuse it: the jar line is then `jar - needed`.",
          "For the litres, multiply and then divide: `moonwater * students / 1000`. The `/` gives a decimal like `6.5`, which is exactly what the label needs."
        ],
        solution: py`
          # Ada's recipe for ONE Potion of Courage
          pepper = 3         # pinches of dragon pepper per potion
          moonwater = 250    # millilitres of moonwater per potion
          students = 26      # how many potions we need
          jar = 100          # pinches of pepper in the jar

          needed = pepper * students
          print("Pepper needed:", needed)
          print("Pepper left in the jar:", jar - needed)
          print("Moonwater in litres:", moonwater * students / 1000)
        `,
        altSolutions: [
          py`
            pepper = 3
            moonwater = 250
            students = 26
            jar = 100
            print("Pepper needed:", pepper * students)
            print("Pepper left in the jar:", jar - pepper * students)
            print("Moonwater in litres:", moonwater / 1000 * students)
          `,
          py`
            pepper = 3
            moonwater = 250
            students = 26
            jar = 100
            pepper = pepper * students
            jar = jar - pepper
            litres = (moonwater * students) / 1000
            print(f"Pepper needed: {pepper}")
            print(f"Pepper left in the jar: {jar}")
            print(f"Moonwater in litres: {litres}")
          `
        ],
        wrongSolutions: [
          // Worked the answers out by hand: right today, wrong when the recipe changes.
          py`
            pepper = 3
            moonwater = 250
            students = 26
            jar = 100
            print("Pepper needed: 78")
            print("Pepper left in the jar: 22")
            print("Moonwater in litres: 6.5")
          `,
          // Floor division throws away the decimals.
          py`
            pepper = 3
            moonwater = 250
            students = 26
            jar = 100
            print("Pepper needed:", pepper * students)
            print("Pepper left in the jar:", jar - pepper * students)
            print("Moonwater in litres:", moonwater * students // 1000)
          `,
          // The calculation is inside the quotes.
          py`
            pepper = 3
            moonwater = 250
            students = 26
            jar = 100
            print("Pepper needed:", "pepper * students")
            print("Pepper left in the jar:", "jar - pepper * students")
            print("Moonwater in litres:", "moonwater * students / 1000")
          `
        ],
        tests: TRIAL_HELPERS + py`
          RECIPE = {"pepper": 3, "moonwater": 250, "students": 26, "jar": 100}
          NAMES = ("pepper", "moonwater", "students", "jar")
          WHICH = ("first", "second", "third")


          def label_for(recipe):
              needed = recipe["pepper"] * recipe["students"]
              return ["Pepper needed: " + str(needed),
                      "Pepper left in the jar: " + str(recipe["jar"] - needed),
                      "Moonwater in litres: " + str(recipe["moonwater"] * recipe["students"] / 1000)]


          def same_number(text, want):
              try:
                  return abs(float(text) - float(want)) < 1e-9
              except ValueError:
                  return False


          def check_line(lines, index, want, label):
              if len(lines) <= index:
                  fail(label + ", the label has no " + WHICH[index] + " line. It should be " + short(want) + ".")
              got = lines[index]
              if got == want:
                  return
              head, _, value = got.partition(":")
              want_head, _, want_value = want.partition(":")
              if index == 2 and head == want_head and same_number(value, want_value):
                  return  # the right amount, written a little differently (e.g. 2.0999999999999996)
              if any(name in value for name in NAMES):
                  fail(label + ", your spell printed " + short(got) + ". The calculation is inside quotes, so Python "
                       "printed it as text. Leave calculations outside the quotes, like "
                       + code('print("Pepper needed:", pepper * students)') + ".")
              if index == 2 and head == want_head:
                  try:
                      number = float(value)
                  except ValueError:
                      number = None
                  if number is not None and abs(number - float(want_value) * 1000) < 1e-6:
                      fail(label + ", your spell printed " + short(got) + " where it should print " + short(want)
                           + ". That's millilitres: divide by 1000 to get litres.")
                  if number is not None and value.strip().isdigit() and int(value) == int(float(want_value)):
                      fail(label + ", your spell printed " + short(got) + " where it should print " + short(want)
                           + ". Divide with " + code("/") + ", which keeps the decimals (" + code("//")
                           + " throws them away).")
              fail(label + ", the " + WHICH[index] + " line should be " + short(want) + ", but your spell printed "
                   + short(got) + "." + near_miss(want, got))


          def check_label(values, label):
              recipe = dict(RECIPE)
              recipe.update(values)
              want = label_for(recipe)
              original = label_for(RECIPE)
              lines = run_again(values=values).lines
              for index in range(3):
                  if index < len(lines) and lines[index] == original[index] != want[index]:
                      fail(label + ", your spell still printed " + short(lines[index]) + ", the answer for the "
                           "original recipe. Calculate with the variables (like " + code("pepper * students")
                           + ") instead of typing the numbers.")
                  check_line(lines, index, want[index], label)
              if len(lines) > 3:
                  fail(label + ", the label has an extra line: " + short(lines[3]) + ".")


          @test("Pepper needed: 78")
          def _():
              check_line(run_again().lines, 0, label_for(RECIPE)[0], "With Ada's recipe")


          @test("Pepper left in the jar: 22")
          def _():
              check_line(run_again().lines, 1, label_for(RECIPE)[1], "With Ada's recipe")


          @test("Moonwater in litres: 6.5 (and nothing else)")
          def _():
              lines = run_again().lines
              check_line(lines, 2, label_for(RECIPE)[2], "With Ada's recipe")
              if len(lines) > 3:
                  fail("The label should have exactly three lines, but your spell also printed " + short(lines[3]) + ".")


          @test("Still right for 10 students")
          def _():
              check_label({"students": 10}, "When students = 10")


          @test("Still right for a whole new recipe")
          def _():
              check_label({"pepper": 2, "moonwater": 300, "students": 7, "jar": 50},
                          "With pepper = 2, moonwater = 300, students = 7 and jar = 50")
        `,
        scene: { icon: "⚗️", successIcon: "🧪", successText: "The cauldron bubbles a brave, bright gold: exactly enough for everyone!", effect: "bubble" }
      },

      // ------------------------------------------------------------------ 4
      {
        id: "tower-familiar-registry",
        title: "The Familiar Registry",
        difficulty: "easy",
        concepts: ["f-strings", "str()", "joining text"],
        story: [
          "Every familiar at Coilspire must be written into the Great Registry, and Pip is beside himself with excitement: he's going to be official!",
          "\"Write the entry so that the Registry's quill can copy it for any familiar,\" says Ada. \"And mind the full stops. That quill is even fussier than I am.\""
        ],
        task: [
          "Using the three variables at the top of the spell, print exactly:",
          { output: "Pip the owl is 3 years old.\nIn 10 years, Pip will be 13." },
          "Both lines end with a full stop (`.`). Let Python work out the age in 10 years. The trials also register other familiars (such as Hex, a toad who is 7), so build the lines from the variables, not from Pip's details."
        ],
        lesson: [
          "Sentences often mix fixed text with values from variables. An **f-string** does this neatly: put an `f` right before the opening quote, then write any variable, or even a calculation, inside curly braces `{ }`.",
          { code: py`
            wizard = "Merlin"
            spells = 40
            print(f"{wizard} knows {spells} spells.")
            print(f"Next year, {wizard} will know {spells + 12}.")
          `, output: "Merlin knows 40 spells.\nNext year, Merlin will know 52." },
          "Everything outside the braces is printed exactly as written, spaces and punctuation included. Forget the `f`, and Python prints the braces as they are: `{wizard}`.",
          "You can also glue strings together with `+`. But `+` only joins text to text, so turn a number into a string first with `str()`:",
          { code: py`
            wizard = "Merlin"
            spells = 40
            print(wizard + " has " + str(spells) + " spells.")
          `, output: "Merlin has 40 spells." },
          { tip: "`print()` with commas always puts a space between the items, so it can't place a full stop right after a number. F-strings give you full control." }
        ],
        starter: py`
          familiar = "Pip"
          kind = "owl"
          age = 3

          # Print the two lines of the Registry entry, using the variables above.

        `,
        hints: [
          "Put an `f` right before the opening quote, then write each variable's name inside curly braces where its value should appear.",
          "The first line is `print(f\"{familiar} the {kind} is {age} years old.\")`. Check every space and the full stop.",
          "Do the sum inside the braces of the second line: `print(f\"In 10 years, {familiar} will be {age + 10}.\")`"
        ],
        solution: py`
          familiar = "Pip"
          kind = "owl"
          age = 3

          print(f"{familiar} the {kind} is {age} years old.")
          print(f"In 10 years, {familiar} will be {age + 10}.")
        `,
        altSolutions: [
          py`
            familiar = "Pip"
            kind = "owl"
            age = 3
            print(familiar + " the " + kind + " is " + str(age) + " years old.")
            print("In 10 years, " + familiar + " will be " + str(age + 10) + ".")
          `,
          py`
            familiar = "Pip"
            kind = "owl"
            age = 3
            older = age + 10
            print(familiar, "the", kind, "is", age, "years old.")
            print(f"In 10 years, {familiar} will be {older}.")
          `
        ],
        wrongSolutions: [
          // Forgot the f, so the braces are printed as they are.
          py`
            familiar = "Pip"
            kind = "owl"
            age = 3
            print("{familiar} the {kind} is {age} years old.")
            print("In 10 years, {familiar} will be {age + 10}.")
          `,
          // Typed Pip's details instead of using the variables.
          py`
            familiar = "Pip"
            kind = "owl"
            age = 3
            print("Pip the owl is 3 years old.")
            print("In 10 years, Pip will be 13.")
          `,
          // Commas put a space before the final full stop.
          py`
            familiar = "Pip"
            kind = "owl"
            age = 3
            print(familiar, "the", kind, "is", age, "years old.")
            print("In 10 years,", familiar, "will be", age + 10, ".")
          `
        ],
        tests: TRIAL_HELPERS + py`
          PIP = {"familiar": "Pip", "kind": "owl", "age": 3}
          NAMES = ("familiar", "kind", "age")
          WHICH = ("first", "second")


          def entry_for(f):
              return [f["familiar"] + " the " + f["kind"] + " is " + str(f["age"]) + " years old.",
                      "In 10 years, " + f["familiar"] + " will be " + str(f["age"] + 10) + "."]


          def check_line(lines, index, want, label):
              if len(lines) <= index:
                  fail(label + ", the entry has no " + WHICH[index] + " line. It should be " + short(want) + ".")
              got = lines[index]
              if got == want:
                  return
              if "{" in got or "}" in got:
                  fail(label + ", your spell printed " + short(got) + ". The curly braces were printed as they are, "
                       "which means the " + code("f") + " is missing. Put it right before the opening quote: "
                       + code('f"{familiar} ..."') + ".")
              if _re.search(r"\+ ?10", got):
                  fail(label + ", your spell printed " + short(got) + ". Do the sum inside the braces, "
                       + code("{age + 10}") + ", so that Python works it out.")
              if got.replace(" .", ".") == want:
                  fail(label + ", your spell printed " + short(got) + ", with a space before the full stop. "
                       + code("print()") + " puts a space between items separated by commas; an f-string gives "
                       "you full control over every space.")
              words = set(_re.findall(r"[a-z]+", got))
              names = [name for name in NAMES if name in words and name not in want]
              if names:
                  fail(label + ", your spell printed " + short(got) + ": the word " + names[0] + " instead of the "
                       "value stored in it. In an f-string, put the variable's name inside curly braces: "
                       + code("{" + names[0] + "}") + ".")
              fail(label + ", the " + WHICH[index] + " line should be " + short(want) + ", but your spell printed "
                   + short(got) + "." + near_miss(want, got))


          def check_entry(values, label):
              familiar = dict(PIP)
              familiar.update(values)
              want = entry_for(familiar)
              original = entry_for(PIP)
              lines = run_again(values=values).lines
              for index in range(2):
                  if index < len(lines) and lines[index] == original[index] != want[index]:
                      fail(label + ", your spell still printed " + short(lines[index]) + ", which is Pip's entry. "
                           "Build the lines from the variables, like " + code("{familiar}") + ", instead of "
                           "typing Pip's details.")
                  check_line(lines, index, want[index], label)
              if len(lines) > 2:
                  fail(label + ", your spell printed an extra line: " + short(lines[2]) + ".")


          @test("Pip's first line: Pip the owl is 3 years old.")
          def _():
              check_line(run_again().lines, 0, entry_for(PIP)[0], "For Pip")


          @test("Pip's second line: In 10 years, Pip will be 13.")
          def _():
              lines = run_again().lines
              check_line(lines, 1, entry_for(PIP)[1], "For Pip")
              if len(lines) > 2:
                  fail("The entry should have exactly two lines, but your spell also printed " + short(lines[2]) + ".")


          @test("Hex the toad, aged 7, gets the right entry")
          def _():
              check_entry({"familiar": "Hex", "kind": "toad", "age": 7},
                          "With familiar = 'Hex', kind = 'toad' and age = 7")


          @test("So does Grizelda the raven, aged 120")
          def _():
              check_entry({"familiar": "Grizelda", "kind": "raven", "age": 120},
                          "With familiar = 'Grizelda', kind = 'raven' and age = 120")
        `,
        scene: { icon: "📖", successIcon: "🦉", successText: "The Registry's quill copies Pip's entry in shimmering ink. Pip is officially official!", effect: "manifest" }
      },

      // ------------------------------------------------------------------ 5
      {
        id: "tower-gate-greeting",
        title: "The Gatekeeper's Greeting",
        difficulty: "easy",
        concepts: ["input()", "variables", "f-strings"],
        story: [
          "Visitors knock at the tower gate all day long, and the stone gargoyle on duty only ever growls \"GO AWAY.\"",
          "\"Hardly the Coilspire welcome,\" says Ada. \"Teach the gate to ask each visitor's name and greet them properly. Good manners are a kind of magic too.\""
        ],
        task: [
          "Ask the visitor's name with `input()`, then print exactly one welcome line. If the visitor types **Morgana**, print:",
          { output: "Welcome to Coilspire, Morgana!" },
          "When you cast your spell, the gate answers with **Morgana**. The trials then send other visitors, so greet whoever arrives. Your question (the prompt inside `input()`) can say anything you like."
        ],
        lesson: [
          "`input()` pauses your spell and waits for someone to type an answer. Whatever they type comes back as a string, which you'll usually keep in a variable:",
          { code: py`
            pet = input("What is your pet called? ")
            print(f"Hello, {pet}!")
            print("Goodbye,", pet)
          `, output: "What is your pet called? Biscuit\nHello, Biscuit!\nGoodbye, Biscuit" },
          "The text inside the brackets is the **prompt**: the question the person sees. End it with a space so the answer doesn't stick to it. In the output above, the first line shows the prompt followed by the answer the person typed (Biscuit).",
          "Nobody sits at the keyboard in this game, so each challenge types the answers for you, and the trials try several different ones.",
          { warning: "Write variable names **without** quotes. `print(\"pet\")` prints the word pet, but `print(pet)` prints whatever is stored in it." }
        ],
        inputs: ["Morgana"],
        starter: py`
          # 1. Ask for the visitor's name with input() and store it in a variable.
          # 2. Print the welcome line.

        `,
        hints: [
          "Store the answer in a variable: `name = input(\"Who goes there? \")`.",
          "Build the welcome with an f-string, putting the variable's name inside curly braces.",
          "`print(f\"Welcome to Coilspire, {name}!\")`"
        ],
        solution: py`
          name = input("Who goes there? ")
          print(f"Welcome to Coilspire, {name}!")
        `,
        altSolutions: [
          py`
            visitor = input()
            print("Welcome to Coilspire, " + visitor + "!")
          `,
          py`
            print("Who knocks at the gate?")
            name = input()
            print("Welcome to Coilspire,", name + "!")
          `
        ],
        wrongSolutions: [
          // Always greets Morgana, whoever knocks.
          py`
            name = input("Who goes there? ")
            print("Welcome to Coilspire, Morgana!")
          `,
          // The variable's name is inside the quotes.
          py`
            name = input("Who goes there? ")
            print("Welcome to Coilspire, name!")
          `,
          // Commas put a space before the "!".
          py`
            name = input("Who goes there? ")
            print("Welcome to Coilspire,", name, "!")
          `
        ],
        tests: TRIAL_HELPERS + py`
          def check_welcome(visitor):
              run = run_again([visitor])
              must_ask(run, "the visitor's name")
              label = "When " + visitor + " knocks"
              want = "Welcome to Coilspire, " + visitor + "!"
              for line in run.lines:
                  if "{" in line:
                      fail(label + ", your spell printed " + short(line) + ". The curly braces were printed as they "
                           "are, so the " + code("f") + " before the opening quote is missing.")
              if run.lines and not any(visitor in line for line in run.lines):
                  fail(label + ", your spell printed " + short(run.lines[-1]) + ", which doesn't include the name "
                       + visitor + ". Use the variable that holds the answer from " + code("input()")
                       + ", without quotes around it.")
              if len(run.lines) == 1 and run.lines[0] != want and run.lines[0].replace(" !", "!") == want:
                  fail(label + ", your spell printed " + short(run.lines[0]) + ", with a space before the "
                       + code("!") + ". " + code("print()") + " puts a space between items separated by commas. "
                       "Use an f-string (or join the text with " + code("+") + ") to put the " + code("!")
                       + " right after the name.")
              expect_lines(run.lines, [want], label, after_input=True)


          @test("The gate asks for the name with input()")
          def _():
              must_ask(run_again(["Morgana"]), "the visitor's name")


          @test("Morgana is welcomed by name")
          def _():
              check_welcome("Morgana")


          @test("Bartholomew is welcomed too")
          def _():
              check_welcome("Bartholomew")


          @test("So is a visitor with two names: Grace Hopper")
          def _():
              check_welcome("Grace Hopper")
        `,
        scene: { icon: "🚪", successIcon: "🗿", successText: "The gargoyle clears its stony throat and bows: \"Welcome to Coilspire!\"", effect: "sparkle" }
      },

      // ------------------------------------------------------------------ 6
      {
        id: "tower-feast-countdown",
        title: "The Feast Countdown",
        difficulty: "easy",
        concepts: ["int()", "// and %", "input()"],
        story: [
          "\"How long until the Midwinter Feast?\" Every apprentice asks, and the answer is always a heap of days. The academy calendar, however, only counts in weeks.",
          "Ada hands you the calendar's quill. \"Teach it to turn days into weeks and days,\" she says. \"Whole weeks only: the calendar doesn't do fractions.\""
        ],
        task: [
          "Read a number of days with `input()`. Print how many **whole weeks** that is, and how many **days are left over**. For **17** days, print exactly:",
          { output: "Weeks: 2\nDays: 3" },
          "(17 days make 2 weeks of 7 days, with 3 days to spare.) When you cast, the calendar is given 17; the trials try other numbers too."
        ],
        lesson: [
          "`input()` always gives you a **string**, even when someone types digits: `\"17\"` is text, and you can't do arithmetic with text. Turn it into a whole number (an **int**) with `int()`:",
          { code: py`
            text = input("How many apples? ")
            apples = int(text)
            print("Double:", apples * 2)
          `, output: "How many apples? 9\nDouble: 18" },
          "You can do both at once: `apples = int(input(\"How many apples? \"))`. For numbers with decimals, like `2.5`, use `float()` instead. And `str()` turns a number back into text.",
          "Two operators are perfect for sharing things out:",
          { list: [
            "`//` gives how many **whole** times one number fits into another: `20 // 6` is `3`.",
            "`%` (modulo) gives what's **left over**: `20 % 6` is `2`, because 3 × 6 = 18, and 20 − 18 = 2."
          ] },
          { tip: "If you see a `TypeError` about a `str` and an `int`, you are doing arithmetic with text: wrap the `input()` in `int()`. And keep the result: `int(days)` on a line of its own makes a number and throws it away, so write `days = int(days)`." }
        ],
        inputs: ["17"],
        starter: py`
          days = input("How many days? ")

          # Print the whole weeks and the days left over.

        `,
        hints: [
          "`input()` gives text. Wrap it in `int()` to get a number you can calculate with: `days = int(input(\"How many days? \"))`.",
          "A week has 7 days. `days // 7` gives the whole weeks, and `days % 7` gives the days left over.",
          "`print(\"Weeks:\", days // 7)`, then a similar line for the days."
        ],
        solution: py`
          days = int(input("How many days? "))
          print("Weeks:", days // 7)
          print("Days:", days % 7)
        `,
        altSolutions: [
          py`
            days = int(input())
            weeks, extra = divmod(days, 7)
            print(f"Weeks: {weeks}")
            print(f"Days: {extra}")
          `,
          py`
            text = input("Number of days: ")
            days = int(text)
            weeks = int(days / 7)
            left = days - weeks * 7
            print("Weeks:", weeks)
            print("Days:", left)
          `
        ],
        wrongSolutions: [
          // / gives a decimal number of weeks.
          py`
            days = int(input("How many days? "))
            print("Weeks:", days / 7)
            print("Days:", days % 7)
          `,
          // round() rounds 13 / 7 = 1.86 up to 2 weeks.
          py`
            days = int(input("How many days? "))
            print("Weeks:", round(days / 7))
            print("Days:", days % 7)
          `,
          // Forgot int(), so Python tries to divide text.
          py`
            days = input("How many days? ")
            print("Weeks:", days // 7)
            print("Days:", days % 7)
          `
        ],
        tests: TRIAL_HELPERS + py`
          def fixed_prints():
              """The text of every print() whose arguments are all typed-in values, like print("Weeks: 2")."""
              found = set()
              for node in _ast.walk(_ast.parse(source)):
                  if (isinstance(node, _ast.Call) and isinstance(node.func, _ast.Name) and node.func.id == "print"
                          and node.args and all(isinstance(arg, _ast.Constant) for arg in node.args)):
                      found.add(" ".join(str(arg.value) for arg in node.args))
              return found


          def check_days(days):
              run = run_again([str(days)])
              must_ask(run, "the number of days")
              weeks, left = days // 7, days % 7
              label = "With " + str(days) + " days (" + str(weeks) + " × 7 + " + str(left) + ")"
              want = ["Weeks: " + str(weeks), "Days: " + str(left)]
              lines = run.lines
              for line in lines[:2]:
                  value = line.partition(":")[2]
                  if "days" in value or "//" in value or "%" in value:
                      fail(label + ", your spell printed " + short(line) + ". The calculation is inside the quotes, so "
                           "Python printed it as text. Leave calculations outside the quotes, like "
                           + code('print("Weeks:", days // 7)') + ".")
                  if "." in line and uses_call("float"):
                      fail(label + ", your spell printed " + short(line) + ". " + code("float()") + " makes decimal "
                           "numbers such as 17.0, but days are whole numbers: read them with " + code("int()") + ".")
                  if line.startswith("Weeks:") and "." in line:
                      fail(label + ", your spell printed " + short(line) + ". Count whole weeks with " + code("//")
                           + ": a single " + code("/") + " gives a decimal.")
              seventeen = ["Weeks: 2", "Days: 3"]
              stale = [line for line in lines[:2] if line in seventeen and line not in want]
              if days != 17 and stale and (lines[:2] == seventeen or any(line in fixed_prints() for line in stale)):
                  fail(label + ", your spell still printed " + short(stale[0]) + ", the answer for 17 days. Work it "
                       "out from the number " + code("input()") + " gives you: " + code("days // 7") + " and "
                       + code("days % 7") + ".")
              if uses_call("round") and lines[:1] == ["Weeks: " + str(round(days / 7))] and round(days / 7) != weeks:
                  fail(label + ", your spell printed " + short(lines[0]) + ". " + str(days) + " / 7 is about "
                       + str(round(days / 7, 2)) + ", and " + code("round()") + " rounds that up, but the calendar "
                       "only counts whole weeks. Use " + code("//") + ", which simply drops the leftover part.")
              if lines[:2] == ["Weeks: " + str(left), "Days: " + str(weeks)] and weeks != left:
                  fail(label + ", your weeks and days are swapped: " + code("//") + " counts the whole weeks, and "
                       + code("%") + " gives the days left over.")
              expect_lines(lines, want, label, after_input=True)


          @test("17 days is 2 weeks and 3 days")
          def _():
              check_days(17)


          @test("13 days is 1 week and 6 days")
          def _():
              check_days(13)


          @test("7 days is exactly 1 week")
          def _():
              check_days(7)


          @test("3 days isn't even a week")
          def _():
              check_days(3)


          @test("A whole year: 365 days is 52 weeks and 1 day")
          def _():
              check_days(365)
        `,
        scene: { icon: "📅", successIcon: "❄️", successText: "Frost-flowers spell out the countdown across the calendar's window.", effect: "frost" }
      },

      // ------------------------------------------------------------------ 7
      {
        id: "tower-rune-stone",
        title: "The Rune Stone",
        difficulty: "easy",
        concepts: ["len()", ".upper()", "string methods"],
        story: [
          "At the very top of the tower stands the Rune Stone, carved with the name of every wizard who ever studied here. Today, yours joins them!",
          "The stonemason carves only capital letters and charges 3 silver coins per rune. \"Prepare the carving order,\" says Ada, \"so that it works for every apprentice after you, too.\""
        ],
        task: [
          "Ask for a name with `input()`, then print three lines: the name in capital letters, the number of runes (one per character), and the cost at 3 silver per rune. For **Morgana**, print:",
          { output: "Carve: MORGANA\nRunes: 7\nCost: 21 silver" },
          "The trials also try names typed with odd capitals, like **pIp**."
        ],
        lesson: [
          "Strings come with built-in abilities called **methods**. To use one, write a dot after the string (or the variable holding it), then the method's name and brackets:",
          { code: py`
            spell = "Lumos Maxima"
            print(spell.upper())
            print(spell.lower())
            print(len(spell))
          `, output: "LUMOS MAXIMA\nlumos maxima\n12" },
          { list: [
            "`.upper()` gives a copy in CAPITALS, and `.lower()` gives a copy in small letters.",
            "`len()` counts the characters in a string. Spaces count too, which is why `Lumos Maxima` has 12.",
            "Don't forget the brackets: `spell.upper` without `()` doesn't run the method."
          ] },
          "A method gives you a **new** string; it never changes the original. To keep the result, store it:",
          { code: py`
            spell = "Lumos Maxima"
            loud = spell.upper()
            print(spell, "->", loud)
          `, output: "Lumos Maxima -> LUMOS MAXIMA" },
          { tip: "`len()` gives a number, so you can calculate with it: `len(spell) * 2` is `24`." }
        ],
        inputs: ["Morgana"],
        starter: py`
          name = input("Whose name shall we carve? ")

          # Print the carving order: the Carve, Runes and Cost lines.

        `,
        hints: [
          "`name.upper()` gives the name in capitals, ready for the Carve line.",
          "`len(name)` counts the runes. Multiply it by 3 for the cost.",
          "`print(\"Runes:\", len(name))`, and for the last line an f-string such as `f\"Cost: {len(name) * 3} silver\"`."
        ],
        solution: py`
          name = input("Whose name shall we carve? ")
          runes = len(name)
          print("Carve:", name.upper())
          print("Runes:", runes)
          print(f"Cost: {runes * 3} silver")
        `,
        altSolutions: [
          py`
            name = input()
            print(f"Carve: {name.upper()}")
            print(f"Runes: {len(name)}")
            print(f"Cost: {len(name) * 3} silver")
          `,
          py`
            name = input("Name: ")
            name = name.upper()
            count = len(name)
            cost = count * 3
            print("Carve: " + name)
            print("Runes: " + str(count))
            print("Cost: " + str(cost) + " silver")
          `
        ],
        wrongSolutions: [
          // No brackets after .upper, so the method never runs.
          py`
            name = input("Whose name shall we carve? ")
            print("Carve:", name.upper)
            print("Runes:", len(name))
            print("Cost:", len(name) * 3, "silver")
          `,
          // .upper() is called, but its result is thrown away.
          py`
            name = input("Whose name shall we carve? ")
            name.upper()
            print("Carve:", name)
            print("Runes:", len(name))
            print("Cost:", len(name) * 3, "silver")
          `,
          // The calculations are inside the quotes.
          py`
            name = input("Whose name shall we carve? ")
            print("Carve:", name.upper())
            print("Runes: len(name)")
            print("Cost: len(name) * 3 silver")
          `
        ],
        tests: TRIAL_HELPERS + py`
          def check_order(name):
              run = run_again([name])
              must_ask(run, "the name")
              label = "For " + name
              count = len(name)
              want = ["Carve: " + name.upper(), "Runes: " + str(count), "Cost: " + str(count * 3) + " silver"]
              lines = run.lines
              for line in lines:
                  if "<built-in method" in line:
                      fail(label + ", your spell printed " + short(line) + ". That's Python describing the method "
                           "instead of running it. Add brackets: " + code("name.upper()") + ".")
                  if "len(" in line or ".upper(" in line:
                      fail(label + ", your spell printed " + short(line) + ". The code is inside the quotes, so "
                           "Python printed it as text. Put calculations outside the quotes (or inside the curly "
                           "braces of an f-string).")
              quoted = _re.search(r"len\(\s*([\"'])(\w*)\1\s*\)", source)
              if quoted and lines[1:3] != want[1:3]:
                  wrong = next((line for line, wanted in zip(lines[1:3], want[1:3]) if line != wanted), None)
                  fail(label + ", your spell printed " + (short(wrong) if wrong else "too few lines")
                       + ". " + code("len(" + quoted.group(1) + quoted.group(2) + quoted.group(1) + ")")
                       + " has quotes, so it counts the letters of the word " + quoted.group(2) + " itself (always "
                       + str(len(quoted.group(2))) + "). Leave the quotes off the variable: " + code("len(name)") + ".")
              if lines and lines[0] == "Carve: " + name and name != name.upper():
                  fail(label + ", your spell printed " + short(lines[0]) + ", but the stonemason only carves capitals. "
                       + code("name.upper()") + " gives you a new string in capitals; it doesn't change "
                       + code("name") + " itself. Print it directly, or store it: " + code("name = name.upper()") + ".")
              expect_lines(lines, want, label, after_input=True)


          @test("Morgana's order: MORGANA, 7 runes, 21 silver")
          def _():
              check_order("Morgana")


          @test("Odd capitals are carved properly: pIp")
          def _():
              check_order("pIp")


          @test("A long name: Bartholomew")
          def _():
              check_order("Bartholomew")


          @test("The shortest name of all: Q")
          def _():
              check_order("Q")
        `,
        scene: { icon: "🪨", successIcon: "⚡", successText: "Lightning crackles across the Rune Stone, and your name appears among the great wizards!", effect: "lightning" }
      }
    ]
  });
})();
