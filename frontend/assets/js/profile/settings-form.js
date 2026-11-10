/* 設定表單的純驗證與頭像渲染：頁面與測試共用，不碰 DOM。 */

const PHONE_RE = /^09\d{8}$/;

export function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

export function normalizePhone(value) {
  return String(value == null ? "" : value).replace(/[\s()-]/g, "");
}

export function normalizeCity(value, regions) {
  const text = String(value || "").trim().replace(/臺/g, "台");
  return (regions || []).indexOf(text) === -1 ? "" : text;
}

export function validateSettings(input, regions) {
  const values = input || {};
  const errors = {};
  const name = String(values.display_name || "").trim();
  if (name.length < 2 || name.length > 20) errors.display_name = "請填寫 2 到 20 字";

  if (!PHONE_RE.test(normalizePhone(values.phone))) {
    errors.phone = "請填寫有效的電話號碼（09 開頭，共 10 碼）";
  }

  if (!normalizeCity(values.city, regions)) errors.city = "請選擇縣市";
  if (String(values.district || "").trim().length > 20) errors.district = "最多 20 字";
  if (String(values.address_line || "").trim().length > 100) errors.address_line = "最多 100 字";

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

export function avatarHTML(name, url, className) {
  const classes = "avatar" + (className ? " " + className : "");
  const label = String(name || "會").trim().slice(0, 1) || "會";
  if (url) {
    return '<span class="' + escapeHtml(classes) + ' avatar--img"><img src="' +
      escapeHtml(url) + '" alt="' + escapeHtml(name || "頭像") + '"></span>';
  }
  return '<span class="' + escapeHtml(classes) + '"><span>' + escapeHtml(label) + "</span></span>";
}

export function updatePayload(input, avatarUrl, regions) {
  const values = input || {};
  return {
    display_name: String(values.display_name || "").trim(),
    phone: normalizePhone(values.phone),
    avatar_url: avatarUrl || "",
    city: normalizeCity(values.city, regions),
    district: String(values.district || "").trim(),
    address_line: String(values.address_line || "").trim()
  };
}
