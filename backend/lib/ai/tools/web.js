/* web_search：Tavily basic search；只送遮蔽後的查詢，不送對話歷史。 */

const { redactText } = require("../redact");
const { llmError } = require("../error");

const TAVILY_URL = "https://api.tavily.com/search";
const MAX_RESULTS = 5;

let fetcher = null;

function setFetcher(fake) {
  fetcher = fake;
}

function resetFetcher() {
  fetcher = null;
}

function fetchImpl() {
  return fetcher || fetch;
}

function cleanResults(results) {
  return (Array.isArray(results) ? results : []).map(function (row) {
    let url;
    try {
      url = new URL(String(row.url || ""));
    } catch (error) {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return {
      title: String(row.title || url.hostname).slice(0, 200),
      url: url.toString(),
      content: String(row.content || row.snippet || "").slice(0, 500)
    };
  }).filter(Boolean).slice(0, MAX_RESULTS);
}

async function run(args, ctx) {
  const key = ctx.tavilyApiKey || process.env.TAVILY_API_KEY || "";
  if (!key) throw llmError("LLM_NOT_CONFIGURED");
  const query = redactText(String(args.query || "").trim());
  if (!query) throw llmError("LLM_INVALID_OUTPUT");

  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ctx.timeoutMs || 15000);
  try {
    const response = await fetchImpl()(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        max_results: MAX_RESULTS
      }),
      signal: controller.signal
    });

    if (response.status === 429) throw llmError("SEARCH_RATE_LIMITED", { retryable: true });
    if (response.status === 432 || response.status === 433) {
      throw llmError("SEARCH_QUOTA_EXHAUSTED", { retryable: true });
    }
    if (!response.ok) throw llmError("LLM_UPSTREAM_ERROR");

    const payload = await response.json();
    return { query: query, results: cleanResults(payload && payload.results) };
  } catch (error) {
    if (error && error.name === "AbortError") throw llmError("LLM_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  run: run,
  setFetcher: setFetcher,
  resetFetcher: resetFetcher,
  MAX_RESULTS: MAX_RESULTS
};
