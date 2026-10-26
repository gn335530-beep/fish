/* 魚種清單：前端助手、上架與網頁共用的唯一來源。 */

const express = require("express");
const species = require("../lib/species");
const { ok } = require("../lib/http");

const router = express.Router();

router.get("/api/species", function (req, res) {
  ok(res, species.SPECIES, "取得魚種清單成功");
});

module.exports = router;
