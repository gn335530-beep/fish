/* LLM 設定：一律在請求時讀環境變數，測試可逐案切換而不重啟 app。 */

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_HISTORY_LIMIT = 10;

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function truthy(value) {
  return ["1", "true", "yes", "on"].indexOf(String(value || "").toLowerCase()) !== -1;
}

function llmConfig() {
  return {
    enabled: truthy(process.env.LLM_ENABLED),
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    timeoutMs: positive(process.env.LLM_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    historyLimit: Math.min(positive(process.env.LLM_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT), 30),
    webSearch: truthy(process.env.LLM_WEB_SEARCH),
    tavilyApiKey: process.env.TAVILY_API_KEY || "",
    searchTimeoutMs: positive(process.env.LLM_SEARCH_TIMEOUT_MS, 15000),
    maxToolCalls: Math.min(positive(process.env.LLM_MAX_TOOL_CALLS, 2), 2)
  };
}

module.exports = {
  DEFAULT_MODEL: DEFAULT_MODEL,
  llmConfig: llmConfig
};
