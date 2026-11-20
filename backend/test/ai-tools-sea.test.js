/* 海況工具：縣市→海域、明確海域、內陸反問、部分資料與逾時。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { findById, patch } = require("../lib/store");
const openMeteo = require("../lib/conditions/open-meteo");
const places = require("../lib/conditions/places");
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
  "東南風 4 級、陣風 6 級。天氣多雲，26–31°C，降雨機率 40%。";

test("海域別名取最長匹配，避免東北部被當成北部", function () {
  assert.equal(places.seaAreaInText("東北部海面浪況"), "臺灣東北部海面");
  assert.equal(places.seaAreaInText("東南部海面浪況"), "臺灣東南部海面");
  assert.equal(places.seaAreaInText("北部海面浪況"), "臺灣北部海面");
});

test("海況使用縣市主要海域的 Marine 與 Weather，回覆含浪況、風與天氣", async function () {
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("新北市外海（臺灣北部海面）" + SEA_TEXT)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /臺灣北部海面/);
  const local = data.tool_results.local;
  assert.equal(local.mode, "sea");
  assert.equal(local.city, "新北市");
  assert.equal(local.sea_area, "臺灣北部海面");
  assert.equal(local.marine.wave_height_m, 1.5);
  assert.equal(local.marine.wave_direction_text, "西南");
  assert.equal(local.marine.wave_period_s, 6);
  assert.equal(local.marine.sea_temperature_c, 27);
  assert.equal(local.weather.current_wind_scale, 3);
  assert.equal(local.weather.current_wind_gust_scale, 4);
  assert.equal(local.weather.today.rain_probability, 40);
  assert.equal(local.weather.days.length, 7);
  assert.equal(upstream.urls.length, 2);
  assert.match(upstream.urls[0], /marine-api\.open-meteo\.com/);
  assert.match(upstream.urls[1], /api\.open-meteo\.com\/v1\/forecast/);
  assert.equal(h.calls[0].toolConfig.functionCallingConfig.allowedFunctionNames[0],
    "get_local_conditions");
  assert.match(h.calls[0].system, /新北市/);
});

test("訊息中的明確海域優先，沒有縣市也能回答海況", async function () {
  patch("users", 2, { city: "" });
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("臺灣海峽南部" + SEA_TEXT)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "臺灣海峽南部浪況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.sea_area, "臺灣海峽南部");
  assert.equal(data.tool_results.local.city, null);
  assert.match(h.calls[0].system, /臺灣海峽南部/);
  assert.match(upstream.urls[0], /latitude=22\.8/);
  assert.match(upstream.urls[0], /longitude=119\.8/);
});

test("內陸縣市或無法對應海域時先反問，不呼叫模型或 Open-Meteo", async function () {
  patch("users", 2, { city: "台北市" });
  const upstream = c.fakeOpenMeteo();
  h.useJson({ intent: "CHAT", slots: {}, reply_text: "不該呼叫", sources: [], tool_results: {} });
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "你想問哪個海域？");
  assert.equal(h.calls.length, 0);
  assert.equal(upstream.urls.length, 0);
});

test("部分資料缺失時逐項說明；兩邊都失敗時明確說查不到", async function () {
  let state = c.fakeOpenMeteo({ marineError: c.timeoutError() });
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("海況暫無資料。天氣多雲，26–31°C，降雨機率 40%。")
  ]);
  let room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "今天海況如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.marine, null);
  assert.equal(data.tool_results.local.weather.current_weather_text, "多雲");
  assert.equal(data.tool_results.local.errors.marine, "UPSTREAM_TIMEOUT");
  assert.match(data.reply_text, /海況暫無資料/);

  h.reset();
  state = c.fakeOpenMeteo({ weatherError: c.timeoutError() });
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("天氣暫無資料。浪高約 1.5 公尺，西南浪，浪週期 6 秒，海溫 27°C。")
  ]);
  room = await h.createRoom(tokens.buyer);
  message = await h.sendUser(room.id, "今天海況如何？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.weather, null);
  assert.equal(data.tool_results.local.marine.wave_height_m, 1.5);
  assert.match(data.reply_text, /天氣暫無資料/);

  h.reset();
  state = c.fakeOpenMeteo({ marineError: c.timeoutError(), weatherError: c.timeoutError() });
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("不該採用這段文字")
  ]);
  room = await h.createRoom(tokens.buyer);
  message = await h.sendUser(room.id, "今天海況如何？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到海況與天氣，請稍後再試。");
  assert.equal(state.urls.length, 2);
});

test("海況工具存在時，天氣問題仍只查天氣、不回海況", async function () {
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("新北市今天多雲，現在 27°C。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.mode, "weather");
  assert.equal(data.tool_results.local.marine, undefined);
  assert.equal(upstream.urls.length, 1);
  assert.doesNotMatch(upstream.urls[0], /marine-api/);
  assert.doesNotMatch(data.reply_text, /浪|海況|潮汐/);
});
