/*
 * Chapter 3 — The Summoning Circle (easy → medium)
 * Concepts: def, parameters, return vs print, default & keyword arguments, scope,
 * docstrings, calling functions from functions, first recursion.
 */
(function () {
  "use strict";
  var py = SS.py;

  SS.defineChapter({
    id: "circle",
    order: 3,
    title: "The Summoning Circle",
    subtitle: "Spells bound to names",
    icon: "🔮",
    concepts: ["def", "parameters", "return vs print", "default & keyword arguments", "calling functions", "recursion"],
    intro: [
      "Past the Prime Gate, the candlelit chamber turns out to be bigger than it looked from the hall. A great chalk circle covers its floor, ringed with candles: the **Summoning Circle**.",
      "Here wizards **bind** spells to names. Bind a spell once with `def`, and you can summon it whenever you like, just by calling its name. Whatever the summoned spirit carries back to you is the spell's `return` value.",
      "Mind the runes, though. Glitch has been smudging them, and a spirit whose `return` rune is missing comes back empty-handed, carrying nothing but `None`."
    ],
    outro: [
      "The chalk circle glows a steady gold. Your spirits answer to their names, bring back exactly what you ask for, and you have even peered down the endless corridor of the Recursive Mirror.",
      "Then a tremendous crash echoes along the corridor, followed by the flutter of a thousand pages. Glitch has found the **Library of Infinite Shelves**…"
    ],
    challenges: [
      // ------------------------------------------------------------------
      {
        id: "circle-first-summoning",
        title: "The First Summoning",
        difficulty: "easy",
        concepts: ["def", "return", "parameters"],
        story: [
          "Ada chalks a perfect circle on the floor. \"A spell you must recite in full every time is a chore,\" she says. \"Bind it to a name once, and you can summon it whenever you like.\"",
          "\"One warning: a spirit that only *shouts* its answer brings nothing back. Make sure yours **returns**.\""
        ],
        task: [
          "Define a function `greet(name)` that **returns** the greeting `Welcome to the circle, <name>!` as a string. Printing the greeting isn't enough: the function must hand the text back with `return`, so the caller can decide what to do with it.",
          { code: py`
            print(greet("Pip"))
            print(greet("Morgana"))
          `, output: "Welcome to the circle, Pip!\nWelcome to the circle, Morgana!" }
        ],
        lesson: [
          "A **function** is a spell bound to a name. You define it once with `def`, and it does nothing until you **call** it by name. The lines that belong to it are indented by 4 spaces.",
          { code: py`
            def double(number):
                """Return twice the number."""
                return number * 2

            result = double(21)
            print(result)
            print(double(5) + 1)
          `, output: "42\n11" },
          "`number` is a **parameter**: a name for whatever value is passed in when the function is called. `return` ends the function and hands a value back to the caller, who can store it, print it or use it in more calculations. The string just under the `def` line is a *docstring*: a note that says what the function does.",
          { warning: "`print` and `return` are different! `print` only shows text in the scrying pool, and the caller gets nothing back. A function that never reaches a `return` gives back `None`." },
          { code: py`
            def shout(word):
                print(word.upper())

            answer = shout("hi")
            print(answer)
          `, output: "HI\nNone" }
        ],
        starter: py`
          # Bind the greeting spell to the name greet.
          def greet(name):
              # Build the greeting and RETURN it (printing it isn't enough).
              pass


          # Summon your spell to test it: this prints whatever greet returns.
          print(greet("Pip"))
        `,
        hints: [
          "Keep the line `def greet(name):` and replace `pass` with a line that starts with `return`.",
          "The text has three parts: `\"Welcome to the circle, \"`, then the `name`, then `\"!\"`. An f-string puts them together neatly: `f\"...{name}...\"`.",
          "The whole body can be one line: `return f\"Welcome to the circle, {name}!\"`"
        ],
        solution: py`
          def greet(name):
              """Return a welcome for the spirit called name."""
              return f"Welcome to the circle, {name}!"


          print(greet("Pip"))
        `,
        altSolutions: [
          py`
            def greet(name):
                message = "Welcome to the circle, " + name + "!"
                return message

            print(greet("Pip"))
          `,
          py`
            def greet(name):
                text = "Welcome to the circle, {}!".format(name)
                print(text)
                return text
          `
        ],
        wrongSolutions: [
          py`
            def greet(name):
                print(f"Welcome to the circle, {name}!")

            greet("Pip")
          `,
          py`
            def greet(name):
                return "Welcome to the circle, Pip!"
          `,
          py`
            def greet(name):
                return "Welcome to the circle,", name, "!"
          `
        ],
        tests: py`
          def quote(text):
              return '"' + text + '"'

          def summon(name):
              greet = need_function("greet", 1)
              label = code("greet(" + quote(name) + ")")
              try:
                  result, printed = capture(greet, name)
              except EOFError:
                  fail(label + " called " + code("input()") + ". A function gets its values from its parameters: use "
                       + code("name") + " directly instead of asking for input.")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". The summoned spirit has to bring the words back: use " + code("return")
                           + " instead of " + code("print") + ".")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the greeting?")
              if isinstance(result, tuple):
                  fail(label + " returned a tuple, " + short(result) + ". Commas in a " + code("return")
                       + " make a tuple of separate pieces. Join the text with " + code("+") + " or use an f-string.")
              if not isinstance(result, str):
                  fail(label + " should return a string, but it returned " + short(result) + ".")
              return result, label

          def letters_only(text):
              return "".join(ch for ch in text if ch.isalnum() or ch == " ")

          def check(name):
              result, label = summon(name)
              expected = "Welcome to the circle, " + name + "!"
              if result == expected:
                  return
              hint = ""
              if name != "Pip" and result == "Welcome to the circle, Pip!":
                  hint = (" It always greets Pip! Use the " + code("name") + " parameter instead of writing a name into the text.")
              elif "{name}" in result:
                  hint = (" The text still contains " + code("{name}") + ". Put an " + code("f") + " just before the opening quote "
                          "to make it an f-string, like " + code('f"..."') + ".")
              elif "name" in result and name not in result:
                  hint = (" The text contains the word name instead of the value stored in the " + code("name")
                          + " parameter. Join the parameter on with " + code("+") + ", or use an f-string.")
              elif result.lower() == expected.lower():
                  hint = " Check the capital letters."
              elif result.replace(" ", "") == expected.replace(" ", ""):
                  hint = " Check the spaces."
              elif letters_only(result) == letters_only(expected):
                  hint = " Check the punctuation: a comma after " + code("circle") + " and " + code("!") + " at the end."
              fail(label + " should return " + short(expected) + ", but it returned " + short(result) + "." + hint)

          @test("greet is a function with one parameter")
          def _():
              need_function("greet", 1)

          @test('greet("Pip") returns "Welcome to the circle, Pip!"')
          def _():
              check("Pip")

          @test("greet works for any name")
          def _():
              for name in ["Morgana", "Ada Lovelace", "Zed"]:
                  check(name)
        `,
        scene: { icon: "🔮", successIcon: "👻", successText: "A friendly spirit swirls out of the circle, bows low and says: \"Welcome to the circle!\"", effect: "portal" }
      },

      // ------------------------------------------------------------------
      {
        id: "circle-hourglass",
        title: "The Spirit's Hourglass",
        difficulty: "easy",
        concepts: ["parameters", "return", "arithmetic"],
        story: [
          "\"Spirits are punctual, but they only understand seconds,\" Ada explains, tapping a tall hourglass beside the circle.",
          "\"Our ritual notes say things like *1 hour, 2 minutes and 3 seconds*. Bind a spell that converts them, and we will never have to do those sums by hand again.\""
        ],
        task: [
          "Define a function `to_seconds(hours, minutes, seconds)` that **returns** the total number of seconds, as a whole number. Keep the three parameters in exactly that order.",
          { code: py`
            print(to_seconds(1, 2, 3))
          `, output: "3723" },
          "(1 hour is 3600 seconds and 2 minutes are 120 seconds, so the total is 3600 + 120 + 3 = 3723.)"
        ],
        lesson: [
          "A function can take several **parameters**, separated by commas. When you call it, the **arguments** are matched to the parameters **by position**: the first argument goes into the first parameter, the second into the second, and so on.",
          { code: py`
            def potion_cost(bottles, price_each):
                total = bottles * price_each
                return total

            print(potion_cost(3, 5))
            print(potion_cost(5, 3) + potion_cost(2, 10))
          `, output: "15\n35" },
          "Inside the body you can use all the arithmetic you learned in the tower and keep partial results in variables. Those variables are **local**: `total` only exists while `potion_cost` is running, and code outside the function can't see it. Where a name can be seen is called its **scope**.",
          { tip: "Order matters! `potion_cost(3, 5)` means 3 bottles at 5 coins each. If you swap the parameters in the `def` line, every call changes its meaning." }
        ],
        starter: py`
          def to_seconds(hours, minutes, seconds):
              # Work out the total number of seconds and return it.
              pass


          print(to_seconds(1, 2, 3))   # should print 3723
        `,
        hints: [
          "How many seconds are in one minute? How many minutes are in one hour? Multiply them to find the seconds in one hour.",
          "Turn each part into seconds separately (the hours times 3600, the minutes times 60), then add all three parts together.",
          "Fill in the blanks: `return hours * ___ + minutes * ___ + seconds`"
        ],
        solution: py`
          def to_seconds(hours, minutes, seconds):
              """Turn hours, minutes and seconds into a number of seconds."""
              return hours * 3600 + minutes * 60 + seconds


          print(to_seconds(1, 2, 3))
        `,
        altSolutions: [
          py`
            def to_seconds(hours, minutes, seconds):
                total_minutes = hours * 60 + minutes
                total = total_minutes * 60 + seconds
                return total
          `,
          py`
            def to_seconds(hours, minutes, seconds):
                seconds_in_hours = hours * 60 * 60
                seconds_in_minutes = minutes * 60
                return seconds_in_hours + seconds_in_minutes + seconds
          `
        ],
        wrongSolutions: [
          py`
            def to_seconds(hours, minutes, seconds):
                return hours * 60 + minutes * 60 + seconds
          `,
          py`
            def to_seconds(seconds, minutes, hours):
                return hours * 3600 + minutes * 60 + seconds
          `,
          py`
            hours = 1
            minutes = 2
            seconds = 3

            def to_seconds(h, m, s):
                return hours * 3600 + minutes * 60 + seconds

            print(to_seconds(hours, minutes, seconds))
          `
        ],
        tests: py`
          def convert(h, m, s):
              to_seconds = need_function("to_seconds", 3)
              label = code("to_seconds(" + str(h) + ", " + str(m) + ", " + str(s) + ")")
              try:
                  result, printed = capture(to_seconds, h, m, s)
              except EOFError:
                  fail(label + " called " + code("input()") + ". A function gets its values from its parameters: use "
                       + code("hours") + ", " + code("minutes") + " and " + code("seconds") + " directly.")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Use " + code("return") + " to hand the number back instead of printing it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the total?")
              if isinstance(result, str):
                  fail(label + " returned the text " + short(result) + ". Return just the number, not a string, so that "
                       "other spells can do arithmetic with it.")
              if isinstance(result, bool) or not isinstance(result, (int, float)):
                  fail(label + " should return a number, but it returned " + short(result) + ".")
              return result, label

          def check(h, m, s):
              result, label = convert(h, m, s)
              expected = h * 3600 + m * 60 + s
              if result == expected:
                  if isinstance(result, float):
                      fail(label + " returned " + short(result) + ", a decimal number. Multiply and add whole numbers (no "
                           + code("/") + ") so the answer is the whole number " + str(expected) + ".")
                  return
              hint = ""
              if result == s * 3600 + m * 60 + h:
                  hint = " It looks like hours and seconds are swapped: the parameters must be in the order hours, minutes, seconds."
              elif result == h * 60 + m * 60 + s:
                  hint = " An hour is 60 minutes of 60 seconds each, so it is 3600 seconds, not 60."
              elif result == h * 3600 + m + s:
                  hint = " Each minute is 60 seconds: multiply the minutes by 60."
              elif result == h * 3600 + m * 3600 + s:
                  hint = " A minute is only 60 seconds. It's the hours that need multiplying by 3600."
              elif result == h + m + s:
                  hint = " Turn the hours and minutes into seconds before adding everything up."
              elif convert(h + 1, m + 1, s + 1)[0] == result:
                  hint = (" Your function gives the same answer for different times. Make sure it calculates with its own parameters, "
                          "not with variables from outside the function.")
              fail(label + " should return " + str(expected) + ", but it returned " + short(result) + "." + hint)

          @test("to_seconds is a function with three parameters")
          def _():
              need_function("to_seconds", 3)

          @test("to_seconds(0, 0, 45) returns 45: seconds stay seconds")
          def _():
              check(0, 0, 45)

          @test("to_seconds(0, 2, 0) returns 120: minutes become seconds")
          def _():
              check(0, 2, 0)
              check(0, 1, 0)

          @test("to_seconds(1, 0, 0) returns 3600: hours become seconds")
          def _():
              check(1, 0, 0)
              check(3, 0, 0)

          @test("to_seconds(1, 2, 3) returns 3723, and other times work too")
          def _():
              for h, m, s in [(1, 2, 3), (2, 30, 15), (0, 0, 0), (10, 59, 59), (0, 1, 1)]:
                  check(h, m, s)
        `,
        scene: { icon: "⏳", successIcon: "⌛", successText: "The hourglass flips itself over, and every grain of sand glows as it counts the seconds precisely.", effect: "sparkle" }
      },

      // ------------------------------------------------------------------
      {
        id: "circle-formal-invitations",
        title: "Formal Invitations",
        difficulty: "easy",
        concepts: ["default arguments", "keyword arguments"],
        story: [
          "\"Spirits are terribly formal,\" Ada sighs. \"Each one expects a written invitation with its proper title.\"",
          "\"Most of them are plain *Spirits*, and most prefer to arrive at midnight, so let's not write all that out every single time. Give the spell sensible defaults.\""
        ],
        task: [
          "Define `invitation(name, title=\"Spirit\", hour=12)` that **returns** this text, with the three values filled in:",
          { output: "<title> <name>, please come to the circle at <hour> o'clock." },
          "`title` defaults to `\"Spirit\"` and `hour` to `12`, so all of these calls work:",
          { code: py`
            print(invitation("Wisp"))
            print(invitation("Ember", "Fire Spirit"))
            print(invitation("Gale", hour=3))
          `, output: "Spirit Wisp, please come to the circle at 12 o'clock.\nFire Spirit Ember, please come to the circle at 12 o'clock.\nSpirit Gale, please come to the circle at 3 o'clock." }
        ],
        lesson: [
          "A parameter can have a **default value**, written with `=` in the `def` line. If the caller leaves that argument out, the default is used instead. Parameters with defaults must come after the ones without.",
          { code: py`
            def brew(potion, cups=1, flavour="mint"):
                return f"{cups} cup(s) of {flavour} {potion}"

            print(brew("tea"))
            print(brew("tea", 3))
            print(brew("cocoa", flavour="cinnamon"))
            print(brew(flavour="honey", potion="milk", cups=2))
          `, output: "1 cup(s) of mint tea\n3 cup(s) of mint tea\n1 cup(s) of cinnamon cocoa\n2 cup(s) of honey milk" },
          "The last two calls use **keyword arguments**: `name=value` says exactly which parameter gets the value. That lets you skip the parameters in between, and the order of keyword arguments doesn't matter. Positional arguments must come before keyword ones.",
          { tip: "Keyword arguments make calls easy to read: `brew(\"tea\", cups=3)` says more than `brew(\"tea\", 3)`." }
        ],
        starter: py`
          # Give title and hour their default values in the def line.
          def invitation(name, title, hour):
              # Build the invitation text and return it.
              pass


          # Try it out (remove the # at the start of these lines):
          # print(invitation("Wisp"))
          # print(invitation("Gale", hour=3))
        `,
        hints: [
          "Defaults live in the `def` line: write `title=\"Spirit\"` instead of plain `title`, and do the same for `hour`. Python fills them in whenever a caller leaves them out.",
          "In the body, build the sentence with an f-string that uses all three parameters: the title, a space, the name, a comma, and the rest. Don't forget the full stop at the end.",
          "`return f\"{title} {name}, please come to the circle at {hour} o'clock.\"`"
        ],
        solution: py`
          def invitation(name, title="Spirit", hour=12):
              """Return a formal invitation to the summoning circle."""
              return f"{title} {name}, please come to the circle at {hour} o'clock."


          print(invitation("Wisp"))
          print(invitation("Ember", "Fire Spirit"))
          print(invitation("Gale", hour=3))
        `,
        altSolutions: [
          py`
            def invitation(name, title="Spirit", hour=12):
                text = title + " " + name + ", please come to the circle at " + str(hour) + " o'clock."
                return text
          `,
          py`
            def invitation(name, title=None, hour=None):
                if title is None:
                    title = "Spirit"
                if hour is None:
                    hour = 12
                return f"{title} {name}, please come to the circle at {hour} o'clock."
          `
        ],
        wrongSolutions: [
          py`
            def invitation(name, title, hour):
                return f"{title} {name}, please come to the circle at {hour} o'clock."
          `,
          py`
            def invitation(name, hour=12, title="Spirit"):
                return f"{title} {name}, please come to the circle at {hour} o'clock."
          `,
          py`
            def invitation(name, title="Spirit", time=12):
                return f"{title} {name}, please come to the circle at {time} o'clock."
          `
        ],
        tests: py`
          import inspect

          def show(value):
              if isinstance(value, str):
                  return '"' + value + '"'
              return str(value)

          def invite(*args, **kwargs):
              func = need("invitation")
              if isinstance(func, type) or not callable(func):
                  fail(code("invitation") + " should be a function made with " + code("def") + ".")
              parts = [show(a) for a in args] + [key + "=" + show(value) for key, value in kwargs.items()]
              label = code("invitation(" + ", ".join(parts) + ")")
              try:
                  signature = inspect.signature(func)
              except (TypeError, ValueError):
                  signature = None
              if signature is not None:
                  try:
                      signature.bind(*args, **kwargs)
                  except TypeError as problem:
                      why = str(problem)
                      advice = ""
                      if "missing" in why:
                          advice = (" Give " + code("title") + " and " + code("hour") + " default values in the "
                                    + code("def") + " line, so that callers can leave them out.")
                      elif "unexpected keyword" in why:
                          advice = (" Keyword arguments use the parameter names, so the names must be exactly "
                                    + code("name") + ", " + code("title") + " and " + code("hour") + ".")
                      elif "multiple values" in why:
                          advice = (" The second argument should fill " + code("title") + ", so the parameters must be in "
                                    "the order name, title, hour.")
                      elif "too many" in why:
                          advice = " Your function needs three parameters: name, title and hour."
                      fail(label + " doesn't work with your function (" + why + "). Your def line is "
                           + code("def invitation" + str(signature) + ":") + " but the task asks for "
                           + code('def invitation(name, title="Spirit", hour=12):') + "." + advice)
              result, printed = capture(func, *args, **kwargs)
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Use " + code("return") + " instead of " + code("print") + ".")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the text?")
              if not isinstance(result, str):
                  fail(label + " should return a string, but it returned " + short(result) + ".")
              return result, label

          def check(expected, *args, **kwargs):
              result, label = invite(*args, **kwargs)
              if result == expected:
                  return
              name = args[0] if args else kwargs.get("name", "")
              title = args[1] if len(args) >= 2 else kwargs.get("title", "Spirit")
              title_given = len(args) >= 2 or "title" in kwargs
              hour_given = len(args) >= 3 or "hour" in kwargs
              hint = ""
              if "’" in result:
                  hint = " Use a straight apostrophe in " + code("o'clock") + ", not a curly one."
              elif len(args) >= 2 and ("at " + str(args[1]) + " o'clock") in result:
                  hint = " The second argument should be the title: put the parameters in the order name, title, hour."
              elif result.startswith(name + " " + title):
                  hint = " The title comes first, then the name: " + short(title + " " + name) + "."
              elif not title_given and not result.startswith("Spirit "):
                  hint = (" When no title is given it should be " + code('"Spirit"') + " (with a capital S): write "
                          + code('title="Spirit"') + " in the def line.")
              elif not hour_given and "12" not in result:
                  hint = " When no hour is given it should be 12: write " + code("hour=12") + " in the def line."
              elif result.lower() == expected.lower():
                  hint = " Check the capital letters."
              elif result.replace(" ", "") == expected.replace(" ", ""):
                  hint = " Check the spaces."
              elif not result.endswith("o'clock."):
                  hint = " The invitation should end with " + code("o'clock.") + " (including the full stop)."
              elif " at " not in result:
                  hint = " Don't forget the word " + code("at") + " just before the hour."
              fail(label + " should return " + short(expected) + ", but it returned " + short(result) + "." + hint)

          @test('invitation("Wisp") uses both defaults')
          def _():
              check("Spirit Wisp, please come to the circle at 12 o'clock.", "Wisp")
              check("Spirit Old Oak, please come to the circle at 12 o'clock.", "Old Oak")

          @test('A title can be given second: invitation("Ember", "Fire Spirit")')
          def _():
              check("Fire Spirit Ember, please come to the circle at 12 o'clock.", "Ember", "Fire Spirit")
              check("Cloud Spirit Mist, please come to the circle at 6 o'clock.", "Mist", "Cloud Spirit", 6)

          @test('hour can be given by keyword: invitation("Gale", hour=3)')
          def _():
              check("Spirit Gale, please come to the circle at 3 o'clock.", "Gale", hour=3)
              check("Fire Spirit Ember, please come to the circle at 1 o'clock.", "Ember", "Fire Spirit", hour=1)

          @test("Keyword arguments work in any order")
          def _():
              check("Cloud Spirit Mist, please come to the circle at 6 o'clock.", hour=6, title="Cloud Spirit", name="Mist")
              check("Owl Pip, please come to the circle at 11 o'clock.", "Pip", hour=11, title="Owl")
        `,
        scene: { icon: "✉️", successIcon: "🕊️", successText: "The invitations fold themselves into paper birds and flutter off into the night.", effect: "rise" }
      },

      // ------------------------------------------------------------------
      {
        id: "circle-leap-day",
        title: "The Leap-Day Spirit",
        difficulty: "medium",
        concepts: ["booleans", "calling functions", "return"],
        story: [
          "\"The Leap-Day Spirit only appears on the 29th of February,\" says Ada, \"and that day only exists in leap years. Summon her in the wrong year and she sulks for a decade.\"",
          "\"Bind the leap-year rule to a name. Then build a second spell on top of the first.\""
        ],
        task: [
          "Define two functions:",
          { list: [
            "`is_leap(year)` returns `True` if `year` is a leap year, otherwise `False`. A year is a leap year if it is divisible by 4, **except** years divisible by 100, which are not, **unless** they are also divisible by 400, which are.",
            "`days_in_year(year)` returns `366` for a leap year and `365` otherwise. It must **call** `is_leap` to decide."
          ] },
          { code: py`
            print(is_leap(2024), is_leap(2023), is_leap(1900), is_leap(2000))
            print(days_in_year(2024))
          `, output: "True False False True\n366" }
        ],
        lesson: [
          "A function can return a **boolean**, `True` or `False`. You can return a comparison directly, or `return` from inside `if` branches: `return` leaves the function at once, so the lines after it don't run.",
          { code: py`
            def is_teen(age):
                return 13 <= age <= 19

            def ticket_price(age):
                if age < 5:
                    return 0          # leaves the function right here
                if is_teen(age):      # one function calling another
                    return 7
                return 10

            print(is_teen(15), ticket_price(3), ticket_price(15), ticket_price(40))
          `, output: "True 0 7 10" },
          "`x % 4 == 0` tests whether `x` is divisible by 4. When a rule has exceptions, check the **most specific** case first, or combine the conditions carefully with `and`, `or` and parentheses.",
          "Functions can call other functions you've written. Build small spells you can trust, then combine them. If a rule ever changes, you only have to fix it in one place."
        ],
        starter: py`
          def is_leap(year):
              # Return True for a leap year and False for any other year.
              pass


          def days_in_year(year):
              # Return 366 or 365. Call is_leap to decide.
              pass


          print(is_leap(2024), is_leap(1900), is_leap(2000))
          print(days_in_year(2024))
        `,
        hints: [
          "Try some years by hand: 2024 is a leap year, 2023 is not, 1900 is not (divisible by 100) and 2000 is (divisible by 400). Your function must get all four right.",
          "Check the rules from the most specific to the least: first `year % 400 == 0`, then `year % 100 == 0`, then `year % 4 == 0`. Each check can `return` straight away.",
          "`days_in_year` only needs an `if is_leap(year):` that returns `366`, and a `return 365` after it."
        ],
        solution: py`
          def is_leap(year):
              """Return True if year is a leap year."""
              if year % 400 == 0:
                  return True
              if year % 100 == 0:
                  return False
              return year % 4 == 0


          def days_in_year(year):
              """Return how many days the year has."""
              if is_leap(year):
                  return 366
              return 365


          print(is_leap(2024), is_leap(2023), is_leap(1900), is_leap(2000))
          print(days_in_year(2024))
        `,
        altSolutions: [
          py`
            def is_leap(year):
                return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

            def days_in_year(year):
                return 366 if is_leap(year) else 365
          `,
          py`
            def is_leap(year):
                leap = False
                if year % 4 == 0:
                    leap = True
                    if year % 100 == 0:
                        leap = False
                        if year % 400 == 0:
                            leap = True
                return leap

            def days_in_year(year):
                days = 365
                if is_leap(year) == True:
                    days = days + 1
                return days
          `
        ],
        wrongSolutions: [
          py`
            def is_leap(year):
                return year % 4 == 0

            def days_in_year(year):
                if is_leap(year):
                    return 366
                return 365
          `,
          py`
            def is_leap(year):
                if year % 4 == 0:
                    return True
                elif year % 100 == 0:
                    return False
                elif year % 400 == 0:
                    return True
                else:
                    return False

            def days_in_year(year):
                if is_leap(year):
                    return 366
                return 365
          `,
          py`
            def is_leap(year):
                return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

            def days_in_year(year):
                if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
                    return 366
                return 365
          `
        ],
        tests: py`
          def truth(year):
              return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

          def why(year):
              if year % 400 == 0:
                  return str(year) + " is divisible by 400, so it is a leap year."
              if year % 100 == 0:
                  return str(year) + " is divisible by 100 but not by 400, so it is not a leap year."
              if year % 4 == 0:
                  return str(year) + " is divisible by 4 (and not by 100), so it is a leap year."
              return str(year) + " is not divisible by 4, so it is not a leap year."

          def leap(year):
              is_leap = need_function("is_leap", 1)
              label = code("is_leap(" + str(year) + ")")
              try:
                  result, printed = capture(is_leap, year)
              except EOFError:
                  fail(label + " called " + code("input()") + ". A function gets its values from its parameters: use "
                       + code("year") + " directly.")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None") + ". Return "
                           + code("True") + " or " + code("False") + " instead of printing.")
                  fail(label + " returned " + code("None") + ". Make sure every path through your function ends with "
                       + code("return True") + " or " + code("return False") + ".")
              if not isinstance(result, bool):
                  extra = ""
                  if result in ("True", "False"):
                      extra = " Leave out the quotes: " + code('"' + result + '"') + " in quotes is a string, not a boolean."
                  elif result in (0, 1):
                      extra = " Return " + code("True") + " or " + code("False") + " rather than 1 or 0."
                  fail(label + " should return " + code("True") + " or " + code("False") + " (a boolean), but it returned "
                       + short(result) + "." + extra)
              return result

          def check(year):
              expected = truth(year)
              result = leap(year)
              if result == expected:
                  return
              hint = ""
              if year % 100 == 0 and year % 400 != 0:
                  if "100" in source:
                      hint = (" Check the order of your conditions: every year divisible by 100 is also divisible by 4, so "
                              "the 100 and 400 rules must be checked before the plain divisible-by-4 rule.")
                  else:
                      hint = " Your rule needs the exception for century years: a year divisible by 100 is not a leap year."
              elif year % 400 == 0 and "400" not in source:
                  hint = (" Your rule needs the exception to the exception: a year divisible by 400 is a leap year after all.")
              fail(code("is_leap(" + str(year) + ")") + " should be " + code(str(expected)) + ", but it returned "
                   + code(str(result)) + ". " + why(year) + hint)

          def days(year):
              days_in_year = need_function("days_in_year", 1)
              label = code("days_in_year(" + str(year) + ")")
              result, printed = capture(days_in_year, year)
              expected = 366 if truth(year) else 365
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None") + ". Return the number instead.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " 366 or 365?")
              if isinstance(result, bool) or not isinstance(result, int):
                  fail(label + " should return the whole number " + str(expected) + ", but it returned " + short(result) + ".")
              if result != expected:
                  fail(label + " should be " + str(expected) + ", but it returned " + str(result) + ". " + why(year))

          @test("is_leap(2024) is True and is_leap(2023) is False")
          def _():
              for year in [2024, 2023, 2020, 2019, 1996, 2001]:
                  check(year)

          @test("Century years such as 1900 and 2100 are not leap years")
          def _():
              for year in [1900, 2100, 1800, 2200, 1700, 2300]:
                  check(year)

          @test("Every 400th year is a leap year: 2000, 1600 and 2400")
          def _():
              for year in [2000, 1600, 2400]:
                  check(year)

          @test("is_leap is right for every year from 1 to 2500")
          def _():
              for year in range(1, 2501):
                  check(year)

          @test("days_in_year returns 366 for leap years and 365 for others")
          def _():
              for year in [2024, 2023, 1900, 2000, 2100, 1996]:
                  days(year)

          @test("days_in_year calls is_leap to decide")
          def _():
              days_in_year = need_function("days_in_year", 1)
              with count_calls("is_leap") as calls:
                  capture(days_in_year, 2023)
              expect(calls.count >= 1, code("days_in_year") + " should call your " + code("is_leap") + " function instead of "
                     "repeating the leap-year rule. Write something like " + code("if is_leap(year):") + ".")
        `,
        scene: { icon: "🌙", successIcon: "📅", successText: "Snowflakes swirl as the calendar grows a 29th of February, and the Leap-Day Spirit waves hello.", effect: "frost" }
      },

      // ------------------------------------------------------------------
      {
        id: "circle-name-power",
        title: "The Power in a Name",
        difficulty: "medium",
        concepts: ["loops in functions", "strings", "accumulators"],
        story: [
          "Letters of light drift around the chalk ring. \"A spirit's power hides in its true name,\" Ada whispers. \"Vowels sing loudest, other letters hum, and spaces and marks are silent.\"",
          "\"Before we summon anything mighty, I want a spell that weighs a name for us.\""
        ],
        task: [
          "Define `name_power(name)` that **returns** the total power of the string `name`, adding up the power of each character:",
          { list: [
            "each vowel (`a`, `e`, `i`, `o` or `u`, in lowercase **or** capitals) is worth **2**;",
            "every other letter is worth **1** (`y` is an ordinary letter here);",
            "anything else (spaces, digits, punctuation) is worth **0**."
          ] },
          { code: py`
            print(name_power("Pip"))        # 1 + 2 + 1
            print(name_power("Old Oak!"))
            print(name_power(""))
          `, output: "4\n9\n0" }
        ],
        lesson: [
          "A `for` loop can walk through a string **one character at a time**. Put the loop inside a function, keep a running total in a local variable, and return it **after** the loop has finished.",
          { code: py`
            def count_capitals(text):
                count = 0                    # start the total before the loop
                for letter in text:
                    if letter.isupper():
                        count = count + 1
                return count                 # after the loop, not inside it

            print(count_capitals("Hello Coilspire Academy"))
          `, output: "3" },
          "Some handy tools for checking characters:",
          { list: [
            "`letter in \"xyz\"` is `True` if `letter` is one of the characters x, y or z.",
            "`letter.isalpha()` is `True` for letters and `False` for spaces, digits and punctuation.",
            "`letter.lower()` turns a capital into lowercase, so you only need to check one case."
          ] },
          { warning: "`letter == \"a\" or \"e\"` does **not** check for two letters! Python reads it as `(letter == \"a\") or \"e\"`, which is always true. Write `letter == \"a\" or letter == \"e\"`, or better, `letter in \"ae\"`." }
        ],
        starter: py`
          def name_power(name):
              total = 0
              # Look at each character of name and add its power to total.

              return total


          print(name_power("Pip"))        # should print 4
          print(name_power("Old Oak!"))   # should print 9
        `,
        hints: [
          "Loop over the name with `for letter in name:` and keep a running `total` that starts at 0 before the loop.",
          "Inside the loop use `if` / `elif`: if `letter.lower()` is in `\"aeiou\"`, add 2; otherwise, if `letter.isalpha()`, add 1. Anything else adds nothing.",
          "Line `return total` up with the `for`, not inside the loop, or the function stops after the first character."
        ],
        solution: py`
          def name_power(name):
              """Add up the power of every character in name."""
              total = 0
              for letter in name:
                  if letter.lower() in "aeiou":
                      total += 2
                  elif letter.isalpha():
                      total += 1
              return total


          print(name_power("Pip"))
          print(name_power("Old Oak!"))
        `,
        altSolutions: [
          py`
            def name_power(name):
                vowels = "aeiouAEIOU"
                consonants = "bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ"
                power = 0
                for ch in name:
                    if ch in vowels:
                        power = power + 2
                    elif ch in consonants:
                        power = power + 1
                return power
          `,
          py`
            def name_power(name):
                total = 0
                i = 0
                while i < len(name):
                    letter = name[i].lower()
                    if letter == "a" or letter == "e" or letter == "i" or letter == "o" or letter == "u":
                        total = total + 2
                    elif letter.isalpha():
                        total = total + 1
                    i = i + 1
                return total
          `
        ],
        wrongSolutions: [
          py`
            def name_power(name):
                total = 0
                for letter in name:
                    if letter == "a" or "e" or "i" or "o" or "u":
                        total = total + 2
                    elif letter.isalpha():
                        total = total + 1
                return total
          `,
          py`
            def name_power(name):
                total = 0
                for letter in name:
                    if letter.lower() in "aeiou":
                        total += 2
                    elif letter.isalpha():
                        total += 1
                    return total
          `,
          py`
            def name_power(name):
                total = 0
                for letter in name:
                    if letter in "aeiou":
                        total += 2
                    else:
                        total += 1
                return total
          `
        ],
        tests: py`
          def power(text):
              total = 0
              for ch in text:
                  if ch.lower() in "aeiou":
                      total += 2
                  elif ch.isalpha():
                      total += 1
              return total

          def mistakes(text):
              """What some common mistakes would return, each with a hint."""
              return [
                  (2 * len(text),
                   "Every character counted as a vowel. Did you write " + code('letter == "a" or "e"')
                   + "? Python reads that as " + code('(letter == "a") or "e"') + ", which is always true. Use "
                   + code('letter.lower() in "aeiou"') + " instead."),
                  (sum(2 if ch in "aeiou" else 1 if ch.isalpha() else 0 for ch in text),
                   "Capital vowels are vowels too. Check " + code("letter.lower()") + " so that " + code('"A"')
                   + " counts like " + code('"a"') + "."),
                  (sum(2 if ch.lower() in "aeiou" else 1 for ch in text),
                   "Spaces, digits and punctuation are worth 0. Only add 1 when " + code("letter.isalpha()") + " is True."),
                  (sum(2 if ch in "aeiou" else 1 for ch in text),
                   "Capital vowels are vowels too, and spaces, digits and punctuation are worth 0. Try "
                   + code("letter.lower()") + " and " + code("letter.isalpha()") + "."),
                  (sum(2 if ch.lower() in "aeiouy" else 1 if ch.isalpha() else 0 for ch in text),
                   "Here " + code("y") + " is an ordinary letter, worth 1. Only a, e, i, o and u are vowels."),
                  (sum(3 if ch.lower() in "aeiou" else 1 if ch.isalpha() else 0 for ch in text),
                   "Vowels seem to be worth 3: they get 2 for being a vowel and then 1 more for being a letter. Use "
                   + code("elif") + " so each character is counted only once."),
              ]

          def probe(name_power):
              """Run the spell on "aB" (power 3) to tell apart some loop mistakes."""
              try:
                  value, _ = capture(name_power, "aB")
              except Exception:
                  return None
              return value

          def loop_hint(name_power, text, result):
              value = probe(name_power)
              if value == 0 and result == 0:
                  return (" Nothing was added to the total. Loop over the characters with " + code("for letter in name:")
                          + " and add each one's power to " + code("total") + ".")
              if value == 2 and result == power(text[:1]):
                  return (" Your function seems to stop after the first character. Is " + code("return")
                          + " indented inside the loop? It belongs after the loop, lined up with " + code("for") + ".")
              if value == 1 and result == power(text[-1:]):
                  return (" Only the last character seems to count. Is " + code("total = 0") + " inside the loop? "
                          "Set it once, before the loop starts.")
              return ""

          def check(text):
              name_power = need_function("name_power", 1)
              label = code("name_power(" + '"' + text + '"' + ")")
              result, printed = capture(name_power, text)
              expected = power(text)
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None") + ". Return the total instead of printing it.")
                  if text == "":
                      fail(label + " returned " + code("None") + ". With an empty name the loop never runs, so "
                           + code("return total") + " must come after the loop, not inside it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the total?")
              if isinstance(result, bool) or not isinstance(result, (int, float)):
                  fail(label + " should return a number, but it returned " + short(result) + ".")
              if result == expected:
                  return
              hint = loop_hint(name_power, text, result)
              if not hint:
                  for value, advice in mistakes(text):
                      if result == value and value != expected:
                          hint = " " + advice
                          break
              fail(label + " should be " + str(expected) + ", but it returned " + short(result) + "." + hint)

          @test('name_power("Pip") returns 4')
          def _():
              check("Pip")
              check("Ada")

          @test("Capital vowels are worth 2 as well")
          def _():
              for text in ["AEIOU", "Oona", "ADA"]:
                  check(text)

          @test("Spaces, digits and punctuation are worth 0")
          def _():
              for text in ["Old Oak!", "R2-D2", "... !?"]:
                  check(text)

          @test("y and the other consonants are worth 1")
          def _():
              for text in ["Rhythm", "Glitch", "Crwth"]:
                  check(text)

          @test("An empty name has power 0")
          def _():
              check("")

          @test("Long names add up correctly")
          def _():
              for text in ["Archmage Ada Lovelace", "Pip the Owl, Esq.", "Zyx 9000", "Ignatius Umbra-Eel", "QUEUEING"]:
                  check(text)
        `,
        scene: { icon: "📛", successIcon: "⚡", successText: "Each name crackles with light as the circle weighs its power.", effect: "lightning" }
      },

      // ------------------------------------------------------------------
      {
        id: "circle-recursive-mirror",
        title: "The Recursive Mirror",
        difficulty: "medium",
        concepts: ["recursion", "base case"],
        story: [
          "At the edge of the circle stands a tall silver mirror. Inside it you see a smaller mirror, and inside that, a smaller one still…",
          "\"The Recursive Mirror,\" says Ada. \"Each mirror asks the one inside it for help, until the tiniest mirror knows its answer outright. Make sure your spell knows where the mirrors end!\""
        ],
        task: [
          "Define `factorial(n)` that **returns** n! (\"n factorial\"): the product n × (n − 1) × … × 2 × 1, for any whole number n ≥ 0. By definition, `factorial(0)` is `1`.",
          "Your function must be **recursive**: it calls `factorial` itself with a smaller number, instead of using a loop.",
          { code: py`
            print(factorial(5))   # 5 x 4 x 3 x 2 x 1
            print(factorial(0))
          `, output: "120\n1" }
        ],
        lesson: [
          "A **recursive** function calls itself. That sounds like a spell that never ends, and it would be, without two ingredients:",
          { list: [
            "a **base case**: the smallest problem, answered directly without calling the function again;",
            "a **recursive case**: call the function itself on a slightly *smaller* problem, then use that answer. Every call must move closer to the base case."
          ] },
          "Here is `sum_to(n)`, which adds up 1 + 2 + … + n:",
          { code: py`
            def sum_to(n):
                if n == 0:                    # base case: nothing left to add
                    return 0
                return n + sum_to(n - 1)      # recursive case: a smaller problem

            print(sum_to(4))
          `, output: "10" },
          "Python works it out like a row of mirrors: `sum_to(4)` waits for `sum_to(3)`, which waits for `sum_to(2)`… all the way down to `sum_to(0)`, which answers `0` at once. Then the answers travel back up: 0, 1, 3, 6, 10.",
          { warning: "Choose the base case's answer carefully: every result is built on top of it. And if a function never reaches its base case, Python stops it with a `RecursionError`." }
        ],
        starter: py`
          def factorial(n):
              # Base case: the smallest mirror answers directly.

              # Recursive case: ask a smaller mirror for help.
              pass


          print(factorial(5))   # should print 120
        `,
        hints: [
          "Start with the smallest mirror: what should `factorial(0)` return? Handle that case with an `if` and return the answer straight away.",
          "For a bigger n, notice that `factorial(n)` is n times `factorial(n - 1)`. Let the smaller mirror do most of the work.",
          "Two parts: `if n == 0:` then `return 1`; after that, `return n * factorial(n - 1)`."
        ],
        solution: py`
          def factorial(n):
              """Return n! = n * (n - 1) * ... * 1, worked out recursively."""
              if n == 0:
                  return 1                       # base case: the smallest mirror
              return n * factorial(n - 1)        # recursive case: a smaller mirror helps


          print(factorial(5))
          print(factorial(0))
        `,
        altSolutions: [
          py`
            def factorial(n):
                if n <= 1:
                    return 1
                else:
                    return factorial(n - 1) * n
          `,
          py`
            def factorial(n):
                return 1 if n == 0 else n * factorial(n - 1)
          `
        ],
        wrongSolutions: [
          py`
            def factorial(n):
                if n == 0:
                    return 0
                return n * factorial(n - 1)
          `,
          py`
            def factorial(n):
                result = 1
                for k in range(2, n + 1):
                    result = result * k
                return result
          `,
          py`
            def factorial(n):
                if n == 1:
                    return 1
                return n * factorial(n - 1)
          `
        ],
        tests: py`
          def fact(n):
              result = 1
              for k in range(2, n + 1):
                  result *= k
              return result

          def mirror(n):
              factorial = need_function("factorial", 1)
              label = code("factorial(" + str(n) + ")")
              try:
                  result, printed = capture(factorial, n)
              except RecursionError:
                  fail(label + " never stopped calling itself: the mirrors went on forever. Make sure the base case "
                       "catches " + code("n == 0") + " (the smallest mirror) and returns 1 without calling "
                       + code("factorial") + ", and that every other call uses " + code("factorial(n - 1)") + ".")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Each mirror must return its answer, so that the mirror above it can use it.")
                  fail(label + " returned " + code("None") + ". Every path through your function needs a " + code("return")
                       + ": the base case and the recursive case.")
              if isinstance(result, bool) or not isinstance(result, int):
                  if isinstance(result, float) and result == fact(n):
                      fail(label + " returned " + short(result) + ", a decimal number. Keep to whole numbers: multiply with "
                           + code("*") + " and avoid " + code("/") + ".")
                  fail(label + " should return a whole number, but it returned " + short(result) + ".")
              return result, label

          def check(n):
              result, label = mirror(n)
              expected = fact(n)
              if result == expected:
                  return
              hint = ""
              if result == 0:
                  hint = (" A 0 has crept into the multiplication, and anything multiplied by 0 is 0. Usually the base case "
                          "returns 0, or the recursion goes one step too far. " + code("factorial(0)") + " should return 1.")
              elif n >= 1 and result in (n * (n + 1) // 2, n * (n + 1) // 2 + 1):
                  hint = " It looks like the numbers were added. A factorial multiplies them: n times factorial(n - 1)."
              fail(label + " should be " + str(expected) + ", but it returned " + short(result) + "." + hint)

          @test("factorial(1) and factorial(0) are 1: the smallest mirrors")
          def _():
              check(1)
              check(0)

          @test("factorial(5) is 120")
          def _():
              check(3)
              check(5)

          @test("factorial calls itself: a mirror inside a mirror")
          def _():
              need_function("factorial", 1)
              uses_math = "math" in source
              extra = (" Python's own " + code("math.factorial") + " doesn't count: build your own mirror!") if uses_math else ""
              expect(is_recursive("factorial"), code("factorial") + " should call itself with a smaller number, such as "
                     + code("factorial(n - 1)") + ("." if uses_math else ", instead of using a loop.") + extra)
              with count_calls("factorial") as calls:
                  mirror(5)
              expect(calls.count > 1, code("factorial(5)") + " found its answer without calling " + code("factorial")
                     + " again. Make the recursive case call " + code("factorial(n - 1)") + " and use its answer." + extra)

          @test("factorial(10) is 3628800, and bigger numbers work too")
          def _():
              too_many = ("Your " + code("factorial") + " called itself far too many times. Each mirror should ask the next, "
                          "smaller mirror for help just once.")
              with count_calls("factorial", limit=500, message=too_many):
                  for n in [10, 20, 30]:
                      check(n)
        `,
        scene: { icon: "🪞", successIcon: "✨", successText: "The mirror opens into an endless corridor of smaller mirrors, each one passing its answer back to the next.", effect: "portal" }
      }
    ]
  });
})();
