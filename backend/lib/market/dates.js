/* 行情日期工具：一律用台灣時區的 YYYY-MM-DD 字串，避免主機時區漂移。 */

const DAY_MS = 24 * 3600 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoFromDate(date) {
  return date.getUTCFullYear() + "-" + pad2(date.getUTCMonth() + 1) + "-" + pad2(date.getUTCDate());
}

function todayIso() {
  const local = new Date(Date.now() + 8 * 3600 * 1000);
  return local.toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) {
    return null;
  }
  return value;
}

/* 官方日期是民國年七碼：1151022 → 2026-10-22。 */
function rocToIso(value) {
  const text = String(value === undefined || value === null ? "" : value).trim();
  if (!/^\d{7}$/.test(text)) return null;
  const year = Number(text.slice(0, 3)) + 1911;
  const month = Number(text.slice(3, 5));
  const day = Number(text.slice(5, 7));
  return parseIsoDate(year + "-" + pad2(month) + "-" + pad2(day));
}

function toRocDate(value) {
  const iso = parseIsoDate(value);
  if (!iso) return "";
  const parts = iso.split("-");
  return String(Number(parts[0]) - 1911) + parts[1] + parts[2];
}

function addDays(value, amount) {
  const iso = parseIsoDate(value);
  if (!iso) return null;
  const date = new Date(iso + "T00:00:00.000Z");
  return isoFromDate(new Date(date.getTime() + amount * DAY_MS));
}

function maxDate(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

module.exports = {
  todayIso: todayIso,
  parseIsoDate: parseIsoDate,
  rocToIso: rocToIso,
  toRocDate: toRocDate,
  addDays: addDays,
  maxDate: maxDate
};
