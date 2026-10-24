/* 統一回應格式：成功一律 { success, message, data }，失敗一律帶 code。 */

function ok(res, data, message) {
  res.json({ success: true, message: message || "OK", data: data === undefined ? null : data });
}

function created(res, data, message) {
  res.status(201).json({ success: true, message: message || "已建立", data: data === undefined ? null : data });
}

function fail(res, status, code, message, extra) {
  res.status(status).json(Object.assign({ success: false, code: code, message: message }, extra || {}));
}

module.exports = { ok, created, fail };
