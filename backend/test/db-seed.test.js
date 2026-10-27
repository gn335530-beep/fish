/* 執行時資料庫：不存在時從種子建立，已存在時絕不覆寫。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ensureDatabase } = require("../lib/db-file");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fishmatch-db-"));
}

test("執行時資料庫不存在時從種子複製", function () {
  const dir = tempDir();
  const seed = path.join(dir, "db.seed.json");
  const runtime = path.join(dir, "db.json");
  fs.writeFileSync(seed, "{\"seed\":true}");

  assert.equal(ensureDatabase(runtime, seed), true);
  assert.equal(fs.readFileSync(runtime, "utf8"), "{\"seed\":true}");
});

test("執行時資料庫已存在時保留原內容", function () {
  const dir = tempDir();
  const seed = path.join(dir, "db.seed.json");
  const runtime = path.join(dir, "db.json");
  fs.writeFileSync(seed, "{\"seed\":true}");
  fs.writeFileSync(runtime, "{\"runtime\":true}");

  assert.equal(ensureDatabase(runtime, seed), false);
  assert.equal(fs.readFileSync(runtime, "utf8"), "{\"runtime\":true}");
});

test("會建立執行時資料庫的父目錄", function () {
  const dir = tempDir();
  const seed = path.join(dir, "db.seed.json");
  const runtime = path.join(dir, "nested", "db.json");
  fs.writeFileSync(seed, "seed");

  assert.equal(ensureDatabase(runtime, seed), true);
  assert.equal(fs.readFileSync(runtime, "utf8"), "seed");
});
