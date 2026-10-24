/* ---------- 漁獲卡片（買家視角） ---------- */
function catchCardHTML(id){
  const p = CATCH[id];
  const out = soldOut(id);
  return `<article class="card catch-card">
    <a href="${catchHref(id)}" class="card__media">
      <img src="${p.img}" alt="${p.name}">
      <div class="card__tags">
        <span class="badge">${p.region}</span>
        ${out?'<span class="badge badge--coral">已售完</span>':`<span class="badge badge--coral">可購買 ${p.remaining} 尾</span>`}
      </div>
    </a>
    <div class="card__body">
      <div class="card__seller">釣客 ${p.seller.name}</div>
      <h3 class="card__title"><a href="${catchHref(id)}">${p.name}</a></h3>
      <div class="card__meta"><span>${p.caught}</span></div>
      <div class="card__meta"><span>${p.location}</span></div>
      <div class="card__meta"><span>共 ${tailCount(id)} 尾 · 各尾約 ${tailRange(id).w} ${p.unit}</span></div>
      <div class="card__price">
        <b>${money(p.price)}<span class="unit"> / ${p.unit}</span></b>
      </div>
      <a href="${catchHref(id)}" class="btn btn--ghost btn--sm" style="margin-top:14px">查看詳情</a>
    </div>
  </article>`;
}
function renderCatchCards(containerId, ids){
  const el = document.getElementById(containerId);
  if(!el) return;
  const list = ids || CATCH_ORDER;
  el.innerHTML = list.map(id=>catchCardHTML(id)).join("");
}

/* ---------- 導覽 ---------- */
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
