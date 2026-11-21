/* 在地模式：後端依問題類型決定天氣或海況，模型不能把天氣題改成海況題。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ CWA_API_KEY: "test-key" });
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});
test.afterEach(function () {
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});

test("天氣問題誤傳海況模式時，工具仍只查天氣", async function () {
  const upstream = c.fakeOpenMeteo();
  c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("高雄今天多雲，現在 27°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.mode, "weather");
  assert.equal(data.tool_results.local.marine, undefined);
  assert.equal(data.tool_results.local.tide, undefined);
  assert.equal(upstream.urls.length, 1);
  assert.doesNotMatch(upstream.urls[0], /marine-api/);
  assert.doesNotMatch(data.reply_text, /浪|海況|潮汐|滿潮|乾潮|海溫/);
});

test("天氣回覆混入海況文字時安全 fallback", async function () {
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("今天天氣不錯，海況也很好。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("天氣問題即使沒有工具結果，也不能出現海況或潮汐文字", async function () {
  for (const text of ["高雄明天浪高 2 公尺。", "今天漲潮時海邊風大。"]) {
    h.useSequence([c.finalChat(text)]);
    const room = await h.createRoom(tokens.buyer);
    const message = await h.sendUser(room.id, "高雄天氣如何？");
    const data = (await h.reply(room.id, message.id)).body.data;

    assert.equal(data.handled, false, text + " " + JSON.stringify(data));
    assert.equal(data.error_code, "LLM_GUARD_REJECTED", text);
  }
});

test("天氣用語中的熱浪不誤擋", async function () {
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("熱浪來襲，高雄今天多雲，現在 27°C。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
});

test("海況、潮汐與釣魚建議誤傳天氣模式時，仍回完整海況包", async function () {
  const cases = ["今天海況如何？", "今天潮汐幾點？", "今天適合釣魚嗎？"];
  for (const text of cases) {
    c.fakeOpenMeteo();
    c.fakeTide();
    h.useSequence([
      { tool_calls: [c.conditionsCall("weather")] },
      c.finalChat("資料已取得。")
    ]);
    const room = await h.createRoom(tokens.buyer);
    const message = await h.sendUser(room.id, text);
    const data = (await h.reply(room.id, message.id)).body.data;

    assert.equal(data.handled, true, text + " " + JSON.stringify(data));
    assert.equal(data.tool_results.local.mode, "sea", text);
    assert.ok(data.tool_results.local.marine, text);
    assert.ok(data.tool_results.local.weather, text);
    assert.ok(data.tool_results.local.tide, text);
  }
});

test("沒有在地模式時，才允許模型選擇天氣或海況模式", async function () {
  c.fakeOpenMeteo();
  c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("資料已取得。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄市");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.mode, "sea");
  assert.ok(data.tool_results.local.marine);
});
