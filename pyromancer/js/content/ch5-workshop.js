/*
 * Chapter 5 — The Golem Workshop (medium → hard)
 * Concepts: classes & objects, __init__ and self, attributes, methods, class attributes,
 * __str__/__repr__, inheritance & super(), overriding, polymorphism, raising and catching
 * exceptions (raise, try/except, except ... as err), magic methods (__add__, __eq__, __lt__,
 * __len__, __contains__, __getitem__, __iter__),
 * @property and composition.
 *
 * Note for trial authors: calling a class or method with the wrong number of arguments
 * (for example a method written without self) raises TypeError at the call itself, inside
 * the trial code, which the harness would report as a crashed trial. The small helpers at
 * the top of each challenge's trials turn those into clear failures that show the expected
 * "def ...(self, ...):" line, and re-raise errors that really happened inside the spell so
 * the harness can explain them as usual.
 */
(function () {
  "use strict";
  var py = SS.py;

  SS.defineChapter({
    id: "workshop",
    order: 5,
    title: "The Golem Workshop",
    subtitle: "Blueprints that come alive",
    icon: "🗿",
    concepts: ["classes & objects", "__init__ & self", "methods", "__str__ / __repr__", "inheritance & super()", "polymorphism", "try / except", "magic methods", "@property"],
    intro: [
      "You follow a trail of tiny clay footprints through the side door marked **Golem Workshop**. Inside, rows of clay and stone golems stand perfectly still, each one waiting for a blueprint and a purpose. Glitch is nowhere to be seen… for now.",
      "Ada unrolls a blueprint. \"In Python, a blueprint is a **class**, and every golem built from it is an **object**. Today you'll write blueprints of your own, teach your golems to turn down nonsense politely, and learn the double-underscore methods that bring them to life. Python programmers really do call them *magic methods*.\""
    ],
    outro: [
      "Your golems march in perfect formation, each one built from a blueprint you wrote. Fire golems forge, familiars sing, golems politely refuse to juggle the cat, potions sort themselves, and the living spellbook purrs on its stand.",
      "Then, behind the last workbench, a trapdoor creaks open onto stairs spiralling down into the dark, and from far below comes a familiar giggle — echoing, and echoing, and echoing. Glitch has slipped into the **Labyrinth of Echoes**. Better bring a lantern… and a stack."
    ],
    challenges: [
      // ------------------------------------------------------------------
      // 1. A class with __init__ and attributes
      // ------------------------------------------------------------------
      {
        id: "workshop-first-golem",
        title: "The First Golem",
        difficulty: "medium",
        concepts: ["class", "__init__", "self", "attributes"],
        story: [
          "The workshop smells of wet clay and hot iron. Ada spreads a fresh sheet of parchment across the bench.",
          "\"Every golem here was built from a blueprint. In Python the blueprint is a **class**, and each golem is an **object**. Draft one for me — and give every golem its own list of runes. Last term two golems shared one list, and the squabbling was legendary.\""
        ],
        task: [
          "Write a class `Golem`. Its `__init__` method takes `name`, `material` and an optional `height` that defaults to `2`, and stores each one in an attribute with the same name. Every golem also gets an attribute `runes`: a **new, empty list** of its own.",
          "Below the class, build these two golems and carve a rune on the first one:",
          { code: py`
            clay = Golem("Clod", "clay")
            stone = Golem("Boulder", "stone", 5)
            clay.runes.append("strength")
          ` },
          "Afterwards `clay.height` is `2`, `stone.height` is `5`, `clay.runes` is `[\"strength\"]` and `stone.runes` is still `[]`."
        ],
        lesson: [
          "A **class** is a blueprint. Calling it like a function builds a new **object** (an *instance*) from it. The special method `__init__` (say \"dunder init\") runs automatically for every new object, to set it up.",
          "Inside a method, `self` is the object being built. Anything you store on `self` becomes an **attribute** that the object keeps, like `self.owner = owner`. A plain variable inside `__init__` vanishes when the method ends.",
          { code: py`
            class Cauldron:
                def __init__(self, owner, size=10):
                    self.owner = owner        # an attribute: this cauldron's owner
                    self.size = size          # optional: 10 unless told otherwise
                    self.ingredients = []     # a brand-new list for this cauldron

            pot = Cauldron("Morgana")         # __init__ runs with owner = "Morgana"
            big = Cauldron("Merlin", 50)
            pot.ingredients.append("newt")
            print(pot.owner, pot.size, pot.ingredients)
            print(big.owner, big.size, big.ingredients)
          `, output: "Morgana 10 ['newt']\nMerlin 50 []" },
          "You never pass `self` yourself: `Cauldron(\"Merlin\", 50)` sends `\"Merlin\"` to `owner` and `50` to `size`. Read or change an attribute with a dot: `pot.size`.",
          { warning: "Create lists inside `__init__`, on `self`. A list written directly in the class body (or as a default value such as `items=[]`) is made only **once** and shared by every object." }
        ],
        starter: py`
          class Golem:
              def __init__(self, name):
                  # Add the other parameters, then store every value on self.
                  pass


          # Build clay and stone here, then carve the rune on clay.
        `,
        hints: [
          "`__init__` needs a parameter for each value you pass when building a golem, after `self`. A parameter with a default value, like `size=10` in the Cauldron example, is optional.",
          "Inside `__init__`, store each value on the object being built, for example `self.name = name`. The runes list must be created there too, so that every golem gets a fresh one.",
          "`def __init__(self, name, material, height=2):`, then `self.name = name`, `self.material = material`, `self.height = height` and `self.runes = []`. After the class (back at the left margin), write the three lines from the task."
        ],
        solution: py`
          class Golem:
              def __init__(self, name, material, height=2):
                  self.name = name
                  self.material = material
                  self.height = height
                  self.runes = []        # a new list for every golem


          clay = Golem("Clod", "clay")
          stone = Golem("Boulder", "stone", 5)
          clay.runes.append("strength")
        `,
        altSolutions: [
          py`
            # The "None default" idiom: the list is created fresh on every call.
            class Golem:
                def __init__(self, name, material, height=2, runes=None):
                    self.name = name
                    self.material = material
                    self.height = height
                    if runes is None:
                        runes = []
                    self.runes = runes


            clay = Golem("Clod", "clay")
            stone = Golem(name="Boulder", material="stone", height=5)
            clay.runes.append("strength")
            print(clay.name, clay.runes, stone.name, stone.runes)
          `,
          py`
            class Golem:
                def __init__(self, name, material, height=2):
                    self.name, self.material, self.height = name, material, height
                    self.runes = list()


            clay = Golem("Clod", "clay")
            stone = Golem("Boulder", "stone", height=5)
            clay.runes += ["strength"]
          `
        ],
        wrongSolutions: [
          py`
            # The list lives in the class body, so every golem shares it.
            class Golem:
                runes = []

                def __init__(self, name, material, height=2):
                    self.name = name
                    self.material = material
                    self.height = height


            clay = Golem("Clod", "clay")
            stone = Golem("Boulder", "stone", 5)
            clay.runes.append("strength")
          `,
          py`
            # A mutable default value: one list, made once, shared by every golem.
            class Golem:
                def __init__(self, name, material, height=2, runes=[]):
                    self.name = name
                    self.material = material
                    self.height = height
                    self.runes = runes


            clay = Golem("Clod", "clay")
            stone = Golem("Boulder", "stone", 5)
            clay.runes.append("strength")
          `,
          py`
            # height is required and always set to 2.
            class Golem:
                def __init__(self, name, material, height):
                    self.name = name
                    self.material = material
                    self.height = 2
                    self.runes = []


            clay = Golem("Clod", "clay", 2)
            stone = Golem("Boulder", "stone", 5)
            clay.runes.append("strength")
          `
        ],
        tests: py`
          import traceback as _traceback


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def build(*args):
              Golem = need_class("Golem")
              try:
                  return Golem(*args)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  said = str(exc)
                  label = code("Golem(" + ", ".join(short(a) for a in args) + ")")
                  if "takes no arguments" in said:
                      fail("Python couldn't build " + label + ": " + said + ". That usually means the class has no "
                           + code("__init__") + " method: check the spelling, with two underscores on each side of "
                           + code("init") + ".")
                  note = (" (Python counts " + code("self") + " as one of the arguments)") if "given" in said else ""
                  fail("Python couldn't build " + label + ": " + said + ". The method should start "
                       + code("def __init__(self, name, material, height=2):") + note + ".")


          def height_note(golem, want):
              # Point at the likely cause when a golem's height is always the default.
              got = need_attr(golem, "height")
              if got != want and got == 2:
                  return (" It looks like every golem gets height 2, whatever it was given: store the parameter with "
                          + code("self.height = height") + ", and let the default in " + code("height=2")
                          + " cover the golems built without one.")
              return ""


          @test('Golem("Pebble", "sand", 3) keeps its own name, material and height')
          def _():
              pebble = build("Pebble", "sand", 3)
              expect_equal(need_attr(pebble, "name"), "Pebble", "The golem's " + code("name") + " is wrong.")
              expect_equal(need_attr(pebble, "material"), "sand", "The golem's " + code("material") + " is wrong.")
              expect_equal(need_attr(pebble, "height"), 3, "The golem's " + code("height") + " is wrong." + height_note(pebble, 3))
              build("Granite", "rock", 9)
              expect_equal((pebble.name, pebble.material, pebble.height), ("Pebble", "sand", 3),
                           "Building a second golem changed the first one! Store each value on the object being built ("
                           + code("self.name = name") + "), not on the class.")


          @test('height is optional: Golem("Moss", "earth") is 2 tall')
          def _():
              moss = build("Moss", "earth")
              expect_equal(need_attr(moss, "height"), 2, "A golem built without a height should be 2 tall.")
              expect_equal(need_attr(moss, "material"), "earth", "The golem's " + code("material") + " is wrong.")


          @test("clay and stone are built as the task says, with the rune on clay only")
          def _():
              Golem = need_class("Golem")
              clay = need("clay")
              stone = need("stone")
              expect(isinstance(clay, Golem), code("clay") + " should be a golem built with "
                     + code('Golem("Clod", "clay")') + ", but it's " + short(clay) + ".")
              expect(isinstance(stone, Golem), code("stone") + " should be a golem built with "
                     + code('Golem("Boulder", "stone", 5)') + ", but it's " + short(stone) + ".")
              expect_equal((need_attr(clay, "name"), need_attr(clay, "material"), need_attr(clay, "height")),
                           ("Clod", "clay", 2), "The name, material and height of " + code("clay") + " are wrong.")
              expect_equal((need_attr(stone, "name"), need_attr(stone, "material"), need_attr(stone, "height")),
                           ("Boulder", "stone", 5), "The name, material and height of " + code("stone") + " are wrong."
                           + height_note(stone, 5))
              for label, golem in (("clay.runes", clay), ("stone.runes", stone)):
                  runes = need_attr(golem, "runes")
                  expect(isinstance(runes, list), code(label) + " should be a list, but it's " + short(runes) + ".")
              expect_equal(clay.runes, ["strength"], code("clay.runes") + " should hold the one rune you carved.")
              expect_equal(stone.runes, [], code("stone.runes") + " should still be empty: you only carved a rune on "
                           + code("clay") + ". If stone has it too, the two golems are sharing one list. Create the list inside "
                           + code("__init__") + " with " + code("self.runes = []") + ".")


          @test("Every new golem gets its own, empty runes list")
          def _():
              flint = build("Flint", "stone")
              fern = build("Fern", "moss")
              runes = need_attr(flint, "runes")
              expect(isinstance(runes, list), code("runes") + " should be a list, but it's " + short(runes) + ".")
              expect(need_attr(fern, "runes") is not runes,
                     "Two golems are sharing one runes list! A list written in the class body, or as a default value like "
                     + code("runes=[]") + ", is created only once. Make a new one in " + code("__init__") + ": "
                     + code("self.runes = []") + ".")
              expect_equal(runes, [], "A brand-new golem's " + code("runes") + " should be empty.")
        `,
        scene: { icon: "🗿", successIcon: "👋", successText: "Clod and Boulder blink awake and wave hello!", effect: "rise" }
      },

      // ------------------------------------------------------------------
      // 2. Methods that change state and return values; a class attribute
      // ------------------------------------------------------------------
      {
        id: "workshop-heavy-lifting",
        title: "Heavy Lifting",
        difficulty: "medium",
        concepts: ["methods", "object state", "class attributes"],
        story: [
          "A mountain of crates has arrived, and the golems are itching to help.",
          "\"Strong arms aren't enough,\" Ada warns. \"A golem that lifts too much simply topples over. Teach them their limits: refuse a crate that's too heavy, tire as they work, and rest.\" She pats a dozing golem. \"Even clay needs a nap.\""
        ],
        task: [
          "Write a class `Golem` with:",
          { list: [
            "a **class attribute** `MAX_ENERGY = 10`;",
            "`__init__(self, name, strength)`: store `name` and `strength`; start `energy` at `MAX_ENERGY` and `lifted` at `0`;",
            "`lift(self, weight)`: if `weight` is no more than the golem's `strength` **and** no more than its `energy`, subtract it from `energy`, add it to `lifted` and return `True`. Otherwise change nothing and return `False`;",
            "`rest(self, hours)`: add 3 `energy` per hour, but never go above `MAX_ENERGY`. Return the new `energy`."
          ] },
          "Use the class attribute: write `10` only in `MAX_ENERGY = 10`.",
          { code: py`
            clod = Golem("Clod", 6)
            clod.lift(4)     # True:  energy 6, lifted 4
            clod.lift(7)     # False: too heavy for strength 6
            clod.lift(6)     # True:  energy 0, lifted 10
            clod.lift(1)     # False: no energy left
            clod.rest(2)     # 6
            clod.rest(5)     # 10, never above MAX_ENERGY
          ` }
        ],
        lesson: [
          "A **method** is a function defined inside a class. Its first parameter is always `self`, the object the method was called on, so it can read and change that object's attributes. Python fills in `self` for you: `purse.spend(4)` runs `spend` with `self` set to `purse` and `price` set to `4`.",
          "A method can change the object's state (`self.coins -= cost`) **and** `return` a result to the caller, just like a function.",
          { code: py`
            class CoinPurse:
                FEE = 1                        # a class attribute: shared by every purse

                def __init__(self, owner, coins):
                    self.owner = owner         # instance attributes: each purse has its own
                    self.coins = coins

                def spend(self, price):
                    cost = price + CoinPurse.FEE
                    if cost > self.coins:
                        return False           # can't afford it: change nothing
                    self.coins -= cost
                    return True

            purse = CoinPurse("Pip", 10)
            print(purse.spend(4), purse.coins)
            print(purse.spend(9), purse.coins)
          `, output: "True 5\nFalse 5" },
          "A **class attribute** is written directly in the class body. There is just one, shared by the class and all its objects; read it as `CoinPurse.FEE` or `self.FEE`. It's ideal for constants: change it in one place and every object follows."
        ],
        starter: py`
          class Golem:
              # Add the class attribute MAX_ENERGY here.

              def __init__(self, name, strength):
                  self.name = name
                  self.strength = strength
                  # Every golem starts with full energy and nothing lifted yet.

              def lift(self, weight):
                  pass

              def rest(self, hours):
                  pass
        `,
        hints: [
          "Put `MAX_ENERGY = 10` directly in the class body, above `__init__`. Inside the methods, read it as `Golem.MAX_ENERGY` (or `self.MAX_ENERGY`).",
          "In `lift`, first check whether the golem *can't* manage (too heavy **or** too tired) and `return False` straight away. Only after that check, change `self.energy` and `self.lifted`, then `return True`.",
          "`lift`: `if weight > self.strength or weight > self.energy: return False`, then `self.energy -= weight`, `self.lifted += weight` and `return True`. `rest`: `self.energy = min(self.energy + 3 * hours, Golem.MAX_ENERGY)`, then `return self.energy`."
        ],
        solution: py`
          class Golem:
              MAX_ENERGY = 10                     # shared by every golem

              def __init__(self, name, strength):
                  self.name = name
                  self.strength = strength
                  self.energy = Golem.MAX_ENERGY  # start fully charged
                  self.lifted = 0

              def lift(self, weight):
                  if weight > self.strength or weight > self.energy:
                      return False                # too heavy or too tired: change nothing
                  self.energy -= weight
                  self.lifted += weight
                  return True

              def rest(self, hours):
                  self.energy = min(self.energy + 3 * hours, Golem.MAX_ENERGY)
                  return self.energy
        `,
        altSolutions: [
          py`
            class Golem:
                MAX_ENERGY = 10

                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = self.MAX_ENERGY
                    self.lifted = 0

                def lift(self, weight):
                    if weight <= self.strength and weight <= self.energy:
                        self.energy = self.energy - weight
                        self.lifted = self.lifted + weight
                        return True
                    else:
                        return False

                def rest(self, hours):
                    for hour in range(hours):
                        self.energy += 3
                    if self.energy > self.MAX_ENERGY:
                        self.energy = self.MAX_ENERGY
                    return self.energy
          `,
          py`
            class Golem:
                MAX_ENERGY = 10

                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = type(self).MAX_ENERGY
                    self.lifted = 0

                def can_lift(self, weight):
                    return weight <= min(self.strength, self.energy)

                def lift(self, weight):
                    able = self.can_lift(weight)
                    if able:
                        self.energy -= weight
                        self.lifted += weight
                    return able

                def rest(self, hours):
                    self.energy = min(type(self).MAX_ENERGY, self.energy + hours * 3)
                    return self.energy
          `
        ],
        wrongSolutions: [
          py`
            # Only checks the strength, so energy can go below zero.
            class Golem:
                MAX_ENERGY = 10

                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = Golem.MAX_ENERGY
                    self.lifted = 0

                def lift(self, weight):
                    if weight > self.strength:
                        return False
                    self.energy -= weight
                    self.lifted += weight
                    return True

                def rest(self, hours):
                    self.energy = min(self.energy + 3 * hours, Golem.MAX_ENERGY)
                    return self.energy
          `,
          py`
            # rest() prints the energy instead of returning it.
            class Golem:
                MAX_ENERGY = 10

                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = Golem.MAX_ENERGY
                    self.lifted = 0

                def lift(self, weight):
                    if weight > self.strength or weight > self.energy:
                        return False
                    self.energy -= weight
                    self.lifted += weight
                    return True

                def rest(self, hours):
                    self.energy = min(self.energy + 3 * hours, Golem.MAX_ENERGY)
                    print(self.energy)
          `,
          py`
            # Hard-codes 10 instead of using the class attribute.
            class Golem:
                MAX_ENERGY = 10

                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = 10
                    self.lifted = 0

                def lift(self, weight):
                    if weight > self.strength or weight > self.energy:
                        return False
                    self.energy -= weight
                    self.lifted += weight
                    return True

                def rest(self, hours):
                    self.energy = min(self.energy + 3 * hours, 10)
                    return self.energy
          `
        ],
        tests: py`
          import traceback as _traceback

          SHAPES = {
              "__init__": "def __init__(self, name, strength):",
              "lift": "def lift(self, weight):",
              "rest": "def rest(self, hours):",
          }


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def _cannot(what, method, exc):
              fail("Python couldn't run " + code(what) + ": " + str(exc) + ". The method should start "
                   + code(SHAPES[method]) + " (every method's first parameter is " + code("self") + ").")


          def build(name, strength):
              Golem = need_class("Golem")
              try:
                  return Golem(name, strength)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  _cannot("Golem(" + short(name) + ", " + short(strength) + ")", "__init__", exc)


          def act(golem, method, amount):
              func = need_method(golem, method)
              try:
                  return func(amount)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  _cannot(method + "(" + str(amount) + ")", method, exc)


          def energy(golem):
              return need_attr(golem, "energy")


          def lifted(golem):
              return need_attr(golem, "lifted")


          @test("A new golem has its name and strength, energy 10 and lifted 0")
          def _():
              Golem = need_class("Golem")
              expect("MAX_ENERGY" in vars(Golem), code("Golem") + " needs a class attribute " + code("MAX_ENERGY = 10")
                     + ", written directly inside the class (above " + code("__init__") + ", not inside it).")
              expect_equal(Golem.MAX_ENERGY, 10, code("Golem.MAX_ENERGY") + " should be 10.")
              clod = build("Clod", 6)
              expect_equal(need_attr(clod, "name"), "Clod", "The golem's " + code("name") + " is wrong.")
              expect_equal(need_attr(clod, "strength"), 6, "The golem's " + code("strength") + " is wrong.")
              expect_equal(energy(clod), 10, "A new golem should start with full energy.")
              expect_equal(lifted(clod), 0, "A new golem hasn't lifted anything yet, so " + code("lifted") + " should be 0.")


          @test("lift() returns True and uses up energy when the golem can manage")
          def _():
              clod = build("Clod", 6)
              expect_equal(act(clod, "lift", 4), True, "Clod (strength 6, energy 10) can lift 4, so "
                           + code("lift(4)") + " should return True.")
              expect_equal(energy(clod), 6, "After lifting 4, energy should drop from 10 to 6.")
              expect_equal(lifted(clod), 4, "After lifting 4, " + code("lifted") + " should be 4.")
              expect_equal(act(clod, "lift", 6), True, "Clod now has strength 6 and energy 6, so " + code("lift(6)")
                           + " is allowed (no more than includes equal to) and should return True.")
              expect_equal(energy(clod), 0, "After lifting 4 and then 6, energy should be 0.")
              expect_equal(lifted(clod), 10, "After lifting 4 and then 6, " + code("lifted") + " should be 10.")


          @test("lift() returns False and changes nothing when the crate is too heavy or the golem too tired")
          def _():
              clod = build("Clod", 6)
              expect_equal(act(clod, "lift", 7), False, "Clod has strength 6, so " + code("lift(7)") + " should return False.")
              expect_equal(energy(clod), 10, "A refused lift must not use any energy.")
              expect_equal(lifted(clod), 0, "A refused crate must not count as lifted.")
              basalt = build("Basalt", 8)
              expect_equal(act(basalt, "lift", 8), True, "Basalt (strength 8, energy 10) can lift 8, so "
                           + code("lift(8)") + " should return True.")
              expect_equal(act(basalt, "lift", 3), False, "Basalt is strong enough for 3 but has only 2 energy left, so "
                           + code("lift(3)") + " should return False. Check the energy as well as the strength.")
              expect_equal(energy(basalt), 2, "A refused lift must not use any energy.")
              expect_equal(lifted(basalt), 8, "A refused crate must not count as lifted.")


          @test("rest() adds 3 energy per hour, returns the new energy and stops at MAX_ENERGY")
          def _():
              sandy = build("Sandy", 10)
              expect_equal(act(sandy, "lift", 10), True, "Sandy (strength 10, energy 10) can lift 10, so "
                           + code("lift(10)") + " should return True.")
              expect_equal(act(sandy, "rest", 1), 3, "From 0 energy, " + code("rest(1)") + " should return the new energy, 3.")
              expect_equal(energy(sandy), 3, "After resting for 1 hour from 0, energy should be 3.")
              expect_equal(act(sandy, "rest", 2), 9, "From 3 energy, " + code("rest(2)") + " should return 9.")
              expect_equal(act(sandy, "rest", 1), 10, "From 9 energy, " + code("rest(1)")
                           + " should stop at MAX_ENERGY and return 10.")
              expect_equal(act(sandy, "rest", 4), 10, "Energy never goes above MAX_ENERGY, so " + code("rest(4)")
                           + " at full energy should return 10.")
              expect_equal(energy(sandy), 10, "Energy should never go above MAX_ENERGY (10).")


          @test("Each golem has its own energy, and MAX_ENERGY is used instead of a hard-coded 10")
          def _():
              ash, birch = build("Ash", 9), build("Birch", 9)
              act(ash, "lift", 9)
              expect_equal(energy(birch), 10, "Lifting with one golem tired out another! Change "
                           + code("self.energy") + ", not " + code("Golem.energy") + ".")
              Golem = need_class("Golem")
              expect("MAX_ENERGY" in vars(Golem), code("Golem") + " needs a class attribute " + code("MAX_ENERGY = 10") + ".")
              saved = Golem.MAX_ENERGY
              Golem.MAX_ENERGY = 20
              try:
                  titan = build("Titan", 30)
                  start = energy(titan)
                  act(titan, "lift", 15)
                  top = act(titan, "rest", 10)
              finally:
                  Golem.MAX_ENERGY = saved
              expect_equal(start, 20, "This trial changed " + code("Golem.MAX_ENERGY") + " to 20, so a new golem should start with 20 energy. In "
                           + code("__init__") + ", use " + code("Golem.MAX_ENERGY") + " (or " + code("self.MAX_ENERGY") + ") instead of 10.")
              expect_equal(top, 20, "This trial changed " + code("Golem.MAX_ENERGY") + " to 20, so " + code("rest()")
                           + " should stop at 20. In " + code("rest") + ", use " + code("Golem.MAX_ENERGY") + " instead of 10.")
        `,
        scene: { icon: "📦", successIcon: "💪", successText: "Crates thud neatly onto the shelves, and the golem settles down for a well-earned nap.", effect: "shake" }
      },

      // ------------------------------------------------------------------
      // 3. __str__ and __repr__
      // ------------------------------------------------------------------
      {
        id: "workshop-name-plates",
        title: "Name Plates",
        difficulty: "medium",
        concepts: ["__str__", "__repr__", "magic methods"],
        story: [
          "Overnight, Glitch pried the name plates off every golem. Now, when you ask one who it is, it answers: `<__main__.Golem object at 0x7f3a2c41d0f0>`.",
          "\"Charming,\" Ada says drily. \"Python asks an object how to turn itself into text. Teach our golems two answers: a friendly one for people, and a precise one for programmers.\""
        ],
        task: [
          "The `Golem` class below already has `__init__(self, name, material, level)`. Add two methods that **return** (not print) strings built from the golem's current attributes:",
          { list: [
            "`__str__`, the friendly name plate: `Clod the clay golem (level 3)`",
            "`__repr__`, the code that would rebuild the golem: `Golem('Clod', 'clay', 3)`"
          ] },
          { code: py`
            clod = Golem("Clod", "clay", 3)
            print(clod)                                 # uses __str__
            print(repr(clod))                           # uses __repr__
            print([clod, Golem("Rocky", "stone", 1)])   # lists use __repr__
          `, output: "Clod the clay golem (level 3)\nGolem('Clod', 'clay', 3)\n[Golem('Clod', 'clay', 3), Golem('Rocky', 'stone', 1)]" }
        ],
        lesson: [
          "Methods whose names start and end with two underscores are called *dunder* (double underscore) or *magic* methods: you define them, and Python calls them for you at the right moment. You've met `__init__`; two more decide how an object becomes text:",
          { list: [
            "`__str__(self)` is the friendly version, for people. `print(obj)`, `str(obj)` and f-strings use it.",
            "`__repr__(self)` is the precise version, for programmers: ideally the code that would rebuild the object. `repr(obj)` uses it, and so does a list (or dict) when it shows the objects inside it."
          ] },
          { code: py`
            class Scroll:
                def __init__(self, title, pages):
                    self.title = title
                    self.pages = pages

                def __str__(self):
                    return f"A scroll of {self.title}, {self.pages} pages long"

                def __repr__(self):
                    return f"Scroll({self.title!r}, {self.pages!r})"

            fire = Scroll("Fire", 12)
            print(fire)
            print([fire])
          `, output: "A scroll of Fire, 12 pages long\n[Scroll('Fire', 12)]" },
          "Inside an f-string, `{value!r}` inserts `repr(value)`: strings get their quotes, numbers stay as they are.",
          { warning: "Both methods must `return` the string. If `__str__` prints instead, it returns `None`, and `print(golem)` then fails with `TypeError: __str__ returned non-string (type NoneType)`." }
        ],
        starter: py`
          class Golem:
              def __init__(self, name, material, level):
                  self.name = name
                  self.material = material
                  self.level = level

              # Add __str__ and __repr__ here. Each one must RETURN a string.


          clod = Golem("Clod", "clay", 3)
          print(clod)
          print([clod])
        `,
        hints: [
          "Both are ordinary methods inside the class: `def __str__(self):` and `def __repr__(self):`, with two underscores on each side. Each builds a string from `self.name`, `self.material` and `self.level` and returns it.",
          "For `__str__`, an f-string does the job: `return f\"{self.name} the ... golem (level ...)\"`, with the gaps filled by attributes.",
          "For `__repr__`, use `!r` so that the strings get their quotes: `return f\"Golem({self.name!r}, {self.material!r}, {self.level!r})\"`."
        ],
        solution: py`
          class Golem:
              def __init__(self, name, material, level):
                  self.name = name
                  self.material = material
                  self.level = level

              def __str__(self):
                  return f"{self.name} the {self.material} golem (level {self.level})"

              def __repr__(self):
                  return f"Golem({self.name!r}, {self.material!r}, {self.level!r})"


          clod = Golem("Clod", "clay", 3)
          print(clod)
          print([clod])
        `,
        altSolutions: [
          py`
            class Golem:
                def __init__(self, name, material, level):
                    self.name = name
                    self.material = material
                    self.level = level

                def __str__(self):
                    return self.name + " the " + self.material + " golem (level " + str(self.level) + ")"

                def __repr__(self):
                    return "Golem(" + repr(self.name) + ", " + repr(self.material) + ", " + repr(self.level) + ")"
          `,
          py`
            class Golem:
                def __init__(self, name, material, level):
                    self.name = name
                    self.material = material
                    self.level = level

                def __repr__(self):
                    return f"Golem('{self.name}', '{self.material}', {self.level})"

                def __str__(self):
                    return "{} the {} golem (level {})".format(self.name, self.material, self.level)


            print(Golem("Clod", "clay", 3))
          `
        ],
        wrongSolutions: [
          py`
            # __str__ prints the plate instead of returning it.
            class Golem:
                def __init__(self, name, material, level):
                    self.name = name
                    self.material = material
                    self.level = level

                def __str__(self):
                    print(f"{self.name} the {self.material} golem (level {self.level})")

                def __repr__(self):
                    return f"Golem({self.name!r}, {self.material!r}, {self.level!r})"
          `,
          py`
            # Only __repr__, and it returns the friendly text.
            class Golem:
                def __init__(self, name, material, level):
                    self.name = name
                    self.material = material
                    self.level = level

                def __repr__(self):
                    return f"{self.name} the {self.material} golem (level {self.level})"
          `,
          py`
            # The text is worked out once, in __init__, so it goes stale.
            class Golem:
                def __init__(self, name, material, level):
                    self.name = name
                    self.material = material
                    self.level = level
                    self.plate = f"{name} the {material} golem (level {level})"
                    self.code = f"Golem({name!r}, {material!r}, {level!r})"

                def __str__(self):
                    return self.plate

                def __repr__(self):
                    return self.code
          `
        ],
        tests: py`
          import traceback as _traceback


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def build(name, material, level):
              Golem = need_class("Golem")
              try:
                  return Golem(name, material, level)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't build " + code("Golem(" + short(name) + ", " + short(material) + ", " + short(level) + ")")
                       + ": " + str(exc) + ". Keep the given " + code("def __init__(self, name, material, level):") + ".")


          def text_of(golem, method):
              # Call __str__ or __repr__ directly and make sure it returned a string.
              expect(has_own_method(type(golem), method), code("Golem") + " needs its own " + code(method)
                     + " method (two underscores on each side of the name).")
              try:
                  result = getattr(golem, method)()
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't call " + code(method) + ": " + str(exc) + ". It should start "
                       + code("def " + method + "(self):") + ".")
              if result is None:
                  fail("Your " + code(method) + " returned " + code("None") + ". It must " + code("return")
                       + " the text; printing it isn't enough.")
              expect(isinstance(result, str), "Your " + code(method) + " must return a string, but it returned " + short(result) + ".")
              return result


          def same_code(actual, expected):
              # Accept either quote style: Golem('Clod', ...) or Golem("Clod", ...).
              return actual in (expected, expected.replace("'", '"'))


          @test("str(golem) gives the name plate, like: Clod the clay golem (level 3)")
          def _():
              clod = build("Clod", "clay", 3)
              expect_equal(text_of(clod, "__str__"), "Clod the clay golem (level 3)",
                           code('str(Golem("Clod", "clay", 3))') + " is wrong.")
              moss = build("Moss", "earth", 1)
              expect_equal(text_of(moss, "__str__"), "Moss the earth golem (level 1)",
                           code('str(Golem("Moss", "earth", 1))') + " is wrong.")


          @test("print() and f-strings show the name plate, exactly once")
          def _():
              flint = build("Flint", "stone", 7)
              text_of(flint, "__str__")
              result, printed = capture(print, flint)
              expect_output("Flint the stone golem (level 7)", printed,
                            code("print(flint)") + " should show its name plate exactly once (" + code("__str__")
                            + " should return the text, not print it).")
              expect_equal(f"Meet {flint}!", "Meet Flint the stone golem (level 7)!", "f-strings use " + code("__str__") + " too.")


          @test("repr(golem) is the code that rebuilds it: Golem('Clod', 'clay', 3)")
          def _():
              for args in (("Clod", "clay", 3), ("Rocky", "stone", 12)):
                  want = "Golem(" + ", ".join(repr(a) for a in args) + ")"
                  got = text_of(build(*args), "__repr__")
                  expect(same_code(got, want), code("repr(" + want + ")") + " should be " + code(want) + ", but it's "
                         + short(got) + ".")


          @test("A list of golems shows each one with __repr__")
          def _():
              clod, rocky = build("Clod", "clay", 3), build("Rocky", "stone", 1)
              text_of(clod, "__repr__")
              text_of(rocky, "__repr__")
              shown = str([clod, rocky])
              want = "[Golem('Clod', 'clay', 3), Golem('Rocky', 'stone', 1)]"
              expect(same_code(shown, want), code("print([clod, rocky])") + " should show " + code(want) + ", but it shows "
                     + short(shown) + ". Lists show the objects inside them with " + code("__repr__") + ".")


          @test("The plates keep up when a golem changes (level up!)")
          def _():
              pebble = build("Pebble", "sand", 1)
              text_of(pebble, "__str__")
              text_of(pebble, "__repr__")
              need_attr(pebble, "name")
              need_attr(pebble, "level")
              pebble.name = "Big Pebble"
              pebble.level = 2
              expect_equal(text_of(pebble, "__str__"), "Big Pebble the sand golem (level 2)",
                           "After the golem's name and level changed, its name plate should change too. Build the text inside "
                           + code("__str__") + " from the current attributes, not once in " + code("__init__") + ".")
              got = text_of(pebble, "__repr__")
              expect(same_code(got, "Golem('Big Pebble', 'sand', 2)"), "After the golem's name and level changed, "
                     + code("repr()") + " should give " + code("Golem('Big Pebble', 'sand', 2)") + ", but it gives " + short(got) + ".")
        `,
        scene: { icon: "🏷️", successIcon: "✨", successText: "Every golem's name plate glows with its true name!", effect: "manifest" }
      },

      // ------------------------------------------------------------------
      // 4. Inheritance, super().__init__, overriding and extending
      // ------------------------------------------------------------------
      {
        id: "workshop-fire-golem",
        title: "Forged in Fire",
        difficulty: "medium",
        concepts: ["inheritance", "super()", "overriding"],
        story: [
          "The forge roars. Ada wants a new kind of golem: one that works the anvil instead of hauling stones.",
          "\"Don't start from scratch,\" she says. \"A fire golem *is a* golem: same name, same strength, same need for rest. Let it **inherit** all that, and change only what's different. Copied code is where bugs breed.\""
        ],
        task: [
          "Below the given `Golem` class (don't change it), write `class FireGolem(Golem):` with:",
          { list: [
            "`__init__(self, name, strength, heat)`: call `super().__init__(name, strength)` so Golem sets up its part, then store `heat`;",
            "its own `work()`, overriding Golem's: it uses **3** energy and returns `\"<name> forges a blade at <heat> degrees.\"`;",
            "its own `describe()`, extending Golem's: return `super().describe()` followed by `\", heat <heat>\"`."
          ] },
          "Everything else, like `rest()`, should simply be inherited: don't copy it.",
          { code: py`
            ember = FireGolem("Ember", 5, 900)
            ember.work()       # 'Ember forges a blade at 900 degrees.'
            ember.describe()   # 'Ember: strength 5, energy 7, heat 900'
            ember.rest()       # inherited from Golem: energy back to 10
          ` }
        ],
        lesson: [
          "**Inheritance** builds a new class on top of an existing one. Put the parent in brackets, `class Penguin(Bird):`, and the child gets every method of the parent for free. To **override** a method, define one with the same name in the child.",
          "`super()` reaches the parent's version of a method. Call it in the child's `__init__` so the parent can set up its part, and in any method you want to *extend* rather than replace.",
          { code: py`
            class Bird:
                def __init__(self, name):
                    self.name = name

                def move(self):
                    return f"{self.name} flies."

                def info(self):
                    return f"A bird called {self.name}"

            class Penguin(Bird):
                def __init__(self, name, fish):
                    super().__init__(name)      # Bird sets self.name
                    self.fish = fish            # then the Penguin part

                def move(self):                 # override: replace completely
                    return f"{self.name} waddles."

                def info(self):                 # extend: build on Bird's version
                    return super().info() + f" who eats {self.fish} fish a day"

            pingu = Penguin("Pingu", 4)
            print(pingu.move())
            print(pingu.info())
          `, output: "Pingu waddles.\nA bird called Pingu who eats 4 fish a day" },
          { tip: "If the child's `__init__` never calls `super().__init__(...)`, the parent's `__init__` never runs, and attributes such as `self.name` simply don't exist." }
        ],
        starter: py`
          class Golem:
              def __init__(self, name, strength):
                  self.name = name
                  self.strength = strength
                  self.energy = 10

              def work(self):
                  self.energy -= 2
                  return f"{self.name} hauls stones."

              def rest(self):
                  self.energy = 10

              def describe(self):
                  return f"{self.name}: strength {self.strength}, energy {self.energy}"


          # Don't change Golem. Write FireGolem below.
          class FireGolem(Golem):
              pass
        `,
        hints: [
          "Look at the Penguin in the Spell Scroll: FireGolem follows the same pattern, with its own `__init__`, one method replaced (`work`) and one extended (`describe`).",
          "In `__init__(self, name, strength, heat)`, let Golem set up its part first with `super().__init__(name, strength)`, then store `self.heat`. `work()` replaces Golem's completely: subtract 3 from `self.energy` and return the forging sentence.",
          "`work()`: `self.energy -= 3`, then `return f\"{self.name} forges a blade at {self.heat} degrees.\"`. `describe()` asks Golem for its part: `return super().describe() + f\", heat {self.heat}\"`."
        ],
        solution: py`
          class Golem:
              def __init__(self, name, strength):
                  self.name = name
                  self.strength = strength
                  self.energy = 10

              def work(self):
                  self.energy -= 2
                  return f"{self.name} hauls stones."

              def rest(self):
                  self.energy = 10

              def describe(self):
                  return f"{self.name}: strength {self.strength}, energy {self.energy}"


          class FireGolem(Golem):
              def __init__(self, name, strength, heat):
                  super().__init__(name, strength)   # Golem sets name, strength and energy
                  self.heat = heat

              def work(self):                        # override: a different job
                  self.energy -= 3
                  return f"{self.name} forges a blade at {self.heat} degrees."

              def describe(self):                    # extend Golem's description
                  return super().describe() + f", heat {self.heat}"
        `,
        altSolutions: [
          py`
            class Golem:
                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = 10

                def work(self):
                    self.energy -= 2
                    return f"{self.name} hauls stones."

                def rest(self):
                    self.energy = 10

                def describe(self):
                    return f"{self.name}: strength {self.strength}, energy {self.energy}"


            # Naming the parent directly works too (super() is the usual choice).
            class FireGolem(Golem):
                def __init__(self, name, strength, heat):
                    self.heat = heat
                    Golem.__init__(self, name, strength)

                def work(self):
                    self.energy = self.energy - 3
                    return self.name + " forges a blade at " + str(self.heat) + " degrees."

                def describe(self):
                    golem_part = Golem.describe(self)
                    return golem_part + ", heat " + str(self.heat)


            ember = FireGolem("Ember", 5, 900)
            print(ember.work())
            print(ember.describe())
          `
        ],
        wrongSolutions: [
          py`
            class Golem:
                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = 10

                def work(self):
                    self.energy -= 2
                    return f"{self.name} hauls stones."

                def rest(self):
                    self.energy = 10

                def describe(self):
                    return f"{self.name}: strength {self.strength}, energy {self.energy}"


            # Copies Golem's __init__ lines instead of calling super().__init__.
            class FireGolem(Golem):
                def __init__(self, name, strength, heat):
                    self.name = name
                    self.strength = strength
                    self.energy = 10
                    self.heat = heat

                def work(self):
                    self.energy -= 3
                    return f"{self.name} forges a blade at {self.heat} degrees."

                def describe(self):
                    return super().describe() + f", heat {self.heat}"
          `,
          py`
            class Golem:
                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = 10

                def work(self):
                    self.energy -= 2
                    return f"{self.name} hauls stones."

                def rest(self):
                    self.energy = 10

                def describe(self):
                    return f"{self.name}: strength {self.strength}, energy {self.energy}"


            # Forgets super().__init__, so name, strength and energy are never set.
            class FireGolem(Golem):
                def __init__(self, name, strength, heat):
                    self.heat = heat

                def work(self):
                    self.energy -= 3
                    return f"{self.name} forges a blade at {self.heat} degrees."

                def describe(self):
                    return super().describe() + f", heat {self.heat}"
          `,
          py`
            class Golem:
                def __init__(self, name, strength):
                    self.name = name
                    self.strength = strength
                    self.energy = 10

                def work(self):
                    self.energy -= 2
                    return f"{self.name} hauls stones."

                def rest(self):
                    self.energy = 10

                def describe(self):
                    return f"{self.name}: strength {self.strength}, energy {self.energy}"


            # describe() rewrites Golem's text instead of extending it, and rest() is copied.
            class FireGolem(Golem):
                def __init__(self, name, strength, heat):
                    super().__init__(name, strength)
                    self.heat = heat

                def work(self):
                    self.energy -= 3
                    return f"{self.name} forges a blade at {self.heat} degrees."

                def rest(self):
                    self.energy = 10

                def describe(self):
                    return f"{self.name}: strength {self.strength}, energy {self.energy}, heat {self.heat}"
          `
        ],
        tests: py`
          import inspect as _inspect
          import traceback as _traceback


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def classes():
              Golem = need_class("Golem")
              return Golem, need_class("FireGolem", Golem)


          SUPER_TIP = (" Pass exactly the name and the strength: " + code("super().__init__(name, strength)")
                       + ". (Python adds " + code("self") + " for you, and " + code("heat") + " belongs to FireGolem.)")


          def build(cls, *args):
              try:
                  return cls(*args)
              except TypeError as exc:
                  said = str(exc)
                  if _in_spell(exc):
                      if cls.__name__ == "FireGolem" and "requires a 'super' object" in said:
                          fail("Write " + code("super()") + " with brackets: " + code("super().__init__(name, strength)") + ".")
                      if cls.__name__ == "FireGolem" and "Golem.__init__()" in said:
                          fail("FireGolem called Golem's " + code("__init__") + " with the wrong values (Python said: " + said + ")."
                               + SUPER_TIP)
                      raise
                  shape = "def __init__(self, name, strength, heat):" if len(args) == 3 else "def __init__(self, name, strength):"
                  fail("Python couldn't build " + code(cls.__name__ + "(" + ", ".join(short(a) for a in args) + ")")
                       + ": " + said + ". Its " + code("__init__") + " should start " + code(shape) + ".")


          def forge(name, strength, heat):
              # Build a FireGolem and make sure Golem's part (set up by super().__init__) is there.
              Golem, FireGolem = classes()
              golem = build(FireGolem, name, strength, heat)
              for attr in ("name", "strength", "energy"):
                  if not hasattr(golem, attr):
                      fail("A new FireGolem has no " + code(attr) + " attribute. Its " + code("__init__") + " should call "
                           + code("super().__init__(name, strength)") + " so that Golem can set it up.")
              return golem


          def call(obj, method):
              func = need_method(obj, method)
              try:
                  return func()
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't call " + code(method + "()") + ": " + str(exc) + ". It should start "
                       + code("def " + method + "(self):") + ".")


          def text(obj, method):
              result = call(obj, method)
              expect(isinstance(result, str), code(type(obj).__name__ + "." + method + "()") + " should return a string, but it returned "
                     + short(result) + ".")
              return result


          @test("FireGolem inherits from Golem, and Golem itself still works as given")
          def _():
              Golem, FireGolem = classes()
              clod = build(Golem, "Clod", 4)
              expect(not hasattr(clod, "heat"), "Golem has gained a " + code("heat") + " attribute. Keep the given Golem as it was: "
                     + "FireGolem stores " + code("heat") + " itself, after " + code("super().__init__(name, strength)") + ".")
              expect_equal(text(clod, "describe"), "Clod: strength 4, energy 10",
                           "Golem's " + code("describe()") + " has changed. Please keep the given Golem class as it was.")
              expect_equal(text(clod, "work"), "Clod hauls stones.",
                           "Golem's " + code("work()") + " has changed. Keep Golem as it was, and put the forging in FireGolem.")
              expect_equal(need_attr(clod, "energy"), 8, "A plain golem's " + code("work()") + " should still use 2 energy.")


          @test('FireGolem("Ember", 5, 900) has a name, strength, energy 10 and heat')
          def _():
              ember = forge("Ember", 5, 900)
              for attr, value in (("name", "Ember"), ("strength", 5), ("energy", 10)):
                  expect_equal(getattr(ember, attr), value, "The fire golem's " + code(attr) + " is wrong.")
              expect_equal(need_attr(ember, "heat"), 900, "The fire golem's " + code("heat") + " is wrong.")


          @test("FireGolem's __init__ lets Golem do its part with super().__init__(name, strength)")
          def _():
              Golem, FireGolem = classes()
              expect(has_own_method(FireGolem, "__init__"), "FireGolem needs its own "
                     + code("__init__(self, name, strength, heat)") + ".")
              original = Golem.__init__
              calls = []

              def spy(self, *args, **kwargs):
                  try:
                      bound = _inspect.signature(original).bind(self, *args, **kwargs)
                  except TypeError:
                      fail("FireGolem called Golem's " + code("__init__") + " with the wrong values." + SUPER_TIP)
                  calls.append(dict(bound.arguments))
                  return original(self, *args, **kwargs)

              Golem.__init__ = spy      # watch whether Golem's __init__ gets called
              try:
                  build(FireGolem, "Cinder", 3, 650)
              finally:
                  Golem.__init__ = original
              expect(calls, "FireGolem's " + code("__init__") + " never asked Golem to set up its part. Instead of copying Golem's lines, call "
                     + code("super().__init__(name, strength)") + ".")
              expect(calls[0].get("name") == "Cinder" and calls[0].get("strength") == 3,
                     code("super().__init__") + " should receive the fire golem's name and strength: "
                     + code("super().__init__(name, strength)") + ".")


          @test("work() is overridden: a fire golem forges a blade, using 3 energy")
          def _():
              Golem, FireGolem = classes()
              expect(has_own_method(FireGolem, "work"), "FireGolem needs its own " + code("work()") + " method that overrides Golem's.")
              ember = forge("Ember", 5, 900)
              expect_equal(text(ember, "work"), "Ember forges a blade at 900 degrees.",
                           code('FireGolem("Ember", 5, 900).work()') + " is wrong.")
              expect_equal(need_attr(ember, "energy"), 7, "A fire golem's " + code("work()") + " should use 3 energy (10 - 3 = 7).")
              blaze = forge("Blaze", 2, 1200)
              expect_equal(text(blaze, "work"), "Blaze forges a blade at 1200 degrees.",
                           code('FireGolem("Blaze", 2, 1200).work()') + " is wrong.")


          @test("describe() extends Golem's description using super().describe()")
          def _():
              Golem, FireGolem = classes()
              expect(has_own_method(FireGolem, "describe"), "FireGolem needs its own " + code("describe()") + " that builds on Golem's.")
              ember = forge("Ember", 5, 900)
              expect_equal(text(ember, "describe"), "Ember: strength 5, energy 10, heat 900",
                           code('FireGolem("Ember", 5, 900).describe()') + " is wrong.")
              original = Golem.describe
              Golem.describe = lambda self: "[the golem part]"
              try:
                  result = text(ember, "describe")
              finally:
                  Golem.describe = original
              expect_equal(result, "[the golem part], heat 900",
                           "To check that FireGolem's " + code("describe()") + " builds on Golem's, this trial briefly made Golem's "
                           + code("describe()") + " return " + short("[the golem part]") + ". Use " + code("super().describe()")
                           + " instead of writing Golem's text out again.")


          @test("rest() is inherited from Golem, not copied")
          def _():
              Golem, FireGolem = classes()
              expect(not has_own_method(FireGolem, "rest"), "FireGolem shouldn't have its own " + code("rest()")
                     + ": it inherits Golem's. Delete the copy.")
              ember = forge("Ember", 5, 900)
              text(ember, "work")
              call(ember, "rest")
              expect_equal(need_attr(ember, "energy"), 10, "After " + code("rest()") + ", a fire golem should be back to 10 energy.")
        `,
        scene: { icon: "🔥", successIcon: "⚒️", successText: "Ember strikes the anvil, and a shower of sparks lights up the forge!", effect: "fire" }
      },

      // ------------------------------------------------------------------
      // 5. Polymorphism; a base class whose method raises NotImplementedError
      // ------------------------------------------------------------------
      {
        id: "workshop-familiar-chorus",
        title: "The Singing Familiars",
        difficulty: "medium",
        concepts: ["polymorphism", "raise", "NotImplementedError"],
        story: [
          "Pip has organised a concert for the academy's familiars, and it is chaos: an owl, a toad and a cat, all singing at once.",
          "\"What they need,\" says Ada, \"is a conductor who can lead *any* familiar without asking what kind it is. That's **polymorphism**: the same call, `greet()`, and every creature answers in its own way.\""
        ],
        task: [
          "Write these classes and one function:",
          { list: [
            "`Familiar`: `__init__(self, name)` stores `name`. `speak()` raises `NotImplementedError`. `greet()` returns `\"<name> says <what speak() returns>\"`, calling `self.speak()`.",
            "`Owl`, `Toad` and `Cat`, subclasses of `Familiar` whose `speak()` returns `\"Hoo!\"`, `\"Ribbit.\"` and `\"Meow.\"`.",
            "`Cat` also overrides `greet()` to return `\"<name> ignores you.\"`",
            "`chorus(familiars)` returns a list of each familiar's `greet()`, in order. It must work for *any* kind of familiar, even ones invented later, so don't check types."
          ] },
          "Write `greet()` once, in `Familiar` (Cat's override aside).",
          { code: py`
            chorus([Owl("Pip"), Cat("Smudge"), Toad("Wart")])
            # ['Pip says Hoo!', 'Smudge ignores you.', 'Wart says Ribbit.']
          ` }
        ],
        lesson: [
          "**Polymorphism** (\"many shapes\") means different classes answer the same method call in their own way. Code that calls `weather.report()` doesn't need to know *which* class `weather` is: Python looks up `report` on the actual object and runs that version.",
          "A base class can spell out what every subclass must provide. If a method only makes sense in the subclasses, make the base version **raise** an exception: `raise NotImplementedError(\"...\")` stops the program with a clear message if someone forgets to override it.",
          { code: py`
            class Weather:
                def forecast(self):
                    raise NotImplementedError("Each kind of weather needs forecast()")

                def report(self):                 # written once, works for every kind
                    return "Today: " + self.forecast()

            class Rain(Weather):
                def forecast(self):
                    return "rain"

            class Snow(Weather):
                def forecast(self):
                    return "snow"

                def report(self):                 # Snow overrides report too
                    return "Snow day! The academy is closed."

            for weather in [Rain(), Snow()]:
                print(weather.report())
          `, output: "Today: rain\nSnow day! The academy is closed." },
          "Notice the loop: it never asks which kind of weather it has. A new kind of `Weather` written next year will work in it without changing a line.",
          { warning: "Write `raise`, not `return`: `return NotImplementedError(...)` just hands back an error object, and nothing is stopped." }
        ],
        starter: py`
          class Familiar:
              def __init__(self, name):
                  self.name = name

              def speak(self):
                  # A plain Familiar doesn't know what to say: raise NotImplementedError.
                  pass

              def greet(self):
                  pass


          # Write Owl, Toad and Cat here.


          def chorus(familiars):
              pass
        `,
        hints: [
          "Follow the Weather example: the base class `Familiar` raises an error in `speak()`, and its `greet()` asks `self.speak()` for the words. Each subclass then only needs its own `speak()`.",
          "A whole subclass can be as small as `class Owl(Familiar):` plus a `speak()` that returns `\"Hoo!\"`: it inherits `__init__` and `greet()`. Cat gets its own `greet()` too. `chorus` calls `greet()` on each familiar and collects the answers in a list.",
          "In `Familiar`: `speak()` is `raise NotImplementedError(\"Each familiar must define speak()\")` and `greet()` is `return f\"{self.name} says {self.speak()}\"`. Then `chorus` is `return [familiar.greet() for familiar in familiars]`: no type checks needed!"
        ],
        solution: py`
          class Familiar:
              def __init__(self, name):
                  self.name = name

              def speak(self):
                  raise NotImplementedError("Each kind of familiar must define speak()")

              def greet(self):
                  return f"{self.name} says {self.speak()}"


          class Owl(Familiar):
              def speak(self):
                  return "Hoo!"


          class Toad(Familiar):
              def speak(self):
                  return "Ribbit."


          class Cat(Familiar):
              def speak(self):
                  return "Meow."

              def greet(self):            # cats are cats
                  return f"{self.name} ignores you."


          def chorus(familiars):
              # No type checks: every familiar knows how to greet.
              return [familiar.greet() for familiar in familiars]
        `,
        altSolutions: [
          py`
            class Familiar:
                def __init__(self, name):
                    self.name = name

                def speak(self):
                    raise NotImplementedError

                def greet(self):
                    return self.name + " says " + self.speak()


            class Owl(Familiar):
                def __init__(self, name):
                    super().__init__(name)

                def speak(self):
                    return "Hoo!"


            class Toad(Familiar):
                def speak(self):
                    return "Ribbit."


            class Cat(Familiar):
                def speak(self):
                    return "Meow."

                def greet(self):
                    return self.name + " ignores you."


            def chorus(familiars):
                songs = []
                for familiar in familiars:
                    songs.append(familiar.greet())
                return songs


            print(chorus([Owl("Pip"), Cat("Smudge"), Toad("Wart")]))
          `
        ],
        wrongSolutions: [
          py`
            # The base speak() returns a placeholder instead of raising.
            class Familiar:
                def __init__(self, name):
                    self.name = name

                def speak(self):
                    return "..."

                def greet(self):
                    return f"{self.name} says {self.speak()}"


            class Owl(Familiar):
                def speak(self):
                    return "Hoo!"


            class Toad(Familiar):
                def speak(self):
                    return "Ribbit."


            class Cat(Familiar):
                def speak(self):
                    return "Meow."

                def greet(self):
                    return f"{self.name} ignores you."


            def chorus(familiars):
                return [familiar.greet() for familiar in familiars]
          `,
          py`
            # chorus() checks types, so a new kind of familiar is left out.
            class Familiar:
                def __init__(self, name):
                    self.name = name

                def speak(self):
                    raise NotImplementedError("Each kind of familiar must define speak()")

                def greet(self):
                    return f"{self.name} says {self.speak()}"


            class Owl(Familiar):
                def speak(self):
                    return "Hoo!"


            class Toad(Familiar):
                def speak(self):
                    return "Ribbit."


            class Cat(Familiar):
                def speak(self):
                    return "Meow."

                def greet(self):
                    return f"{self.name} ignores you."


            def chorus(familiars):
                songs = []
                for familiar in familiars:
                    if isinstance(familiar, Owl):
                        songs.append(familiar.name + " says Hoo!")
                    elif isinstance(familiar, Toad):
                        songs.append(familiar.name + " says Ribbit.")
                    elif isinstance(familiar, Cat):
                        songs.append(familiar.name + " ignores you.")
                return songs
          `,
          py`
            # greet() is copied into every subclass instead of written once.
            class Familiar:
                def __init__(self, name):
                    self.name = name

                def speak(self):
                    raise NotImplementedError("Each kind of familiar must define speak()")


            class Owl(Familiar):
                def speak(self):
                    return "Hoo!"

                def greet(self):
                    return f"{self.name} says Hoo!"


            class Toad(Familiar):
                def speak(self):
                    return "Ribbit."

                def greet(self):
                    return f"{self.name} says Ribbit."


            class Cat(Familiar):
                def speak(self):
                    return "Meow."

                def greet(self):
                    return f"{self.name} ignores you."


            def chorus(familiars):
                return [familiar.greet() for familiar in familiars]
          `
        ],
        tests: py`
          import traceback as _traceback


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def kinds():
              Familiar = need_class("Familiar")
              return Familiar, need_class("Owl", Familiar), need_class("Toad", Familiar), need_class("Cat", Familiar)


          def build(cls, name):
              try:
                  return cls(name)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  if "abstract" in str(exc):
                      fail("Python won't build " + code(cls.__name__ + "(" + short(name) + ")") + " at all, because Familiar uses "
                           + code("@abstractmethod") + " (" + str(exc) + "). That's a fine real-world design, but this task wants an "
                           + "ordinary class whose " + code("speak()") + " raises " + code("NotImplementedError") + ": remove "
                           + code("ABC") + " and " + code("@abstractmethod") + ".")
                  fail("Python couldn't build " + code(cls.__name__ + "(" + short(name) + ")") + ": " + str(exc)
                       + ". Every familiar is built with just a name, using Familiar's " + code("def __init__(self, name):") + ".")


          def ask(pet, method):
              # Call speak() or greet() and make sure the answer is a string.
              kind = type(pet).__name__
              func = need_method(pet, method)
              try:
                  result = func()
              except NotImplementedError:
                  fail(code(kind) + " has no " + code("speak()") + " of its own, so Familiar's was used, and it raises "
                       + code("NotImplementedError") + ". Give " + code(kind) + " its own " + code("speak()") + ".")
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't call " + code(method + "()") + " on " + code(kind) + ": " + str(exc)
                       + ". It should start " + code("def " + method + "(self):") + ".")
              expect(isinstance(result, str), code(kind + "." + method + "()") + " should return a string, but it returned "
                     + short(result) + ".")
              if "<bound method" in result:
                  fail(code(kind + "." + method + "()") + " returned " + short(result) + ". A method was used without brackets: write "
                       + code("self.speak()") + ", not " + code("self.speak") + ".")
              return result


          def phoenix_class(Familiar):
              # A brand-new kind of familiar, invented by the trials.
              class Phoenix(Familiar):
                  def speak(self):
                      return "Fwoosh!"
              return Phoenix


          @test("Owl, Toad and Cat are all kinds of Familiar, each built with a name")
          def _():
              Familiar, Owl, Toad, Cat = kinds()
              for cls, name in ((Owl, "Pip"), (Toad, "Wart"), (Cat, "Smudge")):
                  pet = build(cls, name)
                  expect_equal(need_attr(pet, "name"), name, code(cls.__name__ + "(" + short(name) + ").name") + " is wrong.")


          @test("Each kind speaks in its own voice: Hoo!, Ribbit. and Meow.")
          def _():
              Familiar, Owl, Toad, Cat = kinds()
              for cls, name, voice in ((Owl, "Pip", "Hoo!"), (Toad, "Wart", "Ribbit."), (Cat, "Smudge", "Meow.")):
                  expect_equal(ask(build(cls, name), "speak"), voice, "What a " + cls.__name__ + "'s " + code("speak()") + " returns is wrong.")


          @test("A plain Familiar can't speak: its speak() raises NotImplementedError")
          def _():
              Familiar = need_class("Familiar")
              speak = need_method(build(Familiar, "Blob"), "speak")
              try:
                  result = speak()
              except NotImplementedError:
                  return
              except TypeError as exc:
                  if "BaseException" in str(exc) or "NotImplementedType" in str(exc):
                      fail("Use the exception " + code("NotImplementedError") + ", not " + code("NotImplemented")
                           + " (a special value for comparison methods): " + code('raise NotImplementedError("...")') + ".")
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't call " + code("speak()") + ": " + str(exc) + ". It should start " + code("def speak(self):") + ".")
              except Exception as exc:
                  fail(code('Familiar("Blob").speak()') + " raised " + code(type(exc).__name__) + " (" + str(exc) + "), but it should raise "
                       + code("NotImplementedError") + ": " + code('raise NotImplementedError("...")') + ".")
              if isinstance(result, BaseException) or result is NotImplementedError:
                  fail(code("speak()") + " returned the error instead of raising it. Write " + code("raise NotImplementedError(...)")
                       + ", not " + code("return") + ".")
              fail(code('Familiar("Blob").speak()') + " should raise " + code("NotImplementedError")
                   + ", because a plain familiar doesn't know what to say, but it returned " + short(result) + ".")


          @test("greet() is written once, in Familiar, and works through self.speak()")
          def _():
              Familiar, Owl, Toad, Cat = kinds()
              expect(has_own_method(Familiar, "greet"), code("Familiar") + " needs a " + code("greet()")
                     + " method. Write it once there, and every kind of familiar inherits it.")
              for cls in (Owl, Toad):
                  expect(not has_own_method(cls, "greet"), code(cls.__name__) + " shouldn't need its own " + code("greet()")
                         + ": it can inherit Familiar's, which calls " + code("self.speak()") + ".")
              expect_equal(ask(build(Owl, "Pip"), "greet"), "Pip says Hoo!", code('Owl("Pip").greet()') + " is wrong.")
              expect_equal(ask(build(Toad, "Wart"), "greet"), "Wart says Ribbit.", code('Toad("Wart").greet()') + " is wrong.")
              Phoenix = phoenix_class(Familiar)
              expect_equal(ask(build(Phoenix, "Ash"), "greet"), "Ash says Fwoosh!",
                           "This trial invented a new kind of familiar whose " + code("speak()") + " returns " + short("Fwoosh!")
                           + ". Its greeting should use that, so make " + code("greet()") + " call " + code("self.speak()") + ".")


          @test("Cats are cats: Cat overrides greet()")
          def _():
              Familiar, Owl, Toad, Cat = kinds()
              expect(has_own_method(Cat, "greet"), code("Cat") + " needs its own " + code("greet()") + " that overrides Familiar's.")
              expect_equal(ask(build(Cat, "Smudge"), "greet"), "Smudge ignores you.", code('Cat("Smudge").greet()') + " is wrong.")


          @test("chorus() returns every greeting in order, even for a brand-new kind of familiar")
          def _():
              Familiar, Owl, Toad, Cat = kinds()
              chorus = need_function("chorus", 1)
              expect(callable(getattr(Familiar, "greet", None)), code("Familiar") + " needs a " + code("greet()")
                     + " method, so that every kind of familiar, even a brand-new one, knows how to greet.")
              Phoenix = phoenix_class(Familiar)
              band = [build(Owl, "Pip"), build(Phoenix, "Ash"), build(Cat, "Smudge"), build(Toad, "Wart")]
              expect_equal(chorus(band), ["Pip says Hoo!", "Ash says Fwoosh!", "Smudge ignores you.", "Wart says Ribbit."],
                           code("chorus()") + " should ask each familiar to " + code("greet()")
                           + ", in order, and work for any kind of familiar (this trial added a Phoenix). No type checks needed!")
              expect_equal(chorus([]), [], "With no familiars, " + code("chorus([])") + " should return an empty list.")
        `,
        scene: { icon: "🦉", successIcon: "🎶", successText: "Hoo! Ribbit. Meow… The familiars sing in perfect (if peculiar) harmony, and Smudge pretends not to.", effect: "sparkle" }
      },

      // ------------------------------------------------------------------
      // 6. Exceptions: try / except, raising your own ValueError, catching one raised by a method
      // ------------------------------------------------------------------
      {
        id: "workshop-golem-who-says-no",
        title: "The Golem Who Says No",
        difficulty: "medium",
        concepts: ["try / except", "raise ValueError", "except … as err"],
        story: [
          "Glitch has been slipping silly orders into the golems' order box: *juggle the cat*, *eat the moon*, *lift twelvety crates*. The poor golems try to obey every one, and topple over with a crash.",
          "\"A good golem doesn't crash,\" says Ada. \"It says no, politely, and gets back to work. In Python, that's called **catching an exception**.\""
        ],
        task: [
          "Orders arrive on paper slips, so even numbers arrive as text. Write:",
          { list: [
            "`safe_int(text, default)`: return `int(text)`, or `default` if `int()` raises a `ValueError`. Catch **only** `ValueError`: other errors, like the `TypeError` from `safe_int(None, 0)`, must not be hidden;",
            "`class Golem` with `__init__(self, name, skills)` storing both (`skills` is a list of strings) and `obey(self, order)`: if `order` is one of its skills, return `\"<name> begins to <order>.\"`, otherwise raise `ValueError(\"<name> doesn't know how to <order>\")`;",
            "`command(golem, order)`: return `golem.obey(order)`, but if that raises a `ValueError`, return `\"Sorry, I can't: \"` followed by the error's message. Let other kinds of error through."
          ] },
          { code: py`
            clod = Golem("Clod", ["lift", "dig"])
            command(clod, "dig")       # 'Clod begins to dig.'
            command(clod, "dance")     # "Sorry, I can't: Clod doesn't know how to dance"
            safe_int(" -12 ", 0)       # -12
            safe_int("twelvety", 0)    # 0
          ` }
        ],
        lesson: [
          "When something goes wrong, Python **raises an exception**: `int(\"forty\")` raises a `ValueError`, and so does any `raise ValueError(\"...\")` you write yourself. Unless something **catches** it, an exception stops the whole spell.",
          "Put the risky code inside `try:`. If it raises the exception named after `except`, Python jumps there instead of stopping. Write `except ValueError as err:` to get hold of the exception itself: `str(err)` is its message. An exception raised inside a method travels back to whoever called it, so the caller can catch it:",
          { code: py`
            class Cauldron:
                def __init__(self, litres):
                    self.litres = litres

                def fill(self, amount):
                    if amount > self.litres:
                        raise ValueError(f"{amount} litres won't fit in {self.litres}")
                    return f"Filled with {amount} litres"

            pot = Cauldron(5)
            for amount in [3, 8]:
                try:
                    print(pot.fill(amount))
                except ValueError as err:
                    print("Oops:", err)
            print("The spell carries on.")
          `, output: "Filled with 3 litres\nOops: 8 litres won't fit in 5\nThe spell carries on." },
          { warning: "Catch only the exceptions you expect. A bare `except:` (or `except Exception:`) also swallows real bugs, such as a misspelled name or `None` where text should be, and hides them where nobody will ever find them." },
          { tip: "Two optional extras: an `else:` block after `except` runs only if the `try` succeeded, and a `finally:` block runs no matter what." }
        ],
        starter: py`
          def safe_int(text, default):
              # Try int(text). If it raises a ValueError, return default instead.
              return int(text)


          class Golem:
              def __init__(self, name, skills):
                  self.name = name
                  self.skills = skills

              def obey(self, order):
                  # Raise a ValueError for an order that isn't in self.skills.
                  return f"{self.name} begins to {order}."


          def command(golem, order):
              # Return golem.obey(order), or a polite refusal if it raises a ValueError.
              return golem.obey(order)
        `,
        hints: [
          "All three parts use one idea. `safe_int` and `command` each put the risky call inside `try:` and deal with the failure in `except ValueError:`. In `obey`, *you* are the one who raises: `raise ValueError(...)` when the order isn't one of the golem's skills.",
          "`safe_int`: `return int(text)` inside the `try`, and `return default` inside `except ValueError:`. `command`: call `golem.obey(order)` inside the `try`, and write `except ValueError as err:` so that you can use the error's message.",
          "`obey`: `if order not in self.skills: raise ValueError(f\"{self.name} doesn't know how to {order}\")`, then return the \"begins to\" sentence. `command`: `except ValueError as err: return \"Sorry, I can't: \" + str(err)`."
        ],
        solution: py`
          def safe_int(text, default):
              try:
                  return int(text)
              except ValueError:          # only "not a whole number": other errors still show
                  return default


          class Golem:
              def __init__(self, name, skills):
                  self.name = name
                  self.skills = skills

              def obey(self, order):
                  if order not in self.skills:
                      raise ValueError(f"{self.name} doesn't know how to {order}")
                  return f"{self.name} begins to {order}."


          def command(golem, order):
              try:
                  return golem.obey(order)
              except ValueError as err:   # the golem said no: pass on its reason, politely
                  return "Sorry, I can't: " + str(err)
        `,
        altSolutions: [
          py`
            def safe_int(text, default):
                try:
                    number = int(text)
                except ValueError:
                    return default
                else:                       # runs only when int() worked
                    return number


            class Golem:
                def __init__(self, name, skills):
                    self.name = name
                    self.skills = list(skills)

                def obey(self, order):
                    if order in self.skills:
                        return self.name + " begins to " + order + "."
                    problem = self.name + " doesn't know how to " + order
                    raise ValueError(problem)


            def command(golem, order):
                try:
                    reply = golem.obey(order)
                except ValueError as err:
                    reply = f"Sorry, I can't: {err}"
                return reply


            clod = Golem("Clod", ["lift", "dig"])
            print(command(clod, "dig"))
            print(command(clod, "dance"))
            print(safe_int(" -12 ", 0), safe_int("twelvety", 0))
          `,
          py`
            def safe_int(text, default):
                result = default
                try:
                    result = int(text)
                except ValueError:
                    pass
                return result


            class Golem:
                def __init__(self, name, skills):
                    self.name = name
                    self.skills = set(skills)

                def obey(self, order):
                    if order not in self.skills:
                        raise ValueError("{} doesn't know how to {}".format(self.name, order))
                    return "{} begins to {}.".format(self.name, order)


            def command(golem, order):
                try:
                    return golem.obey(order)
                except ValueError as refusal:
                    return "Sorry, I can't: {}".format(refusal.args[0])
          `
        ],
        wrongSolutions: [
          py`
            # Catches everything, so real bugs are hidden too.
            def safe_int(text, default):
                try:
                    return int(text)
                except:
                    return default


            class Golem:
                def __init__(self, name, skills):
                    self.name = name
                    self.skills = skills

                def obey(self, order):
                    if order not in self.skills:
                        raise ValueError(f"{self.name} doesn't know how to {order}")
                    return f"{self.name} begins to {order}."


            def command(golem, order):
                try:
                    return golem.obey(order)
                except Exception as err:
                    return "Sorry, I can't: " + str(err)
          `,
          py`
            # safe_int catches the wrong kind of exception.
            def safe_int(text, default):
                try:
                    return int(text)
                except TypeError:
                    return default


            class Golem:
                def __init__(self, name, skills):
                    self.name = name
                    self.skills = skills

                def obey(self, order):
                    if order not in self.skills:
                        raise ValueError(f"{self.name} doesn't know how to {order}")
                    return f"{self.name} begins to {order}."


            def command(golem, order):
                try:
                    return golem.obey(order)
                except ValueError as err:
                    return "Sorry, I can't: " + str(err)
          `,
          py`
            # Tries to predict every problem with if-checks instead of catching it.
            def safe_int(text, default):
                if text.isdigit():
                    return int(text)
                return default


            class Golem:
                def __init__(self, name, skills):
                    self.name = name
                    self.skills = skills

                def obey(self, order):
                    if order not in self.skills:
                        raise ValueError(f"{self.name} doesn't know how to {order}")
                    return f"{self.name} begins to {order}."


            def command(golem, order):
                if order in golem.skills:
                    return golem.obey(order)
                return "Sorry, I can't: " + golem.name + " doesn't know how to " + order
          `
        ],
        tests: py`
          import traceback as _traceback


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def make(cls, name, skills):
              try:
                  return cls(name, skills)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't build " + code("Golem(" + short(name) + ", " + short(skills) + ")") + ": " + str(exc)
                       + ". Its " + code("__init__") + " should start " + code("def __init__(self, name, skills):") + ".")


          def call(method, label, *args):
              try:
                  return method(*args)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't run " + code(label) + ": " + str(exc) + ". The method should start "
                       + code("def obey(self, order):") + ".")


          def finally_note():
              # A return inside finally: swallows every exception, even ones nobody caught.
              import ast as _ast
              for node in _ast.walk(_ast.parse(source)):
                  if isinstance(node, _ast.Try) and any(isinstance(inner, _ast.Return)
                                                        for part in node.finalbody for inner in _ast.walk(part)):
                      return (" (Watch out: a " + code("return") + " inside " + code("finally:") + " throws away any exception "
                              + "that wasn't caught, so it hides errors too.)")
              return ""


          def tired_kind():
              # Knows its skills, but refuses anyway with a ValueError of its own.
              class TiredGolem(need_class("Golem")):
                  def obey(self, order):
                      raise ValueError("Pebble is too tired to " + order)
              return TiredGolem


          def cracked_kind():
              # A real problem, not a polite refusal.
              class CrackedGolem(need_class("Golem")):
                  def obey(self, order):
                      raise RuntimeError("Crack! Flint has split in two")
              return CrackedGolem


          @test('safe_int turns whole-number text into an int: safe_int(" -12 ", 0) is -12')
          def _():
              safe_int = need_function("safe_int", 2)
              for text, want in (("42", 42), (" -12 ", -12), ("+7", 7), ("0", 0), ("1_000", 1000)):
                  label = code("safe_int(" + short(text) + ", 99)")
                  got = safe_int(text, 99)
                  if got == 99:
                      advice = ""
                      if text != text.strip() or text.strip()[0] in "+-":
                          advice = (" " + code("int()") + " understands signs and spaces around a number, so let it do the checking: call it inside "
                                    + code("try:") + " instead of testing the text yourself.")
                      elif "_" in text:
                          advice = (" Python's " + code("int()") + " even accepts underscores between digits, a handy way to write big "
                                    + "numbers. That's why it's best to let " + code("int()") + " decide: call it inside " + code("try:")
                                    + " instead of testing the text yourself.")
                      fail(label + " returned the default, 99, but " + short(text) + " is a whole number: " + code("int(" + short(text) + ")")
                           + " is " + str(want) + "." + advice)
                  expect_equal(got, want, label + " is wrong.")


          @test("safe_int returns the default when the text isn't a whole number")
          def _():
              safe_int = need_function("safe_int", 2)
              for text, default in (("twelvety", 0), ("", -1), ("4.5", 7), ("12 crates", None), ("--5", 3)):
                  label = code("safe_int(" + short(text) + ", " + short(default) + ")")
                  try:
                      got = safe_int(text, default)
                  except ValueError:
                      fail(label + " let a ValueError escape. " + code("int()") + " raises ValueError for text that isn't a whole number: "
                           + "catch it with " + code("except ValueError:") + " and return the default.")
                  expect_equal(got, default, label + " should return the default it was given.")


          @test("safe_int catches only ValueError, so other mistakes still show")
          def _():
              safe_int = need_function("safe_int", 2)
              for bad in (None, ["4"]):
                  try:
                      got = safe_int(bad, 0)
                  except Exception:
                      continue      # good: the mistake is not hidden
                  fail(code("safe_int(" + short(bad) + ", 0)") + " returned " + short(got) + ", hiding the TypeError that "
                       + code("int(" + short(bad) + ")") + " raises. " + short(bad) + " isn't text at all: that's a bug somewhere else, "
                       + "and it should be seen, not covered up. Catch only " + code("ValueError") + " (" + code("except ValueError:")
                       + "): a bare " + code("except:") + ", " + code("except Exception:") + " or " + code("except TypeError:")
                       + " hides it." + finally_note())


          @test("Golem.obey() carries out known orders and raises ValueError for the rest")
          def _():
              Golem = need_class("Golem")
              for name, skills, known, unknown in (("Clod", ["lift", "dig"], "dig", "dance"), ("Basalt", ["guard"], "guard", "lift")):
                  golem = make(Golem, name, skills)
                  expect_equal(need_attr(golem, "name"), name, "The golem's " + code("name") + " is wrong.")
                  need_attr(golem, "skills")
                  obey = need_method(golem, "obey")
                  label = "Golem(" + short(name) + ", " + short(skills) + ").obey(" + short(known) + ")"
                  expect_equal(call(obey, label, known), name + " begins to " + known + ".", code(label) + " is wrong.")
                  err = expect_raises(ValueError, obey, unknown,
                                      message=code("obey(" + short(unknown) + ")") + " should raise a ValueError: " + unknown
                                      + " isn't one of " + name + "'s skills.")
                  if len(err.args) > 1:
                      fail("Your ValueError got " + str(len(err.args)) + " separate values, " + short(err.args)
                           + ". Give it one string as its message, for example with an f-string: "
                           + code('raise ValueError(f"{self.name} doesn\'t know how to {order}")') + ".")
                  expect_equal(str(err), name + " doesn't know how to " + unknown,
                               "The ValueError's message is wrong (the message goes in the brackets: "
                               + code('raise ValueError("...")') + ").")


          @test("command() returns obey()'s answer, or a polite refusal built from the error's message")
          def _():
              command = need_function("command", 2)
              clod = make(need_class("Golem"), "Clod", ["lift", "dig"])
              expect_equal(command(clod, "lift"), "Clod begins to lift.",
                           code('command(clod, "lift")') + " should return what " + code('clod.obey("lift")') + " returns.")
              try:
                  refusal = command(clod, "dance")
              except ValueError:
                  fail(code('command(clod, "dance")') + " let the ValueError from " + code("obey()") + " escape. Call "
                       + code("golem.obey(order)") + " inside " + code("try:") + " and catch the error with "
                       + code("except ValueError as err:") + ".")
              expect_equal(refusal, "Sorry, I can't: Clod doesn't know how to dance", code('command(clod, "dance")') + " is wrong.")
              pebble = make(tired_kind(), "Pebble", ["dig"])
              try:
                  refusal = command(pebble, "dig")
              except ValueError:
                  fail("This trial's golem Pebble knows how to dig, but its " + code("obey()") + " refused anyway, with a ValueError "
                       + "of its own: it's too tired. " + code("command()") + " let that ValueError escape. Don't check the order "
                       + "yourself, because golems can refuse for reasons of their own: call " + code("golem.obey(order)")
                       + " inside " + code("try:") + " and catch whatever ValueError it raises.")
              expect_equal(refusal, "Sorry, I can't: Pebble is too tired to dig",
                           "The refusal should pass on the error's own message, " + code("str(err)")
                           + ": this trial's golem refused because it was too tired.")


          @test("command() lets other kinds of errors through")
          def _():
              command = need_function("command", 2)
              flint = make(cracked_kind(), "Flint", ["lift"])
              try:
                  result = command(flint, "lift")
              except RuntimeError:
                  return            # good: a real problem isn't hidden
              fail("This trial's golem Flint cracked in two: its " + code("obey()") + " raised RuntimeError. That's not a polite "
                   + "refusal but a real problem, and " + code("command()") + " must not hide it, yet it returned " + short(result)
                   + ". Catch only " + code("ValueError") + ": write " + code("except ValueError as err:") + ", not a bare "
                   + code("except:") + " or " + code("except Exception:") + "." + finally_note())
        `,
        scene: { icon: "✋", successIcon: "🙇", successText: "Clod shakes its great stone head, very politely: no cat-juggling today.", effect: "shake" }
      },

      // ------------------------------------------------------------------
      // 7. Operator magic methods: __add__, __eq__, __lt__
      // ------------------------------------------------------------------
      {
        id: "workshop-potion-algebra",
        title: "Potion Algebra",
        difficulty: "hard",
        concepts: ["__add__", "__eq__", "__lt__", "NotImplemented"],
        story: [
          "Ada's potion cabinet is chaos. Glitch has been mixing bottles at random and labelling every one \"probably fine\".",
          "\"Let's restore some order,\" says Ada. \"Teach Python what `+`, `==` and `<` mean for potions, and it will mix, compare and even sort them for us. That's what magic methods are for: they let your objects join in with Python's own operators.\""
        ],
        task: [
          "Write a class `Potion` whose `__init__(self, name, power)` stores `name` and `power`, plus:",
          { list: [
            "`__repr__`: returns text like `Potion('Glow', 3)`;",
            "`__add__`: `a + b` returns a **new** Potion named `\"<a's name> & <b's name>\"` with the two powers added. `a` and `b` stay unchanged;",
            "`__eq__`: potions are equal when their names **and** powers match;",
            "`__lt__`: `a < b` compares power only, so `sorted()` lists potions from weakest to strongest."
          ] },
          "When `other` isn't a Potion, these three should `return NotImplemented`: then `glow + 5` raises a `TypeError` and `glow == 5` is simply `False`.",
          { code: py`
            glow, haste = Potion("Glow", 3), Potion("Haste", 5)
            glow + haste                                  # Potion('Glow & Haste', 8)
            (glow + haste) == Potion("Glow & Haste", 8)   # True
            sorted([haste, glow + haste, glow])
            # [Potion('Glow', 3), Potion('Haste', 5), Potion('Glow & Haste', 8)]
          ` }
        ],
        lesson: [
          "Operators are magic methods in disguise. For `a + b` Python calls `a.__add__(b)`; for `a == b`, `a.__eq__(b)`; for `a < b`, `a.__lt__(b)`. Define them, and your objects work with the operators and with everything built on them: `sorted()`, `min()` and `max()` work once `<` does, while `in` and `list.count()` use `==`.",
          { code: py`
            class Coin:
                def __init__(self, value):
                    self.value = value

                def __repr__(self):
                    return f"Coin({self.value})"

                def __add__(self, other):
                    if not isinstance(other, Coin):
                        return NotImplemented        # "I don't know how to add that"
                    return Coin(self.value + other.value)   # a brand-new Coin

                def __eq__(self, other):
                    if not isinstance(other, Coin):
                        return NotImplemented
                    return self.value == other.value

                def __lt__(self, other):
                    if not isinstance(other, Coin):
                        return NotImplemented
                    return self.value < other.value

            print(Coin(2) + Coin(5), Coin(2) == Coin(2), Coin(2) == "two")
            print(sorted([Coin(5), Coin(1), Coin(3)]))
          `, output: "Coin(7) True False\n[Coin(1), Coin(3), Coin(5)]" },
          "`isinstance(other, Coin)` checks whether `other` is a Coin. Returning the special value `NotImplemented` tells Python \"not my job\": it then asks the other object, and if that can't help either, `==` settles for `False` (unless both sides are the very same object), while `+` and `<` raise a `TypeError`.",
          { warning: "`__add__` should build and return a **new** object. Changing `self` and returning it would secretly alter the original." },
          { warning: "Don't mix them up: you **return** `NotImplemented` from `__eq__`, `__add__` and `__lt__`; you **raise** `NotImplementedError` in a method that subclasses must override." },
          { tip: "Once a class defines `__eq__`, its objects can't go in a set or be dictionary keys unless it also defines `__hash__`. You won't need that today." }
        ],
        starter: py`
          class Potion:
              def __init__(self, name, power):
                  self.name = name
                  self.power = power

              # Write __repr__, __add__, __eq__ and __lt__ here.


          # Try your potions out, for example:
          # glow = Potion("Glow", 3)
          # haste = Potion("Haste", 5)
          # print(glow + haste)
        `,
        hints: [
          "Follow the Coin example in the Spell Scroll: one magic method per operator, each starting with a check that `other` really is a Potion. You also need `__repr__`, which you met in Name Plates.",
          "`__add__`, `__eq__` and `__lt__` all start with the same guard: `if not isinstance(other, Potion): return NotImplemented`. Then `__add__` builds and returns a brand-new potion, without changing `self` or `other`: `return Potion(self.name + \" & \" + other.name, self.power + other.power)`.",
          "`__eq__` returns `self.name == other.name and self.power == other.power`, `__lt__` returns `self.power < other.power`, and `__repr__` returns `f\"Potion({self.name!r}, {self.power!r})\"`."
        ],
        solution: py`
          class Potion:
              def __init__(self, name, power):
                  self.name = name
                  self.power = power

              def __repr__(self):
                  return f"Potion({self.name!r}, {self.power!r})"

              def __add__(self, other):
                  if not isinstance(other, Potion):
                      return NotImplemented          # Python then raises TypeError for us
                  return Potion(self.name + " & " + other.name, self.power + other.power)

              def __eq__(self, other):
                  if not isinstance(other, Potion):
                      return NotImplemented          # so potion == 5 is simply False
                  return self.name == other.name and self.power == other.power

              def __lt__(self, other):
                  if not isinstance(other, Potion):
                      return NotImplemented
                  return self.power < other.power
        `,
        altSolutions: [
          py`
            class Potion:
                def __init__(self, name, power):
                    self.name = name
                    self.power = power

                def __repr__(self):
                    return "Potion(" + repr(self.name) + ", " + repr(self.power) + ")"

                def __add__(self, other):
                    if isinstance(other, Potion):
                        return type(self)(f"{self.name} & {other.name}", self.power + other.power)
                    return NotImplemented

                def __eq__(self, other):
                    return isinstance(other, Potion) and (self.name, self.power) == (other.name, other.power)

                def __lt__(self, other):
                    if isinstance(other, Potion):
                        return self.power < other.power
                    return NotImplemented
          `,
          py`
            class Potion:
                def __init__(self, name, power):
                    self.name = name
                    self.power = power

                def __repr__(self):
                    return f"Potion('{self.name}', {self.power})"

                def __add__(self, other):
                    if type(other) is not Potion:
                        raise TypeError("A potion can only be mixed with another potion")
                    return Potion(self.name + " & " + other.name, self.power + other.power)

                def __eq__(self, other):
                    if type(other) is not Potion:
                        return False
                    return self.name == other.name and self.power == other.power

                def __lt__(self, other):
                    return self.power < other.power


            glow, haste = Potion("Glow", 3), Potion("Haste", 5)
            print(glow + haste, sorted([haste, glow]))
          `
        ],
        wrongSolutions: [
          py`
            # __add__ changes the first potion and hands it back.
            class Potion:
                def __init__(self, name, power):
                    self.name = name
                    self.power = power

                def __repr__(self):
                    return f"Potion({self.name!r}, {self.power!r})"

                def __add__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    self.name = self.name + " & " + other.name
                    self.power = self.power + other.power
                    return self

                def __eq__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return self.name == other.name and self.power == other.power

                def __lt__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return self.power < other.power
          `,
          py`
            # __eq__ looks at other.name without checking what other is.
            class Potion:
                def __init__(self, name, power):
                    self.name = name
                    self.power = power

                def __repr__(self):
                    return f"Potion({self.name!r}, {self.power!r})"

                def __add__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return Potion(self.name + " & " + other.name, self.power + other.power)

                def __eq__(self, other):
                    return self.name == other.name and self.power == other.power

                def __lt__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return self.power < other.power
          `,
          py`
            # __lt__ compares names, so potions sort alphabetically.
            class Potion:
                def __init__(self, name, power):
                    self.name = name
                    self.power = power

                def __repr__(self):
                    return f"Potion({self.name!r}, {self.power!r})"

                def __add__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return Potion(self.name + " & " + other.name, self.power + other.power)

                def __eq__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return self.name == other.name and self.power == other.power

                def __lt__(self, other):
                    if not isinstance(other, Potion):
                        return NotImplemented
                    return self.name < other.name
          `
        ],
        tests: py`
          import traceback as _traceback


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def brew(name, power):
              Potion = need_class("Potion")
              try:
                  return Potion(name, power)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't build " + code("Potion(" + short(name) + ", " + short(power) + ")") + ": " + str(exc)
                       + ". Its " + code("__init__") + " should start " + code("def __init__(self, name, power):") + ".")


          def magic(potion, method, *args):
              # Call one of the potion's magic methods directly (after checking that Potion defines it).
              expect(has_own_method(need_class("Potion"), method), code("Potion") + " needs its own " + code(method) + " method.")
              try:
                  return getattr(potion, method)(*args)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't call " + code(method) + ": " + str(exc) + ". It should start "
                       + code("def " + method + ("(self, other):" if args else "(self):")) + ".")


          def mixed_up(value):
              # NotImplementedError (an exception) where NotImplemented (the special value) belongs.
              return value is NotImplementedError or isinstance(value, NotImplementedError)


          MIX_UP = (" Return the special value " + code("NotImplemented") + " (no Error) instead. Don't mix them up: you "
                    + code("return NotImplemented") + " from " + code("__eq__") + ", " + code("__add__") + " and " + code("__lt__")
                    + "; you " + code("raise NotImplementedError") + " in a method that subclasses must override.")


          @test("A potion keeps its name and power, and repr() gives Potion('Glow', 3)")
          def _():
              glow = brew("Glow", 3)
              expect_equal(need_attr(glow, "name"), "Glow", "The potion's " + code("name") + " is wrong.")
              expect_equal(need_attr(glow, "power"), 3, "The potion's " + code("power") + " is wrong.")
              for potion, want in ((glow, "Potion('Glow', 3)"), (brew("Night Shade", 12), "Potion('Night Shade', 12)")):
                  got = magic(potion, "__repr__")
                  expect(isinstance(got, str), code("__repr__") + " must return a string, but it returned " + short(got) + ".")
                  expect(got in (want, want.replace("'", '"')), code("repr()") + " of that potion should be " + code(want)
                         + ", but it's " + short(got) + ".")


          @test("glow + haste brews a NEW potion, Glow & Haste with power 8, leaving both unchanged")
          def _():
              Potion = need_class("Potion")
              glow, haste = brew("Glow", 3), brew("Haste", 5)
              mix = magic(glow, "__add__", haste)
              expect(mix is not NotImplemented, code("glow.__add__(haste)") + " returned " + code("NotImplemented")
                     + ", but haste is a Potion! Check your " + code("isinstance") + " test.")
              expect(isinstance(mix, Potion), code("glow + haste") + " should give a Potion, but it gave " + short(mix) + ".")
              expect(mix is not glow and mix is not haste, code("glow + haste") + " handed back one of the original bottles. "
                     + code("__add__") + " must build and return a new one: " + code("return Potion(...)") + ".")
              expect_equal((need_attr(glow, "name"), need_attr(glow, "power")), ("Glow", 3),
                           "Mixing must not change the original potions, but glow changed.")
              expect_equal((need_attr(haste, "name"), need_attr(haste, "power")), ("Haste", 5),
                           "Mixing must not change the original potions, but haste changed.")
              expect_equal(need_attr(mix, "name"), "Glow & Haste", "The mixed potion's " + code("name") + " is wrong.")
              expect_equal(need_attr(mix, "power"), 8, "The mixed potion's " + code("power") + " should be the sum, 3 + 5.")
              triple = glow + haste + brew("Calm", 1)
              expect(isinstance(triple, Potion), code("glow + haste + calm") + " should give a Potion, but it gave " + short(triple) + ".")
              expect_equal((need_attr(triple, "name"), need_attr(triple, "power")), ("Glow & Haste & Calm", 9),
                           code("glow + haste + calm") + " should brew " + code("Potion('Glow & Haste & Calm', 9)") + ".")


          @test("== is True when the name and power match, even for two different bottles")
          def _():
              a, b = brew("Glow", 3), brew("Glow", 3)
              magic(a, "__eq__", b)
              expect(a == b, code("Potion('Glow', 3) == Potion('Glow', 3)") + " should be True: same name, same power.")
              expect(not (a == brew("Glow", 4)), code("Potion('Glow', 3) == Potion('Glow', 4)") + " should be False: the powers differ.")
              expect(not (a == brew("Gloom", 3)), code("Potion('Glow', 3) == Potion('Gloom', 3)") + " should be False: the names differ.")
              expect(a != brew("Glow", 4), code("Potion('Glow', 3) != Potion('Glow', 4)") + " should be True.")
              shelf = [brew("Haste", 5), brew("Glow", 3)]
              expect(brew("Glow", 3) in shelf, code("in") + " uses " + code("==") + ", so " + code("Potion('Glow', 3) in shelf")
                     + " should be True.")


          @test("Comparing a potion with something that isn't a potion is simply False")
          def _():
              glow = brew("Glow", 3)
              magic(glow, "__eq__", brew("Glow", 3))
              for other in ("Glow", 3, None, ["Glow", 3]):
                  label = code("Potion('Glow', 3) == " + short(other))
                  try:
                      same = glow == other
                      differ = glow != other
                  except NotImplementedError:
                      fail(label + " raised NotImplementedError." + MIX_UP)
                  except Exception as exc:
                      where = (" before it looks at " + code("other.name")) if isinstance(exc, AttributeError) else ", not raise an error"
                      fail(label + " crashed with " + type(exc).__name__ + ": " + str(exc) + ". When " + code("other")
                           + " isn't a Potion, " + code("__eq__") + " should " + code("return NotImplemented") + " (or False)" + where + ".")
                  if mixed_up(same):
                      fail(label + " gave " + short(same) + ": your " + code("__eq__") + " returned the exception NotImplementedError." + MIX_UP)
                  if same is None:
                      fail(code("Potion('Glow', 3) == " + short(other)) + " gave None. It should be False: make " + code("__eq__")
                           + " " + code("return NotImplemented") + " (or False) when " + code("other") + " isn't a Potion.")
                  expect(same is False, code("Potion('Glow', 3) == " + short(other)) + " should be False, but it gave " + short(same) + ".")
                  expect(differ, code("Potion('Glow', 3) != " + short(other)) + " should be True.")


          @test("< compares power, so sorted(), min() and max() can order potions")
          def _():
              zest, glow, haste, calm = brew("Zest", 2), brew("Glow", 3), brew("Haste", 5), brew("Calm", 1)
              Potion = need_class("Potion")
              if not has_own_method(Potion, "__lt__") and has_own_method(Potion, "__gt__"):
                  fail("Your Potion defines " + code("__gt__") + " (for " + code(">") + "), but the task asks for " + code("__lt__")
                       + ": " + code("a < b") + " calls " + code("a.__lt__(b)") + ", and " + code("sorted()") + " compares with "
                       + code("<") + ".")
              first = magic(zest, "__lt__", glow)
              expect(first is not NotImplemented, code("zest.__lt__(glow)") + " returned " + code("NotImplemented")
                     + ", but glow is a Potion! Check your " + code("isinstance") + " test.")
              expect(first, code("Potion('Zest', 2) < Potion('Glow', 3)") + " should be True: 2 is less than 3. Compare the powers, not the names.")
              expect(not (haste < glow), code("Potion('Haste', 5) < Potion('Glow', 3)") + " should be False: 5 is not less than 3.")
              expect(not (glow < brew("Glow", 3)), code("Potion('Glow', 3) < Potion('Glow', 3)") + " should be False: 3 is not less than 3. Use "
                     + code("<") + ", not " + code("<=") + ".")
              ordered = sorted([haste, zest, glow, calm])
              expect_equal([need_attr(p, "name") for p in ordered], ["Calm", "Zest", "Glow", "Haste"],
                           code("sorted()") + " should put the potions in order of power, weakest first.")
              expect_equal(need_attr(max([glow, haste, calm]), "name"), "Haste", code("max()") + " should find the strongest potion.")
              expect_equal(need_attr(min([glow, haste, calm]), "name"), "Calm", code("min()") + " should find the weakest potion.")


          @test("Mixing a potion with something that isn't a potion raises TypeError")
          def _():
              glow = brew("Glow", 3)
              magic(glow, "__add__", brew("Calm", 1))
              advice = (" In " + code("__add__") + ", " + code("return NotImplemented") + " when " + code("other")
                        + " isn't a Potion, and Python raises the TypeError for you.")
              for other, label in ((5, "glow + 5"), ("Haste", 'glow + "Haste"')):
                  try:
                      result = glow + other
                  except TypeError:
                      continue
                  except NotImplementedError:
                      fail(code(label) + " raised NotImplementedError, but it should raise a TypeError." + MIX_UP
                           + " Python then raises the TypeError for you.")
                  except Exception as exc:
                      fail(code(label) + " should raise a TypeError, but it raised " + type(exc).__name__ + ": " + str(exc) + "." + advice)
                  if mixed_up(result):
                      fail(code(label) + " gave " + short(result) + ": your " + code("__add__") + " returned the exception NotImplementedError."
                           + MIX_UP)
                  fail(code(label) + " should raise a TypeError, but it gave " + short(result) + "." + advice)
        `,
        scene: { icon: "⚗️", successIcon: "🧪", successText: "The potions line up along the shelf, weakest to strongest, and the cauldron bubbles approvingly.", effect: "bubble" }
      },

      // ------------------------------------------------------------------
      // 8. A container class: composition, __len__/__contains__/__getitem__/__iter__,
      //    @property and validation with ValueError
      // ------------------------------------------------------------------
      {
        id: "workshop-living-spellbook",
        title: "The Living Spellbook",
        difficulty: "hard",
        concepts: ["container magic methods", "@property", "composition", "ValueError"],
        story: [
          "Ada's spellbook is alive: it purrs when opened and counts its own pages. Or it did, until Glitch scribbled in it — spells with no name, spells worth zero mana, the same spell three times over.",
          "\"Build me a new one,\" says Ada, \"that behaves like a proper Python container and turns nonsense away at the door.\""
        ],
        task: [
          "Write two classes.",
          "**`Spell(name, mana)`** stores both. It raises `ValueError` if `name` is an empty string or `mana` is less than 1.",
          "**`Spellbook(owner, capacity)`** stores both and starts with no spells. It supports:",
          { list: [
            "`book.add(spell)`: adds the Spell at the end. Raises `ValueError` if the book already holds `capacity` spells, or already has a spell with that name;",
            "`len(book)`: how many spells it holds;",
            "`name in book`: is there a spell with that name?",
            "`book[name]`: the Spell with that name, or a `KeyError` if there's none;",
            "`for spell in book`: the Spells, in the order they were added;",
            "`book.total_mana`: a `@property` adding up all their mana."
          ] },
          { code: py`
            book = Spellbook("Ada", 2)
            book.add(Spell("Fireball", 8))
            book.add(Spell("Frost", 5))
            len(book), "Frost" in book, book["Frost"].mana, book.total_mana   # (2, True, 5, 13)
            book.add(Spell("Heal", 3))     # ValueError: the book is full
          ` }
        ],
        lesson: [
          "Magic methods let your own class behave like a built-in container:",
          { list: [
            "`len(box)` calls `box.__len__()`, which must return a whole number.",
            "`x in box` calls `box.__contains__(x)`, which returns `True` or `False`.",
            "`box[key]` calls `box.__getitem__(key)`. If there's nothing for that key, raise `KeyError`.",
            "`for item in box` calls `box.__iter__()`, which must return an *iterator*. The easy way: `return iter(some_list)`."
          ] },
          "A class that keeps other objects inside it, like a book holding Spell objects, is using **composition**. A `@property` is a method that you read like an attribute, without brackets: perfect for values worked out from other data. And `raise ValueError(\"...\")` stops a method straight away, so a bad value never gets stored.",
          { code: py`
            class Quiver:
                def __init__(self, size):
                    if size < 1:
                        raise ValueError("A quiver must hold at least one arrow")
                    self.size = size
                    self._arrows = []          # each quiver gets its own list

                def add(self, arrow):
                    self._arrows.append(arrow)

                def __len__(self):
                    return len(self._arrows)

                def __iter__(self):
                    return iter(self._arrows)

                @property
                def space_left(self):          # read it as q.space_left
                    return self.size - len(self._arrows)

            q = Quiver(3)
            q.add("silver")
            q.add("golden")
            print(len(q), q.space_left)
            for arrow in q:
                print(arrow)
          `, output: "2 1\nsilver\ngolden" },
          { tip: "A leading underscore, as in `_arrows`, is a polite sign that means \"internal: please use the methods instead\"." }
        ],
        starter: py`
          class Spell:
              def __init__(self, name, mana):
                  # Raise a ValueError if name is empty or mana is less than 1.
                  self.name = name
                  self.mana = mana


          class Spellbook:
              def __init__(self, owner, capacity):
                  self.owner = owner
                  self.capacity = capacity
                  # Where will this book keep its spells?

              def add(self, spell):
                  pass

              # Add __len__, __contains__, __getitem__, __iter__
              # and the total_mana property here.
        `,
        hints: [
          "Do `Spell` first: check for bad values at the top of `__init__`, before storing anything, and raise a `ValueError` if you find one. Then give every Spellbook its own list of spells, created in `__init__` like the Quiver's arrows.",
          "Every container method works with that list. `__contains__(self, name)` and `__getitem__(self, name)` loop over the spells comparing `spell.name == name`; if nothing matched, `__contains__` returns `False` and `__getitem__` does `raise KeyError(name)`. `__iter__` can simply `return iter(self.spells)`.",
          "In `add`: `if len(self) >= self.capacity or spell.name in self: raise ValueError(\"...\")`, otherwise `self.spells.append(spell)` (`spell.name in self` uses your own `__contains__`!). For the total, put `@property` on the line above `def total_mana(self):` and return `sum(spell.mana for spell in self.spells)`."
        ],
        solution: py`
          class Spell:
              def __init__(self, name, mana):
                  if name == "":
                      raise ValueError("A spell needs a name")
                  if mana < 1:
                      raise ValueError("A spell must cost at least 1 mana")
                  self.name = name
                  self.mana = mana

              def __repr__(self):
                  return f"Spell({self.name!r}, {self.mana!r})"


          class Spellbook:
              def __init__(self, owner, capacity):
                  self.owner = owner
                  self.capacity = capacity
                  self.spells = []              # composition: the book holds Spell objects

              def add(self, spell):
                  if len(self) >= self.capacity:
                      raise ValueError("The spellbook is full")
                  if spell.name in self:        # uses __contains__ below
                      raise ValueError(f"{spell.name} is already in the book")
                  self.spells.append(spell)

              def __len__(self):
                  return len(self.spells)

              def __contains__(self, name):
                  for spell in self.spells:
                      if spell.name == name:
                          return True
                  return False

              def __getitem__(self, name):
                  for spell in self.spells:
                      if spell.name == name:
                          return spell
                  raise KeyError(name)

              def __iter__(self):
                  return iter(self.spells)

              @property
              def total_mana(self):
                  return sum(spell.mana for spell in self.spells)
        `,
        altSolutions: [
          py`
            # A dict keyed by name does most of the work (dicts remember insertion order).
            class Spell:
                def __init__(self, name, mana):
                    if not name or mana < 1:
                        raise ValueError("Spells need a name and at least 1 mana")
                    self.name = name
                    self.mana = mana


            class Spellbook:
                def __init__(self, owner, capacity):
                    self.owner = owner
                    self.capacity = capacity
                    self._spells = {}

                def add(self, spell):
                    if spell.name in self._spells:
                        raise ValueError("Duplicate spell: " + spell.name)
                    if len(self._spells) == self.capacity:
                        raise ValueError("No room left in the book")
                    self._spells[spell.name] = spell

                def __len__(self):
                    return len(self._spells)

                def __contains__(self, name):
                    return name in self._spells

                def __getitem__(self, name):
                    return self._spells[name]       # a missing name raises KeyError by itself

                def __iter__(self):
                    return iter(self._spells.values())

                @property
                def total_mana(self):
                    return sum(spell.mana for spell in self._spells.values())
          `,
          py`
            class Spell:
                def __init__(self, name, mana):
                    if len(name) == 0:
                        raise ValueError("A spell needs a name")
                    if mana <= 0:
                        raise ValueError("Mana must be at least 1")
                    self.name = name
                    self.mana = mana


            class Spellbook:
                def __init__(self, owner, capacity):
                    self.owner = owner
                    self.capacity = capacity
                    self.pages = []

                def names(self):
                    return [spell.name for spell in self.pages]

                def add(self, spell):
                    if len(self.pages) >= self.capacity or spell.name in self.names():
                        raise ValueError("Can't add " + spell.name)
                    self.pages.append(spell)

                def __len__(self):
                    return len(self.pages)

                def __contains__(self, name):
                    return name in self.names()

                def __getitem__(self, name):
                    if name not in self:
                        raise KeyError(name)
                    return self.pages[self.names().index(name)]

                def __iter__(self):
                    for spell in self.pages:
                        yield spell

                @property
                def total_mana(self):
                    total = 0
                    for spell in self.pages:
                        total += spell.mana
                    return total


            book = Spellbook("Ada", 2)
            book.add(Spell("Fireball", 8))
            print(len(book), "Fireball" in book, book.total_mana)
          `
        ],
        wrongSolutions: [
          py`
            # The list lives in the class body, so every book shares the same spells.
            class Spell:
                def __init__(self, name, mana):
                    if name == "" or mana < 1:
                        raise ValueError("Bad spell")
                    self.name = name
                    self.mana = mana


            class Spellbook:
                spells = []

                def __init__(self, owner, capacity):
                    self.owner = owner
                    self.capacity = capacity

                def add(self, spell):
                    if len(self.spells) >= self.capacity or spell.name in self:
                        raise ValueError("Can't add that spell")
                    self.spells.append(spell)

                def __len__(self):
                    return len(self.spells)

                def __contains__(self, name):
                    return name in [spell.name for spell in self.spells]

                def __getitem__(self, name):
                    for spell in self.spells:
                        if spell.name == name:
                            return spell
                    raise KeyError(name)

                def __iter__(self):
                    return iter(self.spells)

                @property
                def total_mana(self):
                    return sum(spell.mana for spell in self.spells)
          `,
          py`
            # __iter__ returns the list itself instead of an iterator.
            class Spell:
                def __init__(self, name, mana):
                    if name == "" or mana < 1:
                        raise ValueError("Bad spell")
                    self.name = name
                    self.mana = mana


            class Spellbook:
                def __init__(self, owner, capacity):
                    self.owner = owner
                    self.capacity = capacity
                    self.spells = []

                def add(self, spell):
                    if len(self.spells) >= self.capacity or spell.name in self:
                        raise ValueError("Can't add that spell")
                    self.spells.append(spell)

                def __len__(self):
                    return len(self.spells)

                def __contains__(self, name):
                    return name in [spell.name for spell in self.spells]

                def __getitem__(self, name):
                    for spell in self.spells:
                        if spell.name == name:
                            return spell
                    raise KeyError(name)

                def __iter__(self):
                    return self.spells

                @property
                def total_mana(self):
                    return sum(spell.mana for spell in self.spells)
          `,
          py`
            # total_mana is an ordinary method, not a property.
            class Spell:
                def __init__(self, name, mana):
                    if name == "" or mana < 1:
                        raise ValueError("Bad spell")
                    self.name = name
                    self.mana = mana


            class Spellbook:
                def __init__(self, owner, capacity):
                    self.owner = owner
                    self.capacity = capacity
                    self.spells = []

                def add(self, spell):
                    if len(self.spells) >= self.capacity or spell.name in self:
                        raise ValueError("Can't add that spell")
                    self.spells.append(spell)

                def __len__(self):
                    return len(self.spells)

                def __contains__(self, name):
                    return name in [spell.name for spell in self.spells]

                def __getitem__(self, name):
                    for spell in self.spells:
                        if spell.name == name:
                            return spell
                    raise KeyError(name)

                def __iter__(self):
                    return iter(self.spells)

                def total_mana(self):
                    return sum(spell.mana for spell in self.spells)
          `
        ],
        tests: py`
          import traceback as _traceback

          SHAPES = {
              "Spell": "def __init__(self, name, mana):",
              "Spellbook": "def __init__(self, owner, capacity):",
          }


          def _in_spell(exc):
              # True if the error happened inside the spell's own code, not at the call itself.
              return any(frame.filename == "<spell>" for frame in _traceback.extract_tb(exc.__traceback__))


          def build(kind, *args):
              cls = need_class(kind)
              try:
                  return cls(*args)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't build " + code(kind + "(" + ", ".join(short(a) for a in args) + ")") + ": " + str(exc)
                       + ". Its " + code("__init__") + " should start " + code(SHAPES[kind]) + ".")


          def call(book, method, *args):
              func = need_method(book, method)
              try:
                  return func(*args)
              except TypeError as exc:
                  if _in_spell(exc):
                      raise
                  fail("Python couldn't call " + code(method) + ": " + str(exc) + ". Check its parameters: a method's first parameter is "
                       + code("self") + ".")


          def add(book, spell):
              call(book, "add", spell)


          def size(book):
              count = call(book, "__len__")
              expect(isinstance(count, int) and not isinstance(count, bool) and count >= 0,
                     code("__len__") + " must return a whole number (0 or more), but it returned " + short(count) + ".")
              return len(book)


          def has(book, name):
              call(book, "__contains__", name)
              return name in book


          def fresh_book(owner, capacity):
              book = build("Spellbook", owner, capacity)
              expect_equal(size(book), 0, "A brand-new spellbook should be empty, so " + code("len(book)")
                           + " should be 0. If it already holds spells, every book is sharing one list: create it inside "
                           + code("__init__") + " with " + code("self") + ".")
              return book


          def spells_in(book):
              it = call(book, "__iter__")
              expect(hasattr(it, "__next__"), code("__iter__") + " must return an iterator, but it returned a "
                     + code(type(it).__name__) + ". Wrap your list with " + code("iter(...)") + ", for example "
                     + code("return iter(self.spells)") + ".")
              return list(book)


          def lookup(book, name):
              try:
                  return call(book, "__getitem__", name)
              except TypeError as exc:
                  if "indices must be integers" in str(exc):
                      fail(code("book[" + short(name) + "]") + " should find the spell by its name, but " + code("__getitem__")
                           + " used the name as a list position (" + str(exc) + "). Look through the spells and compare each one's "
                           + code(".name") + ".")
                  raise


          def describe(thing):
              # Name a spell without relying on its __repr__.
              if isinstance(thing, need_class("Spell")):
                  return "the spell named " + short(getattr(thing, "name", "?"))
              return short(thing)


          def total(book):
              prop = getattr(type(book), "total_mana", None)
              if not isinstance(prop, property):
                  fail(code("total_mana") + " should be a property that you read without brackets, as " + code("book.total_mana")
                       + ". Put " + code("@property") + " on the line above " + code("def total_mana(self):") + ".")
              value = book.total_mana
              expect(isinstance(value, (int, float)) and not isinstance(value, bool),
                     code("book.total_mana") + " should be a number, but it's " + short(value) + ".")
              return value


          @test("A Spell keeps its name and mana, and refuses an empty name or mana below 1")
          def _():
              fire = build("Spell", "Fireball", 8)
              expect_equal(need_attr(fire, "name"), "Fireball", "The spell's " + code("name") + " is wrong.")
              expect_equal(need_attr(fire, "mana"), 8, "The spell's " + code("mana") + " is wrong.")
              try:
                  spark = build("Spell", "Spark", 1)
              except ValueError:
                  fail(code('Spell("Spark", 1)') + " raised a ValueError, but 1 mana is allowed: only mana below 1 should be refused.")
              expect_equal(need_attr(spark, "mana"), 1, "The spell's " + code("mana") + " is wrong.")
              Spell = need_class("Spell")
              expect_raises(ValueError, Spell, "Fizzle", 0,
                            message=code('Spell("Fizzle", 0)') + " should raise a ValueError: a spell must cost at least 1 mana.")
              expect_raises(ValueError, Spell, "Drain", -5,
                            message=code('Spell("Drain", -5)') + " should raise a ValueError: a spell must cost at least 1 mana.")
              expect_raises(ValueError, Spell, "", 4,
                            message=code('Spell("", 4)') + " should raise a ValueError: a spell needs a name.")


          @test("A new Spellbook knows its owner and capacity, and starts empty")
          def _():
              book = build("Spellbook", "Ada", 3)
              expect_equal(need_attr(book, "owner"), "Ada", "The spellbook's " + code("owner") + " is wrong.")
              expect_equal(need_attr(book, "capacity"), 3, "The spellbook's " + code("capacity") + " is wrong.")
              expect_equal(size(book), 0, "A new spellbook should be empty, so " + code("len(book)") + " should be 0.")


          @test("add() puts spells in the book, and len, in and [] all find them")
          def _():
              book = fresh_book("Ada", 5)
              fire, frost = build("Spell", "Fireball", 8), build("Spell", "Frost", 5)
              add(book, fire)
              add(book, frost)
              expect_equal(size(book), 2, "After adding two spells, " + code("len(book)") + " should be 2.")
              expect(has(book, "Frost"), code('"Frost" in book') + " should be True after adding Frost. " + code("__contains__")
                     + " receives the name, a string: compare it with each spell's name.")
              expect(not has(book, "Heal"), code('"Heal" in book') + " should be False: no Heal spell was added.")
              found = lookup(book, "Frost")
              expect(found is frost, code('book["Frost"]') + " should give back the Frost spell you added, but it gave "
                     + describe(found) + ".")
              expect_raises(KeyError, lambda: book["Heal"],
                            message=code('book["Heal"]') + " should raise a KeyError, because the book has no Heal spell.")
              other = build("Spellbook", "Pip", 3)
              expect_equal(size(other), 0, "Adding spells to one book also put them in another! Every book needs its own list: create it inside "
                           + code("__init__") + " with " + code("self") + ", not in the class body.")


          @test("Looping over the book gives its Spells in the order they were added")
          def _():
              Spell = need_class("Spell")
              book = fresh_book("Ada", 5)
              for name, mana in (("Frost", 5), ("Fireball", 8), ("Blink", 2)):
                  add(book, build("Spell", name, mana))
              items = spells_in(book)
              expect(all(isinstance(item, Spell) for item in items), "Looping over the book should give Spell objects, but it gave "
                     + short(items) + ".")
              expect_equal([need_attr(item, "name") for item in items], ["Frost", "Fireball", "Blink"],
                           code("for spell in book") + " should go through the spells in the order they were added.")
              expect_equal([need_attr(item, "name") for item in book], ["Frost", "Fireball", "Blink"],
                           "Looping over the book a second time should give the same spells again.")
              pairs = [(a, b) for a in book for b in book]
              expect_equal(len(pairs), 9, "A loop over the book inside another loop over the book should see every spell each time "
                           + "(3 × 3 = 9 pairs). Make " + code("__iter__") + " return a fresh iterator every time, such as "
                           + code("return iter(self.spells)") + ", rather than " + code("self") + ".")


          @test("total_mana is a @property that adds up the mana of every spell")
          def _():
              book = fresh_book("Ada", 5)
              expect_equal(total(book), 0, "An empty book's " + code("total_mana") + " should be 0.")
              add(book, build("Spell", "Fireball", 8))
              add(book, build("Spell", "Frost", 5))
              expect_equal(total(book), 13, "With Fireball (8) and Frost (5), " + code("total_mana") + " should be 13.")
              add(book, build("Spell", "Blink", 2))
              expect_equal(total(book), 15, code("total_mana") + " should keep up as spells are added: 8 + 5 + 2 = 15.")


          @test("add() refuses a second spell with the same name, or any spell once the book is full")
          def _():
              book = fresh_book("Ada", 2)
              add(book, build("Spell", "Fireball", 8))
              expect_raises(ValueError, need_method(book, "add"), build("Spell", "Fireball", 3),
                            message="The book already has a Fireball, so adding another spell named Fireball should raise a ValueError.")
              expect_equal(size(book), 1, "A refused spell must not be added to the book.")
              add(book, build("Spell", "Frost", 5))
              expect_equal(size(book), 2, "Adding Frost to a book with room for 2 should work.")
              expect_raises(ValueError, need_method(book, "add"), build("Spell", "Heal", 3),
                            message="A book with capacity 2 that already holds 2 spells is full: adding a third should raise a ValueError.")
              expect_equal(size(book), 2, "A refused spell must not be added to the book.")
        `,
        scene: { icon: "📖", successIcon: "⚡", successText: "The living spellbook snaps shut with a contented purr, every page glowing in order!", effect: "lightning" }
      }
    ]
  });
})();
