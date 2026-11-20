/* 助手地區上下文：設定縣市、明確覆寫、缺縣市反問與暫存縣市。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { findById, patch } = require("../lib/store");
const regionStore = require("../lib/ai/region-store");
const localContext = require("../lib/ai/local-context");
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

test("目前日期以 Asia/Taipei 計算", function () {
  assert.equal(
    localContext.dateLine(Date.parse("2026-11-19T16:30:00Z")),
    "\n\n目前日期（Asia/Taipei）：2026-11-20。"
  );
});

function withoutCity() {
  patch("users", 2, { city: "" });
}

test("地區問題使用設定縣市，明確縣市優先；非地區問題不送縣市", async function () {
  h.useJson(CHAT);
  const room = await h.createRoom(tokens.buyer);

  let message = await h.sendUser(room.id, "今天有什麼新聞？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(h.calls[0].system, /新北市/);

  h.reset();
  h.useJson(CHAT);
  message = await h.sendUser(room.id, "花蓮今天有什麼新聞？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(h.calls[0].system, /花蓮縣/);
  assert.doesNotMatch(h.calls[0].system, /新北市/);

  h.reset();
  h.useJson(CHAT);
  message = await h.sendUser(room.id, "吳郭魚怎麼煎？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.doesNotMatch(h.calls[0].system, /新北市|花蓮縣/);
});

test("沒有縣市時先反問，回答只在目前對話暫存且不寫回設定", async function () {
  withoutCity();
  h.useJson(CHAT);
  const room = await h.createRoom(tokens.buyer);

  let message = await h.sendUser(room.id, "今天天氣如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "你所在的縣市是哪裡？");
  assert.equal(h.calls.length, 0);

  message = await h.sendUser(room.id, "我住高雄市三民區");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(regionStore.cityOf(room.id), "高雄市");
  assert.equal(findById("users", 2).city, "");

  h.reset();
  h.useJson(CHAT);
  message = await h.sendUser(room.id, "今天有什麼新聞？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(h.calls[0].system, /高雄市/);
  assert.doesNotMatch(h.calls[0].system, /三民區/);
});

test("暫存縣市按對話隔離，只回答縣市時給確認；明確指定不覆寫暫存", async function () {
  withoutCity();
  h.useJson(CHAT);
  const first = await h.createRoom(tokens.buyer);
  const second = await h.createRoom(tokens.buyer);

  let message = await h.sendUser(first.id, "今天天氣如何？");
  await h.reply(first.id, message.id);
  message = await h.sendUser(first.id, "高雄市");
  let data = (await h.reply(first.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /已記住你在高雄市/);

  h.reset();
  h.useJson(CHAT);
  message = await h.sendUser(second.id, "今天有什麼新聞？");
  data = (await h.reply(second.id, message.id)).body.data;
  assert.equal(data.reply_text, "你所在的縣市是哪裡？");
  assert.equal(h.calls.length, 0);

  message = await h.sendUser(second.id, "花蓮縣");
  await h.reply(second.id, message.id);
  h.reset();
  h.useJson(CHAT);
  message = await h.sendUser(second.id, "今天有什麼新聞？");
  await h.reply(second.id, message.id);
  assert.match(h.calls[0].system, /花蓮縣/);
  assert.doesNotMatch(h.calls[0].system, /高雄市/);

  h.reset();
  h.useJson(CHAT);
  message = await h.sendUser(first.id, "台南天氣如何？");
  await h.reply(first.id, message.id);
  assert.match(h.calls[0].system, /台南市/);
  message = await h.sendUser(first.id, "今天有什麼新聞？");
  await h.reply(first.id, message.id);
  assert.match(h.calls[1].system, /高雄市/);
  assert.doesNotMatch(h.calls[1].system, /台南市/);
});

test("暫存縣市有期限，刪除對話時清除", async function () {
  regionStore.rememberCity("conv_temp", "高雄市", 1000);
  assert.equal(regionStore.cityOf("conv_temp", 1000 + regionStore.TTL_MS - 1), "高雄市");
  assert.equal(regionStore.cityOf("conv_temp", 1000 + regionStore.TTL_MS), "");

  withoutCity();
  h.useJson(CHAT);
  const room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "今天天氣如何？");
  await h.reply(room.id, message.id);
  message = await h.sendUser(room.id, "高雄市");
  await h.reply(room.id, message.id);
  assert.equal(regionStore.cityOf(room.id), "高雄市");

  const deleted = await call("DELETE", "/api/conversations/" + room.id, { token: tokens.buyer });
  assert.equal(deleted.status, 200);
  assert.equal(regionStore.cityOf(room.id), "");
});

test("LLM 關閉時不反問也不建立暫存，維持靜默 fallback", async function () {
  h.reset({ LLM_ENABLED: false });
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_DISABLED");
  assert.equal(h.calls.length, 0);
  assert.equal(regionStore.cityOf(room.id), "");
});

test("非地區問題即使模型呼叫在地工具，也不帶入設定縣市", async function () {
  const upstream = c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("不該使用這段文字")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "吳郭魚怎麼煎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "你所在的縣市是哪裡？");
  assert.equal(upstream.urls.length, 0);
});

test("國外地點天氣不把設定縣市放進 prompt", async function () {
  h.reset({ LLM_WEB_SEARCH: true, TAVILY_API_KEY: "test" });
  h.useJson(CHAT);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "溫哥華天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.doesNotMatch(h.calls[0].system, /新北市/);
});
