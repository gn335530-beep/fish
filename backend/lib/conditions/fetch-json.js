/* 上游 JSON 讀取：共用逾時、HTTP 錯誤與無資料原因。 */

const { abortSignal } = require("../deadline");

function reasonError(reason) {
  const error = new Error(reason);
  error.reason = reason;
  return error;
}

function reasonOf(error) {
  if (error && error.reason) return error.reason;
  if (error && error.name === "AbortError") return "UPSTREAM_TIMEOUT";
  return "UPSTREAM_UNAVAILABLE";
}

async function fetchJson(url, options) {
  const settings = options || {};
  const request = abortSignal(settings.timeoutMs);
  if (request.signal === null) throw reasonError("UPSTREAM_TIMEOUT");
  const fetcher = settings.fetcher || fetch;
  try {
    const response = await fetcher(url, {
      method: settings.method || "GET",
      headers: settings.headers,
      body: settings.body,
      signal: request.signal
    });
    if (!response.ok) throw reasonError("UPSTREAM_UNAVAILABLE");
    try {
      return await response.json();
    } catch (error) {
      throw reasonError("NO_DATA");
    }
  } catch (error) {
    if (error && error.reason) throw error;
    if (error && error.name === "AbortError") throw reasonError("UPSTREAM_TIMEOUT");
    throw reasonError("UPSTREAM_UNAVAILABLE");
  } finally {
    request.clear();
  }
}

module.exports = {
  fetchJson: fetchJson,
  reasonError: reasonError,
  reasonOf: reasonOf
};
