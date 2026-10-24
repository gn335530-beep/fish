/* 舊版漁獲端點：只保留 GET，從 products 轉出舊格式，
   供尚未改接商品 API 的頁面讀取；不提供任何寫入。 */

const express = require("express");
const { all } = require("../lib/store");
const { decorateProducts, sweepExpired } = require("../lib/orders");
const { ok } = require("../lib/http");

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

module.exports = router;