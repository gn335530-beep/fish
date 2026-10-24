/* 共用 UI：導覽列事件、開啟助手與 toast。 */
function initNav(){
  const t = document.querySelector(".nav__toggle");
  if(t) t.addEventListener("click", e=>{ e.stopPropagation(); toggleNavMenu(); });
  document.addEventListener("click", e=>{
    const m = document.getElementById("nav-menu");
    if(!m || m.hidden) return;
    if(!e.target.closest("#nav-menu") && !e.target.closest(".nav__toggle")) closeNavMenu();
  });
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeNavMenu(); });
  document.querySelectorAll("[data-open-assistant]").forEach(el => el.addEventListener("click", e=>{
    e.preventDefault();
    if(window.FishMatchBot) window.FishMatchBot.open();
    else toast("助手尚未載入，請重新整理頁面");
  }));
  renderAuthNav();
}
function toast(msg){
  let el = document.getElementById("hs-toast");
  if(!el){
    el = document.createElement("div");
    el.id = "hs-toast";
    el.style.cssText = "position:fixed;left:50%;bottom:40px;transform:translateX(-50%) translateY(14px);background:#1A1D1B;color:#F7F5F0;padding:15px 30px;border-radius:2px;font-size:.82rem;font-weight:500;letter-spacing:.06em;z-index:400;opacity:0;transition:all .3s ease;pointer-events:none;max-width:88vw;text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(()=>{ el.style.opacity="1"; el.style.transform="translateX(-50%) translateY(0)"; });
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateX(-50%) translateY(14px)"; }, 2400);
}
