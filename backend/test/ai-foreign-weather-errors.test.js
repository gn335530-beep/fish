/* 國外地點天氣：Tavily 逾時、上游錯誤、無來源提示與可重試配額錯誤。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const web = require("../lib/ai/tools/web");
const { fakeTavily } = require("./ai-web-helpers");
const c = require("./ai-conditions-helpers");

function webCall() {
  return { tool_calls: [{ name: "web_search", args: { query: "東京天氣" } }] };
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ LLM_WEB_SEARCH: "true", TAVILY_API_KEY: "tvly-test" });
  web.resetFetcher();
});
test.afterEach(function () { web.resetFetcher(); });

test("Tavily 逾時時國外天氣回查不到，不呼叫模型產生替代答案", async function () {
  const tavily = fakeTavily([], { error: c.timeoutError() });
  h.useSequence([webCall()]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "CHAT");
  assert.equal(data.reply_text, "查不到國外地點天氣，請稍後再試。");
  assert.equal(data.error_code, null);
  assert.equal(data.retryable, false);
  assert.deepEqual(data.sources, []);
  assert.equal(tavily.calls.length, 1);
  assert.equal(h.calls.length, 1);
});

test("Tavily 上游錯誤時國外天氣回查不到", async function () {
  fakeTavily([], { status: 500 });
  h.useSequence([webCall()]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "CHAT");
  assert.equal(data.reply_text, "查不到國外地點天氣，請稍後再試。");
  assert.equal(data.error_code, null);
});

test("國外天氣逾時且要求來源時附無來源提示，sources 為空陣列", async function () {
  fakeTavily([], { error: c.timeoutError() });
  h.useSequence([webCall()]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "東京天氣如何？有連結嗎？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到國外地點天氣，請稍後再試。\n目前沒有可提供的來源。");
  assert.deepEqual(data.sources, []);
});

test("國外天氣遇到 Tavily 配額或速率限制時仍可重試", async function () {
  fakeTavily([], { status: 432 });
  h.useSequence([webCall()]);
  let room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "東京天氣如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "SEARCH_QUOTA_EXHAUSTED");
  assert.equal(data.retryable, true);
  assert.equal(data.reply_text, null);

  fakeTavily([], { status: 429 });
  h.useSequence([webCall()]);
  room = await h.createRoom(tokens.buyer);
  message = await h.sendUser(room.id, "東京天氣如何？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "SEARCH_RATE_LIMITED");
  assert.equal(data.retryable, true);
});
