/* 共用 API 請求：所有模組統一經 HaisenAPI.request，預設帶登入 Token。 */

export function client() {
  if (!window.HaisenAPI) throw new Error("API 用戶端未載入");
  return window.HaisenAPI;
}

export async function request(path, options) {
  const result = await client().request(path, Object.assign({ auth: true }, options || {}));
  return result.data;
}
