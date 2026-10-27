/* 手動 CLI：單一魚種抓取、過去日期快取、--status 顯示狀態。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createDb } = require("./fixture");
const { rocToIso } = require("../lib/market/dates");

const ROOT = path.join(__dirname, "..", "..");
let server = null;
let base = "";
let dbFile = "";
let requests = 0;

const SAMPLE = [{
  "交易日期": "1151022",
  "品種代碼": 2201,
  "魚貨名稱": "石斑魚",
  "市場名稱": "岡山",
  "上價": 200,
  "中價": 150,
  "下價": 100,
  "交易量": 10,
  "平均價": 1237
}];

test.before(async function () {
  dbFile = createDb();
  server = http.createServer(function (req, res) {
    requests += 1;
    const url = new URL(req.url, "http://127.0.0.1");
    const from = rocToIso(url.searchParams.get("StartDate"));
    const to = rocToIso(url.searchParams.get("EndDate"));
    const rows = SAMPLE.filter(function (row) {
      const date = rocToIso(row["交易日期"]);
      return (!from || date >= from) && (!to || date <= to);
    });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(rows));
  });
  await new Promise(function (resolve) { server.listen(0, resolve); });
  base = "http://127.0.0.1:" + server.address().port + "/";
});

test.after(function () {
  return new Promise(function (resolve) { server.close(resolve); });
});

function run(args, file) {
  return new Promise(function (resolve, reject) {
    const child = spawn(process.execPath, [path.join(ROOT, "backend", "scripts", "market-fetch.js")].concat(args), {
      cwd: ROOT,
      env: Object.assign({}, process.env, {
        FISHMATCH_DB: file || dbFile,
        FISHMATCH_MARKET_UPSTREAM: base
      })
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", function (chunk) { stdout += chunk.toString(); });
    child.stderr.on("data", function (chunk) { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", function (code) {
      resolve({ status: code, stdout: stdout, stderr: stderr });
    });
  });
}

test("CLI 抓單一魚種、重跑不重複打上游、--status 可看狀態", async function () {
  const first = await run(["grouper", "--date", "2026-10-22"]);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /"status": "ok"/);

  const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  assert.equal(db.market_prices.length, 1);
  assert.equal(db.market_prices[0].trade_date, "2026-10-22");
  assert.equal(db.market_prices[0].price_per_kg_avg, 1237);
  assert.equal(db.market_fetch_state[0].last_status, "ok");
  assert.equal(db.market_fetch_state[0].last_row_count, 1);

  const afterFirst = requests;
  const second = await run(["grouper", "--date", "2026-10-22"]);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(requests, afterFirst, "過去日期已有行情時不應再打上游");
  assert.equal(JSON.parse(fs.readFileSync(dbFile, "utf8")).market_prices.length, 1);

  const status = await run(["--status"]);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /grouper/);
  assert.match(status.stdout, /ok/);
});

test("CLI 指定星期日會回補最近交易日", async function () {
  const coldDb = createDb();
  const before = requests;
  const result = await run(["grouper", "--date", "2026-10-25"], coldDb);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"status": "ok"/);
  assert.match(result.stdout, /"last_trade_date": "2026-10-22"/);
  assert.ok(requests > before);

  const db = JSON.parse(fs.readFileSync(coldDb, "utf8"));
  assert.equal(db.market_prices.length, 1);
  assert.equal(db.market_prices[0].trade_date, "2026-10-22");
});

test("CLI 拒絕未知魚種與無效日期", async function () {
  const unknown = await run(["shark"]);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /未知魚種/);

  const badDate = await run(["grouper", "--date", "2026/10/22"]);
  assert.equal(badDate.status, 1);
  assert.match(badDate.stderr, /YYYY-MM-DD/);
});
