/* 處理方式：保留原句、長度與文字檢查、編輯距離上限 2、同意字串。 */

const { llmError } = require("./error");

const MAX_CONDITION = 20;
const UNIT_WORDS = /(公斤|kg|KG|Kg|台斤|斤|尾|條|隻|份|元|塊)/g;
const AGREEMENT = /^(好|好的|好啊|可以|可以喔|套用|套用吧|要|是|OK|ok|Ok)[。！!，,\s]*$/;

function guardRejected() { return llmError("LLM_GUARD_REJECTED"); }

/* 處理方式必須有文字；只有數字與單位不算。 */
function hasText(value) {
  return /[A-Za-z\u4e00-\u9fff]/.test(String(value || "").replace(UNIT_WORDS, ""));
}

function validCondition(value) {
  const text = String(value == null ? "" : value).trim();
  return text.length > 0 && text.length <= MAX_CONDITION && hasText(text);
}

/* 編輯距離：以 Unicode 字元計算，供錯字修正上限使用。 */
function editDistance(left, right) {
  const a = Array.from(String(left || ""));
  const b = Array.from(String(right || ""));
  const dp = [];
  for (let i = 0; i <= a.length; i++) dp[i] = [i];
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/* 錯字修正：原值等於草稿、編輯距離不超過 2、修正後仍是合法處理方式。 */
function validateCorrection(correction, draft) {
  if (String(draft.condition || "") !== correction.original) throw guardRejected();
  if (editDistance(correction.original, correction.corrected) > 2) throw guardRejected();
  if (!validCondition(correction.corrected)) throw guardRejected();
  return correction.corrected;
}

/* 只有明確的同意說法才算同意縮短版。 */
function isAgreement(text) {
  return AGREEMENT.test(String(text || "").trim());
}

module.exports = {
  MAX_CONDITION: MAX_CONDITION,
  hasText: hasText,
  validCondition: validCondition,
  editDistance: editDistance,
  validateCorrection: validateCorrection,
  isAgreement: isAgreement
};
