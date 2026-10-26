/* 商品卡行情：只顯示快照平均價、地區、日期、來源與養殖標記。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../assets/js/app/05-product-view.js", import.meta.url), "utf8"
);

function newContext() {
  const ctx = vm.createContext({
    window: { HaisenAPI: { photoUrl: function (path) { return path; } } },
    normalizeCityName: function (value) { return String(value || "").replace(/臺/g, "台"); },
    document: { getElementById: function () { return null; } }
  });
  vm.runInContext(source, ctx);
  return ctx;
}

function product(overrides) {
  return Object.assign({
    id: "prd_1",
    title: "石斑（4.5kg / 1尾 / 放血冰鎮）",
    fish_species: "石斑",
    species_id: "grouper",
    photo_url: "/uploads/a.jpg",
    price: 1000,
    unit_price: 1000,
    weight_kg: 4.5,
    quantity: 1,
    available: 1,
    reserved_quantity: 0,
    region: "高雄市",
    location: "高雄市",
    catch_time: "2026-10-22T05:00:00+08:00",
    market_snapshot: {
      scope: "city",
      region: "高雄市",
      trade_date: "2026-10-22",
      price_per_kg: 52.4,
      price_per_taijin: 31.4,
      is_aquaculture: false,
      source: "農業部漁產品交易行情",
      source_url: "https://example.test",
      fetched_at: "2026-10-27T00:00:00.000Z",
      quality: "official"
    }
  }, overrides || {});
}

test("商品卡顯示快照平均價、縣市平均、日期與來源", function () {
  const ctx = newContext();
  const html = ctx.productCardHTML(product());
  assert.match(html, /新鮮批發參考/);
  assert.match(html, /31\.4 元／台斤/);
  assert.match(html, /高雄市平均/);
  assert.match(html, /2026-10-22/);
  assert.match(html, /農業部漁產品交易行情/);
  assert.doesNotMatch(html, /今日行情|即時均價|澎湖魚市即時均價|上價|中價|下價/);
});

test("全國平均與養殖價格標記", function () {
  const ctx = newContext();
  const html = ctx.productCardHTML(product({
    market_snapshot: Object.assign({}, product().market_snapshot, {
      scope: "national",
      region: "澎湖縣",
      price_per_kg: 1237,
      price_per_taijin: 742.2,
      is_aquaculture: true
    })
  }));
  assert.match(html, /742\.2 元／台斤/);
  assert.match(html, /全國平均/);
  assert.match(html, /養殖價格/);
});

test("沒有快照時顯示暫無行情，不出現價格", function () {
  const ctx = newContext();
  const html = ctx.productCardHTML(product({ market_snapshot: null }));
  assert.match(html, /暫無行情/);
  assert.doesNotMatch(html, /元／台斤/);
  assert.equal(ctx.marketSnapshotSource(null), "新鮮批發參考");
});

test("行情快照格式化不顯示上價、中價、下價", function () {
  const ctx = newContext();
  const text = ctx.marketSnapshotSource(product().market_snapshot);
  assert.match(text, /新鮮批發參考/);
  assert.doesNotMatch(text, /上價|中價|下價/);
  assert.equal(ctx.marketSnapshotPrice({ price_per_taijin: 742.2 }), "742.2 元／台斤");
});
