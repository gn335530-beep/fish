/* 公開評價 API：角色、分頁與摘要。 */

import { request } from "./request.js";

export function listReviews(userId, params) {
  const query = new URLSearchParams(Object.assign({ user_id: userId }, params || {}));
  return request("/api/reviews?" + query.toString());
}

if (window.HaisenAPI) {
  Object.assign(window.HaisenAPI, { listReviews: listReviews });
}
