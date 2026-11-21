/* 國外地點天氣：走 Tavily，不用台灣縣市天氣／海況／潮汐。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const { fakeTavily } = require("./ai-web-helpers");
const c = require("./ai-conditions-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset();
  web.resetFetcher();
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});
test.afterEach(function () {
  web.resetFetcher();
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});

test("東京天氣走 web_search，不用台灣海況或潮汐工具", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test", CWA_API_KEY: "test-key" });
  const tavily = fakeTavily([{ title: "東京天氣", url: "https://example.com/tokyo", content: "東京多雲 18 度" }]);
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "東京天氣" } }] },
    c.finalChat("東京今天多雲，氣溫 18°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "WEB");
  assert.equal(data.tool_results.local, undefined);
  assert.equal(tavily.calls.length, 1);
  assert.equal(upstream.urls.length, 0);
  assert.deepEqual(data.sources, []);
  assert.doesNotMatch(data.reply_text, /海況|潮汐|浪高/);
  assert.equal(h.calls[0].tools.some(function (tool) { return tool.name === "web_search"; }), true);
  assert.equal(h.calls[0].tools.some(function (tool) { return tool.name === "get_local_conditions"; }), false);
});

test("國外地點即使模型硬呼叫在地工具也不會執行", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test", CWA_API_KEY: "test-key" });
  fakeTavily([]);
  const upstream = c.fakeOpenMeteo();
  h.useSequence([{ tool_calls: [c.conditionsCall("weather")] }]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_INVALID_OUTPUT");
  assert.equal(upstream.urls.length, 0);
});

test("國外地點要求來源時由來源流程附 Tavily 來源", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  fakeTavily([{ title: "東京天氣", url: "https://example.com/tokyo", content: "東京多雲 18 度" }]);
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "東京天氣" } }] },
    c.finalChat("東京今天多雲，氣溫 18°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "WEB");
  assert.equal(data.sources.length, 1);
  assert.equal(data.sources[0].url, "https://example.com/tokyo");
});

test("網路搜尋停用時國外天氣直接說查不到，不呼叫模型", async function () {
  h.useJson(c.finalChat("東京多雲。"));
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到國外地點天氣，請稍後再試。");
  assert.equal(h.calls.length, 0);
});

test("網路查無結果時國外天氣明確說查不到，不猜測", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  fakeTavily([]);
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "東京天氣" } }] },
    c.finalChat("東京多雲，氣溫 18°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到國外地點天氣，請稍後再試。");
});

test("台灣縣市仍走在地天氣工具，不受國外路由影響", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄今天多雲，現在 27°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.city, "高雄市");
  assert.equal(upstream.urls.length, 1);
  assert.equal(h.calls[0].toolConfig.functionCallingConfig.allowedFunctionNames[0],
    "get_local_conditions");
});
