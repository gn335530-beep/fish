/* 來源請求（下一句）：重查上一則工具、商品工具不被劫持、網路來源重跑。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const { create } = require("./product-helpers");
const { fakeTavily } = require("./ai-web-helpers");
const c = require("./ai-conditions-helpers");

const RESULTS = [
  { title: "中央氣象署", url: "https://www.cwa.gov.tw/a", content: "多雲" },
  { title: "新聞一", url: "https://example.com/1", content: "新聞" },
  { title: "新聞二", url: "https://example.com/2", content: "新聞" },
  { title: "新聞三", url: "https://example.com/3", content: "新聞" }
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

test("下一句只要求來源時重查上一則工具，不呼叫模型", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  const upstream = c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄今天多雲，現在 27°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "高雄天氣如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.deepEqual(data.sources, []);
  const calls = h.calls.length;

  for (const text of [
    "有連結嗎？", "引用來源", "來源是哪個網站？", "這則的來源",
    "查證", "請給我來源", "原始來源", "給我看連結"
  ]) {
    message = await h.sendUser(room.id, text);
    data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, true, text + " " + JSON.stringify(data));
    assert.equal(data.sources.length, 1, text);
    assert.equal(h.calls.length, calls, text);
  }
  assert.equal(upstream.urls.length, 9);
});

test("下一句要求網路來源時重跑 Tavily 查詢", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  const tavily = fakeTavily(RESULTS);
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

test("商品推薦要求來源時仍使用商品工具，不被來源流程改成網路搜尋", async function () {
  await create({
    fish_species: "來源測試魚",
    quantity: 1,
    price: 100,
    region: "新北市",
    photo_url: "/uploads/source-test.jpg"
  });
  h.useSequence([
    { tool_calls: [{ name: "search_products", args: { species: "來源測試魚" } }] },
    c.finalChat("找到 1 筆來源測試魚。", { intent: "PRODUCT_RECOMMEND" })
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "推薦來源測試魚，有來源嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "PRODUCT_RECOMMEND");
  assert.equal(data.tool_results.products.length, 1);
  assert.deepEqual(data.sources, []);
  assert.match(data.reply_text, /沒有可提供的來源/);
});
