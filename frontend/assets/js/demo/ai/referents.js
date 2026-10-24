/* 指涉解析：把「第 2 個」「這尾」「最後一個」對到上一批商品卡。 */

const CHINESE_NUMBERS = {
  一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10
};

function toNumber(text) {
  if (/^\d+$/.test(text)) return Number(text);
  if (text === "十") return 10;
  if (text.indexOf("十") !== -1) {
    const parts = text.split("十");
    const tens = parts[0] ? CHINESE_NUMBERS[parts[0]] || 0 : 1;
    const ones = parts[1] ? CHINESE_NUMBERS[parts[1]] || 0 : 0;
    return tens * 10 + ones;
  }
  return CHINESE_NUMBERS[text] || 0;
}

const ORDINAL = /第\s*([0-9一二兩三四五六七八九十]+)\s*(?:個|尾|張|筆|件)/;
const DEMONSTRATIVE = /(?:這|那)(?:一)?(?:個|尾|張|筆|件)/;
const LAST_ONE = /最後一(?:個|尾|張|筆|件)/;

export function resolveReferent(text, count) {
  const source = String(text || "").trim();
  const isLast = /^最後$/.test(source) || LAST_ONE.test(source);
  const ordinal = ORDINAL.exec(source);
  const demonstrative = DEMONSTRATIVE.test(source);
  if (!source || (!isLast && !ordinal && !demonstrative)) return null;
  if (!count) return { status: "none" };

  if (isLast) return { status: "ok", index: count - 1 };

  if (ordinal) {
    const value = toNumber(ordinal[1]);
    if (value < 1 || value > count) return { status: "out-of-range", count: count };
    return { status: "ok", index: value - 1 };
  }

  if (demonstrative) {
    if (count === 1) return { status: "ok", index: 0 };
    return { status: "ambiguous", count: count };
  }

  return null;
}
