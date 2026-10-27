/*
 * Chapter 6 — The Labyrinth of Echoes (medium → hard)
 * Concepts: recursion on nested data, stacks, queues (collections.deque), hash maps,
 * linked lists, binary search, merge sort, DFS / flood fill, BFS, Big-O intuition.
 *
 * Trial notes for maintainers:
 *  - Trials use the harness's step_limit() with challenge-specific advice (most of them
 *    through the small _budget() decorator in STEP_BUDGET below), so an endless loop or a
 *    search without a visited set fails that one trial with a clear message while the
 *    other trials still show. Limits are about 10x what the correct solutions use.
 *  - Some trials hand the spell list subclasses that count reads (twin runes, binary
 *    search) or objects that count comparisons (merge sort), to check Big-O behaviour
 *    and to turn would-be IndexErrors inside the trial into clear messages.
 */
(function () {
  "use strict";
  var py = SS.py;

  // Shared by most challenges' trials: _budget(limit, advice) wraps a trial in the harness's step_limit(),
  // so a runaway spell (an endless loop, a stack that never empties...) stops early with advice that
  // fits the challenge, instead of the generic step-limit message.
  var STEP_BUDGET = py`
    def _budget(limit, advice):
        """Decorator for a trial: fail it, with advice, if the spell takes more than limit steps."""
        message = ("Your spell took more than " + format(limit, ",") + " steps during this trial without finishing, "
                   + "far more than this task needs. " + advice)

        def wrap(trial):
            def guarded():
                with step_limit(limit, message):
                    return trial()
            return guarded
        return wrap
  `;

  SS.defineChapter({
    id: "labyrinth",
    order: 6,
    title: "The Labyrinth of Echoes",
    subtitle: "Find the way — and find it fast",
    icon: "🌀",
    concepts: ["recursion", "stacks", "queues", "hash maps", "linked lists", "binary search", "merge sort", "DFS & BFS", "Big-O"],
    intro: [
      "The spiral stairs beneath the Golem Workshop wind down and down, until your lantern lights a maze of tunnels that seems to go on forever. This is the **Labyrinth of Echoes**: every footstep comes back to you twice, and somewhere ahead, Glitch's giggle bounces from wall to wall.",
      "Archmage Ada raises her staff. \"Down here, brute force gets you lost. The Labyrinth rewards wizards who *organise* their magic: stacks, queues, chains and maps — and algorithms that find the way without trying every path.\"",
      "\"So count your steps, apprentice. In the Labyrinth, *how fast* a spell's work grows as the maze grows — its **Big-O** — matters as much as whether it works at all.\""
    ],
    outro: [
      "The last corridor opens and the echoes fall silent. You have flattened nested echoes, checked seals with a stack, kept a fair queue, spotted twins with a dictionary, forged and reversed a chain, halved a hall of doors, mended a mirror with merge sort, and searched the caverns depth-first and the maze breadth-first.",
      "At the Labyrinth's deepest exit you finally corner Glitch — who squeaks, spins, and dives straight through a great door carved with seven serpent heads. A rumble. A roar. Then two more roars…",
      "Glitch tumbles back out, ears flat. \"I only poked it a *little*!\" Behind the door, the **Hydra of Overlapping Subproblems** is waking. Ada grips her staff. \"Cut off one head and two grow back — unless you *remember* every head you have already faced. Come, apprentice. To the Hydra's Lair.\""
    ],
    challenges: [
      // ------------------------------------------------------------------
      // 1. Recursion on nested data
      // ------------------------------------------------------------------
      {
        id: "labyrinth-echoes-within",
        title: "Echoes Within Echoes",
        difficulty: "medium",
        concepts: ["recursion", "nested lists", "isinstance()"],
        story: [
          "At the mouth of the Labyrinth, every word you speak comes back as a bundle of echoes — and some echoes carry smaller bundles inside them.",
          "\"Glitch tangled them on purpose,\" Ada sighs. \"Lay every echo out in one straight line, in the order it was spoken, and the entrance will know us. Bundles inside bundles inside bundles… a job for recursion.\""
        ],
        task: [
          "Write a function `flatten(echoes)`. `echoes` is a list that may contain other lists, nested to any depth. **Return** a new, flat list of every item that isn't a list, in left-to-right order.",
          { code: py`
            flatten([1, [2, 3], [[4], 5]])
            # → [1, 2, 3, 4, 5]

            flatten(["boo", [], [["hoo"]], 7])
            # → ['boo', 'hoo', 7]
          ` },
          { list: [
            "Empty lists simply vanish: `flatten([[], [[]]])` returns `[]`.",
            "A string is a single echo: keep `\"boo\"` whole.",
            "Don't change the list you were given."
          ] }
        ],
        lesson: [
          "A list can hold lists, which hold more lists, as deep as you like. One loop handles one level and a loop inside a loop handles two… but how many loops would you need for *any* depth? **Recursion** solves it: write a function that deals with one level and calls *itself* on each inner list.",
          "`isinstance(value, list)` asks whether a value is a list. Here is the pattern, counting the coins in pouches that may hold smaller pouches:",
          { code: py`
            def count_coins(pouch):
                total = 0
                for thing in pouch:
                    if isinstance(thing, list):
                        # a smaller pouch: recursion opens it
                        total += count_coins(thing)
                    else:
                        total += thing      # a plain coin
                return total

            print(count_coins([5, [10, 1], [[2], []]]))
          `, output: "18" },
          "Each call handles one pouch and trusts the inner calls with the rest. The base case needs no special code: a pouch without inner pouches never recurses, and an empty pouch just returns 0.",
          { diagram: py`
            count_coins([5, [10, 1], [[2], []]])
            ├── 5                           -> 5
            ├── count_coins([10, 1])        -> 11
            └── count_coins([[2], []])      -> 2
                ├── count_coins([2])        -> 2
                └── count_coins([])         -> 0
            total: 5 + 11 + 2 = 18
          ` },
          { tip: "**Big-O** describes how a spell's work grows with the size of its input. `count_coins` looks at each item once, so twice as many items means twice the work: we say it is **O(n)** for n items." },
          "To build a list instead of a total, start from `[]` and grow it: `items.append(x)` adds one item, while `items.extend(other)` (or `items += other`) adds every item of the list `other`.",
          { warning: "Create that list *inside* the function. A default value such as `def f(items, found=[])` is made only once and shared by every call, so old echoes leak into new answers." }
        ],
        starter: py`
          def flatten(echoes):
              """Return a new flat list of every non-list item in echoes, in order."""
              result = []
              # Loop over the echoes. Plain items join result;
              # inner lists must be flattened first (recursion!).

              return result
        `,
        hints: [
          "Handle one level at a time: loop over the items. A plain item goes straight into your result; an item that is itself a list needs flattening first — and `flatten` can do that!",
          "Start with `result = []`. For each `item`: if `isinstance(item, list)`, call `flatten(item)` — it gives back a flat list — and add all of its items to `result`; otherwise `result.append(item)`. Finally, `return result`.",
          "The recursive line is `result.extend(flatten(item))`. Using `.append` there would put a whole list inside your result instead of its items."
        ],
        solution: py`
          def flatten(echoes):
              """Return a new flat list of every non-list item in echoes, in order."""
              result = []
              for item in echoes:
                  if isinstance(item, list):
                      result.extend(flatten(item))   # an inner list: flatten it, then add all its items
                  else:
                      result.append(item)            # a single echo
              return result
        `,
        altSolutions: [
          py`
            def flatten(echoes):
                # Without recursion: an explicit stack of items still to look at.
                result = []
                stack = list(reversed(echoes))
                while stack:
                    item = stack.pop()
                    if isinstance(item, list):
                        stack.extend(reversed(item))
                    else:
                        result.append(item)
                return result
          `,
          py`
            def flatten(echoes):
                if not isinstance(echoes, list):
                    return [echoes]          # base case: a single echo
                flat = []
                for item in echoes:
                    flat += flatten(item)
                return flat
          `,
          py`
            def flatten(echoes):
                if echoes == []:
                    return []
                first, rest = echoes[0], echoes[1:]
                if isinstance(first, list):
                    return flatten(first) + flatten(rest)
                return [first] + flatten(rest)
          `
        ],
        wrongSolutions: [
          py`
            def flatten(echoes):
                # Only opens one level of bundles.
                result = []
                for item in echoes:
                    if isinstance(item, list):
                        result.extend(item)
                    else:
                        result.append(item)
                return result
          `,
          py`
            def flatten(echoes):
                result = []
                for item in echoes:
                    if isinstance(item, list):
                        result.append(flatten(item))   # adds a whole list as one item
                    else:
                        result.append(item)
                return result
          `,
          py`
            def flatten(echoes, result=[]):
                # The default list is shared between calls!
                for item in echoes:
                    if isinstance(item, list):
                        flatten(item, result)
                    else:
                        result.append(item)
                return result
          `
        ],
        tests: STEP_BUDGET + py`
          _ADVICE = ("Is a loop running forever? If you keep your own stack of items to look at, make sure every item you look at "
                     + "is also taken off it.")

          def _flatten():
              return need_function("flatten", 1)

          def _inner_list(items):
              for item in items:
                  if isinstance(item, list):
                      return item
              return None

          def _has_string(items):
              return any(isinstance(item, str) or (isinstance(item, list) and _has_string(item)) for item in items)

          def _check(echoes, expected, note="", label=None):
              call = label or code("flatten(" + short(echoes, 70) + ")")
              try:
                  result = _flatten()(echoes)
              except RecursionError:
                  if _has_string(echoes):
                      fail(call + " never stopped calling itself (RecursionError). A string can be looped over just like a list, "
                           + "and each of its letters is a string again, so treating strings like bundles splits them forever. Only "
                           + "call " + code("flatten") + " again on items that are lists: " + code("isinstance(item, list)") + ".")
                  fail(call + " never stopped calling itself (RecursionError). Only call " + code("flatten") + " again on items "
                       + "that are lists, so that every call works on a smaller part of the bundle.")
              if result is None:
                  fail(call + " returned None. Build a new list and " + code("return") + " it at the end.")
              expect(isinstance(result, list), call + " should return a list, but it returned " + short(result) + ".")
              if len(result) > len(expected) and result[len(result) - len(expected):] == expected:
                  fail(call + " returned " + short(result) + ": the right echoes, but with leftovers from an earlier call in front. "
                       + "Did you give " + code("flatten") + " a default list, like " + code("result=[]") + "? Python creates that "
                       + "list only once and shares it between calls, so make the new list inside the function instead.")
              inner = _inner_list(result)
              if inner is not None:
                  fail(call + " returned " + short(result) + ", which still contains the list " + short(inner, 40) + ". Lists can be "
                       + "nested any number of levels deep, so flatten every inner list too: call " + code("flatten") + " on it "
                       + "(recursion!) and add its items to your result with " + code(".extend()") + ". (" + code(".append()")
                       + " would add the whole list as a single item.)")
              expect_equal(result, expected, call + ":" + (" " + note if note else ""))
              return result


          @test("flatten([1, [2, 3], [[4], 5]]) returns [1, 2, 3, 4, 5]")
          @_budget(20000, _ADVICE)
          def _():
              _check([1, [2, 3], [[4], 5]], [1, 2, 3, 4, 5])


          @test("A flat list comes back as a new, equal list, with strings kept whole")
          @_budget(20000, _ADVICE)
          def _():
              echoes = ["boo", 7, "hoo"]
              result = _check(echoes, ["boo", 7, "hoo"], "A string is a single echo, so keep it whole.")
              expect(result is not echoes, code("flatten") + " returned the very list it was given. Return a new list instead.")


          @test("Echoes nested many levels deep are all found")
          @_budget(20000, _ADVICE)
          def _():
              _check([[[["deep"]]], ["er", [["est"]]]], ["deep", "er", "est"])
              tower = ["bottom"]
              for level in range(1, 41):
                  tower = [tower, level]
              _check(tower, ["bottom"] + list(range(1, 41)), label="Flattening a bundle nested 41 levels deep")


          @test("Empty lists vanish: flatten([]) and flatten([[], [[]], [[], [5]]])")
          @_budget(20000, _ADVICE)
          def _():
              _check([], [], "An empty list holds no echoes.")
              _check([[], [[]], [[], [5]]], [5], "Empty inner lists add nothing.")


          @test("The original list is unchanged, and a second call gives the same answer")
          @_budget(20000, _ADVICE)
          def _():
              echoes = [1, [2, [3]], "four"]
              _check(echoes, [1, 2, 3, "four"])
              expect(echoes == [1, [2, [3]], "four"], code("flatten") + " changed the list it was given: it is now "
                     + short(echoes) + ". Leave the original alone and build a new list.")
              _check(echoes, [1, 2, 3, "four"], "(This was a second call with the same list.)")
        `,
        scene: { icon: "🐚", successIcon: "🔔", successText: "The tangled echoes ring out in one clear, straight line, and the entrance swings open!", effect: "sparkle" }
      },

      // ------------------------------------------------------------------
      // 2. Stacks
      // ------------------------------------------------------------------
      {
        id: "labyrinth-bracket-seals",
        title: "The Bracket Seals",
        difficulty: "medium",
        concepts: ["stacks", "append() / pop()", "matching pairs"],
        story: [
          "Deeper in, every door is locked by a seal of brackets. A seal holds firm only if each bracket is closed by its own partner, the innermost first.",
          "\"Glitch has been scribbling on them,\" Ada mutters. \"Forcing a broken seal brings the ceiling down, so we test each one first. The bracket opened most recently must be closed first… now, what remembers things in exactly that order?\""
        ],
        task: [
          "Write `is_balanced(seal)`. It **returns** `True` if the brackets in the string `seal` are balanced, and `False` otherwise.",
          { list: [
            "There are three kinds of bracket: `()`, `[]` and `{}`.",
            "Balanced means every opening bracket is later closed by a closing bracket of the **same kind**, and a bracket opened inside another is closed first.",
            "All other characters (letters, spaces, runes…) are ignored. A seal with no brackets at all is balanced."
          ] },
          { code: py`
            is_balanced("{[()()]}")  # True
            is_balanced("a(b)c[d]")  # True
            is_balanced("([)]")      # False: [ is still open
            is_balanced("((")        # False: never closed
            is_balanced("())(")      # False: ) closes nothing
          ` }
        ],
        lesson: [
          "A **stack** is a pile you only touch at the top, like a stack of plates. The last plate you put on is the first one you take off: *last in, first out* (LIFO).",
          "A Python list makes a perfect stack. `append()` pushes onto the top (the end of the list), `pop()` removes and returns the top item, and `stack[-1]` peeks at it without removing it. All three take the same tiny time however tall the stack grows: **O(1)**.",
          { code: py`
            stack = []
            stack.append("red")      # push
            stack.append("green")
            stack.append("blue")
            print(stack[-1])         # peek at the top
            print(stack.pop())       # last in, first out!
            print(stack, len(stack))
          `, output: "blue\nblue\n['red', 'green'] 2" },
          { diagram: py`
                  after 3 pushes      after pop()
                  ┌─────────┐
            top → │ "blue"  │         ┌─────────┐
                  │ "green" │   top → │ "green" │
                  │ "red"   │         │ "red"   │
                  └─────────┘         └─────────┘
          ` },
          "Stacks shine whenever things **nest**: whatever was opened most recently must be finished first. Undo buttons, a browser's Back button, and Python itself (keeping track of functions called inside functions) all use stacks.",
          "Simply counting isn't always enough. To match different *kinds* of things, you must remember *which* kind was opened most recently — and that is exactly what sits on top of a stack.",
          { warning: "Popping an empty list raises an `IndexError`. Check first with `if stack:` (a list is truthy when it has items) or `if not stack:`." }
        ],
        starter: py`
          def is_balanced(seal):
              """Return True if every bracket in seal is closed by its own partner, in order."""
              stack = []
              for ch in seal:
                  pass  # push openers; check each closer against the top of the stack
              return False
        `,
        hints: [
          "The bracket opened most recently must be the first one closed. Which structure hands back the most recent item first?",
          "Loop over the characters. Push every opening bracket onto a stack. When you meet a closing bracket, the stack must not be empty and its top must be the matching opener — then pop it. When the loop ends, the seal is balanced only if nothing is left on the stack.",
          "A dict links each closer to its opener: `partner = {\")\": \"(\", \"]\": \"[\", \"}\": \"{\"}`. For a closer `ch`: `if not stack or stack[-1] != partner[ch]: return False`, then `stack.pop()`. After the loop, `return not stack`."
        ],
        solution: py`
          CLOSER_TO_OPENER = {")": "(", "]": "[", "}": "{"}

          def is_balanced(seal):
              """Return True if every bracket in seal is closed by its own partner, in order."""
              stack = []
              for ch in seal:
                  if ch in "([{":
                      stack.append(ch)                  # an opener waits on the stack
                  elif ch in CLOSER_TO_OPENER:
                      if not stack or stack[-1] != CLOSER_TO_OPENER[ch]:
                          return False                  # nothing is open, or the wrong kind is
                      stack.pop()                       # matched: that bracket is closed
              return not stack                          # anything left was never closed
        `,
        altSolutions: [
          py`
            def is_balanced(seal):
                # Push the closer we EXPECT to see next.
                closer_for = {"(": ")", "[": "]", "{": "}"}
                expected = []
                for ch in seal:
                    if ch in closer_for:
                        expected.append(closer_for[ch])
                    elif ch in ")]}":
                        if not expected or expected.pop() != ch:
                            return False
                return len(expected) == 0
          `,
          py`
            def is_balanced(seal):
                # Keep only the brackets, then remove matched pairs until none are left.
                only = "".join(ch for ch in seal if ch in "()[]{}")
                while "()" in only or "[]" in only or "{}" in only:
                    only = only.replace("()", "").replace("[]", "").replace("{}", "")
                return only == ""
          `
        ],
        wrongSolutions: [
          py`
            def is_balanced(seal):
                # One counter can't tell the kinds of bracket apart.
                depth = 0
                for ch in seal:
                    if ch in "([{":
                        depth += 1
                    elif ch in ")]}":
                        depth -= 1
                        if depth < 0:
                            return False
                return depth == 0
          `,
          py`
            def is_balanced(seal):
                pairs = {")": "(", "]": "[", "}": "{"}
                stack = []
                for ch in seal:
                    if ch in "([{":
                        stack.append(ch)
                    elif ch in pairs:
                        if not stack or stack.pop() != pairs[ch]:
                            return False
                return True          # forgets brackets that were never closed
          `,
          py`
            def is_balanced(seal):
                pairs = {")": "(", "]": "[", "}": "{"}
                stack = []
                for ch in seal:
                    if ch in "([{":
                        stack.append(ch)
                    elif ch in pairs:
                        if stack.pop() != pairs[ch]:     # pops even when the stack is empty
                            return False
                return not stack
          `
        ],
        tests: STEP_BUDGET + py`
          _ADVICE = "Is a loop running forever? If you step through the seal with an index, make sure it moves forward every time."

          def _verdict(seal, expected, why, label=None):
              is_balanced = need_function("is_balanced", 1)
              result = is_balanced(seal)
              call = label or code("is_balanced(" + short(seal, 60) + ")")
              if result is not True and result is not False:
                  fail(call + " should return " + str(expected) + " (a boolean, True or False), but it returned "
                       + short(result) + ".")
              expect(result == expected, call + " should be " + str(expected) + ": " + why)

          def _verdicts(seals, expected, why):
              for seal in seals:
                  _verdict(seal, expected, why)


          @test("'()', '[]', '{}' and '{[()()]}' are balanced")
          @_budget(20000, _ADVICE)
          def _():
              _verdicts(["()", "[]", "{}", "{[()()]}", "([]{})"], True,
                        "each bracket is closed by its own partner, innermost first.")


          @test("Other characters are ignored: 'a(b)c[d]' and '' are balanced")
          @_budget(20000, _ADVICE)
          def _():
              _verdicts(["a(b)c[d]", "", "no brackets at all", "{ ward: [1, 2], (x) }"], True,
                        "characters that aren't brackets are ignored, and a seal with no brackets is balanced.")


          @test("Unclosed seals fail: '((' and '{[()]' are not balanced")
          @_budget(20000, _ADVICE)
          def _():
              _verdicts(["(", "((", "{[()]", "[[]"], False,
                        "a bracket is opened but never closed. Is anything left on your stack at the end?")


          @test("A closer with nothing to close fails: ')(' and '())' are not balanced")
          @_budget(20000, _ADVICE)
          def _():
              _verdicts([")", ")(", "())", "]["], False,
                        "a closing bracket arrives when nothing is open. (Check that the stack isn't empty before you pop.)")


          @test("Crossed seals fail: '(]' and '([)]' are not balanced")
          @_budget(20000, _ADVICE)
          def _():
              _verdicts(["(]", "([)]", "{(})", "[{]}"], False,
                        "each bracket must be closed by its own kind, innermost first. Counting brackets can't tell the "
                        + "difference; a stack remembers which bracket was opened most recently.")


          @test("Long seals: 5,000 pairs in a row, and 300 brackets nested deep")
          @_budget(500000, _ADVICE)
          def _():
              nested = "[" * 150 + "{(" * 75 + ")}" * 75 + "]" * 150
              _verdict("()" * 5000, True, "this long seal is balanced.", code('is_balanced("()" * 5000)'))
              _verdict(nested, True, "this deeply nested seal is balanced.",
                       code('is_balanced("[" * 150 + "{(" * 75 + ")}" * 75 + "]" * 150)'))
              _verdict("()" * 5000 + "(", False, "the very last bracket is never closed.",
                       code('is_balanced("()" * 5000 + "(")'))
              _verdict(nested[:-1] + ")", False, "the very last bracket is the wrong kind.",
                       code('is_balanced("[" * 150 + "{(" * 75 + ")}" * 75 + "]" * 149 + ")")'))
        `,
        scene: { icon: "🚪", successIcon: "🔓", successText: "Seal after seal clicks open, and the doors swing wide without a single falling stone.", effect: "shake" }
      },

      // ------------------------------------------------------------------
      // 3. Queues with collections.deque
      // ------------------------------------------------------------------
      {
        id: "labyrinth-spirit-queue",
        title: "The Queue of Restless Spirits",
        difficulty: "medium",
        concepts: ["queues", "collections.deque", "tuples"],
        story: [
          "A crowd of restless spirits drifts through the Hall of Waiting. Each one needs a few blessings before it can rest — but Glitch told them all to push to the front, and now everyone is wailing.",
          "\"A fair line, then,\" says Ada, raising her staff. \"One blessing at a time, front of the line first. Whoever still needs more goes to the back and waits for another turn.\""
        ],
        task: [
          "Write `rest_order(spirits)`. `spirits` is a list of `(name, needed)` tuples in line order, where `needed` (at least 1) is how many blessings that spirit needs.",
          "Until the line is empty: the spirit at the front receives **one** blessing. If it now has all it needs, it goes to rest; otherwise it goes to the **back** of the line. **Return** the names in the order the spirits went to rest.",
          { code: py`
            spirits = [("Wisp", 2), ("Shade", 1), ("Moan", 3)]
            rest_order(spirits)  # → ['Shade', 'Wisp', 'Moan']

            # line (front first)       what happens
            # Wisp 2, Shade 1, Moan 3  Wisp -> back (1 to go)
            # Shade 1, Moan 3, Wisp 1  Shade rests
            # Moan 3, Wisp 1           Moan -> back (2 to go)
            # Wisp 1, Moan 2           Wisp rests
            # Moan 2                   Moan -> back (1 to go)
            # Moan 1                   Moan rests
          ` },
          "Use a `deque` from the `collections` module as the line (`popleft()` takes the spirit at the front, `append()` sends one to the back), and don't change the list you were given."
        ],
        lesson: [
          "A **queue** is a line: the first to join is the first to leave — *first in, first out* (FIFO). Newcomers join at the back, and you serve from the front.",
          "A plain list *can* act as a queue, but `line.pop(0)` is slow: removing the first item makes Python shift every other item one place to the left. With 100,000 items in line, that's about 100,000 moves for every single pop: **O(n)**.",
          "The `deque` (say \"deck\": a *double-ended queue*) from the `collections` module is built for this. Adding or removing at *either* end takes the same tiny time however long the line is: **O(1)**.",
          { code: py`
            from collections import deque

            line = deque(["Ana", "Bo"])   # made from a list
            line.append("Cy")             # join at the back
            first = line.popleft()        # leave at the front
            print(first, list(line), len(line))
            while line:                   # until it's empty
                print("serving", line.popleft())
          `, output: "Ana ['Bo', 'Cy'] 2\nserving Bo\nserving Cy" },
          { diagram: py`
              front                         back
                ↓                             ↓
            popleft() ←  [ Bo | Cy | Di ]  ← append()
          ` },
          "Tuples unpack neatly: `name, needed = (\"Wisp\", 2)`. A tuple can't be changed, so when a number changes, build a new tuple, such as `(name, needed - 1)`.",
          { tip: "Taking turns like this is called **round-robin**. Your computer shares its processor between programs the same way: each gets a short turn, then goes to the back of the line." }
        ],
        starter: py`
          from collections import deque

          def rest_order(spirits):
              """Return the spirits' names in the order they go to rest."""
              line = deque(spirits)
              rested = []
              # While anyone is still waiting, bless the spirit at the front...

              return rested
        `,
        hints: [
          "Copy the spirits into a deque first: `line = deque(spirits)`. The original list stays untouched, and taking from the front of a deque is cheap.",
          "Loop `while line:`. Take the front spirit with `popleft()` and unpack it into `name, needed`. If it only needed 1 blessing, add `name` to your result list; otherwise `append` the spirit to the back, needing one blessing fewer.",
          "Inside the loop: `name, needed = line.popleft()`, then `if needed == 1: rested.append(name)`, else `line.append((name, needed - 1))`. After the loop, `return rested`."
        ],
        solution: py`
          from collections import deque

          def rest_order(spirits):
              """Return the spirits' names in the order they go to rest."""
              line = deque(spirits)              # our own copy of the line
              rested = []
              while line:
                  name, needed = line.popleft()  # the spirit at the front...
                  needed -= 1                    # ...receives one blessing
                  if needed == 0:
                      rested.append(name)        # all done: it goes to rest
                  else:
                      line.append((name, needed))  # back of the line to wait again
              return rested
        `,
        altSolutions: [
          py`
            from collections import deque

            def rest_order(spirits):
                names = deque(name for name, _ in spirits)
                needs = deque(needed for _, needed in spirits)
                order = []
                while names:
                    name = names.popleft()
                    left = needs.popleft() - 1
                    if left:
                        names.append(name)
                        needs.append(left)
                    else:
                        order.append(name)
                return order
          `,
          py`
            import collections

            def rest_order(spirits):
                line = collections.deque([name, needed] for name, needed in spirits)
                done = []
                while len(line) > 0:
                    spirit = line.popleft()
                    spirit[1] -= 1
                    if spirit[1] > 0:
                        line.append(spirit)
                    else:
                        done.append(spirit[0])
                return done
          `
        ],
        wrongSolutions: [
          py`
            def rest_order(spirits):
                # Right answers, but list.pop(0) shuffles the whole line every time.
                line = list(spirits)
                rested = []
                while line:
                    name, needed = line.pop(0)
                    if needed == 1:
                        rested.append(name)
                    else:
                        line.append((name, needed - 1))
                return rested
          `,
          py`
            from collections import deque

            def rest_order(spirits):
                line = deque(spirits)
                rested = []
                while line:
                    name, needed = line.popleft()
                    if needed == 1:
                        rested.append(name)
                    else:
                        line.appendleft((name, needed - 1))   # back to the FRONT
                return rested
          `,
          py`
            from collections import deque

            def rest_order(spirits):
                line = deque(spirits)
                rested = []
                while line:
                    name, needed = line.pop()                 # takes from the BACK
                    if needed == 1:
                        rested.append(name)
                    else:
                        line.append((name, needed - 1))
                return rested
          `
        ],
        tests: STEP_BUDGET + py`
          import ast as _ast
          from collections import deque as _deque

          _ADVICE = ("Is the line going round in circles? Each turn, the spirit at the front must get one blessing closer to "
                     + "resting, so make sure the number it still needs goes down.")

          def _expected(spirits):
              line = _deque(spirits)
              order = []
              while line:
                  name, needed = line.popleft()
                  if needed <= 1:
                      order.append(name)
                  else:
                      line.append((name, needed - 1))
              return order

          def _served_from_back(spirits):
              """What a spell gets if it takes spirits from the BACK of the line (pop) instead of the front."""
              line = _deque(spirits)
              order = []
              while line:
                  name, needed = line.pop()
                  if needed <= 1:
                      order.append(name)
                  else:
                      line.append((name, needed - 1))
              return order

          def _why(spirits, result, expected):
              """Point at the likely mistake behind a wrong order ('' if there is no clear pattern)."""
              if result == [name for name, needed in spirits]:
                  return (" Your spirits went to rest in the order they queued, as if each one got all its blessings at once. "
                          + "Give the spirit at the front just ONE blessing, then send it to the BACK of the line ("
                          + code("append") + ") if it still needs more.")
              if result == _served_from_back(spirits):
                  return (" Your spell serves the spirit at the BACK of the line. Take the spirit at the front with "
                          + code("popleft()") + ".")
              if sorted(result, key=repr) == sorted(expected, key=repr):
                  return (" Every spirit rests, but in the wrong order. Each turn, the spirit at the front gets one blessing; "
                          + "if it still needs more, it goes to the back of the line.")
              return ""

          def _check(spirits, note="", label=None):
              rest_order = need_function("rest_order", 1)
              given = list(spirits)
              expected = _expected(given)
              result = rest_order(spirits)
              call = label or code("rest_order(" + short(given, 80) + ")")
              if result is None:
                  fail(call + " returned None. Collect the names in a list and " + code("return") + " it.")
              expect(isinstance(result, list), call + " should return a list of names, but it returned " + short(result) + ".")
              expect(spirits == given, code("rest_order") + " changed the list it was given. Copy the spirits into your own line "
                     + "instead: " + code("deque(spirits)") + ".")
              if result == expected:
                  return result
              extra = _why(spirits, result, expected) or ((" " + note) if note else "")
              if len(result) != len(expected):
                  fail(call + " should return " + str(len(expected)) + " names, but your list has " + str(len(result)) + "."
                       + extra)
              if len(expected) <= 10:
                  fail(call + " should return " + short(expected) + ", but it returned " + short(result) + "." + extra)
              k = 0
              while result[k] == expected[k]:
                  k += 1
              if k == 0:
                  fail(call + ": the first spirit to rest should be " + short(expected[0]) + ", not " + short(result[0]) + "."
                       + extra)
              fail(call + ": the first " + ("name is" if k == 1 else str(k) + " names are") + " right, but name number "
                   + str(k + 1) + " should be " + short(expected[k]) + ", not " + short(result[k]) + "." + extra)


          @test("The example: Shade, then Wisp, then Moan")
          @_budget(20000, _ADVICE)
          def _():
              _check([("Wisp", 2), ("Shade", 1), ("Moan", 3)])


          @test("Spirits that need one blessing each rest in line order")
          @_budget(20000, _ADVICE)
          def _():
              _check([("Ash", 1), ("Bell", 1), ("Cinder", 1), ("Dusk", 1)])


          @test("An empty line gives [], and a lone spirit rests alone")
          @_budget(20000, _ADVICE)
          def _():
              _check([], "With nobody in line, nobody goes to rest.")
              _check([("Hush", 4)], "A lone spirit keeps going to the back of the line (which is also the front!) until it rests.")


          @test("A spirit that still needs blessings waits behind everyone else")
          @_budget(20000, _ADVICE)
          def _():
              _check([("Ash", 3), ("Bell", 2), ("Cinder", 3), ("Dusk", 2), ("Ember", 1)],
                     "A spirit that still needs blessings goes to the BACK of the line (append), not the front.")


          @test("A line of 3,000 spirits, and the list you were given is unchanged")
          @_budget(600000, _ADVICE)
          def _():
              _check([("spirit" + str(k), 1 + (k * 7) % 5) for k in range(3000)], label=code("rest_order(line_of_3000_spirits)"))


          def _deque_names():
              """'deque', plus any alias from 'from collections import deque as ...'."""
              names = {"deque"}
              for node in _ast.walk(_ast.parse(source)):
                  if isinstance(node, _ast.ImportFrom) and node.module == "collections":
                      names.update(alias.asname for alias in node.names if alias.name == "deque" and alias.asname)
              return names


          def _calls_pop_zero():
              """True if the spell calls .pop(0) somewhere."""
              for node in _ast.walk(_ast.parse(source)):
                  if (isinstance(node, _ast.Call) and isinstance(node.func, _ast.Attribute) and node.func.attr == "pop"
                          and len(node.args) == 1 and isinstance(node.args[0], _ast.Constant) and node.args[0].value == 0):
                      return True
              return False

          def _serves_front():
              """popleft(), rotate() or del line[0]: the ways to take the front of a deque."""
              for node in _ast.walk(_ast.parse(source)):
                  if isinstance(node, _ast.Call) and isinstance(node.func, _ast.Attribute) and node.func.attr in ("popleft", "rotate"):
                      return True
                  if isinstance(node, _ast.Delete):
                      for target in node.targets:
                          if (isinstance(target, _ast.Subscript) and isinstance(target.slice, _ast.Constant)
                                  and target.slice.value == 0):
                              return True
              return False


          @test("The line is a deque, served from the front")
          def _():
              simulate = ("This challenge is about simulating the line: keep the spirits in a deque, serve the front with "
                          + code("popleft()") + " and send unfinished spirits to the back with " + code("append()") + ".")
              if not any(uses_call(name) for name in _deque_names()):
                  if _calls_pop_zero():
                      fail(simulate + " (" + code("list.pop(0)") + " gives the right answers, but it has to shuffle every other "
                           + "spirit forward; a deque's " + code("popleft()") + " is instant.)")
                  fail(simulate)
              expect(_serves_front(), simulate)
        `,
        scene: { icon: "👻", successIcon: "🕊️", successText: "One by one, the spirits sigh with relief and drift peacefully to rest.", effect: "rise" }
      },

      // ------------------------------------------------------------------
      // 4. Hash-map trick: two-sum in one pass
      // ------------------------------------------------------------------
      {
        id: "labyrinth-twin-runes",
        title: "The Twin Runes",
        difficulty: "medium",
        concepts: ["dicts", "hash maps", "enumerate()", "one pass"],
        story: [
          "A row of rune-stones blocks the corridor, each carved with a number. Press two stones whose numbers add up to the number on the door, and the way opens.",
          "\"Hear that clicking? Glitch is trying every possible pair,\" Ada says. \"He'll be at it all week. A wise wizard walks the row *once*, remembering what she has seen.\""
        ],
        task: [
          "Write `find_twins(runes, target)`. `runes` is a list of whole numbers. **Return** a tuple `(i, j)` of two positions, with `i < j`, such that `runes[i] + runes[j] == target` — or `None` if there is no such pair.",
          "If several pairs work, choose precisely this one: read the runes from left to right and stop at the **first position `j`** that completes a pair. If `runes[j]` could pair with more than one earlier rune, choose the **earliest** of them.",
          { code: py`
            find_twins([4, 9, 2, 7, 5], 9)  # → (2, 3)
            # 2 + 7 is the first pair to be completed;
            # (0, 4) also adds up to 9, but later.

            find_twins([3, 3, 4], 7)        # → (0, 2)
            # 4 pairs with either 3: the earliest wins.

            find_twins([5, 1], 10)          # → None
            # A rune can't be its own twin.
          ` },
          "One trial gives your spell a row of 3,000 runes and counts every rune it reads: one walk along the row is fine, but checking every pair is not."
        ],
        lesson: [
          "A **dictionary** is a *hash map*. It files every key in a slot worked out from the key itself (its *hash*), so `key in d`, `d[key]` and `d[key] = value` take about the same tiny time whether the dict holds ten entries or ten million: **O(1)**.",
          "Lists are different: `x in my_list` checks the items one at a time, which is **O(n)**. Do that inside a loop over the list — or loop over every pair with a loop inside a loop — and the work grows with the *square* of the length, **O(n²)**:",
          { diagram: py`
              runes      every pair    one walk
              1,000        ~500,000       1,000
             10,000     ~50,000,000      10,000
            100,000  ~5,000,000,000     100,000
          ` },
          "The trick: walk the list **once**, keeping a dict of what you have already seen, so each new item only has to ask the dict a question. This spell finds the first rune that repeats an earlier one:",
          { code: py`
            def first_repeat(runes):
                """Positions of the first repeat, or None."""
                seen = {}                # value -> position
                for pos, rune in enumerate(runes):
                    if rune in seen:     # an O(1) question
                        return (seen[rune], pos)
                    seen[rune] = pos
                return None

            print(first_repeat([7, 2, 9, 2, 7]))
          `, output: "(1, 3)" },
          "Trading a little memory (the dict) for a lot of speed is one of the most useful tricks in all of programming. For the twins, think about which question each new rune should ask the dict."
        ],
        starter: py`
          def find_twins(runes, target):
              """Return (i, j) with i < j and runes[i] + runes[j] == target, or None."""
              seen = {}  # rune value -> the position where it first appeared
              for j, rune in enumerate(runes):
                  pass   # is this rune's partner already in seen?
              return None
        `,
        hints: [
          "For each rune you know exactly which number would complete the pair: `target - rune`. The question is whether you have already walked past a rune with that number.",
          "Walk the runes once with `enumerate`, keeping a dict `seen` that maps a rune's value to its position. For each position `j` and `rune`: if `target - rune` is in `seen`, return `(seen[target - rune], j)`; otherwise remember the current rune. If the loop ends, return `None`.",
          "Check for the partner **before** you store the current rune (so a rune can't pair with itself), and store a value only the first time you see it — `if rune not in seen: seen[rune] = j` — so the earliest twin wins."
        ],
        solution: py`
          def find_twins(runes, target):
              """Return (i, j) with i < j and runes[i] + runes[j] == target, or None."""
              seen = {}                          # rune value -> position where it first appeared
              for j, rune in enumerate(runes):
                  partner = target - rune
                  if partner in seen:            # O(1): have we already passed the partner?
                      return (seen[partner], j)
                  if rune not in seen:           # keep the EARLIEST position of each value
                      seen[rune] = j
              return None
        `,
        altSolutions: [
          py`
            def find_twins(runes, target):
                first = {}
                for j in range(len(runes)):
                    i = first.get(target - runes[j])
                    if i is not None:
                        return i, j
                    first.setdefault(runes[j], j)
                return None
          `,
          py`
            def find_twins(runes, target):
                # Two passes: every position of every value first, then the search.
                positions = {}
                for i, rune in enumerate(runes):
                    positions.setdefault(rune, []).append(i)
                for j, rune in enumerate(runes):
                    earlier = positions.get(target - rune, [])
                    if earlier and earlier[0] < j:
                        return (earlier[0], j)
                return None
          `
        ],
        wrongSolutions: [
          py`
            def find_twins(runes, target):
                # Tries every pair: slow, and it finds the smallest i first, not the smallest j.
                for i in range(len(runes)):
                    for j in range(i + 1, len(runes)):
                        if runes[i] + runes[j] == target:
                            return (i, j)
                return None
          `,
          py`
            def find_twins(runes, target):
                seen = {}
                for j, rune in enumerate(runes):
                    if target - rune in seen:
                        return (seen[target - rune], j)
                    seen[rune] = j          # overwrites: remembers the LATEST position
                return None
          `,
          py`
            def find_twins(runes, target):
                seen = {}
                for j, rune in enumerate(runes):
                    if rune not in seen:
                        seen[rune] = j      # stored before checking: a rune can pair with itself
                    if target - rune in seen:
                        return (seen[target - rune], j)
                return None
          `
        ],
        tests: STEP_BUDGET + py`
          _ADVICE = "Is a loop running forever? Walk along the runes once, from the first to the last."

          class _RuneRow(list):
              """A row of runes that counts every rune the spell reads, and stops it after too many."""

              def __init__(self, runes, limit, target):
                  list.__init__(self, runes)
                  self.reads = 0
                  self.limit = limit
                  self.message = ("To search a row of " + format(len(runes), ",") + " runes for a pair adding up to " + str(target)
                                  + ", your spell read more than " + format(limit, ",") + " runes. Checking every pair takes "
                                  + "millions of reads; one walk along the row needs only " + format(len(runes), ",") + ". Keep a "
                                  + "dict of the runes you have passed (value -> position), so each new rune asks it just one question.")

              def _read(self, amount):
                  self.reads += amount
                  if self.reads > self.limit:
                      fail(self.message)

              def __getitem__(self, index):
                  try:
                      item = list.__getitem__(self, index)
                  except (IndexError, TypeError) as problem:
                      fail("Reading " + code("runes[" + short(index) + "]") + " failed (" + str(problem) + "). The runes are at "
                           + "positions 0 to " + str(list.__len__(self) - 1) + ".")
                  self._read(len(item) if isinstance(index, slice) else 1)
                  return item

              def __iter__(self):
                  for position in range(list.__len__(self)):
                      self._read(1)
                      yield list.__getitem__(self, position)

              def __reversed__(self):
                  for position in range(list.__len__(self) - 1, -1, -1):
                      self._read(1)
                      yield list.__getitem__(self, position)

              def __contains__(self, rune):
                  self._read(list.__len__(self))
                  return list.__contains__(self, rune)

              def index(self, *args):
                  self._read(list.__len__(self))
                  return list.index(self, *args)

              def count(self, rune):
                  self._read(list.__len__(self))
                  return list.count(self, rune)

              def copy(self):
                  self._read(list.__len__(self))
                  return list(list.__iter__(self))


          def _verdict(call, result, expected, hint=""):
              extra = (" " + hint) if hint else ""
              if expected is None:
                  expect(result is None, call + " should return None, because no two runes add up to the target, but it returned "
                         + short(result) + "." + extra)
                  return
              if result is None:
                  fail(call + " should return " + short(expected) + ", but it returned None." + extra)
              expect(isinstance(result, tuple), call + " should return a tuple of two positions, like " + short(expected)
                     + ", but it returned " + short(result) + ".")
              if result != expected:
                  fail(call + " should return " + short(expected) + ", but it returned " + short(result) + "." + extra)

          def _check(runes, target, expected, hint=""):
              find_twins = need_function("find_twins", 2)
              given = list(runes)
              result = find_twins(runes, target)
              expect(runes == given, code("find_twins") + " changed the list of runes it was given. Read the runes, but don't move them!")
              _verdict(code("find_twins(" + short(given, 70) + ", " + str(target) + ")"), result, expected, hint)


          @test("The example: find_twins([4, 9, 2, 7, 5], 9) is (2, 3)")
          @_budget(20000, _ADVICE)
          def _():
              _check([4, 9, 2, 7, 5], 9, (2, 3), "Walking from the left, 2 + 7 is the first pair to be completed (at position 3); "
                     + "(0, 4) is only completed later, at position 4.")


          @test("No twins: returns None (also for an empty row or a single rune)")
          @_budget(20000, _ADVICE)
          def _():
              _check([1, 2, 3], 100, None)
              _check([], 5, None)
              _check([7], 14, None, "A single rune can't pair with itself.")


          @test("A rune can't be its own twin, but two equal runes can be twins")
          @_budget(20000, _ADVICE)
          def _():
              _check([5, 1], 10, None, "5 + 5 would need TWO runes worth 5. Check for a rune's partner before you remember "
                     + "the rune itself.")
              _check([5, 1, 5], 10, (0, 2))


          @test("When several earlier runes could be the twin, the earliest one wins")
          @_budget(20000, _ADVICE)
          def _():
              hint = ("The partner's value appeared more than once before, so choose its earliest position. Store a value's "
                      + "position only the first time you see that value.")
              _check([3, 3, 4], 7, (0, 2), hint)
              _check([6, 1, 6, 6, 0], 6, (0, 4), hint)


          @test("Negative runes and zero work too")
          @_budget(20000, _ADVICE)
          def _():
              _check([-3, 7, 0, 3], 0, (0, 3))
              _check([0, 4, 0], 0, (0, 2))
              _check([-5, -2, 9], -7, (0, 1))


          @test("One pass: a row of 3,000 runes is read only a few thousand times")
          @_budget(300000, _ADVICE)
          def _():
              find_twins = need_function("find_twins", 2)
              size = 3000
              runes = [3 * k for k in range(size - 2)] + [1, 10000000]   # the only pair is at the very end
              for target, expected in ((10000001, (size - 2, size - 1)), (5, None)):
                  row = _RuneRow(runes, 5 * size, target)
                  result = find_twins(row, target)
                  expect(row.reads <= row.limit, row.message)
                  _verdict(code("find_twins(row_of_3000_runes, " + str(target) + ")"), result, expected)
        `,
        scene: { icon: "🪨", successIcon: "💞", successText: "Two stones flare in the same colour, sink into the floor, and the wall grinds aside.", effect: "lightning" }
      },

      // ------------------------------------------------------------------
      // 5. Linked list
      // ------------------------------------------------------------------
      {
        id: "labyrinth-echo-chain",
        title: "The Chain of Echoes",
        difficulty: "hard",
        concepts: ["linked lists", "classes", "__len__", "references"],
        story: [
          "In this tunnel each echo knows only one thing: which echo comes next. Follow them one by one and they spell out the way forward — except that Glitch has whispered the whole chain backwards.",
          "\"Then we'll forge a chain of our own,\" says Ada, \"and learn to turn it around in place, precisely, without breaking a single link.\""
        ],
        task: [
          "Build a linked list from two classes:",
          { list: [
            "`Node(value)`: one link, with two attributes: `value`, and `next` (the following node; `None` at first).",
            "`LinkedList()`: starts empty. Its attribute `head` is the first `Node`, or `None` while the chain is empty.",
            "`append(value)`: adds a new node holding `value` at the **end** of the chain.",
            "`__len__()`: so that `len(chain)` gives the number of nodes.",
            "`to_list()`: **returns** a new Python list of the values, from head to tail.",
            "`reverse()`: reverses the chain **in place**. Turn the existing nodes' `next` arrows around (and update `head`); don't create new nodes."
          ] },
          { code: py`
            chain = LinkedList()
            for word in ["way", "the", "find"]:
                chain.append(word)
            print(len(chain))        # 3
            print(chain.to_list())   # ['way', 'the', 'find']
            chain.reverse()
            print(chain.to_list())   # ['find', 'the', 'way']
          ` }
        ],
        lesson: [
          "A Python list keeps its items side by side in one block of memory, so it can jump straight to `items[500]`. A **linked list** is a chain instead: each **node** holds a value plus a reference — an arrow — to the next node. The list itself only remembers the first node, its **head**.",
          { diagram: py`
            head
             │
             ▼
            ┌─────┬─┐   ┌─────┬─┐   ┌──────┬─┐
            │"way"│●┼──▶│"the"│●┼──▶│"find"│●┼──▶ None
            └─────┴─┘   └─────┴─┘   └──────┴─┘
             value next
          ` },
          "To visit every node, start at the head and follow the arrows until you reach `None`:",
          { code: py`
            node = chain.head
            while node is not None:
                print(node.value)
                node = node.next        # step along the arrow
          ` },
          "To reach the 500th node you must follow 499 arrows, one after another: **O(n)**, where a list takes O(1). But adding at the *front* of a chain is O(1) (just make a new head), where `items.insert(0, x)` is O(n). Every structure trades one strength for another.",
          "Re-pointing arrows is the heart of linked lists, and the order matters: change `node.next` before saving where it pointed, and the rest of the chain is lost! Save first, then re-point. Here the first two nodes of a chain swap places:",
          { code: py`
            first = chain.head
            second = first.next
            first.next = second.next   # first skips second,
            second.next = first        # second points back,
            chain.head = second        # and second leads.
          ` },
          { tip: "An extra `tail` attribute (the last node) makes `append` O(1) instead of a walk along the whole chain — but then `reverse()` must update `tail` too." }
        ],
        starter: py`
          class Node:
              def __init__(self, value):
                  self.value = value
                  self.next = None


          class LinkedList:
              def __init__(self):
                  self.head = None

              def append(self, value):
                  pass  # hang a new Node at the end of the chain

              def __len__(self):
                  return 0

              def to_list(self):
                  return []

              def reverse(self):
                  pass  # turn every next arrow around, then update head
        `,
        hints: [
          "`append` on an empty chain just sets `head`. Otherwise, walk from `head` until you find the node whose `next` is `None`, and hang the new node there. `__len__` and `to_list` are walks along the chain too.",
          "To reverse, walk the chain once with two names: `previous` (starting as `None`) and `current` (starting at `head`). At each node, turn its arrow around to point at `previous`, then move both names one step forward. When `current` falls off the end, `previous` is the new head.",
          "Inside `while current is not None:` save the rest of the chain first — `following = current.next` — then `current.next = previous`, `previous = current`, `current = following`. After the loop, `self.head = previous`."
        ],
        solution: py`
          class Node:
              """One link of the chain: a value and an arrow to the next node."""
              def __init__(self, value):
                  self.value = value
                  self.next = None


          class LinkedList:
              def __init__(self):
                  self.head = None

              def append(self, value):
                  new_node = Node(value)
                  if self.head is None:          # empty chain: the new node is the head
                      self.head = new_node
                      return
                  node = self.head
                  while node.next is not None:   # walk to the last node...
                      node = node.next
                  node.next = new_node           # ...and hang the new one after it

              def __len__(self):
                  count = 0
                  node = self.head
                  while node is not None:
                      count += 1
                      node = node.next
                  return count

              def to_list(self):
                  values = []
                  node = self.head
                  while node is not None:
                      values.append(node.value)
                      node = node.next
                  return values

              def reverse(self):
                  previous = None
                  current = self.head
                  while current is not None:
                      following = current.next   # save the rest of the chain first!
                      current.next = previous    # turn this arrow around
                      previous = current         # step both names forward
                      current = following
                  self.head = previous           # the old tail is the new head
        `,
        altSolutions: [
          py`
            class Node:
                def __init__(self, value, next=None):
                    self.value = value
                    self.next = next


            class LinkedList:
                """Keeps a tail (O(1) append) and a size counter."""
                def __init__(self):
                    self.head = None
                    self.tail = None
                    self.size = 0

                def append(self, value):
                    node = Node(value)
                    if self.tail is None:
                        self.head = self.tail = node
                    else:
                        self.tail.next = node
                        self.tail = node
                    self.size += 1

                def __len__(self):
                    return self.size

                def __iter__(self):
                    node = self.head
                    while node:
                        yield node.value
                        node = node.next

                def to_list(self):
                    return list(self)

                def reverse(self):
                    previous, node = None, self.head
                    self.tail = self.head
                    while node:
                        node.next, previous, node = previous, node, node.next
                    self.head = previous
          `,
          py`
            class Node:
                def __init__(self, value):
                    self.value = value
                    self.next = None


            class LinkedList:
                def __init__(self):
                    self.head = None

                def append(self, value):
                    if not self.head:
                        self.head = Node(value)
                    else:
                        last = self.head
                        while last.next:
                            last = last.next
                        last.next = Node(value)

                def __len__(self):
                    return len(self.to_list())

                def to_list(self):
                    out, node = [], self.head
                    while node:
                        out.append(node.value)
                        node = node.next
                    return out

                def reverse(self):
                    def flip(node, previous):      # recursive version
                        if node is None:
                            return previous
                        following = node.next
                        node.next = previous
                        return flip(following, node)
                    self.head = flip(self.head, None)
          `
        ],
        wrongSolutions: [
          py`
            class Node:
                def __init__(self, value):
                    self.value = value
                    self.next = None


            class LinkedList:
                def __init__(self):
                    self.head = None

                def append(self, value):
                    if self.head is None:
                        self.head = Node(value)
                        return
                    node = self.head
                    while node.next is not None:
                        node = node.next
                    node.next = Node(value)

                def __len__(self):
                    return len(self.to_list())

                def to_list(self):
                    values, node = [], self.head
                    while node is not None:
                        values.append(node.value)
                        node = node.next
                    return values

                def reverse(self):
                    # Builds a brand-new chain instead of turning the arrows around.
                    values = self.to_list()
                    self.head = None
                    for value in reversed(values):
                        self.append(value)
          `,
          py`
            class Node:
                def __init__(self, value):
                    self.value = value
                    self.next = None


            class LinkedList:
                def __init__(self):
                    self.head = None

                def append(self, value):
                    if self.head is None:
                        self.head = Node(value)
                        return
                    node = self.head
                    while node.next is not None:
                        node = node.next
                    node.next = Node(value)

                def __len__(self):
                    count, node = 0, self.head
                    while node is not None:
                        count += 1
                        node = node.next
                    return count

                def to_list(self):
                    values, node = [], self.head
                    while node is not None:
                        values.append(node.value)
                        node = node.next
                    return values

                def reverse(self):
                    previous, current = None, self.head
                    while current is not None:
                        following = current.next
                        current.next = previous
                        previous = current
                        current = following
                    # forgot: self.head = previous
          `,
          py`
            class Node:
                def __init__(self, value):
                    self.value = value
                    self.next = None


            class LinkedList:
                def __init__(self):
                    self.head = None
                    self.tail = None

                def append(self, value):
                    node = Node(value)
                    if self.head is None:
                        self.head = self.tail = node
                    else:
                        self.tail.next = node
                        self.tail = node

                def __len__(self):
                    count, node = 0, self.head
                    while node is not None:
                        count += 1
                        node = node.next
                    return count

                def to_list(self):
                    values, node = [], self.head
                    while node is not None:
                        values.append(node.value)
                        node = node.next
                    return values

                def reverse(self):
                    previous, current = None, self.head
                    while current is not None:
                        following = current.next
                        current.next = previous
                        previous = current
                        current = following
                    self.head = previous
                    # forgot: self.tail still points at the old last node
          `
        ],
        tests: STEP_BUDGET + py`
          _ADVICE = ("Is a while loop forgetting to step along the chain (" + code("node = node.next") + ")? Or has the chain been "
                     + "joined into a loop?")

          def _make(class_name, *args):
              cls = need_class(class_name)
              try:
                  return cls(*args)
              except TypeError as problem:
                  shown = class_name + "(" + ", ".join(short(a) for a in args) + ")"
                  fail("Creating " + code(shown) + " failed: " + str(problem) + ". Check the parameters of "
                       + code(class_name + ".__init__") + " (the task lists them).")

          def _chain(values):
              chain = _make("LinkedList")
              append = need_method(chain, "append")
              for value in values:
                  append(value)
              return chain

          def _nodes(chain, limit=2000):
              """Follow the next arrows from head, failing clearly on a loop or a non-node."""
              nodes = []
              node = need_attr(chain, "head")
              while node is not None:
                  if not (hasattr(node, "value") and hasattr(node, "next")):
                      fail("Following the chain from " + code("head") + " reached " + short(node) + ", which isn't a Node (a Node "
                           + "has " + code("value") + " and " + code("next") + " attributes). Do " + code("head") + " and every "
                           + code("next") + " hold Node objects?")
                  nodes.append(node)
                  if len(nodes) > limit:
                      fail("Following the " + code("next") + " arrows from " + code("head") + " never reaches None: the chain "
                           + "loops back on itself. Check which arrows your method re-points.")
                  node = node.next
              return nodes

          def _built(values):
              """A chain made with append(), checked before a trial relies on it."""
              chain = _chain(values)
              got = [node.value for node in _nodes(chain)]
              if got != list(values):
                  fail("After appending " + short(list(values), 50) + " to a new LinkedList, following the " + code("next")
                       + " arrows from " + code("head") + " gives " + short(got, 50) + ". Fix " + code("append()") + " first: "
                       + "it should hang each new node at the end of the chain.")
              return chain

          def _values(chain):
              result = need_method(chain, "to_list")()
              if result is None:
                  fail(code("to_list()") + " returned None. Build a Python list of the values and " + code("return") + " it.")
              expect(isinstance(result, list), code("to_list()") + " should return a list, but it returned " + short(result) + ".")
              return result

          def _length(chain):
              size = need_method(chain, "__len__")()
              if size is None:
                  fail(code("__len__") + " returned None. Count the nodes and " + code("return") + " the count.")
              expect(isinstance(size, int) and not isinstance(size, bool) and size >= 0,
                     code("__len__") + " should return a whole number of nodes, but it returned " + short(size) + ".")
              return len(chain)


          @test("Node('ember') has value 'ember' and next None")
          @_budget(20000, _ADVICE)
          def _():
              node = _make("Node", "ember")
              expect_equal(need_attr(node, "value"), "ember", "A new Node's " + code("value") + " should be the value you gave it.")
              expect(need_attr(node, "next") is None, "A new Node's " + code("next") + " should be None (it isn't linked to "
                     + "anything yet), but it is " + short(node.next) + ".")


          @test("A new LinkedList is empty: head is None, len() is 0, to_list() is []")
          @_budget(20000, _ADVICE)
          def _():
              chain = _make("LinkedList")
              expect(need_attr(chain, "head") is None, "A new LinkedList's " + code("head") + " should be None, but it is "
                     + short(chain.head) + ".")
              expect_equal(_length(chain), 0, code("len()") + " of an empty chain:")
              expect_equal(_values(chain), [], code("to_list()") + " of an empty chain:")


          @test("append() adds echoes at the end: 'way', 'the', 'find'")
          @_budget(20000, _ADVICE)
          def _():
              chain = _chain(["way", "the", "find"])
              nodes = _nodes(chain)
              expect(len(nodes) > 0, "After three appends, " + code("head") + " is still None. The first append should make "
                     + "its new node the head.")
              expect_equal([n.value for n in nodes], ["way", "the", "find"], "Following the " + code("next") + " arrows from "
                           + code("head") + " should visit the values in the order they were appended.")
              expect_equal(_values(chain), ["way", "the", "find"], code("to_list()") + " after appending 'way', 'the', 'find':")
              expect_equal(_length(chain), 3, code("len()") + " after three appends:")


          @test("reverse() turns the chain around in place, reusing the same nodes")
          @_budget(20000, _ADVICE)
          def _():
              chain = _built(["way", "the", "find"])
              before = _nodes(chain)
              need_method(chain, "reverse")()
              after = _nodes(chain)
              values = [n.value for n in after]
              if values != ["find", "the", "way"]:
                  hint = ""
                  if values == ["way"]:
                      hint = (" Only the old head is left: after turning the arrows around, set " + code("self.head")
                              + " to the old last node.")
                  elif values == ["way", "the", "find"]:
                      hint = (" The chain didn't change at all: " + code("reverse()") + " must change this chain itself, "
                              + "not build and return a new one.")
                  fail("After " + code("reverse()") + ", following the arrows from " + code("head") + " should give "
                       + "['find', 'the', 'way'], but it gives " + short(values) + "." + hint)
              if not all(a is b for a, b in zip(after, reversed(before))):
                  if all(a is b for a, b in zip(after, before)):
                      fail("Your " + code("reverse()") + " swapped the values between the nodes, but every " + code("next")
                           + " arrow still points the same way. Turn the next arrows around instead, so that the old last node "
                           + "becomes the new head.")
                  fail(code("reverse()") + " should turn around the arrows of the nodes already in the chain, not create new nodes.")
              expect_equal(_values(chain), ["find", "the", "way"], code("to_list()") + " after reverse():")
              expect_equal(_length(chain), 3, code("len()") + " after reverse():")


          @test("Edge cases: reversing an empty chain or a single echo, and appending after reverse()")
          @_budget(20000, _ADVICE)
          def _():
              empty = _chain([])
              need_method(empty, "reverse")()
              expect(need_attr(empty, "head") is None, "Reversing an empty chain should leave " + code("head") + " as None.")
              expect_equal(_values(empty), [], code("to_list()") + " of a reversed empty chain:")
              solo = _built(["solo"])
              node = solo.head
              need_method(solo, "reverse")()
              expect(solo.head is node and node.next is None, "Reversing a one-node chain should leave it exactly as it was: "
                     + "the same head node, with " + code("next") + " still None.")
              chain = _built(["a", "b", "c"])
              need_method(chain, "reverse")()
              need_method(chain, "append")("z")
              values = [n.value for n in _nodes(chain)]
              expect(values == ["c", "b", "a", "z"], "After reversing ['a', 'b', 'c'] and then appending 'z', the chain should be "
                     + "['c', 'b', 'a', 'z'], but it is " + short(values) + ". (If you keep a " + code("tail") + " attribute, "
                     + code("reverse()") + " must update it too.)")
              expect_equal(_length(chain), 4, code("len()") + " after reversing and appending:")


          @test("A chain of 300 echoes counts, reverses, and reverses back")
          @_budget(1000000, _ADVICE)
          def _():
              values = list(range(300))
              chain = _built(values)
              expect_equal(_length(chain), 300, code("len()") + " of a chain of 300 echoes:")
              need_method(chain, "reverse")()
              expect(_values(chain) == values[::-1], "After one " + code("reverse()") + ", " + code("to_list()")
                     + " should run from 299 down to 0.")
              need_method(chain, "reverse")()
              expect(_values(chain) == values, "After reversing twice, the chain should be back in its original order (0 to 299).")
        `,
        scene: { icon: "⛓️", successIcon: "🔗", successText: "Link by link, the chain of echoes turns around — and now it points the way out.", effect: "fire" }
      },

      // ------------------------------------------------------------------
      // 6. Binary search
      // ------------------------------------------------------------------
      {
        id: "labyrinth-hall-of-doors",
        title: "The Hall of Endless Doors",
        difficulty: "hard",
        concepts: ["binary search", "O(log n)", "sorted data"],
        story: [
          "The next hall is lined with a hundred thousand doors, each carved with a rune number, in perfect increasing order. Glitch is hiding behind one of them.",
          "\"Every door we open wakes an echo,\" Ada whispers, \"and a hundred thousand echoes would wake the whole Labyrinth. So open the *middle* door: then you'll know which half he's in. Then do it again.\""
        ],
        task: [
          "Write `find_door(doors, rune)`. `doors` is a list of whole numbers sorted from smallest to largest, with no repeats. **Return** the position of `rune` in `doors`, or `-1` if it isn't there.",
          { code: py`
            doors = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
            find_door(doors, 23)   # → 5
            find_door(doors, 2)    # → 0
            find_door(doors, 40)   # → -1
          ` },
          "Use **binary search**, and write the halving yourself (no `bisect` module). One trial hands your spell an enchanted corridor of 100,000 doors that counts every door you read: `len(doors)` and `doors[i]` work as usual, but each search may read at most **72** doors."
        ],
        lesson: [
          "Checking items one by one — a *linear search* — can take as many looks as there are items: O(n). But when the items are **sorted**, you can do far better. Look at the middle item. If it's too small, everything to its left is too small as well, so throw that whole half away; if it's too big, throw away the right half. Every look halves what is left:",
          { diagram: py`
            doors left: 100,000 → 50,000 → 25,000
                     → 12,500 → 6,250 → … → 2 → 1
            about 17 looks, because 2 ** 17 = 131,072
          ` },
          "Halving n down to 1 takes about log₂ n steps, so binary search is **O(log n)**: a million doors need about 20 looks, and a billion only 30. The same idea wins the number-guessing game:",
          { code: py`
            secret = 73
            low, high = 1, 100    # it's in low..high
            guesses = 0
            while True:
                guess = (low + high) // 2    # the middle
                guesses += 1
                if guess == secret:
                    break
                elif guess < secret:
                    low = guess + 1    # too small: go higher
                else:
                    high = guess - 1   # too big: go lower
            print("Found", secret, "in", guesses, "guesses")
          `, output: "Found 73 in 6 guesses" },
          "In a list, `low` and `high` are *positions*, and the middle door is `doors[mid]`. Two details trip up every wizard: use `//` so that `mid` is a whole number, and always move `low` or `high` *past* `mid` (`mid + 1` or `mid - 1`), or the search can get stuck forever.",
          { warning: "Don't slice (`doors[mid:]`): a slice copies — and so reads — every door in it. Keep the two positions instead." }
        ],
        starter: py`
          def find_door(doors, rune):
              """Return the position of rune in the sorted list doors, or -1."""
              low = 0
              high = len(doors) - 1
              # While part of the hall is still left to search, open the middle
              # door and throw away the half that can't hold the rune.

              return -1
        `,
        hints: [
          "Keep two positions, `low = 0` and `high = len(doors) - 1`. If the rune is anywhere, it's between them. Each step, open the door in the middle and move one of the two positions.",
          "Loop `while low <= high:` and pick `mid = (low + high) // 2`. If `doors[mid] == rune`, return `mid`. If that door is too small, the rune must be to the right; if too big, to the left. If the loop ends, nothing is left to search: return `-1`.",
          "Too small: `low = mid + 1`. Too big: `high = mid - 1`. Moving past `mid` guarantees the search shrinks every time, so the loop always ends."
        ],
        solution: py`
          def find_door(doors, rune):
              """Return the position of rune in the sorted list doors, or -1."""
              low, high = 0, len(doors) - 1      # the rune can only be between low and high
              while low <= high:
                  mid = (low + high) // 2
                  door = doors[mid]              # open the middle door (one read)
                  if door == rune:
                      return mid
                  if door < rune:
                      low = mid + 1              # too small: the rune is to the right
                  else:
                      high = mid - 1             # too big: the rune is to the left
              return -1                          # low passed high: nowhere left to look
        `,
        altSolutions: [
          py`
            def find_door(doors, rune, low=0, high=None):
                # Recursive: search doors[low..high].
                if high is None:
                    high = len(doors) - 1
                if low > high:
                    return -1
                mid = (low + high) // 2
                if doors[mid] == rune:
                    return mid
                if doors[mid] < rune:
                    return find_door(doors, rune, mid + 1, high)
                return find_door(doors, rune, low, mid - 1)
          `,
          py`
            def find_door(doors, rune):
                # Half-open range [low, high): find the first door >= rune.
                low, high = 0, len(doors)
                while low < high:
                    mid = (low + high) // 2
                    if doors[mid] < rune:
                        low = mid + 1
                    else:
                        high = mid
                if low < len(doors) and doors[low] == rune:
                    return low
                return -1
          `
        ],
        wrongSolutions: [
          py`
            def find_door(doors, rune):
                # Linear search: right answers, but it opens door after door.
                for position, door in enumerate(doors):
                    if door == rune:
                        return position
                return -1
          `,
          py`
            def find_door(doors, rune):
                if rune in doors:
                    return doors.index(rune)
                return -1
          `,
          py`
            def find_door(doors, rune):
                low, high = 0, len(doors) - 1
                while low < high:            # stops one door too early
                    mid = (low + high) // 2
                    if doors[mid] == rune:
                        return mid
                    elif doors[mid] < rune:
                        low = mid + 1
                    else:
                        high = mid - 1
                return -1
          `
        ],
        tests: STEP_BUDGET + py`
          import ast as _ast

          _ADVICE = ("Every step must shrink the search: move " + code("low") + " past " + code("mid") + " or " + code("high")
                     + " below it, and stop once " + code("low > high") + ".")
          _SLICE_NOTE = (" Slicing, like " + code("doors[mid:]") + ", copies (and so opens) every door in the slice: keep "
                         + code("low") + " and " + code("high") + " positions instead.")

          class _Corridor(list):
              """Sorted doors that count every door the spell reads (opens)."""

              def __init__(self, runes, limit, message):
                  list.__init__(self, runes)
                  self.opened = 0
                  self.limit = limit
                  self.message = message
                  self.sliced = False

              def _open(self, amount):
                  self.opened += amount
                  if self.opened > self.limit:
                      fail(self.message + (_SLICE_NOTE if self.sliced else ""))

              def __getitem__(self, index):
                  size = list.__len__(self)
                  if isinstance(index, slice):
                      part = list.__getitem__(self, index)
                      self.sliced = True
                      self._open(len(part))
                      return part
                  if not isinstance(index, int):
                      fail("Door positions must be whole numbers, but your spell asked for door " + short(index) + ". Use "
                           + code("//") + " to find the middle, like " + code("(low + high) // 2") + ".")
                  if not -size <= index < size:
                      if size == 0:
                          fail("Your spell tried to open door " + str(index) + ", but this hall has no doors at all.")
                      fail("Your spell tried to open door " + str(index) + ", but the doors are numbered 0 to " + str(size - 1)
                           + ". Check where " + code("low") + " and " + code("high") + " start, and your loop condition.")
                  self._open(1)
                  return list.__getitem__(self, index)

              def __iter__(self):
                  for position in range(list.__len__(self)):
                      self._open(1)
                      yield list.__getitem__(self, position)

              def __reversed__(self):
                  for position in range(list.__len__(self) - 1, -1, -1):
                      self._open(1)
                      yield list.__getitem__(self, position)

              def __contains__(self, rune):
                  self._open(list.__len__(self))
                  return list.__contains__(self, rune)

              def index(self, *args):
                  self._open(list.__len__(self))
                  return list.index(self, *args)

              def count(self, rune):
                  self._open(list.__len__(self))
                  return list.count(self, rune)

              def copy(self):
                  self._open(list.__len__(self))
                  return list(list.__iter__(self))


          def _check(doors, rune, expected, strict=False):
              find_door = need_function("find_door", 2)
              size = len(doors)
              if strict:
                  limit = 4 * (size.bit_length() + 1)
                  message = ("To look for " + str(rune) + " among " + format(size, ",") + " doors, your spell opened more than "
                             + str(limit) + " of them. Binary search needs only about " + str(size.bit_length()) + ": open the "
                             + "middle door, then throw away the half that can't hold the rune. (Loops over the doors, " + code("in")
                             + ", " + code(".index()") + " and " + code("list(doors)") + " all open the doors one by one.)")
                  call = code("find_door(hall_of_" + str(size) + "_doors, " + str(rune) + ")")
              else:
                  limit = 4 * size + 100
                  message = ("Your spell opened more than " + str(limit) + " doors in a hall of only " + str(size) + ": it seems "
                             + "to be going round in circles. " + _ADVICE)
                  call = code("find_door(" + short(doors, 70) + ", " + str(rune) + ")")
              hall = _Corridor(doors, limit, message)
              result = find_door(hall, rune)
              expect(hall.opened <= hall.limit, message)
              if result is None:
                  fail(call + " returned None. Return the door's position, or -1 if the rune isn't there.")
              if result != expected:
                  why = (" (" + str(rune) + " isn't behind any door.)") if expected == -1 else ""
                  fail(call + " should return " + str(expected) + ", but it returned " + short(result) + "." + why)


          @test("find_door([2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23) is 5")
          @_budget(100000, _ADVICE)
          def _():
              doors = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
              for rune, expected in ((23, 5), (2, 0), (91, 9), (38, 6)):
                  _check(doors, rune, expected)


          @test("Every door can be found, in halls of 1 to 12 doors")
          @_budget(200000, _ADVICE)
          def _():
              for size in range(1, 13):
                  doors = [3 * k + 1 for k in range(size)]
                  for position, rune in enumerate(doors):
                      _check(doors, rune, position)


          @test("Missing runes give -1, even in an empty hall")
          @_budget(100000, _ADVICE)
          def _():
              _check([], 5, -1)
              _check([7], 3, -1)
              _check([7], 9, -1)
              for rune in (5, 15, 35, 45, 55):
                  _check([10, 20, 30, 40, 50], rune, -1)


          @test("A hall of 100,000 doors: each search opens at most 72 of them")
          @_budget(100000, _ADVICE)
          def _():
              doors = [7 * k + 3 for k in range(100000)]
              for position in (0, 99999, 50000, 12345, 99998, 1, 77777):
                  _check(doors, doors[position], position, strict=True)
              for rune in (2, doors[-1] + 4, doors[777] + 1, doors[66666] - 3):
                  _check(doors, rune, -1, strict=True)


          @test("You wrote the halving yourself (no bisect module)")
          def _():
              for node in _ast.walk(_ast.parse(source)):
                  names = []
                  if isinstance(node, _ast.Import):
                      names = [alias.name for alias in node.names]
                  elif isinstance(node, _ast.ImportFrom):
                      names = [node.module or ""]
                  if any(name.split(".")[0] == "bisect" for name in names):
                      fail("Well spotted: Python's " + code("bisect") + " module does binary search for you! But this trial "
                           + "wants to see you halve the hall yourself, with " + code("low") + ", " + code("high") + " and "
                           + code("mid") + ".")
        `,
        scene: { icon: "🚪", successIcon: "🎯", successText: "Just a handful of doors creak open — and behind the last one, a very surprised Glitch scampers off into the dark!", effect: "portal" }
      },

      // ------------------------------------------------------------------
      // 7. Merge sort
      // ------------------------------------------------------------------
      {
        id: "labyrinth-shattered-mirror",
        title: "The Shattered Mirror",
        difficulty: "hard",
        concepts: ["merge sort", "divide and conquer", "O(n log n)", "stable sorting"],
        story: [
          "Glitch has shattered the great Echo Mirror. Every shard still holds an echo, and every echo has a loudness — but the shards lie scattered at random.",
          "\"The mirror mends only if the shards are laid out from quietest to loudest,\" says Ada. \"And no shortcuts: `sorted()` is the very spell Glitch broke. Split the pile, sort each half, then merge them.\""
        ],
        task: [
          "Write `merge_sort(items)` that **returns a new list** of the same items in ascending order, using merge sort. Don't use `sorted()` or `.sort()`, and don't change the list you were given.",
          { code: py`
            merge_sort([38, 27, 43, 3, 9, 82, 10])
            # → [3, 9, 10, 27, 38, 43, 82]

            merge_sort(["mist", "ash", "echo"])
            # → ['ash', 'echo', 'mist']

            merge_sort([])   # → []
          ` },
          { list: [
            "The trials also sort *echoes*: objects that compare by loudness with `<`, `<=`, `>`, `>=` and `==`. Simply compare items; never look inside them.",
            "Your sort must be **stable**: items that compare equal keep their original order, so two equally loud echoes stay in the order they arrived.",
            "It must be fast: one trial sorts 2,000 echoes and allows at most **88,000** comparisons (merge sort needs about 20,000; comparing pair after pair takes millions)."
          ] }
        ],
        lesson: [
          "**Divide and conquer**: split a big problem into smaller versions of itself, solve those (recursion!), and combine their answers.",
          "**Merge sort** splits the list in half, sorts each half by calling itself, then *merges* the two sorted halves into one. A list of 0 or 1 items is already sorted: that's the base case.",
          { diagram: py`
            split:  [38, 27, 43, 3, 9, 82, 10]
                    [38, 27, 43]    [3, 9, 82, 10]
                    [38] [27, 43]   [3, 9] [82, 10]
                    [38] [27] [43]  [3] [9] [82] [10]
            merge:  [38] [27, 43]   [3, 9] [10, 82]
                    [27, 38, 43]    [3, 9, 10, 82]
                    [3, 9, 10, 27, 38, 43, 82]
          ` },
          "**Merging** is the clever part. The smallest item left must be at the front of one half or the other, so compare the two fronts, take the smaller, and repeat. When one half runs out, the rest of the other is already in order:",
          { diagram: py`
            left  = [27, 38, 43]
            right = [3, 9, 10, 82]
            27 vs 3    take 3     [3]
            27 vs 9    take 9     [3, 9]
            27 vs 10   take 10    [3, 9, 10]
            27 vs 82   take 27    [3, 9, 10, 27]
            38 vs 82   take 38    [3, 9, 10, 27, 38]
            43 vs 82   take 43    [3, 9, 10, 27, 38, 43]
            left is empty: add the rest of right
                                  [3, 9, 10, 27, 38, 43, 82]
          ` },
          "Each level of splitting merges n items in total, and halving n down to 1 takes about log₂ n levels, so merge sort is **O(n log n)**. For 2,000 items that's about 20,000 comparisons; comparing every pair, as bubble sort does, takes about 2,000,000.",
          "A sort is **stable** if equal items keep their original order. Think carefully about which front to take when the two fronts are equal!"
        ],
        starter: py`
          def merge(left, right):
              """Merge two sorted lists into one new sorted list."""
              merged = []
              # Compare the fronts of left and right, take the smaller one, repeat.
              # When one side runs out, add whatever is left of the other.
              return merged


          def merge_sort(items):
              """Return a NEW list with the items in ascending order (stable)."""
              # Base case: 0 or 1 items are already sorted.
              # Otherwise: split in half, merge_sort each half, then merge them.
              return items
        `,
        hints: [
          "Base case first: a list with 0 or 1 items is already sorted, so return a copy of it (`list(items)`). Otherwise split at `mid = len(items) // 2` and call `merge_sort` on `items[:mid]` and on `items[mid:]`.",
          "Write a helper `merge(left, right)` that builds a new list. Keep a position `i` in `left` and `j` in `right`. While both have items left, append the smaller front and move that position on. When one runs out, add the rest of the other: `merged.extend(left[i:])` and `merged.extend(right[j:])`.",
          "For stability, take from `left` when the fronts are equal: `if left[i] <= right[j]:`. Then `merge_sort` is just `return merge(merge_sort(items[:mid]), merge_sort(items[mid:]))`."
        ],
        solution: py`
          def merge(left, right):
              """Merge two sorted lists into one new sorted list."""
              merged = []
              i = j = 0
              while i < len(left) and j < len(right):
                  if left[i] <= right[j]:        # <= takes the LEFT item on a tie: stable
                      merged.append(left[i])
                      i += 1
                  else:
                      merged.append(right[j])
                      j += 1
              merged.extend(left[i:])            # one side ran out: the rest of the other
              merged.extend(right[j:])           # is already sorted, so add it as it is
              return merged


          def merge_sort(items):
              """Return a NEW list with the items in ascending order (stable)."""
              if len(items) <= 1:
                  return list(items)             # a copy, so we never hand back the original
              mid = len(items) // 2
              return merge(merge_sort(items[:mid]), merge_sort(items[mid:]))
        `,
        altSolutions: [
          py`
            def merge_sort(items):
                # Bottom-up: merge runs of length 1, then 2, then 4, ... without recursion.
                runs = [[item] for item in items]
                while len(runs) > 1:
                    paired = []
                    for k in range(0, len(runs) - 1, 2):
                        left, right = runs[k], runs[k + 1]
                        merged, i, j = [], 0, 0
                        while i < len(left) and j < len(right):
                            if right[j] < left[i]:
                                merged.append(right[j])
                                j += 1
                            else:
                                merged.append(left[i])
                                i += 1
                        paired.append(merged + left[i:] + right[j:])
                    if len(runs) % 2:
                        paired.append(runs[-1])
                    runs = paired
                return runs[0] if runs else []
          `,
          py`
            from collections import deque

            def merge_sort(items):
                if len(items) < 2:
                    return items[:]
                mid = len(items) // 2
                left = deque(merge_sort(items[:mid]))
                right = deque(merge_sort(items[mid:]))
                result = []
                while left and right:
                    result.append(left.popleft() if left[0] <= right[0] else right.popleft())
                result.extend(left or right)
                return result
          `
        ],
        wrongSolutions: [
          py`
            def merge_sort(items):
                return sorted(items)       # the forbidden shortcut
          `,
          py`
            def merge(left, right):
                merged = []
                i = j = 0
                while i < len(left) and j < len(right):
                    if left[i] < right[j]:          # on a tie this takes the RIGHT item: unstable
                        merged.append(left[i])
                        i += 1
                    else:
                        merged.append(right[j])
                        j += 1
                return merged + left[i:] + right[j:]

            def merge_sort(items):
                if len(items) <= 1:
                    return list(items)
                mid = len(items) // 2
                return merge(merge_sort(items[:mid]), merge_sort(items[mid:]))
          `,
          py`
            def merge_sort(items):
                # Insertion sort: correct and stable, but O(n**2) comparisons.
                result = list(items)
                for k in range(1, len(result)):
                    current = result[k]
                    j = k - 1
                    while j >= 0 and result[j] > current:
                        result[j + 1] = result[j]
                        j -= 1
                    result[j + 1] = current
                return result
          `
        ],
        tests: STEP_BUDGET + py`
          import ast as _ast

          _ADVICE = "Is a while loop forgetting to move " + code("i") + " or " + code("j") + " forward?"

          class Echo:
              """A trial item compared ONLY by loudness; its name tells equal echoes apart."""
              comparisons = 0
              limit = None
              MESSAGE = ("Sorting 2,000 echoes took more than 88,000 comparisons! Merge sort needs only about 20,000 (n times "
                         + "log2 n). Comparing items pair after pair, as insertion, selection or bubble sort do, takes around "
                         + "2,000,000. Split the list in half, sort each half, and merge.")

              def __init__(self, name, loudness):
                  self.name = name
                  self.loudness = loudness

              def __repr__(self):
                  return "Echo(" + repr(self.name) + ", " + str(self.loudness) + ")"

              def _key(self, other):
                  Echo.comparisons += 1
                  if Echo.limit is not None and Echo.comparisons > Echo.limit:
                      fail(Echo.MESSAGE)
                  if isinstance(other, Echo):
                      return other.loudness
                  if isinstance(other, (int, float)) and not isinstance(other, bool):
                      return other
                  return None

              def __lt__(self, other):
                  key = self._key(other)
                  return NotImplemented if key is None else self.loudness < key

              def __le__(self, other):
                  key = self._key(other)
                  return NotImplemented if key is None else self.loudness <= key

              def __gt__(self, other):
                  key = self._key(other)
                  return NotImplemented if key is None else self.loudness > key

              def __ge__(self, other):
                  key = self._key(other)
                  return NotImplemented if key is None else self.loudness >= key

              def __eq__(self, other):
                  key = self._key(other)
                  return NotImplemented if key is None else self.loudness == key

              def __ne__(self, other):
                  key = self._key(other)
                  return NotImplemented if key is None else self.loudness != key

              __hash__ = object.__hash__


          def _sort(items):
              merge_sort = need_function("merge_sort", 1)
              result = merge_sort(items)
              if result is None:
                  fail(code("merge_sort") + " returned None. Build a new sorted list and " + code("return") + " it. (Careful: "
                       + "methods that change a list in place, like " + code(".sort()") + ", return None.)")
              expect(isinstance(result, list), code("merge_sort") + " should return a list, but it returned " + short(result) + ".")
              return result

          def _check(items):
              given = list(items)
              expected = sorted(given)      # the trials may use sorted(); the spell may not!
              result = _sort(items)
              call = code("merge_sort(" + short(given, 70) + ")")
              if len(result) < len(expected):
                  fail(call + " returned only " + str(len(result)) + " of the " + str(len(expected)) + " items: " + short(result)
                       + ". When one half runs out, add everything left in the other half.")
              expect_equal(result, expected, call + ":")

          def _echo_check(result, names, loudness):
              expect(len(result) == len(names) and all(isinstance(e, Echo) for e in result), code("merge_sort")
                     + " should return the same " + str(len(names)) + " echoes, sorted, but it returned " + short(result) + ".")
              if [e.loudness for e in result] != loudness:
                  fail("The echoes should come back from quietest to loudest, but they came back as " + short(result) + ".")
              got = [e.name for e in result]
              if got != names:
                  k = 0
                  while got[k] == names[k]:
                      k += 1
                  fail("Equally loud echoes must stay in the order they arrived in (a stable sort), but " + repr(got[k])
                       + " came before " + repr(names[k]) + ". Split the list into a left part and a right part ("
                       + code("items[:mid]") + " and " + code("items[mid:]") + "), so everything on the left arrived first, and "
                       + "when the two fronts are equal, think about which one to take first.")


          @test("merge_sort([38, 27, 43, 3, 9, 82, 10]) returns [3, 9, 10, 27, 38, 43, 82]")
          @_budget(100000, _ADVICE)
          def _():
              _check([38, 27, 43, 3, 9, 82, 10])


          @test("Tricky lists: empty, one item, sorted, reverse sorted, duplicates, words")
          @_budget(100000, _ADVICE)
          def _():
              for items in ([], [7], [2, 1], list(range(10)), list(range(10, 0, -1)), [3, -1, 3, 0, -1, 3],
                            [5, 5, 5, 5], ["mist", "ash", "gloom", "echo"]):
                  _check(items)


          @test("Returns a new list and leaves the original untouched")
          @_budget(100000, _ADVICE)
          def _():
              items = [5, 2, 4, 1, 3]
              result = _sort(items)
              expect(items == [5, 2, 4, 1, 3], code("merge_sort") + " changed the list it was given: it is now " + short(items)
                     + ". Leave the original alone and build new lists as you merge.")
              expect(result is not items, code("merge_sort") + " returned the very list it was given. Return a new list instead.")
              expect_equal(result, [1, 2, 3, 4, 5])


          @test("Stable: equally loud echoes keep the order they arrived in")
          @_budget(100000, _ADVICE)
          def _():
              echoes = [Echo("ash", 2), Echo("bell", 1), Echo("cinder", 2), Echo("dusk", 1), Echo("ember", 2), Echo("fog", 0)]
              result = _sort(list(echoes))
              _echo_check(result, ["fog", "bell", "dusk", "ash", "cinder", "ember"], [0, 1, 1, 2, 2, 2])


          @test("2,000 echoes are sorted with at most 88,000 comparisons")
          @_budget(2000000, _ADVICE)
          def _():
              echoes = [Echo("echo" + str(k), (k * 7919) % 2003 % 500) for k in range(2000)]
              in_order = sorted(echoes, key=lambda e: e.loudness)      # stable, and compares numbers, not echoes
              Echo.comparisons = 0
              Echo.limit = 88000
              try:
                  result = _sort(list(echoes))
              finally:
                  Echo.limit = None
              expect(Echo.comparisons <= 88000, Echo.MESSAGE)
              _echo_check(result, [e.name for e in in_order], [e.loudness for e in in_order])


          @test("Sorted by your own hand: no sorted(), .sort(), heapq or bisect")
          def _():
              own = {name for name, value in spell.items()
                     if getattr(getattr(value, "__code__", None), "co_filename", "") == "<spell>"}
              yourself = (" Sort the items yourself: split the list, " + code("merge_sort") + " each half, and merge.")
              for node in _ast.walk(_ast.parse(source)):
                  if isinstance(node, _ast.Call):
                      func = node.func
                      if isinstance(func, _ast.Name) and func.id == "sorted" and "sorted" not in own:
                          fail("Your spell uses " + code("sorted()") + ", the very spell Glitch broke!" + yourself)
                      if isinstance(func, _ast.Attribute) and func.attr in ("sort", "sorted"):
                          fail("Your spell uses " + code("." + func.attr + "()") + ", the very spell Glitch broke!" + yourself)
                  names = []
                  if isinstance(node, _ast.Import):
                      names = [alias.name for alias in node.names]
                  elif isinstance(node, _ast.ImportFrom):
                      names = [node.module or ""]
                  for name in names:
                      module = name.split(".")[0]
                      if module in ("heapq", "bisect"):
                          fail("Your spell imports the " + code(module) + " module, which does the sorting work for you." + yourself)
        `,
        scene: { icon: "🪞", successIcon: "✨", successText: "The shards glide into place, quietest to loudest, and the Echo Mirror shines whole again.", effect: "frost" }
      },

      // ------------------------------------------------------------------
      // 8. DFS / flood fill
      // ------------------------------------------------------------------
      {
        id: "labyrinth-flooded-caverns",
        title: "The Flooded Caverns",
        difficulty: "hard",
        concepts: ["depth-first search", "flood fill", "grids", "visited sets"],
        story: [
          "Glitch has opened the sluice gates, and the lower caverns are flooding! Only patches of rock still poke above the water.",
          "\"Every island needs a lantern, so that no one gets stranded,\" says Ada, unrolling her map. \"Count the islands, precisely. Rock that touches rock — up, down, left or right — is all one island.\""
        ],
        task: [
          "Write `count_islands(cavern)`. The map `cavern` is a list of strings, all the same length: `#` is rock and `~` is water. **Return** the number of separate islands. Two rock squares belong to the same island if they touch up, down, left or right; touching diagonally doesn't count.",
          { code: py`
            cavern = [
                "##~~#",
                "#~~##",
                "~~#~~",
                "~#~~#",
            ]
            count_islands(cavern)   # → 5
          ` },
          "A map with no rock (or no rows at all) has 0 islands. Don't change the map you were given. The trials stop any spell that does far more work than it needs to — for example, one that forgets which squares it has already visited."
        ],
        lesson: [
          "A grid map is really a **graph**: every square is a place, and neighbouring squares are connected. To find everything connected to one square, flood outward from it, like spilled ink spreading into every square it can reach. This is called **flood fill**.",
          "**Depth-first search (DFS)** floods by always pushing on to an unexplored neighbour, and only backs up when it's stuck. A stack drives it: pop a square, then push its unexplored neighbours. This spell measures one spill of ink across the open floor (`.`) of a map:",
          { code: py`
            # up, down, left, right
            STEPS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

            def spill(grid, start):
                """Count the floor squares ink can reach."""
                rows, cols = len(grid), len(grid[0])
                seen = {start}           # reached so far
                stack = [start]
                while stack:
                    row, col = stack.pop()
                    for dr, dc in STEPS:
                        r, c = row + dr, col + dc
                        if (0 <= r < rows and 0 <= c < cols
                                and grid[r][c] == "."
                                and (r, c) not in seen):
                            seen.add((r, c))
                            stack.append((r, c))
                return len(seen)

            print(spill(["..#",
                         "#.#",
                         "..."], (0, 0)))
          `, output: "6" },
          "The `seen` set is essential: without it, the ink would flow back and forth between two squares forever. Because each square is added to `seen` only once, a flood takes at most **O(rows × cols)** time.",
          { warning: "Mind the edges! In Python `grid[-1]` is the *last* row and `row[-1]` the last square, so without the `0 <=` checks, ink stepping off the top or left edge silently wraps around to the other side." },
          { tip: "DFS can also be written recursively: a function that marks a square and then calls itself on each neighbour. Python's own call stack then plays the part of `stack`." }
        ],
        starter: py`
          def count_islands(cavern):
              """Count the groups of '#' squares joined up, down, left or right."""
              seen = set()      # (row, col) squares already explored
              islands = 0
              # Scan every square. Unexplored rock? That's a new island:
              # count it, then flood the whole island so it's never counted again.

              return islands
        `,
        hints: [
          "Look at every square in turn. Whenever you find rock that you haven't explored yet, you've discovered a new island: count it!",
          "Then flood that whole island from there, adding every connected rock square to a `seen` set. Use one `seen` set for the whole map, so the rest of that island is never counted again.",
          "Outline: `for row in range(len(cavern)):` and `for col in range(len(cavern[0])):`, then `if cavern[row][col] == \"#\" and (row, col) not in seen:` → `islands += 1`, and run a stack flood from `(row, col)` that adds rock neighbours to `seen`."
        ],
        solution: py`
          def count_islands(cavern):
              """Count the groups of '#' squares joined up, down, left or right."""
              if not cavern:
                  return 0
              rows, cols = len(cavern), len(cavern[0])
              seen = set()                       # (row, col) squares already explored
              islands = 0
              for row in range(rows):
                  for col in range(cols):
                      if cavern[row][col] != "#" or (row, col) in seen:
                          continue
                      islands += 1               # unexplored rock: a new island!
                      seen.add((row, col))
                      stack = [(row, col)]       # flood it so it is never counted again
                      while stack:
                          r, c = stack.pop()
                          for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                              nr, nc = r + dr, c + dc
                              if (0 <= nr < rows and 0 <= nc < cols
                                      and cavern[nr][nc] == "#" and (nr, nc) not in seen):
                                  seen.add((nr, nc))
                                  stack.append((nr, nc))
              return islands
        `,
        altSolutions: [
          py`
            def count_islands(cavern):
                seen = set()

                def explore(r, c):                 # recursive flood fill
                    if r < 0 or c < 0 or r >= len(cavern) or c >= len(cavern[r]):
                        return
                    if cavern[r][c] != "#" or (r, c) in seen:
                        return
                    seen.add((r, c))
                    explore(r + 1, c)
                    explore(r - 1, c)
                    explore(r, c + 1)
                    explore(r, c - 1)

                count = 0
                for r, line in enumerate(cavern):
                    for c, square in enumerate(line):
                        if square == "#" and (r, c) not in seen:
                            count += 1
                            explore(r, c)
                return count
          `,
          py`
            from collections import deque

            def count_islands(cavern):
                grid = [list(line) for line in cavern]     # our own copy to mark on
                islands = 0
                for r in range(len(grid)):
                    for c in range(len(grid[r])):
                        if grid[r][c] == "#":
                            islands += 1
                            grid[r][c] = "~"               # sink it, so it's never counted twice
                            queue = deque([(r, c)])
                            while queue:
                                y, x = queue.popleft()
                                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                                    if 0 <= ny < len(grid) and 0 <= nx < len(grid[ny]) and grid[ny][nx] == "#":
                                        grid[ny][nx] = "~"
                                        queue.append((ny, nx))
                return islands
          `
        ],
        wrongSolutions: [
          py`
            def count_islands(cavern):
                # Shortcut: count rock with no rock above it or to its left. Fails for twisting islands.
                islands = 0
                for r, line in enumerate(cavern):
                    for c, square in enumerate(line):
                        if square == "#":
                            up = r > 0 and cavern[r - 1][c] == "#"
                            left = c > 0 and line[c - 1] == "#"
                            if not up and not left:
                                islands += 1
                return islands
          `,
          py`
            def count_islands(cavern):
                if not cavern:
                    return 0
                rows, cols = len(cavern), len(cavern[0])
                seen, islands = set(), 0
                for row in range(rows):
                    for col in range(cols):
                        if cavern[row][col] == "#" and (row, col) not in seen:
                            islands += 1
                            seen.add((row, col))
                            stack = [(row, col)]
                            while stack:
                                r, c = stack.pop()
                                for dr in (-1, 0, 1):              # 8 directions: diagonals too
                                    for dc in (-1, 0, 1):
                                        nr, nc = r + dr, c + dc
                                        if 0 <= nr < rows and 0 <= nc < cols and cavern[nr][nc] == "#" and (nr, nc) not in seen:
                                            seen.add((nr, nc))
                                            stack.append((nr, nc))
                return islands
          `,
          py`
            def count_islands(cavern):
                if not cavern:
                    return 0
                rows, cols = len(cavern), len(cavern[0])
                seen, islands = set(), 0
                for row in range(rows):
                    for col in range(cols):
                        if cavern[row][col] == "#" and (row, col) not in seen:
                            islands += 1
                            seen.add((row, col))
                            stack = [(row, col)]
                            while stack:
                                r, c = stack.pop()
                                for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                                    if nr < rows and nc < cols and cavern[nr][nc] == "#" and (nr, nc) not in seen:   # no 0 <= check
                                        seen.add((nr, nc))
                                        stack.append((nr, nc))
                return islands
          `
        ],
        tests: py`
          _EDGES = ("in Python " + code("cavern[-1]") + " is the LAST row and " + code("row[-1]") + " the last square, so stepping "
                    + "off the top or left edge silently wraps around to the other side. Check " + code("0 <= row") + " and "
                    + code("0 <= col") + " before you look at a square.")
          _TOO_MANY = ("That's too many: an island was counted more than once. When you find a new island, flood ALL of it (every "
                       + "rock square joined to it up, down, left or right, however it twists) and mark those squares as seen.")
          _TOO_FEW = ("That's too few: separate islands were counted as one. Only squares touching up, down, left or right are "
                      + "joined (diagonal neighbours are not), and the map doesn't wrap around: " + _EDGES)

          def _islands(cavern):
              """The trials' own answer, to check the big map."""
              seen, count = set(), 0
              for r in range(len(cavern)):
                  for c in range(len(cavern[r])):
                      if cavern[r][c] == "#" and (r, c) not in seen:
                          count += 1
                          seen.add((r, c))
                          stack = [(r, c)]
                          while stack:
                              y, x = stack.pop()
                              for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                                  if 0 <= ny < len(cavern) and 0 <= nx < len(cavern[ny]) and cavern[ny][nx] == "#" and (ny, nx) not in seen:
                                      seen.add((ny, nx))
                                      stack.append((ny, nx))
              return count

          def _count(cavern, expected, label=None):
              count_islands = need_function("count_islands", 1)
              given = list(cavern)
              squares = sum(len(row) for row in cavern)
              limit = 400 * squares + 5000
              call = label or code("count_islands(" + short(given, 80) + ")")
              try:
                  with step_limit(limit, "Your spell took more than " + format(limit, ",") + " steps on a map of only "
                               + format(squares, ",") + " squares without finishing. It seems to explore the same squares again "
                               + "and again. Add each square to your " + code("seen") + " set the moment you reach it, and never "
                               + "explore a seen square again."):
                      result = count_islands(cavern)
              except IndexError:
                  if not cavern:
                      fail(code("count_islands([])") + " crashed: a map with no rows has no " + code("cavern[0]") + ". Return 0 "
                           + "straight away for an empty map.")
                  raise
              except RecursionError:
                  fail(call + " never stopped calling itself (RecursionError). Without marking squares as seen, a flood steps back "
                       + "and forth between two rock squares forever. Add each square to " + code("seen") + " before you explore "
                       + "its neighbours, and skip squares that are already in it.")
              expect(cavern == given, code("count_islands") + " changed the map it was given, and it's the only map of the "
                     + "caverns! Keep track of explored squares in your own set (or your own copy of the map).")
              if result is None:
                  fail(call + " returned None. Count the islands and " + code("return") + " the count.")
              expect(isinstance(result, int) and not isinstance(result, bool), call + " should return a whole number, but it "
                     + "returned " + short(result) + ".")
              if result != expected:
                  if result == 0:
                      hint = ("Whenever you meet a rock square that isn't in your " + code("seen") + " set yet, you have found a new "
                              + "island: count it.")
                  elif result > expected:
                      hint = _TOO_MANY
                  else:
                      hint = _TOO_FEW
                  fail(call + " should return " + str(expected) + ", but it returned " + str(result) + ". " + hint)


          @test("The example cavern has 5 islands")
          def _():
              _count(["##~~#", "#~~##", "~~#~~", "~#~~#"], 5)


          @test("No rock means no islands, and a single rock is one island")
          def _():
              _count([], 0)
              _count(["~~~"], 0)
              _count(["~", "~"], 0)
              _count(["#"], 1)
              _count(["####"], 1)


          @test("Diagonal squares don't connect")
          def _():
              _count(["#~#", "~#~", "#~#"], 5)
              _count(["#~", "~#"], 2)


          @test("Twisting islands count once: a U, a comb, a spiral, and an islet in a lake")
          def _():
              _count(["#~#", "#~#", "###"], 1)
              _count(["#~#~#", "#~#~#", "#####"], 1)
              _count(["#######", "~~~~~~#", "#####~#", "#~~~#~#", "#~###~#", "#~~~~~#", "#######"], 1)
              _count(["#####", "#~~~#", "#~#~#", "#~~~#", "#####"], 2)


          @test("Islands at opposite edges stay separate: no wrapping around")
          def _():
              _count(["#~#~~", "~~~~~", "###~~"], 3)
              _count(["#~~#", "~~~~", "#~~#"], 4)


          @test("A big flooded cavern of 30 × 40 squares")
          def _():
              seed, cavern = 2026, []
              for r in range(30):
                  line = ""
                  for c in range(40):
                      seed = (seed * 1103515245 + 12345) % 2147483648
                      line += "#" if (seed >> 16) % 100 < 45 else "~"
                  cavern.append(line)
              _count(cavern, _islands(cavern), label=code("count_islands(big_cavern_30x40)"))
        `,
        scene: { icon: "🌊", successIcon: "🏝️", successText: "A warm lantern glows on every island, and not a single explorer is stranded.", effect: "bubble" }
      },

      // ------------------------------------------------------------------
      // 9. BFS shortest path (the chapter finale)
      // ------------------------------------------------------------------
      {
        id: "labyrinth-way-out",
        title: "The Way Out",
        difficulty: "hard",
        concepts: ["breadth-first search", "queues", "shortest paths", "grids"],
        story: [
          "The final maze of the Labyrinth — and Glitch's giggle echoing from the exit! But the passages twist and branch, and every wrong turn costs time.",
          "\"Don't wander,\" says Ada. \"Search like a ripple on a pond: first every square one step away, then every square two steps away, and so on. The first ripple to touch the exit has found the shortest way. Quickly now!\""
        ],
        task: [
          "Write `shortest_path(maze)`. The maze is a list of strings, all the same length: `S` is the start, `E` the exit, `.` open floor and `#` wall. There is exactly one `S` and one `E`.",
          "Each step moves one square up, down, left or right — never diagonally, through a wall, or off the map. **Return** the smallest number of steps from `S` to `E`, or `-1` if the exit can't be reached.",
          { code: py`
            maze = [
                "S.#.....",
                ".##.###.",
                "....#E..",
                ".##...#.",
            ]
            shortest_path(maze)   # → 9
          ` },
          "Don't change the maze you were given. The trials stop any spell that does far more work than it needs to — for example, one that tries every possible route."
        ],
        lesson: [
          "A depth-first search dives down one path as far as it can go. That's fine for exploring, but the first path it finds may be long and winding. **Breadth-first search (BFS)** explores in rings instead: first every square 1 step from the start, then every square 2 steps away, and so on, like ripples spreading on a pond.",
          { diagram: py`
            maze        steps from S
            S . . #     0 1 2 #
            . # . .     1 # 3 4
            . . . #     2 3 4 #
          ` },
          "The secret ingredient is a **queue**. Squares leave the queue in the order they joined, so every 1-step square is explored before any 2-step square. The first time BFS reaches a square, it has found the shortest way there, so each square is visited only once and BFS takes **O(rows × cols)** time. Here BFS counts the tunnels from the Gate to every room:",
          { code: py`
            from collections import deque

            tunnels = {
                "Gate": ["Hall", "Well"],
                "Hall": ["Gate", "Crypt"],
                "Well": ["Gate", "Crypt", "Vault"],
                "Crypt": ["Hall", "Well"],
                "Vault": ["Well"],
            }
            distance = {"Gate": 0}   # room -> tunnels away
            queue = deque(["Gate"])
            while queue:
                room = queue.popleft()        # oldest first
                for nxt in tunnels[room]:
                    if nxt not in distance:   # first visit
                        distance[nxt] = distance[room] + 1
                        queue.append(nxt)
            print(distance)
          `, output: "{'Gate': 0, 'Hall': 1, 'Well': 1, 'Crypt': 2, 'Vault': 2}" },
          "A grid is a graph whose neighbours you work out as you go, with the same four directions and edge checks as in the Flooded Caverns.",
          { warning: "Trying every possible route and keeping the best is hopeless: an open 10 × 10 room has billions of billions of routes. And mark a square as seen when you *add* it to the queue, not when you take it out, or it may be queued again and again." }
        ],
        starter: py`
          from collections import deque

          def shortest_path(maze):
              """Return the fewest steps from S to E, or -1 if E can't be reached."""
              # 1. Find the start square S.
              # 2. Breadth-first search: a deque of (row, col, steps) and a set of seen squares.
              # 3. Return the steps when you reach E, or -1 if the queue runs dry.
              return -1
        `,
        hints: [
          "First find the start: loop over the rows and columns until you see `S`. Then search outward from it with a `deque`, just like the rooms example, using squares `(row, col)` instead of room names.",
          "Put `(row, col, 0)` for the start into the deque and `(row, col)` into a `seen` set. Repeatedly `popleft()` a square: if it's `E`, return its steps. Otherwise, for each of the four neighbours that is on the map, not a wall and not seen: mark it seen and `append` it with `steps + 1`. If the queue runs dry, return `-1`.",
          "The neighbour test: `if 0 <= r < len(maze) and 0 <= c < len(maze[0]) and maze[r][c] != \"#\" and (r, c) not in seen:`. Testing `!= \"#\"` means that both `.` and `E` count as floor."
        ],
        solution: py`
          from collections import deque

          def shortest_path(maze):
              """Return the fewest steps from S to E, or -1 if E can't be reached."""
              rows, cols = len(maze), len(maze[0])
              for r in range(rows):
                  for c in range(cols):
                      if maze[r][c] == "S":
                          start = (r, c)

              queue = deque([(start[0], start[1], 0)])   # (row, col, steps from S)
              seen = {start}
              while queue:
                  r, c, steps = queue.popleft()          # the nearest squares come out first
                  if maze[r][c] == "E":
                      return steps
                  for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                      nr, nc = r + dr, c + dc
                      if (0 <= nr < rows and 0 <= nc < cols
                              and maze[nr][nc] != "#" and (nr, nc) not in seen):
                          seen.add((nr, nc))             # mark when queued, so it's queued only once
                          queue.append((nr, nc, steps + 1))
              return -1                                  # everything reachable explored: no E
        `,
        altSolutions: [
          py`
            def shortest_path(maze):
                # Ring by ring with sets: frontier = every square exactly 'steps' away.
                floor = {(r, c) for r, row in enumerate(maze) for c, ch in enumerate(row) if ch != "#"}
                start = [(r, c) for r, row in enumerate(maze) for c, ch in enumerate(row) if ch == "S"][0]
                goal = [(r, c) for r, row in enumerate(maze) for c, ch in enumerate(row) if ch == "E"][0]
                frontier, seen, steps = {start}, {start}, 0
                while frontier:
                    if goal in frontier:
                        return steps
                    next_ring = set()
                    for r, c in frontier:
                        for square in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                            if square in floor and square not in seen:
                                seen.add(square)
                                next_ring.add(square)
                    frontier, steps = next_ring, steps + 1
                return -1
          `,
          py`
            from collections import deque

            def shortest_path(maze):
                height, width = len(maze), len(maze[0])
                start = None
                for r, row in enumerate(maze):
                    if "S" in row:
                        start = (r, row.index("S"))
                dist = {start: 0}
                queue = deque([start])
                while queue:
                    r, c = queue.popleft()
                    if maze[r][c] == "E":
                        return dist[(r, c)]
                    for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                        if 0 <= nr < height and 0 <= nc < width and maze[nr][nc] != "#" and (nr, nc) not in dist:
                            dist[(nr, nc)] = dist[(r, c)] + 1
                            queue.append((nr, nc))
                return -1
          `
        ],
        wrongSolutions: [
          py`
            def shortest_path(maze):
                # Depth-first with a stack: finds A way out, not the shortest one.
                rows, cols = len(maze), len(maze[0])
                start = [(r, c) for r in range(rows) for c in range(cols) if maze[r][c] == "S"][0]
                stack = [(start[0], start[1], 0)]
                seen = {start}
                while stack:
                    r, c, steps = stack.pop()
                    if maze[r][c] == "E":
                        return steps
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] != "#" and (nr, nc) not in seen:
                            seen.add((nr, nc))
                            stack.append((nr, nc, steps + 1))
                return -1
          `,
          py`
            from collections import deque

            def shortest_path(maze):
                rows, cols = len(maze), len(maze[0])
                start = [(r, c) for r in range(rows) for c in range(cols) if maze[r][c] == "S"][0]
                queue = deque([(start[0], start[1], 0)])
                seen = {start}
                while queue:
                    r, c, steps = queue.popleft()
                    if maze[r][c] == "E":
                        return steps
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        if nr < rows and nc < cols and maze[nr][nc] != "#" and (nr, nc) not in seen:   # no 0 <= check
                            seen.add((nr, nc))
                            queue.append((nr, nc, steps + 1))
                return -1
          `,
          py`
            from collections import deque

            def shortest_path(maze):
                rows, cols = len(maze), len(maze[0])
                start = [(r, c) for r in range(rows) for c in range(cols) if maze[r][c] == "S"][0]
                queue = deque([(start[0], start[1], 1)])      # counts squares, not steps
                seen = {start}
                while queue:
                    r, c, steps = queue.popleft()
                    if maze[r][c] == "E":
                        return steps
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] != "#" and (nr, nc) not in seen:
                            seen.add((nr, nc))
                            queue.append((nr, nc, steps + 1))
                return -1
          `
        ],
        tests: py`
          from collections import deque as _deque

          def _bfs(maze):
              """The trials' own answer, to check the big mazes."""
              rows, cols = len(maze), len(maze[0])
              start = [(r, c) for r in range(rows) for c in range(cols) if maze[r][c] == "S"][0]
              queue, seen = _deque([(start, 0)]), {start}
              while queue:
                  (r, c), steps = queue.popleft()
                  if maze[r][c] == "E":
                      return steps
                  for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                      if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] != "#" and (nr, nc) not in seen:
                          seen.add((nr, nc))
                          queue.append(((nr, nc), steps + 1))
              return -1

          def _hint(expected, result):
              if expected == -1:
                  if result < 0:
                      return "Return exactly -1 when the exit can't be reached."
                  return ("There's no way to reach E in this maze, so the answer is -1. Did your search walk through a wall, step "
                          + "diagonally, or wrap around an edge of the map?")
              if result == -1:
                  return ("E can be reached in this maze! Make sure E counts as floor (test " + code("!= '#'") + "), and that you "
                          + "check every square you take out of the queue.")
              if result == expected + 1:
                  return "Count moves, not squares: standing on S is 0 steps, so a square next to S is 1 step away."
              if result > expected:
                  return ("There is a shorter route! Explore in rings with a queue (" + code("popleft()") + "): then the first time "
                          + "you reach E is guaranteed to be the shortest way.")
              return ("That's shorter than any real route! Moves go only up, down, left or right, never through walls or "
                      + "diagonally, and the maze doesn't wrap around: in Python " + code("maze[-1]") + " is the LAST row and "
                      + code("row[-1]") + " the last square, so check " + code("0 <= row") + " and " + code("0 <= col")
                      + " before you look at a square.")

          def _steps(maze, expected, label=None, about=""):
              shortest_path = need_function("shortest_path", 1)
              given = list(maze)
              squares = sum(len(row) for row in maze)
              limit = 300 * squares + 5000
              call = label or code("shortest_path(" + short(given, 80) + ")")
              try:
                  with step_limit(limit, "Your spell took more than " + format(limit, ",") + " steps on a maze of only "
                               + format(squares, ",") + " squares without finishing. It seems to explore the same squares again "
                               + "and again, or to try every possible route. Keep a set of seen squares: add each square the moment "
                               + "you queue it, and never queue a seen square again."):
                      result = shortest_path(maze)
              except RecursionError:
                  fail(call + " went too many calls deep (RecursionError). A recursive search that follows long paths, "
                       + "or tries every possible route, runs into Python's recursion limit in a big maze. Breadth-first search needs "
                       + "no recursion at all: use a " + code("deque") + " and a " + code("seen") + " set.")
              expect(maze == given, code("shortest_path") + " changed the maze it was given. Keep track of visited squares in "
                     + "your own set instead.")
              if result is None:
                  fail(call + " returned None. " + ("When the exit can't be reached, return -1." if expected == -1
                                                    else "Return the number of steps."))
              expect(isinstance(result, int) and not isinstance(result, bool), call + " should return a whole number of "
                     + "steps, but it returned " + short(result) + ".")
              if result != expected:
                  fail(call + " should return " + str(expected) + ", but it returned " + str(result) + ". "
                       + (about + " " if about else "") + _hint(expected, result))


          @test("The example maze takes 9 steps")
          def _():
              _steps(["S.#.....", ".##.###.", "....#E..", ".##...#."], 9)


          @test("Tiny mazes: 'SE' is 1 step, a straight corridor is 5, and S can be anywhere")
          def _():
              _steps(["SE"], 1)
              _steps(["S", "E"], 1)
              _steps(["S....E"], 5)
              _steps(["E", ".", "S"], 2)
              _steps(["#E#", "#.#", "#S#"], 2)
              _steps(["..E", ".#.", "S.."], 4)


          @test("An unreachable exit gives -1")
          def _():
              _steps(["S#E"], -1)
              _steps(["S..", "###", "..E"], -1)
              _steps([".....", ".###.", "S#E#.", ".###.", "....."], -1)


          @test("Takes the shortest of several routes")
          def _():
              _steps(["S.....", ".####.", ".####.", "E....."], 3)
              _steps(["S...E", ".###.", ".#...", ".#.#.", "....."], 4)


          @test("Only up, down, left and right: no diagonals and no wrapping around the edges")
          def _():
              _steps(["S.", "#E"], 2)
              _steps(["S#E", ".#.", "..."], 6)
              _steps(["S..", "###", "E.."], -1)


          @test("Big 40 × 40 halls are crossed quickly")
          def _():
              hall = ["".join("#" if r % 4 == 2 and c % 4 == 2 else "." for c in range(40)) for r in range(40)]
              hall[0] = "S" + hall[0][1:]
              hall[39] = hall[39][:39] + "E"
              _steps(hall, _bfs(hall), code("shortest_path(pillar_hall)"),
                     "(pillar_hall is a 40 × 40 hall with S in the top-left corner, E in the bottom-right, and a pillar every few squares.)")
              tunnel = []
              for r in range(40):
                  if r % 2 == 0:
                      tunnel.append("." * 40)
                  elif r % 4 == 1:
                      tunnel.append("#" * 39 + ".")
                  else:
                      tunnel.append("." + "#" * 39)
              tunnel[0] = "S" + tunnel[0][1:]
              tunnel[39] = tunnel[39][:39] + "E"
              _steps(tunnel, _bfs(tunnel), code("shortest_path(winding_tunnel)"),
                     "(winding_tunnel is a 40 × 40 maze: one long corridor that zig-zags from S at the top to E at the bottom.)")
              sealed = list(hall)
              sealed[38] = sealed[38][:38] + "##"
              sealed[39] = sealed[39][:38] + "#E"
              _steps(sealed, -1, code("shortest_path(sealed_hall)"),
                     "(sealed_hall is the pillar hall again, but with walls all around the exit.)")
        `,
        scene: { icon: "🧭", successIcon: "🌟", successText: "Glowing moss blooms along the shortest path, and you dash for the exit after Glitch!", effect: "bloom" }
      }
    ]
  });
})();
