/* 行情工具：官方平均價、行情卡資料、無資料、數字防護、工具上限與 log。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { seedCatalog } = require("./market-catalog-helpers");
const { raw, useRows, resetMarket, upstream } = require("./market-test-helpers");

function finalChat(text) {
  return {
    text: JSON.stringify({
      intent: "CHAT",
      slots: {},
      reply_text: text,
      sources: [],
      tool_results: {}
    })
  };
}

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

test("行情工具使用官方平均價，回傳行情資料並附在 CHAT", async function () {
  useRows([raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚", "市場名稱": "高雄", "平均價": 100 })]);
  h.useSequence([
    { tool_calls: [marketCall()] },
    finalChat("石斑魚平均價每台斤 60 元（2026-10-22）。")
  ]);
  const run = await askRoom();

  const result = await h.reply(run.room.id, run.message.id);
  const data = result.body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.intent, "CHAT");
  assert.equal(data.tool_results.market.found, true);
  assert.equal(data.tool_results.market.price_per_kg, 100);
  assert.equal(data.tool_results.market.price_per_taijin, 60);
  assert.equal(data.tool_results.market.trade_date, "2026-10-22");
  assert.equal(data.tool_results.market.source, "農業部漁產品交易行情");
  assert.equal(data.sources.length, 0);
  assert.ok(data.tool_results.market.history.length >= 1);
  assert.equal(data.tool_results.market.quality, "official");
  assert.match(data.tool_results.market.fetched_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(data.tool_results.market.source_url, /^https:/);

  assert.deepEqual(h.calls[0].tools.map(function (tool) { return tool.name; }),
    ["get_market_price", "search_products"]);
  const modelMarket = h.calls[1].tool_turns[0].result;
  assert.equal(modelMarket.price_per_taijin, 60);
  assert.equal(modelMarket.trade_date, "2026-10-22");
  assert.equal(modelMarket.region, "高雄市");
  assert.equal(modelMarket.history, undefined);
  assert.equal(modelMarket.quality, undefined);
  assert.equal(modelMarket.fetched_at, undefined);
  assert.equal(modelMarket.source_url, undefined);
  assert.equal(modelMarket.scope, undefined);
});

test("查無行情時模型只說暫無行情，不得出現價格數字", async function () {
  useRows([]);
  h.useSequence([
    { tool_calls: [marketCall()] },
    finalChat("暫無行情")
  ]);
  const run = await askRoom();

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, true);
  assert.equal(data.tool_results.market.found, false);
  assert.match(data.reply_text, /暫無行情/);
  assert.doesNotMatch(data.reply_text, /\d/);

  h.useSequence([
    { tool_calls: [marketCall()] },
    finalChat("暫無行情，大約剩 2 尾。")
  ]);
  const second = await h.reply(run.room.id, run.message.id);
  assert.equal(second.body.data.handled, false);
  assert.equal(second.body.data.error_code, "LLM_GUARD_REJECTED");

  h.useSequence([
    { tool_calls: [marketCall()] },
    finalChat("目前沒有行情資料。")
  ]);
  const third = await h.reply(run.room.id, run.message.id);
  assert.equal(third.body.data.handled, false);
  assert.equal(third.body.data.error_code, "LLM_GUARD_REJECTED");
});

test("模型自行產生不存在的行情數字時被 guard 拒絕", async function () {
  useRows([raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚", "市場名稱": "高雄", "平均價": 100 })]);
  h.useSequence([
    { tool_calls: [marketCall()] },
    finalChat("石斑魚每台斤 999 元，今天最好賣。")
  ]);
  const run = await askRoom();

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("單輪超過 2 次工具呼叫時停止並 fallback", async function () {
  const upstreamState = useRows([raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚", "市場名稱": "高雄", "平均價": 100 })]);
  h.useSequence([{ tool_calls: [marketCall(), marketCall(), marketCall()] }]);
  const run = await askRoom();

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
  assert.equal(upstreamState.calls, 2);
});

test("官方行情上游失敗時回 LLM_UPSTREAM_ERROR 並 fallback", async function () {
  upstream.setFetcher(async function () { throw new Error("down"); });
  h.useSequence([{ tool_calls: [marketCall()] }]);
  const run = await askRoom();

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_UPSTREAM_ERROR");
});

test("log 記錄工具名稱、耗時與錯誤碼，不記工具結果", async function () {
  useRows([raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚", "市場名稱": "高雄", "平均價": 100 })]);
  h.useSequence([
    { tool_calls: [marketCall()] },
    finalChat("石斑魚平均價每台斤 60 元。")
  ]);
  const run = await askRoom();

  const logs = [];
  const original = console.info;
  console.info = function () { logs.push(Array.prototype.join.call(arguments, " ")); };
  try {
    await h.reply(run.room.id, run.message.id);
  } finally {
    console.info = original;
  }

  const line = logs.find(function (entry) { return entry.indexOf("ai_reply") !== -1; });
  assert.match(line, /"name":"get_market_price"/);
  assert.match(line, /"duration_ms":\d+/);
  assert.match(line, /"error_code":null/);
  assert.doesNotMatch(line, /石斑魚|price_per_taijin|農業部/);
});
