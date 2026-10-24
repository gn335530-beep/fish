/* ---------- 個人抽屜（右側滑入） ---------- */
let drawerTab = "profile";

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
      <div class="drawer__tabs" role="tablist">
        <button type="button" class="drawer__tab" data-tab="profile">個人資訊</button>
        <button type="button" class="drawer__tab" data-tab="seller">賣家資訊</button>
      </div>
      <div class="drawer__body" id="dr-body"></div>
      <div class="drawer__foot">
        <button class="btn btn--ghost btn--sm btn--block" type="button" id="dr-logout">登出</button>
      </div>
    </aside>`;
  document.body.appendChild(el);

  el.querySelectorAll("[data-close]").forEach(n => n.addEventListener("click", closeDrawer));
  el.querySelectorAll("[data-tab]").forEach(n => n.addEventListener("click", ()=>{ drawerTab = n.dataset.tab; renderDrawer(); }));
  document.getElementById("dr-logout").addEventListener("click", ()=>{
    setUser(null); closeDrawer(); toast("已登出"); renderAuthNav();
  });
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeDrawer(); });
}
function openDrawer(tab){
  ensureDrawer();
  if(tab) drawerTab = tab;
  renderDrawer();
  document.getElementById("user-drawer").classList.add("show");
}
function closeDrawer(){
  const el = document.getElementById("user-drawer");
  if(el) el.classList.remove("show");
}
function renderDrawer(){
  const u = getUser();
  if(!u) return;
  const avEl = document.getElementById("dr-av");
  const avSrc = getUserAvatar();
  avEl.className = "drawer__av avatar" + (avSrc ? " avatar--img" : "");
  avEl.innerHTML = avatarInner();
  document.getElementById("dr-nick").textContent = u.nick || "會員";
  document.getElementById("dr-phone").textContent = u.phone || "—";
  document.querySelectorAll(".drawer__tab").forEach(n=> n.classList.toggle("on", n.dataset.tab === drawerTab));
  const body = document.getElementById("dr-body");
  if(drawerTab === "profile") body.innerHTML = profileHTML(u);
  else body.innerHTML = sellerPanelHTML();
  bindDrawerBody();
}
