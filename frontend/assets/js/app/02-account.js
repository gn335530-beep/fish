/* ---------- 買家地區偏好 ---------- */
const REGION_KEY = "haisen_region_v1";
function getRegion(){ return localStorage.getItem(REGION_KEY) || ""; }
function setRegion(r){ localStorage.setItem(REGION_KEY, r || ""); }

/* ---------- 登入狀態（localStorage，跨頁保留） ---------- */
const TOKEN_KEY = "haisen_token_v1";
const USER_KEY = "haisen_user_v1";
function getUser(){ try{ return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }catch(e){ return null; } }
function setUser(u){
  try{ if(u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY); }catch(e){}
}

/* 登出：Token、會員資料與頭像都要清掉，否則下次載入會用舊 Token 自動登入回來。 */
function logoutUser(){
  if(window.HaisenAPI && typeof window.HaisenAPI.logout === "function"){
    window.HaisenAPI.logout();
  } else {
    try{ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }catch(e){}
  }
  setUserAvatar("");
  if(window.FishMatchBot && typeof window.FishMatchBot.logout === "function") window.FishMatchBot.logout();
}

/* ---------- 個人頭像（選填；存 localStorage，跨頁保留） ---------- */
const AVATAR_KEY = "haisen_avatar_v1";
function getUserAvatar(){ try{ return localStorage.getItem(AVATAR_KEY) || ""; }catch(e){ return ""; } }
function setUserAvatar(dataUrl){
  if(dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
  else localStorage.removeItem(AVATAR_KEY);
}
/* 頭像內容：有上傳顯示圖片，否則顯示暱稱首字 */
function avatarInner(){
  const a = getUserAvatar();
  const u = getUser();
  return a ? `<img src="${a}" alt="頭像">` : `<span>${(u && u.nick ? u.nick : "會").slice(0,1)}</span>`;
}

/* ---------- 右上角：頭像／人頭符號（未登入＝登入引導；已登入＝頭像＋暱稱） ---------- */
function refreshNavAvatar(){
  const slot = document.getElementById("nav-user-slot");
  if(!slot) return;
  const u = getUser();
  const a = getUserAvatar();
  if(u && u.nick){
    slot.outerHTML = `<button type="button" class="nav-user nav-user--in" id="nav-user-slot" aria-label="${u.nick} 的選單"><span class="avatar nav-user__av ${a ? "avatar--img" : ""}">${a ? `<img src="${a}" alt="頭像">` : `<span>${u.nick.slice(0,1)}</span>`}</span><span class="nav-user__name">${u.nick}</span></button>`;
  } else {
    slot.outerHTML = `<a href="login.html" class="nav-user nav-user--out" id="nav-user-slot" aria-label="登入或註冊"><svg class="nav-user__ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.6 20c1.2-3.9 4-5.9 7.4-5.9s6.2 2 7.4 5.9"/></svg><span class="nav-user__name">登入／註冊</span></a>`;
  }
  const el = document.getElementById("nav-user-slot");
  if(el && el.tagName === "BUTTON") el.addEventListener("click", ()=> toggleNavMenu());
}
/* 導覽列右上角三條線選單：已登入＝個人資訊／登出；未登入＝登入引導 */
function renderAuthNav(){
  const inner = document.getElementById("nav-menu-inner");
  if(!inner) return;
  const u = getUser();
  const links = `
    <div class="nav-menu__sec nav-menu__links">
      <div class="nav-menu__label">瀏覽</div>
      <a class="nav-menu__item" href="index.html">首頁</a>
      <a class="nav-menu__item" href="products.html">今日漁獲</a>
    </div>`;
  if(u && u.nick){
    inner.innerHTML = `
      <div class="nav-menu__who">
        <span class="nav-menu__av avatar">${avatarInner()}</span>
        <div><b>${u.nick}</b><span>${u.phone || "—"}</span></div>
      </div>
      <div class="nav-menu__sec">
        <div class="nav-menu__label">我的</div>
        <button class="nav-menu__item" type="button" data-open-drawer>個人資訊</button>
        <button class="nav-menu__item" type="button" data-open-history>交易紀錄</button>
      </div>
      ${links}
      <div class="nav-menu__sec">
        <button class="nav-menu__item nav-menu__item--out" type="button" id="nav-menu-logout">登出</button>
      </div>`;
  } else {
    inner.innerHTML = `
      <div class="nav-menu__sec">
        <div class="nav-menu__label">會員</div>
        <a class="nav-menu__item" href="login.html">登入 / 註冊</a>
      </div>
      <div class="nav-menu__sec">
        <div class="nav-menu__label">我的</div>
        <button class="nav-menu__item" type="button" data-open-history>交易紀錄</button>
      </div>
      ${links}`;
  }
  bindNavMenu();
  refreshNavAvatar();
}
function bindNavMenu(){
  const inner = document.getElementById("nav-menu-inner");
  if(!inner) return;
  inner.querySelectorAll("[data-open-drawer]").forEach(b => b.addEventListener("click", ()=>{
    closeNavMenu();
    openDrawer();
  }));
  inner.querySelectorAll("[data-open-history]").forEach(b => b.addEventListener("click", ()=>{
    closeNavMenu();
    openDrawer();
    openTradeHistory();
  }));
  const out = document.getElementById("nav-menu-logout");
  if(out) out.addEventListener("click", ()=>{
    logoutUser(); closeNavMenu(); toast("已登出"); renderAuthNav();
  });
}
function toggleNavMenu(){
  const m = document.getElementById("nav-menu");
  const t = document.querySelector(".nav__toggle");
  if(!m) return;
  const willOpen = m.hidden;
  m.hidden = !willOpen;
  if(t) t.setAttribute("aria-expanded", willOpen ? "true" : "false");
}
function closeNavMenu(){
  const m = document.getElementById("nav-menu");
  const t = document.querySelector(".nav__toggle");
  if(m) m.hidden = true;
  if(t) t.setAttribute("aria-expanded", "false");
}
