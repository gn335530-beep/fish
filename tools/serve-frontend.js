/* 本機靜態伺服器：固定回傳 no-store，避免瀏覽器快取到舊的 HTML／JS／CSS。
   用法：npm run web（預設 http://localhost:8080） */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "frontend");
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  });
  res.end(body);
}

const server = http.createServer(function (req, res) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);

  if (filePath.indexOf(ROOT) !== 0) {
    send(res, 403, "403");
    return;
  }

  fs.stat(filePath, function (statError, stat) {
    if (!statError && stat.isDirectory()) filePath = path.join(filePath, "index.html");

    fs.readFile(filePath, function (readError, data) {
      if (readError) {
        send(res, 404, "404 Not Found");
        return;
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      send(res, 200, data, type);
    });
  });
});

server.listen(PORT, function () {
  console.log("frontend: http://localhost:" + PORT + "/");
});
