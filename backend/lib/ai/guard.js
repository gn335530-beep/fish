/* 平台數字防護：數字必須出現在使用者訊息或工具結果，且不被一般知識單位誤殺。 */

const { llmError } = require("./error");

const PLATFORM_CLAIM = /(行情|均價|平均價|售價|價格|庫存|可售|可賣|販售|剩|台斤|元|塊|尾|條|隻)/;
const CHINESE_NUMBER_UNIT = /([一二兩三四五六七八九十百千]+)\s*(元|塊|尾|條|隻)/g;
const GENERAL_UNIT = /(分鐘|小時|公分|公釐|毫米|公克|克|毫升|西西|cc|大卡|卡路里|卡|度|℃|%|年|個月|月|日|號|天|次|種|倍|片|步驟|人份|公斤|指數|級|分)/i;

function guardRejected() {
  return llmError("LLM_GUARD_REJECTED");
}

function numbersIn(value) {
  const normalized = String(value || "").replace(/(\d),(?=\d{3})/g, "$1");
  const found = normalized.match(/\d+(?:\.\d+)?/g) || [];
  return found.map(Number);
}

function isGrounded(number, pool) {
  return pool.some(function (known) { return Math.abs(known - Number(number)) < 0.000001; });
}

function hasGeneralUnit(number, replyText) {
  const value = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const unit = new RegExp("(^|[^\\d.])" + value + "\\s*" + GENERAL_UNIT.source, "i");
  if (unit.test(replyText)) return true;
  /* 日期與時間：11/15、2026-11-14 之類的片段不當平台數字。 */
  return number <= 31 && /\d{1,4}\s*[\/-]\s*\d{1,2}/.test(replyText);
}

function ungroundedChineseNumber(replyText, userText) {
  const pattern = new RegExp(CHINESE_NUMBER_UNIT.source, "g");
  let match = pattern.exec(replyText);
  while (match) {
    if (String(userText).indexOf(match[1] + match[2]) === -1) return true;
    match = pattern.exec(replyText);
  }
  return false;
}

function assertSlotsGrounded(slots, pool) {
  ["quantity", "price", "price_per_taijin"].forEach(function (key) {
    if (slots[key] !== undefined && !isGrounded(slots[key], pool)) throw guardRejected();
  });
  if (typeof slots.edit_value === "number" && !isGrounded(slots.edit_value, pool)) {
    throw guardRejected();
  }
}

function assertReplyGrounded(replyText, pool, userText, options) {
  if (!replyText) return;
  const strict = options && options.strict === true;
  const platformClaim = PLATFORM_CLAIM.test(replyText);
  numbersIn(replyText).forEach(function (number) {
    if (isGrounded(number, pool)) return;
    if (strict || platformClaim || (number > 3 && !hasGeneralUnit(number, replyText))) {
      throw guardRejected();
    }
  });
  if (ungroundedChineseNumber(replyText, userText)) throw guardRejected();
}

module.exports = {
  numbersIn: numbersIn,
  assertSlotsGrounded: assertSlotsGrounded,
  assertReplyGrounded: assertReplyGrounded
};
