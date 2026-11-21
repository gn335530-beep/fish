/* F-D0047-091 正規化：12 小時分段整理成每日資料，並挑選目前分段。 */

const { reasonError } = require("./fetch-json");
const { numberOrNull, directionFromText, msToKmh, beaufort } = require("./wind");

const ELEMENT = {
  max: "最高溫度",
  min: "最低溫度",
  rain: "12小時降雨機率",
  windDirection: "風向",
  windSpeed: "風速",
  weather: "天氣現象"
};

function taipeiDate(at) {
  const time = Number.isFinite(at) ? at : Date.now();
  return new Date(time + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function elementTimes(location) {
  const out = {};
  (location.WeatherElement || location.weatherElement || []).forEach(function (element) {
    out[String(element.ElementName || element.elementName || "")] =
      element.Time || element.time || [];
  });
  return out;
}

function valueIndex(times) {
  const out = {};
  (times || []).forEach(function (time) {
    const values = time.ElementValue || time.elementValue || [];
    out[String(time.StartTime || time.startTime || "")] = values[0] || {};
  });
  return out;
}

function valueOf(index, start, key) {
  const row = index[start];
  return row && row[key] !== undefined && row[key] !== null ? row[key] : null;
}

function indexesOf(elements) {
  return {
    max: valueIndex(elements[ELEMENT.max]),
    min: valueIndex(elements[ELEMENT.min]),
    rain: valueIndex(elements[ELEMENT.rain]),
    wind: valueIndex(elements[ELEMENT.windSpeed]),
    direction: valueIndex(elements[ELEMENT.windDirection]),
    weather: valueIndex(elements[ELEMENT.weather])
  };
}

function segmentOf(time, index) {
  const start = String(time.StartTime || time.startTime || "");
  const end = String(time.EndTime || time.endTime || "");
  const startMs = Date.parse(start);
  if (!start || !Number.isFinite(startMs)) return null;
  const speed = msToKmh(valueOf(index.wind, start, "WindSpeed"));
  const scale = numberOrNull(valueOf(index.wind, start, "BeaufortScale"));
  const weather = valueOf(index.weather, start, "Weather");
  return {
    date: start.slice(0, 10),
    startMs: startMs,
    endMs: Date.parse(end),
    daytime: start.slice(11, 13) === "06",
    weather_text: weather ? String(weather) : "",
    high_c: numberOrNull(valueOf(index.max, start, "MaxTemperature")),
    low_c: numberOrNull(valueOf(index.min, start, "MinTemperature")),
    rain_probability: numberOrNull(valueOf(index.rain, start, "ProbabilityOfPrecipitation")),
    wind_speed_kmh: speed,
    wind_scale: scale === null ? beaufort(speed) : scale,
    wind_direction_text: directionFromText(valueOf(index.direction, start, "WindDirection"))
  };
}

function timeline(location) {
  const elements = elementTimes(location);
  const index = indexesOf(elements);
  const times = elements[ELEMENT.weather] ||
    elements[ELEMENT.max] ||
    elements[ELEMENT.min] || [];
  return times.map(function (time) {
    return segmentOf(time, index);
  }).filter(Boolean).sort(function (a, b) { return a.startMs - b.startMs; });
}

function mergeDay(day, segment) {
  if (segment.weather_text && (!day.weather_text || (segment.daytime && !day.hasDaytime))) {
    day.weather_text = segment.weather_text;
    day.hasDaytime = day.hasDaytime || segment.daytime;
  }
  if (segment.high_c !== null) {
    day.high_c = day.high_c === null ? segment.high_c : Math.max(day.high_c, segment.high_c);
  }
  if (segment.low_c !== null) {
    day.low_c = day.low_c === null ? segment.low_c : Math.min(day.low_c, segment.low_c);
  }
  if (segment.rain_probability !== null) {
    day.rain_probability = day.rain_probability === null
      ? segment.rain_probability
      : Math.max(day.rain_probability, segment.rain_probability);
  }
  if (segment.wind_speed_kmh !== null &&
    (day.wind_speed_kmh === null || segment.wind_speed_kmh > day.wind_speed_kmh)) {
    day.wind_speed_kmh = segment.wind_speed_kmh;
    day.wind_scale = segment.wind_scale;
    day.wind_direction_text = segment.wind_direction_text;
  }
}

/* 同一天的白夜兩個 12 小時分段合併成一日；高溫取最大、低溫取最小。 */
function dailyRows(segments) {
  const days = {};
  segments.forEach(function (segment) {
    const day = days[segment.date] || {
      date: segment.date,
      weather_text: "",
      high_c: null,
      low_c: null,
      rain_probability: null,
      wind_speed_kmh: null,
      wind_scale: null,
      wind_direction_text: "",
      hasDaytime: false
    };
    mergeDay(day, segment);
    days[segment.date] = day;
  });
  return Object.keys(days).sort().map(function (date) {
    const row = days[date];
    delete row.hasDaytime;
    return row;
  });
}

function currentOf(segments, at) {
  const time = Number.isFinite(at) ? at : Date.now();
  return segments.find(function (segment) {
    return segment.startMs <= time && time < segment.endMs;
  }) || segments[0] || null;
}

function summarize(location, at) {
  const segments = timeline(location);
  const days = dailyRows(segments);
  const meaningful = days.some(function (day) {
    return Boolean(day.weather_text) || day.high_c !== null || day.low_c !== null;
  });
  if (!days.length || !meaningful) throw reasonError("NO_DATA");
  const current = currentOf(segments, at);
  const today = days.find(function (day) { return day.date === taipeiDate(at); }) || days[0];
  return {
    current_temperature_c: null,
    current_weather_text: current ? current.weather_text : "",
    current_wind_speed_kmh: current ? current.wind_speed_kmh : null,
    current_wind_scale: current ? current.wind_scale : null,
    current_wind_direction_text: current ? current.wind_direction_text : "",
    current_wind_gust_kmh: null,
    current_wind_gust_scale: null,
    today: today,
    days: days.slice(0, 7)
  };
}

module.exports = {
  summarize: summarize,
  taipeiDate: taipeiDate
};
