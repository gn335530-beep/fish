/* 官方新鮮代碼字典：把原始交易列收斂成「一個代碼一筆」，保留所有官方名稱。 */

const { maxDate, rocToIso } = require("./dates");

const FRESH_CATEGORIES = ["1", "2", "4", "5"];
/* 沒有「養」字但既有系統視為養殖的代碼。 */
const AQUACULTURE_CODES = [1031, 1041, 1073, 5012, 5022];

function isFreshCode(code) {
  return FRESH_CATEGORIES.indexOf(String(code).charAt(0)) !== -1;
}

function byLatestThenName(a, b) {
  if (a[1] !== b[1]) return a[1] < b[1] ? 1 : -1;
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
}

function toEntry(code, entry) {
  const names = [...entry.names.entries()].sort(byLatestThenName);
  const officialName = names[0][0];
  const aliases = names.slice(1).map(function (row) { return row[0]; });
  const hasFarmName = officialName.indexOf("養") !== -1;
  return {
    id: "msc_" + code,
    species_code: code,
    official_name: officialName,
    aliases: aliases,
    category: String(code).charAt(0),
    is_aquaculture: hasFarmName || AQUACULTURE_CODES.indexOf(code) !== -1,
    last_seen_date: entry.last_seen_date
  };
}

/* 排除 3xxx 凍結與 6xxx 加工代碼；同一代碼跨日期的名稱全部保留。 */
function buildEntries(rawRows) {
  const byCode = new Map();
  for (const raw of rawRows || []) {
    const code = Number(raw["品種代碼"]);
    if (!Number.isInteger(code) || code <= 0 || !isFreshCode(code)) continue;

    const name = String(raw["魚貨名稱"] === undefined ? "" : raw["魚貨名稱"]).trim();
    if (!name || name === "休市") continue;

    const date = rocToIso(raw["交易日期"]);
    if (!date) continue;

    if (!byCode.has(code)) {
      byCode.set(code, { names: new Map(), last_seen_date: null });
    }
    const entry = byCode.get(code);
    entry.last_seen_date = maxDate(entry.last_seen_date, date);
    const previous = entry.names.get(name);
    if (!previous || previous < date) entry.names.set(name, date);
  }

  return [...byCode.entries()]
    .sort(function (a, b) { return a[0] - b[0]; })
    .map(function (row) { return toEntry(row[0], row[1]); });
}

module.exports = { buildEntries: buildEntries };
