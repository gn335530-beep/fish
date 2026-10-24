/* 舊版漁獲端點：只保留 GET，從 products 轉出舊格式，
   讓現有商品頁與購物車在移除前仍可運作。 */

const express = require("express");
const { all, patch, findById } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { decorateProduct, decorateProducts, sweepExpired } = require("../lib/orders");
const { ok, fail } = require("../lib/http");

const router = express.Router();

const TAIJIN_TO_KG = 0.6;

function sellerOf(userId) {
  const user = all("users").find(function (u) { return String(u.id) === String(userId); });
  if (!user) return { display_name: "釣客", username: "" };
  return { display_name: user.display_name, username: user.username };
}

function imageUrl(photoUrl, req) {
  if (!photoUrl) return "";
  if (photoUrl.indexOf("/uploads/") !== 0) return photoUrl;
  return req.protocol + "://" + req.get("host") + photoUrl;
}

function toLegacy(product, req) {
  const totalTaijin = Number(product.weight_kg || 0) / TAIJIN_TO_KG;
  const pricePerTaijin = totalTaijin > 0 ? Math.round(Number(product.price || 0) / totalTaijin) : 0;
  const avgTaijin = Number(product.avg_weight_kg || 0) / TAIJIN_TO_KG;

  return {
    id: product.id,
    seller_id: product.seller_id,
    fish_type: product.fish_species,
    species_id: product.species_id,
    species_latin: product.species_latin,
    quantity: product.available,
    weight: Math.round(avgTaijin * 10) / 10,
    price_per_taijin: pricePerTaijin,
    price_per_kg: Math.round(pricePerTaijin / TAIJIN_TO_KG),
    region: product.region,
    sea: "",
    location: product.location,
    caught_time: product.catch_time,
    created_at: product.created_at,
    status: product.available > 0 ? "AVAILABLE" : "SOLD_OUT",
    process: product.condition,
    process_note: "",
    shipping: ["買家自取"],
    payment: ["面交付款"],
    deposit_on: false,
    deposit_amount: 0,
    images: [imageUrl(product.photo_url, req)],
    tail_weights: null,
    weight_mode: "average",
    tags: [],
    seller: sellerOf(product.seller_id)
  };
}

router.get("/api/fish/data", function (req, res) {
  sweepExpired();
  const data = decorateProducts(all("products"))
    .map(function (product) { return toLegacy(product, req); })
    .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  ok(res, data, "取得漁獲清單成功");
});

/* 相容層的更新：舊購物車結帳時會把狀態改成 PENDING_PAYMENT，
   這裡直接視為整批售出，讓舊流程在移除購物車前仍可運作。 */
router.put("/api/fish/data/:id", requireUser, function (req, res) {
  const product = all("products").find(function (p) { return String(p.id) === req.params.id; });
  if (!product) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到漁獲資料");
    return;
  }

  const body = req.body || {};
  if (body.status === "PENDING_PAYMENT") {
    patch("products", product.id, {
      sold_quantity: Number(product.quantity || 0),
      legacy_buyer_id: body.buyer_id || null,
      legacy_buyer_name: body.buyer_name || null
    });
  }

  const updated = decorateProduct(findById("products", product.id), all("deals"));
  ok(res, toLegacy(updated, req), "漁獲資料已更新");
});

module.exports = router;