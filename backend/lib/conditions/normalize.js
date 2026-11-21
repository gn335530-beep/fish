/* Open-Meteo 正規化：WMO 現象、風向、蒲福風級與每日預報。 */

const { numberOrNull, directionText, beaufort } = require("./wind");

const WEATHER_TEXT = {
  0: "晴朗", 1: "晴時多雲", 2: "多雲", 3: "陰天",
  45: "有霧", 48: "有霧",
  51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨",
  56: "凍雨", 57: "凍雨", 61: "小雨", 63: "有雨", 65: "大雨",
  66: "凍雨", 67: "凍雨", 71: "下雪", 73: "下雪", 75: "下雪", 77: "雪粒",
  80: "陣雨", 81: "較強陣雨", 82: "強陣雨", 85: "陣雪", 86: "陣雪",
  95: "雷雨", 96: "雷雨伴冰雹", 99: "雷雨伴冰雹"
};

function noData() {
  const error = new Error("NO_DATA");
  error.reason = "NO_DATA";
  return error;
}

function weatherText(code) {
  return WEATHER_TEXT[Number(code)] || "天氣不明";
}

function daySummary(daily, index) {
  const date = daily.time[index];
  if (!date) return null;
  const high = numberOrNull(daily.temperature_2m_max && daily.temperature_2m_max[index]);
  const low = numberOrNull(daily.temperature_2m_min && daily.temperature_2m_min[index]);
  const wind = numberOrNull(daily.wind_speed_10m_max && daily.wind_speed_10m_max[index]);
  return {
    date: date,
    weather_text: weatherText(daily.weather_code && daily.weather_code[index]),
    high_c: high,
    low_c: low,
    rain_probability: numberOrNull(daily.precipitation_probability_max &&
      daily.precipitation_probability_max[index]),
    wind_speed_kmh: wind,
    wind_scale: beaufort(wind),
    wind_direction_text: directionText(daily.wind_direction_10m_dominant &&
      daily.wind_direction_10m_dominant[index])
  };
}

function weatherSummary(payload) {
  if (!payload || !payload.current || !payload.daily || !Array.isArray(payload.daily.time)) {
    throw noData();
  }
  const current = payload.current;
  const days = payload.daily.time.map(function (_, index) {
    return daySummary(payload.daily, index);
  }).filter(Boolean).slice(0, 7);
  return {
    current_temperature_c: numberOrNull(current.temperature_2m),
    current_weather_text: weatherText(current.weather_code),
    current_wind_speed_kmh: numberOrNull(current.wind_speed_10m),
    current_wind_scale: beaufort(current.wind_speed_10m),
    current_wind_direction_text: directionText(current.wind_direction_10m),
    current_wind_gust_kmh: numberOrNull(current.wind_gusts_10m),
    current_wind_gust_scale: beaufort(current.wind_gusts_10m),
    today: days[0] || null,
    days: days
  };
}

function marineSummary(payload) {
  const current = payload && payload.current;
  if (!current || typeof current !== "object") throw noData();
  return {
    wave_height_m: numberOrNull(current.wave_height),
    wave_direction_text: directionText(current.wave_direction),
    wave_period_s: numberOrNull(current.wave_period),
    sea_temperature_c: numberOrNull(current.sea_surface_temperature)
  };
}

module.exports = {
  weatherSummary: weatherSummary,
  marineSummary: marineSummary
};
