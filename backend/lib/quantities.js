/* 尾數與庫存錯誤：上架、加購、改尾數與送出協議共用同一份驗證與 payload。 */

const { fail } = require("./http");

/* 尾數向下取整；小於 1 時直接回應並回傳 null。 */
function requireQuantity(value, res) {
  const quantity = Math.floor(Number(value));
  if (quantity >= 1) return quantity;
  fail(res, 400, "INVALID_QUANTITY", "尾數必須大於等於 1");
  return null;
}

/* 可售不足：錯誤碼與 payload 只在這裡產生。 */
function insufficientQuantity(res, message, details) {
  fail(res, 409, "INSUFFICIENT_QUANTITY", message, details);
}

module.exports = {
  requireQuantity: requireQuantity,
  insufficientQuantity: insufficientQuantity
};
