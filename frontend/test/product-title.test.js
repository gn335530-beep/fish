/* 商品卡標題：對話商品卡直接使用後端標題，缺漏時顯示通用文案。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { renderCard } = await import("../assets/js/demo/views/cards.js");

function productCard(overrides) {
  return Object.assign({
    type: "product",
    product_id: "prd_1",
    photo_url: "/uploads/a.jpg",
    price: 1000,
    unit_price: 1000,
    available: 1,
    reserved_quantity: 0,
    weight_kg: 4.5,
    quantity: 1,
    condition: "活體"
  }, overrides || {});
}

test("對話商品卡直接使用後端標題", function () {
  const html = renderCard(productCard({ title: "石斑（4.5kg / 1尾 / 活體）" }), "msg_1");
  assert.match(html, /石斑（4\.5kg \/ 1尾 \/ 活體）/);
});

test("缺少標題時顯示通用文案，不自行拼接魚種與規格", function () {
  const html = renderCard(productCard({ title: "", fish_species: "石斑" }), "msg_1");
  assert.match(html, /商品資訊未提供/);
  assert.doesNotMatch(html, /石斑（4\.5kg/);
});
