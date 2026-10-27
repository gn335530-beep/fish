/* 商品：查詢與 AI 上架建立。 */

const express = require("express");
const { all, insert, nextCode } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { decorateProduct, decorateProducts, sweepExpired } = require("../lib/orders");
const species = require("../lib/species");
const market = require("../lib/market/service");
const { round1, buildTitle } = require("../lib/product-title");
const { normalizeRegion } = require("../lib/regions");
const { ok, created, fail } = require("../lib/http");

const router = express.Router();

function toSnapshot(data) {
  if (!data || !data.found) return null;
  return {
    scope: data.scope,
    region: data.region,
    trade_date: data.trade_date,
    price_per_kg: data.price_per_kg,
    price_per_taijin: data.price_per_taijin,
    is_aquaculture: data.is_aquaculture,
    source: data.source,
    source_url: data.source_url,
    fetched_at: data.fetched_at,
    quality: data.quality
  };
}

/* 行情查不到或上游失敗都不阻擋上架，快照為 null。 */
async function snapshotFor(speciesId, region) {
  if (!speciesId) return null;
  try {
    const data = await market.getMarketPrice({
      speciesId: speciesId,
      region: region || null,
      date: null,
      includeHistory: false
    });
    return toSnapshot(data);
  } catch (err) {
    return null;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/* 只填每台斤時由後端算整批；兩者都填時保留原值，不檢查一致性。 */
function readPricing(body, weightKg) {
  const hasPrice = hasValue(body.price);
  const hasPerTaijin = hasValue(body.price_per_taijin);
  if (!hasPrice && !hasPerTaijin) return { error: "MISSING_PRICE" };

  const priceValue = hasPrice ? Number(body.price) : null;
  const perTaijinValue = hasPerTaijin ? Number(body.price_per_taijin) : null;
  if ((hasPrice && (!Number.isFinite(priceValue) || priceValue <= 0)) ||
      (hasPerTaijin && (!Number.isFinite(perTaijinValue) || perTaijinValue <= 0))) {
    return { error: "INVALID_PRICE" };
  }

  const auto = !hasPrice && hasPerTaijin;
  const price = hasPrice
    ? priceValue
    : Math.round(perTaijinValue * weightKg / 0.6);
  if (!(price > 0)) return { error: "INVALID_PRICE" };
  return {
    price: price,
    price_per_taijin: hasPerTaijin ? perTaijinValue : null,
    price_auto: auto
  };
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

router.post("/api/products/create", requireUser, async function (req, res) {
  const body = req.body || {};
  const fishSpecies = String(body.fish_species || "").trim();
  const quantity = Math.floor(Number(body.quantity));
  const weightKg = Number(body.weight_kg);
  const weight = round1(weightKg);
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
  if (!condition) {
    fail(res, 400, "MISSING_CONDITION", "請描述處理方式");
    return;
  }
  if (condition.length > 20) {
    fail(res, 400, "FIELD_TOO_LONG", "處理方式最多 20 字");
    return;
  }
  const pricing = readPricing(body, weightKg);
  if (pricing.error === "MISSING_PRICE") {
    fail(res, 400, "MISSING_PRICE", "請提供整批或每台斤售價");
    return;
  }
  if (pricing.error === "INVALID_PRICE") {
    fail(res, 400, "INVALID_PRICE", "售價必須大於 0 元");
    return;
  }
  if (!photoUrl) {
    fail(res, 400, "MISSING_PHOTO", "請上傳一張實拍照片");
    return;
  }

  const match = species.byId(body.species_id) || species.byName(fishSpecies);
  const user = req.user;
  const rawRegion = String(body.region || user.city || "").trim();
  const region = normalizeRegion(rawRegion);
  const marketSnapshot = await snapshotFor(match ? match.id : null, region);

  const product = insert("products", {
    id: nextCode("products", "prd"),
    seller_id: user.id,
    title: buildTitle(fishSpecies, weightKg, quantity, condition),
    fish_species: fishSpecies,
    species_id: match ? match.id : null,
    species_latin: (match && match.latin) || String(body.species_latin || ""),
    weight_kg: weight,
    quantity: quantity,
    sold_quantity: 0,
    condition: condition,
    photo_url: photoUrl,
    price: pricing.price,
    price_per_taijin: pricing.price_per_taijin,
    price_auto: pricing.price_auto,
    market_snapshot: marketSnapshot,
    region: region || rawRegion,
    location: String(body.location || [user.city, user.district, user.address_line].filter(Boolean).join("")).trim(),
    catch_time: body.catch_time || new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  created(res, decorateProduct(product, all("deals")), "商品已上架");
});

module.exports = router;
