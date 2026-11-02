#!/usr/bin/env node
/*
 * The Cardiac Case Files — a tiny static server for development and the browser tests.
 * It serves the game folder (cardiac-case-files/) on 127.0.0.1 only.
 *
 *   node tools/dev_server.js [port]          (default 8000; 0 picks a free port)
 *   then open http://localhost:8000/   (or /dist/cardiac-case-files.html after a build)
 *
 * From a test:
 *   const { start } = require("./dev_server.js");
 *   const { server, port, url } = await start();      // url = "http://127.0.0.1:<port>/"
 *   …
 *   server.close();
 *
 * Every response is sent with Cache-Control: no-store, so a reload always picks up edits.
 * Paths outside the game folder are refused (403); a directory serves its index.html.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const GAME = path.resolve(__dirname, "..");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".avif": "image/avif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".otf": "font/otf", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".zip": "application/zip",
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function createServer(root) {
  const base = path.resolve(root || GAME);
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "method not allowed");
    let url;
    try {
      url = decodeURIComponent(String(req.url || "/").split(/[?#]/)[0]);
    } catch (e) {
      return send(res, 400, "bad request");
    }
    if (url.includes("\0")) return send(res, 400, "bad request");
    let file = path.normalize(path.join(base, url));
    if (file !== base && !file.startsWith(base + path.sep)) return send(res, 403, "forbidden");
    fs.stat(file, (statErr, stat) => {
      if (!statErr && stat.isDirectory()) file = path.join(file, "index.html");
      fs.readFile(file, (err, data) => {
        if (err) return send(res, 404, "not found: " + url);
        res.writeHead(200, {
          "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
          "Content-Length": data.length,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        res.end(req.method === "HEAD" ? undefined : data);
      });
    });
  });
}

/** Start the server; resolves to { server, port, url }. Port 0 (the default) picks a free port. */
function start(port = 0, root = GAME) {
  return new Promise((resolve, reject) => {
    const server = createServer(root);
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const actual = server.address().port;
      resolve({ server, port: actual, url: "http://127.0.0.1:" + actual + "/" });
    });
  });
}

module.exports = { start, createServer, GAME };

if (require.main === module) {
  const port = Number(process.argv[2] || 8000);
  start(port).then(({ port: actual }) => {
    console.log("The Cardiac Case Files dev server on http://localhost:" + actual + "/");
  }, (err) => {
    console.error("dev_server.js: " + err.message);
    process.exit(1);
  });
}
