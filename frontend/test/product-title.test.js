/* 助手房詢價推薦小卡：魚種＋處理方式、尾數、雙價、地區與洽談購買。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { renderCard } = await import("../assets/js/demo/views/cards.js");

function productCard(overrides) {
  return Object.assign({
    type: "product",
    product_id: "prd_1",
    title: "石斑（4.5kg / 1尾 / 活體）",
    fish_species: "石斑",
    photo_url: "/uploads/a.jpg",
    price: 1000,
    price_per_taijin: 200,
    price_auto: true,
    unit_price: 1000,
    available: 1,
    reserved_quantity: 0,
    weight_kg: 4.5,
    quantity: 1,
    condition: "活體",
    region: "高雄市",
    location: "高雄市鼓山區"
  }, overrides || {});
}

test("推薦小卡顯示魚種、處理方式、尾數、雙價與地區", function () {
  const html = renderCard(productCard(), "msg_1");
  assert.match(html, /石斑/);
  assert.match(html, /活體/);
  assert.match(html, /共 1 尾/);
  assert.match(html, /每台斤售價：NT\$200/);
  assert.match(html, /整批售價：NT\$1,000/);
  assert.match(html, /高雄市/);
});

test("不再顯示重量、深入諮詢、每尾均價、數量下拉、自動計算或賣家資訊", function () {
  const html = renderCard(productCard(), "msg_1");
  assert.doesNotMatch(html, /4\.5 kg|重量/);
  assert.doesNotMatch(html, /深入諮詢/);
  assert.doesNotMatch(html, /每尾均價/);
  assert.doesNotMatch(html, /data-fm-qty|<select/);
  assert.doesNotMatch(html, /自動計算/);
  assert.doesNotMatch(html, /seller-info|賣家資訊/);
});

test("長標題不會取代魚種，卡片只顯示魚種名稱", function () {
  const html = renderCard(productCard({ title: "石斑（4.5kg / 1尾 / 活體）" }), "msg_1");
  assert.doesNotMatch(html, /4\.5kg \/ 1尾/);
  assert.match(html, /<b>石斑<\/b>/);
});

test("沒有每台斤售價時不顯示該行", function () {
  const html = renderCard(productCard({ price_per_taijin: null }), "msg_1");
  assert.doesNotMatch(html, /每台斤售價/);
});

test("有可售量時以預設數量 1 開啟交易房", function () {
  const html = renderCard(productCard(), "msg_1");
  assert.match(html, /data-action="start-deal" data-product="prd_1"/);
  assert.match(html, /洽談購買/);
});

test("沒有可售量時顯示洽談中或已售出且沒有購買按鈕", function () {
  const reserved = renderCard(productCard({ available: 0, reserved_quantity: 1 }), "msg_1");
  assert.match(reserved, /洽談中，暫無法購買/);
  assert.doesNotMatch(reserved, /start-deal/);

  const sold = renderCard(productCard({ available: 0, reserved_quantity: 0 }), "msg_1");
  assert.match(sold, /已售出/);
  assert.doesNotMatch(sold, /start-deal/);
});
