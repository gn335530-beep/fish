/* 行情：市場對照（唯讀）、代碼查價與名稱整合查詢。 */

const express = require("express");
const markets = require("../lib/market/markets");
const quote = require("../lib/market/quote-service");
const { normalizeRegion } = require("../lib/regions");
const { parseIsoDate } = require("../lib/market/dates");
const { ok, fail } = require("../lib/http");

const router = express.Router();

router.get("/api/market/markets", function (req, res) {
  ok(res, markets.markets(), "取得市場對照成功");
});

function normalizeDays(value) {
  return Number(value) === 30 ? 30 : 7;
}

function readRegion(query, res) {
  if (query.region === undefined || String(query.region).trim() === "") return { region: null };
  const region = normalizeRegion(String(query.region));
  if (!region) {
    fail(res, 400, "INVALID_REGION", "無效的縣市");
    return { error: true };
  }
  return { region: region };
}

function readDate(query, res) {
  if (query.date === undefined || String(query.date).trim() === "") return { date: null };
  const date = parseIsoDate(String(query.date).trim());
  if (!date) {
    fail(res, 400, "INVALID_DATE", "日期格式必須是 YYYY-MM-DD");
    return { error: true };
  }
  return { date: date };
}

function sendQuote(res, data, foundMessage) {
  if (data.error === "AMBIGUOUS_SPECIES") {
    fail(res, 409, "AMBIGUOUS_SPECIES", "魚種名稱對到多個代碼", { candidates: data.candidates });
    return;
  }
  if (data.error === "SPECIES_NOT_FOUND") {
    fail(res, 404, "SPECIES_NOT_FOUND", "查無此魚種代碼");
    return;
  }
  if (data.error === "CATALOG_UNAVAILABLE") {
    fail(res, 503, "CATALOG_UNAVAILABLE", "官方魚種代碼字典尚未同步");
    return;
  }
  ok(res, data, data.found ? foundMessage : "查無行情");
}

function queryOptions(query) {
  return {
    date: null,
    region: null,
    includeHistory: String(query.include || "") === "history",
    days: normalizeDays(query.days),
    force: true
  };
}

router.get("/api/market/quote", async function (req, res) {
  const query = req.query || {};
  const name = String(query.q || "").trim();
  if (!name) {
    fail(res, 400, "MISSING_SPECIES", "請提供魚種名稱或代碼");
    return;
  }

  const region = readRegion(query, res);
  if (region.error) return;
  const date = readDate(query, res);
  if (date.error) return;

  try {
    const data = await quote.quoteByName(name, Object.assign(queryOptions(query), {
      region: region.region,
      date: date.date
    }));
    sendQuote(res, data, "取得行情成功");
  } catch (err) {
    fail(res, 500, "MARKET_QUERY_FAILED", "行情查詢失敗");
  }
});

router.get("/api/market/prices", async function (req, res) {
  const query = req.query || {};
  const code = String(query.code || "").trim();
  if (!/^\d+$/.test(code)) {
    fail(res, 400, "INVALID_SPECIES", "魚種代碼必須是數字");
    return;
  }

  const region = readRegion(query, res);
  if (region.error) return;
  const date = readDate(query, res);
  if (date.error) return;

  try {
    const data = await quote.quoteByCode(code, Object.assign(queryOptions(query), {
      region: region.region,
      date: date.date
    }));
    sendQuote(res, data, "取得行情成功");
  } catch (err) {
    fail(res, 500, "MARKET_QUERY_FAILED", "行情查詢失敗");
  }
});

module.exports = router;
