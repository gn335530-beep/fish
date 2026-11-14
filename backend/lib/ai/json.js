/* 小型型別檢查，供 AI 路由與輸出驗證共用。 */

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

module.exports = { isPlainObject: isPlainObject };
