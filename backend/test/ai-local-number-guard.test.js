/* 在地數字防護：只接受使用者訊息或當輪工具結果支持的數字、日期與潮汐時間。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

const SUPPORTED = "西南浪，浪高 1.5 公尺，海溫 27°C，降雨機率 40%，東南風 3 級、陣風 20 公里，未來 7 天多雲。\n" +
  "今天 2026-11-20 多雲。\n滿潮 09:12。";

function safeWeatherPayload() {
  const payload = c.weatherPayload();
  payload.daily.wind_speed_10m_max = [14, 20, 10, 6, 6, 18, 12];
  payload.daily.wind_direction_10m_dominant = [135, 180, 45, 45, 0, 225, 315];
  return payload;
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ CWA_API_KEY: "test-key" });
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
  c.fakeOpenMeteo({ weather: safeWeatherPayload() });
  c.fakeTide();
});
test.afterEach(function () {
  openMeteo.resetFetcher();
  cwaTide.resetFetcher();
  regionStore.clear();
});

async function seaReply(finalText, question) {
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat(finalText)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, question || "今天海況如何？");
  return (await h.reply(room.id, message.id)).body.data;
}

test("工具支持的氣象、海況、潮汐數字與日期可正常顯示", async function () {
  const data = await seaReply(SUPPORTED);

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /1\.5/);
  assert.match(data.reply_text, /09:12/);
  assert.match(data.reply_text, /2026-11-20/);
});

test("未支持的氣溫、降雨機率、風級與浪高被擋下", async function () {
  for (const text of ["今天 99 度。", "降雨機率 90%。", "東南風 8 級。", "浪高 2 公尺。"]) {
    const data = await seaReply(text);
    assert.equal(data.handled, false, text + " " + JSON.stringify(data));
    assert.equal(data.error_code, "LLM_GUARD_REJECTED", text);
    assert.equal(data.reply_text, null, text);
  }
});

test("看似存在但組合錯誤的潮汐時間被擋下", async function () {
  const data = await seaReply("滿潮 12:09。");

  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("工具沒有支持的日期被擋下，即使其中的數字出現在別處", async function () {
  const data = await seaReply("2026-11-27 多雲。");

  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("浪向不能在工具沒有支持時自行改寫", async function () {
  const data = await seaReply("東北浪，浪高 1.5 公尺。");

  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("日期與潮汐時間同一句時必須是同一筆潮汐事件", async function () {
  const data = await seaReply(c.taipeiDate(0) + " 滿潮 10:20。");

  assert.equal(data.handled, false, JSON.stringify(data));
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("使用者訊息中的數字也可作為依據", async function () {
  const data = await seaReply("明天最高約 31 度，不會到 35 度。", "今天海況如何？會到 35 度嗎？");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /35/);
});

test("一般知識的數字防護維持不變", async function () {
  h.useJson({
    intent: "CHAT",
    slots: {},
    reply_text: "建議中火乾煎 3 分鐘，吳郭魚通常可長到 1 公斤。",
    sources: [],
    tool_results: {}
  });
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "吳郭魚怎麼煎？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
});
