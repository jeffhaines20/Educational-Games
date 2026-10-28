#!/usr/bin/env python3
"""Build the Pyromancer distribution bundles (Python standard library only).

    python3 tools/build.py                  # build the game folder this script lives in
    python3 tools/build.py --answers off    # also hide the Answer Scroll in both bundles
    python3 tools/build.py --root DIR       # build another game folder (used by tests)
    python3 tools/build.py --out DIR        # write the bundles to DIR instead of <root>/dist

Writes:
  dist/pyromancer.html        index.html with every *local* stylesheet, script, image and font
                              inlined (CDN <link>/<script> tags stay as they are), so the game
                              is one file that works when opened straight from disk.
  dist/pyromancer-scorm.zip   SCORM 1.2 package: imsmanifest.xml (from scorm/imsmanifest.xml)
                              + index.html at the root of the zip. Its index.html is the same
                              single-file build with SS_CONFIG.scormRequired = true, so the game
                              warns the player when it can't reach the LMS.

Rules:
  * Only local files are inlined. <link rel="stylesheet" href="css/x.css"> becomes a <style>
    element and <script src="js/x.js"></script> an inline <script>. Images, fonts and other
    media become data: URIs wherever the build can see them: url(...) and @import in CSS
    (resolved against that CSS file's own folder), <img>/<source> src and srcset, <video>
    poster, <link rel="icon">, and string literals in scripts that are exactly a local asset
    path or a srcset list of them (e.g. "assets/title.webp 1024w, assets/big.webp 2048w").
    Anything with a scheme (https:, data:, ...) or starting with // is kept as it is.
    <link rel="preload"> tags for local files are dropped (their files are inlined).
  * Markup inside HTML comments and inside existing inline <script>/<style> is left alone.
  * Settings can be baked in (a small script that fills window.SS_CONFIG before js/config.js):
    --answers off sets allowAnswerScroll to false (URL parameters can't reach an uploaded
    file), and the SCORM package always sets scormRequired to true.
  * The build refuses (exit status 1, with a message) when an inlined script contains
    "</script" (or a stylesheet contains "</style"), because that would end the inline
    element early; write "<\\/script" inside JavaScript strings instead.
  * Output is deterministic: the same sources give byte-identical files (the zip uses
    fixed timestamps and permissions).
"""

import argparse
import base64
import html
import io
import json
import os
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.dirname(HERE)

HTML_NAME = "pyromancer.html"
ZIP_NAME = "pyromancer-scorm.zip"
ZIP_DATE = (1980, 1, 1, 0, 0, 0)
BANNER = "<!-- Single-file build of Pyromancer, made by tools/build.py. Edit the source files, not this one. -->"

_ATTRS = r"""(?:[^>"']|"[^"]*"|'[^']*')*"""
TOKEN_RE = re.compile(
    r"(?P<comment><!--.*?-->)"
    r"|(?P<script><script\b(?P<sattrs>" + _ATTRS + r")>(?P<sbody>.*?)</script\s*>)"
    r"|(?P<style><style\b" + _ATTRS + r">.*?</style\s*>)"
    r"|(?P<link><link\b(?P<lattrs>" + _ATTRS + r")>)"
    r"|(?P<media><(?P<mtag>img|source|video|audio|track|input)\b(?P<mattrs>" + _ATTRS + r")>)",
    re.IGNORECASE | re.DOTALL,
)
ATTR_RE = re.compile(r"""([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?""")
CSS_URL_RE = re.compile(r"""url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)""", re.IGNORECASE)
CSS_IMPORT_RE = re.compile(r"""@import\s+(["'])([^"']+)\1""", re.IGNORECASE)
REF_RE = re.compile(r"""<(?P<tag>[a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?\s(?P<attr>src|href|poster|data|srcset)\s*=\s*(["'])(?P<url>[^"']*)\3""", re.IGNORECASE)
STYLE_ATTR_URL_RE = re.compile(r"""\sstyle\s*=\s*(["'])[^"']*url\(\s*["']?(?P<url>[^"')\s]+)""", re.IGNORECASE)
MEDIA_EXT = r"(?:webp|png|jpe?g|gif|svg|avif|ico|bmp|woff2?|ttf|otf|eot|mp3|ogg|oga|wav|m4a|mp4|webm)"
ASSET_PATH_RE = re.compile(r"^(?:\./)?[A-Za-z0-9_][A-Za-z0-9_./-]*\." + MEDIA_EXT + r"$", re.IGNORECASE)
SRCSET_DESCRIPTOR_RE = re.compile(r"^\d+(?:\.\d+)?[wxh]$")
JS_STRING_RE = re.compile(r"""(["'])((?:(?!\1)[^\\\n]){1,2000})\1""")

MIME = {
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon", ".avif": "image/avif", ".bmp": "image/bmp",
    ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject", ".css": "text/css", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
    ".oga": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "video/mp4", ".webm": "video/webm",
    ".json": "application/json", ".vtt": "text/vtt",
}


class BuildError(Exception):
    """A problem the person running the build must fix."""


def is_remote(url):
    url = url.strip()
    return url.startswith("//") or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", url) is not None


def parse_attrs(text):
    attrs = []
    for m in ATTR_RE.finditer(text):
        name = m.group(1)
        if m.group(2) is not None:
            value = m.group(2)
        elif m.group(3) is not None:
            value = m.group(3)
        else:
            value = m.group(4)
        attrs.append((name, html.unescape(value) if value is not None else None))
    return attrs


def attr(attrs, name):
    for key, value in attrs:
        if key.lower() == name:
            return value
    return None


def format_attrs(attrs):
    out = []
    for key, value in attrs:
        out.append(" " + key if value is None else " %s=\"%s\"" % (key, html.escape(value, quote=True)))
    return "".join(out)


class Builder:
    def __init__(self, root):
        self.root = os.path.realpath(root)
        self.warnings = []
        self.inlined = set()
        self.baked = {}
        self.injected = False
        self._data_uris = {}

    def warn(self, message):
        if message not in self.warnings:
            self.warnings.append(message)

    # -- files ----------------------------------------------------------------
    def rel(self, path):
        return os.path.relpath(path, self.root).replace(os.sep, "/")

    def locate(self, url, base_dir, where):
        """A local URL (relative to base_dir) as an absolute path inside the root (may not exist)."""
        path = urllib.parse.unquote(re.split(r"[?#]", url.strip(), maxsplit=1)[0])
        if not path:
            raise BuildError("%s: empty file reference" % where)
        full = os.path.join(self.root, path.lstrip("/")) if path.startswith("/") else os.path.join(base_dir, path)
        full = os.path.realpath(full)
        if os.path.commonpath([self.root, full]) != self.root:
            raise BuildError("%s: %r points outside the game folder" % (where, url))
        return full

    def resolve(self, url, base_dir, where):
        """Like locate(), but the file must exist."""
        full = self.locate(url, base_dir, where)
        if not os.path.isfile(full):
            raise BuildError("%s: %r was not found (looked for %s)" % (where, url, self.rel(full)))
        return full

    def read_text(self, path):
        try:
            with open(path, "rb") as fh:
                data = fh.read()
            text = data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise BuildError("%s is not valid UTF-8 (%s)" % (self.rel(path), exc))
        except OSError as exc:
            raise BuildError("could not read %s: %s" % (self.rel(path), exc))
        if text.startswith("\uFEFF"):
            text = text[1:]
        return text.replace("\r\n", "\n").replace("\r", "\n")

    def data_uri(self, path):
        if path not in self._data_uris:
            ext = os.path.splitext(path)[1].lower()
            mime = MIME.get(ext, "application/octet-stream")
            with open(path, "rb") as fh:
                payload = base64.b64encode(fh.read()).decode("ascii")
            self._data_uris[path] = "data:%s;base64,%s" % (mime, payload)
            self.inlined.add(self.rel(path))
        return self._data_uris[path]

    def inline_url_list(self, text, base_dir, where, strict):
        """'a.webp' or 'a.webp 1x, b.webp 2x' with data: URIs for the local files.

        Returns None if text isn't made of local asset paths only (or, when not strict,
        if one of them doesn't exist)."""
        out = []
        for item in text.split(","):
            bits = item.split()
            if not bits:
                return None
            url = bits[0]
            if is_remote(url):
                if not strict:
                    return None
                out.append(" ".join(bits))
                continue
            if not strict and (not ASSET_PATH_RE.match(url) or len(bits) > 2 or
                               (len(bits) == 2 and not SRCSET_DESCRIPTOR_RE.match(bits[1]))):
                return None
            target = self.locate(url, base_dir, where)
            if not os.path.isfile(target):
                if strict:
                    raise BuildError("%s: %r was not found (looked for %s)" % (where, url, self.rel(target)))
                self.warn("%s: %r is not a file, so it can't be inlined" % (where, url))
                return None
            out.append(" ".join([self.data_uri(target)] + bits[1:]))
        return ", ".join(out)

    # -- CSS --------------------------------------------------------------------
    def inline_css(self, path, depth=0):
        if depth > 8:
            raise BuildError("%s: @import nesting is too deep" % self.rel(path))
        css = self.read_text(path)
        base_dir = os.path.dirname(path)          # url(...) is relative to the CSS file itself
        where = self.rel(path)

        def import_repl(m):
            url = m.group(2)
            if is_remote(url):
                return m.group(0)
            target = self.resolve(url, base_dir, where)
            body = self.inline_css(target, depth + 1)
            uri = "data:text/css;base64," + base64.b64encode(body.encode("utf-8")).decode("ascii")
            return '@import url("%s")' % uri

        def url_repl(m):
            url = next((g for g in m.groups() if g is not None), "")
            if not url or is_remote(url) or url.startswith("#"):
                return m.group(0)
            target = self.resolve(url, base_dir, where)
            if target.lower().endswith(".css"):
                body = self.inline_css(target, depth + 1)
                return 'url("data:text/css;base64,%s")' % base64.b64encode(body.encode("utf-8")).decode("ascii")
            return 'url("%s")' % self.data_uri(target)

        css = CSS_IMPORT_RE.sub(import_repl, css)
        return CSS_URL_RE.sub(url_repl, css)

    # -- elements ---------------------------------------------------------------
    def config_script(self):
        settings = json.dumps(self.baked, sort_keys=True, separators=(",", ":"))
        return "<script>window.SS_CONFIG = Object.assign(%s, window.SS_CONFIG || {});</script>\n" % settings

    def inline_js_assets(self, code, where):
        """Replace string literals that are exactly local asset paths (or srcset lists of them)."""
        def repl(m):
            new = self.inline_url_list(m.group(2), self.root, where, strict=False)
            return m.group(0) if new is None else m.group(1) + new + m.group(1)
        return JS_STRING_RE.sub(repl, code)

    def script(self, match):
        attrs = parse_attrs(match.group("sattrs"))
        src = attr(attrs, "src")
        if src is None or is_remote(src):
            return match.group(0)
        if match.group("sbody").strip():
            raise BuildError("index.html: <script src=%r> must not also contain code" % src)
        kind = (attr(attrs, "type") or "").strip().lower()
        if kind == "module":
            raise BuildError("index.html: %r is a module script; the game must use classic scripts" % src)
        path = self.resolve(src, self.root, "index.html")
        where = self.rel(path)
        code = self.read_text(path)
        bad = re.search(r"</script", code, re.IGNORECASE)
        if bad:
            line = code.count("\n", 0, bad.start()) + 1
            raise BuildError(
                "%s contains \"</script\" on line %d, which would end the inlined <script> early "
                "and break the single-file build. Inside a JavaScript string, write \"<\\/script\" instead."
                % (where, line))
        opener = re.search(r"<!--", code)
        if opener and re.search(r"<script", code[opener.start():], re.IGNORECASE):
            line = code.count("\n", 0, opener.start()) + 1
            raise BuildError(
                "%s contains \"<!--\" (line %d) followed later by \"<script\", which confuses the HTML parser "
                "when the file is inlined. Write \"<\\!--\" or split the string instead." % (where, line))
        code = self.inline_js_assets(code, where)
        for flag in ("defer", "async"):
            if any(k.lower() == flag for k, _ in attrs):
                self.warn("%s: the %r attribute has no effect once the script is inlined" % (where, flag))
        keep = [(k, v) for k, v in attrs if k.lower() not in ("src", "defer", "async", "integrity", "crossorigin", "charset")]
        keep.append(("data-inlined", where))
        self.inlined.add(where)
        prefix = ""
        if where == "js/config.js" and self.baked:
            prefix = self.config_script()
            self.injected = True
        return "%s<script%s>\n%s\n</script>" % (prefix, format_attrs(keep), code.rstrip("\n"))

    def link(self, match):
        attrs = parse_attrs(match.group("lattrs"))
        href = attr(attrs, "href")
        rels = (attr(attrs, "rel") or "").lower().split()
        if href is None or is_remote(href):
            return match.group(0)
        if "stylesheet" in rels:
            path = self.resolve(href, self.root, "index.html")
            where = self.rel(path)
            css = self.inline_css(path)
            bad = re.search(r"</style", css, re.IGNORECASE)
            if bad:
                line = css.count("\n", 0, bad.start()) + 1
                raise BuildError("%s contains \"</style\" on line %d, which would end the inlined <style> early." % (where, line))
            keep = [(k, v) for k, v in attrs if k.lower() not in ("rel", "href", "type", "integrity", "crossorigin", "onload")]
            if attr(attrs, "onload") is not None and (attr(attrs, "media") or "").lower() == "print":
                keep = [(k, v) for k, v in keep if k.lower() != "media"]       # the async-CSS trick
            keep.append(("data-inlined", where))
            self.inlined.add(where)
            return "<style%s>\n%s\n</style>" % (format_attrs(keep), css.rstrip("\n"))
        if any(r in rels for r in ("icon", "apple-touch-icon", "mask-icon")):
            path = self.resolve(href, self.root, "index.html")
            new = [(k, self.data_uri(path) if k.lower() == "href" else v) for k, v in attrs]
            return "<link%s>" % format_attrs(new)
        if any(r in rels for r in ("preload", "prefetch", "modulepreload")):
            return ""                         # its file is inlined where it is used
        self.warn("index.html: <link rel=%r href=%r> points at a local file that is not inlined"
                  % (" ".join(rels), href))
        return match.group(0)

    def media(self, match):
        attrs = parse_attrs(match.group("mattrs"))
        tag = match.group("mtag").lower()
        changed = False
        new = []
        for key, value in attrs:
            low = key.lower()
            if value is not None and value.strip() and low in ("src", "poster", "srcset"):
                if low == "srcset":
                    value2 = self.inline_url_list(value, self.root, "index.html <%s>" % tag, strict=True)
                elif not is_remote(value):
                    value2 = self.data_uri(self.resolve(value, self.root, "index.html <%s>" % tag))
                else:
                    value2 = value
                changed = changed or value2 != value
                value = value2
            new.append((key, value))
        if not changed:
            return match.group(0)
        closing = "/>" if match.group(0).rstrip().endswith("/>") else ">"
        return "<%s%s%s" % (match.group("mtag"), format_attrs(new), closing)

    # -- whole page -------------------------------------------------------------
    def build_html(self, baked=None):
        """The single-file page; `baked` settings are set in window.SS_CONFIG before config.js."""
        index = os.path.join(self.root, "index.html")
        if not os.path.isfile(index):
            raise BuildError("index.html was not found in %s" % self.root)
        page = self.read_text(index)
        self.baked = dict(baked or {})
        self.injected = False

        def repl(match):
            if match.group("comment") or match.group("style"):
                return match.group(0)
            if match.group("script"):
                return self.script(match)
            if match.group("link"):
                return self.link(match)
            return self.media(match)

        out = TOKEN_RE.sub(repl, page)
        if self.baked and not self.injected:
            raise BuildError("index.html doesn't load js/config.js, so the build can't set %s" % ", ".join(sorted(self.baked)))
        doctype = re.match(r"\s*<!doctype[^>]*>\n?", out, re.IGNORECASE)
        if doctype:
            out = out[:doctype.end()].rstrip("\n") + "\n" + BANNER + "\n" + out[doctype.end():]
        else:
            out = BANNER + "\n" + out
        self.check_html(out)
        return out

    def check_html(self, out):
        """Warn about local references that will not work in a single file."""
        scrubbed = TOKEN_RE.sub(lambda m: "" if (m.group("comment") or m.group("script") or m.group("style")) else m.group(0), out)
        for m in REF_RE.finditer(scrubbed):
            url = m.group("url").strip()
            if not url or url.startswith("#") or is_remote(url):
                continue
            if m.group("tag").lower() == "a":
                continue
            self.warn("index.html: <%s %s=%r> is a local file that is not inlined" % (m.group("tag"), m.group("attr"), url))
        for m in STYLE_ATTR_URL_RE.finditer(scrubbed):
            if not is_remote(m.group("url")):
                self.warn("index.html: a style attribute refers to %r, which is not inlined (move it to the CSS)" % m.group("url"))
        for m in TOKEN_RE.finditer(out):
            if m.group("script"):
                src = attr(parse_attrs(m.group("sattrs")), "src")
                if src is not None and not is_remote(src):
                    raise BuildError("internal error: %r was not inlined" % src)

    def manifest(self):
        path = os.path.join(self.root, "scorm", "imsmanifest.xml")
        if not os.path.isfile(path):
            raise BuildError("scorm/imsmanifest.xml was not found in %s" % self.root)
        text = self.read_text(path)
        try:
            tree = ET.fromstring(text.encode("utf-8"))
        except ET.ParseError as exc:
            raise BuildError("scorm/imsmanifest.xml is not valid XML: %s" % exc)
        hrefs = [el.get("href") for el in tree.iter() if el.tag.endswith("resource")]
        if "index.html" not in hrefs:
            raise BuildError("scorm/imsmanifest.xml must have a resource with href=\"index.html\"")
        return text


def zip_bytes(entries):
    """A deterministic zip: fixed dates and permissions, entries in the given order."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for name, data in entries:
            info = zipfile.ZipInfo(name, date_time=ZIP_DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (0o100644 & 0xFFFF) << 16
            zf.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buffer.getvalue()


def write_atomic(path, data):
    tmp = path + ".tmp-build"
    with open(tmp, "wb") as fh:
        fh.write(data)
    os.replace(tmp, path)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build the single-file and SCORM bundles of Pyromancer.")
    parser.add_argument("--root", default=DEFAULT_ROOT, help="the game folder (default: the folder above tools/)")
    parser.add_argument("--out", default=None, help="output folder (default: <root>/dist)")
    parser.add_argument("--answers", choices=("on", "off"), default="on",
                        help="off: hide the Answer Scroll in both bundles (bakes allowAnswerScroll: false)")
    args = parser.parse_args(argv)

    builder = Builder(args.root)
    out_dir = os.path.abspath(args.out) if args.out else os.path.join(builder.root, "dist")
    baked = {} if args.answers == "on" else {"allowAnswerScroll": False}
    try:
        page = builder.build_html(baked)
        scorm_page = builder.build_html(dict(baked, scormRequired=True))
        manifest = builder.manifest()
    except BuildError as exc:
        sys.stderr.write("build.py: error: %s\n" % exc)
        return 1

    html_bytes = page.encode("utf-8")
    package = zip_bytes([("imsmanifest.xml", manifest.encode("utf-8")), ("index.html", scorm_page.encode("utf-8"))])
    os.makedirs(out_dir, exist_ok=True)
    html_path = os.path.join(out_dir, HTML_NAME)
    zip_path = os.path.join(out_dir, ZIP_NAME)
    write_atomic(html_path, html_bytes)
    write_atomic(zip_path, package)

    for warning in builder.warnings:
        sys.stderr.write("build.py: warning: %s\n" % warning)
    print("Inlined %d local files%s." % (len(builder.inlined), " (Answer Scroll off)" if baked else ""))
    print("Wrote %s (%d KB)" % (html_path, (len(html_bytes) + 1023) // 1024))
    print("Wrote %s (%d KB)" % (zip_path, (len(package) + 1023) // 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
