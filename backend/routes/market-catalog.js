/* 官方新鮮代碼字典：查代碼與候選魚種；省略 q 時回傳完整字典。 */

const express = require("express");
const sync = require("../lib/market/catalog-sync");
const search = require("../lib/market/catalog-search");
const { ok, fail } = require("../lib/http");

const router = express.Router();

router.get("/api/market/codes", async function (req, res) {
  const query = req.query || {};
  const text = query.q === undefined ? "" : String(query.q).trim();

  const result = await sync.ensureCatalog();
  if (!result.available) {
    fail(res, 503, "CATALOG_UNAVAILABLE", "官方魚種代碼字典尚未同步");
    return;
  }

  const found = search.lookup(text);
  if (text && found.candidates.length === 0) {
    fail(res, 404, "SPECIES_NOT_FOUND", "查無此魚種代碼");
    return;
  }

  ok(res, { query: text || null, candidates: found.candidates },
    text ? "取得魚種候選成功" : "取得魚種代碼字典成功");
});

module.exports = router;
