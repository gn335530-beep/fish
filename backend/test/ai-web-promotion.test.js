/* WEB 升級：模型自稱 CHAT 但成功使用 web_search 時，後端改回 WEB 並附來源。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");

const RESULTS = [
  { title: "中央氣象署", url: "https://www.cwa.gov.tw/a", content: "多雲短暫雨" },
  { title: "新聞一", url: "https://example.com/1", content: "天氣" },
  { title: "新聞二", url: "https://example.com/2", content: "天氣" },
  { title: "新聞三", url: "https://example.com/3", content: "天氣" }
];

function output(overrides) {
  return {
    text: JSON.stringify(Object.assign({
      intent: "CHAT",
      slots: {},
      reply_text: "今天多雲短暫雨。",
      sources: [],
      tool_results: {}
    }, overrides || {}))
  };
}

function webCall() {
  return { name: "web_search", args: { query: "今天高雄天氣" } };
}

async function askAndReply(text) {
  h.useSequence([output()]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, text || "今天高雄天氣如何");
  return (await h.reply(room.id, message.id)).body.data;
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  web.setFetcher(async function () {
    return {
      ok: true,
      status: 200,
      json: async function () { return { results: RESULTS }; }
    };
  });
});
test.afterEach(function () { web.resetFetcher(); });

test("模型回 CHAT 但成功使用 web_search 時升級為 WEB 並附最多 3 個來源", async function () {
  h.useSequence([{ tool_calls: [webCall()] }, output()]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天高雄天氣如何");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "WEB");
  assert.equal(data.sources.length, 3);
  assert.equal(data.sources[0].title, "中央氣象署");
  assert.match(data.sources[0].url, /^https:/);
});

test("同一輪兩次 web_search 時，先前的合法來源仍保留", async function () {
  let calls = 0;
  web.setFetcher(async function () {
    calls += 1;
    return {
      ok: true,
      status: 200,
      json: async function () { return { results: calls === 1 ? RESULTS : [] }; }
    };
  });
  h.useSequence([
    { tool_calls: [webCall(), webCall()] },
    output()
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天高雄天氣如何");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "WEB");
  assert.equal(data.sources.length, 3);
});

test("沒有網路結果的 CHAT 維持 CHAT 且不帶來源", async function () {
  const data = await askAndReply("吳郭魚口感如何");
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "CHAT");
  assert.deepEqual(data.sources, []);
});

test("平台意圖即使使用 web_search 也不升級、不附來源", async function () {
  h.useSequence([{ tool_calls: [webCall()] }, output({ intent: "MARKET", reply_text: null })]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天石斑行情如何");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "MARKET");
  assert.deepEqual(data.sources, []);
});
