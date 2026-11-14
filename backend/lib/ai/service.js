/* AI 回覆流程：開關檢查、歷史摘要、provider 呼叫、輸出驗證與錯誤映射。 */

const { llmConfig } = require("./config");
const provider = require("./provider");
const { SYSTEM_PROMPT } = require("./prompt");
const { historyFor, contextSummary } = require("./history");
const { parseOutput, normalizeOutput } = require("./validate");
const { logReply } = require("./log");

const KNOWN_ERRORS = [
  "LLM_TIMEOUT", "LLM_UPSTREAM_ERROR", "LLM_INVALID_OUTPUT",
  "LLM_GUARD_REJECTED", "LLM_RATE_LIMITED"
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

async function reply(options) {
  const started = Date.now();
  const config = llmConfig();
  const baseLog = {
    request_id: options.requestId,
    user_id: options.user && options.user.id,
    conversation_id: options.conversation.id
  };

  if (!config.enabled) {
    logReply(Object.assign({}, baseLog, { duration_ms: Date.now() - started, error_code: "LLM_DISABLED" }));
    return failure("LLM_DISABLED", false);
  }
  if (!config.apiKey) {
    logReply(Object.assign({}, baseLog, {
      duration_ms: Date.now() - started, error_code: "LLM_NOT_CONFIGURED"
    }));
    return failure("LLM_NOT_CONFIGURED", false);
  }

  const input = {
    model: config.model,
    timeoutMs: config.timeoutMs,
    system: SYSTEM_PROMPT,
    context: contextSummary(options.context),
    messages: historyFor(options.conversation.id, config.historyLimit)
  };

  let intent = null;
  try {
    const raw = await provider.generate(input);
    const usage = provider.tokenCounts(raw && raw.usage);
    const parsed = parseOutput(raw && raw.text);
    intent = parsed.intent;
    const output = normalizeOutput(parsed, { userText: options.message.text });

    logReply(Object.assign({}, baseLog, {
      intent: output.intent,
      tokens: usage,
      duration_ms: Date.now() - started,
      error_code: null
    }));
    return Object.assign({ handled: true }, output, { error_code: null, retryable: false });
  } catch (error) {
    const mapped = mapError(error);
    logReply(Object.assign({}, baseLog, {
      intent: intent,
      duration_ms: Date.now() - started,
      error_code: mapped.code
    }));
    return failure(mapped.code, mapped.retryable);
  }
}

module.exports = { reply: reply };
