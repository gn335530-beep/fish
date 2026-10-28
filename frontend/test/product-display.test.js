/* 商品卡與詳情：不顯示學名／料理資料，也不因沒有 species_id 顯示未知魚種。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const elements = {};

function context() {
  const ctx = {
    window: {
      HaisenFormat: {
        escapeHtml: function (value) { return String(value == null ? "" : value); },
        money: function (value) { return "NT$" + Number(value || 0).toLocaleString("en-US"); },
        dateOf: function () { return "2026-10-22"; }
      },
      HaisenAPI: { photoUrl: function (url) { return url; } }
    },
    normalizeCityName: function (value) { return String(value || "").replace(/臺/g, "台"); },
    document: {
      getElementById: function (id) {
        if (!elements[id]) elements[id] = { innerHTML: "", textContent: "" };
        return elements[id];
      },
      addEventListener: function () {}
    }
  };
  ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

const ctx = context();
vm.runInContext(read("../assets/js/app/05-product-view.js"), ctx);
vm.runInContext(read("../assets/js/pages/product-detail.js"), ctx);

const PRODUCT = {
  id: "prd_1",
  fish_species: "土魠",
  weight_kg: 3,
  quantity: 2,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: 1000,
  price_per_taijin: 200,
  available: 2,
  region: "高雄市",
  location: "高雄市鼓山區",
  catch_time: "2026-10-25T05:00:00+08:00",
  title: "土魠（3kg / 2尾 / 放血冰鎮）"
};

test("沒有 species_code 的商品仍正常顯示價格、重量、尾數、處理方式與地區", function () {
  const html = vm.runInContext("productCardHTML(" + JSON.stringify(PRODUCT) + ")", ctx);
  assert.match(html, /NT\$1,000/);
  assert.match(html, /3\.0 kg/);
  assert.match(html, /可售 2 尾/);
  assert.match(html, /放血冰鎮/);
  assert.match(html, /高雄市/);
  assert.doesNotMatch(html, /未知魚種|料理資料|學名/);
});

test("商品詳情不顯示學名與料理資料", function () {
  vm.runInContext("renderSpec(" + JSON.stringify(PRODUCT) + ")", ctx);
  const html = elements["pd-spec"].innerHTML;
  assert.match(html, /魚種/);
  assert.match(html, /總重/);
  assert.match(html, /處理方式/);
  assert.match(html, /地區/);
  assert.doesNotMatch(html, /學名|料理資料/);
});

test("商品頁與詳情頁不再載入魚種 API 或用 species_id 篩選", function () {
  const products = read("../assets/js/pages/products.js");
  const detail = read("../assets/js/pages/product-detail.js");
  const detailHtml = read("../pages/product-detail.html");
  assert.doesNotMatch(products, /listSpecies|species_id|f-cat/);
  assert.match(products, /fish_species/);
  assert.match(products, /filterRegion/);
  assert.doesNotMatch(detail + detailHtml, /species_latin|pd-latin|料理資料/);
});
