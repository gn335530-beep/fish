/* CWA 測試共用：假 F-D0047-091 預報 payload 與 fetcher。 */

const cwaForecast = require("../lib/conditions/cwa-forecast");

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async function () { return payload; }
  };
}

const FORECAST_WEATHER = ["多雲", "有雨", "多雲", "晴時多雲", "晴朗", "陣雨", "多雲", "多雲"];
const FORECAST_RAIN = [40, 70, 20, 10, 0, 60, 30, 30];
const FORECAST_WIND_DIRECTION = ["東南風", "南風", "東風", "東北風", "北風", "西南風", "西風", "西北風"];
const FORECAST_WIND_MS = [4, 6, 3, 2, 1.5, 5, 3.5, 3];
const FORECAST_SCALE = [3, 4, 2, 2, 1, 3, 2, 2];

function pad(value) {
  return String(value).padStart(2, "0");
}

function taipeiDay(at, offsetDays) {
  const base = Number.isFinite(at) ? at : Date.now();
  const time = base + (offsetDays || 0) * 24 * 3600 * 1000 + 8 * 3600 * 1000;
  return new Date(time).toISOString().slice(0, 10);
}

function forecastStarts(at) {
  const rows = [];
  for (let offset = 0; offset < 8; offset++) {
    if (offset === 0) {
      rows.push({ offset: offset, hour: 18 });
    } else {
      rows.push({ offset: offset, hour: 6 });
      rows.push({ offset: offset, hour: 18 });
    }
  }
  return rows.map(function (row) {
    const start = taipeiDay(at, row.offset) + "T" + pad(row.hour) + ":00:00+08:00";
    const endDay = taipeiDay(at, row.offset + (row.hour === 18 ? 1 : 0));
    const end = endDay + "T" + (row.hour === 18 ? "06" : "18") + ":00:00+08:00";
    return { offset: row.offset, start: start, end: end };
  });
}

function forecastElement(name, rows, valueOf) {
  return {
    ElementName: name,
    Time: rows.map(function (row) {
      return {
        StartTime: row.start,
        EndTime: row.end,
        ElementValue: [valueOf(row.offset)]
      };
    })
  };
}

/* 依真實 F-D0047-091 結構產生 7 日預報；預設值對應高雄市。 */
function forecastPayload(options) {
  const settings = options || {};
  const at = settings.at === undefined ? Date.now() : settings.at;
  const rows = forecastStarts(at);
  const city = settings.city || "高雄市";
  const payload = {
    success: "true",
    records: {
      Locations: [{
        DatasetDescription: "臺灣各縣市鄉鎮未來1週逐12小時天氣預報",
        LocationsName: "臺灣",
        Dataid: "D0047-091",
        Location: [{
          LocationName: city,
          Geocode: "64000",
          Latitude: "22.6273",
          Longitude: "120.3014",
          WeatherElement: [
            forecastElement("平均溫度", rows, function (offset) {
              return { Temperature: String(28 - offset) };
            }),
            forecastElement("最高溫度", rows, function (offset) {
              return { MaxTemperature: String(31 - offset) };
            }),
            forecastElement("最低溫度", rows, function (offset) {
              return { MinTemperature: String(26 - offset) };
            }),
            forecastElement("12小時降雨機率", rows, function (offset) {
              return { ProbabilityOfPrecipitation: String(FORECAST_RAIN[offset]) };
            }),
            forecastElement("風向", rows, function (offset) {
              return { WindDirection: FORECAST_WIND_DIRECTION[offset] };
            }),
            forecastElement("風速", rows, function (offset) {
              return {
                WindSpeed: String(FORECAST_WIND_MS[offset]),
                BeaufortScale: String(FORECAST_SCALE[offset])
              };
            }),
            forecastElement("天氣現象", rows, function (offset) {
              return { Weather: FORECAST_WEATHER[offset], WeatherCode: "04" };
            })
          ]
        }]
      }]
    }
  };
  return Object.assign(payload, settings.overrides || {});
}

function requestedCity(url) {
  try {
    return new URL(url).searchParams.get("LocationName") || "";
  } catch (error) {
    return "";
  }
}

/* 假 F-D0047-091：記錄請求 URL，可指定錯誤或替換 payload。 */
function fakeForecast(options) {
  const settings = options || {};
  const state = { urls: [] };
  cwaForecast.setFetcher(async function (url) {
    state.urls.push(url);
    if (settings.error) throw settings.error;
    const payload = settings.payload === undefined
      ? forecastPayload(Object.assign({}, settings, {
        city: settings.city || requestedCity(url) || "高雄市"
      }))
      : settings.payload;
    return jsonResponse(payload);
  });
  return state;
}

module.exports = {
  forecastPayload: forecastPayload,
  fakeForecast: fakeForecast
};
