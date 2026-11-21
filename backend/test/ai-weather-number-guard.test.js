/* 天氣回覆的在地數字：只接受當輪工具支持的氣溫、降雨機率與風級。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ CWA_API_KEY: "test-key" });
  regionStore.clear();
});
test.afterEach(function () {
  regionStore.clear();
});

async function weatherReply(finalText) {
  c.fakeForecast();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat(finalText)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "高雄天氣如何？");
  return (await h.reply(room.id, message.id)).body.data;
}

test("工具支持的氣溫、降雨機率與風級可正常顯示", async function () {
  const data = await weatherReply("高雄市今天多雲。\n今天 26–31°C，降雨機率 40%，東南風 3 級。");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /26–31/);
  assert.match(data.reply_text, /40%/);
  assert.match(data.reply_text, /3 級/);
});

test("模型自行產生的 99°C、90% 與 8 級被擋下", async function () {
  for (const text of ["高雄今天 99°C。", "降雨機率 90%。", "東南風 8 級。"]) {
    const data = await weatherReply(text);
    assert.equal(data.handled, false, text + " " + JSON.stringify(data));
    assert.equal(data.error_code, "LLM_GUARD_REJECTED", text);
    assert.equal(data.reply_text, null, text);
  }
});
