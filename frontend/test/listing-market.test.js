/* 上架行情卡：非價格欄位齊了先查行情，未知魚種不呼叫 API，查無不擋定價。 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  service, setMarket, resetFixture, marketCalls, textOf, cardOf, quote
} from "./listing-market-fixtures.js";

test.beforeEach(resetFixture);

test("非價格欄位齊了先送行情卡，再問售價", async function () {
  const started = await service.handleText(
    null,
    "我要賣花枝 3公斤 2尾 放血冰鎮",
    { city: "高雄市" }
  );
  const result = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  const card = cardOf(result);
  assert.ok(card, "應有行情卡");
  assert.equal(card.price_per_taijin, 200);
  assert.equal(card.weight_kg, 3);
  assert.equal(card.weight_taijin, 5);
  assert.equal(card.estimated_total, 1000);
  assert.equal(card.history.length, 7);
  assert.equal(card.history_30.length, 30);
  assert.equal(card.high, 209);
  assert.equal(card.low, 203);
  assert.equal(card.high_30, 209);
  assert.equal(card.low_30, 180);
  assert.equal(card.scope, "city");
  assert.equal(card.region, "高雄市");
  assert.equal(card.trade_date, "2026-10-22");
  assert.equal(card.source, "農業部漁產品交易行情");
  assert.match(textOf(result), /每台斤價格或整批價格/);
  const urls = marketCalls().map(function (path) { return decodeURIComponent(path); });
  assert.ok(urls.some(function (path) { return /include=history/.test(path) && /days=30/.test(path); }));
  assert.ok(urls.some(function (path) { return /include=history/.test(path) && /days=7/.test(path); }));
});

test("已提供售價時行情卡後直接顯示草稿，不重問價格", async function () {
  const started = await service.handleText(
    null,
    "我要賣花枝 3公斤 2尾 放血冰鎮 每台斤 200",
    { city: "高雄市" }
  );
  const result = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  assert.ok(cardOf(result));
  assert.doesNotMatch(textOf(result), /多少錢|每台斤價格或整批價格/);
  assert.ok(result.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

test("補完照片後只出一次行情卡", async function () {
  const started = await service.handleText(
    null,
    "我要賣花枝 3公斤 2尾 放血冰鎮 每台斤 200",
    { city: "高雄市" }
  );
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  assert.doesNotMatch(textOf(photographed), /多少錢/);
  assert.ok(photographed.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
  assert.equal(photographed.context.market_quoted, true);
  assert.equal(photographed.replies.filter(function (reply) {
    return reply.card && reply.card.type === "market_quote";
  }).length, 1);
});

test("未知魚種不呼叫行情 API，顯示暫無行情仍可定價", async function () {
  const started = await service.handleText(
    null,
    "我要賣鮭魚 3公斤 2尾 放血冰鎮",
    { city: "高雄市" }
  );
  const result = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  assert.equal(marketCalls().length, 0);
  assert.match(textOf(result), /暫無行情/);
  assert.match(textOf(result), /每台斤價格或整批價格/);
  assert.equal(cardOf(result), null);
});

test("查無行情時說目前沒有，不編造數字", async function () {
  setMarket({ found: false, reason: "NO_TRADE_DATA" });
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", { city: "高雄市" });
  const result = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  assert.match(textOf(result), /目前沒有花枝的行情。/);
  assert.doesNotMatch(textOf(result), /\d|元／/);
  assert.match(textOf(result), /每台斤價格或整批價格/);
});

test("上游失敗時說暫時無法取得，仍可繼續定價", async function () {
  setMarket({ found: false, reason: "UPSTREAM_UNAVAILABLE" });
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", { city: "高雄市" });
  const result = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  assert.match(textOf(result), /暫時無法取得花枝的行情。/);
  assert.match(textOf(result), /每台斤價格或整批價格/);
});

test("保留未知的 context 欄位，法規確認狀態不被清掉", async function () {
  const context = {
    mode: "idle",
    draft: null,
    last_cards: [],
    pending_sale_text: "我要賣花枝",
    awaiting_consent: true
  };
  const result = await service.handleText(context, "我要賣花枝 3公斤 2尾 放血冰鎮", { city: "高雄市" });
  assert.equal(result.context.pending_sale_text, "我要賣花枝");
  assert.equal(result.context.awaiting_consent, true);
});

test("行情回應缺少 history 時仍顯示卡片，不編造走勢", async function () {
  setMarket(quote({ history: [] }));
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", { city: "高雄市" });
  const result = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  const card = cardOf(result);
  assert.equal(card.history.length, 0);
  assert.equal(card.high, null);
  assert.equal(card.low, null);
});
