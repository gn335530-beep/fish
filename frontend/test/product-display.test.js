/* 首頁與漁獲列表的直式商品卡：魚種、處理、尾數、雙價、地區與兩個按鈕。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const ctx = (function () {
  const sandbox = {
    window: {
      HaisenFormat: {
        escapeHtml: function (value) {
          return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
          });
        },
        money: function (value) { return "NT$" + Number(value || 0).toLocaleString("en-US"); }
      },
      HaisenAPI: { photoUrl: function (url) { return url; } }
    },
    normalizeCityName: function (value) { return String(value || "").replace(/臺/g, "台"); },
    document: { getElementById: function () { return null; }, addEventListener: function () {} }
  };
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
})();

vm.runInContext(read("../assets/js/app/05-product-view.js"), ctx);

const PRODUCT = {
  id: "prd_1",
  seller_id: 1,
  fish_species: "土魠",
  weight_kg: 3,
  quantity: 2,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: 1000,
  price_per_taijin: 200,
  price_auto: true,
  unit_price: 500,
  available: 2,
  reserved_quantity: 0,
  status: "ACTIVE",
  region: "高雄市",
  location: "高雄市鼓山區",
  catch_time: "2026-10-25T05:00:00+08:00",
  title: "土魠（3kg / 2尾 / 放血冰鎮）"
};

function card(overrides) {
  return vm.runInContext("productCardHTML(" + JSON.stringify(Object.assign({}, PRODUCT, overrides)) + ")", ctx);
}

function cardWith(overrides, options) {
  return vm.runInContext("productCardHTML(" + JSON.stringify(Object.assign({}, PRODUCT, overrides)) +
    ", " + JSON.stringify(options || {}) + ")", ctx);
}

test("商品卡顯示魚種、處理方式、尾數、雙價與地區", function () {
  const html = card();
  assert.match(html, /土魠/);
  assert.match(html, /放血冰鎮/);
  assert.match(html, /共 2 尾/);
  assert.match(html, /每台斤售價：NT\$200/);
  assert.match(html, /NT\$1,000/);
  assert.match(html, /整批售價/);
  assert.match(html, /高雄市.*高雄市鼓山區/);
});

test("商品卡不再顯示重量、每尾均價、日期、查看詳情或自動計算", function () {
  const html = card();
  assert.doesNotMatch(html, /3(?:\.0)? kg|重量/);
  assert.doesNotMatch(html, /每尾均價/);
  assert.doesNotMatch(html, /釣獲|上架 20/);
  assert.doesNotMatch(html, /查看詳情|product-detail/);
  assert.doesNotMatch(html, /自動計算/);
});

test("有可售量時並排顯示釣客資訊連結與洽談購買，且沒有數量下拉", function () {
  const html = card();
  assert.match(html, /href="profile\.html\?id=1"/);
  assert.match(html, /釣客資訊/);
  assert.doesNotMatch(html, /data-action="seller-info"/);
  assert.match(html, /data-deal-product="prd_1"/);
  assert.match(html, /洽談購買/);
  assert.doesNotMatch(html, /data-deal-qty|<select/);
});

test("沒有可售量時保留釣客資訊連結並顯示洽談中或已售出", function () {
  const reserved = card({ available: 0, reserved_quantity: 1 });
  assert.match(reserved, /href="profile\.html\?id=1"/);
  assert.match(reserved, /洽談中，暫無法購買/);
  assert.doesNotMatch(reserved, /data-deal-product/);

  const sold = card({ available: 0, reserved_quantity: 0 });
  assert.match(sold, /href="profile\.html\?id=1"/);
  assert.match(sold, /已售出/);
  assert.doesNotMatch(sold, /data-deal-product/);

  const delisted = card({ available: 0, status: "DELISTED" });
  assert.match(delisted, /href="profile\.html\?id=1"/);
  assert.match(delisted, /已下架/);
  assert.doesNotMatch(delisted, /data-deal-product/);
});

test("缺漏地區或地點時顯示地區未提供", function () {
  assert.match(card({ location: "" }), /地區未提供/);
  assert.match(card({ region: "" }), /地區未提供/);
});

test("處理方式字數多時加上縮字與膠囊樣式", function () {
  assert.match(card({ condition: "去鱗去內臟" }), /catch-card__condition--long/);
  assert.match(card({ condition: "去鱗去內臟真空包裝" }), /catch-card__condition--xlong/);
  assert.doesNotMatch(card({ condition: "活體" }), /catch-card__condition--/);
});

test("個人資訊頁隱藏釣客資訊；自己的商品不顯示洽談購買", function () {
  const other = cardWith({}, { hideSeller: true });
  assert.doesNotMatch(other, /釣客資訊|profile\.html\?id=/);
  assert.match(other, /data-deal-product="prd_1"/);

  const own = cardWith({}, { hideSeller: true, own: true });
  assert.doesNotMatch(own, /data-deal-product|洽談購買|釣客資訊/);
  assert.match(own, /listing__badge--active/);
  assert.match(own, /上架中/);
});

test("管理模式依狀態顯示下架、重新上架或刪除", function () {
  const active = cardWith({ status: "ACTIVE" }, { hideSeller: true, manage: true });
  assert.match(active, /data-profile-action="delist"/);
  assert.doesNotMatch(active, /data-profile-action="delete"|data-profile-action="relist"/);

  const partial = cardWith({ status: "PARTIALLY_RESERVED" }, { hideSeller: true, manage: true });
  assert.match(partial, /data-profile-action="delist"/);
  assert.match(partial, /洽談中/);

  const delisted = cardWith({ status: "DELISTED", quantity: 2, sold_quantity: 0 }, { hideSeller: true, manage: true });
  assert.match(delisted, /data-profile-action="relist"/);
  assert.match(delisted, /data-profile-action="delete"/);
  assert.match(delisted, /已下架/);

  const delistedNoStock = cardWith({ status: "DELISTED", quantity: 2, sold_quantity: 2 }, { hideSeller: true, manage: true });
  assert.doesNotMatch(delistedNoStock, /data-profile-action="relist"/);
  assert.match(delistedNoStock, /data-profile-action="delete"/);

  const sold = cardWith({ status: "SOLD_OUT" }, { hideSeller: true, manage: true });
  assert.doesNotMatch(sold, /data-profile-action="delist"|data-profile-action="relist"/);
  assert.match(sold, /data-profile-action="delete"/);
});

test("商品詳情頁與腳本已刪除，全站沒有指向它的連結", function () {
  assert.equal(fs.existsSync(new URL("../pages/product-detail.html", import.meta.url)), false);
  assert.equal(fs.existsSync(new URL("../assets/js/pages/product-detail.js", import.meta.url)), false);
  ["../pages/index.html", "../pages/products.html", "../assets/js/app/05-product-view.js"].forEach(function (path) {
    assert.doesNotMatch(read(path), /product-detail|查看詳情/);
  });
});
