/* 潮汐工具：CWA 資料、滿乾潮時間、缺金鑰／無資料／逾時與天氣邊界。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const openMeteo = require("../lib/conditions/open-meteo");
const cwaTide = require("../lib/conditions/cwa-tide");
const places = require("../lib/conditions/places");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

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

const TIDE_TEXT = "海況：浪高約 1.5 公尺，西南浪，浪週期 6 秒，海溫 27°C。\n" +
  "天氣多雲，26–31°C，降雨機率 40%。\n" +
  "潮汐：滿潮 09:12、21:30；乾潮 03:05、15:20。";

test("每個海域都有代表潮位站", function () {
  ["臺灣北部海面", "臺灣海峽北部", "臺灣海峽南部", "臺灣東北部海面",
    "臺灣東部海面", "臺灣東南部海面", "澎湖海面", "金門海面", "馬祖海面", "巴士海峽"]
    .forEach(function (area) {
      const station = places.tideStationForSea(area);
      assert.ok(station && station.location, area + " 缺少潮位站");
    });
  assert.equal(places.tideStationForSea("臺灣海峽南部").location, "高雄市鼓山區");
});

test("海況加入當日與明日滿乾潮，並使用對應潮位站", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  const sea = c.fakeOpenMeteo();
  const tide = c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("新北市外海（臺灣北部海面）" + TIDE_TEXT)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /滿潮 09:12/);
  const local = data.tool_results.local;
  assert.equal(local.tide.today.high.length, 2);
  assert.equal(local.tide.today.high[0].time, "09:12");
  assert.equal(local.tide.today.low[0].time, "03:05");
  assert.equal(local.tide.tomorrow.high[0].time, "10:20");
  assert.equal(local.errors.tide, null);
  assert.equal(sea.urls.length, 2);
  assert.equal(tide.urls.length, 1);
  const decoded = decodeURIComponent(tide.urls[0]);
  assert.match(decoded, /F-A0021-001/);
  assert.match(decoded, /Authorization=test-key/);
  assert.match(decoded, /locationName=基隆市中正區/);
});

test("缺少 CWA_API_KEY 時不呼叫潮汐，海況仍可用且標記潮汐暫無資料", async function () {
  const tide = c.fakeTide();
  c.fakeOpenMeteo();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("海況浪高 1.5 公尺，天氣多雲。\n潮汐暫無資料。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.tide, null);
  assert.equal(data.tool_results.local.errors.tide, "NOT_CONFIGURED");
  assert.equal(data.tool_results.local.marine.wave_height_m, 1.5);
  assert.equal(tide.urls.length, 0);
  assert.match(data.reply_text, /潮汐暫無資料/);
});

test("潮汐無資料或逾時時標記原因，不編造時間", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  let tide = c.fakeTide({ payload: { records: { location: [] } } });
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("海況浪高 1.5 公尺。\n潮汐暫無資料。")
  ]);
  let room = await h.createRoom(tokens.buyer);
  let message = await h.sendUser(room.id, "今天海況如何？");
  let data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.tide, null);
  assert.equal(data.tool_results.local.errors.tide, "NO_DATA");
  assert.equal(tide.urls.length, 2);

  h.reset({ CWA_API_KEY: "test-key" });
  c.fakeOpenMeteo();
  tide = c.fakeTide({ error: c.timeoutError() });
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("海況浪高 1.5 公尺。\n潮汐暫無資料。")
  ]);
  room = await h.createRoom(tokens.buyer);
  message = await h.sendUser(room.id, "今天海況如何？");
  data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.tide, null);
  assert.equal(data.tool_results.local.errors.tide, "UPSTREAM_TIMEOUT");
});

test("天氣問題不查潮汐，也不回傳 tide 欄位", async function () {
  h.reset({ CWA_API_KEY: "test-key" });
  const sea = c.fakeOpenMeteo();
  const tide = c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat("新北市今天多雲，現在 27°C。\n今天 26–31°C，降雨機率 40%，東南風 3 級。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天天氣如何？");

  const data = (await h.reply(room.id, message.id)).body.data;
  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.tide, undefined);
  assert.equal(sea.urls.length, 1);
  assert.equal(tide.urls.length, 0);
});
