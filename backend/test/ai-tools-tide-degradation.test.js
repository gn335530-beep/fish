/* 潮汐降級：模型漏寫時後端補上，已有時不重複，回覆長度與無資料原因一致。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const places = require("../lib/conditions/places");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

const TIDE_TEXT = "潮汐暫無資料";
const OMITTED = "海況浪高 1.5 公尺，天氣多雲。";

function count(text, word) {
  return String(text || "").split(word).length - 1;
}

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

async function seaReply(finalText) {
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat(finalText)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");
  return (await h.reply(room.id, message.id)).body.data;
}

test("缺少 CWA 金鑰且模型漏寫時，後端補上潮汐暫無資料", async function () {
  const tide = c.fakeTide();
  c.fakeOpenMeteo();
  const data = await seaReply(OMITTED);

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.tide, null);
  assert.equal(data.tool_results.local.errors.tide, "NOT_CONFIGURED");
  assert.ok(data.tool_results.local.marine);
  assert.ok(data.tool_results.local.weather);
  assert.equal(count(data.reply_text, TIDE_TEXT), 1);
  assert.doesNotMatch(data.reply_text, /\d{1,2}:\d{2}/);
  assert.equal(tide.urls.length, 0);
});

test("潮汐逾時且模型漏寫時，後端補上潮汐暫無資料", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  c.fakeTide({ error: c.timeoutError() });
  const data = await seaReply(OMITTED);

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.errors.tide, "UPSTREAM_TIMEOUT");
  assert.equal(count(data.reply_text, TIDE_TEXT), 1);
  assert.doesNotMatch(data.reply_text, /\d{1,2}:\d{2}/);
});

test("潮汐無資料或格式錯誤且模型漏寫時，後端補上潮汐暫無資料", async function () {
  for (const payload of [{ records: { location: [] } }, {}]) {
    h.reset({ CWA_API_KEY: "test-key" });
    c.fakeOpenMeteo();
    c.fakeTide({ payload: payload });
    const data = await seaReply(OMITTED);

    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.tool_results.local.tide, null);
    assert.equal(data.tool_results.local.errors.tide, "NO_DATA");
    assert.equal(count(data.reply_text, TIDE_TEXT), 1);
  }
});

test("沒有代表潮位站時也走同一降級", async function () {
  const original = places.tideStationForSea;
  places.tideStationForSea = function () { return null; };
  try {
    h.reset({ CWA_API_KEY: "test-key" });
    c.fakeOpenMeteo();
    const data = await seaReply(OMITTED);
    assert.equal(data.handled, true, JSON.stringify(data));
    assert.equal(data.tool_results.local.tide, null);
    assert.equal(data.tool_results.local.errors.tide, "NO_STATION");
    assert.equal(count(data.reply_text, TIDE_TEXT), 1);
  } finally {
    places.tideStationForSea = original;
  }
});

test("模型已寫潮汐暫無資料時不重複追加", async function () {
  c.fakeOpenMeteo();
  const data = await seaReply(OMITTED + "\n" + TIDE_TEXT + "。");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(count(data.reply_text, TIDE_TEXT), 1);
});

test("追加提示後仍遵守回覆長度上限並保留提示", async function () {
  c.fakeOpenMeteo();
  const data = await seaReply("字".repeat(498));

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text.length <= 500, true);
  assert.equal(count(data.reply_text, TIDE_TEXT), 1);
});

test("海況與天氣都查不到時仍標記潮汐暫無資料", async function () {
  c.fakeOpenMeteo({ marineError: c.timeoutError(), weatherError: c.timeoutError() });
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("不該採用這段文字")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /查不到海況與天氣/);
  assert.equal(count(data.reply_text, TIDE_TEXT), 1);
});
