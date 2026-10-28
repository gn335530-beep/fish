/* 共用格式：跳脫、金額、日期時間與行情文字都從同一個全域取得。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

await import("../assets/js/shared/format.js");
const format = globalThis.window.HaisenFormat;

test("共用格式掛在 window.HaisenFormat", function () {
  ["escapeHtml", "money", "timeOf", "dateTimeOf", "dateOf", "localInputOf",
    "priceText", "marketPriceText", "marketScopeText"].forEach(function (name) {
    assert.equal(typeof format[name], "function", name);
  });
});

test("跳脫 HTML 特殊字元", function () {
  assert.equal(
    format.escapeHtml("<b>\"x\" & 'y'</b>"),
    "&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;"
  );
  assert.equal(format.escapeHtml(null), "");
});

test("金額固定用 NT$ 格式", function () {
  assert.equal(format.money(4330), "NT$4,330");
  assert.equal(format.money(null), "NT$0");
});

test("日期與時間格式", function () {
  assert.equal(format.dateTimeOf("2026-10-26T09:30:00"), "10/26 09:30");
  assert.equal(format.dateOf("2026-10-22T12:00:00"), "2026/10/22");
  assert.equal(format.localInputOf("2026-10-26T09:30:00"), "2026-10-26T09:30");
  assert.equal(format.dateTimeOf("不是日期"), "");
});

test("台斤換算只由共用常數提供", function () {
  assert.equal(format.KG_PER_TAIJIN, 0.6);
  assert.equal(format.kgFromTaijin(2), 1.2);
  assert.equal(format.taijinFromKg(3), 5);
});

test("行情文字只由共用格式產生", function () {
  const data = {
    price_per_taijin: 742.2,
    scope: "city",
    region: "高雄市",
    trade_date: "2026-10-22",
    source: "農業部漁產品交易行情",
    is_aquaculture: true
  };
  assert.equal(format.marketPriceText(data), "742.2 元／台斤");
  assert.equal(format.priceText(742.2), "742.2");
  assert.equal(format.priceText(200), "200");
  assert.equal(format.priceText(-1.25), "-1.3");
  assert.equal(format.priceText("200"), "200");
  assert.equal(format.priceText("abc"), "NaN");
  assert.equal(format.marketScopeText(data), "高雄市平均");
  assert.equal(format.marketScopeText({ scope: "national", region: "澎湖縣", price_per_taijin: 1 }), "全國平均");
  assert.equal(format.marketPriceText(null), "暫無行情");
  assert.equal(format.marketScopeText(null), "");
});
