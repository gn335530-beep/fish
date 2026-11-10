/* 頭像與商品照片的路徑解析：統一向 HaisenAPI.photoUrl 取值。 */

export function mediaSrc(path) {
  if (!path) return "";
  if (typeof window !== "undefined" && window.HaisenAPI && window.HaisenAPI.photoUrl) {
    return window.HaisenAPI.photoUrl(path);
  }
  return path;
}
