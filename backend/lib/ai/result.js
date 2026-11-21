/* AI 回覆結果與錯誤映射：失敗一律 handled:false，配額錯誤可重試。 */

const KNOWN_ERRORS = [
  "LLM_TIMEOUT", "LLM_UPSTREAM_ERROR", "LLM_INVALID_OUTPUT",
  "LLM_GUARD_REJECTED", "LLM_RATE_LIMITED",
  "SEARCH_RATE_LIMITED", "SEARCH_QUOTA_EXHAUSTED"
];

function failure(code, retryable) {
  return {
    handled: false,
    intent: "UNKNOWN",
    slots: {},
    reply_text: null,
    sources: [],
    tool_results: {},
    error_code: code,
    retryable: retryable === true
  };
}

function mapError(error) {
  if (error && error.status === 429) return { code: "LLM_RATE_LIMITED", retryable: true };
  const code = error && error.code;
  if (KNOWN_ERRORS.indexOf(code) !== -1) {
    return { code: code, retryable: error.retryable === true || code === "LLM_RATE_LIMITED" };
  }
  if (error && error.name === "AbortError") return { code: "LLM_TIMEOUT", retryable: false };
  return { code: "LLM_UPSTREAM_ERROR", retryable: false };
}

/* 國外天氣回合的網路工具失敗：只有逾時與上游錯誤改成「查不到」直接回覆。 */
function webFailureCode(report) {
  const runs = report.toolRuns || [];
  for (let index = runs.length - 1; index >= 0; index--) {
    const run = runs[index];
    if (run.name !== "web_search") continue;
    if (!run.error_code) return "";
    return run.error_code === "LLM_TIMEOUT" || run.error_code === "LLM_UPSTREAM_ERROR"
      ? run.error_code
      : "";
  }
  return "";
}

module.exports = {
  failure: failure,
  mapError: mapError,
  webFailureCode: webFailureCode
};
