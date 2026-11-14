/* 助手房 intent 與路由分類：前端只使用這裡的常數，避免裸字串分叉。 */

export const INTENT = {
  SELL: "SELL",
  BUY: "BUY",
  MARKET: "MARKET",
  CANCEL: "CANCEL",
  EDIT: "EDIT",
  CHAT: "CHAT",
  WEB: "WEB",
  PRODUCT_RECOMMEND: "PRODUCT_RECOMMEND",
  UNKNOWN: "UNKNOWN"
};

/* 平台動作：由規則引擎執行，不寫入模型文字。 */
export const PLATFORM_INTENTS = [
  INTENT.SELL, INTENT.BUY, INTENT.MARKET, INTENT.CANCEL, INTENT.EDIT
];

/* 規則引擎自己會判斷的意圖；EDIT 由草稿狀態驅動，不在這裡。 */
export const RULE_INTENTS = [
  INTENT.SELL, INTENT.BUY, INTENT.MARKET, INTENT.CANCEL
];

/* 可以寫入模型文字的意圖。 */
export const REPLY_INTENTS = [
  INTENT.CHAT, INTENT.WEB, INTENT.PRODUCT_RECOMMEND
];
