(function () {
  "use strict";
  var API = window.HaisenAPI;
  async function register(p) {
    // [API 對接點] 會員註冊
    // METHOD  : POST
    // ENDPOINT: /api/auth/register
    // PARAMS  : { username: phone, password, display_name: nick, city }
    // 回應    : { success, message, token, user }  (HTTP 201)
    // 資料庫  : users(username, password[bcrypt], display_name, city, is_verified)
    var data = await API.request("/api/auth/register", {
      method: "POST",
      body: {
        username: p.phone,
        password: p.password,
        display_name: p.nick,
        city: p.city
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
      var u = API.toLocalUser(data.data);
      API.setUser(u);
      return u;
    }
    return null;
  }

  async function getPublicUser(id) {
    // [API 對接點] 公開個人資訊：只回公開欄位與角色評分
    var data = await API.request("/api/users/" + encodeURIComponent(id));
    return data && data.data ? data.data : null;
  }

  async function updateProfile(payload) {
    // [API 對接點] 設定頁：暱稱、電話、頭像與地址一次更新
    var data = await API.request("/api/users/profile", {
      method: "PUT",
      auth: true,
      body: payload
    });
    return data && data.data ? data.data : null;
  }

  function logout() {
    API.setToken("");
    API.setUser(null);
  }

  Object.assign(API, {
    register: register, login: login, me: me, logout: logout,
    getPublicUser: getPublicUser, updateProfile: updateProfile
  });
})();
