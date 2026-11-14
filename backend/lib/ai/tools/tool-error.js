/* 工具錯誤：只帶錯誤碼與可否重試，不帶工具內容。 */

function ToolError(code, retryable) {
  const error = new Error(code);
  error.code = code;
  error.retryable = retryable === true;
  return error;
}

module.exports = { ToolError: ToolError };
