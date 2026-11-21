/* 地區分類：平台優先、一般新聞不反問、在地新聞仍反問與缺縣市反問。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { findById, patch } = require("../lib/store");
const regionStore = require("../lib/ai/region-store");
const openMeteo = require("../lib/conditions/open-meteo");
const c = require("./ai-conditions-helpers");

const CHAT = {
  intent: "CHAT",
  slots: {},
  reply_text: "收到。",
  sources: [],
  tool_results: {}
};

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

function withoutCity() {
  patch("users", 2, { city: "" });
}

test("平台問題優先於地區分類，不反問也不帶入縣市", async function () {
  withoutCity();
  const room = await h.createRoom(tokens.buyer);

  for (const text of ["最新行情", "我要賣魚，今天天氣如何？", "最新新聞行情"]) {
    h.reset();
    h.useJson(CHAT);
    const message = await h.sendUser(room.id, text);
    const data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.reply_text, CHAT.reply_text);
    assert.equal(h.calls.length, 1);
    assert.doesNotMatch(h.calls[0].system, /你所在的縣市是哪裡/);
  }
});

test("平台問題即使模型呼叫在地工具，也不反問縣市", async function () {
  withoutCity();
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("不該使用這段文字", { intent: "MARKET" })
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "最新行情");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "MARKET");
  assert.equal(data.reply_text, null);
  assert.equal(upstream.urls.length, 0);
});

test("帶明確縣市的非地區問題若模型呼叫在地工具仍安全 fallback", async function () {
  const upstream = c.fakeOpenMeteo();
  const room = await h.createRoom(tokens.buyer);

  for (const text of ["台南吳郭魚怎麼煎？", "花蓮今天有什麼新聞？"]) {
    h.useSequence([
      { tool_calls: [c.conditionsCall("weather")] },
      c.finalChat("不該使用這段文字")
    ]);
    const message = await h.sendUser(room.id, text);
    const data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, false, JSON.stringify(data));
    assert.equal(data.error_code, "LLM_GUARD_REJECTED");
    assert.equal(data.reply_text, null);
  }
  assert.equal(upstream.urls.length, 0);
});

test("一般新聞沒有縣市時不反問，並走網路搜尋", async function () {
  withoutCity();
  const room = await h.createRoom(tokens.buyer);

  for (const text of ["NBA 新聞", "今天有什麼新聞？"]) {
    h.reset({ LLM_WEB_SEARCH: true, TAVILY_API_KEY: "test" });
    h.useJson(CHAT);
    const message = await h.sendUser(room.id, text);
    const data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.reply_text, CHAT.reply_text);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.calls[0].toolConfig, {
      functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["web_search"] }
    });
  }
});

test("在地新聞或地方新聞沒有縣市時仍反問", async function () {
  withoutCity();
  const room = await h.createRoom(tokens.buyer);

  for (const text of ["在地新聞", "地方新聞"]) {
    h.reset();
    h.useJson(CHAT);
    const message = await h.sendUser(room.id, text);
    const data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.reply_text, "你所在的縣市是哪裡？");
    assert.equal(h.calls.length, 0);
  }
});

test("在地新聞有暫存縣市時帶入縣市並走網路搜尋", async function () {
  withoutCity();
  const room = await h.createRoom(tokens.buyer);
  regionStore.rememberCity(room.id, "高雄市");
  h.reset({ LLM_WEB_SEARCH: true, TAVILY_API_KEY: "test" });
  h.useJson(CHAT);
  const message = await h.sendUser(room.id, "在地新聞");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(h.calls[0].system, /高雄市/);
  assert.deepEqual(h.calls[0].toolConfig, {
    functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["web_search"] }
  });
});

test("天氣、海況、潮汐與釣魚建議沒有縣市時仍反問", async function () {
  withoutCity();
  const room = await h.createRoom(tokens.buyer);

  for (const text of ["今天天氣如何？", "今天海況如何？", "今天潮汐如何？", "適合釣魚嗎？"]) {
    h.reset();
    h.useJson(CHAT);
    const message = await h.sendUser(room.id, text);
    const data = (await h.reply(room.id, message.id)).body.data;
    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.reply_text, "你所在的縣市是哪裡？", text);
    assert.equal(h.calls.length, 0);
  }
});
