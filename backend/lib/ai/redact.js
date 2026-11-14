/* 個資遮蔽：電話、Email、身分證字號與地址樣式在送出前換成 [已遮蔽]。 */

const ID_PATTERN = /\b[A-Z][12]\d{8}\b/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MOBILE_PATTERN = /\b09\d{2}[- ]?\d{3}[- ]?\d{3}\b/g;
const LANDLINE_PATTERN = /\b0[2-8][- ]?\d{6,8}\b/g;
const ADDRESS_PATTERN = /(?:[\u4e00-\u9fff]{2,3}[市縣])?(?:[\u4e00-\u9fff]{1,4}[區鄉鎮市])?(?:[\u4e00-\u9fff0-9]{1,12}(?:路|街|大道|巷|弄))(?:\s*\d+(?:-\d+)?號)?(?:[\u4e00-\u9fff0-9之]{0,12})?/g;

const MASK = "[已遮蔽]";

function redactText(value) {
  return String(value == null ? "" : value)
    .replace(ID_PATTERN, MASK)
    .replace(EMAIL_PATTERN, MASK)
    .replace(MOBILE_PATTERN, MASK)
    .replace(LANDLINE_PATTERN, MASK)
    .replace(ADDRESS_PATTERN, MASK);
}

/* 只遞迴處理字串；物件鍵名不含個資，交給呼叫端決定要不要保留。 */
module.exports = { redactText: redactText, MASK: MASK };
