/* 模型自行判斷在地問題：口語天氣／海況由模型呼叫在地工具並用設定縣市。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { findById, patch } = require("../lib/store");
const openMeteo = require("../lib/conditions/open-meteo");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

let buyerCity = "";

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset();
  openMeteo.resetFetcher();
  regionStore.clear();
  buyerCity = findById("users", 2).city;
});
test.afterEach(function () {
  patch("users", 2, { city: buyerCity || "新北市" });
  openMeteo.resetFetcher();
  regionStore.clear();
});

const SEA_TEXT = "海況：浪高約 1.5 公尺，西南浪，浪週期 6 秒，海溫 27°C；" +
  "東南風 3 級、陣風 4 級。天氣多雲，26–31°C，降雨機率 40%。";

test("口語海況由模型自行呼叫在地工具並用設定縣市", async function () {
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("新北市外海（臺灣北部海面）" + SEA_TEXT)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海上情況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /臺灣北部海面/);
  assert.equal(data.tool_results.local.city, "新北市");
  assert.equal(data.tool_results.local.sea_area, "臺灣北部海面");
  assert.match(upstream.urls[0], /marine-api\.open-meteo\.com/);
});

test("口語海況沒設定縣市時反問海域", async function () {
  patch("users", 2, { city: "" });
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("不該採用這段文字")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海上情況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "你想問哪個海域？");
});

test("口語天氣由模型自行呼叫在地工具並用設定縣市", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  const upstream = c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("新北市今天多雲，現在 27°C。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天外面狀況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.mode, "weather");
  assert.equal(data.tool_results.local.city, "新北市");
  assert.doesNotMatch(data.reply_text, /浪|海況|潮汐/);
  assert.equal(upstream.urls.length, 1);
});

test("口語海況訊息中的明確縣市優先於設定縣市", async function () {
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea", { city: "高雄市" })] },
    c.finalChat("高雄市外海（臺灣海峽南部）" + SEA_TEXT)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄海上情況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.city, "高雄市");
  assert.equal(data.tool_results.local.sea_area, "臺灣海峽南部");
});

test("口語海況訊息中的明確海域優先於縣市預設海域", async function () {
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea", { sea_area: "臺灣海峽南部" })] },
    c.finalChat("臺灣海峽南部" + SEA_TEXT)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "臺灣海峽南部海上情況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.sea_area, "臺灣海峽南部");
});
