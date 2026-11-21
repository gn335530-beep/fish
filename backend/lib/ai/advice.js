/* 釣魚建議護欄：資料不足不判斷、不用絕對保證、不自動加免責句。 */

const { llmError } = require("./error");

const ABSOLUTE = /(保證安全|保證沒問題|一定可以|一定安全|絕對沒問題|絕對安全|絕對可以|保證適合)/;
const DISCLAIMER = /(請自行評估|請自行判斷|自行承擔|風險自負)/;
const JUDGEMENT = /(偏適合|偏不適合|適合釣魚|適合海釣|適合磯釣|適合去海邊|不適合釣魚)/;

function reject() {
  return llmError("LLM_GUARD_REJECTED");
}

/* 缺失項目只列名稱，不猜數字，也不給適合／不適合。 */
function missingText(local) {
  const missing = [];
  if (!local || !local.marine) missing.push("海況");
  if (!local || !local.weather) missing.push("天氣");
  if (!local || !local.tide) missing.push("潮汐");
  if (!missing.length) return "";
  return missing.join("、") + "暫無資料，先不做適合釣魚的判斷。";
}

function assertSafe(replyText, options) {
  const text = String(replyText || "");
  if (!text) return;
  if (ABSOLUTE.test(text) || DISCLAIMER.test(text)) throw reject();
  if (!(options && options.advice === true) && JUDGEMENT.test(text)) throw reject();
}

module.exports = {
  missingText: missingText,
  assertSafe: assertSafe
};
