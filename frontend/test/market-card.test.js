/* 行情卡：平均價、走勢、期間高低、參考整批、7／30 切換與養殖標記。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { state, update } = await import("../assets/js/demo/store.js");
const { renderCard } = await import("../assets/js/demo/views/cards.js");

function card(overrides) {
  return Object.assign({
    type: "market_quote",
    species_id: "cuttlefish",
    species_name: "花枝",
    scope: "city",
    region: "高雄市",
    trade_date: "2026-10-22",
    price_per_taijin: 200,
    is_aquaculture: false,
    source: "農業部漁產品交易行情",
    weight_kg: 3,
    weight_taijin: 5,
    estimated_total: 1000,
    history: [
      { trade_date: "2026-10-16", price_per_taijin: 190 },
      { trade_date: "2026-10-17", price_per_taijin: 195 },
      { trade_date: "2026-10-18", price_per_taijin: 200 },
      { trade_date: "2026-10-19", price_per_taijin: 205 },
      { trade_date: "2026-10-20", price_per_taijin: 210 },
      { trade_date: "2026-10-21", price_per_taijin: 205 },
      { trade_date: "2026-10-22", price_per_taijin: 200 }
    ],
    history_30: [
      { trade_date: "2026-09-23", price_per_taijin: 180 },
      { trade_date: "2026-10-22", price_per_taijin: 200 }
    ],
    high: 210,
    low: 190,
    high_30: 210,
    low_30: 180
  }, overrides || {});
}

test.beforeEach(function () {
  update({ marketDays: {} });
});

test("行情卡顯示平均價、縣市平均、日期、來源與新鮮批發參考", function () {
  const html = renderCard(card(), "msg_1");
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /200 元／台斤/);
  assert.match(text, /高雄市平均/);
  assert.match(text, /2026-10-22/);
  assert.match(text, /農業部漁產品交易行情/);
  assert.match(text, /新鮮批發參考/);
  assert.doesNotMatch(text, /今日行情|即時均價|上價|中價|下價/);
});

test("顯示期間最高最低與參考整批金額", function () {
  const html = renderCard(card(), "msg_1");
  assert.match(html, /最高 210/);
  assert.match(html, /最低 190/);
  assert.match(html, /5 台斤/);
  assert.match(html, /參考整批/);
  assert.match(html, /NT\$1,000/);
});

test("養殖魚種標示養殖價格", function () {
  const html = renderCard(card({ is_aquaculture: true }), "msg_1");
  assert.match(html, /養殖價格/);
});

test("7／30 切換預設 7 個交易日，切換後顯示 30 日高低", function () {
  const html = renderCard(card(), "msg_1");
  assert.match(html, /data-action="market-days" data-days="7"/);
  assert.match(html, /data-action="market-days" data-days="30"/);
  assert.match(html, /近 7 個交易日/);
  assert.match(html, /最高 210/);

  update({ marketDays: { msg_1: 30 } });
  const wide = renderCard(card(), "msg_1");
  assert.match(wide, /近 30 個交易日/);
  assert.match(wide, /最高 210/);
  assert.match(wide, /最低 180/);
});
