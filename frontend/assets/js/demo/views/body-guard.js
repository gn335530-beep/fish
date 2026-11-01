/* 面板內文重畫的純判斷：哪些欄位算輸入中、什麼時候該凍結。 */

export const IDLE_LIMIT = 5000;

const TEXT_TYPES = [
  "text", "number", "datetime-local", "date", "time", "month", "week",
  "email", "password", "search", "tel", "url"
];

export function isEditable(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = String(element.tagName || "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = String(element.type || "text").toLowerCase();
  return TEXT_TYPES.indexOf(type) !== -1;
}

/* 組字中一律凍結；可編輯欄位在閒置上限內也凍結，超過就允許補畫。 */
export function shouldHold(flags) {
  const value = flags || {};
  if (value.composing) return true;
  if (!value.editable) return false;
  return Number(value.idleMs || 0) < IDLE_LIMIT;
}
