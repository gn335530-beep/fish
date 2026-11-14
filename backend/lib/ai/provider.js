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

function functionCallTurn(turn) {
  return {
    role: "model",
    parts: [{ functionCall: { name: turn.name, args: turn.args || {} } }]
  };
}

function functionResponseTurn(turn) {
  return {
    role: "user",
    parts: [{ functionResponse: { name: turn.name, response: { result: turn.result } } }]
  };
}

function contentsOf(input) {
  const contents = (input.messages || []).map(geminiContent);
  (input.tool_turns || []).forEach(function (turn) {
    contents.push(functionCallTurn(turn));
    contents.push(functionResponseTurn(turn));
  });
  return contents;
}

function systemInstruction(input) {
  const state = input.context && Object.keys(input.context).length
    ? "\n\n目前助手房狀態（JSON，僅供參考）：" + JSON.stringify(input.context)
    : "";
  return { parts: [{ text: input.system + state }] };
}

function readParts(payload) {
  const candidate = payload && payload.candidates && payload.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  if (!Array.isArray(parts)) return { text: "", tool_calls: [] };
  const texts = [];
  const toolCalls = [];
  parts.forEach(function (part) {
    if (part.text) texts.push(part.text);
    if (part.functionCall) {
      toolCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {}
      });
    }
  });
  return { text: texts.join("\n").trim(), tool_calls: toolCalls };
}

async function callGemini(input) {
  const key = process.env.GEMINI_API_KEY || "";
  const url = API_BASE + encodeURIComponent(input.model || DEFAULT_MODEL) +
    ":generateContent?key=" + encodeURIComponent(key);
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, input.timeoutMs || 8000);
  const tools = input.tools || [];
  const generationConfig = {
    temperature: 0.4,
    maxOutputTokens: tools.length ? 2048 : 1024
  };
  if (!tools.length) generationConfig.responseMimeType = "application/json";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemInstruction(input),
        contents: contentsOf(input),
        tools: tools.length ? [{ functionDeclarations: tools }] : undefined,
        generationConfig: generationConfig
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
    const parts = readParts(payload);
    if (!parts.text && !parts.tool_calls.length) {
      throw providerError("LLM_INVALID_OUTPUT", "Gemini returned no text", false);
    }
    return {
      text: parts.text,
      tool_calls: parts.tool_calls,
      usage: tokenCounts(payload.usageMetadata)
    };
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
