(function () {
  "use strict";
  var API = window.HaisenAPI;
  async function register(p) {
    // [API 對接點] 會員註冊
    // METHOD  : POST
    // ENDPOINT: /api/auth/register
    // PARAMS  : { username: phone, password, display_name: nick, role: "BUYER" }
    // 回應    : { success, message, token, user }  (HTTP 201)
    // 資料庫  : users(username, password[bcrypt], display_name, role, is_verified, completed_orders)
    var data = await API.request("/api/auth/register", {
      method: "POST",
      body: {
        username: p.phone,
        password: p.password,
        display_name: p.nick,
        role: p.role || "BUYER"
      }
    });
    var payload = data && data.data ? data.data : data;
    if (payload && payload.token) API.setToken(payload.token);
    var u = API.toLocalUser(payload && payload.user, p.phone);
    API.setUser(u);
    return u;
  }

  async function login(p) {
    // [API 對接點] 會員登入
    // METHOD  : POST
    // ENDPOINT: /api/auth/login （別名 /api/auth/signin）
    // PARAMS  : { username: phone, password }
    // 回應    : { success, message, token, user }
    // 資料庫  : users(username, password) → loadUserByUsername
    var data = await API.request("/api/auth/login", {
      method: "POST",
      body: { username: p.phone, password: p.password }
    });
    var payload = data && data.data ? data.data : data;
    if (payload && payload.token) API.setToken(payload.token);
    var u = API.toLocalUser(payload && payload.user, p.phone);
    API.setUser(u);
    return u;
  }

  async function me() {
    // [API 對接點] 取得目前會員（同步升級狀態）
    // METHOD  : GET
    // ENDPOINT: /api/auth/me
    // HEADERS : Authorization: Bearer <token>
    // 回應    : { success, message, data: User }
    var data = await API.request("/api/auth/me", { auth: true });
    if (data && data.data) {
      var local = API.getUser() || {};
      var u = API.toLocalUser(data.data, local.phone);
      API.setUser(u);
      return u;
    }
    return null;
  }

  function logout() {
    API.setToken("");
    API.setUser(null);
  }

  async function updateProfile(bank) {
    // [API 對接點] 更新銀行資料
    // METHOD  : PUT
    // ENDPOINT: /api/users/profile
    // PARAMS  : { bank_code, bank_account, bank_account_name }
    // 資料庫  : users(bank_code, bank_account, bank_account_name) 加密後存入
    return API.request("/api/users/profile", { method: "PUT", body: bank, auth: true });
  }
  Object.assign(API, { register: register, login: login, me: me, logout: logout, updateProfile: updateProfile });
})();
