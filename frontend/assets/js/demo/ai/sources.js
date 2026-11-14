/* 資料來源過濾：後端已驗證，前端再保險只接受 http(s)，最多 3 個。 */

export function safeSources(sources) {
  return (Array.isArray(sources) ? sources : []).filter(function (source) {
    return source && /^https?:\/\//i.test(String(source.url || ""));
  }).slice(0, 3);
}
