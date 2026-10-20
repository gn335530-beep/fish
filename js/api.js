/* ============================================================================
   海人直送 HAISEN × VMS API 轉接層 (js/api.js)
   ----------------------------------------------------------------------------
   目的：讓新版靜態前端（index/products/product-detail/seller/cart/login）
   直接串接既有的 Go + MariaDB 後端，且不改變任何版面。

   載入順序：本檔必須在 app.js 之前載入。
       <script src="js/api.js?v=13"></script>
       <script src="app.js?v=13"></script>

   連線方式：同源 / 反向代理。預設 BASE = ""（相對路徑 /api/...）。
   如需指向其他主機，先設定 window.HAISEN_API_BASE。

   [對接總表]
   ┌─────────────────────────┬────────┬──────────────────────┬───────────────┐
   │ 功能                    │ METHOD │ ENDPOINT             │ 需要 Token    │
   ├─────────────────────────┼────────┼──────────────────────┼───────────────┤
   │ 註冊                    │ POST   │ /api/auth/register   │ 否            │
   │ 登入 / 登入別名         │ POST   │ /api/auth/login      │ 否            │
   │                         │        │ /api/auth/signin     │               │
   │ 取得目前會員            │ GET    │ /api/auth/me         │ Authorization │
   │ 取得漁獲清單            │ GET    │ /api/fish/data       │ 否            │
   │ 新增漁獲（上架）        │ POST   │ /api/fish/data       │ Authorization │
   │ 更新漁獲                │ PUT    │ /api/fish/data/{id}  │ Authorization │
   │ 刪除漁獲                │ DELETE │ /api/fish/data/{id}  │ Authorization │
   │ 更新個人資料(銀行)      │ PUT    │ /api/users/profile   │ Authorization │
   └─────────────────────────┴────────┴──────────────────────┴───────────────┘

   單位換算：後端 price_per_kg（元/公斤）↔ 前端 price_per_taijin（元/台斤）
            1 台斤 = 0.6 公斤 ⇒ price_per_taijin = price_per_kg × 0.6
   ============================================================================ */
(function () {
  "use strict";

  var BASE = (typeof window !== "undefined" && window.HAISEN_API_BASE) || "";

  // 與 app.js 共用同一組 localStorage key，登入狀態才能跨頁保留。
  var TOKEN_KEY = "haisen_token_v1";
  var USER_KEY = "haisen_user_v1";

  var KG_TO_TAIJIN = 1 / 0.6; // 1 公斤 = 1.6667 台斤
  var TAIJIN_TO_KG = 0.6;     // 1 台斤 = 0.6 公斤

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
      orders: user.completed_orders || 0
    };
  }

  /* ------------------------------------------------------------------ *
   * 會員 API
   * ------------------------------------------------------------------ */
  async function register(p) {
    // [API 對接點] 會員註冊
    // METHOD  : POST
    // ENDPOINT: /api/auth/register
    // PARAMS  : { username: phone, password, display_name: nick, role: "BUYER" }
    // 回應    : { success, message, token, user }  (HTTP 201)
    // 資料庫  : users(username, password[bcrypt], display_name, role, is_verified, completed_orders)
    var data = await request("/api/auth/register", {
      method: "POST",
      body: {
        username: p.phone,
        password: p.password,
        display_name: p.nick,
        role: p.role || "BUYER"
      }
    });
    if (data.token) setToken(data.token);
    var u = toLocalUser(data.user, p.phone);
    setUser(u);
    return u;
  }

  async function login(p) {
    // [API 對接點] 會員登入
    // METHOD  : POST
    // ENDPOINT: /api/auth/login （別名 /api/auth/signin）
    // PARAMS  : { username: phone, password }
    // 回應    : { success, message, token, user }
    // 資料庫  : users(username, password) → loadUserByUsername
    var data = await request("/api/auth/login", {
      method: "POST",
      body: { username: p.phone, password: p.password }
    });
    if (data.token) setToken(data.token);
    var u = toLocalUser(data.user, p.phone);
    setUser(u);
    return u;
  }

  async function me() {
    // [API 對接點] 取得目前會員（同步升級狀態）
    // METHOD  : GET
    // ENDPOINT: /api/auth/me
    // HEADERS : Authorization: Bearer <token>
    // 回應    : { success, message, data: User }
    var data = await request("/api/auth/me", { auth: true });
    if (data && data.data) {
      var local = getUser() || {};
      var u = toLocalUser(data.data, local.phone);
      setUser(u);
      return u;
    }
    return null;
  }

  function logout() {
    setToken("");
    setUser(null);
  }

  async function updateProfile(bank) {
    // [API 對接點] 更新銀行資料
    // METHOD  : PUT
    // ENDPOINT: /api/users/profile
    // PARAMS  : { bank_code, bank_account, bank_account_name }
    // 資料庫  : users(bank_code, bank_account, bank_account_name) 加密後存入
    return request("/api/users/profile", { method: "PUT", body: bank, auth: true });
  }

  /* ------------------------------------------------------------------ *
   * 漁獲 API
   * ------------------------------------------------------------------ */
  async function listFish() {
    // [API 對接點] 取得所有漁獲
    // METHOD  : GET
    // ENDPOINT: /api/fish/data
    // 回應    : { success, message, data: [FishData] }
    var data = await request("/api/fish/data", {});
    return (data && data.data) || [];
  }

  async function createFish(listing) {
    // [API 對接點] 新增漁獲（上架）
    // METHOD  : POST
    // ENDPOINT: /api/fish/data
    // HEADERS : Authorization: Bearer <token>
    // PARAMS  : { fish_type, quantity, weight, price_per_taijin, price_per_kg,
    //             species_id, species_latin, region, sea, location, caught_time,
    //             process, process_note, shipping[], payment[], deposit_on,
    //             deposit_amount, images[], tail_weights[], weight_mode, tags[] }
    // 回應    : { success, message, data:{ id, seller_id } }
    // 資料庫  : fish_data（seller_id 由 token 決定，非 body）
    return request("/api/fish/data", { method: "POST", body: listing, auth: true });
  }

  async function updateFish(id, patch) {
    // [API 對接點] 更新漁獲（售價/狀態/買家/實重…）
    // METHOD  : PUT
    // ENDPOINT: /api/fish/data/{id}
    // PARAMS  : 任意 fishUpdateRequest 欄位（未帶的欄位保持不變）
    return request("/api/fish/data/" + encodeURIComponent(id), { method: "PUT", body: patch, auth: true });
  }

  async function deleteFish(id) {
    // [API 對接點] 刪除漁獲
    // METHOD  : DELETE
    // ENDPOINT: /api/fish/data/{id}
    return request("/api/fish/data/" + encodeURIComponent(id), { method: "DELETE", auth: true });
  }

  /* ------------------------------------------------------------------ *
   * 資料對應：FishData → 新版 CATCH 造型
   * ------------------------------------------------------------------ */
  function parseArr(s, fallback) {
    if (!s) return fallback;
    try { var v = JSON.parse(s); return Array.isArray(v) ? v : fallback; }
    catch (e) { return fallback; }
  }
  function matchSpeciesId(fishType, speciesList) {
    if (!fishType || !speciesList) return null;
    var name = String(fishType);
    for (var i = 0; i < speciesList.length; i++) {
      var sp = speciesList[i];
      if (name.indexOf(sp.name) !== -1 || sp.name.indexOf(name) !== -1) return sp.id;
    }
    return null;
  }
  function dateToCaught(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return "今日 " + hh + ":" + mm + " 釣獲";
  }

  /**
   * 將後端 FishData 一列轉為新版 UI 的 CATCH 造型物件。
   * @param {object} row           後端 fish_data 列
   * @param {Array}  speciesList   SPECIES 陣列（提供 latin / market 均價 / 圖片）
   * @returns {object} { key, entry }
   */
  function rowToCatch(row, speciesList) {
    var isNew = Number(row.price_per_taijin) > 0;
    // 價格：新版以「元/台斤」顯示。舊資料只有 price_per_kg，換算成台斤。
    var priceTaijin = isNew
      ? Number(row.price_per_taijin)
      : Math.round(Number(row.price_per_kg || 0) * TAIJIN_TO_KG);
    var quantity = Number(row.quantity || 1);
    var tails = parseArr(row.tail_weights, []);
    // 舊資料的 weight 視為公斤，換算為台斤；新版直接是平均台斤重。
    var avgTaijin = isNew
      ? Number(row.weight || 0)
      : Math.round(Number(row.weight || 0) * KG_TO_TAIJIN * 10) / 10;
    var tailList = tails.length
      ? tails.map(function (w) { return { weight: Number(w) }; })
      : Array.from({ length: quantity }, function () { return { weight: avgTaijin }; });

    var speciesId = row.species_id || matchSpeciesId(row.fish_type, speciesList) || null;
    var sp = speciesId ? (speciesList || []).filter(function (s) { return s.id === speciesId; })[0] : null;

    var images = parseArr(row.images, []);
    var img = images.length ? images[0] : (sp ? "images/" + sp.id + ".png" : "images/catch-still.jpg");

    var sellerName = (row.seller && (row.seller.display_name || row.seller.username)) || "釣客";
    var key = row.species_id || ("f" + row.id);

    var entry = {
      // --- 後端識別 ---
      inventoryId: row.id,
      speciesId: speciesId,
      status: row.status,
      // --- 顯示欄位（與 app.js 靜態 CATCH 同構） ---
      name: row.fish_type || (sp ? sp.name : "漁獲"),
      latin: row.species_latin || (sp ? sp.latin : ""),
      img: img,
      sea: row.sea || "",
      region: row.region || "",
      location: row.location || "",
      caught: row.caught_time ? ("今日 " + row.caught_time + " 釣獲") : dateToCaught(row.created_at),
      caughtShort: row.caught_time || "",
      unit: "台斤",
      tails: tailList,
      market: sp ? sp.market : priceTaijin,
      price: priceTaijin,
      remaining: String(row.status).toUpperCase() === "AVAILABLE" ? quantity : 0,
      process: row.process || "",
      processNote: row.process_note || "",
      shipping: parseArr(row.shipping, ["買家自取"]),
      payment: parseArr(row.payment, ["貨到付款"]),
      deposit: { on: !!row.deposit_on, amount: Number(row.deposit_amount || 0) },
      seller: {
        name: sellerName,
        region: row.region || "",
        location: row.location || "",
        rating: 4.8,
        deals: 0
      },
      tags: parseArr(row.tags, ["當日現流"]),
      note: row.process_note || ""
    };
    return { key: key, entry: entry };
  }

  /**
   * 批次轉換，回傳可直接 Object.assign 進 CATCH 的物件。
   */
  function rowsToCatch(rows, speciesList) {
    var out = {};
    (rows || []).forEach(function (row) {
      var r = rowToCatch(row, speciesList);
      if (r.key) out[r.key] = r.entry;
    });
    return out;
  }

  window.HaisenAPI = {
    BASE: BASE,
    getToken: getToken,
    getUser: getUser,
    setUser: setUser,
    register: register,
    login: login,
    me: me,
    logout: logout,
    updateProfile: updateProfile,
    listFish: listFish,
    createFish: createFish,
    updateFish: updateFish,
    deleteFish: deleteFish,
    rowToCatch: rowToCatch,
    rowsToCatch: rowsToCatch,
    matchSpeciesId: matchSpeciesId
  };
})();
