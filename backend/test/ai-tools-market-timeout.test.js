/* 行情工具（逾時）：整體期限、上游中止與代碼字典同步。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { seedCatalog, resetCatalog } = require("./market-catalog-helpers");
const { raw, resetMarket, upstream } = require("./market-test-helpers");

function marketCall() {
  return { name: "get_market_price", args: { species_name: "石斑魚", region: "高雄市" } };
}

function seedGrouper() {
  seedCatalog([raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚" })]);
}

async function askRoom() {
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "石斑現在行情如何");
  return { room: room, message: message };
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset();
  resetMarket();
  seedGrouper();
});
test.afterEach(function () { resetMarket(); });

test("行情上游逾時回 LLM_TIMEOUT，端點在期限內 fallback", async function () {
  h.reset({ LLM_TIMEOUT_MS: 80 });
  const state = { calls: 0 };
  upstream.setFetcher(async function () {
    state.calls += 1;
    return new Promise(function () {});
  });
  h.useSequence([{ tool_calls: [marketCall()] }]);
  const run = await askRoom();

  const started = Date.now();
  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  const elapsed = Date.now() - started;
  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_TIMEOUT");
  assert.equal(data.retryable, false);
  assert.equal(state.calls, 1);
  assert.ok(elapsed < 1000, "elapsed " + elapsed);
});

test("期限用完後不再呼叫行情上游", async function () {
  h.reset({ LLM_TIMEOUT_MS: 30 });
  const state = { calls: 0 };
  upstream.setFetcher(async function () {
    state.calls += 1;
    return { ok: true, json: async function () { return []; } };
  });
  h.useSequence([async function () {
    await new Promise(function (resolve) { setTimeout(resolve, 100); });
    return { tool_calls: [marketCall()] };
  }]);
  const run = await askRoom();

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_TIMEOUT");
  assert.equal(state.calls, 0);
});

test("代碼字典同步逾時也回 LLM_TIMEOUT", async function () {
  h.reset({ LLM_TIMEOUT_MS: 80 });
  resetCatalog();
  const state = { calls: 0 };
  upstream.setFetcher(async function () {
    state.calls += 1;
    return new Promise(function () {});
  });
  h.useSequence([{ tool_calls: [marketCall()] }]);
  const run = await askRoom();

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_TIMEOUT");
  assert.equal(state.calls, 1);
});
