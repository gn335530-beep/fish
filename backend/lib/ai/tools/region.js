/* 工具查詢範圍：明確縣市優先，否則使用使用者個人檔案的縣市。 */

const { CITIES, normalizeRegion } = require("../../regions");

function regionValue(value) {
  const direct = normalizeRegion(value);
  if (direct) return direct;
  const text = String(value || "").trim();
  if (text.length < 2) return "";
  return CITIES.filter(function (city) {
    return city.indexOf(text) === 0;
  })[0] || "";
}

function regionOf(args, ctx) {
  return regionValue(args.region) ||
    regionValue(ctx.user && ctx.user.city) ||
    null;
}

module.exports = { regionOf: regionOf, regionValue: regionValue };
