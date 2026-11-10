/* 公開評價 API：角色、分頁與摘要。 */

import { request } from "./request.js";

export function listReviews(userId, params) {
  const values = Object.assign({ user_id: userId }, params || {});
  Object.keys(values).forEach(function (key) {
    if (values[key] === undefined || values[key] === null || values[key] === "") {
      delete values[key];
    }
  });
  return request("/api/reviews?" + new URLSearchParams(values).toString());
}

if (window.HaisenAPI) {
  Object.assign(window.HaisenAPI, { listReviews: listReviews });
}
