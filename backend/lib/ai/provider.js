/* Gemini provider 與測試注入點；呼叫端只依賴 generate(input)。 */

const { DEFAULT_MODEL } = require("./config");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
let override = null;

function providerError(code, message, retryable) {
  const error = new Error(message || code);
  error.code = code;
  error.retryable = retryable === true;
  return error;
}

function tokenCounts(usage) {
  if (!usage) return { input: 0, output: 0, total: 0 };
  return {
    input: Number(usage.prompt_tokens || usage.promptTokenCount || 0),
    output: Number(usage.completion_tokens || usage.candidatesTokenCount || 0),
    total: Number(usage.total_tokens || usage.totalTokenCount || 0)
  };
}

function geminiContent(message) {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.text || "") }]
  };
}

function systemInstruction(input) {
  const state = input.context && Object.keys(input.context).length
    ? "\n\n目前助手房狀態（JSON，僅供參考）：" + JSON.stringify(input.context)
    : "";
  return { parts: [{ text: input.system + state }] };
}

function readText(payload) {
  const candidate = payload && payload.candidates && payload.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map(function (part) { return part.text || ""; }).join("\n").trim();
}

async function callGemini(input) {
  const key = process.env.GEMINI_API_KEY || "";
  const url = API_BASE + encodeURIComponent(input.model || DEFAULT_MODEL) +
    ":generateContent?key=" + encodeURIComponent(key);
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, input.timeoutMs || 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemInstruction(input),
        contents: (input.messages || []).map(geminiContent),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        }
      }),
      signal: controller.signal
    });

    if (response.status === 429) {
      throw providerError("LLM_RATE_LIMITED", "Gemini rate limited", true);
    }
    if (!response.ok) {
      throw providerError("LLM_UPSTREAM_ERROR", "Gemini upstream error " + response.status, false);
    }

    const payload = await response.json();
    const text = readText(payload);
    if (!text) throw providerError("LLM_INVALID_OUTPUT", "Gemini returned no text", false);
    return { text: text, usage: tokenCounts(payload.usageMetadata) };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw providerError("LLM_TIMEOUT", "Gemini timeout", false);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generate(input) {
  if (override) return override(input);
  return callGemini(input);
}

function setProvider(fake) {
  override = fake;
}

function resetProvider() {
  override = null;
}

module.exports = {
  generate: generate,
  setProvider: setProvider,
  resetProvider: resetProvider,
  tokenCounts: tokenCounts
};
