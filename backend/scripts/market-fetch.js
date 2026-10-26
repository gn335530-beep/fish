#!/usr/bin/env node
/* 手動行情 CLI：npm run market:fetch -- <species_id> [--date YYYY-MM-DD] [--days 7|30]
   或 npm run market:fetch -- --status */

require("../app"); // 初始化 store 與唯讀對照表
const mappings = require("../lib/market/mappings");
const fetchService = require("../lib/market/fetch");
const repository = require("../lib/market/repository");
const { parseIsoDate } = require("../lib/market/dates");

function parseArgs(argv) {
  const out = { speciesId: null, date: null, days: null, status: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--status") out.status = true;
    else if (arg === "--date") out.date = argv[i += 1] || null;
    else if (arg === "--days") out.days = Number(argv[i += 1]);
    else if (arg.indexOf("--") !== 0 && !out.speciesId) out.speciesId = arg;
  }
  return out;
}

function printStatus() {
  const rows = repository.allStates().sort(function (a, b) {
    return Number(a.species_code) - Number(b.species_code);
  });
  if (rows.length === 0) {
    console.log("尚無行情抓取紀錄");
    return;
  }
  console.log("魚種\t代碼\t狀態\t最後交易日\t筆數\t最後檢查\t錯誤");
  for (const row of rows) {
    console.log([
      row.species_id || "",
      row.species_code,
      row.last_status || "",
      row.last_trade_date || "",
      row.last_row_count === undefined ? "" : row.last_row_count,
      row.last_checked_at || "",
      row.last_error || ""
    ].join("\t"));
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.status) {
    printStatus();
    return 0;
  }
  if (!args.speciesId) {
    console.error("用法：npm run market:fetch -- <species_id> [--date YYYY-MM-DD] [--days 7|30]");
    return 1;
  }
  const mapping = mappings.mappingBySpecies(args.speciesId);
  if (!mapping) {
    console.error("未知魚種：" + args.speciesId);
    return 1;
  }
  if (args.date && !parseIsoDate(args.date)) {
    console.error("日期格式必須是 YYYY-MM-DD：" + args.date);
    return 1;
  }
  if (args.days !== null && args.days !== 7 && args.days !== 30) {
    console.error("--days 只接受 7 或 30");
    return 1;
  }

  const result = await fetchService.ensureFor(mapping, {
    date: args.date,
    days: args.days
  });

  const state = repository.getState(mapping.code);
  const summary = {
    species_id: mapping.species_id,
    species_code: mapping.code,
    status: result.status,
    rows: result.rows.length,
    last_trade_date: state ? state.last_trade_date : null,
    error: result.error || null
  };
  console.log(JSON.stringify(summary, null, 2));
  return result.status === "error" ? 1 : 0;
}

run().then(function (code) {
  process.exitCode = code;
}).catch(function (err) {
  console.error(err && err.message ? err.message : err);
  process.exitCode = 1;
});
