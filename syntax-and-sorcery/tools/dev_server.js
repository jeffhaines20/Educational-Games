#!/usr/bin/env node
/*
 * Tiny static server for local testing.
 *   /            -> the game folder (syntax-and-sorcery/)
 *   /pyodide/    -> tools/.cache/pyodide (run tools/fetch_pyodide.sh first)
 *
 *   node tools/dev_server.js [port]       (default 8000)
 * Then open http://localhost:8000/ — to use the local Pyodide instead of the
 * CDN, open http://localhost:8000/?localPyodide=1 (only honoured on localhost).
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const GAME = path.resolve(__dirname, "..");
const PYODIDE = path.join(__dirname, ".cache", "pyodide");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".wasm": "application/wasm", ".zip": "application/zip", ".svg": "image/svg+xml",
  ".png": "image/png", ".xml": "application/xml", ".md": "text/plain; charset=utf-8", ".ico": "image/x-icon",
};

function createServer() {
  return http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let base = GAME, rel = url;
    if (url.startsWith("/pyodide/")) { base = PYODIDE; rel = url.slice("/pyodide".length); }
    let file = path.normalize(path.join(base, rel));
    if (!file.startsWith(base)) { res.writeHead(403); return res.end("forbidden"); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("not found: " + url); }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
}

function start(port = 0) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

module.exports = { start, GAME, PYODIDE };

if (require.main === module) {
  const port = Number(process.argv[2] || 8000);
  start(port).then(({ port }) => console.log("Syntax & Sorcery dev server on http://localhost:" + port + "/"));
}
