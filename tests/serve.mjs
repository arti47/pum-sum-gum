// A tiny static server shared by the browser harnesses. Dev-only.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".pdf": "application/pdf", ".woff2": "font/woff2",
};

export function serve(port = 0) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (path === "/") path = "/index.html";
      const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      }
    });
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/index.html` });
    });
  });
}

export const CHROME = "/opt/pw-browsers/chromium";

export const LAUNCH = {
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
};
