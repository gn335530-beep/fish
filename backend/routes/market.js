/* 行情：主要新鮮代碼／市場對照（唯讀）與公開行情查詢。 */

const express = require("express");
const species = require("../lib/species");
const mappings = require("../lib/market/mappings");
const service = require("../lib/market/service");
const { normalizeRegion } = require("../lib/regions");
const { parseIsoDate } = require("../lib/market/dates");
const { ok, fail } = require("../lib/http");

const router = express.Router();

router.get("/api/market/species-codes", function (req, res) {
  ok(res, mappings.speciesCodes(), "取得主要新鮮代碼成功");
});

router.get("/api/market/markets", function (req, res) {
  ok(res, mappings.markets(), "取得市場對照成功");
});

function normalizeDays(value) {
  return Number(value) === 30 ? 30 : 7;
}

router.get("/api/market/prices", async function (req, res) {
  const query = req.query || {};
  const speciesId = String(query.species_id || "").trim();
  if (!species.byId(speciesId)) {
    fail(res, 400, "INVALID_SPECIES", "不支援的魚種");
    return;
  }

  let region = null;
  if (query.region !== undefined && String(query.region).trim() !== "") {
    region = normalizeRegion(String(query.region));
    if (!region) {
      fail(res, 400, "INVALID_REGION", "無效的縣市");
      return;
    }
  }

  let date = null;
  if (query.date !== undefined && String(query.date).trim() !== "") {
    date = parseIsoDate(String(query.date).trim());
    if (!date) {
      fail(res, 400, "INVALID_DATE", "日期格式必須是 YYYY-MM-DD");
      return;
    }
  }

  const includeHistory = String(query.include || "") === "history";
  try {
    const data = await service.getMarketPrice({
      speciesId: speciesId,
      region: region,
      date: date,
      includeHistory: includeHistory,
      days: normalizeDays(query.days)
    });
    ok(res, data, data.found ? "取得行情成功" : "查無行情");
  } catch (err) {
    fail(res, 500, "MARKET_QUERY_FAILED", "行情查詢失敗");
  }
});

module.exports = router;
