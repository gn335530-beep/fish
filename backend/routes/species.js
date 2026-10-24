/* 魚種清單：前端助手、上架與網頁共用的唯一來源。 */

const express = require("express");
const species = require("../lib/species");
const { ok } = require("../lib/http");

const router = express.Router();

/* 對外只移除內部定價參考；其餘欄位（含料理屬性、分類）由字典自動帶出。 */
function toPublic(item) {
  const out = Object.assign({}, item);
  delete out.market;
  return out;
}

router.get("/api/species", function (req, res) {
  ok(res, species.SPECIES.map(toPublic), "取得魚種清單成功");
});

module.exports = router;
