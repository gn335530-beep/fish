/* CWA 自動氣象站測試共用：假 O-A0001-001 payload 與 fetcher。 */

const cwaObservation = require("../lib/conditions/cwa-observation");
const places = require("../lib/conditions/places");
const { CITIES } = require("../lib/regions");

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async function () { return payload; }
  };
}

function taipeiIso(at) {
  const base = Number.isFinite(at) ? at : Date.now();
  return new Date(base + 8 * 3600 * 1000).toISOString()
    .replace(/\.\d{3}Z$/, "+08:00");
}

function stationRow(city, index, at) {
  const coords = places.cityCoords(city) || { lat: 0, lon: 0 };
  const observedAt = taipeiIso(at);
  return {
    StationName: city + "測站",
    StationId: "C0" + String(index + 1).padStart(3, "0"),
    ObsTime: { DateTime: observedAt },
    GeoInfo: {
      Coordinates: [
        {
          CoordinateName: "TWD67",
          StationLatitude: String(coords.lat),
          StationLongitude: String(coords.lon)
        },
        {
          CoordinateName: "WGS84",
          StationLatitude: String(coords.lat),
          StationLongitude: String(coords.lon)
        }
      ],
      StationAltitude: "34.0",
      CountyName: city,
      TownName: ""
    },
    WeatherElement: {
      Weather: "多雲",
      WindDirection: "223.0",
      WindSpeed: "2.3",
      AirTemperature: "27.0",
      GustInfo: {
        PeakGustSpeed: "5.5",
        Occurred_at: { WindDirection: "223.0", DateTime: observedAt }
      }
    }
  };
}

/* 預設每個縣市一個測站，溫度 27°C、風速 2.3 m/s、陣風 5.5 m/s。 */
function observationPayload(options) {
  const settings = options || {};
  const at = settings.at === undefined ? Date.now() : settings.at;
  const stations = settings.stations || CITIES.map(function (city, index) {
    return stationRow(city, index, at);
  });
  return {
    success: "true",
    records: { Station: stations }
  };
}

/* 假 O-A0001-001：記錄請求 URL，可指定錯誤或替換 payload。 */
function fakeObservation(options) {
  const settings = options || {};
  const state = { urls: [] };
  cwaObservation.setFetcher(async function (url) {
    state.urls.push(url);
    if (settings.error) throw settings.error;
    return jsonResponse(settings.payload === undefined ? observationPayload(settings) : settings.payload);
  });
  return state;
}

module.exports = {
  observationPayload: observationPayload,
  fakeObservation: fakeObservation,
  taipeiIso: taipeiIso
};
