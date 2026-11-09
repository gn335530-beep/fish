/* 上架紀錄抽屜：tabs、數量、空狀態、商品列與登入引導。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const source = read("../assets/js/app/11-listing-history.js");
const formatSource = read("../assets/js/shared/format.js");
const drawerSource = read("../assets/js/app/06-drawer.js");

function newContext(options) {
  const opts = options || {};
  const ctx = vm.createContext({
    window: {
      HaisenAPI: {
        photoUrl: function (path) { return path; },
        listMyProducts: opts.listMyProducts || async function () { return []; }
      }
    },
    document: { querySelectorAll: function () { return []; } },
    getUser: function () { return opts.user === undefined ? { id: 1 } : opts.user; }
  });
  vm.runInContext(formatSource, ctx);
  vm.runInContext(source, ctx);
  return ctx;
}

function listHTML(ctx, options) {
  const state = Object.assign({ loading: false, error: "", rows: [], tab: "active" }, options || {});
  vm.runInContext("listingHistory = " + JSON.stringify(state), ctx);
  return vm.runInContext("listingHistoryHTML()", ctx);
}

const ACTIVE = {
  id: "prd_active",
  fish_species: "石斑",
  condition: "活體",
  photo_url: "/uploads/a.jpg",
  quantity: 3,
  sold_quantity: 1,
  reserved_quantity: 0,
  price: 2800,
  price_per_taijin: 373,
  listed_at: "2026-11-08T05:00:00.000Z",
  delisted_at: null,
  status: "ACTIVE"
};

const PARTIAL = Object.assign({}, ACTIVE, {
  id: "prd_partial",
  fish_species: "黑鯛",
  reserved_quantity: 1,
  status: "PARTIALLY_RESERVED"
});

const DELISTED = Object.assign({}, ACTIVE, {
  id: "prd_delisted",
  fish_species: "花枝",
  delisted_at: "2026-11-09T05:00:00.000Z",
  available: 0,
  status: "DELISTED"
});

const SOLD = Object.assign({}, ACTIVE, {
  id: "prd_sold",
  fish_species: "土魠",
  quantity: 2,
  sold_quantity: 2,
  available: 0,
  status: "SOLD_OUT"
});

test("三個 tabs 顯示各自數量，預設只列出上架中與洽談中", function () {
  const html = listHTML(newContext(), {
    rows: [ACTIVE, PARTIAL, DELISTED, SOLD],
    tab: "active"
  });

  assert.match(html, /data-listing-tab="active"[^>]*>上架中 <span[^>]*>2<\/span>/);
  assert.match(html, /data-listing-tab="delisted"[^>]*>已下架 <span[^>]*>1<\/span>/);
  assert.match(html, /data-listing-tab="sold"[^>]*>已售出 <span[^>]*>1<\/span>/);
  assert.match(html, /data-listing-row="prd_active"/);
  assert.match(html, /data-listing-row="prd_partial"/);
  assert.doesNotMatch(html, /data-listing-row="prd_delisted"/);
  assert.doesNotMatch(html, /data-listing-row="prd_sold"/);
});

test("切換 tabs 只顯示該狀態的商品", function () {
  const ctx = newContext();
  const delisted = listHTML(ctx, { rows: [ACTIVE, DELISTED, SOLD], tab: "delisted" });
  assert.match(delisted, /data-listing-row="prd_delisted"/);
  assert.doesNotMatch(delisted, /data-listing-row="prd_active"/);

  const sold = listHTML(ctx, { rows: [ACTIVE, DELISTED, SOLD], tab: "sold" });
  assert.match(sold, /data-listing-row="prd_sold"/);
  assert.doesNotMatch(sold, /data-listing-row="prd_delisted"/);
});

test("各 tab 有自己的空狀態", function () {
  const ctx = newContext();
  assert.match(listHTML(ctx, { tab: "active" }), /目前沒有上架中的商品。/);
  assert.match(listHTML(ctx, { tab: "delisted" }), /目前沒有已下架的商品。/);
  assert.match(listHTML(ctx, { tab: "sold" }), /目前沒有已售出的商品。/);
});

test("商品列顯示縮圖、魚種與處理方式、狀態、尾數、價格與時間", function () {
  const html = listHTML(newContext(), { rows: [ACTIVE, PARTIAL], tab: "active" });

  assert.match(html, /src="\/uploads\/a.jpg"/);
  assert.match(html, /石斑/);
  assert.match(html, /活體/);
  assert.match(html, /共 3 尾 · 已售 1 尾/);
  assert.doesNotMatch(html, /保留 0 尾/);
  assert.match(html, /洽談中/);
  assert.match(html, /保留 1 尾/);
  assert.match(html, /整批 NT\$2,800/);
  assert.match(html, /NT\$373／台斤/);
  assert.match(html, /上架：\d{2}\/\d{2} \d{2}:\d{2}/);
});

test("只有已下架商品顯示下架時間", function () {
  const ctx = newContext();
  const active = listHTML(ctx, { rows: [ACTIVE], tab: "active" });
  assert.doesNotMatch(active, /下架：/);

  const delisted = listHTML(ctx, { rows: [DELISTED], tab: "delisted" });
  assert.match(delisted, /已下架/);
  assert.match(delisted, /下架：\d{2}\/\d{2} \d{2}:\d{2}/);
});

test("載入中與載入失敗都有對應畫面", function () {
  const ctx = newContext();
  assert.match(listHTML(ctx, { loading: true }), /載入中…/);

  const failed = listHTML(ctx, { error: "載入失敗" });
  assert.match(failed, /載入失敗/);
  assert.match(failed, /data-listing-retry/);
});

test("未登入時仍可開啟上架紀錄並顯示登入引導", function () {
  const ctx = vm.createContext({
    window: { HaisenAPI: { photoUrl: function (path) { return path; } } },
    document: { querySelectorAll: function () { return []; } },
    getUser: function () { return null; }
  });
  vm.runInContext(formatSource, ctx);
  vm.runInContext(drawerSource, ctx);
  vm.runInContext(source, ctx);
  vm.runInContext("drawerView = 'profile'; renderDrawer = function () { drawerView = 'listings'; }", ctx);

  vm.runInContext("openListings()", ctx);

  assert.equal(vm.runInContext("drawerView", ctx), "listings");
  assert.match(vm.runInContext("drawerLoginHTML()", ctx), /請先登入/);
});

test("抽屜與導覽選單都接上上架紀錄入口", function () {
  assert.match(drawerSource, /drawerView === "listings"/);
  assert.match(read("../assets/js/app/02-account.js"), /data-open-listings/);
  assert.match(read("../assets/js/app/07-drawer-panels.js"), /data-open-listings/);
});

test("行動版導覽選單以整個導覽列定位，不再被壓成窄欄", function () {
  const css = read("../assets/css/navigation.css");
  assert.match(css, /@media\(max-width:760px\)\{[\s\S]*\.nav__right\{position:static\}/);
});
