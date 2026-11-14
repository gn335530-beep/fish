/* AI 回覆端點（基本）：權限、開關、CHAT 回應、模型與逾時設定、log 隱私。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const h = require("./ai-reply-helpers");

const CHAT = {
  intent: "CHAT",
  slots: {},
  reply_text: "吳郭魚肉質細緻，適合乾煎或清蒸。",
  sources: [],
  tool_results: {}
};

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset(); });

test("未登入、非參與者、交易房、訊息不屬於房間都回 4xx", async function () {
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "吳郭魚口感如何");
  const payload = { conversation_id: room.id, message_id: message.id, context: {} };

  const anonymous = await call("POST", "/api/ai/reply", { body: payload });
  assert.equal(anonymous.status, 401);

  const outsider = await call("POST", "/api/ai/reply", { token: tokens.third, body: payload });
  assert.equal(outsider.status, 403);

  const asked = await call("POST", "/api/deals/initiate-room", {
    token: tokens.buyer,
    body: { seller_id: 1 }
  });
  const dealRoom = asked.body.data.conversation;
  const dealMessage = await h.sendUser(dealRoom.id, "你好");
  const dealReply = await call("POST", "/api/ai/reply", {
    token: tokens.buyer,
    body: { conversation_id: dealRoom.id, message_id: dealMessage.id, context: {} }
  });
  assert.equal(dealReply.status, 409);
  assert.equal(dealReply.body.code, "NOT_ASSISTANT_ROOM");

  const otherRoom = await h.createRoom(tokens.buyer);
  const wrongRoom = await h.reply(otherRoom.id, message.id);
  assert.equal(wrongRoom.status, 404);
  assert.equal(wrongRoom.body.code, "MESSAGE_NOT_FOUND");
});

test("LLM_ENABLED 關閉時不呼叫 provider，回 LLM_DISABLED", async function () {
  h.reset({ LLM_ENABLED: false });
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");

  const result = await h.reply(room.id, message.id);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_DISABLED");
  assert.equal(result.body.data.retryable, false);
  assert.equal(h.calls.length, 0);
});

test("缺少 GEMINI_API_KEY 時不呼叫 provider，回 LLM_NOT_CONFIGURED", async function () {
  h.reset({ GEMINI_API_KEY: null });
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");

  const result = await h.reply(room.id, message.id);
  assert.equal(result.body.data.handled, false);
  assert.equal(result.body.data.error_code, "LLM_NOT_CONFIGURED");
  assert.equal(h.calls.length, 0);
});

test("CHAT 回傳結構化結果且不寫入任何訊息", async function () {
  h.useJson(CHAT);
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");
  const before = (await h.messages(room.id)).length;

  const result = await h.reply(room.id, message.id);
  const data = result.body.data;
  assert.equal(result.status, 200);
  assert.equal(data.handled, true);
  assert.equal(data.intent, "CHAT");
  assert.equal(data.reply_text, CHAT.reply_text);
  assert.deepEqual(data.slots, {});
  assert.deepEqual(data.sources, []);
  assert.deepEqual(data.tool_results, {});
  assert.equal(data.error_code, null);
  assert.equal(data.retryable, false);
  assert.equal((await h.messages(room.id)).length, before);
});

test("LLM_MODEL 可更換，一般回覆 timeout 預設 8 秒", async function () {
  h.reset({ LLM_MODEL: "gemini-custom" });
  h.useJson(CHAT);
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");

  await h.reply(room.id, message.id);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].model, "gemini-custom");
  assert.equal(h.calls[0].timeoutMs, 8000);
});

test("log 只記 metadata，不含訊息內容", async function () {
  h.useJson(CHAT);
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");

  const logs = [];
  const original = console.info;
  console.info = function () { logs.push(Array.prototype.join.call(arguments, " ")); };
  try {
    await h.reply(room.id, message.id);
  } finally {
    console.info = original;
  }

  const line = logs.find(function (entry) { return entry.indexOf("ai_reply") !== -1; });
  assert.ok(line, "應有 ai_reply log");
  assert.match(line, /"request_id":"[^"]+"/);
  assert.match(line, /"user_id":2/);
  assert.match(line, /"intent":"CHAT"/);
  assert.match(line, /"duration_ms":\d+/);
  assert.doesNotMatch(line, /吳郭魚|肉質|test-key|prompt/);
});
