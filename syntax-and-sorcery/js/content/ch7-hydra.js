/*
 * Chapter 7 — The Hydra's Lair (hard): the finale.
 * Concepts: dynamic programming — memoization (dict memo, functools.lru_cache),
 * tabulation, 1-D DP (Fibonacci, stairs, coins), 2-D DP (grid paths, LCS,
 * knapsack, edit distance) and rebuilding an answer (word break).
 *
 * Efficiency is enforced in two layers (see LAIR_TRIALS below):
 *   1. count_calls() on the function the task names — catches the classic naive
 *      recursion, which calls itself through that name;
 *   2. hydra_watch(), a trial-side call budget built on sys.setprofile that counts
 *      calls to EVERY function the spell defines — catches naive helpers nested
 *      inside the named function, which count_calls cannot see.
 * Correct memoized/bottom-up spells stay far below both limits. Big inputs keep
 * top-down recursion under ~120 levels deep: deep lru_cache recursion can overflow
 * the browser's JavaScript stack long before Python's recursion limit.
 */
(function () {
  "use strict";
  var py = SS.py;

  // Trial helpers shared by every challenge in this chapter (prepended to each `tests`).
  var LAIR_TRIALS = py`
    import sys as _sys
    import contextlib as _contextlib

    _SPELL_FILE = "<spell>"   # the harness compiles every spell under this file name
    _CO_GENERATOR = 0x20      # generator frames resume many times: count real calls only


    @_contextlib.contextmanager
    def hydra_watch(budget=200000):
        """Fail the trial once the spell has made more than budget calls to functions it
        defines. Unlike count_calls, this also sees helpers nested inside other functions."""
        state = {"calls": 0}
        warning = ("The Hydra grew too many heads! Your spell made more than " + format(budget, ",")
                   + " function calls during this trial (helper functions count too), so it is "
                   "solving the same smaller problems again and again. Remember each answer the "
                   "first time you find it, or fill a table from the smallest case up.")

        def watcher(frame, event, arg):
            if event == "call":
                co = frame.f_code
                if co.co_filename == _SPELL_FILE and not co.co_flags & _CO_GENERATOR:
                    state["calls"] += 1
                    if state["calls"] > budget:
                        _sys.setprofile(None)
                        raise SpellFailure(warning)

        previous = _sys.getprofile()
        _sys.setprofile(watcher)
        try:
            yield state
        finally:
            _sys.setprofile(previous)


    @_contextlib.contextmanager
    def without_waking_the_hydra(name, limit, budget=200000):
        """count_calls on the named function, plus hydra_watch on every function."""
        message = ("The Hydra grew too many heads! " + code(name) + " was called more than "
                   + format(limit, ",") + " times during this trial, so it is solving the same "
                   "smaller problems again and again. Remember each answer the first time you find "
                   "it (a memo dictionary or " + code("@lru_cache") + "), or fill a table from the "
                   "smallest case up.")
        with hydra_watch(budget):
            with count_calls(name, limit=limit, message=message) as calls:
                yield calls


    import traceback as _traceback


    def call_spell(name, params, *args):
        """Call the spell's function name(*args). If @lru_cache rejects a list argument before
        the spell's own code even runs, explain that instead of letting the trial crash."""
        func = need_function(name, params)
        try:
            return func(*args)
        except TypeError as exc:
            frames = _traceback.extract_tb(exc.__traceback__)
            if "unhashable" in str(exc) and not any(f.filename == _SPELL_FILE for f in frames):
                fail(code(name) + " couldn't even start: " + code("@lru_cache") + " can only remember "
                     "calls whose arguments are hashable, and a list is not (TypeError: " + str(exc)
                     + "). Memoize a helper function that takes only numbers, or turn the list into "
                     "a tuple before calling a cached function.")
            raise


    def shared_memo_note():
        """Extra advice for spells that keep a memo between calls (a global or default dict)."""
        for key, value in list(spell.items()):
            if key.startswith("__"):
                continue
            if isinstance(value, dict) and value:
                return (" Your spell keeps a dictionary " + code(key) + " outside the function: is "
                        "it remembering answers that belong to a different call?")
            try:
                defaults = tuple(getattr(value, "__defaults__", None) or ())
            except Exception:
                defaults = ()
            if any(isinstance(d, dict) and d for d in defaults):
                return (" " + code(key) + " keeps a dictionary as a default argument, which every "
                        "call shares: is it remembering answers that belong to a different call?")
        return ""


    def note_when(result, want, note, when="wrong"):
        """Return note when the whole number result misses want in the given direction:
        "wrong" (any miss), "higher" (too big) or "lower" (too small, but not 0)."""
        if not note or isinstance(result, bool) or not isinstance(result, int) or result == want:
            return ""
        if when == "higher" and result < want:
            return ""
        if when == "lower" and not 0 < result < want:
            return ""
        return note


    def expect_number(result, expected, call, note=""):
        """The spell must return the whole number expected for call (shown as code)."""
        if result is None:
            fail(code(call) + " returned " + code("None") + ". Make sure your function uses "
                 + code("return") + " to hand back its answer (printing it isn't enough).")
        if isinstance(result, bool) or not isinstance(result, int):
            fail(code(call) + " should return a whole number, but it returned " + short(result)
                 + " (" + type(result).__name__ + ").")
        if result != expected:
            fail(code(call) + " should be " + str(expected) + ", but your spell returned "
                 + str(result) + "." + note)
  `;

  SS.defineChapter({
    id: "hydra",
    order: 7,
    title: "The Hydra's Lair",
    subtitle: "Remember every head",
    icon: "🐉",
    concepts: ["memoization", "functools.lru_cache", "tabulation", "1-D DP", "2-D DP", "rebuilding answers"],
    intro: [
      "Far beneath the Labyrinth of Echoes, the floor trembles. Glitch has woken **the Hydra of Overlapping Subproblems** — and whenever a careless spell cuts off one of its heads, two more grow back.",
      "Archmage Ada rolls up her sleeves. \"Brute force only feeds it. We win by *remembering*: face each head once, write down the answer, and never fight it twice. That, apprentice, is **dynamic programming**.\"",
      { tip: "The trials in this lair count how often your functions are called. Spells that remember their answers pass easily; spells that keep recomputing them are stopped, with a warning, before the Hydra grows too many heads." }
    ],
    outro: [
      "The last head sinks to the floor and, to everyone's surprise, begins to purr. Tamed at last, the Hydra curls around your feet like an enormous, scaly cat. It was never truly wicked — just dreadfully repetitive.",
      "You beat it the way great algorithms do: name the subproblem, find the recurrence, settle the base cases, and remember every answer.",
      "From behind a stalagmite comes a small, guilty squeak. Ada smiles. \"Back to the tower, apprentice. Someone there wants to apologise, and I've been saving a ceremony just for you.\""
    ],
    challenges: [
      // ------------------------------------------------------------------ 1
      {
        id: "hydra-heads",
        title: "The Hydra's Heads",
        difficulty: "hard",
        concepts: ["memoization", "functools.lru_cache", "call trees"],
        story: [
          "The first head rears up, hissing numbers: *0, 1, 1, 2, 3, 5, 8…* \"Name my ninetieth!\" it roars.",
          "\"The apprentices' old Fibonacci spell is correct,\" Ada murmurs, \"but every cut makes it fight the same smaller heads again and again. Teach it to *remember*, and the Hydra has nothing left to grow.\""
        ],
        task: [
          "The starter spell `fib(n)` is correct but hopelessly slow. Make it fast: `fib(n)` must **return** the `n`-th Fibonacci number for any `n` from 0 up to 100.",
          "`fib(0)` is 0, `fib(1)` is 1, and every later number is the sum of the two before it: `fib(n) = fib(n - 1) + fib(n - 2)`.",
          { code: py`
            print(fib(10))
            print(fib(90))
          `, output: "55\n2880067194370816120" },
          "The trials count how many times `fib` is called. `fib(90)` should need a few hundred calls at most — not quintillions."
        ],
        lesson: [
          "Why is the old spell so slow? `fib(5)` calls `fib(4)` and `fib(3)`, but `fib(4)` calls `fib(3)` *again*, and so on all the way down. Drawn as a tree, the same heads keep reappearing:",
          { output: [
            "fib(5)",
            "├── fib(4)",
            "│   ├── fib(3)",
            "│   │   ├── fib(2)",
            "│   │   │   ├── fib(1)",
            "│   │   │   └── fib(0)",
            "│   │   └── fib(1)",
            "│   └── fib(2)          ← again!",
            "│       ├── fib(1)",
            "│       └── fib(0)",
            "└── fib(3)              ← again!",
            "    ├── fib(2)          ← and again!",
            "    │   ├── fib(1)",
            "    │   └── fib(0)",
            "    └── fib(1)"
          ].join("\n") },
          "That's 15 calls just for `fib(5)`, and each step up multiplies the work by about 1.6. `fib(30)` makes 2,692,537 calls; `fib(90)` would make about 9 quintillion — thousands of years of spellcasting.",
          "The cure is **memoization**: the first time you work out an answer, store it; when the same question comes up again, look the answer up instead. A dictionary makes a perfect memo. Here it tames a different beast, the *Tribonacci* numbers, where each number is the sum of the three before it:",
          { code: py`
            memo = {}                       # answers found so far

            def trib(n):
                if n in memo:               # seen this head before? answer at once
                    return memo[n]
                if n < 2:
                    answer = 0
                elif n == 2:
                    answer = 1
                else:
                    answer = trib(n - 1) + trib(n - 2) + trib(n - 3)
                memo[n] = answer            # remember it for next time
                return answer

            print(trib(30))
          `, output: "15902591" },
          "Python can even do the remembering for you. Put the decorator `@lru_cache(maxsize=None)` from the `functools` module on the line above a function, and every result is stored automatically (`@cache` does the same):",
          { code: py`
            from functools import lru_cache

            @lru_cache(maxsize=None)        # remember every result trib returns
            def trib(n):
                if n < 2:
                    return 0
                if n == 2:
                    return 1
                return trib(n - 1) + trib(n - 2) + trib(n - 3)
          ` },
          { tip: "With a memo, each head is fought only once, so `fib(90)` needs fewer than 200 calls. Another cure skips recursion altogether: build the numbers up in a loop, starting from the smallest." }
        ],
        starter: py`
          # The apprentices' old spell. It is correct, but every call fights the
          # same smaller heads again and again. Teach it to remember!

          def fib(n):
              if n < 2:
                  return n
              return fib(n - 1) + fib(n - 2)


          print(fib(10))
        `,
        hints: [
          "The slow spell asks for the same `fib(k)` over and over. What if it wrote each answer down the first time it found it?",
          "Create a dictionary `memo = {}` *outside* the function. At the start of `fib`, if `n` is already in `memo`, return `memo[n]`. Otherwise work out the answer, store it in `memo[n]`, then return it. (Or put `@lru_cache(maxsize=None)` on the line above `def fib`, after `from functools import lru_cache`.)",
          [
            "Very close now — fill in the recurrence:",
            { code: py`
              memo = {}

              def fib(n):
                  if n in memo:
                      return memo[n]
                  if n < 2:
                      answer = n
                  else:
                      answer = ...    # the two smaller heads, added together
                  memo[n] = answer
                  return answer
            ` }
          ]
        ],
        solution: py`
          from functools import lru_cache


          @lru_cache(maxsize=None)        # remember every answer fib has already found
          def fib(n):
              if n < 2:                   # base cases: fib(0) = 0 and fib(1) = 1
                  return n
              return fib(n - 1) + fib(n - 2)


          print(fib(10))
          print(fib(90))
        `,
        altSolutions: [
          py`
            memo = {0: 0, 1: 1}

            def fib(n):
                if n not in memo:
                    memo[n] = fib(n - 1) + fib(n - 2)
                return memo[n]
          `,
          py`
            def fib(n):
                a, b = 0, 1             # fib(0), fib(1)
                for _ in range(n):
                    a, b = b, a + b
                return a
          `,
          py`
            def fib(n, memo=None):
                if memo is None:
                    memo = {}
                if n < 2:
                    return n
                if n not in memo:
                    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
                return memo[n]
          `,
          py`
            from functools import cache

            @cache
            def fib(n):
                return n if n < 2 else fib(n - 1) + fib(n - 2)
          `,
          py`
            def fib(n):
                table = [0, 1] + [0] * n
                for i in range(2, n + 1):
                    table[i] = table[i - 1] + table[i - 2]
                return table[n]
          `
        ],
        wrongSolutions: [
          // The memo is created afresh inside every call, so it never remembers anything.
          py`
            def fib(n):
                memo = {}
                if n in memo:
                    return memo[n]
                if n < 2:
                    return n
                memo[n] = fib(n - 1) + fib(n - 2)
                return memo[n]
          `,
          // A naive helper hidden inside fib: count_calls can't see it, hydra_watch can.
          py`
            def fib(n):
                def heads(k):
                    if k < 2:
                        return k
                    return heads(k - 1) + heads(k - 2)
                return heads(n)
          `,
          // Off by one: returns fib(n + 1).
          py`
            def fib(n):
                a, b = 0, 1
                for _ in range(n):
                    a, b = b, a + b
                return b
          `
        ],
        tests: LAIR_TRIALS + py`
          @test("fib(0) is 0 and fib(1) is 1")
          def _():
              fib = need_function("fib", 1)
              expect_number(fib(0), 0, "fib(0)")
              expect_number(fib(1), 1, "fib(1)")


          @test("fib(2) to fib(12) are 1, 2, 3, 5, 8, …, 144")
          def _():
              fib = need_function("fib", 1)
              expected = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]
              for n, want in zip(range(2, 13), expected):
                  expect_number(fib(n), want, "fib(" + str(n) + ")")


          @test("fib(30) is 832040, without waking the Hydra")
          def _():
              need_function("fib", 1)
              with without_waking_the_hydra("fib", 200, budget=20000):
                  result = need_function("fib")(30)
              expect_number(result, 832040, "fib(30)")


          @test("fib(90) and fib(100) are right, and still quick")
          def _():
              need_function("fib", 1)
              with without_waking_the_hydra("fib", 500, budget=20000):
                  result = need_function("fib")(90)
              expect_number(result, 2880067194370816120, "fib(90)")
              with without_waking_the_hydra("fib", 500, budget=20000):
                  result = need_function("fib")(100)
              expect_number(result, 354224848179261915075, "fib(100)")
        `,
        scene: { icon: "🐉", successIcon: "🧠", successText: "The first head freezes mid-roar: you already know every answer it can ask!", effect: "shake" }
      },

      // ------------------------------------------------------------------ 2
      {
        id: "hydra-stairway",
        title: "The Stairway of Many Ways",
        difficulty: "hard",
        concepts: ["the DP recipe", "recurrences", "bottom-up tables"],
        story: [
          "A spiral stairway rises from the cavern floor to the Hydra's nest. The second head coils around the top step and hisses a riddle: \"In how many different ways can you climb to me?\"",
          "\"Don't try every climb,\" Ada advises. \"Count the ways to reach each step from the steps just below it. Small answers build big ones — precisely.\""
        ],
        task: [
          "Write `count_ways(n, strides)` that **returns** how many different ways there are to climb exactly `n` steps, where every stride covers one of the step counts in the list `strides` (for example `[1, 2]`).",
          "Order matters: a stride of 1 then 2 is a different way from 2 then 1.",
          { code: py`
            print(count_ways(4, [1, 2]))     # 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2
            print(count_ways(7, [2, 3]))     # 2+2+3, 2+3+2, 3+2+2
            print(count_ways(5, [2, 4]))     # you can't land exactly on step 5
          `, output: "5\n3\n0" },
          "Climbing 0 steps counts as exactly 1 way (you're already there). Strides are positive whole numbers, and `n` can be as large as 100."
        ],
        lesson: [
          "**Dynamic programming** (DP) is a recipe for problems made of smaller copies of themselves. Here it is, worked on the classic stairs where every stride is 1 or 2 steps:",
          { steps: [
            "**Name the subproblem** in words: *ways(k)* is the number of ways to climb exactly *k* steps.",
            "**Find the recurrence** by looking at the *last* stride. A climb of 6 steps ends with a stride of 1 (after climbing 5 steps) or a stride of 2 (after climbing 4), so *ways(6) = ways(5) + ways(4)*.",
            "**Settle the base cases**: *ways(0) = 1* (the empty climb), and you can't climb a negative number of steps.",
            "**Choose an order**: each answer needs only smaller ones, so compute them from 0 upwards (*bottom-up*), or recurse from the top and memoize (*top-down*)."
          ] },
          "Written out as a table, every entry comes from entries already filled in to its left:",
          { output: "k          0  1  2  3  4  5  6\nways(k)    1  1  2  3  5  8 13" },
          "Bottom-up code fills a list from the base cases upward. Here is the Tribonacci spell from the last scroll, built as a table instead of a memo:",
          { code: py`
            def trib(n):
                table = [0] * (n + 3)         # a slot for every answer (and spares for small n)
                table[2] = 1                  # base cases: trib(0) = trib(1) = 0, trib(2) = 1
                for k in range(3, n + 1):     # smallest first, so the answers k needs are ready
                    table[k] = table[k - 1] + table[k - 2] + table[k - 3]
                return table[n]

            print([trib(k) for k in range(8)])
          `, output: "[0, 0, 1, 1, 2, 4, 7, 13]" },
          { warning: "`@lru_cache` can only remember calls whose arguments are hashable, and a list is not: decorating `count_ways(n, strides)` raises `TypeError: unhashable type: 'list'`. Memoize a helper that takes only the step number, or build a table. And a memo dictionary kept *outside* the function belongs to one particular list of strides!" }
        ],
        starter: py`
          def count_ways(n, strides):
              # ways[k] will hold the number of ways to climb exactly k steps.
              ways = [0] * (n + 1)
              # 1. Base case: how many ways are there to climb 0 steps?
              # 2. Fill in ways[1], ways[2], ..., ways[n] in order, using smaller answers.
              return ways[n]


          print(count_ways(4, [1, 2]))   # should print 5
        `,
        hints: [
          "Look at the *last* stride of a climb. If it covered `s` steps, how many steps had you already climbed just before it?",
          "So `ways[k]` is the sum of `ways[k - s]` over every stride `s` that fits (`s <= k`), with `ways[0] = 1`. Fill the list for `k = 1, 2, …, n` in order, so the smaller answers are always ready.",
          [
            "Nearly the whole spell:",
            { code: py`
              def count_ways(n, strides):
                  ways = [0] * (n + 1)
                  ways[0] = 1
                  for k in range(1, n + 1):
                      for s in strides:
                          if s <= k:
                              ways[k] += ...
                  return ways[n]
            ` }
          ]
        ],
        solution: py`
          def count_ways(n, strides):
              # ways[k] = number of ways to climb exactly k steps
              ways = [0] * (n + 1)
              ways[0] = 1                         # the empty climb
              for k in range(1, n + 1):           # smallest first: ways[k - s] is ready
                  for s in strides:
                      if s <= k:                  # this stride fits as the last one
                          ways[k] += ways[k - s]
              return ways[n]


          print(count_ways(4, [1, 2]))
          print(count_ways(7, [2, 3]))
          print(count_ways(5, [2, 4]))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def count_ways(n, strides):
                @lru_cache(maxsize=None)
                def ways(k):
                    if k == 0:
                        return 1
                    return sum(ways(k - s) for s in strides if s <= k)
                return ways(n)
          `,
          py`
            def count_ways(n, strides, memo=None):
                if memo is None:
                    memo = {}
                if n == 0:
                    return 1
                if n in memo:
                    return memo[n]
                total = 0
                for s in strides:
                    if s <= n:
                        total += count_ways(n - s, strides, memo)
                memo[n] = total
                return total
          `,
          py`
            from functools import lru_cache

            @lru_cache(maxsize=None)
            def climb(n, strides):
                if n < 0:
                    return 0
                if n == 0:
                    return 1
                return sum(climb(n - s, strides) for s in strides)

            def count_ways(n, strides):
                return climb(n, tuple(strides))     # a tuple is hashable; a list is not
          `
        ],
        wrongSolutions: [
          // Naive recursion: correct, but exponential.
          py`
            def count_ways(n, strides):
                if n == 0:
                    return 1
                total = 0
                for s in strides:
                    if s <= n:
                        total += count_ways(n - s, strides)
                return total
          `,
          // A memo shared by every call, keyed only by n: it mixes up different stride lists.
          py`
            memo = {}

            def count_ways(n, strides):
                if n == 0:
                    return 1
                if n in memo:
                    return memo[n]
                total = 0
                for s in strides:
                    if s <= n:
                        total += count_ways(n - s, strides)
                memo[n] = total
                return total
          `,
          // Loops in the wrong order: counts combinations (order ignored), not ordered climbs.
          py`
            def count_ways(n, strides):
                ways = [0] * (n + 1)
                ways[0] = 1
                for s in strides:
                    for k in range(s, n + 1):
                        ways[k] += ways[k - s]
                return ways[n]
          `
        ],
        tests: LAIR_TRIALS + py`
          def check_ways(n, strides, want, note="", when="wrong"):
              result = call_spell("count_ways", 2, n, list(strides))
              memo_note = shared_memo_note()
              expect_number(result, want, "count_ways(" + str(n) + ", " + str(strides) + ")",
                            memo_note or note_when(result, want, note, when))


          @test("count_ways(4, [1, 2]) is 5")
          def _():
              order = " Remember that order matters: 1 + 2 and 2 + 1 are two different ways."
              check_ways(1, [1, 2], 1, order, "lower")
              check_ways(3, [1, 2], 3, order, "lower")
              check_ways(4, [1, 2], 5, order, "lower")


          @test("Each list of strides gets its own count")
          def _():
              check_ways(6, [1, 2], 13)
              check_ways(6, [2, 3], 2)
              check_ways(6, [1, 2, 3], 24)
              check_ways(10, [1, 3, 5], 47)
              check_ways(7, [2, 3], 3)


          @test("Climbing 0 steps is 1 way; impossible climbs are 0 ways")
          def _():
              careful = (" Careful: a negative index such as " + code("ways[-2]") + " doesn't raise an "
                         "error in Python, it quietly counts from the end of the list. Check that a "
                         "stride fits before looking back.")
              check_ways(0, [1, 2], 1)
              check_ways(0, [3], 1)
              check_ways(5, [2, 4], 0, careful, "higher")
              check_ways(1, [2], 0, careful, "higher")
              check_ways(3, [5], 0, careful, "higher")


          @test("count_ways(80, [1, 2]) is 37889062373143906, without waking the Hydra")
          def _():
              need_function("count_ways", 2)
              with without_waking_the_hydra("count_ways", 2000, budget=20000):
                  result = call_spell("count_ways", None, 80, [1, 2])
              expect_number(result, 37889062373143906, "count_ways(80, [1, 2])", shared_memo_note())


          @test("count_ways(100, [1, 3, 5, 7]) is right, and still quick")
          def _():
              need_function("count_ways", 2)
              with without_waking_the_hydra("count_ways", 2000, budget=20000):
                  result = call_spell("count_ways", None, 100, [1, 3, 5, 7])
              expect_number(result, 134459148186402899175, "count_ways(100, [1, 3, 5, 7])",
                            shared_memo_note())
        `,
        scene: { icon: "👣", successIcon: "✨", successText: "Every step of the spiral stairway glows with its number of ways, all the way to the top.", effect: "rise" }
      },

      // ------------------------------------------------------------------ 3
      {
        id: "hydra-coins",
        title: "The Ferryman's Coins",
        difficulty: "hard",
        concepts: ["minimum over choices", "impossible states", "why greedy fails"],
        story: [
          "An underground river splits the lair in two. A skeletal Ferryman holds out a bony hand. \"Exact fare, fewest coins,\" he rasps. \"I loathe a heavy purse.\"",
          "\"Grabbing the biggest coin first feels clever,\" Ada warns, \"but it can lead you astray. Work out the best purse for every smaller fare, and the true answer follows.\""
        ],
        task: [
          "Write `min_coins(coins, amount)` that **returns** the smallest number of coins that add up to exactly `amount`. `coins` lists the coin values (positive whole numbers), and you may use each value as many times as you like.",
          "If the amount can't be made at all, return `-1`. An amount of 0 needs 0 coins.",
          { code: py`
            print(min_coins([1, 5, 10], 27))   # 10 + 10 + 5 + 1 + 1
            print(min_coins([1, 3, 4], 6))     # 3 + 3 (not 4 + 1 + 1!)
            print(min_coins([5, 10], 3))       # impossible
          `, output: "5\n2\n-1" },
          "Fares in the trials go up to 301."
        ],
        lesson: [
          "Counting ways means *adding up* the answers to smaller subproblems. Finding the *best* way means taking the **minimum** (or maximum) over the choices instead.",
          "Why not simply grab the biggest coin that fits? That *greedy* choice can fail: with coins `[1, 3, 4]` and a fare of 6, greedy takes 4, then 1, then 1 — three coins — but 3 + 3 needs only two. A choice that looks best right now can spoil what comes after. DP considers every choice, using answers it has already worked out.",
          "Some subproblems have *no* answer at all. A handy trick is to mark them with `float(\"inf\")` (infinity): it's bigger than every number, so `min()` passes over it, and `inf + 1` is still `inf`. Here a stairway has broken steps (`None`) that you can't stand on, and you want the cheapest total toll to reach each step when you move 1 or 2 steps at a time:",
          { code: py`
            INF = float("inf")
            tolls = [0, 3, None, 2, 4, 1]     # None marks a broken step

            cost = [INF] * len(tolls)         # cheapest total toll to stand on each step
            cost[0] = 0                       # you start on step 0, for free
            for k in range(1, len(tolls)):
                if tolls[k] is None:
                    continue                  # broken: it stays impossible
                one_back = cost[k - 1]
                two_back = cost[k - 2] if k >= 2 else INF
                cost[k] = min(one_back, two_back) + tolls[k]

            print(cost)
          `, output: "[0, 3, inf, 5, 9, 6]" },
          { tip: "At the very end, turn `inf` into whatever the task wants for \"impossible\". Here, that's `-1`." }
        ],
        starter: py`
          def min_coins(coins, amount):
              INF = float("inf")
              # best[a] will hold the fewest coins that make exactly a (INF = impossible).
              best = [INF] * (amount + 1)
              # 1. Base case: how many coins make an amount of 0?
              # 2. For each a from 1 up to amount, try every coin as the LAST coin paid.
              # 3. Return the answer for amount, or -1 if it is still impossible.
              return -1


          print(min_coins([1, 3, 4], 6))   # should print 2
        `,
        hints: [
          "Suppose the *last* coin you hand over is worth `c`. Then the coins before it must make exactly `amount - c` — and you want as few of those as possible.",
          "So `best[a]` is 1 plus the smallest `best[a - c]` over every coin `c <= a`, with `best[0] = 0`. Fill `best[1]`, `best[2]`, … in order, leave impossible amounts at `float(\"inf\")`, and turn `inf` into `-1` at the end.",
          [
            "Fill in the gap:",
            { code: py`
              def min_coins(coins, amount):
                  INF = float("inf")
                  best = [0] + [INF] * amount
                  for a in range(1, amount + 1):
                      for c in coins:
                          if c <= a:
                              best[a] = min(best[a], ...)
                  return best[amount] if best[amount] != INF else -1
            ` }
          ]
        ],
        solution: py`
          def min_coins(coins, amount):
              INF = float("inf")                  # "impossible so far"
              best = [0] + [INF] * amount         # best[a] = fewest coins that make a
              for a in range(1, amount + 1):
                  for c in coins:
                      if c <= a:                  # c could be the last coin paid
                          best[a] = min(best[a], best[a - c] + 1)
              return best[amount] if best[amount] != INF else -1


          print(min_coins([1, 5, 10], 27))
          print(min_coins([1, 3, 4], 6))
          print(min_coins([5, 10], 3))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def min_coins(coins, amount):
                @lru_cache(maxsize=None)
                def fewest(a):
                    if a == 0:
                        return 0
                    options = [fewest(a - c) for c in coins if c <= a]
                    options = [x for x in options if x != -1]
                    return 1 + min(options) if options else -1
                return fewest(amount)
          `,
          py`
            def min_coins(coins, amount, memo=None):
                if memo is None:
                    memo = {}
                if amount == 0:
                    return 0
                if amount in memo:
                    return memo[amount]
                best = -1
                for c in coins:
                    if c <= amount:
                        sub = min_coins(coins, amount - c, memo)
                        if sub != -1 and (best == -1 or sub + 1 < best):
                            best = sub + 1
                memo[amount] = best
                return best
          `,
          // Breadth-first search (chapter 6): the first time we reach amount, we used the fewest coins.
          py`
            from collections import deque

            def min_coins(coins, amount):
                seen = {0}
                queue = deque([(0, 0)])           # (total so far, coins used)
                while queue:
                    total, used = queue.popleft()
                    if total == amount:
                        return used
                    for c in coins:
                        nxt = total + c
                        if nxt <= amount and nxt not in seen:
                            seen.add(nxt)
                            queue.append((nxt, used + 1))
                return -1
          `
        ],
        wrongSolutions: [
          // Greedy: biggest coin first.
          py`
            def min_coins(coins, amount):
                count = 0
                for c in sorted(coins, reverse=True):
                    count += amount // c
                    amount = amount % c
                return count if amount == 0 else -1
          `,
          // Naive recursion: correct, but exponential.
          py`
            def min_coins(coins, amount):
                if amount == 0:
                    return 0
                best = -1
                for c in coins:
                    if c <= amount:
                        sub = min_coins(coins, amount - c)
                        if sub != -1 and (best == -1 or sub + 1 < best):
                            best = sub + 1
                return best
          `,
          // Forgets to turn infinity into -1.
          py`
            def min_coins(coins, amount):
                best = [0] + [float("inf")] * amount
                for a in range(1, amount + 1):
                    for c in coins:
                        if c <= a:
                            best[a] = min(best[a], best[a - c] + 1)
                return best[amount]
          `
        ],
        tests: LAIR_TRIALS + py`
          def check_coins(coins, amount, want, note="", when="wrong", limit=None):
              call = "min_coins(" + str(coins) + ", " + str(amount) + ")"
              need_function("min_coins", 2)
              if limit is None:
                  result = call_spell("min_coins", None, list(coins), amount)
              else:
                  with without_waking_the_hydra("min_coins", limit, budget=30000):
                      result = call_spell("min_coins", None, list(coins), amount)
              if isinstance(result, float) and result == float("inf"):
                  fail(code(call) + " returned " + code("inf") + ". When a fare can't be made, turn "
                       "infinity into " + code("-1") + " before returning it.")
              memo_note = shared_memo_note()
              expect_number(result, want, call, memo_note or note_when(result, want, note, when))


          @test("min_coins([1, 5, 10], 27) is 5")
          def _():
              check_coins([1, 5, 10], 27, 5)
              check_coins([1, 2, 5], 11, 3)


          @test("Greedy isn't enough: min_coins([1, 3, 4], 6) is 2")
          def _():
              greedy = " Grabbing the biggest coin first isn't always best:"
              check_coins([1, 3, 4], 6, 2, greedy + " 3 + 3 beats 4 + 1 + 1.", "higher")
              check_coins([1, 7, 10], 14, 2, greedy + " 7 + 7 beats 10 + 1 + 1 + 1 + 1.", "higher")
              check_coins([3, 5], 9, 3, greedy + " 3 + 3 + 3 works, but starting with 5 leads nowhere.")


          @test("Impossible fares give -1")
          def _():
              check_coins([5, 10], 3, -1)
              check_coins([2], 7, -1)
              check_coins([3, 5], 7, -1)


          @test("A fare of 0 needs 0 coins")
          def _():
              check_coins([1, 2], 0, 0)
              check_coins([7], 0, 0)


          @test("Heavy purses (fares up to 301), without waking the Hydra")
          def _():
              check_coins([3, 7, 11, 13, 29], 300, 12, limit=10000)
              check_coins([6, 10, 15], 299, 23, limit=10000)
              check_coins([4, 6, 10], 301, -1, limit=10000)
        `,
        scene: { icon: "🛶", successIcon: "💰", successText: "The Ferryman counts your coins, grunts in approval, and poles you across the black river.", effect: "sparkle" }
      },

      // ------------------------------------------------------------------ 4
      {
        id: "hydra-grid",
        title: "The Tangled Grid",
        difficulty: "hard",
        concepts: ["2-D tables", "grid paths", "edge cases"],
        story: [
          "The Hydra's coils cover the cavern floor like a grid of scaly tiles. Some tiles are knotted tight (`#`); the rest are open (`.`). The scales only let you slide **right** or **down**.",
          "\"The third head guards the far corner,\" says Ada. \"It yields to whoever can tell it, precisely, how many different routes lead there.\""
        ],
        task: [
          "Write `count_paths(grid)` that **returns** the number of different routes from the top-left tile to the bottom-right tile, where each move goes one tile right or one tile down, and every tile on the route is open.",
          "`grid` is a list of equal-length strings: `\".\"` is an open tile and `\"#\"` is a knotted one. If the start or the end tile is knotted, there are 0 routes.",
          { code: py`
            grid = ["...",
                    ".#.",
                    "..."]
            print(count_paths(grid))   # around the knot: over the top, or down the side
          `, output: "2" },
          "Grids in the trials can be up to 15 × 15 tiles."
        ],
        lesson: [
          "Many DP problems need a **2-D table**, with one entry for every pair of values: here, every (row, column). Build one with a list comprehension, so that each row is its own list:",
          { code: py`
            rows, cols = 3, 4
            table = [[0] * cols for _ in range(rows)]    # 3 separate rows of 4 zeros
            table[1][2] = 7                              # row 1, column 2
            print(table)
          `, output: "[[0, 0, 0, 0], [0, 0, 7, 0], [0, 0, 0, 0]]" },
          { warning: "Don't write `[[0] * cols] * rows`. It makes `rows` references to the *same* list, so changing one row changes them all." },
          "Fill a grid table row by row, left to right: then the entries *above* and to the *left* of a tile are always ready when you reach it. Here is a different puzzle — every tile charges a toll, and we want the cheapest total toll from the top-left corner to each tile, moving right or down:",
          { code: py`
            tolls = [[1, 3, 1],
                     [1, 5, 1],
                     [4, 2, 1]]
            rows, cols = len(tolls), len(tolls[0])
            cheapest = [[0] * cols for _ in range(rows)]
            for r in range(rows):
                for c in range(cols):
                    if r == 0 and c == 0:
                        before = 0                              # the starting tile
                    elif r == 0:
                        before = cheapest[r][c - 1]             # top row: only from the left
                    elif c == 0:
                        before = cheapest[r - 1][c]             # left column: only from above
                    else:
                        before = min(cheapest[r - 1][c], cheapest[r][c - 1])
                    cheapest[r][c] = before + tolls[r][c]

            for row in cheapest:
                print(row)
          `, output: "[1, 4, 5]\n[2, 7, 6]\n[6, 8, 7]" },
          { tip: "Top-down works too: memoize a helper `routes(r, c)` that asks about the tile above and the tile to the left. But for big inputs a table is safest, because recursion in the browser can only go a few hundred calls deep." }
        ],
        starter: py`
          def count_paths(grid):
              rows, cols = len(grid), len(grid[0])
              # routes[r][c] will hold the number of routes from the start to tile (r, c).
              routes = [[0] * cols for _ in range(rows)]
              # Fill in the table here, row by row...
              return routes[rows - 1][cols - 1]


          print(count_paths(["...", ".#.", "..."]))   # should print 2
        `,
        hints: [
          "To arrive on an open tile, your last move came either from the tile above it or from the tile to its left.",
          "So for an open tile, `routes[r][c] = routes[r - 1][c] + routes[r][c - 1]`, counting a neighbour that is off the grid as 0. A knotted tile stays 0, and the start tile has 1 route if it's open. Fill the table row by row, so both neighbours are always ready.",
          [
            "Nearly there — complete the last line:",
            { code: py`
              for r in range(rows):
                  for c in range(cols):
                      if grid[r][c] == "#":
                          continue                    # knotted: 0 routes
                      if r == 0 and c == 0:
                          routes[r][c] = 1            # the start
                          continue
                      above = routes[r - 1][c] if r > 0 else 0
                      left = routes[r][c - 1] if c > 0 else 0
                      routes[r][c] = ...
            ` }
          ]
        ],
        solution: py`
          def count_paths(grid):
              rows, cols = len(grid), len(grid[0])
              # routes[r][c] = number of routes from the start to tile (r, c)
              routes = [[0] * cols for _ in range(rows)]
              for r in range(rows):
                  for c in range(cols):
                      if grid[r][c] == "#":
                          continue                        # knotted tiles stay at 0
                      if r == 0 and c == 0:
                          routes[r][c] = 1                # the starting tile
                          continue
                      above = routes[r - 1][c] if r > 0 else 0
                      left = routes[r][c - 1] if c > 0 else 0
                      routes[r][c] = above + left         # the last move came from one of these
              return routes[rows - 1][cols - 1]


          print(count_paths(["...", ".#.", "..."]))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def count_paths(grid):
                rows, cols = len(grid), len(grid[0])

                @lru_cache(maxsize=None)
                def routes(r, c):
                    if r < 0 or c < 0 or grid[r][c] == "#":
                        return 0
                    if r == 0 and c == 0:
                        return 1
                    return routes(r - 1, c) + routes(r, c - 1)

                return routes(rows - 1, cols - 1)
          `,
          py`
            def count_paths(grid, r=0, c=0, memo=None):
                if memo is None:
                    memo = {}
                rows, cols = len(grid), len(grid[0])
                if r >= rows or c >= cols or grid[r][c] == "#":
                    return 0
                if (r, c) == (rows - 1, cols - 1):
                    return 1
                if (r, c) not in memo:
                    memo[(r, c)] = count_paths(grid, r + 1, c, memo) + count_paths(grid, r, c + 1, memo)
                return memo[(r, c)]
          `,
          py`
            def count_paths(grid):
                row = [0] * len(grid[0])      # one row of the table, reused
                row[0] = 1
                for line in grid:
                    for c in range(len(line)):
                        if line[c] == "#":
                            row[c] = 0
                        elif c > 0:
                            row[c] += row[c - 1]
                return row[-1]
          `
        ],
        wrongSolutions: [
          // Every row is the same list, so knotted tiles keep old values from the row above.
          py`
            def count_paths(grid):
                rows, cols = len(grid), len(grid[0])
                routes = [[0] * cols] * rows
                for r in range(rows):
                    for c in range(cols):
                        if grid[r][c] == "#":
                            continue
                        if r == 0 and c == 0:
                            routes[r][c] = 1
                            continue
                        above = routes[r - 1][c] if r > 0 else 0
                        left = routes[r][c - 1] if c > 0 else 0
                        routes[r][c] = above + left
                return routes[rows - 1][cols - 1]
          `,
          // "The top row and left column are all 1s" — not when a knot cuts them off.
          py`
            def count_paths(grid):
                rows, cols = len(grid), len(grid[0])
                if grid[0][0] == "#" or grid[-1][-1] == "#":
                    return 0
                routes = [[0] * cols for _ in range(rows)]
                for r in range(rows):
                    for c in range(cols):
                        if grid[r][c] == "#":
                            routes[r][c] = 0
                        elif r == 0 or c == 0:
                            routes[r][c] = 1
                        else:
                            routes[r][c] = routes[r - 1][c] + routes[r][c - 1]
                return routes[-1][-1]
          `,
          // Naive recursion in a helper: exponential.
          py`
            def count_paths(grid):
                rows, cols = len(grid), len(grid[0])

                def routes(r, c):
                    if r >= rows or c >= cols or grid[r][c] == "#":
                        return 0
                    if r == rows - 1 and c == cols - 1:
                        return 1
                    return routes(r + 1, c) + routes(r, c + 1)

                return routes(0, 0)
          `
        ],
        tests: LAIR_TRIALS + py`
          import re as _re


          def check_grid(grid, want, note="", when="wrong"):
              result = call_spell("count_paths", 1, list(grid))
              advice = shared_memo_note() or note_when(result, want, note, when)
              # [[0] * cols] * rows makes every row the same list.
              if not advice and _re.search(r"\[\s*\[[^\[\]]*\]\s*\*[^\]\n]*\]\s*\*", source):
                  advice = (" Check how you built your table: " + code("[[0] * cols] * rows")
                            + " makes every row the same list, so changing one row changes them all. "
                            "Use " + code("[[0] * cols for _ in range(rows)]") + " instead.")
              expect_number(result, want, "count_paths(" + short(grid) + ")", advice)


          @test("Open caverns: 2 × 2 has 2 routes and 3 × 3 has 6")
          def _():
              check_grid(["..", ".."], 2)
              check_grid(["...", "...", "..."], 6)
              check_grid(["."], 1)
              check_grid(["....."], 1)


          @test("Knotted tiles (#) are avoided")
          def _():
              check_grid(["...", ".#.", "..."], 2)
              check_grid(["....", ".##.", "...."], 2)
              check_grid(["..#.", "....", ".#.."], 4)


          @test("A knot on the top row or left column cuts off the tiles beyond it")
          def _():
              edge = (" Along the top row and the left column there is only one way in, so a knot "
                      "there blocks every tile after it.")
              check_grid([".#..", "....", "...."], 4, edge, "higher")
              check_grid(["....", "#...", "...."], 6, edge, "higher")


          @test("Rectangular caverns work both ways round")
          def _():
              check_grid(["......."] * 3, 28)
              check_grid(["..."] * 7, 28)
              check_grid([".....", "....."], 5)


          @test("A knotted start or end, or no way through, means 0 routes")
          def _():
              check_grid(["#..", "...", "..."], 0)
              check_grid(["...", "...", "..#"], 0)
              check_grid(["..#", ".#.", "#.."], 0)
              check_grid(["#"], 0)


          @test("A vast 15 × 15 cavern has 4701004 routes, found without waking the Hydra")
          def _():
              need_function("count_paths", 1)
              cavern = [
                  "...............",
                  "..#............",
                  "........#......",
                  "...............",
                  ".....#.........",
                  "...........#...",
                  "...............",
                  ".#.....#.......",
                  "...............",
                  "..........#....",
                  "....#..........",
                  "...............",
                  "........#....#.",
                  "...............",
                  "...............",
              ]
              with without_waking_the_hydra("count_paths", 5000, budget=20000):
                  result = call_spell("count_paths", None, cavern)
              expect_number(result, 4701004, "count_paths(cavern)")
        `,
        scene: { icon: "🗺️", successIcon: "✨", successText: "Glowing trails race across the scaly tiles — every route to the far corner, counted at once.", effect: "portal" }
      },
      // ------------------------------------------------------------------ 5
      {
        id: "hydra-twin-scrolls",
        title: "The Twin Scrolls",
        difficulty: "hard",
        concepts: ["2-D DP on strings", "subsequences", "prefix tables"],
        story: [
          "Two scribes once copied the Hydra's ancient riddle, and each of them skipped letters here and there. Only the letters both copies share, in the same order, can be trusted.",
          "\"The longer that shared thread, the closer we are to the original,\" says Ada. \"Compare the scrolls letter by letter — and remember every comparison you make.\""
        ],
        task: [
          "Write `lcs_length(a, b)` that **returns** the length of the *longest common subsequence* of the strings `a` and `b`.",
          "A **subsequence** keeps letters in their original order but may skip any of them: `\"ace\"` is a subsequence of `\"abcde\"`, but `\"aec\"` is not. The longest common subsequence is the longest string that is a subsequence of *both* `a` and `b`.",
          { code: py`
            print(lcs_length("ABCBDAB", "BDCABA"))   # for example "BCBA"
            print(lcs_length("dragon", "wagon"))     # "agon"
            print(lcs_length("abc", "xyz"))          # nothing in common
          `, output: "4\n4\n0" },
          "Scrolls in the trials can be over 50 letters long."
        ],
        lesson: [
          "First, what exactly is a subsequence? This little spell walks along `big` and ticks off the letters of `small` in order:",
          { code: py`
            def hidden_in(small, big):
                found = 0                           # letters of small found so far
                for letter in big:
                    if found < len(small) and letter == small[found]:
                        found += 1
                return found == len(small)

            print(hidden_in("ace", "abcde"))       # a_c_e: in order, with gaps
            print(hidden_in("aec", "abcde"))       # e comes after c in "abcde"
          `, output: "True\nFalse" },
          "Comparing *two* sequences calls for a 2-D table over their **prefixes** (beginnings). Let `table[i][j]` be the LCS length of the first `i` letters of `a` and the first `j` letters of `b`; the final answer is `table[len(a)][len(b)]`.",
          "Row 0 and column 0 stand for an *empty* prefix, which shares nothing with anything, so they are all zeros. That's why the table has one more row and column than the strings have letters, and why entry `[i][j]` looks at `a[i - 1]` and `b[j - 1]`: the *last* letters of its two prefixes.",
          "Here is the finished table for `\"ABCB\"` (down the side) and `\"BDCAB\"` (across the top). Each entry depends only on its neighbours above, to the left and diagonally up-left, and on whether its two last letters match. Can you spot the rule?",
          { output: [
            "      \"\"  B  D  C  A  B",
            "  \"\"   0  0  0  0  0  0",
            "   A   0  0  0  0  1  1",
            "   B   0  1  1  1  1  2",
            "   C   0  1  1  2  2  2",
            "   B   0  1  1  2  2  3"
          ].join("\n") },
          "The bottom-right entry says the longest common subsequence has length 3 (it's `\"BCB\"`)."
        ],
        starter: py`
          def lcs_length(a, b):
              # table[i][j] = LCS length of a[:i] and b[:j]; row 0 and column 0 stay 0.
              table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
              # Fill in the other entries, row by row...
              return table[len(a)][len(b)]


          print(lcs_length("ABCBDAB", "BDCABA"))   # should print 4
        `,
        hints: [
          "Compare the *last* letters of the two prefixes, `a[i - 1]` and `b[j - 1]`. What can you say when they match? And when they don't?",
          "If they match, that letter can end the common subsequence: `table[i][j] = table[i - 1][j - 1] + 1`. If they don't, at least one of them is no use at the end, so take the larger of `table[i - 1][j]` (drop `a`'s letter) and `table[i][j - 1]` (drop `b`'s letter).",
          [
            "Fill in the two gaps:",
            { code: py`
              for i in range(1, len(a) + 1):
                  for j in range(1, len(b) + 1):
                      if a[i - 1] == b[j - 1]:
                          table[i][j] = ...
                      else:
                          table[i][j] = max(..., ...)
            ` }
          ]
        ],
        solution: py`
          def lcs_length(a, b):
              # table[i][j] = LCS length of the prefixes a[:i] and b[:j]
              table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
              for i in range(1, len(a) + 1):
                  for j in range(1, len(b) + 1):
                      if a[i - 1] == b[j - 1]:            # the last letters match: keep them
                          table[i][j] = table[i - 1][j - 1] + 1
                      else:                               # drop one last letter or the other
                          table[i][j] = max(table[i - 1][j], table[i][j - 1])
              return table[len(a)][len(b)]


          print(lcs_length("ABCBDAB", "BDCABA"))
          print(lcs_length("dragon", "wagon"))
          print(lcs_length("abc", "xyz"))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def lcs_length(a, b):
                @lru_cache(maxsize=None)
                def best(i, j):                 # LCS of the suffixes a[i:] and b[j:]
                    if i == len(a) or j == len(b):
                        return 0
                    if a[i] == b[j]:
                        return 1 + best(i + 1, j + 1)
                    return max(best(i + 1, j), best(i, j + 1))
                return best(0, 0)
          `,
          py`
            from functools import lru_cache

            @lru_cache(maxsize=None)
            def lcs_length(a, b):
                if not a or not b:
                    return 0
                if a[0] == b[0]:
                    return 1 + lcs_length(a[1:], b[1:])
                return max(lcs_length(a[1:], b), lcs_length(a, b[1:]))
          `,
          py`
            def lcs_length(a, b):
                previous = [0] * (len(b) + 1)       # only the row above is needed
                for letter in a:
                    current = [0]
                    for j in range(1, len(b) + 1):
                        if letter == b[j - 1]:
                            current.append(previous[j - 1] + 1)
                        else:
                            current.append(max(previous[j], current[j - 1]))
                    previous = current
                return previous[-1]
          `
        ],
        wrongSolutions: [
          // Longest common SUBSTRING: the letters must be side by side.
          py`
            def lcs_length(a, b):
                best = 0
                table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
                for i in range(1, len(a) + 1):
                    for j in range(1, len(b) + 1):
                        if a[i - 1] == b[j - 1]:
                            table[i][j] = table[i - 1][j - 1] + 1
                            best = max(best, table[i][j])
                return best
          `,
          // Greedy matching: grabs the first match it sees and never reconsiders.
          py`
            def lcs_length(a, b):
                count, start = 0, 0
                for letter in a:
                    position = b.find(letter, start)
                    if position != -1:
                        count += 1
                        start = position + 1
                return count
          `,
          // Naive recursion in a helper: exponential.
          py`
            def lcs_length(a, b):
                def best(i, j):
                    if i == len(a) or j == len(b):
                        return 0
                    if a[i] == b[j]:
                        return 1 + best(i + 1, j + 1)
                    return max(best(i + 1, j), best(i, j + 1))
                return best(0, 0)
          `
        ],
        tests: LAIR_TRIALS + py`
          def check_lcs(a, b, want, note=""):
              result = need_function("lcs_length", 2)(a, b)
              expect_number(result, want, "lcs_length(" + repr(a) + ", " + repr(b) + ")",
                            shared_memo_note() or note_when(result, want, note, "lower"))


          gaps = (" Remember that a common subsequence may skip letters in both scrolls: its letters "
                  "don't have to be side by side, and the first matching letter isn't always the "
                  "best one to use.")


          @test("lcs_length('SPELL', 'SMELL') is 4 and lcs_length('dragon', 'wagon') is 4")
          def _():
              check_lcs("SPELL", "SMELL", 4)
              check_lcs("dragon", "wagon", 4)


          @test("Shared letters don't have to be side by side")
          def _():
              check_lcs("AXBXCX", "ABC", 3, gaps)
              check_lcs("ABCBDAB", "BDCABA", 4, gaps)


          @test("lcs_length('ABC', 'CBA') is 1 — order matters")
          def _():
              check_lcs("ABC", "CBA", 1)
              check_lcs("HYDRA", "HARDY", 2)


          @test("Empty or unrelated scrolls share 0 letters; identical ones share them all")
          def _():
              check_lcs("", "ABC", 0)
              check_lcs("ABC", "", 0)
              check_lcs("", "", 0)
              check_lcs("abc", "xyz", 0)
              check_lcs("hydra", "hydra", 5)


          @test("Two scrolls of over 50 letters, without waking the Hydra")
          def _():
              need_function("lcs_length", 2)
              a = "THEHYDRAOFOVERLAPPINGSUBPROBLEMSSLEEPSBENEATHTHELABYRINTH"
              b = "APPRENTICESWHOREMEMBEREVERYHEADNEVERFIGHTTHESAMEONETWICE"
              with without_waking_the_hydra("lcs_length", 40000, budget=60000):
                  result = need_function("lcs_length")(a, b)
              expect_number(result, 20, "lcs_length(" + repr(a) + ", " + repr(b) + ")")
        `,
        scene: { icon: "📜", successIcon: "🔗", successText: "The shared letters lift off both scrolls and braid themselves into one true riddle.", effect: "manifest" }
      },

      // ------------------------------------------------------------------ 6
      {
        id: "hydra-bag-of-holding",
        title: "The Bag of Holding",
        difficulty: "hard",
        concepts: ["0/1 knapsack", "take it or leave it", "2-D DP"],
        story: [
          "Behind the fourth head glitters the Hydra's hoard. Ada hands you a Bag of Holding: enchanted, but not bottomless. It tears if its treasures weigh more than its limit.",
          "\"Each treasure is one of a kind,\" she says. \"For every one, decide: take it or leave it. Weigh the richest choice precisely.\""
        ],
        task: [
          "Write `best_value(items, capacity)` that **returns** the largest total value you can carry. `items` is a list of `(weight, value)` tuples, and the total weight of the items you take must not be more than `capacity`.",
          "Each item can be taken **at most once**. Weights and values are positive whole numbers, and `capacity` is a whole number (it may be 0).",
          { code: py`
            hoard = [(1, 1), (3, 4), (4, 5), (5, 7)]
            print(best_value(hoard, 7))    # take (3, 4) and (4, 5): weight 7, value 9
            print(best_value(hoard, 0))    # nothing fits
          `, output: "9\n0" },
          "Hoards in the trials can hold 30 treasures, with a capacity of 300."
        ],
        lesson: [
          "In a **0/1** problem, every item gets a yes-or-no decision: you take 0 copies or 1, never 2. Facing the first item, there are just two futures: *leave it* and solve the rest with the same room, or *take it* (if it fits) and solve the rest with less room. The best answer is whichever future is better.",
          "So a subproblem needs two numbers: *which items are still to be decided*, and *how much room is left*. Two numbers mean a 2-D memo or table. Here is the same take-it-or-leave-it idea counting something else — how many groups of gems weigh exactly a target:",
          { code: py`
            from functools import lru_cache

            gems = [3, 5, 2, 7]

            @lru_cache(maxsize=None)
            def groups(i, target):
                """How many groups of the gems from position i onwards weigh exactly target?"""
                if target == 0:
                    return 1                                  # the empty group
                if i == len(gems) or target < 0:
                    return 0
                leave = groups(i + 1, target)                 # skip gem i
                take = groups(i + 1, target - gems[i])        # use gem i (once!)
                return leave + take

            print(groups(0, 10))       # 3 + 7, and 3 + 5 + 2
          `, output: "2" },
          "A table works too: let `table[i][room]` be the best value you can get from the first `i` items with that much room. Row 0 (no items yet) is all zeros, and each row is worked out from the row above it. That is what makes sure no item is used twice. For the items `(2, 3)`, `(3, 4)` and `(4, 5)`:",
          { output: [
            "room          0  1  2  3  4  5  6",
            "no items      0  0  0  0  0  0  0",
            "+ (2, 3)      0  0  3  3  3  3  3",
            "+ (3, 4)      0  0  3  4  4  7  7",
            "+ (4, 5)      0  0  3  4  5  7  8"
          ].join("\n") },
          { tip: "Is \"best value per weight first\" good enough? No: with room 8 and the items `(5, 10)`, `(4, 7)` and `(4, 7)`, it grabs `(5, 10)` and then nothing else fits, but the two `(4, 7)` items together are worth 14." }
        ],
        starter: py`
          def best_value(items, capacity):
              # For each item: leave it, or take it if it fits (each item at most once).
              # Remember the best value for each (items still to decide, room left) pair,
              # or build a table with one row per item and one column per room size.
              return 0


          print(best_value([(1, 1), (3, 4), (4, 5), (5, 7)], 7))   # should print 9
        `,
        hints: [
          "Decide about one item at a time. If you leave item `i`, the room stays the same. If you take it (only possible when it fits), you gain its value but lose its weight in room.",
          "Let `best(i, room)` be the most value you can get from `items[i:]` with `room` left. It's the larger of `best(i + 1, room)` and `value + best(i + 1, room - weight)` (the second only when `weight <= room`), and `best(len(items), room)` is 0. Memoize it, or fill a table instead.",
          [
            "Nearly there — complete the line that takes the item:",
            { code: py`
              from functools import lru_cache

              def best_value(items, capacity):
                  @lru_cache(maxsize=None)
                  def best(i, room):
                      if i == len(items):
                          return 0
                      weight, value = items[i]
                      result = best(i + 1, room)            # leave it
                      if weight <= room:
                          result = max(result, ...)         # take it
                      return result
                  return best(0, capacity)
            ` }
          ]
        ],
        solution: py`
          def best_value(items, capacity):
              # table[i][room] = best value using only the first i items, with this much room
              table = [[0] * (capacity + 1) for _ in range(len(items) + 1)]
              for i, (weight, value) in enumerate(items, start=1):
                  for room in range(capacity + 1):
                      table[i][room] = table[i - 1][room]           # leave item i
                      if weight <= room:                            # or take it, just once
                          take = table[i - 1][room - weight] + value
                          table[i][room] = max(table[i][room], take)
              return table[len(items)][capacity]


          print(best_value([(1, 1), (3, 4), (4, 5), (5, 7)], 7))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def best_value(items, capacity):
                @lru_cache(maxsize=None)
                def best(i, room):
                    if i == len(items):
                        return 0
                    weight, value = items[i]
                    result = best(i + 1, room)
                    if weight <= room:
                        result = max(result, value + best(i + 1, room - weight))
                    return result
                return best(0, capacity)
          `,
          py`
            def best_value(items, capacity):
                best = [0] * (capacity + 1)
                for weight, value in items:
                    # Go DOWN through the rooms, so this item can't be added twice.
                    for room in range(capacity, weight - 1, -1):
                        best[room] = max(best[room], best[room - weight] + value)
                return best[capacity]
          `,
          py`
            def best_value(items, capacity, i=0, memo=None):
                if memo is None:
                    memo = {}
                if i == len(items):
                    return 0
                if (i, capacity) in memo:
                    return memo[(i, capacity)]
                weight, value = items[i]
                result = best_value(items, capacity, i + 1, memo)
                if weight <= capacity:
                    result = max(result, value + best_value(items, capacity - weight, i + 1, memo))
                memo[(i, capacity)] = result
                return result
          `,
          py`
            def best_value(items, capacity):
                best = {0: 0}               # weight used -> best value with exactly that weight
                for weight, value in items:
                    for used, total in list(best.items()):
                        new = used + weight
                        if new <= capacity and best.get(new, -1) < total + value:
                            best[new] = total + value
                return max(best.values())
          `
        ],
        wrongSolutions: [
          // Going UP through the rooms lets an item be added again and again (unbounded knapsack).
          py`
            def best_value(items, capacity):
                best = [0] * (capacity + 1)
                for weight, value in items:
                    for room in range(weight, capacity + 1):
                        best[room] = max(best[room], best[room - weight] + value)
                return best[capacity]
          `,
          // Greedy: best value per weight first.
          py`
            def best_value(items, capacity):
                total = 0
                for weight, value in sorted(items, key=lambda item: item[1] / item[0], reverse=True):
                    if weight <= capacity:
                        capacity -= weight
                        total += value
                return total
          `,
          // Naive recursion in a helper: exponential.
          py`
            def best_value(items, capacity):
                def best(i, room):
                    if i == len(items):
                        return 0
                    weight, value = items[i]
                    result = best(i + 1, room)
                    if weight <= room:
                        result = max(result, value + best(i + 1, room - weight))
                    return result
                return best(0, capacity)
          `
        ],
        tests: LAIR_TRIALS + py`
          def check_bag(items, capacity, want, note="", when="wrong"):
              result = call_spell("best_value", 2, list(items), capacity)
              expect_number(result, want, "best_value(" + short(items) + ", " + str(capacity) + ")",
                            shared_memo_note() or note_when(result, want, note, when))


          @test("The example hoard: room 7 gives 9")
          def _():
              hoard = [(1, 1), (3, 4), (4, 5), (5, 7)]
              check_bag(hoard, 7, 9)
              check_bag(hoard, 6, 8)
              check_bag(hoard, 15, 17)


          @test("Each treasure can be taken only once")
          def _():
              once = " Each treasure is one of a kind: it can be taken at most once."
              check_bag([(2, 3)], 10, 3, once, "higher")
              check_bag([(3, 5), (4, 6)], 8, 11, once, "higher")


          @test("The best value per weight isn't always the best choice")
          def _():
              greedy = (" Grabbing the best value per weight first can waste room: compare taking "
                        "each item with leaving it.")
              check_bag([(5, 10), (4, 7), (4, 7)], 8, 14, greedy, "lower")
              check_bag([(6, 30), (3, 14), (4, 16), (2, 9)], 10, 46, greedy, "lower")


          @test("Empty hoards and tiny bags hold nothing")
          def _():
              check_bag([], 10, 0)
              check_bag([(5, 10)], 4, 0)
              check_bag([(1, 1)], 0, 0)


          @test("A dragon's hoard of 30 treasures, without waking the Hydra")
          def _():
              need_function("best_value", 2)
              hoard = [(5 + (i * 37) % 41, 10 + (i * 53) % 67) for i in range(30)]
              with without_waking_the_hydra("best_value", 50000, budget=150000):
                  result = call_spell("best_value", None, hoard, 300)
              expect_number(result, 839, "best_value(hoard, 300)",
                            " (Here " + code("hoard = [(5 + (i * 37) % 41, 10 + (i * 53) % 67) for i in range(30)]")
                            + ": 30 treasures weighing 747 in total.)")
        `,
        scene: { icon: "🎒", successIcon: "💎", successText: "The richest treasures float into the Bag of Holding, which settles without a single tear.", effect: "rise" }
      },

      // ------------------------------------------------------------------ 7
      {
        id: "hydra-transmutation",
        title: "The Transmutation",
        difficulty: "hard",
        concepts: ["edit distance", "three choices per entry", "2-D DP"],
        story: [
          "The fifth head guards its lair with alchemy, transmuting one word into another. Every change — inserting a letter, deleting one, or turning one letter into another — costs a drop of precious mana.",
          "\"Lead into gold costs three drops,\" says Ada. \"Waste none. Find the cheapest transmutation between any two words.\""
        ],
        task: [
          "Write `edit_distance(a, b)` that **returns** the smallest number of single-letter changes that turn the string `a` into the string `b`. A change is one of: **insert** a letter, **delete** a letter, or **replace** one letter with another.",
          { code: py`
            print(edit_distance("lead", "gold"))      # replace l with g, e with o, a with l
            print(edit_distance("spell", "spells"))   # insert an s
            print(edit_distance("", "abc"))           # insert a, b and c
          `, output: "3\n1\n3" },
          "Words in the trials can be over 40 letters long."
        ],
        lesson: [
          "Edit distance is the sternest table in the lair, but it is built just like the twin scrolls' one. Let `table[i][j]` be the cheapest way to turn the first `i` letters of `a` into the first `j` letters of `b`. The answer is `table[len(a)][len(b)]`.",
          "Start with the edges. Turning `i` letters into the empty string takes `i` deletions, and turning the empty string into `j` letters takes `j` insertions. So row 0 counts 0, 1, 2, … and so does column 0. Getting the edges wrong is the most common edit-distance bug!",
          { code: py`
            a, b = "rune", "ruin"
            table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
            for i in range(len(a) + 1):
                table[i][0] = i          # "rune"[:i] -> "": delete i letters
            for j in range(len(b) + 1):
                table[0][j] = j          # "" -> "ruin"[:j]: insert j letters
            for row in table:
                print(row)
          `, output: "[0, 1, 2, 3, 4]\n[1, 0, 0, 0, 0]\n[2, 0, 0, 0, 0]\n[3, 0, 0, 0, 0]\n[4, 0, 0, 0, 0]" },
          "Then each inner entry looks at the last letters, `a[i - 1]` and `b[j - 1]`. If they already match, they cost nothing: the entry diagonally up-left already holds the answer. If they differ, the last change was one of the three spells, and each spell matches one neighbouring entry — above, left or up-left. Work out which is which, then pay 1 drop plus the cheapest of the three. Here is the whole table for `\"rune\"` → `\"ruin\"`:",
          { output: [
            "      \"\"  r  u  i  n",
            "  \"\"   0  1  2  3  4",
            "   r   1  0  1  2  3",
            "   u   2  1  0  1  2",
            "   n   3  2  1  1  1",
            "   e   4  3  2  2  2"
          ].join("\n") },
          { tip: "Prefer recursion? Memoize `cost(i, j)` for the suffixes `a[i:]` and `b[j:]`: when one of them is empty, the answer is the length of the other." }
        ],
        starter: py`
          def edit_distance(a, b):
              # table[i][j] = fewest changes to turn a[:i] into b[:j]
              table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
              # 1. Fill in row 0 and column 0 (turning "" into a word, or a word into "").
              # 2. Fill in the inner entries, row by row.
              return table[len(a)][len(b)]


          print(edit_distance("lead", "gold"))   # should print 3
        `,
        hints: [
          "First the edges: `table[i][0] = i` and `table[0][j] = j`. Then, for each inner entry, check whether `a[i - 1] == b[j - 1]`.",
          "If the letters match, `table[i][j] = table[i - 1][j - 1]`. If not, it's 1 plus the smallest of `table[i - 1][j]` (delete `a`'s letter), `table[i][j - 1]` (insert `b`'s letter) and `table[i - 1][j - 1]` (replace one with the other).",
          [
            "Fill in the gap:",
            { code: py`
              for i in range(1, len(a) + 1):
                  for j in range(1, len(b) + 1):
                      if a[i - 1] == b[j - 1]:
                          table[i][j] = table[i - 1][j - 1]
                      else:
                          table[i][j] = 1 + min(..., ..., ...)
            ` }
          ]
        ],
        solution: py`
          def edit_distance(a, b):
              # table[i][j] = fewest changes to turn a[:i] into b[:j]
              table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
              for i in range(len(a) + 1):
                  table[i][0] = i                         # delete all i letters
              for j in range(len(b) + 1):
                  table[0][j] = j                         # insert all j letters
              for i in range(1, len(a) + 1):
                  for j in range(1, len(b) + 1):
                      if a[i - 1] == b[j - 1]:
                          table[i][j] = table[i - 1][j - 1]           # free: letters match
                      else:
                          table[i][j] = 1 + min(table[i - 1][j],      # delete a[i - 1]
                                                table[i][j - 1],      # insert b[j - 1]
                                                table[i - 1][j - 1])  # replace one with the other
              return table[len(a)][len(b)]


          print(edit_distance("lead", "gold"))
          print(edit_distance("spell", "spells"))
          print(edit_distance("", "abc"))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def edit_distance(a, b):
                @lru_cache(maxsize=None)
                def cost(i, j):                     # turn a[i:] into b[j:]
                    if i == len(a):
                        return len(b) - j
                    if j == len(b):
                        return len(a) - i
                    if a[i] == b[j]:
                        return cost(i + 1, j + 1)
                    return 1 + min(cost(i + 1, j), cost(i, j + 1), cost(i + 1, j + 1))
                return cost(0, 0)
          `,
          py`
            def edit_distance(a, b):
                previous = list(range(len(b) + 1))      # row 0
                for i in range(1, len(a) + 1):
                    current = [i] + [0] * len(b)
                    for j in range(1, len(b) + 1):
                        if a[i - 1] == b[j - 1]:
                            current[j] = previous[j - 1]
                        else:
                            current[j] = 1 + min(previous[j], current[j - 1], previous[j - 1])
                    previous = current
                return previous[-1]
          `,
          py`
            from functools import lru_cache

            @lru_cache(maxsize=None)
            def edit_distance(a, b):
                if not a:
                    return len(b)
                if not b:
                    return len(a)
                if a[-1] == b[-1]:
                    return edit_distance(a[:-1], b[:-1])
                return 1 + min(edit_distance(a[:-1], b),
                               edit_distance(a, b[:-1]),
                               edit_distance(a[:-1], b[:-1]))
          `
        ],
        wrongSolutions: [
          // Compares letters position by position: it can't shift letters along.
          py`
            def edit_distance(a, b):
                changes = abs(len(a) - len(b))
                for x, y in zip(a, b):
                    if x != y:
                        changes += 1
                return changes
          `,
          // Forgets the edges: row 0 and column 0 stay 0.
          py`
            def edit_distance(a, b):
                table = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
                for i in range(1, len(a) + 1):
                    for j in range(1, len(b) + 1):
                        if a[i - 1] == b[j - 1]:
                            table[i][j] = table[i - 1][j - 1]
                        else:
                            table[i][j] = 1 + min(table[i - 1][j], table[i][j - 1], table[i - 1][j - 1])
                return table[len(a)][len(b)]
          `,
          // Naive recursion: correct, but exponential.
          py`
            def edit_distance(a, b):
                if not a:
                    return len(b)
                if not b:
                    return len(a)
                if a[0] == b[0]:
                    return edit_distance(a[1:], b[1:])
                return 1 + min(edit_distance(a[1:], b), edit_distance(a, b[1:]), edit_distance(a[1:], b[1:]))
          `
        ],
        tests: LAIR_TRIALS + py`
          def check_edit(a, b, want, note="", when="wrong"):
              result = need_function("edit_distance", 2)(a, b)
              expect_number(result, want, "edit_distance(" + repr(a) + ", " + repr(b) + ")",
                            shared_memo_note() or note_when(result, want, note, when))


          shifting = (" Remember that you can insert and delete letters, not only replace them, so "
                      "the letters after a change can shift along.")
          edges = (" Turning a word into an empty one takes one deletion per letter (and the other "
                   "way round, one insertion per letter), so row 0 and column 0 of a table count "
                   "up 0, 1, 2, …")


          @test("edit_distance('lead', 'gold') and edit_distance('kitten', 'sitting') are both 3")
          def _():
              check_edit("lead", "gold", 3)
              check_edit("kitten", "sitting", 3)


          @test("Inserting and deleting letters count too")
          def _():
              check_edit("spell", "spells", 1, shifting, "higher")
              check_edit("spells", "spell", 1, shifting, "higher")
              check_edit("flaw", "lawn", 2, shifting, "higher")
              check_edit("hydra", "dragon", 5, shifting, "higher")


          @test("Turning a word into '' (or '' into a word) costs one drop per letter")
          def _():
              check_edit("", "abc", 3, edges)
              check_edit("abc", "", 3, edges)
              check_edit("", "", 0, edges)


          @test("Identical words cost nothing, and one changed letter costs 1")
          def _():
              check_edit("potion", "potion", 0)
              check_edit("potion", "lotion", 1)
              check_edit("sorcery", "sorcerer", 2)


          @test("Two incantations of over 40 letters, without waking the Hydra")
          def _():
              need_function("edit_distance", 2)
              a = "ABRACADABRAALAKAZAMHOCUSPOCUSPRESTOCHANGEOSHAZAM"
              b = "ALAKAZAMABRACADABRASHAZAMHOCUSPOCUSOPENSESAME"
              with without_waking_the_hydra("edit_distance", 30000, budget=60000):
                  result = need_function("edit_distance")(a, b)
              expect_number(result, 26, "edit_distance(" + repr(a) + ", " + repr(b) + ")")
        `,
        scene: { icon: "⚗️", successIcon: "✨", successText: "The alembic bubbles, and lead turns to gold in exactly three drops of mana.", effect: "bubble" }
      },

      // ------------------------------------------------------------------ 8
      {
        id: "hydra-true-name",
        title: "The Hydra's True Name",
        difficulty: "hard",
        concepts: ["word break", "rebuilding the answer", "memoization"],
        story: [
          "Only the last and greatest head remains. It hisses its true name as one endless string of runes — no spaces, no mercy.",
          "\"Speak it back as words from the ancient lexicon and the Hydra is tamed,\" Ada whispers. \"Many splits lead nowhere, and they branch like heads. Remember the dead ends.\""
        ],
        task: [
          "Write `split_name(name, words)` that splits the string `name` into words from the list `words` and **returns** them as a list, in order. Joined together, the list must give back `name` exactly. A word may be used more than once, and every word has at least one letter.",
          "If there is no way to split `name`, return `None`. An empty `name` splits into an empty list, `[]`.",
          { code: py`
            lexicon = ["cat", "cats", "and", "sand", "dog"]
            print(split_name("catsanddog", lexicon))
            print(split_name("catsandog", lexicon))
          `, output: "['cat', 'sand', 'dog']\nNone" },
          "When several splits work (`['cats', 'and', 'dog']` would be fine too), return any one of them. Names in the trials can be over 100 runes long."
        ],
        lesson: [
          "This final puzzle wants more than a number: it wants the *answer itself*. The DP thinking stays the same. Name the subproblem — *can the rest of the name, from position `i` onwards, be split?* — and notice that position `len(name)` is the base case (nothing left: yes, with zero words), while every other position depends on positions further along.",
          "To rebuild an answer, remember a **choice** for each subproblem, not just its value. Here's the idea applied to an old acquaintance, the Ferryman. Alongside the fewest coins for each fare, store the last coin used; then walk back from the full fare, reading off the coins:",
          { code: py`
            coins, fare = [1, 3, 4], 7
            INF = float("inf")
            fewest = [0] + [INF] * fare
            last = [None] * (fare + 1)          # last[a] = final coin of a best way to pay a
            for a in range(1, fare + 1):
                for c in coins:
                    if c <= a and fewest[a - c] + 1 < fewest[a]:
                        fewest[a] = fewest[a - c] + 1
                        last[a] = c

            paid, a = [], fare
            while a > 0:                        # follow the stored choices back to 0
                paid.append(last[a])
                a -= last[a]
            print(paid)
          `, output: "[3, 4]" },
          "If the fare were impossible, `last[fare]` would still be `None` — exactly the moment to report failure instead of walking back.",
          "For the name, you could store a word for every position that can be split, then follow those words from position 0. Or memoize a helper that returns a whole list of words for the rest of the name, or `None` for a dead end.",
          { warning: "Without memoization, a name like `\"sssssssssssssssssssssssssssssst\"` with the words `\"s\"`, `\"ss\"` and `\"sss\"` makes the Hydra grow heads exponentially: every split leads back to the same dead-end positions, over and over." }
        ],
        starter: py`
          def split_name(name, words):
              # Return a list of words that join up to make name, or None if that's impossible.
              # Hint: the subproblem is "split the rest of the name, starting at position i".
              return None


          print(split_name("catsanddog", ["cat", "cats", "and", "sand", "dog"]))
        `,
        hints: [
          "Work with *positions*. From position `i`, try every word that appears in `name` right there (`name.startswith(word, i)` checks this). If the rest of the name after that word can be split, then so can the name from `i`.",
          "Memoize a helper `split_from(i)` that returns a list of words for `name[i:]`, or `None` if it can't be split. Its base case is `split_from(len(name)) == []`. Thanks to the memo, each dead-end position is explored only once.",
          [
            "Nearly there — what does a successful split from `i` look like?",
            { code: py`
              from functools import lru_cache

              def split_name(name, words):
                  @lru_cache(maxsize=None)
                  def split_from(i):
                      if i == len(name):
                          return []
                      for word in words:
                          if name.startswith(word, i):
                              rest = split_from(i + len(word))
                              if rest is not None:
                                  return ...    # this word, followed by the rest
                      return None
                  return split_from(0)
            ` }
          ]
        ],
        solution: py`
          def split_name(name, words):
              n = len(name)
              ok = [False] * (n + 1)          # ok[i]: can name[i:] be split into words?
              choice = [None] * (n + 1)       # choice[i]: a word that starts such a split
              ok[n] = True                    # nothing left: zero words will do
              for i in range(n - 1, -1, -1):  # right to left, so every ok[later] is ready
                  for word in words:
                      end = i + len(word)
                      if end <= n and ok[end] and name.startswith(word, i):
                          ok[i] = True
                          choice[i] = word
                          break
              if not ok[0]:
                  return None
              result, i = [], 0
              while i < n:                    # follow the remembered choices
                  result.append(choice[i])
                  i += len(choice[i])
              return result


          lexicon = ["cat", "cats", "and", "sand", "dog"]
          print(split_name("catsanddog", lexicon))
          print(split_name("catsandog", lexicon))
        `,
        altSolutions: [
          py`
            from functools import lru_cache

            def split_name(name, words):
                @lru_cache(maxsize=None)
                def split_from(i):
                    if i == len(name):
                        return []
                    for word in words:
                        if name.startswith(word, i):
                            rest = split_from(i + len(word))
                            if rest is not None:
                                return [word] + rest    # a new list: cached lists stay untouched
                    return None
                return split_from(0)
          `,
          py`
            def split_name(name, words, memo=None):
                if memo is None:
                    memo = {}
                if name == "":
                    return []
                if name in memo:
                    return memo[name]
                memo[name] = None                       # a dead end, unless we find a split
                for word in words:
                    if name.startswith(word):
                        rest = split_name(name[len(word):], words, memo)
                        if rest is not None:
                            memo[name] = [word] + rest
                            break
                return memo[name]
          `,
          py`
            def split_name(name, words):
                came_from = {0: None}       # position reached -> (previous position, word)
                for i in range(len(name)):
                    if i not in came_from:
                        continue
                    for word in words:
                        end = i + len(word)
                        if end not in came_from and name.startswith(word, i):
                            came_from[end] = (i, word)
                if len(name) not in came_from:
                    return None
                result, i = [], len(name)
                while i > 0:
                    i, word = came_from[i]
                    result.append(word)
                return result[::-1]
          `
        ],
        wrongSolutions: [
          // Greedy: always the longest word that fits, never backing up.
          py`
            def split_name(name, words):
                result, i = [], 0
                while i < len(name):
                    options = [w for w in words if name.startswith(w, i)]
                    if not options:
                        return None
                    word = max(options, key=len)
                    result.append(word)
                    i += len(word)
                return result
          `,
          // Answers the yes/no question instead of returning the words.
          py`
            def split_name(name, words):
                ok = [False] * (len(name) + 1)
                ok[0] = True
                for i in range(len(name)):
                    if ok[i]:
                        for w in words:
                            if name.startswith(w, i):
                                ok[i + len(w)] = True
                return ok[len(name)]
          `,
          // Naive backtracking: correct, but exponential on dead ends.
          py`
            def split_name(name, words):
                if name == "":
                    return []
                for word in words:
                    if name.startswith(word):
                        rest = split_name(name[len(word):], words)
                        if rest is not None:
                            return [word] + rest
                return None
          `
        ],
        tests: LAIR_TRIALS + py`
          def verify_split(result, name, words, call, example):
              if result is None:
                  fail(code(call) + " returned " + code("None") + ", but this name can be split, for "
                       "example as " + short(example) + "." + shared_memo_note())
              if not isinstance(result, list):
                  fail(code(call) + " should return a list of words, but it returned " + short(result)
                       + " (" + type(result).__name__ + ").")
              for word in result:
                  if not isinstance(word, str):
                      fail(code(call) + " should return a list of strings, but the list contains "
                           + short(word) + ".")
                  if word not in words:
                      fail(code(call) + " returned " + short(result) + ", but " + short(word)
                           + " isn't one of the allowed words." + shared_memo_note())
              joined = "".join(result)
              if joined != name:
                  fail(code(call) + " returned " + short(result) + ", which joins up to "
                       + short(joined) + " instead of " + short(name) + "." + shared_memo_note())


          def expect_no_split(result, name, call):
              if result is not None:
                  fail("There is no way to split " + short(name) + " into those words, so " + code(call)
                       + " should return " + code("None") + ", but it returned " + short(result) + "."
                       + shared_memo_note())


          def check_split(name, words, example):
              call = "split_name(" + short(name, 40) + ", " + short(words, 60) + ")"
              result = call_spell("split_name", 2, name, list(words))
              verify_split(result, name, words, call, example)


          def check_no_split(name, words):
              call = "split_name(" + short(name, 40) + ", " + short(words, 60) + ")"
              result = call_spell("split_name", 2, name, list(words))
              expect_no_split(result, name, call)


          @test("split_name('hydraheads', …) returns a list of words that spells the name")
          def _():
              check_split("hydraheads", ["hydra", "head", "heads", "s"], ["hydra", "heads"])


          @test("When several splits work, any one of them is accepted")
          def _():
              check_split("catsanddog", ["cat", "cats", "and", "sand", "dog"], ["cats", "and", "dog"])
              check_split("pineapplepenapple", ["apple", "pen", "applepen", "pine", "pineapple"],
                          ["pine", "apple", "pen", "apple"])


          @test("Names that can't be split return None")
          def _():
              check_no_split("catsandog", ["cat", "cats", "and", "sand", "dog"])
              check_no_split("hydrahead", ["hydra", "heads", "ahead"])


          @test("Words can repeat, and an empty name splits into []")
          def _():
              check_split("aaaa", ["a", "aa"], ["aa", "aa"])
              check_split("abab", ["ab"], ["ab", "ab"])
              result = call_spell("split_name", 2, "", ["a"])
              expect(isinstance(result, list) and result == [],
                     code('split_name("", ["a"])') + " should return an empty list " + code("[]")
                     + " (zero words join up to an empty name), but it returned " + short(result) + ".")


          @test("Greedy guesses aren't enough: sometimes you must back up and try another word")
          def _():
              check_split("hydrasleeps", ["hydras", "hydra", "sleeps"], ["hydra", "sleeps"])
              check_split("aab", ["a", "aab"], ["aab"])
              check_split("abcd", ["ab", "abc", "cd"], ["ab", "cd"])


          @test("The Hydra's 102-rune true name, and a hiss with no split, without waking the Hydra")
          def _():
              need_function("split_name", 2)
              true_name = ("thehydraofoverlappingsubproblemsbowsbeforeeveryapprentice"
                           "whorememberstheanswerstoquestionsalreadyasked")
              lexicon = ["the", "he", "hydra", "hydras", "a", "of", "over", "overlap", "overlapping",
                         "lapping", "pin", "ping", "sub", "subproblem", "subproblems", "problem",
                         "problems", "s", "bow", "bows", "before", "be", "fore", "every", "very", "ever",
                         "apprentice", "apprentices", "who", "remember", "remembers", "members",
                         "answer", "answers", "to", "question", "questions", "ions", "already", "ready",
                         "ask", "asked", "sked"]
              with without_waking_the_hydra("split_name", 5000, budget=20000):
                  result = call_spell("split_name", None, true_name, list(lexicon))
              verify_split(result, true_name, lexicon, "split_name(true_name, lexicon)",
                           ["the", "hydra", "of", "overlapping", "subproblems", "bows", "before",
                            "every", "apprentice", "who", "remembers", "the", "answers", "to",
                            "questions", "already", "asked"])
              hiss = "s" * 45 + "t"
              with without_waking_the_hydra("split_name", 5000, budget=20000):
                  result = call_spell("split_name", None, hiss, ["s", "ss", "sss", "ssss", "sssss"])
              expect_no_split(result, hiss, "split_name(hiss, ['s', 'ss', 'sss', 'ssss', 'sssss'])")
        `,
        scene: { icon: "🐉", successIcon: "🌟", successText: "You speak the Hydra's true name, and every head bows at once. The Hydra is tamed!", effect: "lightning" }
      }
    ]
  });
})();
