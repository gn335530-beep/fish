/* 在地氣象測試共用：假 Open-Meteo 回應與助手回覆工具。 */

const openMeteo = require("../lib/conditions/open-meteo");

function weatherPayload(overrides) {
  const payload = {
    timezone: "Asia/Taipei",
    current: {
      time: "2026-11-20T10:00",
      temperature_2m: 27,
      weather_code: 2,
      wind_speed_10m: 12,
      wind_direction_10m: 135,
      wind_gusts_10m: 20
    },
    daily: {
      time: ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26"],
      weather_code: [2, 61, 3, 1, 0, 80, 2],
      temperature_2m_max: [31, 30, 29, 28, 27, 26, 30],
      temperature_2m_min: [26, 25, 24, 23, 22, 21, 25],
      precipitation_probability_max: [40, 70, 20, 10, 0, 60, 30],
      wind_speed_10m_max: [14, 20, 10, 8, 6, 18, 12],
      wind_direction_10m_dominant: [135, 180, 90, 45, 0, 225, 315]
    }
  };
  return Object.assign({}, payload, overrides || {});
}

function marinePayload(overrides) {
  const payload = {
    timezone: "Asia/Taipei",
    current: {
      time: "2026-11-20T10:00",
      wave_height: 1.5,
      wave_direction: 225,
      wave_period: 6,
      sea_surface_temperature: 27
    }
  };
  return Object.assign({}, payload, overrides || {});
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async function () { return payload; }
  };
}

/* 依 URL 分辨天氣與海況；可分別指定錯誤或替換 payload。 */
function fakeOpenMeteo(options) {
  const settings = options || {};
  const state = { urls: [] };
  openMeteo.setFetcher(async function (url) {
    state.urls.push(url);
    if (url.indexOf("marine-api") !== -1) {
      if (settings.marineError) throw settings.marineError;
      return jsonResponse(settings.marine === undefined ? marinePayload() : settings.marine);
    }
    if (settings.weatherError) throw settings.weatherError;
    return jsonResponse(settings.weather === undefined ? weatherPayload() : settings.weather);
  });
  return state;
}

function timeoutError() {
  const error = new Error("timeout");
  error.name = "AbortError";
  return error;
}

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

function conditionsCall(mode, extra) {
  return {
    name: "get_local_conditions",
    args: Object.assign({ mode: mode }, extra || {})
  };
}

module.exports = {
  weatherPayload: weatherPayload,
  marinePayload: marinePayload,
  fakeOpenMeteo: fakeOpenMeteo,
  timeoutError: timeoutError,
  finalChat: finalChat,
  conditionsCall: conditionsCall
};
