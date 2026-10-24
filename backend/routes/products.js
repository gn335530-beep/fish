/* 商品：查詢與 AI 上架建立。 */

const express = require("express");
const { all, insert, nextCode } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { decorateProduct, decorateProducts, sweepExpired } = require("../lib/orders");
const species = require("../lib/species");
const { ok, created, fail } = require("../lib/http");

const router = express.Router();

const CONDITIONS = ["活體", "放血冰鎮", "三去處理", "冷凍"];

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function buildTitle(fishSpecies, weightKg, quantity, condition) {
  return fishSpecies + "（" + round1(weightKg) + "kg / " + quantity + "尾 / " + condition + "）";
}

function matches(text, keyword) {
  return String(text || "").indexOf(keyword) !== -1;
}

router.get("/api/products", function (req, res) {
  sweepExpired();
  const query = req.query || {};
  let rows = all("products");

  if (query.region) {
    rows = rows.filter(function (p) { return matches(p.region, query.region); });
  }
  if (query.species) {
    rows = rows.filter(function (p) {
      return matches(p.fish_species, query.species) || matches(p.species_id, query.species);
    });
  }
  if (query.seller_id) {
    rows = rows.filter(function (p) { return String(p.seller_id) === String(query.seller_id); });
  }

  let data = decorateProducts(rows).sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (query.status) {
    data = data.filter(function (p) { return p.status === query.status; });
  }
  const limit = Number(query.limit);
  if (limit > 0) data = data.slice(0, limit);

  ok(res, data, "取得商品清單成功");
});

router.get("/api/products/:id", function (req, res) {
  sweepExpired();
  const product = all("products").find(function (p) { return String(p.id) === req.params.id; });
  if (!product) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到商品");
    return;
  }
  ok(res, decorateProduct(product, all("deals")), "取得商品成功");
});

router.post("/api/products/create", requireUser, function (req, res) {
  const body = req.body || {};
  const fishSpecies = String(body.fish_species || "").trim();
  const quantity = Math.floor(Number(body.quantity));
  const weightKg = Number(body.weight_kg);
  const price = Math.round(Number(body.price));
  const condition = String(body.condition || "").trim();
  const photoUrl = String(body.photo_url || "").trim();

  if (!fishSpecies) {
    fail(res, 400, "MISSING_SPECIES", "請提供魚種");
    return;
  }
  if (!(weightKg > 0)) {
    fail(res, 400, "INVALID_WEIGHT", "重量必須大於 0 公斤");
    return;
  }
  if (!(quantity >= 1)) {
    fail(res, 400, "INVALID_QUANTITY", "尾數必須大於等於 1");
    return;
  }
  if (CONDITIONS.indexOf(condition) === -1) {
    fail(res, 400, "INVALID_CONDITION", "處理方式必須是活體、放血冰鎮、三去處理或冷凍");
    return;
  }
  if (!(price > 0)) {
    fail(res, 400, "INVALID_PRICE", "售價必須大於 0 元");
    return;
  }
  if (!photoUrl) {
    fail(res, 400, "MISSING_PHOTO", "請上傳一張實拍照片");
    return;
  }

  const match = species.byId(body.species_id) || species.byName(fishSpecies);
  const totalTaijin = weightKg / 0.6;
  const marketTotal = match ? Math.round(match.market * totalTaijin) : price;
  const user = req.user;

  const product = insert("products", {
    id: nextCode("products", "prd"),
    seller_id: user.id,
    title: buildTitle(fishSpecies, weightKg, quantity, condition),
    fish_species: fishSpecies,
    species_id: match ? match.id : null,
    species_latin: (match && match.latin) || String(body.species_latin || ""),
    weight_kg: round1(weightKg),
    quantity: quantity,
    sold_quantity: 0,
    condition: condition,
    photo_url: photoUrl,
    price: price,
    market_reference_price: marketTotal,
    region: String(body.region || user.city || "").trim(),
    location: String(body.location || [user.city, user.district, user.address_line].filter(Boolean).join("")).trim(),
    catch_time: body.catch_time || new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  created(res, decorateProduct(product, all("deals")), "商品已上架");
});

module.exports = router;
