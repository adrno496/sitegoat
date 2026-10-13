import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import handler from "../api/backup.mjs";
import accessHandler from "../api/access.mjs";
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const headers = JSON.parse(fs.readFileSync("vercel.json", "utf8")).headers[0]
  .headers;
const root = path.resolve("dist");
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
    if (req.url?.split("?")[0] === "/api/backup") return handler(req, res);
    if (req.url?.split("?")[0] === "/api/access")
      return accessHandler(req, res);
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
  .listen(4173, "127.0.0.1", () =>
    console.log("Journal 360 : http://127.0.0.1:4173"),
  );
