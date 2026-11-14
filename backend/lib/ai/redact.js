/* 個資遮蔽：電話、Email、身分證字號與含行政區的地址在送出前換成 [已遮蔽]。 */

const { CITIES } = require("../regions");

const MASK = "[已遮蔽]";
const ID_PATTERN = /(?<![A-Za-z0-9])[A-Z][12]\d{8}(?![A-Za-z0-9])/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MOBILE_PATTERN = /(?<!\d)(?:\+886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}(?!\d)/g;
const LANDLINE_PATTERN =
  /(?<!\d)(?:\(\s*0[2-8]\d?\s*\)\s*|0[2-8]\d?[-\s]?)\d{3,4}[-\s]?\d{3,4}(?!\d)/g;

function escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* 縣市清單是地址的錨點；「台」同時接受「臺」，避免寫法不同就漏遮。 */
function cityPattern(city) {
  return Array.from(city).map(function (char) {
    return char === "台" ? "[台臺]" : escape(char);
  }).join("");
}

const CITY_PATTERN = "(?:" + CITIES.slice()
  .sort(function (a, b) { return b.length - a.length; })
  .map(cityPattern)
  .join("|") + ")";
const DISTRICT_PATTERN = "[\\u4e00-\\u9fff]{1,3}(?:區|鄉|鎮)";
const ADDRESS_PATTERN = new RegExp(
  "(?:" + CITY_PATTERN + "(?:" + DISTRICT_PATTERN + ")?" + "|" + DISTRICT_PATTERN + ")" +
  "(?:[\\u4e00-\\u9fff0-9]{1,10}(?:里|村))?" +
  "(?:[\\u4e00-\\u9fff0-9]{1,10}(?:鄰))?" +
  "[\\u4e00-\\u9fff0-9]{2,15}(?:大道|路|街)" +
  "(?:[一二三四五六七八九十\\d]+段)?" +
  "(?:\\s*\\d+巷)?" +
  "(?:\\s*\\d+弄)?" +
  "(?:\\s*\\d+(?:-\\d+)?(?:\\s*之\\s*\\d+)?\\s*號)?" +
  "(?:\\s*\\d+\\s*樓(?:\\s*之\\s*\\d+)?)?",
  "g"
);

function redactText(value) {
  return String(value == null ? "" : value)
    .replace(ID_PATTERN, MASK)
    .replace(EMAIL_PATTERN, MASK)
    .replace(MOBILE_PATTERN, MASK)
    .replace(LANDLINE_PATTERN, MASK)
    .replace(ADDRESS_PATTERN, MASK);
}

/* 只遞迴處理字串；物件鍵名不含個資，交給呼叫端決定要不要保留。 */
function redactFields(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactFields);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).forEach(function (key) {
      out[key] = redactFields(value[key]);
    });
    return out;
  }
  return value;
}

module.exports = { redactText: redactText, redactFields: redactFields, MASK: MASK };
