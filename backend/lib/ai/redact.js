/* 個資遮蔽：電話、Email、身分證字號與含行政區錨點的地址在送出前換成 [已遮蔽]。 */

const { CITIES } = require("../regions");

const MASK = "[已遮蔽]";
const ID_PATTERN = /(?<![A-Za-z0-9])[A-Z][12]\d{8}(?![A-Za-z0-9])/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MOBILE_PATTERN = /(?<!\d)(?:\+886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}(?!\d)/g;
/* 國際碼市話：+886 後的區碼可省略前導 0，區碼可有括號、連字號或空白。 */
const INTL_LANDLINE_PATTERN =
  /(?<!\d)\+886[-\s]?(?:\(\s*0?[2-8]\d{0,2}\s*\)|0?[2-8]\d{0,2})[-\s]?\d{3,4}[-\s]?\d{3,4}(?!\d)/g;
const LANDLINE_PATTERN =
  /(?<!\d)(?:\(\s*0[2-8]\d{0,2}\s*\)\s*|0[2-8]\d{0,2}[-\s]?)\d{3,4}[-\s]?\d{3,4}(?!\d)/g;

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
/* 鄉鎮市區也是錨點；至少兩個字才不會把「夜市」這類一般詞當成行政區。 */
const DISTRICT_PATTERN = "[\\u4e00-\\u9fff]{2,3}(?:區|鄉|鎮|市)";
/* 街名第一字不得是虛詞或行政區後綴，避免「台北市區的網路」被當成地址。 */
const STREET_PATTERN =
  "(?![區鄉鎮市縣的之與在和有很])" +
  "[\\u4e00-\\u9fff][\\u4e00-\\u9fff0-9]{1,14}(?:大道|路|街)";
const SENTENCE_PARTICLE = /[了嗎呢吧啊]/;
const ADDRESS_PATTERN = new RegExp(
  "(?:" + CITY_PATTERN + "(?:" + DISTRICT_PATTERN + ")?" + "|" + DISTRICT_PATTERN + ")" +
  "(?:[\\u4e00-\\u9fff0-9]{1,10}(?:里|村))?" +
  "(?:[\\u4e00-\\u9fff0-9]{1,10}(?:鄰))?" +
  STREET_PATTERN +
  "(?:\\s*[一二三四五六七八九十\\d]+段)?" +
  "(?:\\s*\\d+巷)?" +
  "(?:\\s*\\d+弄)?" +
  "(?:\\s*\\d+(?:-\\d+)?(?:\\s*之\\s*\\d+)?\\s*號)?" +
  "(?:\\s*\\d+\\s*樓(?:\\s*之\\s*\\d+)?)?",
  "g"
);

/* 地址「路」「街」後面可以接句子語氣字；只有街名本身含語氣字才視為誤判。 */
function streetSuffixIndex(match) {
  return Math.max(
    match.lastIndexOf("大道"),
    match.lastIndexOf("路"),
    match.lastIndexOf("街")
  );
}

function looksLikeAddress(match) {
  const index = streetSuffixIndex(match);
  return index >= 0 && !SENTENCE_PARTICLE.test(match.slice(0, index));
}

function redactText(value) {
  return String(value == null ? "" : value)
    .replace(ID_PATTERN, MASK)
    .replace(EMAIL_PATTERN, MASK)
    .replace(MOBILE_PATTERN, MASK)
    .replace(INTL_LANDLINE_PATTERN, MASK)
    .replace(LANDLINE_PATTERN, MASK)
    .replace(ADDRESS_PATTERN, function (match) {
      return looksLikeAddress(match) ? MASK : match;
    });
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
