/* ---------- 個人抽屜（右側滑入） ---------- */

function ensureDrawer(){
  if(document.getElementById("user-drawer")) return;
  const el = document.createElement("div");
  el.id = "user-drawer";
  el.className = "drawer";
  el.innerHTML = `
    <div class="drawer__scrim" data-close></div>
    <aside class="drawer__panel" role="dialog" aria-label="個人選單">
      <div class="drawer__head">
        <div class="drawer__who">
          <span class="drawer__av avatar" id="dr-av">會</span>
          <div><b id="dr-nick">會員</b><span id="dr-phone">—</span></div>
        </div>
        <button class="drawer__close" type="button" data-close aria-label="關閉">✕</button>
      </div>
      <div class="drawer__body" id="dr-body"></div>
      <div class="drawer__foot">
        <button class="btn btn--ghost btn--sm btn--block" type="button" id="dr-logout">登出</button>
      </div>
    </aside>`;
  document.body.appendChild(el);

  el.querySelectorAll("[data-close]").forEach(n => n.addEventListener("click", closeDrawer));
  document.getElementById("dr-logout").addEventListener("click", ()=>{
    resetTradeHistory();
    drawerView = "profile";
    setUser(null); closeDrawer(); toast("已登出"); renderAuthNav();
  });
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeDrawer(); });
}
function openDrawer(){
  ensureDrawer();
  drawerView = "profile";
  renderDrawer();
  document.getElementById("user-drawer").classList.add("show");
}
function closeDrawer(){
  const el = document.getElementById("user-drawer");
  if(el) el.classList.remove("show");
}

let drawerView = "profile";

function setDrawerView(view){
  drawerView = view;
  renderDrawer();
}

function drawerLoginHTML(){
  return '<div class="drawer__sec"><h4>請先登入</h4>' +
    '<p class="drawer__note">登入後才能查看個人資訊與交易紀錄。</p>' +
    '<a class="btn btn--primary btn--sm" href="login.html" style="margin-top:14px">前往登入</a></div>';
}

function renderDrawer(){
  const u = getUser();
  const body = document.getElementById("dr-body");
  const logout = document.getElementById("dr-logout");
  if(logout) logout.hidden = !u;
  if(!u){
    document.getElementById("dr-av").className = "drawer__av avatar";
    document.getElementById("dr-av").textContent = "會";
    document.getElementById("dr-nick").textContent = "會員";
    document.getElementById("dr-phone").textContent = "—";
    body.innerHTML = drawerLoginHTML();
    bindDrawerBody();
    return;
  }
  const avEl = document.getElementById("dr-av");
  const avSrc = getUserAvatar();
  avEl.className = "drawer__av avatar" + (avSrc ? " avatar--img" : "");
  avEl.innerHTML = avatarInner();
  document.getElementById("dr-nick").textContent = u.nick || "會員";
  document.getElementById("dr-phone").textContent = u.phone || "—";
  if(drawerView === "history") body.innerHTML = tradeHistoryHTML();
  else if(drawerView === "detail") body.innerHTML = tradeDetailHTML();
  else body.innerHTML = profileHTML(u);
  bindDrawerBody();
}
