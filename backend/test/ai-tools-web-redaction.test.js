/* 網路工具（遮蔽）：Tavily 只收到遮蔽後的單次查詢。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");

function finalOutput() {
  return {
    text: JSON.stringify({
      intent: "WEB",
      slots: {},
      reply_text: "今天多雲短暫雨。",
      sources: [],
      tool_results: {}
    })
  };
}

function webCall(query) {
  return { name: "web_search", args: { query: query } };
}

function fakeTavily() {
  const state = { bodies: [] };
  web.setFetcher(async function (url, options) {
    state.bodies.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async function () {
        return { results: [{ title: "氣象", url: "https://example.com/weather", content: "多雲" }] };
      }
    };
  });
  return state;
}

async function askRoom() {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "今天天氣如何");
  return { room: room, message: message };
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  web.resetFetcher();
});
test.afterEach(function () { web.resetFetcher(); });

test("Tavily 查詢不含個資，也不含被誤遮的一般文字", async function () {
  const tavily = fakeTavily();
  h.useSequence([
    {
      tool_calls: [webCall(
        "台北市區的網路很慢，查今天天氣 +886912345678、+886-2-12345678、" +
        "(02)12345678、037-123456，我家在台北市大安區龍門里忠孝東路四段 1 號、" +
        "頭份市中正路12號"
      )]
    },
    finalOutput()
  ]);
  const run = await askRoom();

  await h.reply(run.room.id, run.message.id);
  const body = tavily.bodies[0];
  assert.match(body.query, /台北市區的網路很慢/);
  assert.match(body.query, /\[已遮蔽\]/);
  assert.doesNotMatch(body.query,
    /\+886912345678|\+886-2-12345678|\(02\)12345678|037-123456|龍門里|忠孝東路|頭份市中正路/);
});
