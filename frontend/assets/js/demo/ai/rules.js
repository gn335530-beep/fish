/* 意圖判斷：先看明確的買方用語，再看賣方用語，避免「怎麼賣」被誤判成賣魚。 */

export const INTENT = {
  SELL: "SELL",
  BUY: "BUY",
  MARKET: "MARKET",
  CANCEL: "CANCEL",
  UNKNOWN: "UNKNOWN"
};

const CANCEL_WORDS = ["算了", "不要了", "取消", "重來", "清除", "重新開始"];

const MARKET_WORDS = ["行情", "多少錢", "價錢", "價格", "均價"];

const BUY_FIRST = [
  "怎麼賣", "怎麼買", "想買", "我要買", "要買", "有沒有", "有什麼", "什麼魚",
  "推薦", "找魚", "想找", "面交", "洽談", "適合", "煮湯", "清蒸", "刺少"
];

const SELL_WORDS = [
  "賣魚", "想賣", "要賣", "出售", "上架", "釣到", "剛釣", "多捕", "上岸", "賣掉"
];

function includesAny(text, words) {
  return words.some(function (word) { return text.indexOf(word) !== -1; });
}

export function detectIntent(text) {
  const source = String(text || "").trim();
  if (!source) return INTENT.UNKNOWN;
  if (includesAny(source, CANCEL_WORDS)) return INTENT.CANCEL;
  if (includesAny(source, MARKET_WORDS)) return INTENT.MARKET;
  if (includesAny(source, BUY_FIRST)) return INTENT.BUY;
  if (includesAny(source, SELL_WORDS)) return INTENT.SELL;
  if (source.indexOf("賣") !== -1) return INTENT.SELL;
  if (source.indexOf("買") !== -1 || source.indexOf("我要") !== -1) return INTENT.BUY;
  return INTENT.UNKNOWN;
}
