/*
 * Syntax & Sorcery — the spell-checking harness.
 *
 * SS.HARNESS_PY holds the Python source of the `spellcheck` module. It runs an
 * apprentice's spell (their Python code) plus a challenge's trials (test code)
 * and reports everything as plain JSON-friendly data. It uses only the standard
 * library, so it behaves the same inside Pyodide (the browser) and in CPython
 * (tools/validate_content.py).
 *
 * The source lives in a JS string so the game can run from file:// without
 * fetch(). Keep it free of backtick characters and dollar-brace sequences —
 * Python code here builds backticks with code() / BT instead.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  SS.HARNESS_PY = String.raw`
"""spellcheck: the trial harness for Syntax & Sorcery.

Public entry points
-------------------
run_spell(source, trials="", inputs=None, output_limit=50000) -> dict
run_spell_json(source, trials="", inputs_json="[]", output_limit=50000) -> str

Trial code (a challenge's "tests") runs in its own namespace with helpers such
as test(), expect(), expect_equal(), expect_output(), need_function() and
count_calls(). See syntax-and-sorcery/docs/DESIGN.md for the full guide.
"""

import ast
import builtins
import contextlib
import difflib
import inspect
import io
import json
import keyword
import linecache
import math
import re
import sys
import traceback

SPELL_FILE = "<spell>"
TRIALS_FILE = "<trials>"
DEFAULT_OUTPUT_LIMIT = 50000
BT = chr(96)  # a backtick: the game renders text between backticks as code
DQ = chr(34)  # a double quote


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def code(text):
    """Wrap text in backticks so the game shows it as inline code."""
    return BT + str(text) + BT


def short(value, limit=120):
    """repr() of a value, shortened so it fits in a message."""
    try:
        text = repr(value)
    except BaseException as exc:  # a broken __repr__ inside the spell
        text = "<" + type(value).__name__ + " object whose __repr__ raised " + type(exc).__name__ + ">"
    if len(text) > limit:
        text = text[: limit - 1] + "…"
    return text


def _plural(count, word):
    return str(count) + " " + word + ("" if count == 1 else "s")


def _type_name(value):
    return type(value).__name__


_TYPE_WORDS = {
    "int": "a whole number (int)",
    "float": "a decimal number (float)",
    "str": "a string (str)",
    "bool": "a boolean (bool)",
    "list": "a list",
    "dict": "a dictionary (dict)",
    "tuple": "a tuple",
    "set": "a set",
    "NoneType": "None",
    "function": "a function",
    "range": "a range",
}


def _a_type(name):
    """'int' -> 'a whole number (int)'; other names get 'a' or 'an'."""
    if name in _TYPE_WORDS:
        return _TYPE_WORDS[name]
    return ("an " if name[:1].lower() in "aeiou" else "a ") + name


def _normalize_lines(text):
    """Split output into lines, ignoring trailing spaces and trailing blank lines."""
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return lines


def _register_source(filename, source):
    """Let tracebacks show the lines of code that never lived in a real file."""
    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class SpellFailure(Exception):
    """A trial expectation was not met. Its message is shown to the player."""


class TooMuchOutput(BaseException):
    """The spell printed more than the output limit (usually a runaway loop).

    Derives from BaseException so that a spell's "except Exception" cannot
    swallow it and keep looping.
    """


class CallLimitExceeded(BaseException):
    """A function was called more often than a trial allows."""

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class NoMoreInput(EOFError):
    """input() was called but the challenge has no (more) input to give.

    Shown to the player exactly like Python's own EOFError.
    """

    def __init__(self, provided):
        super().__init__("EOF when reading a line")
        self.provided = provided


NoMoreInput.__name__ = NoMoreInput.__qualname__ = "EOFError"
NoMoreInput.__module__ = "builtins"


class TooManySteps(BaseException):
    """The spell ran more loop iterations + function calls than a limit allows."""

    def __init__(self, message, limit):
        super().__init__(message)
        self.message = message
        self.limit = limit


# ---------------------------------------------------------------------------
# Output capture and input()
# ---------------------------------------------------------------------------

class _Capture(io.TextIOBase):
    """A stdout replacement that remembers text and stops runaway printing."""

    def __init__(self, limit=DEFAULT_OUTPUT_LIMIT):
        super().__init__()
        self._parts = []
        self._size = 0
        self.limit = limit
        self.truncated = False

    def writable(self):
        return True

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError("write() argument must be str, not " + type(text).__name__)
        room = self.limit - self._size
        if len(text) > room:
            if room > 0:
                self._parts.append(text[:room])
                self._size += room
            self.truncated = True
            raise TooMuchOutput()
        self._parts.append(text)
        self._size += len(text)
        return len(text)

    def getvalue(self):
        return "".join(self._parts)


class _InputFeeder:
    """Replacement for input(): answers with the challenge's prepared values."""

    def __init__(self, values, echo):
        self.values = [str(v) for v in (values or [])]
        self.position = 0
        self.echo = echo

    def __call__(self, prompt=""):
        prompt = str(prompt)
        if self.position >= len(self.values):
            raise NoMoreInput(len(self.values))
        value = self.values[self.position]
        self.position += 1
        # Show the exchange the way a terminal would: the prompt, then the typed answer.
        self.echo.write(prompt + value + "\n")
        return value


@contextlib.contextmanager
def _spell_io(capture, inputs):
    saved = (sys.stdout, sys.stderr, builtins.input)
    sys.stdout = capture
    sys.stderr = capture
    builtins.input = _InputFeeder(inputs, capture)
    try:
        yield
    finally:
        sys.stdout, sys.stderr, builtins.input = saved


# ---------------------------------------------------------------------------
# Step limits: stop runaway loops and recursion gracefully
# ---------------------------------------------------------------------------

DEFAULT_STEP_LIMIT = 2000000  # loop iterations + function calls in the spell, per run and per trial


def _main_steps_message(limit):
    return ("Your spell took more than " + format(limit, ",") + " steps without finishing, so the academy's "
            "wards stopped it. Usually this means a loop that never ends (check that its condition eventually "
            "becomes False), or a function that calls itself far too many times.")


def _trial_steps_message(limit):
    return ("Your spell took more than " + format(limit, ",") + " steps during this trial, so it was stopped. "
            "Is a loop running forever, or is the approach far too slow for this input?")


def _custom_steps_message(limit):
    return ("Your spell needed more than " + format(limit, ",") + " steps here, which is too slow for this "
            "trial. Look for a faster approach (for example, avoid a loop inside another loop).")


class _StepBudget:
    """One active step limit. .used is how many steps the spell took inside it."""

    def __init__(self, counter, limit, message):
        self._counter = counter
        self.start = counter.count
        self.limit = limit
        self.message = message
        self.end = None

    @property
    def used(self):
        return (self.end if self.end is not None else self._counter.count) - self.start

    def __repr__(self):
        return "<steps used: " + str(self.used) + ">"


class _StepCounter:
    """Counts the spell's loop iterations and function calls with sys.monitoring.

    Only code compiled from the spell is counted. Every other code location is
    switched off after its first event, so the harness and the standard library
    run at full speed. Without sys.monitoring (Python < 3.12) limits are ignored.
    """

    def __init__(self):
        self.count = 0
        self.active = []
        self.trigger = None
        self.tool = None
        monitoring = getattr(sys, "monitoring", None)
        if monitoring is None:
            return
        for tool in (4, 3, 5):
            try:
                owner = monitoring.get_tool(tool)
                if owner is None:
                    monitoring.use_tool_id(tool, "spellcheck")
                elif owner != "spellcheck":
                    continue
                monitoring.register_callback(tool, monitoring.events.JUMP, self._event)
                monitoring.register_callback(tool, monitoring.events.PY_START, self._event)
                self.tool = tool
                return
            except Exception:
                continue

    def _event(self, code, *args):
        if code.co_filename != SPELL_FILE:
            return sys.monitoring.DISABLE
        self.count += 1
        if self.trigger is not None and self.count > self.trigger:
            budget = min(self.active, key=lambda b: b.start + b.limit)
            raise TooManySteps(budget.message, budget.limit)
        return None

    def _refresh(self):
        self.trigger = min((b.start + b.limit for b in self.active), default=None)
        if self.tool is not None:
            events = (sys.monitoring.events.JUMP | sys.monitoring.events.PY_START) if self.active else 0
            sys.monitoring.set_events(self.tool, events)

    @contextlib.contextmanager
    def limit(self, limit, message):
        budget = _StepBudget(self, limit, message)
        if self.tool is None or not limit:
            yield budget
            return
        self.active.append(budget)
        self._refresh()
        try:
            yield budget
        finally:
            budget.end = self.count
            self.active.remove(budget)
            self._refresh()


_STEPS = _StepCounter()


# ---------------------------------------------------------------------------
# Friendly explanations of Python errors
# ---------------------------------------------------------------------------

_BRACKET_PAIRS = {"(": ")", "[": "]", "{": "}"}


def _close_name(name, candidates, cutoff=0.75):
    pool = sorted({c for c in candidates if isinstance(c, str) and not c.startswith("__")})
    found = difflib.get_close_matches(name, pool, n=1, cutoff=cutoff)
    if not found:
        lowered = {c.lower(): c for c in pool}
        if name.lower() in lowered:
            return lowered[name.lower()]
        return None
    return found[0]


def _explain_syntax(exc):
    msg = exc.msg or ""
    line = exc.lineno
    where = (" on line " + str(line)) if line else ""
    low = msg.lower()

    if isinstance(exc, TabError):
        return ("Line " + str(line) + " mixes tabs and spaces for indentation. Use spaces only "
                "(4 spaces for each level).")
    if isinstance(exc, IndentationError):
        m = re.search(r"after '(\w+)' statement on line (\d+)", msg)
        if "expected an indented block" in low:
            opener = (" after the " + code(m.group(1)) + " on line " + m.group(2)) if m else ""
            return ("The code" + opener + " needs an indented block. Lines that belong inside an "
                    + code("if") + ", loop, " + code("def") + " or " + code("class")
                    + " must be pushed right by 4 spaces.")
        if "unexpected indent" in low:
            return ("Line " + str(line) + " is indented, but nothing above it opens a block. "
                    "Remove the extra spaces at the start of that line.")
        if "unindent does not match" in low:
            return ("The indentation of line " + str(line) + " doesn't line up with any line above it. "
                    "Use exactly 4 spaces for each level so the blocks line up.")
        return "There's an indentation problem" + where + ". Each level of indentation should be 4 spaces."

    if "expected ':'" in low:
        return ("Line " + str(line) + " is missing a colon " + code(":") + " at the end. Lines that start a "
                "block (" + code("if") + ", " + code("elif") + ", " + code("else") + ", " + code("for") + ", "
                + code("while") + ", " + code("def") + ", " + code("class") + ") must end with a colon.")
    if "unterminated string" in low or "eol while scanning" in low or "unterminated triple-quoted" in low:
        return ("Some text" + where + " is missing its closing quote. Every string needs matching quotes "
                "at both ends, like " + code(DQ + "Hello" + DQ) + ".")
    m = re.search(r"'([(\[{])' was never closed", msg)
    if m:
        return ("A " + code(m.group(1)) + " opened" + where + " is never closed. Add the matching "
                + code(_BRACKET_PAIRS[m.group(1)]) + ".")
    m = re.search(r"unmatched '([)\]}])'", msg)
    if m:
        return ("There's a " + code(m.group(1)) + where + " with no matching opening bracket. "
                "Remove it, or add the opening bracket it belongs to.")
    if "does not match opening parenthesis" in low:
        return ("Your brackets are mixed up" + where + ": each " + code("(") + ", " + code("[") + " or "
                + code("{") + " must be closed by its own partner " + code(")") + ", " + code("]")
                + " or " + code("}") + ".")
    if "missing parentheses in call to 'print'" in low:
        return ("In Python 3, " + code("print") + " needs parentheses: write "
                + code("print(" + DQ + "Hello" + DQ + ")") + ".")
    if "maybe you meant '==' or ':=' instead of '='" in low or "cannot assign to" in low and "comparison" in low:
        return ("To compare two values" + where + ", use " + code("==") + ". A single " + code("=")
                + " stores a value in a variable.")
    if "cannot assign to" in low or "cannot delete" in low:
        return ("The left side of " + code("=") + " must be a variable name" + where + ". Write the name "
                "first, then the value: " + code("power = 5") + ".")
    if "perhaps you forgot a comma" in low:
        return ("Python found two values side by side" + where + ". Perhaps a comma is missing between "
                "them, or some text is missing its quotes.")
    if "'return' outside function" in low:
        return code("return") + " can only be used inside a function (a block that starts with " + code("def") + ")."
    if "'break' outside loop" in low or "'continue' not properly in loop" in low:
        return code("break") + " and " + code("continue") + " only work inside a " + code("for") + " or " + code("while") + " loop."
    m = re.search(r"invalid character '(.)' \(U\+([0-9A-F]+)\)", msg)
    if m:
        if m.group(1) in "“”‘’":
            return ("Line " + str(line) + " contains a curly quote (" + m.group(1) + "), probably from copying "
                    "text. Replace it with a straight quote: " + code(DQ) + " or " + code("'") + ".")
        return "Line " + str(line) + " contains a character Python doesn't understand: " + m.group(1) + "."
    if "invalid decimal literal" in low:
        return ("Line " + str(line) + " has a number stuck to some letters. Variable names can't start "
                "with a digit, and numbers can't contain letters.")
    if "expected 'in'" in low:
        return "A " + code("for") + " loop needs the word " + code("in") + ": " + code("for item in collection:") + "."
    if low.startswith("f-string"):
        return "There's a problem inside an f-string" + where + ": " + msg + "."
    if "invalid syntax" in low or not low:
        return ("Python couldn't understand line " + str(line) + ". Look for a typo, a missing bracket, "
                "quote or colon, or a misplaced symbol. (Sometimes the real mistake is at the end of the line above!)")
    return "Python couldn't read your spell" + where + ": " + msg + "."


_METHOD_NAMES = {
    "upper": ("string", "name.upper()"), "lower": ("string", "name.lower()"),
    "title": ("string", "name.title()"), "capitalize": ("string", "name.capitalize()"),
    "strip": ("string", "text.strip()"), "split": ("string", "text.split()"),
    "replace": ("string", "text.replace(\"old\", \"new\")"), "startswith": ("string", "text.startswith(\"a\")"),
    "endswith": ("string", "text.endswith(\"a\")"), "isdigit": ("string", "text.isdigit()"),
    "isalpha": ("string", "text.isalpha()"), "join": ("string", "\", \".join(words)"),
    "append": ("list", "items.append(x)"), "extend": ("list", "items.extend(more)"),
    "insert": ("list", "items.insert(0, x)"), "remove": ("list", "items.remove(x)"),
    "pop": ("list", "items.pop()"), "keys": ("dictionary", "book.keys()"),
    "values": ("dictionary", "book.values()"), "items": ("dictionary", "book.items()"),
}

_FUNCTION_NOT_METHOD = {
    "len": "Use the " + code("len()") + " function instead: " + code("len(things)") + ".",
    "length": "Use the " + code("len()") + " function instead: " + code("len(things)") + ".",
    "size": "Use the " + code("len()") + " function instead: " + code("len(things)") + ".",
    "sum": "Use the " + code("sum()") + " function instead: " + code("sum(numbers)") + ".",
    "max": "Use the " + code("max()") + " function instead: " + code("max(numbers)") + ".",
    "min": "Use the " + code("min()") + " function instead: " + code("min(numbers)") + ".",
    "sorted": "Use the " + code("sorted()") + " function (" + code("sorted(items)") + ") or the list method " + code("items.sort()") + ".",
    "print": "Use the " + code("print()") + " function instead: " + code("print(value)") + ".",
    "str": "Use the " + code("str()") + " function instead: " + code("str(value)") + ".",
    "int": "Use the " + code("int()") + " function instead: " + code("int(text)") + ".",
}


def _innermost_spell_frame(exc):
    """The innermost frame of the spell's own code in exc's traceback (or None)."""
    found = None
    tb = getattr(exc, "__traceback__", None)
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == SPELL_FILE:
            found = tb.tb_frame
        tb = tb.tb_next
    return found


def explain(exc, line=None, namespace=None):
    """Return a short, beginner-friendly explanation of an exception."""
    where = (" on line " + str(line)) if line else ""
    msg = str(exc)

    if isinstance(exc, SyntaxError):
        return _explain_syntax(exc)
    if isinstance(exc, TooMuchOutput):
        return ("Your spell printed so much that the academy's wards stopped it. A loop that never ends is "
                "the usual culprit: make sure its condition eventually becomes False.")
    if isinstance(exc, CallLimitExceeded):
        return exc.message
    if isinstance(exc, TooManySteps):
        return exc.message + ((" (It was busy on line " + str(line) + ".)") if line else "")
    if isinstance(exc, NoMoreInput):
        if exc.provided == 0:
            return ("This challenge doesn't send any input, so " + code("input()") + " has nothing to read. "
                    "Use the values described in the task instead.")
        return ("Your spell called " + code("input()") + " more times than the challenge provides ("
                + _plural(exc.provided, "value") + "). If a loop should have stopped by now, check its condition: "
                "text from " + code("input()") + " such as " + code(DQ + "0" + DQ) + " never equals the number "
                + code("0") + ", so convert it with " + code("int()") + " first.")
    if isinstance(exc, RecursionError):
        return ("Your function called itself too many times in a row (this realm allows about "
                + format(sys.getrecursionlimit(), ",") + " nested calls). There are two usual causes. "
                "Either the base case is missing or never reached (every recursive function needs a simple "
                "situation it answers directly, and each call must move closer to it), or the input is so big "
                "that even correct recursion goes too deep. If smaller cases work, it's the second: "
                + code("@lru_cache") + " and generators inside " + code("sum()") + "/" + code("min()") + "/"
                + code("max()") + " each use extra levels, so solve big inputs with a loop or a table "
                "(bottom-up) instead.")
    if isinstance(exc, UnboundLocalError):
        m = re.search(r"variable '(\w+)'", msg) or re.search(r"'(\w+)'", msg)
        var = m.group(1) if m else "that variable"
        return ("Inside a function, you used " + code(var) + " before giving it a value there" + where
                + ". Because the function assigns to " + code(var) + ", Python treats it as a new local "
                "variable. Give it a starting value inside the function, or pass it in as a parameter.")
    if isinstance(exc, NameError):
        name = getattr(exc, "name", None)
        if not name:
            m = re.search(r"name '(\w+)' is not defined", msg)
            name = m.group(1) if m else None
        if name and name in _METHOD_NAMES and name not in (namespace or {}):
            kind, example = _METHOD_NAMES[name]
            return (code(name) + " is a " + kind + " method, so it goes after a dot" + where + ": write "
                    + code(example) + " rather than " + code(name + "(...)") + ".")
        if name == "self":
            return ("Python doesn't know " + code("self") + where + ". " + code("self") + " only exists inside a "
                    "method that lists it as its first parameter: write " + code("def __init__(self, name):")
                    + " (and " + code("def method(self):") + "), and use " + code("self") + " only inside methods.")
        if name:
            frame = _innermost_spell_frame(exc)
            obj = None
            if frame is not None:
                try:
                    obj = frame.f_locals.get("self")
                except Exception:
                    obj = None
            try:
                has_it = obj is not None and hasattr(obj, name)
            except Exception:
                has_it = False
            if has_it:
                return ("Inside a method, reach the object's attributes and methods through " + code("self") + where
                        + ": write " + code("self." + name) + " instead of " + code(name) + ".")
            pool = list((namespace or {}).keys()) + dir(builtins) + ["True", "False", "None"]
            near = _close_name(name, pool)
            if near and near != name:
                return ("Python doesn't know the name " + code(name) + where + ". Did you mean "
                        + code(near) + "? Names must match exactly, including capital letters.")
            return ("Python doesn't know any variable or function called " + code(name) + where
                    + ". Check the spelling, make sure you created it before this line, and if you meant "
                    "plain text, put it in quotes: " + code(DQ + name + DQ) + ".")
        return "Your spell used a name Python doesn't know" + where + "."
    if isinstance(exc, AttributeError):
        m = re.search(r"'(\w+)' object has no attribute '(\w+)'", msg)
        if m:
            owner, attr = m.group(1), m.group(2)
            if owner == "NoneType":
                return ("You tried to use " + code("." + attr) + " on " + code("None") + where + ". A function "
                        "probably forgot to " + code("return") + " its result (or you stored the result of a "
                        "method like " + code(".sort()") + ", which returns None).")
            fn_name = attr if attr in _FUNCTION_NOT_METHOD else _close_name(attr, list(_FUNCTION_NOT_METHOD), cutoff=0.8)
            if fn_name:
                return (code(attr) + " isn't a method of " + _a_type(owner) + where + ". "
                        + _FUNCTION_NOT_METHOD[fn_name])
            near = None
            obj = getattr(exc, "obj", None)
            if obj is not None:
                try:
                    near = _close_name(attr, dir(obj), cutoff=0.7)
                except Exception:
                    near = None
            text = "A " + code(owner) + " has no attribute or method called " + code(attr) + where + "."
            if near:
                text += " Did you mean " + code(near) + "?"
            elif owner not in dir(builtins):
                text += (" If " + code(owner) + " is your class, make sure it defines " + code(attr)
                         + " (for data, set " + code("self." + attr + " = ...") + " in " + code("__init__") + ").")
            return text
        m = re.search(r"module '(\w+)' has no attribute '(\w+)'", msg)
        if m:
            return "The module " + code(m.group(1)) + " has nothing called " + code(m.group(2)) + where + ". Check the spelling."
        return "Your spell used an attribute that doesn't exist" + where + ": " + msg + "."
    if isinstance(exc, TypeError):
        return _explain_type_error(msg, where)
    if isinstance(exc, ZeroDivisionError):
        return ("Your spell divided by zero" + where + ". Even archmages can't do that! Check the value "
                "you divide by (this includes " + code("//") + " and " + code("%") + ").")
    if isinstance(exc, IndexError):
        if "pop from empty" in msg:
            return ("You tried to " + code("pop()") + " from an empty collection" + where + ". Check that it "
                    "has items first, for example with " + code("if stack:") + ".")
        return ("You asked for a position that doesn't exist" + where + ". Positions start at 0, so the last "
                "item is at " + code("len(items) - 1") + " (and an empty list has no positions at all). Check both "
                "ends, like " + code("0 <= i < len(items)") + ": a negative position doesn't fail, it quietly counts "
                "from the end, so a missing lower-bound check can hide until later.")
    if isinstance(exc, KeyError):
        key = exc.args[0] if exc.args else None
        return ("The dictionary has no key " + short(key) + where + ". Check the spelling, add the key first, "
                "or use " + code(".get(key, default)") + " to supply a fallback.")
    if isinstance(exc, ValueError):
        m = re.search(r"invalid literal for int\(\) with base 10: (.*)", msg)
        if m:
            return code("int()") + " can't turn " + m.group(1) + " into a whole number" + where + "."
        if "could not convert string to float" in msg:
            return code("float()") + " couldn't turn that text into a number" + where + "."
        if "not enough values to unpack" in msg or "too many values to unpack" in msg:
            return ("The number of names on the left of " + code("=") + " doesn't match the number of values "
                    "on the right" + where + ".")
        if "arg is an empty sequence" in msg or "iterable argument is empty" in msg:
            return code("max()") + " and " + code("min()") + " need at least one item, but the collection was empty" + where + "."
        if "not in list" in msg:
            return "You tried to find or remove an item that isn't in the list" + where + "."
        if "math domain error" in msg:
            return "That math function can't handle this value" + where + " (for example, the square root of a negative number)."
        return "A value had the right type but couldn't be used" + where + ": " + msg + "."
    if isinstance(exc, AssertionError):
        return "An " + code("assert") + " in your spell failed" + where + "."
    if isinstance(exc, ModuleNotFoundError):
        name = getattr(exc, "name", None) or "that module"
        return ("The module " + code(name) + " isn't available in this realm. Stick to Python's built-in "
                "modules such as " + code("math") + ", " + code("random") + ", " + code("collections") + ", "
                + code("functools") + ", " + code("itertools") + " and " + code("heapq") + ".")
    if isinstance(exc, ImportError):
        return "Something couldn't be imported" + where + ": " + msg + "."
    if isinstance(exc, MemoryError):
        return "Your spell tried to use too much memory. Is a list growing forever inside a loop?"
    if isinstance(exc, OverflowError):
        return "A number grew too large for Python to handle" + where + "."
    if isinstance(exc, StopIteration):
        return code("next()") + " ran past the end of an iterator" + where + "."
    if isinstance(exc, SystemExit):
        return "Your spell called " + code("exit()") + ", which stopped it early."
    return "Your spell raised a " + code(type(exc).__name__) + where + ". The message below has the details."


def _magic_hint(type_name, method, usage):
    """For the player's own classes: which magic method makes an operation work."""
    if type_name in _TYPE_WORDS or type_name in dir(builtins):
        return ""
    return (" To make " + code(usage) + " work for your " + code(type_name) + " class, give it a "
            + code(method) + " method.")


def _explain_type_error(msg, where):
    m = re.search(r"__(str|repr)__ returned non-string \(type (\w+)\)", msg)
    if m:
        return ("Your " + code("__" + m.group(1) + "__") + " method must " + code("return") + " a string, but it "
                "returned " + _a_type(m.group(2)) + ". Build the text and " + code("return") + " it — don't "
                + code("print()") + " it inside the method.")
    if "__init__() should return None" in msg:
        return (code("__init__") + " must not return a value" + where + ". It only sets up the new object's "
                "attributes; remove the " + code("return") + " line.")
    if "object cannot be interpreted as an integer" in msg and "'float'" in msg:
        return ("A whole number was needed here" + where + " (for example in " + code("range()") + "), but you gave "
                "a decimal number. Use " + code("//") + " for division that gives a whole number, or wrap the value in "
                + code("int(...)") + ".")
    m = re.search(r'can only concatenate str \(not "(\w+)"\) to str', msg)
    if m:
        return ("You tried to join a string and " + _a_type(m.group(1)) + " with " + code("+") + where + ". Turn the value "
                "into text first with " + code("str(value)") + ", or use an f-string such as "
                + code("f" + DQ + "Level {level}" + DQ) + ".")
    m = re.search(r"unsupported operand type\(s\) for (.+?): '(\w+)' and '(\w+)'", msg)
    if m:
        op, left, right = m.group(1), m.group(2), m.group(3)
        text = "The " + code(op) + " operator can't combine " + _a_type(left) + " and " + _a_type(right) + where + "."
        if "NoneType" in (left, right):
            text += " One side is None: did a function forget to " + code("return") + " its result?"
        elif any(t in ("method", "function", "builtin_function_or_method") for t in (left, right)):
            text += (" One side is a method or function itself: did you forget the " + code("()") + " that calls it? "
                     + code("golem.describe") + " is the method; " + code("golem.describe()") + " is its result.")
        elif "str" in (left, right) and ("int" in (left, right) or "float" in (left, right)):
            text += (" Text and numbers don't mix: convert with " + code("int(...)") + " / "
                     + code("float(...)") + " or " + code("str(...)") + " first.")
        return text
    if "'NoneType' object" in msg or "type 'NoneType'" in msg:
        return ("You're using a value that is " + code("None") + where + ". This often means a function "
                "doesn't " + code("return") + " anything, so check for a missing return statement.")
    m = re.search(r"(\w+)\(\) missing (\d+) required positional arguments?: (.+)", msg)
    if m:
        func = m.group(1)
        text = code(func + "()") + " was called without all the values it needs" + where + " (missing " + m.group(3) + ")."
        if func == "__init__":
            text += " When you create an object, pass every value that " + code("__init__") + " expects (except " + code("self") + ")."
        elif "'self'" in m.group(3):
            text += (" A method needs an object to work on: call it on an object, like "
                     + code("golem." + func + "()") + ", not on the class itself.")
        return text
    m = re.search(r"(\w+)\(\) got multiple values for argument '(\w+)'", msg)
    if m:
        return (code(m.group(1) + "()") + " received " + code(m.group(2)) + " twice" + where + ". If "
                + code(m.group(1)) + " is a method inside a class, make sure its first parameter is " + code("self") + ".")
    m = re.search(r"(\w+)\(\) takes no arguments", msg)
    if m:
        return (code(m.group(1) + "()") + " was given values, but the class has no " + code("__init__")
                + " to receive them" + where + ". Check the spelling: " + code("def __init__(self, …):")
                + " has two underscores on each side.")
    m = re.search(r"(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:were|was) given", msg)
    if m:
        func, takes, given = m.group(1), int(m.group(2)), int(m.group(3))
        text = code(func + "()") + " was given " + str(given) + " value(s) but only accepts " + str(takes) + where + "."
        if given == takes + 1:
            text += (" If " + code(func) + " is a method inside a class, its first parameter must be "
                     + code("self") + ".")
        return text
    m = re.search(r"(\w+)\(\) got an unexpected keyword argument '(\w+)'", msg)
    if m:
        return code(m.group(1) + "()") + " has no parameter named " + code(m.group(2)) + where + "."
    m = re.search(r"'(\w+)' object is not callable", msg)
    if m:
        return ("You tried to call " + _a_type(m.group(1)) + " as if it were a function" + where + ". Check for a "
                "missing operator (for example " + code("2(x + 1)") + " instead of " + code("2 * (x + 1)")
                + "), or a variable that reuses a function's name.")
    m = re.search(r"'(\w+)' object is not subscriptable", msg)
    if m:
        return (_a_type(m.group(1)).capitalize() + " can't be indexed with square brackets" + where + "."
                + _magic_hint(m.group(1), "__getitem__", "obj[i]"))
    m = re.search(r"'(\w+)' object is not iterable", msg)
    if m:
        return ("You tried to loop over " + _a_type(m.group(1)) + where + ", but only collections such as lists, "
                "strings, dictionaries and ranges can be looped over. To repeat n times, use " + code("range(n)") + "."
                + _magic_hint(m.group(1), "__iter__", "for item in obj"))
    m = re.search(r"object of type '(\w+)' has no len\(\)", msg)
    if m:
        return (code("len()") + " only works on collections (strings, lists, dictionaries...), not on "
                + _a_type(m.group(1)) + where + "." + _magic_hint(m.group(1), "__len__", "len(obj)"))
    if "does not support item assignment" in msg and "'str'" in msg:
        return "Strings can't be changed in place" + where + ". Build a new string instead (for example with slicing and " + code("+") + ")."
    if "does not support item assignment" in msg and "'tuple'" in msg:
        return "Tuples can't be changed once made" + where + ". Use a list if you need to change items."
    m = re.search(r"(?:list|string|tuple) indices must be integers or slices, not (\w+)", msg)
    if m:
        text = "Positions in a sequence must be whole numbers" + where + ", but you used " + _a_type(m.group(1)) + "."
        if m.group(1) == "str":
            text += " If the number came from " + code("input()") + ", convert it with " + code("int(...)") + "."
        return text
    m = re.search(r"'([<>]=?)' not supported between instances of '(\w+)' and '(\w+)'", msg)
    if m:
        text = "Python can't compare " + _a_type(m.group(2)) + " with " + _a_type(m.group(3)) + " using " + code(m.group(1)) + where + "."
        if m.group(2) == m.group(3):
            text += " To compare your own objects, give the class a " + code("__lt__") + " method."
        return text
    m = re.search(r"unhashable type: '(\w+)'", msg)
    if m:
        return (_a_type(m.group(1)).capitalize() + " can't be a dictionary key or a set member" + where + ", because it can change. "
                "Use a tuple instead of a list. (With " + code("@lru_cache") + " or " + code("@cache") + ", every "
                "argument must be hashable in the same way.)")
    return "A value of the wrong type was used" + where + ": " + msg + "."


# ---------------------------------------------------------------------------
# Describing errors
# ---------------------------------------------------------------------------

def _frames(exc):
    """The innermost frames of a traceback (capped: a deep RecursionError can have thousands)."""
    try:
        return traceback.extract_tb(exc.__traceback__, limit=-60)
    except Exception:
        return []


def _blame_spell(exc):
    """True if the deepest frame from the spell or the trials belongs to the spell."""
    for frame in reversed(_frames(exc)):
        if frame.filename == SPELL_FILE:
            return True
        if frame.filename == TRIALS_FILE:
            return False
    return False


def _spell_line(exc):
    spell_frames = [f for f in _frames(exc) if f.filename == SPELL_FILE]
    if not spell_frames:
        return None
    last = spell_frames[-1]
    # A RecursionError (or a step limit hit as a call starts) is raised in the frame that
    # was just entered, which still points at its "def" line. The useful line is the call.
    text = (last.line or "").lstrip()
    if len(spell_frames) > 1 and (text.startswith("def ") or text.startswith("async def ")):
        return spell_frames[-2].lineno
    return last.lineno


def _exception_only(exc):
    try:
        return "".join(traceback.format_exception_only(type(exc), exc)).rstrip()
    except Exception:
        return type(exc).__name__ + ": " + str(exc)


def _spell_traceback(exc):
    spell_frames = [f for f in _frames(exc) if f.filename == SPELL_FILE]
    parts = []
    if spell_frames:
        parts.append("Traceback (most recent call last):\n")
        parts.extend(traceback.StackSummary.from_list(spell_frames).format())
    parts.append(_exception_only(exc))
    return "".join(parts).rstrip()


def describe_error(exc, phase, namespace=None):
    """Turn an exception from the spell into a dict the game can display."""
    info = {
        "type": type(exc).__name__,
        "message": str(exc),
        "line": None,
        "phase": phase,
        "traceback": "",
        "friendly": "",
    }
    if isinstance(exc, SyntaxError):
        info["line"] = exc.lineno
        info["message"] = exc.msg
        info["traceback"] = _exception_only(exc)
    elif isinstance(exc, TooMuchOutput):
        info["type"] = "TooMuchOutput"
        info["message"] = "the spell printed too much output"
        info["line"] = _spell_line(exc)
    elif isinstance(exc, CallLimitExceeded):
        info["message"] = exc.message
        info["line"] = _spell_line(exc)
    elif isinstance(exc, TooManySteps):
        info["type"] = "TooManySteps"
        info["message"] = "more than " + format(exc.limit, ",") + " steps"
        info["line"] = _spell_line(exc)
    else:
        info["line"] = _spell_line(exc)
        info["traceback"] = _spell_traceback(exc)
    try:
        info["friendly"] = explain(exc, info["line"], namespace)
    except Exception as oops:  # never let the explainer break a run
        info["friendly"] = "Your spell raised " + type(exc).__name__ + "."
    return info


# ---------------------------------------------------------------------------
# Expectation helpers available to trial code
# ---------------------------------------------------------------------------

def fail(message):
    """Fail the current trial with a message for the player."""
    raise SpellFailure(message)


def expect(condition, message="A trial check failed."):
    """Fail the trial with message unless condition is true."""
    if not condition:
        raise SpellFailure(message)


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def expect_equal(actual, expected, message=None):
    """Fail unless actual == expected, explaining the difference."""
    if actual == expected:
        return
    detail = "Expected " + short(expected) + ", but got " + short(actual) + "."
    if actual is None and expected is not None:
        detail += " (Did you forget to " + code("return") + " the value?)"
    elif type(actual) is not type(expected) and not (_is_number(actual) and _is_number(expected)):
        detail += (" (Expected " + _a_type(_type_name(expected)) + ", but got "
                   + _a_type(_type_name(actual)) + ".)")
    raise SpellFailure((message + " " if message else "") + detail)


def expect_close(actual, expected, tolerance=1e-6, message=None):
    """Fail unless the number actual is within tolerance of expected."""
    prefix = (message + " ") if message else ""
    if not _is_number(actual):
        raise SpellFailure(prefix + "Expected a number close to " + short(expected) + ", but got " + short(actual) + ".")
    if not math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance):
        raise SpellFailure(prefix + "Expected about " + short(expected) + ", but got " + short(actual) + ".")


def expect_raises(exception_type, func, *args, message=None, **kwargs):
    """Fail unless calling func(*args, **kwargs) raises exception_type. Returns the exception."""
    prefix = (message + " ") if message else ""
    try:
        func(*args, **kwargs)
    except exception_type as exc:
        return exc
    except SpellFailure:
        raise
    except Exception as exc:
        raise SpellFailure(prefix + "Expected a " + code(exception_type.__name__) + " to be raised, but got "
                           + code(type(exc).__name__) + ": " + str(exc))
    raise SpellFailure(prefix + "Expected a " + code(exception_type.__name__) + " to be raised, but nothing was raised.")


def _near_miss(expected, actual):
    if expected.lower() == actual.lower():
        return " Check your capital letters."
    if expected.replace(" ", "") == actual.replace(" ", ""):
        return " Check the spaces."
    strip = re.compile(r"[^\w\s]")
    if strip.sub("", expected) == strip.sub("", actual):
        return " Check the punctuation."
    if expected.strip() == actual.strip():
        return " Check for extra spaces at the start of the line."
    return ""


def _compare_output(actual_text, expected, message=None):
    if isinstance(expected, (list, tuple)):
        expected = "\n".join(str(item) for item in expected)
    want = _normalize_lines(expected)
    got = _normalize_lines(actual_text)
    if want == got:
        return
    prefix = (message + " ") if message else ""
    if not got:
        raise SpellFailure(prefix + "Your spell didn't print anything. Expected:\n" + "\n".join(want))
    for index, (w, g) in enumerate(zip(want, got)):
        if w != g:
            raise SpellFailure(prefix + "Line " + str(index + 1) + " of the output should be " + short(w)
                               + ", but your spell printed " + short(g) + "." + _near_miss(w, g))
    if len(got) > len(want):
        raise SpellFailure(prefix + "Your spell printed more lines than expected. The first extra line is "
                           + short(got[len(want)]) + ".")
    raise SpellFailure(prefix + "Your spell's output stopped too soon. The next line should be "
                       + short(want[len(got)]) + ".")


def need_method(target, name):
    """Return target.name if it is callable, else fail with a friendly message."""
    label = target.__name__ if isinstance(target, type) else type(target).__name__
    attr = getattr(target, name, None)
    if attr is None or not callable(attr):
        raise SpellFailure("The class " + code(label) + " needs a method named " + code(name) + ".")
    return attr


def need_attr(obj, name):
    """Return obj.name, or fail with a hint about setting it in __init__."""
    try:
        return getattr(obj, name)
    except AttributeError:
        label = type(obj).__name__
        raise SpellFailure("A " + code(label) + " object should have an attribute " + code(name)
                           + ". Set it in " + code("__init__") + " with " + code("self." + name + " = ...") + ".")


def has_own_method(cls, name):
    """True if the class itself (not a parent) defines the method."""
    return isinstance(cls, type) and callable(vars(cls).get(name))


class _CallCounter:
    def __init__(self):
        self.count = 0

    def __repr__(self):
        return "<calls: " + str(self.count) + ">"


_SYNTAX_KINDS = {
    "for": (ast.For, ast.AsyncFor),
    "while": (ast.While,),
    "if": (ast.If, ast.IfExp),
    "def": (ast.FunctionDef, ast.AsyncFunctionDef),
    "class": (ast.ClassDef,),
    "lambda": (ast.Lambda,),
    "listcomp": (ast.ListComp,),
    "dictcomp": (ast.DictComp,),
    "setcomp": (ast.SetComp,),
    "genexp": (ast.GeneratorExp,),
    "comprehension": (ast.ListComp, ast.DictComp, ast.SetComp, ast.GeneratorExp),
    "fstring": (ast.JoinedStr,),
    "import": (ast.Import, ast.ImportFrom),
    "try": (ast.Try,) + ((ast.TryStar,) if hasattr(ast, "TryStar") else ()),
    "with": (ast.With,),
    "return": (ast.Return,),
    "yield": (ast.Yield, ast.YieldFrom),
    "augassign": (ast.AugAssign,),
    "slice": (ast.Slice,),
    "assert": (ast.Assert,),
    "raise": (ast.Raise,),
    "break": (ast.Break,),
    "continue": (ast.Continue,),
    "global": (ast.Global, ast.Nonlocal),
    "dict": (ast.Dict, ast.DictComp),
    "list": (ast.List, ast.ListComp),
    "set": (ast.Set, ast.SetComp),
    "tuple": (ast.Tuple,),
}


# ---------------------------------------------------------------------------
# The trial runner
# ---------------------------------------------------------------------------

class _Trials:
    """Collects and runs the trials registered by a challenge's test code."""

    def __init__(self, source, compiled, spell, output, inputs, output_limit, step_limit=DEFAULT_STEP_LIMIT):
        self.step_limit_per_trial = step_limit
        self.source = source
        self.compiled = compiled
        self.spell = spell
        self.output = output
        self.inputs = list(inputs or [])
        self.output_limit = output_limit
        self.registered = []
        self._tree = None

    # -- registration ------------------------------------------------------
    def test(self, name):
        """Decorator: @test("Description shown to the player")."""
        if callable(name):  # used as a bare @test
            func = name
            self.registered.append(((func.__doc__ or func.__name__).strip(), func))
            return func

        def register(func):
            self.registered.append((str(name), func))
            return func
        return register

    # -- finding things in the spell ---------------------------------------
    def need(self, name):
        if name in self.spell:
            return self.spell[name]
        near = _close_name(name, [k for k in self.spell if not k.startswith("_")], cutoff=0.6)
        text = "Your spell needs to create " + code(name) + ", but I couldn't find it."
        if near:
            text += " I did find " + code(near) + " — names must match exactly, including capital letters."
        raise SpellFailure(text)

    def need_function(self, name, params=None):
        obj = self.need(name)
        if isinstance(obj, type):
            raise SpellFailure(code(name) + " should be a function made with " + code("def") + ", but it's a class.")
        if not callable(obj):
            raise SpellFailure(code(name) + " should be a function made with " + code("def")
                               + ", but it's " + _a_type(_type_name(obj)) + ".")
        if params is not None:
            try:
                signature = inspect.signature(obj)
            except (TypeError, ValueError):
                return obj
            try:
                signature.bind(*range(params))
            except TypeError:
                raise SpellFailure(code(name) + " should take " + _plural(params, "parameter")
                                   + ", but yours takes " + str(len(signature.parameters)) + ".")
        return obj

    def need_class(self, name, parent=None):
        obj = self.need(name)
        if not isinstance(obj, type):
            raise SpellFailure(code(name) + " should be a class made with " + code("class")
                               + ", but it's " + _a_type(_type_name(obj)) + ".")
        if parent is not None:
            parent_cls = self.need_class(parent) if isinstance(parent, str) else parent
            if not issubclass(obj, parent_cls):
                raise SpellFailure(code(name) + " should inherit from " + code(parent_cls.__name__) + ": write "
                                   + code("class " + name + "(" + parent_cls.__name__ + "):") + ".")
        return obj

    # -- output ------------------------------------------------------------
    def expect_output(self, expected, actual=None, message=None):
        """Compare printed output (the spell's main run by default) with expected."""
        _compare_output(self.output if actual is None else actual, expected, message)

    def expect_in_output(self, text, actual=None, message=None):
        """Fail unless text appears somewhere in the printed output."""
        haystack = "\n".join(_normalize_lines(self.output if actual is None else actual))
        if str(text) in haystack:
            return
        prefix = (message + " ") if message else ""
        hint = ""
        if str(text).lower() in haystack.lower():
            hint = " (It's nearly there: check the capital letters.)"
        raise SpellFailure(prefix + "Your spell's output should include " + short(str(text)) + "." + hint)

    def capture(self, func, *args, **kwargs):
        """Call func and return (result, printed_text)."""
        buffer = _Capture(self.output_limit)
        saved = sys.stdout
        sys.stdout = buffer
        try:
            result = func(*args, **kwargs)
        finally:
            sys.stdout = saved
        return result, buffer.getvalue()

    def run_program(self, inputs=()):
        """Run the whole spell again in a fresh namespace with the given inputs; return its output."""
        inputs = list(inputs)
        namespace = {"__name__": "__main__", "__builtins__": builtins}
        buffer = _Capture(self.output_limit)
        label = ("With input " + ", ".join(short(str(v)) for v in inputs)) if inputs else "When run again"
        with _spell_io(buffer, inputs):
            try:
                exec(self.compiled, namespace)
            except SystemExit:
                pass
            except TooMuchOutput:
                raise SpellFailure(label + ", your spell printed far too much. Is a loop running forever?")
            except (CallLimitExceeded, TooManySteps):
                raise
            except BaseException as exc:
                info = describe_error(exc, "trial", namespace)
                where = (" on line " + str(info["line"])) if info["line"] else ""
                raise SpellFailure(label + ", your spell crashed" + where + " with " + info["type"] + ": "
                                   + info["message"] + ". " + info["friendly"])
        return buffer.getvalue()

    # -- efficiency --------------------------------------------------------
    @contextlib.contextmanager
    def count_calls(self, name, limit=None, message=None):
        """Count calls to the spell's top-level function name (including recursive calls)."""
        original = self.need_function(name)
        counter = _CallCounter()

        def counting(*args, **kwargs):
            counter.count += 1
            if limit is not None and counter.count > limit:
                raise CallLimitExceeded(message or (
                    code(name) + " was called more than " + str(limit) + " times, which is far too many. "
                    "Can you avoid working out the same answers again and again? (Try memoization: "
                    "remember results you've already computed.)"))
            return original(*args, **kwargs)

        self.spell[name] = counting
        try:
            yield counter
        finally:
            self.spell[name] = original

    def step_limit(self, limit, message=None):
        """Context manager: fail the trial if the spell takes more than limit steps inside it.

        A step is one loop iteration or one function call inside the spell.
        with step_limit(20000) as steps: ...   then steps.used
        """
        return _STEPS.limit(int(limit), message or _custom_steps_message(int(limit)))

    # -- looking at the code itself ---------------------------------------
    def _ast(self):
        if self._tree is None:
            self._tree = ast.parse(self.source)
        return self._tree

    def uses_call(self, name):
        """True if the spell calls a function or method called name anywhere."""
        for node in ast.walk(self._ast()):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name) and func.id == name:
                    return True
                if isinstance(func, ast.Attribute) and func.attr == name:
                    return True
        return False

    def uses_syntax(self, kind):
        """True if the spell uses a kind of syntax, e.g. "for", "while", "listcomp", "lambda"."""
        if kind not in _SYNTAX_KINDS:
            raise ValueError("uses_syntax(): unknown kind " + repr(kind) + "; choose from " + ", ".join(sorted(_SYNTAX_KINDS)))
        kinds = _SYNTAX_KINDS[kind]
        return any(isinstance(node, kinds) for node in ast.walk(self._ast()))

    def is_recursive(self, name):
        """True if the function (or method) called name calls itself.

        A plain function counts only calls by its bare name (so math.factorial()
        inside def factorial() is not recursion). A method also counts calls such as
        self.name(...) or self.next.name(...), but not super().name(...) or a call on
        an imported module.
        """
        tree = self._ast()
        methods = set()
        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        methods.add(id(item))
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                for alias in node.names:
                    imported.add((alias.asname or alias.name).split(".")[0])
        for node in ast.walk(tree):
            if not (isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name):
                continue
            is_method = id(node) in methods
            for inner in ast.walk(node):
                if not isinstance(inner, ast.Call):
                    continue
                func = inner.func
                if isinstance(func, ast.Name) and func.id == name:
                    return True
                if is_method and isinstance(func, ast.Attribute) and func.attr == name:
                    target = func.value
                    if isinstance(target, ast.Name) and target.id in imported:
                        continue
                    if (isinstance(target, ast.Call) and isinstance(target.func, ast.Name)
                            and target.func.id == "super"):
                        continue
                    return True
        return False

    # -- running -----------------------------------------------------------
    def namespace(self):
        return {
            "__name__": "__trials__",
            "__builtins__": builtins,
            "test": self.test,
            "spell": self.spell,
            "source": self.source,
            "output": self.output,
            "output_lines": _normalize_lines(self.output),
            "inputs": list(self.inputs),
            "SpellFailure": SpellFailure,
            "fail": fail,
            "expect": expect,
            "expect_equal": expect_equal,
            "expect_close": expect_close,
            "expect_raises": expect_raises,
            "expect_output": self.expect_output,
            "expect_in_output": self.expect_in_output,
            "need": self.need,
            "need_function": self.need_function,
            "need_class": self.need_class,
            "need_method": need_method,
            "need_attr": need_attr,
            "has_own_method": has_own_method,
            "capture": self.capture,
            "run_program": self.run_program,
            "count_calls": self.count_calls,
            "step_limit": self.step_limit,
            "uses_call": self.uses_call,
            "uses_syntax": self.uses_syntax,
            "is_recursive": self.is_recursive,
            "code": code,
            "short": short,
        }

    def _spell_at_fault(self, exc):
        """Errors raised at the boundary between a trial and the spell's own code.

        For example a method that forgot self fails with a TypeError raised at the
        call site (inside the trial), and a missing attribute on one of the
        spell's objects fails where the trial reads it. Both are the spell's doing.
        """
        msg = str(exc)
        if isinstance(exc, TypeError):
            if re.search(r"\(\) (?:takes|missing|got an unexpected keyword|got multiple values)", msg):
                return True
            if re.search(r"__\w+__", msg):  # e.g. "__str__ returned non-string"
                return True
            if "unhashable type" in msg:  # e.g. a list passed to an @lru_cache function
                return True
        if isinstance(exc, (TypeError, AttributeError)):
            owner = getattr(exc, "obj", None)
            if owner is not None:
                cls = owner if isinstance(owner, type) else type(owner)
                if getattr(cls, "__module__", None) == "__main__":
                    return True
            for name in re.findall(r"'(\w+)'", msg):
                if isinstance(self.spell.get(name), type):
                    return True
        return False

    def run_one(self, name, func):
        record = {"name": name, "passed": False, "message": "", "line": None, "crash": False}
        buffer = _Capture(self.output_limit)
        with _spell_io(buffer, self.inputs):
            try:
                with _STEPS.limit(self.step_limit_per_trial, _trial_steps_message(self.step_limit_per_trial or 0)):
                    func()
            except SpellFailure as failure:
                record["message"] = str(failure) or "This trial failed."
            except CallLimitExceeded as exc:
                record["message"] = exc.message
            except TooManySteps as exc:
                record["line"] = _spell_line(exc)
                record["message"] = exc.message + ((" (It was busy on line " + str(record["line"]) + ".)")
                                                   if record["line"] else "")
            except TooMuchOutput:
                record["message"] = "Your spell printed far too much during this trial. Is a loop running forever?"
            except BaseException as exc:
                if _blame_spell(exc) or self._spell_at_fault(exc):
                    info = describe_error(exc, "trial", self.spell)
                    record["line"] = info["line"]
                    if info["line"]:
                        lead = "Your spell raised " + info["type"] + " (line " + str(info["line"]) + ")"
                    else:
                        lead = "When the trial used your code, Python raised " + info["type"]
                    record["message"] = lead + ": " + info["message"] + ". " + info["friendly"]
                else:
                    record["crash"] = True
                    record["message"] = ("This trial couldn't finish (" + type(exc).__name__ + ": " + str(exc)
                                         + "). Check that your spell returns the kind of value the task asks for.")
                    record["debug"] = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            else:
                record["passed"] = True
        return record


def _internal_error(result, exc, where):
    result["status"] = "internal-error"
    result["error"] = {
        "type": type(exc).__name__,
        "message": str(exc),
        "line": None,
        "phase": "trials",
        "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
        "friendly": ("The trial runes for this challenge are broken (" + where + "). This is a bug in the "
                     "game, not in your spell. Please tell your instructor."),
    }
    return result


def run_spell(source, trials="", inputs=None, output_limit=DEFAULT_OUTPUT_LIMIT, step_limit=DEFAULT_STEP_LIMIT):
    """Run a spell and its trials. Always returns a JSON-friendly dict.

    step_limit caps loop iterations + function calls in the spell's main run and
    in each trial (0 or None = no cap), so runaway loops end with a helpful
    message and a line number instead of a timeout.
    """
    result = {
        "status": "ran",
        "stdout": "",
        "truncated": False,
        "error": None,
        "tests": [],
        "passed": 0,
        "total": 0,
    }
    source = str(source).replace("\r\n", "\n")
    trials = str(trials or "")
    inputs = list(inputs or [])
    recursion_limit = sys.getrecursionlimit()
    _register_source(SPELL_FILE, source)
    try:
        try:
            compiled = compile(source, SPELL_FILE, "exec")
        except (SyntaxError, ValueError) as exc:
            if not isinstance(exc, SyntaxError):  # e.g. null bytes in the source
                exc = SyntaxError(str(exc))
            result["status"] = "error"
            result["error"] = describe_error(exc, "syntax")
            return result

        spell = {"__name__": "__main__", "__builtins__": builtins}
        capture = _Capture(output_limit)
        problem = None
        with _spell_io(capture, inputs):
            try:
                with _STEPS.limit(step_limit, _main_steps_message(step_limit or 0)):
                    exec(compiled, spell)
            except SystemExit:
                pass
            except BaseException as exc:
                problem = exc
        result["stdout"] = capture.getvalue()
        result["truncated"] = capture.truncated
        if problem is not None:
            result["status"] = "error"
            result["error"] = describe_error(problem, "runtime", spell)
            return result
        if not trials.strip():
            return result

        runner = _Trials(source, compiled, spell, result["stdout"], inputs, output_limit, step_limit)
        _register_source(TRIALS_FILE, trials)
        try:
            exec(compile(trials, TRIALS_FILE, "exec"), runner.namespace())
        except BaseException as exc:
            return _internal_error(result, exc, "the trial code failed to load")
        if not runner.registered:
            return _internal_error(result, RuntimeError("no trials were registered"), "no trials found")

        for name, func in runner.registered:
            result["tests"].append(runner.run_one(name, func))
        result["total"] = len(result["tests"])
        result["passed"] = sum(1 for t in result["tests"] if t["passed"])
        result["status"] = "passed" if result["passed"] == result["total"] else "failed"
        return result
    finally:
        sys.setrecursionlimit(recursion_limit)


def run_spell_json(source, trials="", inputs_json="[]", output_limit=DEFAULT_OUTPUT_LIMIT,
                   step_limit=DEFAULT_STEP_LIMIT):
    """JSON-in/JSON-out wrapper used by the browser worker."""
    try:
        inputs = json.loads(inputs_json or "[]")
    except ValueError:
        inputs = []
    try:
        result = run_spell(source, trials, inputs, int(output_limit), int(step_limit or 0))
    except BaseException as exc:  # last line of defence: always answer
        result = _internal_error({"status": "internal-error", "stdout": "", "truncated": False, "error": None,
                                  "tests": [], "passed": 0, "total": 0}, exc, "the harness itself failed")
    return json.dumps(result)
`;
})(typeof window !== "undefined" ? window : globalThis);
