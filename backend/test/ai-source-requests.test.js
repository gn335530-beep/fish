/* 來源請求：同一則或下一則要求時重查工具，最多 3 個合法來源。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

const RESULTS = [
  { title: "中央氣象署", url: "https://www.cwa.gov.tw/a", content: "多雲" },
  { title: "新聞一", url: "https://example.com/1", content: "新聞" },
  { title: "新聞二", url: "https://example.com/2", content: "新聞" },
  { title: "新聞三", url: "https://example.com/3", content: "新聞" },
  { title: "惡意", url: "javascript:alert(1)", content: "bad" }
];

function fakeTavily(results) {
  const state = { calls: [], queries: [] };
  web.setFetcher(async function (url, options) {
    state.calls.push(url);
    state.queries.push(JSON.parse(options.body).query);
    return {
      ok: true,
      status: 200,
      json: async function () { return { results: results === undefined ? RESULTS : results }; }
    };
  });
  return state;
}

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

test("同一則天氣問題要求來源時附 Open-Meteo 來源", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄今天多雲，現在 27°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 1);
  assert.match(data.sources[0].title, /Open-Meteo/);
  assert.match(data.sources[0].url, /^https:/);
  assert.doesNotMatch(data.reply_text, /https?:\/\//);
});

test("同一則海況問題要求來源時附海況與潮汐來源，最多 3 個", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("浪高 1.5 公尺。\n潮汐：滿潮 09:12、21:30；乾潮 03:05、15:20。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 3);
  assert.ok(data.sources.some(function (row) { return row.title.indexOf("中央氣象署") !== -1; }));
});

test("同一則網路問題要求來源時附 Tavily 來源，最多 3 個", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  fakeTavily();
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "高雄今天新聞" } }] },
    c.finalChat("今天高雄有多則新聞。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄今天有什麼新聞？有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 3);
  assert.match(data.sources[0].url, /^https:/);
  assert.doesNotMatch(data.sources.map(function (row) { return row.url; }).join(" "), /javascript/);
});

test("下一句只要求來源時重查上一則工具，不呼叫模型", async function () {
  h.reset();
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄今天多雲，現在 27°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "高雄天氣如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.deepEqual(data.sources, []);
  const calls = h.calls.length;

  message = await h.sendUser(room.id, "有連結嗎？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 1);
  assert.equal(h.calls.length, calls);
  assert.equal(upstream.urls.length, 2);
});

test("下一句要求網路來源時重跑 Tavily 查詢", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  const tavily = fakeTavily();
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "高雄今天新聞" } }] },
    c.finalChat("今天高雄有多則新聞。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "高雄今天有什麼新聞？");
  await h.reply(room.id, message.id);

  message = await h.sendUser(room.id, "資料哪來？");
  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 3);
  assert.equal(tavily.calls.length, 2);
});

test("沒有可提供來源時明確說沒有，平台意圖不附來源", async function () {
  h.useJson({
    intent: "SELL",
    slots: { fish_species: "花枝" },
    reply_text: null,
    sources: [],
    tool_results: {}
  });
  const room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "有連結嗎？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.deepEqual(data.sources, []);
  assert.match(data.reply_text, /沒有可提供的來源/);

  message = await h.sendUser(room.id, "我要賣花枝，有來源嗎？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "SELL");
  assert.deepEqual(data.sources, []);

  message = await h.sendUser(room.id, "我要賣花枝");
  await h.reply(room.id, message.id);
  message = await h.sendUser(room.id, "有連結嗎？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.deepEqual(data.sources, []);
  assert.match(data.reply_text, /沒有可提供的來源/);
});

test("網路查無結果時回覆明確說沒有來源，不編造連結", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  fakeTavily([]);
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "高雄今天新聞" } }] },
    c.finalChat("目前查不到相關新聞。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄今天有什麼新聞？有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.deepEqual(data.sources, []);
  assert.match(data.reply_text, /沒有可提供的來源/);
});
