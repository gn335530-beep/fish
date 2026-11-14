/* AI 錯誤：provider、輸出驗證、工具與結果映射共用同一個建構方式。 */

function llmError(code, options) {
  const settings = options || {};
  const error = new Error(settings.message || code);
  error.code = code;
  error.retryable = settings.retryable === true;
  return error;
}

module.exports = { llmError: llmError };
