/* 助手房 intent 與路由分類：前端只使用這裡的常數，避免裸字串分叉。
   intent 常數與後端 `backend/lib/ai/validate.js` 對應（前後端各別維護，改任一邊要同步另一邊）：
   INTENT ↔ INTENTS、PLATFORM_INTENTS ↔ PLATFORM_INTENTS、REPLY_INTENTS ↔ REPLY_INTENTS；
   llm-slots.js 的 DRAFT_SLOTS 與後端 EDIT_FIELDS 有重疊欄位，也要一併核對。 */

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

/* 規則引擎先於後端 intent 的平台動作；上架流程另外由 llm.js 判斷。 */
export const RULE_PRIORITY_INTENTS = [
  INTENT.SELL, INTENT.MARKET, INTENT.CANCEL
];

/* 可以寫入模型文字的意圖。 */
export const REPLY_INTENTS = [
  INTENT.CHAT, INTENT.WEB, INTENT.PRODUCT_RECOMMEND
];
