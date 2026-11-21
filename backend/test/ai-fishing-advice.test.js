/* 釣魚建議：完整海況包、資料不足不判斷、絕對用語與單純天氣／海況邊界。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

const ADVICE = "以目前浪高約 1.5 公尺、陣風 4 級與午後陣雨來看，近岸釣魚需注意風浪；整體偏適合。";

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset();
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});
test.afterEach(function () {
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});

async function ask(text, finalText) {
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, text);
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat(finalText)
  ]);
  const data = (await h.reply(room.id, message.id)).body.data;
  return data;
}

test("適合釣魚使用完整海況包並可給一般建議", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide();
  const data = await ask("今天適合釣魚嗎？", ADVICE);

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /偏適合/);
  assert.equal(data.tool_results.local.mode, "sea");
  assert.ok(data.tool_results.local.marine);
  assert.ok(data.tool_results.local.weather);
  assert.ok(data.tool_results.local.tide);
  assert.match(h.calls[0].system, /偏適合/);
});

test("資料不足時只說缺少什麼，不做適合或不適合的判斷", async function () {
  c.fakeOpenMeteo();
  c.fakeTide();
  let data = await ask("今天適合釣魚嗎？", "偏適合釣魚。");
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "潮汐暫無資料，先不做適合釣魚的判斷。");
  assert.doesNotMatch(data.reply_text, /偏適合|偏不適合/);

  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo({ marineError: c.timeoutError() });
  c.fakeTide();
  data = await ask("今天適合釣魚嗎？", "偏適合釣魚。");
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "海況暫無資料，先不做適合釣魚的判斷。");
});

test("模型使用保證安全等絕對說法時丟棄回覆", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide();
  const data = await ask("今天適合釣魚嗎？", "保證安全，一定可以，偏適合釣魚。");

  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("單純天氣或海況不會自動變成適合釣魚的建議", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide();
  const room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "今天天氣如何？");
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("新北市今天多雲，現在 27°C。\n今天 26–31°C，降雨機率 40%。")
  ]);
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.doesNotMatch(data.reply_text, /適合釣魚|偏適合/);

  message = await h.sendUser(room.id, "今天海況如何？");
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("海況浪高 1.5 公尺，偏適合釣魚。")
  ]);
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("不附加固定的自行評估免責句", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide();
  const data = await ask("今天適合釣魚嗎？", "偏適合釣魚，請自行評估。");

  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});
