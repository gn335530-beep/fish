/* 在天氣工具：Open-Meteo、明確縣市、時間範圍、逾時與無資料。 */

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

test("台灣縣市天氣使用 Open-Meteo，回覆含現象、氣溫、降雨與風，並保留換行", async function () {
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲，現在 27°C。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "CHAT");
  assert.match(data.reply_text, /\n/);
  assert.match(data.reply_text, /27/);

  const local = data.tool_results.local;
  assert.equal(local.mode, "weather");
  assert.equal(local.city, "高雄市");
  assert.equal(local.weather.current_temperature_c, 27);
  assert.equal(local.weather.current_weather_text, "多雲");
  assert.equal(local.weather.today.high_c, 31);
  assert.equal(local.weather.today.low_c, 26);
  assert.equal(local.weather.today.rain_probability, 40);
  assert.equal(local.weather.today.wind_direction_text, "東南");
  assert.equal(local.weather.days.length, 7);
  assert.equal(local.weather.days[1].high_c, 30);
  assert.equal(local.weather.marine, undefined);

  assert.equal(upstream.urls.length, 1);
  assert.match(upstream.urls[0], /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(upstream.urls[0], /latitude=22\.6273/);
  assert.match(upstream.urls[0], /timezone=Asia%2FTaipei/);
  assert.equal(h.calls[0].toolConfig.functionCallingConfig.allowedFunctionNames[0],
    "get_local_conditions");
  const modelView = h.calls[1].tool_rounds[0].results[0].result;
  assert.equal(modelView.weather.current_temperature_c, 27);
});

test("訊息中的明確縣市優先於設定縣市，並使用該縣市座標", async function () {
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("花蓮縣今天多雲，現在 27°C。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "花蓮今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.city, "花蓮縣");
  assert.match(h.calls[0].system, /花蓮縣/);
  assert.doesNotMatch(h.calls[0].system, /新北市/);
  assert.match(upstream.urls[0], /latitude=23\.9911/);
});

test("沒有縣市時天氣問題先反問，不呼叫 Open-Meteo", async function () {
  patch("users", 2, { city: "" });
  const state = c.fakeOpenMeteo();
  h.useJson({ intent: "CHAT", slots: {}, reply_text: "不該呼叫", sources: [], tool_results: {} });
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "你所在的縣市是哪裡？");
  assert.equal(h.calls.length, 0);
  assert.equal(state.urls.length, 0);
});

test("天氣上游逾時或無資料時明確說查不到，不產生數字", async function () {
  let state = c.fakeOpenMeteo({ weatherError: c.timeoutError() });
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("今天氣溫 99 度。")
  ]);
  let room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "今天天氣如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到即時天氣，請稍後再試。");
  assert.doesNotMatch(data.reply_text, /\d/);
  assert.equal(state.urls.length, 1);

  h.reset();
  state = c.fakeOpenMeteo({ weather: { timezone: "Asia/Taipei" } });
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("今天氣溫 99 度。")
  ]);
  room = await h.createRoom(tokens.buyer);
  message = await h.sendUser(room.id, "今天天氣如何？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到即時天氣，請稍後再試。");
  assert.equal(state.urls.length, 1);
});
