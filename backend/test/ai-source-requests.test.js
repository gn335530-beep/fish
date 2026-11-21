/* 來源請求：同一則或下一則要求時重查工具，最多 3 個合法來源。 */

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

const RESULTS = [
  { title: "中央氣象署", url: "https://www.cwa.gov.tw/a", content: "多雲" },
  { title: "新聞一", url: "https://example.com/1", content: "新聞" },
  { title: "新聞二", url: "https://example.com/2", content: "新聞" },
  { title: "新聞三", url: "https://example.com/3", content: "新聞" },
  { title: "惡意", url: "javascript:alert(1)", content: "bad" }
];

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
  fakeTavily(RESULTS);
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
  for (const text of ["這則的來源", "請給我來源"]) {
    message = await h.sendUser(room.id, text);
    data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, true, text + " " + JSON.stringify(data));
    assert.deepEqual(data.sources, []);
    assert.match(data.reply_text, /沒有可提供的來源/);
  }
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
