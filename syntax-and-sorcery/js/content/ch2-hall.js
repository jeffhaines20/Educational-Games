/*
 * Chapter 2 — The Hall of Forking Paths (easy → medium)
 * Concepts: booleans, comparisons, if/elif/else, and/or/not, for + range,
 * while, accumulators, break, flags, nested loops.
 *
 * Every spell here reads input(), so the trials re-run the whole program with
 * run_again([...]) (defined in TRIAL_HELPERS below, the same helper as in
 * ch1-tower.js). It answers input() WITHOUT echoing prompts or answers, and
 * .lines holds only what the spell printed after its last input() call, so
 * players may word their prompts however they like.
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


    def lonely_value(example):
        """Explain an and/or with a bare value on one side (e.g. x == "a" or "b"), or return ""."""
        for node in _ast.walk(_ast.parse(source)):
            if isinstance(node, _ast.BoolOp):
                for value in node.values:
                    if isinstance(value, _ast.Constant):
                        word = "and" if isinstance(node.op, _ast.And) else "or"
                        return (" Careful: each side of " + code(word) + " must be a complete comparison. A plain "
                                "value such as " + code(_ast.unparse(value)) + " on its own always counts as True, "
                                "so write the comparison out in full, like " + code(example) + ".")
        return ""


    def uses_or():
        return any(isinstance(node, _ast.BoolOp) and isinstance(node.op, _ast.Or)
                   for node in _ast.walk(_ast.parse(source)))
    # ---------------------------------------------------------------------------
  `;

  SS.defineChapter({
    id: "hall",
    order: 2,
    title: "The Hall of Forking Paths",
    subtitle: "Choices and repetition",
    icon: "🚪",
    concepts: ["booleans", "comparisons", "if / elif / else", "and / or / not", "for loops", "range()", "while loops", "break", "nested loops"],
    intro: [
      "Below the tower spreads the Hall of Forking Paths: a maze of doors, corridors and staircases where every path splits in two. Choosing the right way has always been part of an apprentice's training.",
      "Lately, though, the choosing has gone wrong. **Glitch** 👾, a gremlin who thinks a scrambled spell is the funniest thing in the world, has been scampering through the hall and jinxing everything in sight.",
      "To put things right, your spells must learn two new tricks: making decisions, and repeating themselves."
    ],
    outro: [
      "With a satisfied clunk, the Prime Gate swings open. Behind you, the doors are polite again, the candles burn bright and the well is counting its coins. From somewhere up in the rafters comes an indignant squeak: Glitch is not used to losing.",
      "Beyond the gate, candlelight flickers in a round, quiet chamber. \"The Summoning Circle,\" says Ada. \"There you'll learn to bind a spell to a name, and summon it whenever you need it.\""
    ],
    challenges: [
      // ------------------------------------------------------------------ 1
      {
        id: "hall-talking-door",
        title: "The Talking Door",
        difficulty: "easy",
        concepts: ["if / else", "==", "booleans"],
        story: [
          "The first door in the hall has a face, a doorknob for a nose and very strong opinions. Glitch has jinxed its brain: it can no longer tell the password, **pickled newt**, from any other words, so it won't open for anyone.",
          "\"Give it a proper brain,\" says Ada. \"Open for the password, firmly shut for anything else.\""
        ],
        task: [
          "Read the password with `input()`. If it is exactly `pickled newt`, print:",
          { output: "The door swings open!" },
          "For anything else, print:",
          { output: "The door stays shut." },
          "Exactly means exactly: `Pickled Newt` (with capitals) is **not** the password. When you cast, the door hears `pickled newt`; the trials try other words too."
        ],
        lesson: [
          "A **comparison** asks Python a question. The answer is a **boolean**: either `True` or `False`.",
          { code: py`
            print(3 > 2)
            print("cat" == "cat")
            print("cat" == "Cat")
            print("cat" != "dog")
          `, output: "True\nTrue\nFalse\nTrue" },
          "`==` asks \"are these equal?\" and `!=` asks \"are these different?\". Don't confuse `==` with a single `=`, which stores a value in a variable.",
          "An `if` statement runs its block only when its condition is `True`. The block under `else` runs when it's `False`:",
          { code: py`
            weather = input("Weather? ")
            if weather == "rain":
                print("Take an umbrella.")
            else:
                print("Enjoy the sunshine!")
            print("Have a lovely day.")
          `, output: "Weather? rain\nTake an umbrella.\nHave a lovely day." },
          "Notice the colon `:` at the end of the `if` and `else` lines, and the **indentation**: the lines that belong to a branch are pushed right by 4 spaces. The last line isn't indented, so it runs either way."
        ],
        inputs: ["pickled newt"],
        starter: py`
          password = input("Speak the password: ")

          # If the password is exactly pickled newt, open the door.
          # Otherwise, keep it shut.

        `,
        hints: [
          "Compare the password with `==`: `password == \"pickled newt\"` is `True` only for exactly the right words.",
          "Write `if password == \"pickled newt\":` with an indented `print` underneath, then `else:` with another indented `print`.",
          [
            "Like this:",
            { code: py`
              if password == "pickled newt":
                  print("The door swings open!")
              else:
                  print("The door stays shut.")
            ` }
          ]
        ],
        solution: py`
          password = input("Speak the password: ")
          if password == "pickled newt":
              print("The door swings open!")
          else:
              print("The door stays shut.")
        `,
        altSolutions: [
          py`
            word = input()
            if word != "pickled newt":
                print("The door stays shut.")
            else:
                print("The door swings open!")
          `,
          py`
            password = input("Password: ")
            if password == "pickled newt":
                print("The door swings open!")
            if password != "pickled newt":
                print("The door stays shut.")
          `
        ],
        wrongSolutions: [
          // No else: the "shut" line always runs.
          py`
            password = input("Speak the password: ")
            if password == "pickled newt":
                print("The door swings open!")
            print("The door stays shut.")
          `,
          // Ignores capitals, but the door is precise.
          py`
            password = input("Speak the password: ")
            if password.lower() == "pickled newt":
                print("The door swings open!")
            else:
                print("The door stays shut.")
          `,
          // Compares with the wrong capitals, so it never opens.
          py`
            password = input("Speak the password: ")
            if password == "Pickled newt":
                print("The door swings open!")
            else:
                print("The door stays shut.")
          `
        ],
        tests: TRIAL_HELPERS + py`
          OPEN = "The door swings open!"
          SHUT = "The door stays shut."


          def text_vs_text():
              """A comparison between two pieces of quoted text, such as "password" == "pickled newt"."""
              for node in _ast.walk(_ast.parse(source)):
                  if (isinstance(node, _ast.Compare) and isinstance(node.left, _ast.Constant)
                          and isinstance(node.left.value, str)
                          and all(isinstance(side, _ast.Constant) and isinstance(side.value, str)
                                  for side in node.comparators)):
                      return node.left.value
              return None


          def missing_else():
              """'elif' or 'if' when the spell's decision has no else branch, otherwise None."""
              for node in _ast.parse(source).body:
                  if isinstance(node, _ast.If):
                      branch, elifs = node, 0
                      while len(branch.orelse) == 1 and isinstance(branch.orelse[0], _ast.If):
                          branch, elifs = branch.orelse[0], elifs + 1
                      if not branch.orelse:
                          return "elif" if elifs else "if"
              return None


          def check_door(password, want):
              run = run_again([password])
              must_ask(run, "the password")
              label = "With the password " + short(password)
              if OPEN in run.lines and SHUT in run.lines:
                  fail(label + ", both messages appeared! Put the second " + code("print") + " under "
                       + code("else:") + ", so that only one of them runs.")
              if run.lines == [want]:
                  return
              if not uses_syntax("if"):
                  fail(label + ", your spell printed " + (short(run.lines[0]) if run.lines else "nothing")
                       + ". The door has to decide: use " + code("if") + " to open it only when "
                       + code('password == "pickled newt"') + ", and " + code("else:") + " to keep it shut otherwise.")
              quoted = text_vs_text()
              if quoted is not None:
                  fail(label + ", the door got it wrong. Your " + code("if") + " compares two pieces of fixed text: in "
                       "quotes, " + code('"' + quoted + '"') + " is just a word, not your variable, so the answer "
                       "never changes. Leave the quotes off the variable's name: " + code('if password == "pickled newt":') + ".")
              if want == OPEN and run.lines == [SHUT]:
                  fail(label + ", the door stayed shut. Check the password in your " + code("if") + ": it must be "
                       "exactly " + code('"pickled newt"') + ", all in small letters with one space.")
              if want == SHUT and run.lines == [OPEN]:
                  warning = lonely_value('password == "a" or password == "b"')
                  if warning:
                      fail(label + ", the door opened." + warning)
                  changes_case = any(uses_call(name) for name in ("lower", "upper", "casefold", "capitalize", "title"))
                  if password.lower() == "pickled newt" and changes_case:
                      fail(label + ", the door opened, but the password is " + code("pickled newt") + " in small "
                           "letters. The door is precise: compare with " + code("==") + " without changing the capitals.")
              if want == SHUT and not run.lines and missing_else() == "elif":
                  fail(label + ", your spell didn't print anything: your " + code("elif") + " only catches one "
                       "particular password. Use " + code("else:") + " to catch every other word.")
              if want == SHUT and not run.lines and missing_else() == "if":
                  fail(label + ", your spell didn't print anything. Add an " + code("else:") + " branch that prints "
                       + short(SHUT) + ".")
              expect_lines(run.lines, [want], label, after_input=True)


          @test("The right password opens the door")
          def _():
              check_door("pickled newt", OPEN)


          @test("A wrong password keeps it shut")
          def _():
              check_door("open sesame", SHUT)


          @test("Capitals count: Pickled Newt is not the password")
          def _():
              check_door("Pickled Newt", SHUT)


          @test("Nearly right isn't right: pickled newts")
          def _():
              check_door("pickled newts", SHUT)
        `,
        scene: { icon: "🚪", successIcon: "🗝️", successText: "With a satisfied creak, the door swings open and gives you a wink.", effect: "sparkle" }
      },

      // ------------------------------------------------------------------ 2
      {
        id: "hall-dragon-egg",
        title: "The Dragon Egg",
        difficulty: "easy",
        concepts: ["if / elif / else", "< <= > >=", "and / or"],
        story: [
          "Behind the second door, a dragon egg rests in a nest of glowing embers. Glitch has scrambled the nest's thermometer, so nobody can tell whether the egg is warm enough, and a chilly dragon hatches grumpy.",
          "\"Teach the thermometer to speak,\" says Ada. \"Precisely, mind. The edges matter.\""
        ],
        task: [
          "Read the nest's temperature (a whole number) with `input()`, then print exactly one of these messages:",
          { list: [
            "`Too cold` if the temperature is below 30",
            "`Just right` if it is from 30 to 40, including both 30 and 40",
            "`Too hot` if it is above 40"
          ] },
          "For example, for **35** print `Just right`. Temperatures can be negative too: dragons nest in some very odd places."
        ],
        lesson: [
          "Python has six comparison operators: `<` (less than), `>` (greater than), `<=` (less than or equal to), `>=` (greater than or equal to), `==` (equal) and `!=` (not equal). So `5 <= 5` is `True`, but `5 < 5` is `False`.",
          "When there are more than two possibilities, add `elif` branches (short for \"else if\"). Python checks the conditions from top to bottom and runs only the **first** branch whose condition is `True`; `else` catches everything that's left:",
          { code: py`
            score = int(input("Score? "))
            if score >= 90:
                print("Gold")
            elif score >= 50:
                print("Silver")
            else:
                print("Try again")
          `, output: "Score? 75\nSilver" },
          "75 is not `>= 90`, so Python moves on. It is `>= 50`, so Python prints Silver and skips the rest.",
          "You can combine conditions with `and` (both must be true), `or` (at least one must be true) and `not` (turns `True` into `False`, and back):",
          { code: py`
            hour = 14
            if hour >= 9 and hour <= 17:
                print("The library is open.")
            if hour < 9 or hour > 17:
                print("The library is closed.")
          `, output: "The library is open." },
          { warning: "Each side of `and` and `or` must be a complete comparison: write `temp >= 30 and temp <= 40`, not `temp >= 30 and <= 40`." },
          { tip: "Python also understands `9 <= hour <= 17`. And remember `int()`: `input()` gives text, so `\"35\" < 40` is an error, and `\"0\" == 0` is quietly `False`." }
        ],
        inputs: ["35"],
        starter: py`
          temp = int(input("Nest temperature: "))

          # Print Too cold, Just right or Too hot.

        `,
        hints: [
          "There are three possibilities, so you need `if`, `elif` and `else`. Check them in order, from coldest to hottest.",
          "Start with `if temp < 30:` for too cold. Then `elif temp <= 40:` catches everything from 30 to 40, because anything colder was already caught by the `if`.",
          [
            "Almost there:",
            { code: py`
              if temp < 30:
                  print("Too cold")
              elif temp <= 40:
                  print("Just right")
              # ...and else: for the last message
            ` }
          ]
        ],
        solution: py`
          temp = int(input("Nest temperature: "))
          if temp < 30:
              print("Too cold")
          elif temp <= 40:
              print("Just right")
          else:
              print("Too hot")
        `,
        altSolutions: [
          py`
            t = int(input())
            if t >= 30 and t <= 40:
                print("Just right")
            elif t > 40:
                print("Too hot")
            else:
                print("Too cold")
          `,
          py`
            temp = int(input("Temperature? "))
            if temp < 30:
                print("Too cold")
            if 30 <= temp <= 40:
                print("Just right")
            if temp > 40:
                print("Too hot")
          `
        ],
        wrongSolutions: [
          // < 40 leaves 40 out of "Just right".
          py`
            temp = int(input("Nest temperature: "))
            if temp < 30:
                print("Too cold")
            elif temp < 40:
                print("Just right")
            else:
                print("Too hot")
          `,
          // <= 30 makes 30 "Too cold".
          py`
            temp = int(input("Nest temperature: "))
            if temp <= 30:
                print("Too cold")
            elif temp <= 40:
                print("Just right")
            else:
                print("Too hot")
          `,
          // Two separate ifs: a cold egg gets two messages.
          py`
            temp = int(input("Nest temperature: "))
            if temp < 30:
                print("Too cold")
            if temp <= 40:
                print("Just right")
            else:
                print("Too hot")
          `
        ],
        tests: TRIAL_HELPERS + py`
          MESSAGES = ("Too cold", "Just right", "Too hot")


          def verdict(temp):
              if temp < 30:
                  return "Too cold"
              if temp <= 40:
                  return "Just right"
              return "Too hot"


          def check_egg(temp):
              run = run_again([str(temp)])
              must_ask(run, "the temperature")
              want = verdict(temp)
              label = "At " + str(temp) + " degrees"
              said = [line for line in run.lines if line in MESSAGES]
              if len(said) > 1:
                  fail(label + ", the thermometer said " + " and ".join(short(line) for line in said)
                       + ". It should say only " + short(want) + ". Use " + code("elif") + " and " + code("else")
                       + " so that just one message is printed.")
              if len(run.lines) == 1 and run.lines[0] in MESSAGES and run.lines[0] != want:
                  warning = lonely_value("temp >= 30 and temp <= 40")
                  if warning:
                      fail(label + ", the thermometer said " + short(run.lines[0]) + " instead of " + short(want)
                           + "." + warning)
                  if run.lines[0] == "Just right" and uses_or():
                      fail(label + ", the thermometer said " + short(run.lines[0]) + " instead of " + short(want)
                           + ". With " + code("or") + ", only one side needs to be True, so a condition like "
                           + code("temp >= 30 or temp <= 40") + " is True for every temperature. To require both "
                           "sides, use " + code("and") + ".")
              if temp in (30, 40) and len(run.lines) == 1 and run.lines[0] in MESSAGES and run.lines[0] != want:
                  fail(label + ", the thermometer said " + short(run.lines[0]) + ", but " + str(temp) + " counts as "
                       "just right. Check your comparison: " + code("<=") + " and " + code(">=") + " include the "
                       "edge number itself; " + code("<") + " and " + code(">") + " don't.")
              expect_lines(run.lines, [want], label, after_input=True)


          @test("35 degrees is Just right")
          def _():
              check_egg(35)


          @test("12 degrees is Too cold, and so is -5")
          def _():
              check_egg(12)
              check_egg(-5)


          @test("50 degrees is Too hot")
          def _():
              check_egg(50)


          @test("The edges are Just right: 30 and 40")
          def _():
              check_egg(30)
              check_egg(40)


          @test("Just past the edges: 29 is Too cold, 41 is Too hot")
          def _():
              check_egg(29)
              check_egg(41)
        `,
        scene: { icon: "🥚", successIcon: "🐣", successText: "The embers settle into a cosy glow, and the egg gives a happy wobble.", effect: "shake" }
      },

      // ------------------------------------------------------------------ 3
      {
        id: "hall-candle-corridor",
        title: "The Candle Corridor",
        difficulty: "easy",
        concepts: ["for loops", "range()"],
        story: [
          "Glitch has blown out every candle in the long corridor, and now it's so dark that Pip keeps bumping into the walls. Worse, the corridor grows and shrinks with Glitch's mood.",
          "\"Then we need a spell for any number of candles,\" says Ada. \"Light them one by one, and count them as you go.\""
        ],
        task: [
          "Read the number of candles, `n`, with `input()`. Light them in order, printing one line per candle, then a final line. For **3** candles, print exactly:",
          { output: "Candle 1 is lit\nCandle 2 is lit\nCandle 3 is lit\nThe corridor glows!" },
          "If `n` is 0, there's nothing to light, so only the final line appears."
        ],
        lesson: [
          "A **loop** repeats lines of code. A `for` loop runs its indented block once for each value it is given, and stores the current value in a **loop variable**:",
          { code: py`
            for step in range(4):
                print("Step", step)
            print("Done!")
          `, output: "Step 0\nStep 1\nStep 2\nStep 3\nDone!" },
          "`range(4)` produces the numbers 0, 1, 2 and 3: it starts at 0 and stops **before** 4. Give it a start and an end to count from somewhere else:",
          { list: [
            "`range(1, 5)` gives 1, 2, 3, 4 (it still stops before the end).",
            "`range(2, 11, 2)` gives 2, 4, 6, 8, 10 (the third number is the step).",
            "`range(0)` gives no numbers at all, so the loop's block never runs."
          ] },
          "Only the indented lines repeat. The un-indented `print(\"Done!\")` runs once, after the loop has finished.",
          { tip: "The end of a range can be a variable or a calculation: `range(1, total + 1)` counts from 1 up to and including `total`." }
        ],
        inputs: ["3"],
        starter: py`
          n = int(input("How many candles? "))

          # Light candles 1 to n, then print: The corridor glows!

        `,
        hints: [
          "Use a `for` loop over a `range`, printing one candle on each round.",
          "To count 1, 2, …, n, use `range(1, n + 1)`: the end number itself is never included.",
          "Inside the loop: `print(f\"Candle {i} is lit\")`. After the loop, not indented: `print(\"The corridor glows!\")`."
        ],
        solution: py`
          n = int(input("How many candles? "))
          for i in range(1, n + 1):
              print(f"Candle {i} is lit")
          print("The corridor glows!")
        `,
        altSolutions: [
          py`
            n = int(input())
            for i in range(n):
                print("Candle", i + 1, "is lit")
            print("The corridor glows!")
          `,
          py`
            n = int(input("Candles: "))
            candle = 1
            while candle <= n:
                print("Candle " + str(candle) + " is lit")
                candle = candle + 1
            print("The corridor glows!")
          `
        ],
        wrongSolutions: [
          // range(n) starts at 0.
          py`
            n = int(input("How many candles? "))
            for i in range(n):
                print(f"Candle {i} is lit")
            print("The corridor glows!")
          `,
          // range(1, n) stops one candle short.
          py`
            n = int(input("How many candles? "))
            for i in range(1, n):
                print(f"Candle {i} is lit")
            print("The corridor glows!")
          `,
          // The last line is indented, so it repeats.
          py`
            n = int(input("How many candles? "))
            for i in range(1, n + 1):
                print(f"Candle {i} is lit")
                print("The corridor glows!")
          `
        ],
        tests: TRIAL_HELPERS + py`
          GLOW = "The corridor glows!"


          def check_candles(n):
              run = run_again([str(n)])
              must_ask(run, "the number of candles")
              label = "With " + str(n) + (" candle" if n == 1 else " candles")
              want = ["Candle " + str(i) + " is lit" for i in range(1, n + 1)] + [GLOW]
              lines = run.lines
              if lines and lines[0] == "Candle 0 is lit":
                  fail(label + ", your first candle is number 0. " + code("range(n)") + " starts counting at 0; "
                       "to count from 1 to n, use " + code("range(1, n + 1)") + ".")
              for line in lines:
                  if _re.fullmatch(r"Candle [A-Za-z_]\w* is lit", line):
                      fail(label + ", your spell printed " + short(line) + ": the name of the loop variable instead "
                           "of its value. Leave it out of the quotes, or put it inside the curly braces of an "
                           "f-string: " + code('f"Candle {i} is lit"') + ".")
              if lines.count(GLOW) > 1:
                  fail(label + ", " + short(GLOW) + " appeared " + str(lines.count(GLOW)) + " times. Un-indent "
                       "that " + code("print") + " so that it runs once, after the loop has finished.")
              last = "Candle " + str(n) + " is lit"
              before_last = "Candle " + str(n - 1) + " is lit"
              if n >= 1 and last not in lines and (lines == [GLOW] if n == 1 else (GLOW in lines and before_last in lines)):
                  fail(label + ", the last candle (" + short(last) + ") never got lit. " + code("range")
                       + " stops just before its end number, so use " + code("n + 1") + " as the end.")
              expect_lines(lines, want, label, after_input=True)


          @test("3 candles are lit in order, then the corridor glows")
          def _():
              check_candles(3)


          @test("A longer corridor: 7 candles")
          def _():
              check_candles(7)


          @test("A single candle")
          def _():
              check_candles(1)


          @test("An empty corridor: 0 candles, just the glow")
          def _():
              check_candles(0)
        `,
        scene: { icon: "🕯️", successIcon: "🔥", successText: "One by one the candles flare up, and the corridor glows. Pip stops bumping into walls.", effect: "fire" }
      },

      // ------------------------------------------------------------------ 4
      {
        id: "hall-wishing-well",
        title: "The Wishing Well",
        difficulty: "easy",
        concepts: ["while loops", "accumulators"],
        story: [
          "In the middle of the hall stands an old wishing well. Glitch has enchanted it to grant wishes only to someone who knows exactly how many coins are inside. Apprentices drop them in by the handful, and nobody is counting.",
          "\"A spell that keeps a running total,\" says Ada, \"until someone says 0.\""
        ],
        task: [
          "Read numbers with `input()`, one at a time. Each one is a handful of coins dropped into the well. When the number is **0**, stop reading and print the total. For the handfuls 5, 12, 8 and then 0, print:",
          { output: "The well holds 25 coins" },
          "If the very first number is 0, the well holds 0 coins. When you cast, the well is given 5, 12, 8 and 0."
        ],
        lesson: [
          "A `for` loop is great when you know how many rounds you need. When you don't, use a `while` loop: it repeats its block **as long as** its condition is `True`, checking the condition before every round.",
          { code: py`
            energy = 10
            while energy > 0:
                print("Zap! Energy left:", energy)
                energy = energy - 4
            print("Time for a nap.")
          `, output: "Zap! Energy left: 10\nZap! Energy left: 6\nZap! Energy left: 2\nTime for a nap." },
          "Something inside the loop must change the condition, or the loop will never stop!",
          "To add things up, use an **accumulator**: a variable that starts at 0 and grows on every round. This loop keeps asking until it hears the word `stop`:",
          { code: py`
            letters = 0
            word = input("Word? ")
            while word != "stop":
                letters = letters + len(word)
                word = input("Word? ")
            print("Letters:", letters)
          `, output: "Word? owl\nWord? frog\nWord? stop\nLetters: 7" },
          "Notice the pattern: read the first value **before** the loop, then read the next one at the **end** of each round.",
          { warning: "`input()` gives text, and text never equals a number: `\"0\" != 0` is `True`. So `while coins != 0:` never stops while `coins` holds text. Convert it first: `coins = int(input(\"Coins: \"))`." },
          { tip: "`total += 5` is a shortcut for `total = total + 5`." }
        ],
        inputs: ["5", "12", "8", "0"],
        starter: py`
          total = 0

          # Keep reading handfuls of coins until someone types 0,
          # then print the total.

        `,
        hints: [
          "Read the first handful before the loop, as a number: `coins = int(input(\"Coins: \"))`. Then loop `while coins != 0:`.",
          "Inside the loop, add the handful to the total, then read the next handful. The condition is then checked again with the new number.",
          [
            "Nearly there:",
            { code: py`
              while coins != 0:
                  total = total + coins
                  coins = int(input("Coins: "))
              print("The well holds", total, "coins")
            ` }
          ]
        ],
        solution: py`
          total = 0
          coins = int(input("Coins: "))
          while coins != 0:
              total = total + coins
              coins = int(input("Coins: "))
          print("The well holds", total, "coins")
        `,
        altSolutions: [
          py`
            total = 0
            while True:
                coins = int(input())
                if coins == 0:
                    break
                total += coins
            print(f"The well holds {total} coins")
          `,
          py`
            total = 0
            done = False
            while not done:
                handful = int(input("Handful: "))
                if handful == 0:
                    done = True
                else:
                    total = total + handful
            print("The well holds " + str(total) + " coins")
          `
        ],
        wrongSolutions: [
          // Reads the next handful before adding, so the first one is never counted.
          py`
            total = 0
            coins = int(input())
            while coins != 0:
                coins = int(input())
                total = total + coins
            print("The well holds", total, "coins")
          `,
          // The total is reset on every round.
          py`
            coins = int(input())
            while coins != 0:
                total = 0
                total = total + coins
                coins = int(input())
            print("The well holds", total, "coins")
          `,
          // An if only runs once.
          py`
            total = 0
            coins = int(input())
            if coins != 0:
                total = total + coins
            print("The well holds", total, "coins")
          `
        ],
        tests: TRIAL_HELPERS + py`
          def check_well(handfuls, note=""):
              run = run_again([str(h) for h in handfuls])
              must_ask(run, "the handfuls of coins")
              coins = handfuls[:handfuls.index(0)]
              total = sum(coins)
              want = "The well holds " + str(total) + " coins"
              label = "With the handfuls " + ", ".join(str(h) for h in handfuls) + note
              if not run.lines:
                  fail(label + ", your spell didn't print anything after reading the last handful. After the loop, "
                       "print " + short(want) + ".")
              got = run.lines[-1]
              if got == want:
                  return
              if "total" in got.split() and "total" not in want:
                  fail(label + ", your spell printed " + short(got) + ": the word total instead of the number stored "
                       "in it. Leave the variable out of the quotes: " + code('print("The well holds", total, "coins")')
                       + ".")
              found = _re.findall(r"-?\d+", got)
              number = int(found[0]) if len(found) == 1 else None
              if number == 0 and total > 0:
                  fail(label + ", your spell says " + short(got) + ": not a single handful was counted. Inside the "
                       "loop, add each handful to the total (for example " + code("total = total + coins")
                       + ") before you read the next one.")
              if number is not None and len(coins) > 1:
                  if number == len(coins):
                      fail(label + ", your spell says " + short(got) + ": it counted the handfuls ("
                           + str(len(coins)) + ") instead of adding up the coins in them. Add each handful's number "
                           "to the total: " + code("total = total + coins") + ".")
                  if number == total - coins[0]:
                      fail(label + ", your spell says " + short(got) + ": the first handful (" + str(coins[0])
                           + ") was never counted. Add each handful to the total before you read the next one.")
                  if number == coins[0]:
                      fail(label + ", your spell says " + short(got) + ": only the first handful was counted. Use a "
                           + code("while") + " loop (an " + code("if") + " only checks once), and read the next "
                           "handful inside the loop.")
                  if number == coins[-1]:
                      fail(label + ", your spell says " + short(got) + ": only the last handful was counted. Set "
                           + code("total = 0") + " once, before the loop, so the total isn't reset on every round.")
              fail(label + ", the last line should be " + short(want) + ", but your spell printed " + short(got)
                   + "." + near_miss(want, got))


          @test("Handfuls 5, 12, 8 and then 0: 25 coins")
          def _():
              check_well([5, 12, 8, 0])


          @test("A single handful of 9")
          def _():
              check_well([9, 0])


          @test("An empty well: 0 straight away")
          def _():
              check_well([0])


          @test("Nine handfuls, from 11 up to 99: 495 coins")
          def _():
              check_well([11, 22, 33, 44, 55, 66, 77, 88, 99, 0])


          @test("The well stops listening at the first 0")
          def _():
              check_well([4, 0, 100, 0], " (it should stop at the first 0)")
        `,
        scene: { icon: "🪣", successIcon: "✨", successText: "The well counts every coin, bubbles happily and whispers: \"Make a wish!\"", effect: "bubble" }
      },

      // ------------------------------------------------------------------ 5
      {
        id: "hall-familiar-chorus",
        title: "The Familiar Chorus",
        difficulty: "medium",
        concepts: ["for + if", "% (remainder)", "and"],
        story: [
          "In the hall's echoing gallery, the familiars are rehearsing their chorus. The owls hoot on every 3rd beat, the frogs croak on every 5th, and when both land on the same beat they sing together. Glitch has scrambled the sheet music, and the result is pandemonium.",
          "\"Write out the score again,\" sighs Ada, \"beat by beat.\""
        ],
        task: [
          "Read the number of beats, `n`, with `input()`. For each beat from 1 to `n`, print one line:",
          { list: [
            "`HootCroak` if the beat is a multiple of both 3 and 5",
            "`Hoot` if it's a multiple of 3",
            "`Croak` if it's a multiple of 5",
            "otherwise, the beat number itself"
          ] },
          "For **15** beats, print exactly:",
          { output: "1\n2\nHoot\n4\nCroak\nHoot\n7\n8\nHoot\nCroak\n11\nHoot\n13\n14\nHootCroak" }
        ],
        lesson: [
          "The `%` operator gives the **remainder** of a division. One number is a **multiple** of another when the remainder is 0:",
          { code: py`
            print(12 % 4)        # 12 is exactly 3 fours
            print(14 % 4)        # 14 is 3 fours, with 2 left over
            print(14 % 4 == 0)   # so 14 is not a multiple of 4
          `, output: "0\n2\nFalse" },
          "So `n % 2 == 0` means \"n is even\", and `n % 10 == 0` means \"n is a multiple of 10\".",
          "An `if` inside a loop makes a fresh decision on every round:",
          { code: py`
            for n in range(1, 5):
                if n % 2 == 0:
                    print(n, "is even")
                else:
                    print(n, "is odd")
          `, output: "1 is odd\n2 is even\n3 is odd\n4 is even" },
          { warning: "Order matters! An `if`/`elif` chain stops at the **first** condition that is `True`. If you test \"multiple of 3\" before \"multiple of both 3 and 5\", a beat like 15 never reaches the second test." }
        ],
        inputs: ["15"],
        starter: py`
          n = int(input("How many beats? "))

          # For each beat from 1 to n, print HootCroak, Hoot, Croak or the beat number.

        `,
        hints: [
          "Loop over the beats with `for beat in range(1, n + 1):`, and decide inside the loop what to print for each one.",
          "Check the \"both\" case first: `if beat % 3 == 0 and beat % 5 == 0:`. Then use `elif` for 3 and for 5, and `else` for the number.",
          [
            "The start of the loop:",
            { code: py`
              for beat in range(1, n + 1):
                  if beat % 3 == 0 and beat % 5 == 0:
                      print("HootCroak")
                  elif beat % 3 == 0:
                      print("Hoot")
                  # ...then the same idea for 5, and else: print(beat)
            ` }
          ]
        ],
        solution: py`
          n = int(input("How many beats? "))
          for beat in range(1, n + 1):
              if beat % 3 == 0 and beat % 5 == 0:
                  print("HootCroak")
              elif beat % 3 == 0:
                  print("Hoot")
              elif beat % 5 == 0:
                  print("Croak")
              else:
                  print(beat)
        `,
        altSolutions: [
          py`
            n = int(input())
            for i in range(1, n + 1):
                if i % 15 == 0:
                    print("HootCroak")
                elif i % 3 == 0:
                    print("Hoot")
                elif i % 5 == 0:
                    print("Croak")
                else:
                    print(i)
          `,
          py`
            n = int(input("Beats: "))
            beat = 1
            while beat <= n:
                song = ""
                if beat % 3 == 0:
                    song = song + "Hoot"
                if beat % 5 == 0:
                    song = song + "Croak"
                if song == "":
                    song = str(beat)
                print(song)
                beat += 1
          `
        ],
        wrongSolutions: [
          // Tests 3 before "both", so 15 only hoots.
          py`
            n = int(input("How many beats? "))
            for beat in range(1, n + 1):
                if beat % 3 == 0:
                    print("Hoot")
                elif beat % 5 == 0:
                    print("Croak")
                elif beat % 15 == 0:
                    print("HootCroak")
                else:
                    print(beat)
          `,
          // range(n) starts at beat 0 and stops one beat early.
          py`
            n = int(input("How many beats? "))
            for beat in range(n):
                if beat % 3 == 0 and beat % 5 == 0:
                    print("HootCroak")
                elif beat % 3 == 0:
                    print("Hoot")
                elif beat % 5 == 0:
                    print("Croak")
                else:
                    print(beat)
          `,
          // Separate ifs: some beats print two lines.
          py`
            n = int(input("How many beats? "))
            for beat in range(1, n + 1):
                if beat % 3 == 0:
                    print("Hoot")
                if beat % 5 == 0:
                    print("Croak")
                else:
                    print(beat)
          `
        ],
        tests: TRIAL_HELPERS + py`
          def song(n):
              lines = []
              for beat in range(1, n + 1):
                  if beat % 15 == 0:
                      lines.append("HootCroak")
                  elif beat % 3 == 0:
                      lines.append("Hoot")
                  elif beat % 5 == 0:
                      lines.append("Croak")
                  else:
                      lines.append(str(beat))
              return lines


          def check_song(n):
              run = run_again([str(n)])
              must_ask(run, "the number of beats")
              label = "With " + str(n) + (" beat" if n == 1 else " beats")
              want = song(n)
              lines = run.lines
              if not lines:
                  fail(label + ", your spell didn't print anything after reading the number of beats. It should "
                       "print one line for every beat, from 1 to " + str(n) + ".")
              for line in lines:
                  if len(line.split()) >= 3:
                      fail(label + ", your spell printed " + short(line) + ": several beats on one line. Print each "
                           "beat on a line of its own, with one " + code("print()") + " per beat.")
              if lines[0] == "0" or lines[:2] == ["HootCroak", "1"]:
                  fail(label + ", the song starts at beat 0. " + code("range(n)") + " starts counting at 0; to count "
                       "the beats from 1 to n, use " + code("range(1, n + 1)") + ".")
              for index, printed in enumerate(lines):
                  wanted = want[index] if index < len(want) else None
                  if wanted == printed:
                      continue
                  beat = index + 1
                  # The line after a correct one may belong to the same beat (index is that beat's number).
                  if index > 0 and lines[index - 1] == want[index - 1] and (
                          printed == str(index) or (want[index - 1] == "HootCroak" and printed in ("Hoot", "Croak"))):
                      advice = ("turn the second " + code("if") + " into " + code("elif") + " so only one branch runs."
                                if want[index - 1] == "HootCroak" else
                                "use " + code("elif") + " and " + code("else") + " so only one branch runs.")
                      fail(label + ", beat " + str(index) + " printed two lines (" + short(lines[index - 1]) + " and "
                           + short(printed) + "): " + advice)
                  if wanted is None:
                      fail(label + ", your spell printed too many lines: the song should stop after beat " + str(n) + ".")
                  if wanted == "HootCroak" and lines[index:index + 2] == ["Hoot", "Croak"]:
                      fail(label + ", beat " + str(beat) + " printed " + short("Hoot") + " and " + short("Croak")
                           + " on two lines. Print the single word " + short("HootCroak") + " with one " + code("print()") + ".")
                  message = (label + ", beat " + str(beat) + " should be " + short(wanted) + ", but your spell printed "
                             + short(printed) + ".")
                  if printed == "HootCroak":
                      warning = lonely_value("beat % 3 == 0 and beat % 5 == 0")
                      if warning:
                          message += warning
                      elif uses_or():
                          message += (" With " + code("or") + ", only one side needs to be True, so a beat like "
                                      + str(beat) + " counts as \"both\". Use " + code("and") + ": "
                                      + code("beat % 3 == 0 and beat % 5 == 0") + ".")
                  elif wanted == "HootCroak" and printed in ("Hoot", "Croak"):
                      message += (" Beat " + str(beat) + " is a multiple of both 3 and 5. An " + code("if") + "/"
                                  + code("elif") + " chain stops at the first true condition, so check the \"both\" "
                                  "case first.")
                  elif printed == str(beat):
                      divisor = "3 and 5" if wanted == "HootCroak" else ("3" if wanted == "Hoot" else "5")
                      message += (" Beat " + str(beat) + " is a multiple of " + divisor + ". Test for multiples "
                                  "with the remainder: " + code("beat % 3 == 0") + " is True when 3 divides the "
                                  "beat exactly.")
                  fail(message + near_miss(wanted, printed))
              if len(lines) < len(want):
                  fail(label + ", the song stopped too soon: it should go on until beat " + str(n)
                       + ", which is " + short(want[-1]) + "."
                       + (" " + code("range(1, n)") + " stops before n; use " + code("range(1, n + 1)") + "."
                          if len(lines) == len(want) - 1 else ""))


          @test("The first 5 beats: 1, 2, Hoot, 4, Croak")
          def _():
              check_song(5)


          @test("15 beats, ending in HootCroak")
          def _():
              check_song(15)


          @test("A single beat")
          def _():
              check_song(1)


          @test("A long song: 45 beats")
          def _():
              check_song(45)
        `,
        scene: { icon: "🎶", successIcon: "🐸", successText: "Owls and frogs sing in perfect time: Hoot! Croak! HootCroak!", effect: "manifest" }
      },

      // ------------------------------------------------------------------ 6
      {
        id: "hall-prime-gate",
        title: "The Prime Gate",
        difficulty: "medium",
        concepts: ["nested loops", "break", "flags"],
        story: [
          "At the far end of the hall stands the Prime Gate, sealed with a lock of numbers. It opens only for a wizard who can name every prime number up to the number carved on it, and Glitch keeps scratching in new ones, cackling.",
          "\"Then we need a spell that works for any number,\" says Ada. \"Your finest yet.\""
        ],
        task: [
          "A **prime number** is a whole number greater than 1 that can only be divided exactly by 1 and by itself. 7 is prime; 9 is not (9 = 3 × 3); 1 is not prime.",
          "Read a whole number `n` with `input()`. Print every prime from 2 up to `n` (including `n` itself, if it's prime), one per line. Then print how many you found. For **10**, print exactly:",
          { output: "2\n3\n5\n7\nPrimes found: 4" },
          "If `n` is less than 2, there are no primes, so print only `Primes found: 0`."
        ],
        lesson: [
          "`break` stops a loop immediately, skipping any rounds that were left. It's perfect for searching: as soon as you've found what you need, stop looking. A **flag** is a boolean variable that remembers whether something happened inside a loop:",
          { code: py`
            found = False
            for number in range(50, 60):
                if number % 7 == 0:
                    found = True
                    break
            if found:
                print("A multiple of 7:", number)
            else:
                print("No multiple of 7 here")
          `, output: "A multiple of 7: 56" },
          "Loops can also go **inside** other loops. The inner loop runs all the way through on every single round of the outer loop:",
          { code: py`
            for row in range(1, 4):
                for seat in range(1, 3):
                    print("Row", row, "seat", seat)
          `, output: "Row 1 seat 1\nRow 1 seat 2\nRow 2 seat 1\nRow 2 seat 2\nRow 3 seat 1\nRow 3 seat 2" },
          "A `break` inside the inner loop stops only the inner loop; the outer loop carries on with its next round.",
          { tip: "`number % d == 0` is `True` when `d` divides `number` exactly, with nothing left over." }
        ],
        inputs: ["10"],
        starter: py`
          n = int(input("The number on the gate: "))

          # Print every prime from 2 to n, one per line,
          # then print "Primes found:" and how many there were.

        `,
        hints: [
          "Split the job in two. An outer loop visits every candidate, `for number in range(2, n + 1):`, and for each one you decide: is it prime?",
          "To decide, assume it is (`is_prime = True`), then try every divisor `d` from 2 up to `number - 1` in an inner loop. If `number % d == 0`, it isn't prime: set the flag to `False` and `break`. Set the flag again for every new candidate.",
          [
            "The shape of the spell:",
            { code: py`
              count = 0
              for number in range(2, n + 1):
                  is_prime = True
                  for d in range(2, number):
                      if number % d == 0:
                          is_prime = False
                          break
                  if is_prime:
                      ...   # print the number and add 1 to count
              print("Primes found:", count)
            ` }
          ]
        ],
        solution: py`
          n = int(input("The number on the gate: "))
          count = 0
          for number in range(2, n + 1):
              is_prime = True
              for d in range(2, number):
                  if number % d == 0:
                      is_prime = False   # found a divisor, so not prime
                      break              # no need to check any further
              if is_prime:
                  print(number)
                  count = count + 1
          print("Primes found:", count)
        `,
        altSolutions: [
          // for ... else: the else block runs when the loop finished without break.
          py`
            n = int(input())
            found = 0
            for number in range(2, n + 1):
                for d in range(2, number):
                    if number % d == 0:
                        break
                else:
                    print(number)
                    found += 1
            print(f"Primes found: {found}")
          `,
          // Count every divisor (no break): a prime has exactly two.
          py`
            n = int(input("n = "))
            count = 0
            candidate = 2
            while candidate <= n:
                divisors = 0
                d = 1
                while d <= candidate:
                    if candidate % d == 0:
                        divisors += 1
                    d += 1
                if divisors == 2:
                    print(candidate)
                    count += 1
                candidate += 1
            print("Primes found:", count)
          `,
          // Only try divisors up to the square root.
          py`
            n = int(input())
            count = 0
            for number in range(2, n + 1):
                prime = True
                d = 2
                while d * d <= number:
                    if number % d == 0:
                        prime = False
                        break
                    d += 1
                if prime:
                    print(number)
                    count += 1
            print("Primes found:", count)
          `
        ],
        wrongSolutions: [
          // Starts at 1, which is not prime.
          py`
            n = int(input("The number on the gate: "))
            count = 0
            for number in range(1, n + 1):
                is_prime = True
                for d in range(2, number):
                    if number % d == 0:
                        is_prime = False
                        break
                if is_prime:
                    print(number)
                    count = count + 1
            print("Primes found:", count)
          `,
          // The flag is set once, before the outer loop, and never reset.
          py`
            n = int(input("The number on the gate: "))
            count = 0
            is_prime = True
            for number in range(2, n + 1):
                for d in range(2, number):
                    if number % d == 0:
                        is_prime = False
                        break
                if is_prime:
                    print(number)
                    count = count + 1
            print("Primes found:", count)
          `,
          // Decides after the first divisor it tries.
          py`
            n = int(input("The number on the gate: "))
            count = 0
            for number in range(2, n + 1):
                for d in range(2, number):
                    if number % d == 0:
                        break
                    else:
                        print(number)
                        count = count + 1
                        break
            print("Primes found:", count)
          `
        ],
        tests: TRIAL_HELPERS + py`
          def primes_up_to(n):
              return [p for p in range(2, n + 1) if all(p % d != 0 for d in range(2, p))]


          def smallest_divisor(k):
              for d in range(2, k):
                  if k % d == 0:
                      return d
              return k


          def check_gate(n):
              run = run_again([str(n)])
              must_ask(run, "the number on the gate")
              label = "For " + str(n)
              primes = primes_up_to(n)
              count_want = "Primes found: " + str(len(primes))
              want = [str(p) for p in primes] + [count_want]
              lines = run.lines
              if not lines:
                  fail(label + ", your spell didn't print anything after reading the number. It should print:\n"
                       + "\n".join(want))

              # The count line must appear once, as the very last line.
              count_at = [i for i, line in enumerate(lines) if "found" in line.lower()]
              if len(count_at) > 1:
                  fail(label + ", your spell printed the " + short("Primes found:") + " line " + str(len(count_at))
                       + " times. Print it once, at the very end: un-indent it so that it runs after the loops.")
              if count_at and count_at[0] != len(lines) - 1:
                  fail(label + ", " + short(lines[count_at[0]]) + " should be the very last line, but your spell "
                       "printed " + short(lines[count_at[0] + 1]) + " after it.")
              count_line = None if lines[-1].isdigit() else lines[-1]
              body = lines[:-1] if count_line is not None else lines
              count_numbers = _re.findall(r"\d+", count_line or "")
              if count_line is not None and count_line != count_want and count_numbers == [str(len(primes))]:
                  fail(label + ", the last line should be exactly " + short(count_want) + ", but your spell printed "
                       + short(count_line) + "." + near_miss(count_want, count_line))

              # Every other line must be one of the primes from 2 to n.
              for line in body:
                  if not line.isdigit():
                      fail(label + ", your spell printed " + short(line) + ". Print each prime on a line of its own, "
                           "as just the number (" + code("print(number)") + "), and end with the line "
                           + short(count_want) + ".")
              numbers = [int(line) for line in body]
              if 1 in numbers:
                  fail(label + ", your spell printed 1, but 1 is not a prime number: a prime has exactly two "
                       "divisors, 1 and itself. Start checking from 2.")
              for k in numbers:
                  if k > n:
                      fail(label + ", your spell printed " + str(k) + ", but the gate only wants primes up to " + str(n)
                           + ". End the outer loop with " + code("range(2, n + 1)") + ".")
              for k in numbers:
                  if 2 <= k <= n and k not in primes:
                      d = smallest_divisor(k)
                      fail(label + ", your spell says " + str(k) + " is prime, but " + str(k) + " = " + str(d) + " × "
                           + str(k // d) + ". Only decide that a number is prime after trying ALL its possible "
                           "divisors, not just the first one.")
              missing = [p for p in primes if p not in numbers]
              if missing:
                  p = missing[0]
                  outer_too_short = (label + ", " + str(p) + " is prime, so it should be printed too. "
                                     + code("range(2, n)") + " stops before n; use " + code("range(2, n + 1)") + ".")
                  if p == 2:
                      probe = [int(line) for line in run_again(["3"]).lines if line.isdigit()]
                      if 2 in probe:  # 2 is found when n is 3, so the outer loop just stops too early
                          fail(outer_too_short)
                      if n != 10:
                          numbers = [int(line) for line in run_again(["10"]).lines if line.isdigit()]
                      if not any(k in (3, 5, 7) for k in numbers):
                          fail(label + ", your spell didn't find a single prime. Check which divisors you try: every "
                               "number can be divided by 1 and by itself, so only try the divisors from 2 up to "
                               + code("number - 1") + ", with " + code("range(2, number)") + ".")
                      fail(label + ", the prime 2 is missing. For 2 the inner loop has nothing to try ("
                           + code("range(2, 2)") + " is empty), so 2 must count as prime when no divisor is found. "
                           "Decide after the inner loop has finished, using a flag.")
                  if p == n:
                      fail(outer_too_short)
                  if numbers and p > max(numbers):
                      fail(label + ", your spell stopped finding primes after " + str(max(numbers)) + " (" + str(p)
                           + " is missing). Does every new candidate start with a fresh flag? Set "
                           + code("is_prime = True") + " inside the outer loop.")
                  fail(label + ", the prime " + str(p) + " is missing.")

              # Finally, the count line itself.
              if count_line is None:
                  fail(label + ", your spell printed the right primes, but not how many it found. Finish with the "
                       "line " + short(count_want) + ".")
              if count_line != count_want:
                  if len(count_numbers) == 1 and "found" in count_line.lower():
                      fail(label + ", your spell printed the right primes, but the last line says " + short(count_line)
                           + " instead of " + short(count_want) + ". Add 1 to your counter each time you print a prime.")
                  fail(label + ", the last line should be exactly " + short(count_want) + ", but your spell printed "
                       + short(count_line) + "." + near_miss(count_want, count_line))
              expect_lines(lines, want, label, after_input=True)


          @test("The primes up to 10: 2, 3, 5, 7 (4 found)")
          def _():
              check_gate(10)


          @test("13 is prime, so it counts: the primes up to 13")
          def _():
              check_gate(13)


          @test("The smallest gate: 2")
          def _():
              check_gate(2)


          @test("No primes at all below 2 (n = 1)")
          def _():
              check_gate(1)


          @test("A big gate: all 25 primes up to 100")
          def _():
              check_gate(100)
        `,
        scene: { icon: "🔢", successIcon: "🌀", successText: "The number-lock clicks, and the Prime Gate swirls open onto a candlelit chamber beyond.", effect: "portal" }
      }
    ]
  });
})();
