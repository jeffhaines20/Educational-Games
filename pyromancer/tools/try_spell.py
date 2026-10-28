#!/usr/bin/env python3
"""Run any Python file against a challenge's trials, exactly as the game would.

Usage:
    python3 tools/try_spell.py CHALLENGE_ID my_attempt.py
    python3 tools/try_spell.py CHALLENGE_ID -          # read the spell from stdin
    python3 tools/try_spell.py CHALLENGE_ID --solution # run the reference solution

Handy for checking that a different-but-valid approach passes, or that a
common mistake fails with a helpful message.
"""

import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from validate_content import load_content, run  # noqa: E402


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    challenge_id, path = sys.argv[1], sys.argv[2]
    data = load_content()
    challenge = next((ch for chapter in data["chapters"] for ch in chapter["challenges"] if ch["id"] == challenge_id), None)
    if challenge is None:
        print("No challenge called " + repr(challenge_id))
        return 2
    if path == "--solution":
        source = challenge["solution"]
    elif path == "-":
        source = sys.stdin.read()
    else:
        with open(path, encoding="utf-8") as fh:
            source = fh.read()
    with tempfile.TemporaryDirectory() as harness_dir:
        with open(os.path.join(harness_dir, "spellcheck.py"), "w", encoding="utf-8") as fh:
            fh.write(data["harness"])
        result = run(harness_dir, source, challenge["tests"], challenge.get("inputs") or [])
    print("status:", result["status"])
    if result.get("stdout"):
        print("--- output ---")
        print(result["stdout"].rstrip())
    if result.get("error"):
        err = result["error"]
        print("--- error ---")
        print(err.get("traceback") or err.get("message"))
        print("friendly:", err.get("friendly"))
    for t in result.get("tests", []):
        print(("PASS " if t["passed"] else "FAIL ") + t["name"] + ("" if t["passed"] else "\n     " + t["message"]))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
