/* 天氣工具：中央氣象署 F-D0047-091、明確縣市、時間範圍、逾時與缺金鑰。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { findById, patch } = require("../lib/store");
const cwaForecast = require("../lib/conditions/cwa-forecast");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

let buyerCity = "";

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ CWA_API_KEY: "test-key" });
  cwaForecast.resetFetcher();
  regionStore.clear();
  buyerCity = findById("users", 2).city;
});
test.afterEach(function () {
  patch("users", 2, { city: buyerCity || "新北市" });
  cwaForecast.resetFetcher();
  regionStore.clear();
});

test("台灣縣市天氣使用中央氣象署預報，回覆含今日高低溫、降雨與風", async function () {
  const upstream = c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "CHAT");
  assert.match(data.reply_text, /\n/);
  assert.match(data.reply_text, /26–31/);

  const local = data.tool_results.local;
  assert.equal(local.mode, "weather");
  assert.equal(local.city, "高雄市");
  assert.equal(local.weather.current_temperature_c, null);
  assert.equal(local.weather.current_weather_text, "多雲");
  assert.equal(local.weather.today.high_c, 31);
  assert.equal(local.weather.today.low_c, 26);
  assert.equal(local.weather.today.rain_probability, 40);
  assert.equal(local.weather.today.wind_direction_text, "東南");
  assert.equal(local.weather.today.wind_scale, 3);
  assert.equal(local.weather.days.length, 7);
  assert.equal(local.weather.days[1].high_c, 30);
  assert.equal(local.weather.marine, undefined);

  assert.equal(upstream.urls.length, 1);
  assert.match(upstream.urls[0], /F-D0047-091/);
  assert.match(upstream.urls[0], /LocationName=%E9%AB%98%E9%9B%84%E5%B8%82/);
  assert.match(h.calls[0].system, /目前日期（Asia\/Taipei）：\d{4}-\d{2}-\d{2}/);
  const modelView = h.calls[1].tool_rounds[0].results[0].result;
  assert.equal(modelView.weather.current_temperature_c, null);
});

test("目前氣溫欄位為 null 時，後端保證標示目前氣溫暫無資料", async function () {
  c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /目前氣溫暫無資料/);
  assert.equal(data.tool_results.local.weather.current_temperature_c, null);
});

test("模型已寫目前氣溫暫無資料時不重複追加", async function () {
  c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲。\n目前氣溫暫無資料。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal((data.reply_text.match(/目前氣溫暫無資料/g) || []).length, 1);
});

test("訊息中的明確縣市優先於設定縣市，並以縣市名稱查詢", async function () {
  const upstream = c.fakeForecast({ city: "花蓮縣" });
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("花蓮縣今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "花蓮今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.city, "花蓮縣");
  assert.match(h.calls[0].system, /花蓮縣/);
  assert.doesNotMatch(h.calls[0].system, /新北市/);
  assert.match(upstream.urls[0], /LocationName=%E8%8A%B1%E8%93%AE%E7%B8%A3/);
});

test("沒有縣市時天氣問題先反問，不呼叫 CWA", async function () {
  patch("users", 2, { city: "" });
  const state = c.fakeForecast();
  h.useJson({ intent: "CHAT", slots: {}, reply_text: "不該呼叫", sources: [], tool_results: {} });
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "你所在的縣市是哪裡？");
  assert.equal(h.calls.length, 0);
  assert.equal(state.urls.length, 0);
});

test("預報逾時、5xx 或格式錯誤時說查不到，不呼叫 Open-Meteo", async function () {
  const openMeteo = require("../lib/conditions/open-meteo");
  for (const options of [
    { error: c.timeoutError() },
    { error: Object.assign(new Error("bad"), { reason: "UPSTREAM_UNAVAILABLE" }) },
    { payload: { records: {} } }
  ]) {
    h.reset({ CWA_API_KEY: "test-key" });
    const sea = { urls: [] };
    openMeteo.setFetcher(async function (url) {
      sea.urls.push(url);
      throw new Error("Open-Meteo must not be called");
    });
    const state = c.fakeForecast(options);
    h.useSequence([
      { tool_calls: [c.conditionsCall("weather")] },
      c.finalChat("今天氣溫 99 度。")
    ]);
    const room = await h.createRoom(tokens.buyer);
    const message = await h.sendUser(room.id, "高雄天氣如何？");
    const data = (await h.reply(room.id, message.id)).body.data;

    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.reply_text, "查不到即時天氣，請稍後再試。");
    assert.doesNotMatch(data.reply_text, /\d/);
    assert.equal(state.urls.length, 1);
    assert.equal(sea.urls.length, 0);
  }
  openMeteo.resetFetcher();
});

test("缺少 CWA_API_KEY 時說查不到，不呼叫任何氣象端點", async function () {
  h.reset();
  const openMeteo = require("../lib/conditions/open-meteo");
  const state = c.fakeForecast();
  const sea = { urls: [] };
  openMeteo.setFetcher(async function (url) {
    sea.urls.push(url);
    throw new Error("Open-Meteo must not be called");
  });
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("今天氣溫 99 度。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到即時天氣，請稍後再試。");
  assert.equal(state.urls.length, 0);
  assert.equal(sea.urls.length, 0);
  openMeteo.resetFetcher();
});

test("要求來源時天氣來源卡列中央氣象署天氣預報", async function () {
  c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 1);
  assert.match(data.sources[0].title, /中央氣象署/);
  assert.match(data.sources[0].title, /天氣預報/);
  assert.match(data.sources[0].url, /^https:/);
  assert.doesNotMatch(data.reply_text, /https?:\/\//);
});
