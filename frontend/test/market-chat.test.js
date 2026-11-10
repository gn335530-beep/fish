/* 對話行情問答：行情以卡片回應、官方代碼字典、多候選追問、查無與無交易。 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  service, apiError, quote, setMarket, resetFixture, marketCalls, textOf, cardOf
} from "./market-chat-fixtures.js";

const handleText = service.handleText;

test.beforeEach(resetFixture);

test("土魠魚用個人檔案縣市查價，回覆行情卡而非文字", async function () {
  const result = await handleText(null, "土魠魚現在多少錢", { city: "高雄市" });
  const card = cardOf(result);
  assert.ok(card, "應有行情卡");
  assert.equal(card.species_name, "土魠");
  assert.equal(card.official_name, "土魠");
  assert.equal(card.price_per_taijin, 31.4);
  assert.equal(card.scope, "city");
  assert.equal(card.region, "高雄市");
  assert.equal(card.trade_date, "2026-10-22");
  assert.equal(card.history.length, 7);
  assert.equal(card.history_30.length, 30);
  assert.equal(card.high, 59);
  assert.equal(card.low, 53);
  assert.equal(card.high_30, 59);
  assert.equal(card.low_30, 30);
  assert.equal(result.replies.length, 1);
  assert.equal(textOf(result), "");
  assert.equal(marketCalls().length, 1);
  const url = decodeURIComponent(marketCalls()[0]);
  assert.match(url, /q=土魠魚/);
  assert.match(url, /include=history/);
  assert.match(url, /days=30/);
});

test("吳郭魚與鮭魚等不在舊清單的魚種也能查詢", async function () {
  setMarket(quote({ species_code: 1051, official_name: "吳郭魚" }));
  const first = await handleText(null, "吳郭魚多少錢", { city: "高雄市" });
  assert.equal(cardOf(first).species_name, "吳郭魚");
  assert.equal(cardOf(first).species_code, 1051);

  setMarket(quote({ species_code: 1021, official_name: "鮭魚" }));
  const second = await handleText(null, "鮭魚多少錢", { city: "高雄市" });
  assert.equal(cardOf(second).species_name, "鮭魚");
  assert.equal(cardOf(second).species_code, 1021);
});

test("石斑回傳候選不自動選第一個，下一句可選擇並完成查詢", async function () {
  setMarket(apiError({
    code: "AMBIGUOUS_SPECIES",
    message: "魚種名稱對到多個代碼",
    candidates: [
      { species_code: 2201, official_name: "石斑魚" },
      { species_code: 2202, official_name: "龍膽石斑" }
    ]
  }, 409));

  const asked = await handleText(null, "石斑多少錢", { city: "高雄市" });
  const text = textOf(asked);
  assert.match(text, /搜尋到多種石斑，請問是哪一種石斑？請選擇：/);
  assert.match(text, /石斑魚/);
  assert.match(text, /龍膽石斑/);
  assert.doesNotMatch(text, /2201|2202/);
  assert.equal(asked.context.market_pending.candidates.length, 2);

  setMarket(quote({ species_code: 2202, official_name: "龍膽石斑" }));
  const picked = await handleText(asked.context, "龍膽石斑", { city: "高雄市" });
  const card = cardOf(picked);
  assert.equal(card.species_name, "龍膽石斑");
  assert.equal(card.species_code, 2202);
  assert.equal(textOf(picked), "");
  assert.equal(picked.context.market_pending, null);
  assert.match(decodeURIComponent(marketCalls().pop()), /code=2202/);
});

test("查無魚種代碼時回明確訊息，不出現價格數字", async function () {
  setMarket(apiError({ code: "SPECIES_NOT_FOUND", message: "查無此魚種代碼" }, 404));
  const text = textOf(await handleText(null, "白鯧現在多少錢", { city: "高雄市" }));
  assert.match(text, /查無此魚種代碼/);
  assert.match(text, /白鯧/);
  assert.doesNotMatch(text, /元／|大約|平均價/);
});

test("有代碼但無交易時回暫無行情", async function () {
  setMarket({ found: false, reason: "NO_TRADE_DATA", species_code: 2141, official_name: "土魠" });
  const text = textOf(await handleText(null, "土魠魚多少錢", { city: "高雄市" }));
  assert.equal(text, "暫無行情");
  assert.doesNotMatch(text, /\d|元／/);
});

test("上游失敗時不編造數字", async function () {
  setMarket(new Error("network"));
  const text = textOf(await handleText(null, "土魠魚多少錢", { city: "高雄市" }));
  assert.equal(text, "暫無行情");
});

test("沒有指定魚種時請使用者補充，不呼叫行情 API", async function () {
  const text = textOf(await handleText(null, "今天行情如何", { city: "高雄市" }));
  assert.match(text, /請問想查哪一種魚的行情/);
  assert.equal(marketCalls().length, 0);
});

test("未知魚種前有縣市時，不會把縣市當成魚名", async function () {
  setMarket(apiError({ code: "SPECIES_NOT_FOUND", message: "查無此魚種代碼" }, 404));
  const text = textOf(await handleText(null, "澎湖縣白鯧現在多少錢", { city: "高雄市" }));
  assert.match(text, /查無此魚種代碼/);
  assert.doesNotMatch(text, /澎湖縣白鯧/);
});

test("字典不可用時回明確訊息", async function () {
  setMarket(apiError({ code: "CATALOG_UNAVAILABLE", message: "尚未同步" }, 503));
  const text = textOf(await handleText(null, "土魠魚多少錢", { city: "高雄市" }));
  assert.match(text, /無法取得官方魚種代碼/);
  assert.doesNotMatch(text, /元／/);
});
