/* 可重試的配額錯誤：只有 429／額度用完才提示，其餘錯誤維持靜默 fallback。 */

const MESSAGES = {
  LLM_RATE_LIMITED: "小幫手目前比較忙，請稍後再試。",
  SEARCH_RATE_LIMITED: "目前無法上網查詢，請稍後再試。",
  SEARCH_QUOTA_EXHAUSTED: "目前無法上網查詢，請稍後再試。"
};

export function retryNotice(llm) {
  if (!llm || llm.handled !== false || llm.retryable !== true) return null;
  return MESSAGES[llm.error_code] || "小幫手目前無法回覆，請稍後再試。";
}
