/* LLM 設定：一律在請求時讀環境變數，測試可逐案切換而不重啟 app。 */

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 8000;

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
    webSearch: truthy(process.env.LLM_WEB_SEARCH),
    tavilyApiKey: process.env.TAVILY_API_KEY || "",
    cwaApiKey: process.env.CWA_API_KEY || "",
    searchTimeoutMs: positive(process.env.LLM_SEARCH_TIMEOUT_MS, 15000),
    prefillTool: truthy(process.env.LLM_PREFILL_TOOL)
  };
}

module.exports = {
  DEFAULT_MODEL: DEFAULT_MODEL,
  llmConfig: llmConfig
};
