/* 種子圖片：seed 內的圖片都由後端 /uploads 提供，且檔案放在可提交的 seed-assets。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SEED = JSON.parse(fs.readFileSync(path.join(ROOT, "db.seed.json"), "utf8"));
const ASSET_DIR = path.join(ROOT, "seed-assets");
const IMAGE_FIELDS = new Set(["avatar_url", "image_url", "photo_url"]);

function collectImages(value, found, trail) {
  if (Array.isArray(value)) {
    value.forEach(function (item, index) {
      collectImages(item, found, trail + "[" + index + "]");
    });
    return found;
  }
  if (!value || typeof value !== "object") return found;

  Object.keys(value).forEach(function (key) {
    const child = value[key];
    const where = trail ? trail + "." + key : key;
    if (IMAGE_FIELDS.has(key) && typeof child === "string" && child) {
      found.push({ where: where, url: child });
      return;
    }
    collectImages(child, found, where);
  });
  return found;
}

const IMAGES = collectImages(SEED, [], "");

test("種子圖片都使用後端 /uploads 路徑", function () {
  assert.ok(IMAGES.length > 0, "種子資料沒有任何圖片欄位");
  for (const image of IMAGES) {
    assert.match(image.url, /^\/uploads\/[A-Za-z0-9._/-]+$/, image.where + " 不是後端圖片路徑：" + image.url);
    assert.doesNotMatch(image.url, /^images\//, image.where + " 仍使用前端圖片路徑");
  }
});

test("每個種子圖片都有對應的 seed-assets 檔案", function () {
  for (const image of IMAGES) {
    const relative = image.url.replace(/^\/uploads\//, "");
    const file = path.join(ASSET_DIR, relative);
    assert.equal(fs.existsSync(file), true, image.where + " 找不到檔案：" + relative);
  }
});
