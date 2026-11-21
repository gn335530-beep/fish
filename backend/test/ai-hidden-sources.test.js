/* 來源預設隱藏：WEB、天氣與海況都不回 sources，回覆文字中的 URL 一律移除。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

function fakeTavily() {
  web.setFetcher(async function () {
    return {
      ok: true,
      status: 200,
      json: async function () {
        return {
          results: [
            { title: "中央氣象署", url: "https://www.cwa.gov.tw/a", content: "多雲" },
            { title: "新聞", url: "https://example.com/b", content: "天氣" }
          ]
        };
      }
    };
  });
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

test("一般網路回答不顯示來源卡，文字中的 URL 一律移除", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  fakeTavily();
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "高雄今天新聞" } }] },
    c.finalChat("今天多雲。\n參考 https://example.com/a 與 http://example.com/b 。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄今天有什麼新聞？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "WEB");
  assert.deepEqual(data.sources, []);
  assert.doesNotMatch(data.reply_text, /https?:\/\//);
  assert.match(data.reply_text, /今天多雲/);
});

test("天氣回答不顯示來源卡，也不保留模型自填的網址", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("高雄市今天多雲，現在 27°C。\n資料：https://example.com/weather")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.deepEqual(data.sources, []);
  assert.doesNotMatch(data.reply_text, /https?:\/\//);
});

test("海況回答不顯示來源卡，也不保留模型自填的網址", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("浪高 1.5 公尺，海溫 27°C。\n來源 https://example.com/sea")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.deepEqual(data.sources, []);
  assert.doesNotMatch(data.reply_text, /https?:\/\//);
});

test("平台回答即使是 WEB 工具回合也不附來源", async function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  fakeTavily();
  h.useSequence([
    { tool_calls: [{ name: "web_search", args: { query: "石斑行情" } }] },
    c.finalChat(null, { intent: "MARKET" })
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "石斑現在行情如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "MARKET");
  assert.deepEqual(data.sources, []);
});
