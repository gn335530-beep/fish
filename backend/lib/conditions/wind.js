/* 風向、蒲福風級與單位換算：在地氣象共用。 */

const DIRECTIONS = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
const BEAUFORT_MAX = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];

function numberOrNull(value) {
  const number = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(number)) {
    return null;
  }
  return number;
}

function directionText(degrees) {
  const value = numberOrNull(degrees);
  if (value === null) return "";
  return DIRECTIONS[Math.round((value % 360) / 45) % 8];
}

/* Open-Meteo 風速預設是 km/h；回覆用蒲福風級比較好讀。 */
function beaufort(kmh) {
  const value = numberOrNull(kmh);
  if (value === null) return null;
  for (let level = 0; level < BEAUFORT_MAX.length; level++) {
    if (value < BEAUFORT_MAX[level]) return level;
  }
  return 12;
}

/* CWA 風向為「西南風」「偏北風」等文字；取最長符合的八方位。 */
function directionFromText(text) {
  const source = String(text || "").replace(/^偏/, "").replace(/風$/, "");
  let found = "";
  DIRECTIONS.forEach(function (name) {
    if (name.length > found.length && source.indexOf(name) !== -1) found = name;
  });
  return found;
}

function msToKmh(ms) {
  const value = numberOrNull(ms);
  return value === null ? null : Math.round(value * 3.6);
}

module.exports = {
  DIRECTIONS: DIRECTIONS,
  numberOrNull: numberOrNull,
  directionText: directionText,
  directionFromText: directionFromText,
  beaufort: beaufort,
  msToKmh: msToKmh
};
