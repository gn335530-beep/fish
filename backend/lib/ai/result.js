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

function sourcesOf(results) {
  return (results || []).slice(0, 3).map(function (row) {
    return { title: row.title, url: row.url };
  });
}

module.exports = {
  failure: failure,
  mapError: mapError,
  sourcesOf: sourcesOf
};
