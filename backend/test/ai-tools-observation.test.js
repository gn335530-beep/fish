/* 自動氣象站：觀測成功、選站、缺值、逾時與海況回歸。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { findById, patch } = require("../lib/store");
const openMeteo = require("../lib/conditions/open-meteo");
const regionStore = require("../lib/ai/region-store");
const c = require("./ai-conditions-helpers");

let buyerCity = "";

function obsStation(values) {
  const row = values || {};
  const info = row.geo || {};
  const weather = row.weather || {};
  return {
    StationName: row.name || "苓雅",
    StationId: row.id || "C0V710",
    ObsTime: { DateTime: row.observed_at || "2026-11-21T21:00:00+08:00" },
    GeoInfo: {
      Coordinates: [{
        CoordinateName: "WGS84",
        StationLatitude: String(info.lat === undefined ? 22.6273 : info.lat),
        StationLongitude: String(info.lon === undefined ? 120.3014 : info.lon)
      }],
      StationAltitude: String(info.altitude === undefined ? 10 : info.altitude),
      CountyName: info.county || "高雄市",
      TownName: ""
    },
    WeatherElement: {
      Weather: weather.text === undefined ? "多雲" : weather.text,
      WindDirection: String(weather.direction === undefined ? 223 : weather.direction),
      WindSpeed: String(weather.speed === undefined ? 2.3 : weather.speed),
      AirTemperature: String(weather.temperature === undefined ? 27 : weather.temperature),
      GustInfo: { PeakGustSpeed: String(weather.gust === undefined ? 5.5 : weather.gust) }
    }
  };
}

test.before(start);
test.after(stop);
test.beforeEach(function () {
  h.reset({ CWA_API_KEY: "test-key" });
  openMeteo.resetFetcher();
  regionStore.clear();
  buyerCity = findById("users", 2).city;
});
test.afterEach(function () {
  patch("users", 2, { city: buyerCity || "新北市" });
  openMeteo.resetFetcher();
  regionStore.clear();
});

async function ask(text, finalText) {
  h.useSequence([
    { tool_calls: [c.conditionsCall("weather")] },
    c.finalChat(finalText)
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, text);
  return (await h.reply(room.id, message.id)).body.data;
}

test("觀測成功時目前氣溫、現象、風與陣風優先使用觀測", async function () {
  c.fakeForecast({
    observation: {
      payload: c.observationPayload({ stations: [obsStation({
        weather: { temperature: 23.4, text: "有雨", direction: 180, speed: 5.5, gust: 9 }
      })] })
    }
  });
  const data = await ask("高雄天氣如何？", "高雄市現在 23.4°C，21:00 觀測。\n今天 26–31°C，降雨機率 40%。");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.match(data.reply_text, /23\.4/);
  assert.match(data.reply_text, /21:00/);
  const local = data.tool_results.local;
  assert.equal(local.weather.current_temperature_c, 23.4);
  assert.equal(local.weather.current_weather_text, "有雨");
  assert.equal(local.weather.current_wind_speed_kmh, 20);
  assert.equal(local.weather.current_wind_scale, 4);
  assert.equal(local.weather.current_wind_direction_text, "南");
  assert.equal(local.weather.current_wind_gust_kmh, 32);
  assert.equal(local.weather.current_wind_gust_scale, 5);
  assert.equal(local.observation.observed_at, "2026-11-21T21:00:00+08:00");
  assert.equal(local.observation_error, null);
});

test("觀測缺項時目前現象與風回退到預報", async function () {
  c.fakeForecast({
    observation: {
      payload: c.observationPayload({ stations: [obsStation({
        weather: { temperature: 25, text: "", direction: -99, speed: -99, gust: -99 }
      })] })
    }
  });
  const data = await ask("高雄天氣如何？", "資料已取得。");

  const local = data.tool_results.local;
  assert.equal(local.weather.current_temperature_c, 25);
  assert.equal(local.weather.current_weather_text, "多雲");
  assert.equal(local.weather.current_wind_speed_kmh, 14);
  assert.equal(local.weather.current_wind_direction_text, "東南");
  assert.equal(local.weather.current_wind_gust_kmh, null);
});

test("多測站時跳過 -99，選靠近縣市代表點且低海拔的測站", async function () {
  const stations = [
    obsStation({ name: "遠處低海拔", id: "C0A", geo: { lat: 23.1, altitude: 10 } }),
    obsStation({ name: "近處高山", id: "C0B", geo: { lat: 22.6373, altitude: 1000 } }),
    obsStation({ name: "近處低海拔", id: "C0C", geo: { lat: 22.6773, altitude: 50 } }),
    obsStation({ name: "缺溫度", id: "C0D", geo: { lat: 22.6273, altitude: 1 },
      weather: { temperature: -99 } })
  ];
  c.fakeForecast({ observation: { payload: c.observationPayload({ stations: stations }) } });
  const data = await ask("高雄天氣如何？", "資料已取得。");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.tool_results.local.observation.station_name, "近處低海拔");
});

test("無測站、溫度缺值、逾時或格式錯誤時仍回預報並標示目前氣溫暫無資料", async function () {
  const cases = [
    { payload: c.observationPayload({ stations: [] }), reason: /NO_DATA|NO_STATION/ },
    { payload: c.observationPayload({ stations: [obsStation({ weather: { temperature: -99 } })] }),
      reason: /NO_STATION/ },
    { error: c.timeoutError(), reason: /UPSTREAM_TIMEOUT/ },
    { payload: { records: {} }, reason: /NO_DATA/ }
  ];
  for (const observation of cases) {
    h.reset({ CWA_API_KEY: "test-key" });
    c.fakeForecast({ observation: observation });
    const data = await ask("高雄天氣如何？", "資料已取得。");

    assert.equal(data.handled, true, JSON.stringify(data));
    assert.match(data.reply_text, /目前氣溫暫無資料/);
    assert.equal(data.tool_results.local.weather.current_temperature_c, null);
    assert.equal(data.tool_results.local.weather.today.high_c, 31);
    assert.equal(data.tool_results.local.observation, null);
    assert.match(data.tool_results.local.observation_error, observation.reason);
  }
});

test("預報失敗時即使觀測成功也回查不到即時天氣", async function () {
  c.fakeForecast({ error: c.timeoutError() });
  const data = await ask("高雄天氣如何？", "資料已取得。");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.reply_text, "查不到即時天氣，請稍後再試。");
  assert.equal(data.tool_results.local.weather, null);
  assert.equal(data.tool_results.local.observation, undefined);
});

test("缺少 CWA_API_KEY 時不呼叫預報或觀測", async function () {
  h.reset();
  const state = c.fakeForecast();
  const data = await ask("高雄天氣如何？", "資料已取得。");

  assert.equal(data.reply_text, "查不到即時天氣，請稍後再試。");
  assert.equal(state.urls.length, 0);
  assert.equal(state.observation.urls.length, 0);
});

test("只有觀測失敗時來源卡只列天氣預報", async function () {
  c.fakeForecast({ observation: { error: c.timeoutError() } });
  const data = await ask("高雄天氣如何？有來源嗎？", "資料已取得。");

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(data.sources.length, 1);
  assert.match(data.sources[0].title, /中央氣象署天氣預報/);
});

test("海況仍使用 Open-Meteo 與 CWA 潮汐，不受觀測影響", async function () {
  const openMeteoState = c.fakeOpenMeteo();
  c.fakeTide();
  h.useSequence([
    { tool_calls: [c.conditionsCall("sea")] },
    c.finalChat("資料已取得。")
  ]);
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, "今天海況如何？");
  const data = (await h.reply(room.id, message.id)).body.data;

  const local = data.tool_results.local;
  assert.equal(local.mode, "sea");
  assert.ok(local.marine);
  assert.ok(local.weather);
  assert.ok(local.tide);
  assert.equal(local.observation, undefined);
  assert.equal(openMeteoState.urls.length, 2);
});
