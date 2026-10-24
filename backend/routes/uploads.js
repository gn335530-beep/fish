/* 圖片上傳：前端壓縮後以 base64 data URL 送出，伺服器解碼存檔。 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const { requireUser } = require("../lib/auth");
const { ok, fail } = require("../lib/http");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

router.post("/api/uploads", requireUser, function (req, res) {
  const data = (req.body || {}).data;
  if (typeof data !== "string") {
    fail(res, 400, "MISSING_IMAGE", "缺少圖片資料");
    return;
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(data);
  if (!match) {
    fail(res, 400, "INVALID_IMAGE", "圖片格式不正確");
    return;
  }

  const mime = match[1].toLowerCase();
  const ext = MIME_EXT[mime];
  if (!ext) {
    fail(res, 400, "UNSUPPORTED_TYPE", "僅接受 JPG、PNG、WEBP");
    return;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) {
    fail(res, 400, "EMPTY_IMAGE", "圖片內容為空");
    return;
  }
  if (buffer.length > MAX_BYTES) {
    fail(res, 413, "IMAGE_TOO_LARGE", "圖片超過 5MB 上限");
    return;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = crypto.randomUUID() + "." + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  ok(res, { url: "/uploads/" + filename }, "圖片已上傳");
});

module.exports = router;
