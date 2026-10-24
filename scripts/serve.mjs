import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import handler from "../api/backup.mjs";
import accessHandler from "../api/access.mjs";
import sourcesHandler from "../api/sources.mjs";
const cloudEnabled = process.env.JOURNAL360_ALLOW_CLOUD_LOCAL === "1";
if (cloudEnabled && fs.existsSync(".env.local"))
  process.loadEnvFile(".env.local");
const port = Number(process.env.JOURNAL360_TEST_PORT || 4173);
const headers = JSON.parse(fs.readFileSync("vercel.json", "utf8")).headers[0]
  .headers;
const root = path.resolve(process.env.JOURNAL360_DIST_DIR || "dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
http
  .createServer(async (req, res) => {
    if (req.url?.startsWith("/api/") && !cloudEnabled) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      return res.end(
        JSON.stringify({ error: "Cloud désactivé pour cette session locale." }),
      );
    }
    if (req.url?.split("?")[0] === "/api/backup") return handler(req, res);
    if (req.url?.split("?")[0] === "/api/access")
      return accessHandler(req, res);
    if (req.url?.split("?")[0] === "/api/sources")
      return sourcesHandler(req, res);
    for (const header of headers) res.setHeader(header.key, header.value);
    let p;
    try {
      p = path.resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (!p.startsWith(root + path.sep)) p = path.join(root, "index.html");
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory())
      p = path.join(root, "index.html");
    res.setHeader(
      "Content-Type",
      types[path.extname(p)] || "application/octet-stream",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Cache-Control",
      p.endsWith("sw.js") ? "no-cache" : "no-cache",
    );
    fs.createReadStream(p).pipe(res);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Journal 360 local : http://127.0.0.1:${port}`),
  );
