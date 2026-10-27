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

/* 回傳解析後的路徑；超出根目錄或格式錯誤時回 null。 */
function resolveFile(root, rawUrl) {
  let urlPath;
  try {
    urlPath = decodeURIComponent((rawUrl || "/").split("?")[0]);
  } catch (error) {
    return null;
  }
  if (urlPath.indexOf("\0") !== -1) return null;

  const filePath = path.resolve(root, "." + urlPath);
  const relative = path.relative(root, filePath);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) return null;
  return filePath;
}

function createServer(root) {
  return http.createServer(function (req, res) {
    let filePath = resolveFile(root, req.url);
    if (!filePath) {
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
}

if (require.main === module) {
  createServer(ROOT).listen(PORT, function () {
    console.log("frontend: http://localhost:" + PORT + "/");
  });
}

module.exports = { createServer: createServer, resolveFile: resolveFile };
