/* Gemini provider 與測試注入點；呼叫端只依賴 generate(input)。 */

const { DEFAULT_MODEL } = require("./config");
const { llmError } = require("./error");
const { abortSignal } = require("../deadline");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
let override = null;

function tokenCounts(usage) {
  if (!usage) return { input: 0, output: 0, total: 0 };
  const input = Number(usage.input !== undefined ? usage.input : (usage.prompt_tokens || usage.promptTokenCount || 0)) || 0;
  const output = Number(usage.output !== undefined ? usage.output : (usage.completion_tokens || usage.candidatesTokenCount || 0)) || 0;
  const total = Number(usage.total !== undefined ? usage.total : (usage.total_tokens || usage.totalTokenCount || 0)) || 0;
  return { input: input, output: output, total: total || input + output };
}

function geminiContent(message) {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.text || "") }]
  };
}

function functionCallPart(call) {
  const functionCall = { name: call.name, args: call.args || {} };
  if (call.id) functionCall.id = call.id;
  const part = { functionCall: functionCall };
  if (call.thoughtSignature) part.thoughtSignature = call.thoughtSignature;
  return part;
}

function functionResponsePart(turn) {
  const functionResponse = { name: turn.name, response: { result: turn.result } };
  if (turn.id) functionResponse.id = turn.id;
  return { functionResponse: functionResponse };
}

/* Gemini 3 要求同一輪先送全部 functionCall，再送全部 functionResponse。 */
function contentsOf(input) {
  const contents = (input.messages || []).map(geminiContent);
  (input.tool_rounds || []).forEach(function (round) {
    const calls = (round.calls || []).map(functionCallPart);
    const results = (round.results || []).map(functionResponsePart);
    if (calls.length) contents.push({ role: "model", parts: calls });
    if (results.length) contents.push({ role: "user", parts: results });
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
      const call = {
        name: part.functionCall.name,
        args: part.functionCall.args || {}
      };
      if (part.functionCall.id) call.id = part.functionCall.id;
      const signature = part.thoughtSignature || part.thought_signature;
      if (signature) call.thoughtSignature = signature;
      toolCalls.push(call);
    }
  });
  return { text: texts.join("\n").trim(), tool_calls: toolCalls };
}

async function callGemini(input) {
  const key = process.env.GEMINI_API_KEY || "";
  const url = API_BASE + encodeURIComponent(input.model || DEFAULT_MODEL) + ":generateContent";
  const request = abortSignal(input.timeoutMs === undefined ? 8000 : input.timeoutMs);
  if (request.signal === null) throw llmError("LLM_TIMEOUT", { message: "Gemini timeout" });
  const tools = input.tools || [];
  const generationConfig = {
    temperature: 0.4,
    maxOutputTokens: tools.length ? 2048 : 1024
  };
  if (!tools.length) generationConfig.responseMimeType = "application/json";

  const body = {
    systemInstruction: systemInstruction(input),
    contents: contentsOf(input),
    tools: tools.length ? [{ functionDeclarations: tools }] : undefined,
    generationConfig: generationConfig
  };
  if (input.toolConfig) body.toolConfig = input.toolConfig;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: request.signal
    });

    if (response.status === 429) {
      throw llmError("LLM_RATE_LIMITED", { message: "Gemini rate limited", retryable: true });
    }
    if (!response.ok) {
      throw llmError("LLM_UPSTREAM_ERROR", { message: "Gemini upstream error " + response.status });
    }

    const payload = await response.json();
    const parts = readParts(payload);
    if (!parts.text && !parts.tool_calls.length) {
      throw llmError("LLM_INVALID_OUTPUT", { message: "Gemini returned no text" });
    }
    return {
      text: parts.text,
      tool_calls: parts.tool_calls,
      usage: tokenCounts(payload.usageMetadata)
    };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw llmError("LLM_TIMEOUT", { message: "Gemini timeout" });
    }
    throw error;
  } finally {
    request.clear();
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
