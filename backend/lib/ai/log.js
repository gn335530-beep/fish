/* AI 回覆 log：只記 metadata；不記訊息、prompt、搜尋結果或 API key。 */

function logReply(meta) {
  const entry = Object.assign({
    event: "ai_reply",
    request_id: meta.request_id || "",
    user_id: meta.user_id || null,
    conversation_id: meta.conversation_id || null,
    intent: meta.intent || null,
    tokens: meta.tokens || { input: 0, output: 0, total: 0 },
    duration_ms: Number(meta.duration_ms) || 0,
    error_code: meta.error_code || null,
    tools: meta.tools || []
  }, meta.extra || {});
  console.info("[ai] " + JSON.stringify(entry));
}

module.exports = { logReply: logReply };
