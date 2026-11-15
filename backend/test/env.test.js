/* .env 載入：不覆寫既有環境變數，支援 export、引號與註解。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadEnv, parseLine } = require("../lib/env");

function tempEnv(text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fish-env-"));
  const file = path.join(dir, ".env");
  fs.writeFileSync(file, text);
  return file;
}

test("載入 .env 時既有環境變數優先", function () {
  const key = "FISHMATCH_ENV_TEST_KEEP";
  const added = "FISHMATCH_ENV_TEST_ADD";
  process.env[key] = "keep";
  delete process.env[added];
  const file = tempEnv("FISHMATCH_ENV_TEST_KEEP=replace\nFISHMATCH_ENV_TEST_ADD=value\n");
  try {
    const count = loadEnv(file);
    assert.equal(process.env[key], "keep");
    assert.equal(process.env[added], "value");
    assert.equal(count, 1);
  } finally {
    delete process.env[key];
    delete process.env[added];
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
});

test("支援 export、引號、空白與行內註解", function () {
  assert.deepEqual(parseLine(' export FOO="bar baz" '), { key: "FOO", value: "bar baz" });
  assert.deepEqual(parseLine("BAR='x' # note"), { key: "BAR", value: "x" });
  assert.deepEqual(parseLine("# comment"), null);
  assert.deepEqual(parseLine("NO_EQUALS"), null);
});

test("檔案不存在時回 0，不拋錯", function () {
  assert.equal(loadEnv(path.join(os.tmpdir(), "fish-env-missing-" + Date.now())), 0);
});
