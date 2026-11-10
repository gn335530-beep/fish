/* 行情卡：平均價、走勢、重量試算、單位切換與固定來源。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { update } = await import("../assets/js/demo/store.js");
const { renderCard } = await import("../assets/js/demo/views/cards.js");
const { handleMarketUnitChange } = await import("../assets/js/demo/views/market-card.js");
const market = await import("../assets/js/demo/market-state.js");

function card(overrides) {
  return Object.assign({
    type: "market_quote",
    species_code: 2166,
    official_name: "花枝",
    species_name: "花枝",
    scope: "city",
    region: "高雄市",
    trade_date: "2026-10-22",
    price_per_taijin: 200,
    is_aquaculture: false,
    source: "舊來源",
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

function pastedWeight(value, unit) {
  update({
    marketWeights: { msg_1: value },
    marketUnits: { msg_1: unit || "taijin" }
  });
  return renderCard(card(), "msg_1");
}

test.beforeEach(function () {
  update({ marketDays: {}, marketWeights: {}, marketUnits: {} });
});

test("行情卡顯示標題、魚種、平均價、範圍、日期、走勢與固定來源", function () {
  const html = renderCard(card(), "msg_1");
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /行情卡/);
  assert.match(text, /花枝/);
  assert.match(text, /200 元\/台斤/);
  assert.match(text, /\(高雄市平均\)/);
  assert.match(text, /2026-10-22/);
  assert.match(text, /近7個交易日/);
  assert.match(text, /最高 210/);
  assert.match(text, /最低 190/);
  assert.match(text, /資料來源：農業部 漁業署/);
  assert.match(html, /viewBox="0 0 295 345"/);
});

test("不再顯示行情價參考、養殖價格、官方名稱獨立行或參考整批", function () {
  const html = renderCard(card({ official_name: "花枝", is_aquaculture: true }), "msg_1");
  assert.doesNotMatch(html, /行情價參考/);
  assert.doesNotMatch(html, /養殖價格/);
  assert.doesNotMatch(html, /fm-market__official/);
  assert.doesNotMatch(html, /參考整批|行情價參考，非售價/);
  assert.doesNotMatch(html, /<select/);
});

test("重量空白時參考價格顯示 —，預設單位為台斤", function () {
  const html = renderCard(card(), "msg_1");
  assert.match(html, /name="market-unit-msg_1" value="taijin" data-market-unit="msg_1" checked/);
  assert.match(html, /data-market-ref="msg_1">—</);
});

test("台斤重量以平均價即時計算參考價格", function () {
  const html = pastedWeight("2", "taijin");
  assert.match(html, /data-market-weight="msg_1" value="2"/);
  assert.match(html, /data-market-ref="msg_1">NT\$400</);
});

test("公斤重量換算成台斤後計算參考價格", function () {
  const html = pastedWeight("1.2", "kg");
  assert.match(html, /name="market-unit-msg_1" value="kg" data-market-unit="msg_1" checked/);
  assert.match(html, /data-market-ref="msg_1">NT\$400</);
});

test("重量為 0、負數或非數字時顯示 —", function () {
  ["0", "-2", "abc"].forEach(function (value) {
    assert.match(pastedWeight(value), /data-market-ref="msg_1">—</);
  });
});

test("切換單位保留重量數字，只重新計算參考價格", function () {
  update({ marketWeights: { msg_1: "2" }, marketUnits: { msg_1: "taijin" } });
  const card = { price_per_taijin: 200 };
  assert.equal(market.referencePrice(card, "msg_1"), 400);

  market.setMarketUnit("msg_1", "kg");
  assert.equal(market.weightOf("msg_1"), "2");
  assert.equal(market.unitOf("msg_1"), "kg");
  assert.equal(market.referencePrice(card, "msg_1"), 667);

  market.setMarketUnit("msg_1", "taijin");
  assert.equal(market.weightOf("msg_1"), "2");
  assert.equal(market.referencePrice(card, "msg_1"), 400);
});

test("每個訊息各自保存重量與單位", function () {
  update({ marketWeights: { msg_1: "2", msg_2: "3" }, marketUnits: { msg_1: "taijin", msg_2: "kg" } });
  assert.equal(market.weightOf("msg_1"), "2");
  assert.equal(market.unitOf("msg_1"), "taijin");
  assert.equal(market.weightOf("msg_2"), "3");
  assert.equal(market.unitOf("msg_2"), "kg");
});

test("切換單位以輸入框目前重量重算，重量數字不變", function () {
  update({ marketWeights: { msg_1: "2" }, marketUnits: { msg_1: "taijin" } });
  const input = { value: "3" };
  const ref = { textContent: "" };
  const card = {
    getAttribute: function (name) {
      return name === "data-price-per-taijin" ? "200" : null;
    },
    querySelector: function (selector) {
      if (selector === "[data-market-weight]") return input;
      if (selector === "[data-market-ref]") return ref;
      return null;
    }
  };
  handleMarketUnitChange({
    value: "kg",
    getAttribute: function () { return "msg_1"; },
    closest: function () { return card; }
  });
  assert.equal(input.value, "3");
  assert.equal(ref.textContent, "NT$1,000");
});

test("每個訊息的單位 radio 使用獨立 name", function () {
  const first = renderCard(card(), "msg_1");
  const second = renderCard(card(), "msg_2");
  assert.match(first, /name="market-unit-msg_1"/);
  assert.match(second, /name="market-unit-msg_2"/);
});

test("三位數價格水平壓縮，避免撞到單位", function () {
  const long = renderCard(card({ price_per_taijin: 285.5 }), "msg_1");
  const scale = Number(long.match(/--price-scale:([0-9.]+)/)[1]);
  assert.ok(scale < 1);
  assert.match(renderCard(card(), "msg_1"), /--price-scale:1"/);
});

test("切換 7／30 日不會重置重量", function () {
  update({ marketWeights: { msg_1: "2" }, marketDays: { msg_1: 30 } });
  const html = renderCard(card(), "msg_1");
  assert.match(html, /近30個交易日/);
  assert.match(html, /data-market-weight="msg_1" value="2"/);
  assert.match(html, /data-market-ref="msg_1">NT\$400</);
});
