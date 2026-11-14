/* web_search：Tavily basic search；只送遮蔽後的查詢，不送對話歷史。 */

const { redactText } = require("../redact");
const { ToolError } = require("./tool-error");

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
  if (!key) throw ToolError("LLM_NOT_CONFIGURED", false);
  const query = redactText(String(args.query || "").trim());
  if (!query) throw ToolError("LLM_INVALID_OUTPUT", false);

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

    if (response.status === 429) throw ToolError("SEARCH_RATE_LIMITED", true);
    if (response.status === 432 || response.status === 433) {
      throw ToolError("SEARCH_QUOTA_EXHAUSTED", true);
    }
    if (!response.ok) throw ToolError("LLM_UPSTREAM_ERROR", false);

    const payload = await response.json();
    return { query: query, results: cleanResults(payload && payload.results) };
  } catch (error) {
    if (error && error.name === "AbortError") throw ToolError("LLM_TIMEOUT", false);
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
