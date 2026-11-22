/* 預填工具：LLM_PREFILL_TOOL 開啟時，在地天氣／海況直接執行工具，省一次模型決策回合。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset();
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});
test.afterEach(function () {
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});

test("開啟時天氣直接執行工具，只呼叫模型一次", async function () {
  h.reset({ CWA_API_KEY: "test-key", LLM_PREFILL_TOOL: "true" });
  const forecast = c.fakeForecast();
  c.fakeObservation();
  h.useJson(c.finalOutput("高雄市今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。"));

  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.mode, "weather");
  assert.equal(data.tool_results.local.city, "高雄市");
  assert.ok(data.tool_results.local.weather, "應有天氣資料");
  assert.equal(h.calls.length, 1, "只應有一次模型呼叫（省掉工具決策回合）");
  assert.equal(forecast.urls.length, 1);
});

test("開啟時海況直接執行工具，含潮汐", async function () {
  h.reset({ CWA_API_KEY: "test-key", LLM_PREFILL_TOOL: "true" });
  c.fakeOpenMeteo();
  const tide = c.fakeTide();
  h.useJson(c.finalOutput("海況：浪高約 1.5 公尺，西南浪，浪週期 6 秒，海溫 27°C。\n" +
    "天氣多雲，26–31°C，降雨機率 40%。\n潮汐：滿潮 09:12、21:30；乾潮 03:05、15:20。"));

  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.mode, "sea");
  assert.ok(data.tool_results.local.tide, "應有潮汐資料");
  assert.equal(h.calls.length, 1, "只應有一次模型呼叫");
  assert.equal(tide.urls.length, 1);
});

test("關閉時維持兩次呼叫（模型先決定工具）", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeForecast();
  c.fakeObservation();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);

  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(h.calls.length, 2, "關閉時仍是工具決策＋回覆兩次呼叫");
});
