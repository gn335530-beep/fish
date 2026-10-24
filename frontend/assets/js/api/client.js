(function () {
  "use strict";
  var BASE = (typeof window !== "undefined" && window.HAISEN_API_BASE) || "";

  // 與 app.js 共用同一組 localStorage key，登入狀態才能跨頁保留。
  var TOKEN_KEY = "haisen_token_v1";
  var USER_KEY = "haisen_user_v1";

  /* ------------------------------------------------------------------ *
   * Token / 使用者狀態
   * ------------------------------------------------------------------ */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t) {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch (e) { return null; }
  }
  function setUser(u) {
    try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch (e) {}
  }

  /* ------------------------------------------------------------------ *
   * 基礎請求
   * [API 對接點] 所有 REST 呼叫統一由此發出
   * ------------------------------------------------------------------ */
  async function request(path, opts) {
    opts = opts || {};
    var method = opts.method || "GET";
    var headers = { "Content-Type": "application/json" };
    if (opts.auth) {
      var t = getToken();
      if (t) headers["Authorization"] = "Bearer " + t;
    }
    var res;
    try {
      res = await fetch(BASE + path, {
        method: method,
        headers: headers,
        body: opts.body != null ? JSON.stringify(opts.body) : undefined
      });
    } catch (netErr) {
      var e = new Error("無法連線到伺服器，請確認後端已啟動");
      e.status = 0; e.cause = netErr; throw e;
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* 非 JSON 回應 */ }
    if (!res.ok || (data && data.success === false)) {
      var msg = (data && (data.message || data.error)) || ("HTTP " + res.status);
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ------------------------------------------------------------------ *
   * 使用者欄位對應：後端 User → 前端 haisen_user_v1
   * [對應] username=電話、display_name=暱稱、role=SELLER|BUYER
   * ------------------------------------------------------------------ */
  function toLocalUser(user, phone) {
    user = user || {};
    return {
      id: user.id,
      nick: user.display_name || user.username || "會員",
      phone: phone || user.username || "",
      role: user.role || "BUYER",
      verified: !!user.is_verified,
      orders: user.completed_deals || user.completed_orders || 0,
      rating: user.rating_score || 0,
      city: user.city || "",
      district: user.district || "",
      addressLine: user.address_line || "",
      address: user.display_address || ""
    };
  }
  window.HaisenAPI = {
    BASE: BASE,
    getToken: getToken,
    setToken: setToken,
    getUser: getUser,
    setUser: setUser,
    request: request,
    toLocalUser: toLocalUser
  };
})();
