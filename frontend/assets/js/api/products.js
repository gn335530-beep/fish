/* 商品 API：頁面與對話層共用，實際請求統一經 HaisenAPI.request。 */

import { request } from "./request.js";

export function listProducts(params) {
  const query = new URLSearchParams(params || {}).toString();
  return request("/api/products" + (query ? "?" + query : "")).then(function (data) {
    return data || [];
  });
}

export function getProduct(productId) {
  return request("/api/products/" + encodeURIComponent(productId));
}

export function listMyProducts() {
  return request("/api/products/mine").then(function (data) {
    return data || [];
  });
}

export function delistProduct(productId) {
  return request("/api/products/" + encodeURIComponent(productId) + "/delist", { method: "POST" });
}

export function relistProduct(productId) {
  return request("/api/products/" + encodeURIComponent(productId) + "/relist", { method: "POST" });
}

export function deleteProduct(productId) {
  return request("/api/products/" + encodeURIComponent(productId), { method: "DELETE" });
}

export function createProduct(payload) {
  return request("/api/products/create", { method: "POST", body: payload });
}

/* 商品照片存成 /uploads/...（後端）或完整網址；images/... 只保留舊資料相容。 */
const corePhotoUrl = typeof window !== "undefined" && window.HaisenAPI
  ? window.HaisenAPI.photoUrl
  : null;
export function photoUrl(path) {
  return corePhotoUrl ? corePhotoUrl(path) : (path || "");
}

/* 舊頁面仍以 window.HaisenAPI 呼叫，模組載入後補上同一組函式。 */
if (window.HaisenAPI) {
  Object.assign(window.HaisenAPI, {
    listProducts: listProducts,
    listMyProducts: listMyProducts,
    delistProduct: delistProduct,
    relistProduct: relistProduct,
    deleteProduct: deleteProduct,
    getProduct: getProduct,
    createProduct: createProduct,
    photoUrl: photoUrl
  });
}
