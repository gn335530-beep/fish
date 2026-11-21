/* 在地回覆的數字、方向、日期與潮汐時間必須對到當輪工具結果。 */

const { llmError } = require("./error");
const { numbersIn } = require("./guard");

function guardRejected() {
  return llmError("LLM_GUARD_REJECTED");
}

function monthDay(month, day) {
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return "";
  return monthNumber + "-" + dayNumber;
}

/* full 是 Y-M-D，short 是月-日；只接受合理的月份與日期，避免把溫度範圍當日期。 */
function dateKeys(text) {
  const full = [];
  const short = [];
  function addShort(month, day) {
    const key = monthDay(month, day);
    if (key) short.push(key);
  }
  String(text || "")
    .replace(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g, function (_, year, month, day) {
      full.push(year + "-" + Number(month) + "-" + Number(day));
      addShort(month, day);
      return " ";
    })
    .replace(/(\d{1,2})月(\d{1,2})日/g, function (_, month, day) {
      addShort(month, day);
      return " ";
    })
    .replace(/(\d{1,2})\/(\d{1,2})/g, function (_, month, day) {
      addShort(month, day);
      return " ";
    });
  return { full: full, short: short };
}

function clockKey(hour, minute) {
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (hourNumber > 23 || minuteNumber > 59) return "";
  return hourNumber + ":" + String(minuteNumber).padStart(2, "0");
}

function clockKeys(text) {
  const source = String(text || "");
  const keys = [];
  const pattern = /(\d{1,2}):(\d{2})/g;
  let match = pattern.exec(source);
  while (match) {
    const key = clockKey(match[1], match[2]);
    if (key) keys.push(key);
    match = pattern.exec(source);
  }
  return keys;
}

/* 同一個句子同時出現日期與潮汐時間時，必須是同一筆工具潮汐事件。 */
function tidePairs(local) {
  const pairs = {};
  const tide = local && local.tide;
  ["today", "tomorrow"].forEach(function (dayKey) {
    const day = tide && tide[dayKey];
    if (!day || !day.date) return;
    const keys = dateKeys(day.date);
    if (!keys.full.length) return;
    const times = (day.high || []).concat(day.low || []);
    const clocks = times.map(function (row) { return clockKeys(row.time)[0]; }).filter(Boolean);
    pairs[keys.full[0]] = clocks;
    if (keys.short[0]) pairs[keys.short[0]] = clocks;
  });
  return pairs;
}

function assertTidePairs(replyText, local) {
  const pairs = tidePairs(local);
  if (!Object.keys(pairs).length) return;
  String(replyText || "").split(/[。\n]/).forEach(function (segment) {
    if (!/(滿潮|乾潮|潮汐)/.test(segment)) return;
    const clocks = clockKeys(segment);
    if (!clocks.length) return;
    const dates = dateKeys(segment);
    const keys = dates.full.concat(dates.short);
    if (!keys.length) return;
    const allowed = [];
    keys.forEach(function (key) {
      if (pairs[key]) Array.prototype.push.apply(allowed, pairs[key]);
    });
    if (!allowed.length) throw guardRejected();
    clocks.forEach(function (clock) {
      if (allowed.indexOf(clock) === -1) throw guardRejected();
    });
  });
}

/* 日期與潮汐時間也必須是工具結果中的同一組，不是只有數字出現。 */
function assertLocalDateTimes(replyText, evidenceText, local) {
  if (!replyText) return;
  const knownDates = dateKeys(evidenceText);
  const dates = dateKeys(replyText);
  dates.full.forEach(function (key) {
    if (knownDates.full.indexOf(key) === -1) throw guardRejected();
  });
  dates.short.forEach(function (key) {
    if (knownDates.short.indexOf(key) === -1) throw guardRejected();
  });
  const knownTimes = clockKeys(evidenceText);
  clockKeys(replyText).forEach(function (key) {
    if (knownTimes.indexOf(key) === -1) throw guardRejected();
  });
  assertTidePairs(replyText, local);
}

const LOCAL_UNIT = /(\d+(?:\.\d+)?)\s*(°C|℃|度|%|級|公尺|米|秒|節|公里\/小時|公里|km\/h|mm|毫米|公分|cm)/gi;

function collectValues(source, pattern, out, type) {
  if (Array.isArray(source)) {
    source.forEach(function (row) { collectValues(row, pattern, out, type); });
    return;
  }
  if (!source || typeof source !== "object") return;
  Object.keys(source).forEach(function (key) {
    const value = source[key];
    if (typeof value === type && pattern.test(key)) out.push(value);
    collectValues(value, pattern, out, type);
  });
}

function localPools(local) {
  const pools = {
    temp: [], rain: [], scale: [], length: [], period: [], speed: [], waveDir: [], windDir: []
  };
  collectValues(local, /temperature|high_c|low_c/, pools.temp, "number");
  collectValues(local, /probability/, pools.rain, "number");
  collectValues(local, /scale/, pools.scale, "number");
  collectValues(local, /wave_height/, pools.length, "number");
  collectValues(local, /wave_period/, pools.period, "number");
  collectValues(local, /wind_speed|wind_gust/, pools.speed, "number");
  collectValues(local, /wave_direction/, pools.waveDir, "string");
  collectValues(local, /wind_direction/, pools.windDir, "string");
  return pools;
}

function unitPool(unit, pools) {
  if (unit === "°c" || unit === "℃" || unit === "度") return pools.temp;
  if (unit === "%") return pools.rain;
  if (unit === "級") return pools.scale;
  if (["公尺", "米", "公分", "cm", "mm", "毫米"].indexOf(unit) !== -1) return pools.length;
  if (unit === "秒") return pools.period;
  if (["節", "公里", "公里/小時", "km/h"].indexOf(unit) !== -1) return pools.speed;
  return null;
}

/* 帶在地單位的數字不得只在其他欄位出現；例如 2 公尺不能靠風級 2 過關。 */
function assertLocalUnits(replyText, local, userText) {
  if (!replyText || !local) return;
  const pools = localPools(local);
  const userNumbers = numbersIn(userText);
  const pattern = new RegExp(LOCAL_UNIT.source, "gi");
  let match = pattern.exec(replyText);
  while (match) {
    const number = Number(match[1]);
    const pool = unitPool(match[2].toLowerCase(), pools);
    if (pool && pool.indexOf(number) === -1 && userNumbers.indexOf(number) === -1) {
      throw guardRejected();
    }
    match = pattern.exec(replyText);
  }
}

const DIRECTIONS = "(東北|東南|西南|西北|北|東|南|西)";

function directionMatches(text, pattern, pool) {
  const regex = new RegExp(pattern, "g");
  let match = regex.exec(text);
  while (match) {
    if (pool.indexOf(match[1]) === -1) throw guardRejected();
    match = regex.exec(text);
  }
}

/* 浪向與風向文字也必須來自工具結果，不能自行改寫。 */
function assertLocalDirections(replyText, local) {
  if (!replyText || !local) return;
  const pools = localPools(local);
  directionMatches(replyText, DIRECTIONS + "\\s*浪", pools.waveDir);
  directionMatches(replyText, "浪(?:向)?\\s*(?:為|是|：|:)?\\s*" + DIRECTIONS, pools.waveDir);
  directionMatches(replyText, DIRECTIONS + "\\s*風", pools.windDir);
  directionMatches(replyText, "風(?:向)?\\s*(?:為|是|：|:)?\\s*" + DIRECTIONS, pools.windDir);
}

module.exports = {
  assertLocalDateTimes: assertLocalDateTimes,
  assertLocalUnits: assertLocalUnits,
  assertLocalDirections: assertLocalDirections
};
