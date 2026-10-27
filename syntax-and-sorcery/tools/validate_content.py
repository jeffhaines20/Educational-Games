#!/usr/bin/env python3
"""Validate every Syntax & Sorcery challenge.

For each challenge this checks the content structure and then runs the real
trial harness (with CPython) to make sure that:

  * the reference solution and every altSolution PASS all trials,
  * the starter code does NOT pass (so the player has work to do),
  * every wrongSolution does NOT pass (the trials catch common mistakes),
  * no trial crashes on the reference solution (a crash means a buggy trial).

Usage:
    python3 tools/validate_content.py              # everything
    python3 tools/validate_content.py tower        # one chapter
    python3 tools/validate_content.py tower-first-words --show   # print full results

Requires Node.js (to read the JavaScript content files). Standard library only.
"""

import argparse
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)

ID_RE = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)+$")
RICH_BLOCK_KEYS = ({"code"}, {"code", "output"}, {"output"}, {"list"}, {"steps"}, {"tip"}, {"warning"})
RUN_TIMEOUT = 20  # seconds per run (CPython); the browser limit is set per challenge
SLOW_SECONDS = 1.5

RUNNER = r"""
import json, sys
sys.path.insert(0, sys.argv[1])
sys.setrecursionlimit(1000)  # match Pyodide's default
import spellcheck
payload = json.loads(sys.stdin.read())
result = spellcheck.run_spell(payload["code"], payload["tests"], payload.get("inputs") or [])
sys.stdout.write("\n@@RESULT@@" + json.dumps(result))
"""


def load_content():
    proc = subprocess.run(
        ["node", os.path.join(HERE, "extract_content.js")],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        sys.exit(2)
    return json.loads(proc.stdout)


# ---------------------------------------------------------------------------
# Structure checks
# ---------------------------------------------------------------------------

def check_inline(text, where, problems):
    if text.count("`") % 2:
        problems.append(where + ": odd number of backticks (unclosed inline code)")
    if text.count("**") % 2:
        problems.append(where + ": odd number of ** (unclosed bold)")


def check_rich(value, where, problems, required=True):
    if value is None or value == "" or value == []:
        if required:
            problems.append(where + ": missing")
        return
    blocks = value if isinstance(value, list) else [value]
    for i, block in enumerate(blocks):
        here = where + "[" + str(i) + "]"
        if isinstance(block, str):
            check_inline(block, here, problems)
        elif isinstance(block, dict):
            keys = set(block)
            if keys not in [set(k) for k in RICH_BLOCK_KEYS]:
                problems.append(here + ": unknown rich-text block keys " + str(sorted(keys)))
                continue
            for key in ("list", "steps"):
                if key in block:
                    if not isinstance(block[key], list) or not all(isinstance(x, str) for x in block[key]):
                        problems.append(here + ": " + key + " must be a list of strings")
                    else:
                        for j, item in enumerate(block[key]):
                            check_inline(item, here + "." + key + "[" + str(j) + "]", problems)
            for key in ("tip", "warning"):
                if key in block:
                    if not isinstance(block[key], str):
                        problems.append(here + ": " + key + " must be a string")
                    else:
                        check_inline(block[key], here + "." + key, problems)
            for key in ("code", "output"):
                if key in block and not isinstance(block[key], str):
                    problems.append(here + ": " + key + " must be a string")
        else:
            problems.append(here + ": blocks must be strings or objects")


def check_structure(data):
    problems, warnings = [], []
    effects = set(data["sceneEffects"])
    seen_ids = set()
    orders = []
    for chapter in data["chapters"]:
        cid = chapter.get("id", "?")
        where = "chapter " + cid
        for key in ("title", "subtitle", "icon"):
            if not isinstance(chapter.get(key), str) or not chapter.get(key):
                problems.append(where + ": missing " + key)
        if not isinstance(chapter.get("order"), int):
            problems.append(where + ": order must be an integer")
        orders.append(chapter.get("order"))
        check_rich(chapter.get("intro"), where + ".intro", problems)
        check_rich(chapter.get("outro"), where + ".outro", problems)
        for ch in chapter.get("challenges", []):
            wid = ch.get("id", "?")
            w = "challenge " + wid
            if not ID_RE.match(wid) or not wid.startswith(cid + "-"):
                problems.append(w + ": id must be kebab-case and start with '" + cid + "-'")
            if wid in seen_ids:
                problems.append(w + ": duplicate id")
            seen_ids.add(wid)
            for key in ("title",):
                if not isinstance(ch.get(key), str) or not ch[key].strip():
                    problems.append(w + ": missing " + key)
            if ch.get("difficulty") not in data["difficulties"]:
                problems.append(w + ": bad difficulty")
            if not isinstance(ch.get("concepts"), list) or not ch["concepts"]:
                problems.append(w + ": concepts must be a non-empty list")
            check_rich(ch.get("story"), w + ".story", problems)
            check_rich(ch.get("task"), w + ".task", problems)
            check_rich(ch.get("lesson"), w + ".lesson", problems)
            hints = ch.get("hints")
            if not isinstance(hints, list) or not 2 <= len(hints) <= 4:
                problems.append(w + ": hints must be a list of 2-4 items")
            else:
                for i, hint in enumerate(hints):
                    check_rich(hint, w + ".hints[" + str(i) + "]", problems)
            for key in ("starter", "solution", "tests"):
                if not isinstance(ch.get(key), str) or (key != "starter" and not ch[key].strip()):
                    problems.append(w + ": " + key + " must be a non-empty string")
            for key in ("altSolutions", "wrongSolutions"):
                if key in ch and (not isinstance(ch[key], list) or not all(isinstance(x, str) for x in ch[key])):
                    problems.append(w + ": " + key + " must be a list of strings")
            if not ch.get("wrongSolutions"):
                warnings.append(w + ": no wrongSolutions (add common mistakes so the trials are proven to catch them)")
            if "inputs" in ch and (not isinstance(ch["inputs"], list) or not all(isinstance(x, str) for x in ch["inputs"])):
                problems.append(w + ": inputs must be a list of strings")
            if "timeLimitMs" in ch and not isinstance(ch["timeLimitMs"], int):
                problems.append(w + ": timeLimitMs must be an integer")
            scene = ch.get("scene")
            if not isinstance(scene, dict):
                problems.append(w + ": missing scene")
            else:
                for key in ("icon", "successIcon", "successText", "effect"):
                    if not isinstance(scene.get(key), str) or not scene.get(key):
                        problems.append(w + ": scene." + key + " missing")
                if scene.get("effect") not in effects:
                    problems.append(w + ": scene.effect must be one of " + ", ".join(sorted(effects)))
            for key in ch:
                if key not in KNOWN_CHALLENGE_KEYS:
                    warnings.append(w + ": unknown field '" + key + "'")
    if len(set(orders)) != len(orders):
        problems.append("chapters: duplicate order values")
    if data.get("indexScripts") is not None:
        for f in data["contentFiles"]:
            if f not in data["indexScripts"]:
                problems.append("index.html does not load " + f)
    return problems, warnings


KNOWN_CHALLENGE_KEYS = {
    "id", "title", "difficulty", "concepts", "story", "task", "lesson", "starter", "hints",
    "solution", "altSolutions", "wrongSolutions", "tests", "scene", "inputs", "timeLimitMs",
    "chapterId", "index",
}


# ---------------------------------------------------------------------------
# Running spells
# ---------------------------------------------------------------------------

def run(harness_dir, code, tests, inputs):
    payload = json.dumps({"code": code, "tests": tests, "inputs": inputs})
    started = time.monotonic()
    try:
        proc = subprocess.run(
            [sys.executable, "-I", "-c", RUNNER, harness_dir],
            input=payload, capture_output=True, text=True, timeout=RUN_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "tests": [], "error": None}
    marker = proc.stdout.rfind("@@RESULT@@")
    if marker < 0:
        return {"status": "harness-crash", "tests": [], "error": {"message": proc.stderr[-2000:]}}
    result = json.loads(proc.stdout[marker + len("@@RESULT@@"):])
    result["seconds"] = round(time.monotonic() - started, 2)
    return result


def summarize(result):
    status = result["status"]
    if status in ("passed", "failed"):
        return status + " " + str(result.get("passed", 0)) + "/" + str(result.get("total", 0))
    err = result.get("error") or {}
    return status + (" (" + str(err.get("type", "")) + ": " + str(err.get("message", ""))[:120] + ")" if err else "")


def failing_tests(result):
    return [t for t in result.get("tests", []) if not t.get("passed")]


def validate_challenge(harness_dir, ch):
    tests = ch["tests"]
    inputs = ch.get("inputs") or []
    errors, notes, runs = [], [], {}

    sol = run(harness_dir, ch["solution"], tests, inputs)
    runs["solution"] = sol
    if sol["status"] != "passed":
        detail = "; ".join(t["name"] + ": " + t["message"] for t in failing_tests(sol))
        errors.append("solution does not pass: " + summarize(sol) + (" -> " + detail if detail else ""))
    for t in sol.get("tests", []):
        if t.get("crash"):
            errors.append("trial '" + t["name"] + "' crashed on the solution: " + t.get("debug", t["message"])[-600:])
    if sol.get("total", 0) < 2:
        notes.append("only " + str(sol.get("total", 0)) + " trial(s); 3+ is better")
    if sol.get("seconds", 0) > SLOW_SECONDS:
        notes.append("the solution took " + str(sol["seconds"]) + "s in CPython; the browser is ~2x slower - keep it under " + str(SLOW_SECONDS) + "s")

    for i, alt in enumerate(ch.get("altSolutions") or []):
        r = run(harness_dir, alt, tests, inputs)
        runs["alt" + str(i)] = r
        if r["status"] != "passed":
            detail = "; ".join(t["name"] + ": " + t["message"] for t in failing_tests(r))
            errors.append("altSolutions[" + str(i) + "] does not pass: " + summarize(r) + (" -> " + detail if detail else ""))

    starter = run(harness_dir, ch["starter"], tests, inputs)
    runs["starter"] = starter
    if starter["status"] == "passed":
        errors.append("the starter code already passes every trial")
    elif starter["status"] in ("internal-error", "harness-crash"):
        errors.append("starter caused " + summarize(starter))

    for i, wrong in enumerate(ch.get("wrongSolutions") or []):
        r = run(harness_dir, wrong, tests, inputs)
        runs["wrong" + str(i)] = r
        if r["status"] == "passed":
            errors.append("wrongSolutions[" + str(i) + "] passes every trial (the trials are too lenient)")
        elif r["status"] in ("internal-error", "harness-crash"):
            errors.append("wrongSolutions[" + str(i) + "] caused " + summarize(r))
        elif r["status"] == "timeout":
            notes.append("wrongSolutions[" + str(i) + "] timed out (fine if that is the intended lesson)")
        else:
            for t in r.get("tests", []):
                if t.get("crash"):
                    notes.append("wrongSolutions[" + str(i) + "]: trial '" + t["name"] + "' crashed instead of failing cleanly: " + t["message"][:160])
    return errors, notes, runs


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("only", nargs="?", help="a chapter id or challenge id to check")
    parser.add_argument("--show", action="store_true", help="print the full result JSON for each run")
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 4)
    args = parser.parse_args()

    data = load_content()
    problems, warnings = check_structure(data)

    challenges = [ch for chapter in data["chapters"] for ch in chapter["challenges"]]
    if args.only:
        challenges = [ch for ch in challenges if ch["id"] == args.only or ch["chapterId"] == args.only]
        if not challenges:
            print("No chapter or challenge called " + repr(args.only))
            return 2
        problems = [p for p in problems if any(ch["id"] in p for ch in challenges) or args.only in p]
        warnings = [w for w in warnings if any(ch["id"] in w for ch in challenges)]

    total_errors = len(problems)
    for p in problems:
        print("STRUCTURE  " + p)
    for w in warnings:
        print("warning    " + w)

    with tempfile.TemporaryDirectory() as harness_dir:
        with open(os.path.join(harness_dir, "spellcheck.py"), "w", encoding="utf-8") as fh:
            fh.write(data["harness"])
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
            futures = {pool.submit(validate_challenge, harness_dir, ch): ch for ch in challenges}
            outcomes = {}
            for future in concurrent.futures.as_completed(futures):
                outcomes[futures[future]["id"]] = future.result()

    by_difficulty = {}
    for ch in challenges:
        errors, notes, runs = outcomes[ch["id"]]
        by_difficulty[ch["difficulty"]] = by_difficulty.get(ch["difficulty"], 0) + 1
        mark = "ok  " if not errors else "FAIL"
        sol = runs["solution"]
        wrong_count = len(ch.get("wrongSolutions") or [])
        print(mark + "  " + ch["id"].ljust(34) + " " + ch["difficulty"].ljust(6) + " trials " +
              str(sol.get("passed", 0)) + "/" + str(sol.get("total", 0)) + "  starter: " + runs["starter"]["status"] +
              "  wrong caught: " + str(sum(1 for k, r in runs.items() if k.startswith("wrong") and r["status"] != "passed")) +
              "/" + str(wrong_count))
        for e in errors:
            print("        ERROR " + e)
        for n in notes:
            print("        note  " + n)
        if args.show:
            for name, r in runs.items():
                print("        --- " + name + " ---")
                print("        " + json.dumps(r, indent=1).replace("\n", "\n        "))
        total_errors += len(errors)

    print()
    print(str(len(challenges)) + " challenges (" + ", ".join(k + ": " + str(v) for k, v in sorted(by_difficulty.items())) +
          "), " + str(total_errors) + " error(s), " + str(len(warnings)) + " warning(s)")
    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())
