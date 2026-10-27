/*
 * Chapter 4 — The Library of Infinite Shelves (easy → hard)
 * Concepts: lists, indexing & slicing, list methods, enumerate, tuples & unpacking,
 * dictionaries, sets, in, comprehensions, zip, sorted(key=...) with lambda.
 */
(function () {
  "use strict";
  var py = SS.py;

  SS.defineChapter({
    id: "library",
    order: 4,
    title: "The Library of Infinite Shelves",
    subtitle: "Lists, dictionaries and sets",
    icon: "📚",
    concepts: ["lists", "slicing", "tuples", "dictionaries", "sets", "comprehensions", "sorted() & lambda"],
    intro: [
      "The **Library of Infinite Shelves** holds every book ever written, and a few that haven't been written yet. Its shelves are Python's collections: **lists** that keep things in order, **dictionaries** that find things by name, and **sets** that know exactly what belongs.",
      "Tonight it is chaos. Glitch has scrambled the library from floor to ceiling: books are in the wrong places, ledgers have lost their totals, and some words have even been cursed into anagrams. Let's put things right, one shelf at a time."
    ],
    outro: [
      "Every book is back on its shelf, every ledger balances and every anagram is unscrambled. The library sighs with relief as a thousand reading lamps flicker back on.",
      "Glitch, caught red-handed, squeaks an apology that doesn't sound very sorry and scurries off through a side door marked **Golem Workshop**, leaving a trail of tiny clay footprints behind…"
    ],
    challenges: [
      // ------------------------------------------------------------------
      {
        id: "library-restore-shelf",
        title: "The Misplaced Tome",
        difficulty: "easy",
        concepts: ["lists", "indexing", "slicing"],
        story: [
          "The first shelf looks almost tidy. Almost. Glitch has pulled the last book off the end and jammed it in at the front.",
          "\"Shelves are Python **lists**,\" says Ada, \"and lists keep things *in order*. Let's put that book back where it belongs, without damaging the shelf we were given.\""
        ],
        task: [
          "Define `restore_shelf(books)`. `books` is a list of titles whose **first** book really belongs at the **end**. Return a **new** list with that first book moved to the end and the other books in the same order.",
          { code: py`
            shelf = ["Moon Maps", "Owl Post", "Alchemy", "Charms"]
            print(restore_shelf(shelf))
            print(shelf)   # the original list must not change
          `, output: "['Owl Post', 'Alchemy', 'Charms', 'Moon Maps']\n['Moon Maps', 'Owl Post', 'Alchemy', 'Charms']" },
          "An empty shelf gives an empty list, and a shelf with only one book stays as it is."
        ],
        lesson: [
          "A **list** holds items in order, inside square brackets. Every item has a **position** (its index), counting from 0. Negative positions count backwards from the end.",
          { code: py`
            potions = ["mint", "rose", "sage", "thyme"]
            print(potions[0], potions[-1], len(potions))
            print(potions[1:3])    # a slice: from position 1 up to (not including) 3
            print(potions[:2])     # from the start up to position 2
            print(potions[2:])     # from position 2 to the end
            print(potions[:1] + ["honey"])    # + joins two lists into a new list
          `, output: "mint thyme 4\n['rose', 'sage']\n['mint', 'rose']\n['sage', 'thyme']\n['mint', 'honey']" },
          "Slices are forgiving: if `potions` were empty, `potions[1:]` would simply be `[]`, while `potions[0]` would crash with an `IndexError`.",
          "You can also make a list from a string: `\"mint rose sage\".split()` cuts the text at its spaces and gives the list `['mint', 'rose', 'sage']`.",
          "Lists can also be changed **in place** with methods such as `.append(item)` (add to the end), `.insert(position, item)` and `.pop(position)` (remove the item at that position and give it back).",
          { warning: "Methods like `.pop()` and `.append()` change the original list, and whoever handed it to you will see the damage. To leave it untouched, build a new list with slices and `+` (or work on a copy made with `list(books)`)." }
        ],
        starter: py`
          def restore_shelf(books):
              # Return a NEW list: the first book moved to the end.
              pass


          shelf = ["Moon Maps", "Owl Post", "Alchemy", "Charms"]
          print(restore_shelf(shelf))
          print(shelf)
        `,
        hints: [
          "The answer has two parts: every book **after** the first one, followed by the first book.",
          "`books[1:]` is everything after position 0, and `books[:1]` is a little list holding just the first book. Both are new lists, and both work on an empty shelf.",
          "Join the two slices with `+`: `return books[1:] + books[:1]`"
        ],
        solution: py`
          def restore_shelf(books):
              """Return a new list with the first book moved to the end."""
              return books[1:] + books[:1]


          shelf = ["Moon Maps", "Owl Post", "Alchemy", "Charms"]
          print(restore_shelf(shelf))
          print(shelf)
        `,
        altSolutions: [
          py`
            def restore_shelf(books):
                shelf = list(books)
                if shelf:
                    first = shelf.pop(0)
                    shelf.append(first)
                return shelf
          `,
          py`
            def restore_shelf(books):
                if len(books) == 0:
                    return []
                result = []
                for i in range(1, len(books)):
                    result.append(books[i])
                result.append(books[0])
                return result
          `
        ],
        wrongSolutions: [
          py`
            def restore_shelf(books):
                first = books.pop(0)
                books.append(first)
                return books
          `,
          py`
            def restore_shelf(books):
                return books[-1:] + books[:-1]
          `,
          py`
            def restore_shelf(books):
                return books[1:] + [books[0]]
          `
        ],
        tests: py`
          import re

          def restore(books):
              restore_shelf = need_function("restore_shelf", 1)
              given = list(books)
              label = code("restore_shelf(" + short(books) + ")")
              try:
                  result, printed = capture(restore_shelf, given)
              except TypeError as problem:
                  if "can only concatenate list" in str(problem):
                      fail(label + " crashed: " + str(problem) + ". The " + code("+") + " sign can only join a list to "
                           "another list. Wrap a single book in square brackets, like " + code("[books[0]]")
                           + ", or use a slice such as " + code("books[:1]") + ".")
                  raise
              if result is None:
                  if given != books:
                      fail(label + " changed the list it was given and returned " + code("None") + ". Return a new list "
                           "instead (methods such as " + code(".append()") + " change a list in place and return "
                           + code("None") + ").")
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the new list instead of printing it.")
                  if re.search(r"return\s+[\w.\[\]]+\.(append|insert|extend|remove)\(", source):
                      fail(label + " returned " + code("None") + ". Methods such as " + code(".append()")
                           + " change a list in place and give back " + code("None") + ", so " + code("return new.append(...)")
                           + " returns " + code("None") + ". Call the method on its own line, then " + code("return")
                           + " the list.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the new list?")
              if not isinstance(result, list):
                  fail(label + " should return a list, but it returned " + short(result) + " (a " + type(result).__name__ + ").")
              return result, label, given

          def check(books):
              result, label, given = restore(books)
              expected = books[1:] + books[:1]
              if result == expected:
                  return
              hint = ""
              if len(books) > 2 and result == sorted(books):
                  hint = (" That sorted the shelf alphabetically. Don't sort: keep the other books in the order they "
                          "were in, and move only the first book to the end.")
              elif len(books) > 2 and result == [b for b in books if b != max(books)] + [max(books)]:
                  hint = (" That moved the alphabetically last book to the end. Move the first book instead, "
                          "whatever its title is.")
              elif len(books) > 2 and result == books[-1:] + books[:-1]:
                  hint = " That moved the last book to the front. We need the opposite: the first book goes to the end."
              elif len(books) > 2 and result == books[-1:] + books[1:-1] + books[:1]:
                  hint = (" That swapped the first and last books. Instead, every other book should move up one place, "
                          "and the first book goes to the very end.")
              elif len(result) != len(books):
                  hint = (" The shelf should still hold " + str(len(books)) + " book(s), but your list has "
                          + str(len(result)) + ".")
              elif result == books:
                  hint = " Nothing moved: the first book should end up at the end."
              fail(label + " should return " + short(expected) + ", but it returned " + short(result) + "." + hint)

          @test("restore_shelf moves the first book to the end")
          def _():
              check(["Moon Maps", "Owl Post", "Alchemy", "Charms"])

          @test("It works for shelves of any length")
          def _():
              check(["Zeta", "Alpha", "Beta"])
              check(["Quills", "Ink"])
              check(["Zoology of Dragons", "Alchemy", "Botany", "Charms"])
              check(["Charms", "Zoology of Dragons", "Alchemy", "Botany"])
              check(["Yarrow", "Astronomy", "Bestiary", "Cauldrons", "Divination", "Elixirs", "Familiars", "Glyphs"])

          @test("A shelf with one book stays the same")
          def _():
              check(["The Only Book"])

          @test("An empty shelf gives an empty list")
          def _():
              check([])

          @test("The list you were given is left unchanged")
          def _():
              books = ["Moon Maps", "Owl Post", "Alchemy", "Charms"]
              result, label, given = restore(books)
              if given != books:
                  fail(label + " changed the original list into " + short(given) + ". Leave the shelf you were given "
                       "alone: build a new list with slices and " + code("+") + ", or work on a copy made with "
                       + code("list(books)") + ".")
        `,
        scene: { icon: "📚", successIcon: "📖", successText: "The misplaced tome floats off the front of the shelf and settles neatly at the end.", effect: "rise" }
      },

      // ------------------------------------------------------------------
      {
        id: "library-most-overdue",
        title: "The Most Overdue Book",
        difficulty: "easy",
        concepts: ["for loops", "enumerate()", "max()"],
        story: [
          "A drift of very late library slips flutters onto Ada's desk. Glitch has been borrowing books and \"forgetting\" to bring them back.",
          "\"Let's find the worst offender first,\" says Ada. \"Then Pip can fly over and fetch it.\" Pip puffs up importantly."
        ],
        task: [
          "Define `most_overdue(days_late)`. `days_late` is a list of whole numbers: how many days each book on the shelf is overdue. Return the **position** (index) of the most overdue book.",
          { list: [
            "If several books are tied for most overdue, return the position of the **first** one.",
            "If the list is empty, return `None`.",
            "Don't change the list."
          ] },
          { code: py`
            print(most_overdue([3, 12, 7, 12]))
            print(most_overdue([]))
          `, output: "1\nNone" }
        ],
        lesson: [
          "A `for` loop can walk straight through a list, giving you one item at a time. When you also need each item's **position**, use `enumerate()`, which hands you *(position, item)* pairs:",
          { code: py`
            scores = [7, 3, 9, 4]
            for position, score in enumerate(scores):
                print(position, score)
          `, output: "0 7\n1 3\n2 9\n3 4" },
          "To find the smallest or largest item, remember the **best so far** and update it whenever you meet something better:",
          { code: py`
            def lowest_score(scores):
                best = scores[0]
                for score in scores:
                    if score < best:       # strictly smaller, so ties keep the earlier one
                        best = score
                return best

            print(lowest_score([7, 3, 9, 3]))
          `, output: "3" },
          "Python also has built-ins for common jobs: `len(items)`, `sum(items)`, `min(items)`, `max(items)`, and `items.index(value)`, which gives the position of the **first** item equal to `value`. `min()` and `max()` crash on an empty list, so check for that first: an empty list counts as `False`, so `if not items:` means \"if the list is empty\" (`if len(items) == 0:` works too)."
        ],
        starter: py`
          def most_overdue(days_late):
              # Return the position of the most overdue book
              # (the first one if there's a tie, None for an empty list).
              pass


          print(most_overdue([3, 12, 7, 12]))   # should print 1
          print(most_overdue([]))               # should print None
        `,
        hints: [
          "Deal with the empty list first: `if not days_late:` then `return None`.",
          "Loop with `enumerate(days_late)` and remember the position of the best book so far. Only replace it when a book is **strictly** more overdue (`>`), so that ties keep the first one.",
          "Or let the built-ins do the work: `max(days_late)` is the largest number of days, and `days_late.index(...)` finds the position where it first appears."
        ],
        solution: py`
          def most_overdue(days_late):
              """Return the position of the most overdue book (the first one on a tie)."""
              if not days_late:
                  return None
              best = 0
              for position, days in enumerate(days_late):
                  if days > days_late[best]:
                      best = position
              return best


          print(most_overdue([3, 12, 7, 12]))
          print(most_overdue([]))
        `,
        altSolutions: [
          py`
            def most_overdue(days_late):
                if len(days_late) == 0:
                    return None
                return days_late.index(max(days_late))
          `,
          py`
            def most_overdue(days_late):
                best_position = None
                best_days = -1
                for i in range(len(days_late)):
                    if days_late[i] > best_days:
                        best_days = days_late[i]
                        best_position = i
                return best_position
          `
        ],
        wrongSolutions: [
          py`
            def most_overdue(days_late):
                if not days_late:
                    return None
                return max(days_late)
          `,
          py`
            def most_overdue(days_late):
                if not days_late:
                    return None
                best = 0
                for position, days in enumerate(days_late):
                    if days >= days_late[best]:
                        best = position
                return best
          `,
          py`
            def most_overdue(days_late):
                if not days_late:
                    return None
                best = 0
                for i in range(len(days_late) - 1):
                    if days_late[i] > days_late[best]:
                        best = i
                return best
          `
        ],
        tests: py`
          def first_max(days):
              if not days:
                  return None
              return days.index(max(days))

          def overdue(days):
              most_overdue = need_function("most_overdue", 1)
              given = list(days)
              label = code("most_overdue(" + short(days) + ")")
              result, printed = capture(most_overdue, given)
              if given != days:
                  fail(label + " changed the list it was given (it became " + short(given) + "). Positions matter here, "
                       "so find the answer without sorting or changing the list.")
              if result is None and days:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the position instead of printing it.")
                  if max(days) == 0:
                      fail(label + " returned " + code("None") + ". Every book here is 0 days late, so the first book "
                           "(position 0) is the answer. Start with the first book as the best so far instead of "
                           + code("None") + ".")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the position?")
              return result, label

          def confuses_position():
              """most_overdue([9, 3, 3]) is 0; comparing days with the position best gives 2."""
              try:
                  return capture(need_function("most_overdue", 1), [9, 3, 3])[0] == 2
              except Exception:
                  return False

          def check(days):
              result, label = overdue(days)
              expected = first_max(days)
              if expected is None:
                  if result is not None:
                      fail(label + " should return " + code("None") + " for an empty list, but it returned " + short(result)
                           + ". With no books there is no position to give, so " + code("return None") + ".")
                  return
              if isinstance(result, bool) or not isinstance(result, int):
                  fail(label + " should return a position (a whole number), but it returned " + short(result) + " (a "
                       + type(result).__name__ + ").")
              if result == expected:
                  return
              biggest = max(days)
              last = len(days) - 1 - days[::-1].index(biggest)
              hint = ""
              if confuses_position():
                  hint = (" It looks like you compared a number of days with a position. If " + code("best")
                          + " holds a position, compare each book with the best book's days: "
                          + code("if days > days_late[best]:") + ".")
              elif result == biggest:
                  hint = " That's how many days late the book is. Return its position (index) in the list instead."
              elif result == last:
                  hint = (" That's the last of the tied books. On a tie, return the first one: only replace your best "
                          "position when a book is strictly more overdue (" + code(">") + ", not " + code(">=") + ").")
              elif result == -1:
                  hint = " -1 isn't a position on this shelf. Start with the first book (position 0) as the best so far."
              elif result == expected + 1:
                  hint = " That's one position too far. Positions start at 0: the first book is at position 0."
              elif expected == len(days) - 1:
                  hint = " The most overdue book is the very last one. Does your loop check every position, including the last?"
              fail(label + " should return " + str(expected) + ", but it returned " + short(result) + "." + hint)

          @test("most_overdue([3, 12, 7]) returns 1")
          def _():
              check([3, 12, 7])
              check([40, 2, 9])

          @test("It returns a position, not a number of days")
          def _():
              check([5, 80, 20])
              check([2, 6])

          @test("The last book is checked too")
          def _():
              check([1, 2, 99])
              check([0, 5, 6, 7])

          @test("On a tie, the first book wins")
          def _():
              check([3, 12, 7, 12])
              check([9, 9])
              check([4, 9, 9, 9, 1])

          @test("One book, or books that are all 0 days late")
          def _():
              check([7])
              check([0, 0, 0])

          @test("An empty list gives None")
          def _():
              check([])
        `,
        scene: { icon: "🦉", successIcon: "📕", successText: "Pip swoops off and returns with the overdue book, looking extremely pleased.", effect: "sparkle" }
      },

      // ------------------------------------------------------------------
      {
        id: "library-ingredient-ledger",
        title: "The Ingredient Ledger",
        difficulty: "medium",
        concepts: ["dictionaries", "tuples", "unpacking"],
        story: [
          "Deep in the library's alchemy wing, the ingredient ledger has lost its most important page: the totals. Glitch used it to wrap a sandwich.",
          "\"Luckily we still have the list of every delivery,\" says Ada, unrolling a very long scroll. \"A **dictionary** will add it all up for us.\""
        ],
        task: [
          "Define `stock_ledger(deliveries)`. `deliveries` is a list of `(ingredient, jars)` tuples, in the order they happened. A **negative** number of jars means jars were taken **out**.",
          "Return a **dictionary** that maps each ingredient to its total number of jars. Every ingredient that appears in the list must be in the dictionary, even if its total ends up as `0`. No deliveries means an empty dictionary. Don't change the list.",
          { code: py`
            deliveries = [("newt eye", 3), ("moonwort", 2), ("newt eye", -1)]
            print(stock_ledger(deliveries))
          `, output: "{'newt eye': 2, 'moonwort': 2}" }
        ],
        lesson: [
          "A **dictionary** maps **keys** to **values**, like a ledger that maps names to amounts. Look values up, or store new ones, with square brackets:",
          { code: py`
            stock = {"ink": 4, "quills": 10}
            stock["ink"] = stock["ink"] + 1     # update an existing key
            stock["glue"] = 2                   # add a new key
            print(stock)
            print("ink" in stock, "wax" in stock, stock.get("wax", 0))
          `, output: "{'ink': 5, 'quills': 10, 'glue': 2}\nTrue False 0" },
          "Reading a key that isn't there, like `stock[\"wax\"]`, crashes with a `KeyError`. Check with `in` first, or use `.get(key, default)`, which gives you the default instead of crashing.",
          "A **tuple** is a small, fixed group of values in round brackets, such as `(\"ink\", 4)`. You can **unpack** it into separate names, even right in a `for` loop. A dictionary's `.items()` gives you its *(key, value)* pairs, ready to unpack in just the same way:",
          { code: py`
            delivery = ("ink", 4)
            name, amount = delivery          # unpacking
            print(name, amount)

            for name, amount in [("glue", 2), ("wax", 5)]:
                print(name, "->", amount)

            prices = {"ink": 3, "quills": 1}
            for name, price in prices.items():
                print(name, "costs", price)
          `, output: "ink 4\nglue -> 2\nwax -> 5\nink costs 3\nquills costs 1" }
        ],
        starter: py`
          def stock_ledger(deliveries):
              totals = {}
              # Add up the jars for each ingredient.

              return totals


          deliveries = [("newt eye", 3), ("moonwort", 2), ("newt eye", -1)]
          print(stock_ledger(deliveries))   # {'newt eye': 2, 'moonwort': 2}
        `,
        hints: [
          "Start with an empty dictionary, `totals = {}`, and loop over the deliveries, unpacking each one: `for ingredient, jars in deliveries:`.",
          "For each delivery, **add** `jars` to that ingredient's total. The first time you meet an ingredient it isn't in the dictionary yet, and `totals.get(ingredient, 0)` treats a missing total as 0.",
          "Inside the loop: `totals[ingredient] = totals.get(ingredient, 0) + jars`. Return `totals` after the loop."
        ],
        solution: py`
          def stock_ledger(deliveries):
              """Total up the jars of each ingredient."""
              totals = {}
              for ingredient, jars in deliveries:
                  totals[ingredient] = totals.get(ingredient, 0) + jars
              return totals


          deliveries = [("newt eye", 3), ("moonwort", 2), ("newt eye", -1)]
          print(stock_ledger(deliveries))
        `,
        altSolutions: [
          py`
            def stock_ledger(deliveries):
                totals = {}
                for delivery in deliveries:
                    name = delivery[0]
                    amount = delivery[1]
                    if name in totals:
                        totals[name] += amount
                    else:
                        totals[name] = amount
                return totals
          `,
          py`
            from collections import defaultdict

            def stock_ledger(deliveries):
                totals = defaultdict(int)
                for ingredient, jars in deliveries:
                    totals[ingredient] += jars
                return dict(totals)
          `
        ],
        wrongSolutions: [
          py`
            def stock_ledger(deliveries):
                totals = {}
                for ingredient, jars in deliveries:
                    totals[ingredient] = jars
                return totals
          `,
          py`
            def stock_ledger(deliveries):
                totals = {}
                for ingredient, jars in deliveries:
                    totals[ingredient] = totals.get(ingredient, 0) + 1
                return totals
          `,
          py`
            def stock_ledger(deliveries):
                totals = {}
                for ingredient, jars in deliveries:
                    totals[ingredient] += jars
                return totals
          `
        ],
        tests: py`
          def reference(deliveries):
              totals = {}
              for name, jars in deliveries:
                  totals[name] = totals.get(name, 0) + jars
              return totals

          def ledger(deliveries):
              stock_ledger = need_function("stock_ledger", 1)
              given = list(deliveries)
              label = code("stock_ledger(" + short(deliveries, 90) + ")")
              try:
                  result, printed = capture(stock_ledger, given)
              except TypeError as problem:
                  if "NoneType" in str(problem) and ".get(" in source:
                      fail(label + " crashed: " + str(problem) + ". " + code(".get(key)") + " gives " + code("None")
                           + " for an ingredient that isn't in the ledger yet. Give it a default: "
                           + code("totals.get(ingredient, 0)") + ".")
                  raise
              if given != deliveries:
                  fail(label + " changed the list of deliveries it was given. Read the list, but don't change it.")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the dictionary instead of printing it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the dictionary?")
              if not isinstance(result, dict):
                  extra = ""
                  if isinstance(result, list):
                      extra = " Return the dictionary itself, not a list made from it."
                  fail(label + " should return a dictionary (dict), but it returned " + short(result) + " (a "
                       + type(result).__name__ + ")." + extra)
              return result, label

          def remembers(deliveries, first):
              """A ledger kept outside the function gives a different answer when called again."""
              try:
                  again, _ = capture(need_function("stock_ledger", 1), list(deliveries))
              except Exception:
                  return False
              return again != first

          def check(deliveries):
              result, label = ledger(deliveries)
              expected = reference(deliveries)
              if result == expected:
                  return
              snapshot = dict(result)
              if remembers(deliveries, snapshot):
                  fail(label + " should return " + short(expected, 200) + ", but it returned " + short(snapshot, 200)
                       + ". Called again with the same deliveries, it gives a different answer, so it seems to remember "
                       "earlier calls. Is your dictionary created outside the function? Create " + code("totals = {}")
                       + " inside the function so every call starts empty.")
              last, count = {}, {}
              for name, jars in deliveries:
                  last[name] = jars
                  count[name] = count.get(name, 0) + 1
              hint = ""
              if not result:
                  hint = (" Your ledger is empty. Loop over the deliveries and add each one's jars to the total for its "
                          "ingredient.")
              elif any(isinstance(key, tuple) for key in result):
                  hint = (" Some keys are whole deliveries, like " + short(next(k for k in result if isinstance(k, tuple)))
                          + ". Unpack each delivery with " + code("for ingredient, jars in deliveries:")
                          + " and use just the ingredient as the key.")
              elif result == last:
                  hint = " It looks like each delivery replaced the total instead of adding to it."
              elif result == count:
                  hint = " It looks like you counted the deliveries. Add up the jars instead."
              else:
                  missing = [name for name in expected if name not in result]
                  extra = [key for key in result if key not in expected]
                  if missing:
                      hint = " The ledger is missing " + short(missing[0]) + "."
                      if expected[missing[0]] == 0:
                          hint += " Keep every ingredient that appears in the list, even when its total is 0."
                  elif extra:
                      hint = " The ledger has a key " + short(extra[0]) + ", which isn't in these deliveries."
                      if isinstance(extra[0], str):
                          hint += (" Is your dictionary created outside the function? Then it remembers earlier calls: "
                                   "create " + code("totals = {}") + " inside the function so every call starts empty.")
                  else:
                      for name in expected:
                          if result[name] != expected[name]:
                              hint = (" The total for " + short(name) + " should be " + str(expected[name])
                                      + ", but yours is " + short(result[name]) + ".")
                              if any(n == name and j < 0 for n, j in deliveries):
                                  hint += " Remember that a negative number of jars means some were taken out."
                              break
              fail(label + " should return " + short(expected, 200) + ", but it returned " + short(result, 200) + "." + hint)

          @test('stock_ledger([("moonwort", 2)]) returns {"moonwort": 2}')
          def _():
              check([("moonwort", 2)])

          @test("Deliveries of the same ingredient are added up")
          def _():
              check([("newt eye", 3), ("moonwort", 2), ("newt eye", 4)])
              check([("newt eye", 3), ("moonwort", 2), ("newt eye", -1)])

          @test("Negative numbers mean jars were taken out")
          def _():
              check([("dragon scale", 5), ("dragon scale", -2), ("fairy dust", 1), ("fairy dust", -1)])

          @test("No deliveries gives an empty dictionary")
          def _():
              check([])

          @test("A long day of deliveries adds up")
          def _():
              names = ["newt eye", "moonwort", "dragon scale", "fairy dust", "toadstool"]
              check([(names[(i * 7) % 5], (i * 5) % 9 - 3) for i in range(40)])
        `,
        scene: { icon: "⚗️", successIcon: "🧪", successText: "The cauldron bubbles happily as every jar in the alchemy wing is counted and labelled.", effect: "bubble" }
      },

      // ------------------------------------------------------------------
      {
        id: "library-common-runes",
        title: "The True Runes",
        difficulty: "medium",
        concepts: ["sets", "intersection", "sorted()"],
        story: [
          "Ada unrolls three copies of an ancient scroll. Glitch has scribbled extra runes all over each copy, but never managed to scribble the same ones on all of them.",
          "\"The true runes are the ones that appear on **every** copy,\" she says. \"Sets are perfect for this: they only care about *which* things are present.\""
        ],
        task: [
          "Define `common_runes(scrolls)`. `scrolls` is a list of strings of lowercase letters (runes). Return a **list** of the runes that appear in **every** scroll, each rune **once**, in **alphabetical order**.",
          "If there are no scrolls at all, or no rune appears in all of them, return an empty list. Don't change the list you're given.",
          { code: py`
            print(common_runes(["glitch", "witch", "itchy"]))
            print(common_runes(["owl", "cat"]))
          `, output: "['c', 'h', 'i', 't']\n[]" }
        ],
        lesson: [
          "A **set** is a collection with no order and no duplicates: `set(\"banana\")` keeps just `'a'`, `'b'` and `'n'`. Checking membership with `in` is very fast, and sets combine like circles in a Venn diagram:",
          { code: py`
            fire = set("ember")           # {'e', 'm', 'b', 'r'}
            water = set("river")          # {'r', 'i', 'v', 'e'}
            print(sorted(fire & water))   # in both (intersection)
            print(sorted(fire | water))   # in either (union)
            print(sorted(fire - water))   # in fire but not in water (difference)
            print("m" in fire)
          `, output: "['e', 'r']\n['b', 'e', 'i', 'm', 'r', 'v']\n['b', 'm']\nTrue" },
          "Sets print in an unpredictable order, so `sorted()` is handy: given a set, it returns a new **list** in ascending (alphabetical) order.",
          "To combine many sets, start from one of them and update a running result in a loop: `result = result & other`, or the shorthand `result &= other`.",
          { warning: "An empty set is written `set()`, because `{}` makes an empty *dictionary*. And think about where you start: the intersection of anything with an empty set is always empty!" }
        ],
        starter: py`
          def common_runes(scrolls):
              # Return a sorted list of the runes found in EVERY scroll.
              pass


          print(common_runes(["glitch", "witch", "itchy"]))   # ['c', 'h', 'i', 't']
        `,
        hints: [
          "Handle the special case first: no scrolls at all means `return []`.",
          "Start with the runes of the first scroll, `common = set(scrolls[0])`. Then loop over the other scrolls, keeping only the runes they also contain: `common = common & set(scroll)`.",
          "At the end, `return sorted(common)`: that turns the set into an alphabetical list."
        ],
        solution: py`
          def common_runes(scrolls):
              """Return the runes found in every scroll, in alphabetical order."""
              if not scrolls:
                  return []
              common = set(scrolls[0])
              for scroll in scrolls[1:]:
                  common = common & set(scroll)
              return sorted(common)


          print(common_runes(["glitch", "witch", "itchy"]))
        `,
        altSolutions: [
          py`
            def common_runes(scrolls):
                result = []
                if len(scrolls) == 0:
                    return result
                for rune in scrolls[0]:
                    in_all = True
                    for scroll in scrolls:
                        if rune not in scroll:
                            in_all = False
                    if in_all and rune not in result:
                        result.append(rune)
                result.sort()
                return result
          `,
          py`
            def common_runes(scrolls):
                if not scrolls:
                    return []
                return sorted(set(scrolls[0]).intersection(*scrolls[1:]))
          `
        ],
        wrongSolutions: [
          py`
            def common_runes(scrolls):
                runes = set()
                for scroll in scrolls:
                    runes = runes | set(scroll)
                return sorted(runes)
          `,
          py`
            def common_runes(scrolls):
                common = set()
                for scroll in scrolls:
                    common = common & set(scroll)
                return sorted(common)
          `,
          py`
            def common_runes(scrolls):
                if not scrolls:
                    return []
                common = set(scrolls[0])
                for scroll in scrolls:
                    common &= set(scroll)
                return common
          `
        ],
        tests: py`
          def reference(scrolls):
              if not scrolls:
                  return []
              common = set(scrolls[0])
              for scroll in scrolls[1:]:
                  common &= set(scroll)
              return sorted(common)

          def runes(scrolls):
              common_runes = need_function("common_runes", 1)
              given = list(scrolls)
              label = code("common_runes(" + short(scrolls) + ")")
              result, printed = capture(common_runes, given)
              if given != scrolls:
                  fail(label + " changed the list it was given (it became " + short(given) + "). Read the scrolls, but "
                       "don't change the list. To skip the first scroll, loop over the slice " + code("scrolls[1:]") + ".")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the list instead of printing it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the list?")
              if isinstance(result, (set, frozenset)):
                  fail(label + " returned a set, " + short(result) + ". Return a list in alphabetical order instead: "
                       + code("sorted(...)") + " turns a set into a sorted list.")
              if isinstance(result, str):
                  fail(label + " returned the string " + short(result) + ". Return a list of single runes instead, such as "
                       + code("['c', 'h']") + ": " + code("sorted(...)") + " gives you one, so there's no need to join it.")
              if not isinstance(result, list):
                  fail(label + " should return a list, but it returned " + short(result) + " (a " + type(result).__name__ + ").")
              return result, label

          def check(scrolls):
              result, label = runes(scrolls)
              expected = reference(scrolls)
              if result == expected:
                  return
              hint = ""
              everything = sorted(set("".join(scrolls)))
              if result == everything:
                  hint = (" That's every rune from any scroll. Keep only the runes found in all of them: the intersection, "
                          + code("&") + ".")
              elif result == [] and expected:
                  hint = (" Your answer is empty. If you start from an empty set, " + code("&")
                          + " keeps it empty: start from the runes of the first scroll instead.")
              elif len(result) == len(expected) and all(rune in expected for rune in result):
                  hint = " The right runes, but not in alphabetical order. " + code("sorted()") + " puts them in order."
              elif len(set(map(str, result))) < len(result):
                  hint = " Each rune should appear only once. A set removes the repeats."
              elif len(scrolls) > 2 and result == reference(scrolls[:2]):
                  hint = " Those are the runes shared by the first two scrolls only. Every scroll in the list must have them."
              fail(label + " should return " + short(expected) + ", but it returned " + short(result) + "." + hint)

          @test("Two scrolls: the runes they share")
          def _():
              check(["glitch", "witch"])

          @test("Each rune appears once, in alphabetical order")
          def _():
              check(["banana", "bandana"])
              check(["noon", "onion"])

          @test("A true rune appears on every scroll")
          def _():
              check(["glitch", "witch", "itchy"])
              check(["spell", "shell", "smell", "swell"])
              check(["abc", "abd", "xbz"])

          @test("No shared runes gives an empty list")
          def _():
              check(["owl", "cat"])
              check(["abc", "", "abc"])

          @test("A single scroll: its runes, once each")
          def _():
              check(["mississippi"])

          @test("No scrolls at all gives an empty list")
          def _():
              check([])
        `,
        scene: { icon: "📜", successIcon: "✨", successText: "A crackle of lightning burns away Glitch's scribbles, leaving only the true runes glowing on the scroll.", effect: "lightning" }
      },

      // ------------------------------------------------------------------
      {
        id: "library-catalogue",
        title: "The Shredded Catalogue",
        difficulty: "medium",
        concepts: ["list comprehensions", "dict comprehensions", "zip()"],
        story: [
          "Glitch fed the library catalogue to a very confused paper moth. Only two lists survived: the titles, and the years the books were written, in matching order.",
          "\"Rebuilding the catalogue card by card would take a century,\" says Ada. \"A **comprehension** can rebuild it in one line.\""
        ],
        task: [
          "`titles` and `years` are lists of the same length: `years[i]` is the year `titles[i]` was written. Define two functions, using **at least one comprehension**:",
          { list: [
            "`catalogue(titles, years)` returns a **dictionary** that maps each title to its year.",
            "`ancient_tomes(titles, years, before)` returns a **list** of the titles written **before** the year `before` (strictly earlier), in their original order."
          ] },
          "Neither function should change the lists it is given.",
          { code: py`
            titles = ["Charms", "Potions", "Runes"]
            years = [1650, 1820, 1203]
            print(catalogue(titles, years))
            print(ancient_tomes(titles, years, 1700))
          `, output: "{'Charms': 1650, 'Potions': 1820, 'Runes': 1203}\n['Charms', 'Runes']" }
        ],
        lesson: [
          "A **list comprehension** builds a new list from another collection in a single expression: *what to keep* `for` *each item* `in` *the collection*, optionally followed by an `if` filter.",
          { code: py`
            pages = [3, 8, 5, 12]
            doubled = [n * 2 for n in pages]
            long_ones = [n for n in pages if n > 4]
            print(doubled, long_ones)
          `, output: "[6, 16, 10, 24] [8, 5, 12]" },
          "A **dictionary comprehension** works the same way, with `key: value` inside curly brackets:",
          { code: py`
            spells = ["hex", "charm", "jinx"]
            lengths = {spell: len(spell) for spell in spells}
            print(lengths)
          `, output: "{'hex': 3, 'charm': 5, 'jinx': 4}" },
          "`zip()` walks through two lists side by side and gives you pairs, which you can unpack:",
          { code: py`
            owls = ["Pip", "Hoot"]
            ages = [3, 7]
            for owl, age in zip(owls, ages):
                print(owl, "is", age)
          `, output: "Pip is 3\nHoot is 7" },
          { tip: "Anything you can loop over, including `zip(...)`, can go after the `in` of a comprehension. A comprehension builds a new collection and leaves the original lists untouched." }
        ],
        starter: py`
          def catalogue(titles, years):
              # Return a dictionary: title -> year.
              pass


          def ancient_tomes(titles, years, before):
              # Return a list of the titles written before the year "before".
              pass


          titles = ["Charms", "Potions", "Runes"]
          years = [1650, 1820, 1203]
          print(catalogue(titles, years))
          print(ancient_tomes(titles, years, 1700))
        `,
        hints: [
          "`zip(titles, years)` gives you `(title, year)` pairs. You can loop over those pairs inside a comprehension: `for title, year in zip(titles, years)`.",
          "For `catalogue`, put `title: year` in front of that loop, inside curly brackets. For `ancient_tomes`, put `title` in front, inside square brackets, and add `if year < before` at the end.",
          "`return {title: year for title, year in zip(titles, years)}`, and `ancient_tomes` follows the same pattern with `[...]` and an `if`."
        ],
        solution: py`
          def catalogue(titles, years):
              """Map each title to the year it was written."""
              return {title: year for title, year in zip(titles, years)}


          def ancient_tomes(titles, years, before):
              """List the titles written before the given year, in shelf order."""
              return [title for title, year in zip(titles, years) if year < before]


          titles = ["Charms", "Potions", "Runes"]
          years = [1650, 1820, 1203]
          print(catalogue(titles, years))
          print(ancient_tomes(titles, years, 1700))
        `,
        altSolutions: [
          py`
            def catalogue(titles, years):
                return dict(zip(titles, years))

            def ancient_tomes(titles, years, before):
                return [titles[i] for i in range(len(titles)) if years[i] < before]
          `,
          py`
            def catalogue(titles, years):
                cards = {}
                for i in range(len(titles)):
                    cards[titles[i]] = years[i]
                return cards

            def ancient_tomes(titles, years, before):
                return list(title for title, year in zip(titles, years) if year < before)
          `
        ],
        wrongSolutions: [
          py`
            def catalogue(titles, years):
                return {title: year for title, year in zip(titles, years)}

            def ancient_tomes(titles, years, before):
                return [title for title, year in zip(titles, years) if year <= before]
          `,
          py`
            def catalogue(titles, years):
                cards = {}
                for i in range(len(titles)):
                    cards[titles[i]] = years[i]
                return cards

            def ancient_tomes(titles, years, before):
                old = []
                for i in range(len(titles)):
                    if years[i] < before:
                        old.append(titles[i])
                return old
          `,
          py`
            def catalogue(titles, years):
                return {year: title for title, year in zip(titles, years)}

            def ancient_tomes(titles, years, before):
                return [title for title, year in zip(titles, years) if year < before]
          `
        ],
        tests: py`
          import ast
          import inspect

          SHORT = (["Charms", "Potions", "Runes"], [1650, 1820, 1203])
          LONG = (["Herbology", "Star Charts", "Old Hexes", "Mirror Lore", "Dragon Diets", "Tea Leaves"],
                  [1702, 1999, 1066, 1650, 1888, 1702])

          def described(titles, years):
              return " (with titles " + short(titles, 90) + " and years " + short(years, 60) + ")"

          def answer(func, args, label, kind):
              given = [list(a) if isinstance(a, list) else a for a in args]
              result, printed = capture(func, *given)
              if given[0] != args[0] or given[1] != args[1]:
                  fail(label + " changed one of the lists it was given. Build a new " + kind + " and leave the lists alone.")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the " + kind + " instead of printing it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the " + kind + "?")
              return result

          OUTSIDE = (" Your function seems to use the example lists from outside the function. Work with its parameters, "
                     + code("titles") + " and " + code("years") + ", instead.")

          def param_order(func, name, wanted):
              """Fail clearly if the parameter names are right but in another order."""
              try:
                  names = list(inspect.signature(func).parameters)
              except (TypeError, ValueError):
                  return
              if names != wanted and sorted(names) == sorted(wanted):
                  fail("The parameters of " + code(name) + " are " + code("(" + ", ".join(names) + ")") + ", but they must "
                       "be in the order " + code("(" + ", ".join(wanted) + ")") + ": arguments are matched to parameters "
                       "by position, so the order in the " + code("def") + " line matters.")

          def check_catalogue(titles, years):
              catalogue = need_function("catalogue", 2)
              param_order(catalogue, "catalogue", ["titles", "years"])
              label = code("catalogue(titles, years)") + described(titles, years)
              result = answer(catalogue, (titles, years), label, "dictionary")
              if not isinstance(result, dict):
                  fail(label + " should return a dictionary (dict), but it returned " + short(result) + " (a "
                       + type(result).__name__ + ").")
              expected = dict(zip(titles, years))
              if result == expected:
                  return
              hint = ""
              if result == dict(zip(years, titles)):
                  hint = " The keys and values are swapped: each title should be a key, with its year as the value."
              elif (titles, years) != SHORT and result == dict(zip(*SHORT)):
                  hint = OUTSIDE
              fail(label + " should return " + short(expected, 200) + ", but it returned " + short(result, 200) + "." + hint)

          def check_ancient(titles, years, before):
              ancient_tomes = need_function("ancient_tomes", 3)
              param_order(ancient_tomes, "ancient_tomes", ["titles", "years", "before"])
              label = code("ancient_tomes(titles, years, " + str(before) + ")") + described(titles, years)
              result = answer(ancient_tomes, (titles, years, before), label, "list")
              if not isinstance(result, list):
                  fail(label + " should return a list, but it returned " + short(result) + " (a " + type(result).__name__ + ").")
              pairs = list(zip(titles, years))
              expected = [t for t, y in pairs if y < before]
              if result == expected:
                  return
              hint = ""
              if result == [(t, y) for t, y in pairs if y < before]:
                  hint = " Return just the titles, not (title, year) pairs."
              elif (titles, years) != SHORT and result == [t for t, y in zip(*SHORT) if y < before]:
                  hint = OUTSIDE
              elif result == [t for t, y in pairs if y <= before]:
                  hint = (" A book written in exactly " + str(before) + " is not older than " + str(before) + ": use "
                          + code("<") + ", not " + code("<=") + ".")
              elif result == [y for t, y in pairs if y < before]:
                  hint = " Those are the years. Return the titles instead."
              elif result in ([t for t, y in pairs if y >= before], [t for t, y in pairs if y > before]):
                  hint = " Those are the newer books. Keep the titles written before " + str(before) + "."
              elif len(result) == len(expected) and all(item in expected for item in result):
                  hint = " The right titles, but keep them in their original shelf order."
              fail(label + " should return " + short(expected) + ", but it returned " + short(result) + "." + hint)

          @test("catalogue maps each title to its year")
          def _():
              check_catalogue(*SHORT)
              check_catalogue(*LONG)

          @test("A catalogue of no books is an empty dictionary")
          def _():
              check_catalogue([], [])

          @test("ancient_tomes keeps the older titles, in shelf order")
          def _():
              check_ancient(SHORT[0], SHORT[1], 1700)
              check_ancient(LONG[0], LONG[1], 1800)

          @test("A book written in exactly that year is not older")
          def _():
              check_ancient(SHORT[0], SHORT[1], 1650)
              check_ancient(LONG[0], LONG[1], 1702)

          @test("No ancient tomes, or no books, gives an empty list")
          def _():
              check_ancient(SHORT[0], SHORT[1], 1000)
              check_ancient([], [], 1500)

          @test("At least one of your functions uses a comprehension")
          def _():
              need_function("catalogue", 2)
              need_function("ancient_tomes", 3)
              kinds = (ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp)
              for node in ast.walk(ast.parse(source)):
                  if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                      if any(isinstance(inner, kinds) for inner in ast.walk(node)):
                          return
              fail("This chamber is all about comprehensions: write at least one of your functions with one, in the "
                   "shape " + code("[n * 2 for n in pages if n > 4]") + " or " + code("{key: value for ... in ...}") + ".")
        `,
        scene: { icon: "🗂️", successIcon: "🌳", successText: "Fresh catalogue cards sprout like leaves on a great paper tree, each one neatly labelled.", effect: "bloom" }
      },

      // ------------------------------------------------------------------
      {
        id: "library-reshelve",
        title: "Reshelving the Archives",
        difficulty: "medium",
        concepts: ["sorted()", "lambda", "tuples"],
        story: [
          "The Archive Wing is a mountain of tumbled books. Ada wants them reshelved by author, so readers can find them, with each author's **newest** work first, so the latest discoveries are easy to spot.",
          "\"Python's `sorted()` can sort by any rule you like,\" she says. \"You just have to tell it *what to look at*.\""
        ],
        task: [
          "Each book is a tuple `(title, author, year)`. Define `reshelve(books)` that returns a **new** list of the same books, sorted:",
          { steps: [
            "by **author**, A to Z;",
            "books by the same author: **newest first** (bigger year first)."
          ] },
          "Don't change the list you're given. An empty list gives an empty list.",
          { code: py`
            books = [("Moon Maps", "Morgana", 1912), ("Owl Post", "Pip", 1999),
                     ("Charm Basics", "Ada", 1843), ("Mirror Magic", "Morgana", 1850)]
            for book in reshelve(books):
                print(book)
          `, output: "('Charm Basics', 'Ada', 1843)\n('Moon Maps', 'Morgana', 1912)\n('Mirror Magic', 'Morgana', 1850)\n('Owl Post', 'Pip', 1999)" }
        ],
        lesson: [
          "`sorted(items)` returns a **new**, sorted list and leaves the original alone. (`items.sort()` sorts the list *in place* and returns `None`.) Tuples sort by their first item, then by the second to break ties, and so on.",
          "To sort by something else, give `sorted()` a **key**: a function that turns each item into the value to compare. A **lambda** is a tiny, nameless function written in one line: `lambda p: p[1]` means \"given `p`, give back `p[1]`\".",
          { code: py`
            potions = [("sage", 3), ("mint", 10), ("rose", 3)]
            print(sorted(potions))                              # by name, then number
            print(sorted(potions, key=lambda p: p[1]))          # by number only
            print(sorted(potions, key=lambda p: p[1], reverse=True))
          `, output: "[('mint', 10), ('rose', 3), ('sage', 3)]\n[('sage', 3), ('rose', 3), ('mint', 10)]\n[('mint', 10), ('sage', 3), ('rose', 3)]" },
          "To sort by **several** things, make the key return a tuple: `key=lambda p: (p[1], p[0])` sorts by number, then by name. To flip the direction of just **one** number, make it negative: `-p[1]` puts big numbers first while the rest of the key still goes upwards.",
          { warning: "`reverse=True` reverses the *whole* ordering, every part of the key, not just one part of it." }
        ],
        starter: py`
          def reshelve(books):
              # Return a NEW list sorted by author (A to Z),
              # with each author's newest book first.
              pass


          books = [("Moon Maps", "Morgana", 1912), ("Owl Post", "Pip", 1999),
                   ("Charm Basics", "Ada", 1843), ("Mirror Magic", "Morgana", 1850)]
          print(reshelve(books))
        `,
        hints: [
          "Use `sorted(books, key=...)` so the original list stays as it is. Inside each tuple, `book[0]` is the title, `book[1]` the author and `book[2]` the year.",
          "Your key should return a tuple: first the author, then something that puts **bigger** years first. A negative year does exactly that.",
          "`return sorted(books, key=lambda book: (book[1], -book[2]))`"
        ],
        solution: py`
          def reshelve(books):
              """Sort by author (A to Z), with each author's newest book first."""
              return sorted(books, key=lambda book: (book[1], -book[2]))


          books = [("Moon Maps", "Morgana", 1912), ("Owl Post", "Pip", 1999),
                   ("Charm Basics", "Ada", 1843), ("Mirror Magic", "Morgana", 1850)]
          for book in reshelve(books):
              print(book)
        `,
        altSolutions: [
          py`
            def shelf_order(book):
                title, author, year = book
                return (author, -year)

            def reshelve(books):
                return sorted(books, key=shelf_order)
          `,
          py`
            def reshelve(books):
                newest_first = sorted(books, key=lambda b: b[2], reverse=True)
                return sorted(newest_first, key=lambda b: b[1])
          `,
          py`
            def reshelve(books):
                shelf = list(books)
                shelf.sort(key=lambda b: (b[1], -b[2]))
                return shelf
          `
        ],
        wrongSolutions: [
          py`
            def reshelve(books):
                return sorted(books, key=lambda b: (b[1], b[2]), reverse=True)
          `,
          py`
            def reshelve(books):
                books.sort(key=lambda b: (b[1], -b[2]))
                return books
          `,
          py`
            def reshelve(books):
                return sorted(books, key=lambda b: (b[1], b[2]))
          `
        ],
        tests: py`
          EXAMPLE = [("Moon Maps", "Morgana", 1912), ("Owl Post", "Pip", 1999),
                     ("Charm Basics", "Ada", 1843), ("Mirror Magic", "Morgana", 1850)]

          def shelve(books):
              reshelve = need_function("reshelve", 1)
              given = list(books)
              label = code("reshelve(books)")
              result, printed = capture(reshelve, given)
              if result is None:
                  if given != books:
                      fail(label + " sorted the list it was given and returned " + code("None") + ". " + code(".sort()")
                           + " sorts a list in place and returns " + code("None") + ". Use " + code("sorted(books, key=...)")
                           + ", which returns a new sorted list.")
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the sorted list instead of printing it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the sorted list?")
              if not isinstance(result, list):
                  fail(label + " should return a list, but it returned " + short(result) + " (a " + type(result).__name__ + ").")
              return result, given

          def same_books(result, books):
              return len(result) == len(books) and all(result.count(book) == books.count(book) for book in books)

          def order(books):
              """Books as 'Title (Author, Year) → …', which is easier to read than a list of tuples."""
              return " → ".join(b[0] + " (" + b[1] + ", " + str(b[2]) + ")" for b in books)

          def check(books):
              result, given = shelve(books)
              expected = sorted(books, key=lambda b: (b[1], -b[2]))
              if result == expected:
                  return
              if not same_books(result, books):
                  fail(code("reshelve") + " should return the same books (the same tuples) in a new order. For the books "
                       + short(books, 300) + " it returned " + short(result, 300) + ".")
              authors = [b[1] for b in result]
              if authors != [b[1] for b in expected]:
                  if authors == sorted(authors, reverse=True) and ("reverse" in source or "[::-1]" in source):
                      hint = (" The authors go from Z to A. Reversing (for example with " + code("reverse=True")
                              + ") flips the whole ordering: instead, make just the year negative in your key ("
                              + code("-book[2]") + ") and let the authors go A to Z.")
                  else:
                      hint = (" Sort by the author first (" + code("book[1]") + "), from A to Z. In a key tuple, the first "
                              "item decides first, so the author must come before the year.")
              elif result == sorted(books, key=lambda b: (b[1], b[2])):
                  hint = " Each author's books are oldest first, but the newest (biggest year) should come first."
              else:
                  hint = " Within each author, order the books by year, newest first. The titles don't decide anything."
              fail("The shelf should read: " + order(expected) + ". Yours reads: " + order(result) + "." + hint)

          @test("reshelve returns the same books in a new list")
          def _():
              result, given = shelve(EXAMPLE)
              expect(same_books(result, EXAMPLE), code("reshelve") + " should return the same four books (the same tuples), "
                     "just in a new order, but it returned " + short(result, 300) + ".")

          @test("Authors go from A to Z")
          def _():
              check([("Owl Post", "Pip", 1999), ("Hex Hints", "Glitch", 2021), ("Charm Basics", "Ada", 1843),
                     ("Moon Maps", "Morgana", 1912)])

          @test("Each author's newest book comes first")
          def _():
              check(EXAMPLE)

          @test("Years decide the order within an author, not titles")
          def _():
              check([("Zebra Charms", "Ada", 1900), ("Bat Facts", "Morgana", 1700), ("Apple Lore", "Ada", 1850),
                     ("Quick Hexes", "Ada", 1999), ("Ant Tales", "Morgana", 1701)])

          @test("The list you were given is left unchanged")
          def _():
              books = list(EXAMPLE)
              result, given = shelve(books)
              if given != books:
                  fail(code("reshelve") + " changed the list it was given. " + code(".sort()") + " sorts a list in place; "
                       "use " + code("sorted(books, key=...)") + " to make a new sorted list instead (or sort a copy).")

          @test("An empty list gives an empty list")
          def _():
              check([])
        `,
        scene: { icon: "🏛️", successIcon: "📚", successText: "The shelves rumble as books whirl through the air and land in perfect order, author by author.", effect: "shake" }
      },

      // ------------------------------------------------------------------
      {
        id: "library-anagram-curse",
        title: "The Anagram Curse",
        difficulty: "hard",
        concepts: ["dictionaries of lists", "grouping", "sorting"],
        story: [
          "Glitch's last prank is the worst yet: an anagram curse. All over the library, words have scrambled into other words. *Listen* became *silent*, and *stop* became *pots*.",
          "\"To lift the curse, we must gather every word together with its anagram twins,\" says Ada. \"Find the right *key* for each word, and a dictionary will do the gathering.\""
        ],
        task: [
          "Define `group_anagrams(words)`. `words` is a list of different lowercase words. Two words are **anagrams** if they use exactly the same letters, the same number of times (`listen` and `silent`). Return a **list of groups**, where:",
          { list: [
            "each group is a list of words that are anagrams of each other, in **alphabetical order**;",
            "words with no anagram partner are left out, so every group has at least 2 words;",
            "**bigger groups come first**, and groups of the same size are ordered by their **first word**, alphabetically."
          ] },
          { code: py`
            print(group_anagrams(["listen", "pots", "silent", "owl", "stop", "enlist", "tops", "spot"]))
          `, output: "[['pots', 'spot', 'stop', 'tops'], ['enlist', 'listen', 'silent']]" },
          "No words, or no anagrams at all, give an empty list. Don't change the list you're given."
        ],
        lesson: [
          "To **group** things, use a dictionary whose values are lists. Work out each item's *key*, then append the item to the list stored under that key:",
          { code: py`
            spells = ["hex", "charm", "jinx", "curse", "ward"]
            by_length = {}
            for spell in spells:
                size = len(spell)              # the key: what the group has in common
                if size not in by_length:
                    by_length[size] = []       # the first of its kind starts a new list
                by_length[size].append(spell)
            print(by_length)
            print(list(by_length.values()))
          `, output: "{3: ['hex'], 5: ['charm', 'curse'], 4: ['jinx', 'ward']}\n[['hex'], ['charm', 'curse'], ['jinx', 'ward']]" },
          "`.values()` gives just a dictionary's values (here, the lists), without their keys. Likewise `.keys()` gives just the keys, and `.items()` the *(key, value)* pairs.",
          "The whole trick is choosing a key that is **the same for every member of a group** and different for everything else. Keys must be values that can't change, such as strings, numbers or tuples: a list can't be a key. Strings come with handy tools for building keys:",
          { code: py`
            print(sorted("stone"))             # a string's letters, sorted, as a list
            print("".join(["a", "b", "c"]))    # glue a list of strings into one string
          `, output: "['e', 'n', 'o', 's', 't']\nabc" },
          "Finally, `sorted()` with a `key=` (and a minus sign for \"biggest first\") can put your groups in order, just like the archive shelves."
        ],
        starter: py`
          def group_anagrams(words):
              groups = {}
              # 1. Put each word into a group, using a key that all its anagrams share.

              # 2. Keep the groups with at least 2 words, each sorted alphabetically.

              # 3. Order the groups: biggest first, ties by their first word.

              return []


          print(group_anagrams(["listen", "pots", "silent", "owl", "stop", "enlist", "tops", "spot"]))
        `,
        hints: [
          "What do `listen` and `silent` have in common that `pots` doesn't? Try printing `sorted(\"listen\")` and `sorted(\"silent\")`.",
          "Use `\"\".join(sorted(word))` as a dictionary key, and append each word to the list under its key. Then keep only the lists with 2 or more words, sort the words inside each one, and finally sort the groups.",
          "To order the groups: `sorted(groups, key=lambda group: (-len(group), group[0]))`. The minus sign puts bigger groups first, and `group[0]` breaks ties."
        ],
        solution: py`
          def group_anagrams(words):
              """Group the words that are anagrams of each other."""
              groups = {}
              for word in words:
                  key = "".join(sorted(word))      # anagrams share the same sorted letters
                  if key not in groups:
                      groups[key] = []
                  groups[key].append(word)

              result = []
              for group in groups.values():
                  if len(group) >= 2:              # a word on its own isn't cursed
                      result.append(sorted(group))

              # Bigger groups first; groups of the same size by their first word.
              return sorted(result, key=lambda group: (-len(group), group[0]))


          print(group_anagrams(["listen", "pots", "silent", "owl", "stop", "enlist", "tops", "spot"]))
        `,
        altSolutions: [
          py`
            from collections import defaultdict

            def group_anagrams(words):
                groups = defaultdict(list)
                for word in words:
                    groups[tuple(sorted(word))].append(word)
                result = [sorted(g) for g in groups.values() if len(g) > 1]
                result.sort(key=lambda g: g[0])
                result.sort(key=len, reverse=True)
                return result
          `,
          py`
            def is_anagram(a, b):
                return sorted(a) == sorted(b)

            def group_anagrams(words):
                used = []
                groups = []
                for word in words:
                    if word in used:
                        continue
                    group = [word]
                    for other in words:
                        if other != word and is_anagram(word, other):
                            group.append(other)
                    if len(group) > 1:
                        used.extend(group)
                        group.sort()
                        groups.append(group)
                groups.sort(key=lambda g: (-len(g), g[0]))
                return groups
          `
        ],
        wrongSolutions: [
          py`
            def group_anagrams(words):
                groups = {}
                for word in words:
                    key = "".join(sorted(set(word)))
                    groups.setdefault(key, []).append(word)
                result = [sorted(g) for g in groups.values() if len(g) >= 2]
                return sorted(result, key=lambda g: (-len(g), g[0]))
          `,
          py`
            def group_anagrams(words):
                groups = {}
                for word in words:
                    key = "".join(sorted(word))
                    groups.setdefault(key, []).append(word)
                return list(groups.values())
          `,
          py`
            def group_anagrams(words):
                groups = {}
                for word in words:
                    key = "".join(sorted(word))
                    groups.setdefault(key, []).append(word)
                result = [sorted(g) for g in groups.values() if len(g) >= 2]
                return sorted(result)
          `
        ],
        tests: py`
          def reference(words):
              groups = {}
              for word in words:
                  groups.setdefault("".join(sorted(word)), []).append(word)
              result = [sorted(g) for g in groups.values() if len(g) >= 2]
              return sorted(result, key=lambda g: (-len(g), g[0]))

          def gather(words, label=None):
              group_anagrams = need_function("group_anagrams", 1)
              given = list(words)
              label = label or code("group_anagrams(" + short(words, 200) + ")")
              result, printed = capture(group_anagrams, given)
              if given != words:
                  fail(label + " changed the list it was given. Read the words, but don't change or sort the list itself.")
              if result is None:
                  if printed.strip():
                      fail(label + " printed " + short(printed.strip()) + " but returned " + code("None")
                           + ". Return the list of groups instead of printing it.")
                  fail(label + " returned " + code("None") + ". Did you forget to " + code("return") + " the groups?")
              if isinstance(result, dict):
                  fail(label + " returned a dictionary. Return a list of the groups instead: "
                       + code("list(groups.values())") + " gives you the groups, ready to be filtered and sorted.")
              if not isinstance(result, list):
                  fail(label + " should return a list of groups, but it returned " + short(result) + " (a "
                       + type(result).__name__ + ").")
              for group in result:
                  if not isinstance(group, list):
                      fail(label + " should return a list of lists, but one of the groups is " + short(group)
                           + ". Make each group a list (" + code("sorted(...)") + " gives you one).")
              return result, label

          def diagnose(words, result, expected):
              if not result:
                  return (" No groups yet. Start by putting each word into a dictionary of lists, under a key that all of "
                          "its anagrams share.")
              try:
                  seen = []
                  for group in result:
                      if sorted(group) in seen:
                          return (" Each group should appear only once, but " + short(group) + " appears more than once. "
                                  "Add each group to the result a single time, not once for every word in it.")
                      seen.append(sorted(group))
                  if len(result) == len(expected) and all(sorted(g) in expected for g in result):
                      if any(g != sorted(g) for g in result):
                          return " The words inside each group should be in alphabetical order."
                      return (" You found the right groups, but they are in the wrong order: bigger groups first, and groups "
                              "of the same size ordered by their first word.")
                  if any(len(g) < 2 for g in result):
                      return " Leave out the words that have no anagram partner: every group needs at least 2 words."
                  for group in result:
                      for a in group:
                          for b in group:
                              if isinstance(a, str) and isinstance(b, str) and sorted(a) != sorted(b):
                                  if set(a) == set(b):
                                      return (" " + short(a) + " and " + short(b) + " share a group, but they use their "
                                              "letters a different number of times, so they are not anagrams. Sorting the "
                                              "letters keeps the repeats; a set throws them away.")
                                  return (" " + short(a) + " and " + short(b) + " share a group, but they are not "
                                          "anagrams. Choose a key that only true anagrams have in common.")
                  found = [w for g in result for w in g]
                  missing = [w for g in expected for w in g if w not in found]
                  if missing:
                      return " The word " + short(missing[0]) + " should be in one of your groups."
              except TypeError:
                  pass
              return ""

          def check(words, label=None):
              result, label = gather(words, label)
              expected = reference(words)
              if result == expected:
                  return
              if len(short(expected, 1000)) <= 200 and len(short(result, 1000)) <= 200:
                  text = label + " should return " + short(expected, 200) + ", but it returned " + short(result, 200) + "."
              elif len(result) != len(expected):
                  text = (label + " should return " + str(len(expected)) + " groups, but it returned " + str(len(result))
                          + ". The first group should be " + short(expected[0]) + ".")
              else:
                  text = label + " doesn't match."
                  for number, (want, got) in enumerate(zip(expected, result), 1):
                      if want != got:
                          text = label + ": group " + str(number) + " should be " + short(want) + ", but yours is " + short(got) + "."
                          break
              fail(text + diagnose(words, result, expected))

          @test("Two anagrams make a group")
          def _():
              check(["listen", "silent"])
              check(["silent", "listen"])

          @test("Words with no anagram partner are left out")
          def _():
              check(["listen", "owl", "silent", "glitch"])
              check(["owl", "cat"])

          @test("The words in a group are in alphabetical order")
          def _():
              check(["tops", "stop", "pots"])

          @test("Anagrams use each letter the same number of times")
          def _():
              check(["loot", "tool", "lot", "lotto"])
              check(["eat", "tea", "teat", "ate"])

          @test("Bigger groups come first; same-size groups go by their first word")
          def _():
              check(["listen", "pots", "silent", "owl", "stop", "enlist", "tops", "spot"])
              check(["night", "thing", "state", "elbow", "below", "taste", "dusty", "study", "inch", "chin"])
              check(["rat", "tar", "evil", "art", "vile", "god", "live", "dog", "veil", "act", "cat"])

          @test("No words gives an empty list, and a whole cursed shelf works")
          def _():
              check([])
              shelf = ["angel", "owl", "glean", "arc", "below", "car", "state", "angle", "peach", "elbow", "wand",
                       "dusty", "cheap", "night", "inch", "taste", "brag", "potion", "grab", "lemon", "thing", "sword",
                       "melon", "chin", "heart", "words", "garb", "earth", "bowel", "study", "mirror", "hater", "glitch"]
              check(shelf, code("group_anagrams(shelf)") + " for a cursed shelf of " + str(len(shelf)) + " words")
        `,
        scene: { icon: "🔤", successIcon: "🌀", successText: "The scrambled words swirl into a glowing vortex and come out paired with their anagram twins. The curse is lifted!", effect: "portal" }
      }
    ]
  });
})();
