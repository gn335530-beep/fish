/* 商品 API：頁面與對話層共用，實際請求統一經 HaisenAPI.request。 */

import { client, request } from "./request.js";

export function listProducts(params) {
  const query = new URLSearchParams(params || {}).toString();
  return request("/api/products" + (query ? "?" + query : "")).then(function (data) {
    return data || [];
  });
}

export function getProduct(productId) {
  return request("/api/products/" + encodeURIComponent(productId));
}

export function createProduct(payload) {
  return request("/api/products/create", { method: "POST", body: payload });
}

/* 商品照片可能存成 /uploads/...（後端）、images/...（種子資料）或完整網址。 */
export function photoUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.charAt(0) === "/") return (client().BASE || "") + path;
  if (path.indexOf("../assets/") === 0 || path.indexOf("assets/") === 0) {
    return path.indexOf("../") === 0 ? path : "../" + path;
  }
  if (path.indexOf("images/") === 0) return "../assets/" + path;
  return path;
}

/* 舊頁面仍以 window.HaisenAPI 呼叫，模組載入後補上同一組函式。 */
if (window.HaisenAPI) {
  Object.assign(window.HaisenAPI, {
    listProducts: listProducts,
    getProduct: getProduct,
    createProduct: createProduct,
    photoUrl: photoUrl
  });
}
