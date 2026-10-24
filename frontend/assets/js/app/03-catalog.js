/* ---------- 折線圖（純 SVG，編輯式細線風格） ---------- */
function lineChart(data, opts){
  opts = opts || {};
  const w = opts.w || 680, h = opts.h || 260;
  const padL = 52, padR = 20, padT = 22, padB = 36;
  const iw = w - padL - padR, ih = h - padT - padB;
  const vals = data.map(d=>d.value);
  let min = opts.min !== undefined ? opts.min : Math.min(...vals);
  let max = opts.max !== undefined ? opts.max : Math.max(...vals);
  const span = (max - min) || 1;
  min = min - span*0.16; max = max + span*0.16;
  const X = i => padL + (data.length===1?iw/2:(i/(data.length-1))*iw);
  const Y = v => padT + ih - ((v-min)/(max-min))*ih;
  const color = opts.color || "#14343F";
  const fill  = opts.fill  || "rgba(20,52,63,.055)";

  let grid = "", labels = "";
  const ticks = 4;
  for(let t=0;t<=ticks;t++){
    const v = min + (max-min)*(t/ticks);
    const y = Y(v);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w-padR}" y2="${y.toFixed(1)}" stroke="#EAE6DE" stroke-width="1"/>`;
    labels += `<text x="${padL-12}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="10.5" font-family="ui-monospace,monospace" fill="#9AA09B">${Math.round(v)}</text>`;
  }
  let pts = data.map((d,i)=>`${X(i).toFixed(1)},${Y(d.value).toFixed(1)}`).join(" ");
  const area = `${padL},${(padT+ih).toFixed(1)} ${pts} ${(w-padR)},${(padT+ih).toFixed(1)}`;
  let dots = data.map((d,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(d.value).toFixed(1)}" r="2.6" fill="#F7F5F0" stroke="${color}" stroke-width="1.6"/>`).join("");
  let xlab = data.map((d,i)=>{
    if(data.length>8 && i%2!==0) return "";
    return `<text x="${X(i).toFixed(1)}" y="${h-12}" text-anchor="middle" font-size="10.5" font-family="ui-monospace,monospace" fill="#9AA09B">${d.label}</text>`;
  }).join("");

  let marker = "";
  if(opts.marker !== undefined && opts.marker !== null){
    const my = Y(opts.marker);
    marker = `<line x1="${padL}" y1="${my.toFixed(1)}" x2="${w-padR}" y2="${my.toFixed(1)}" stroke="#B4452F" stroke-width="1" stroke-dasharray="3 4"/>
      <text x="${w-padR}" y="${(my-7).toFixed(1)}" text-anchor="end" font-size="10.5" font-family="ui-monospace,monospace" fill="#B4452F">${opts.markerLabel||opts.marker}</text>`;
  }

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="價格走勢圖">
    ${grid}${labels}
    <polygon points="${area}" fill="${fill}"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${xlab}${marker}
  </svg>`;
}

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
      <div style="display:flex;gap:10px;margin-top:14px">
        <a href="${catchHref(id)}" class="btn btn--ghost btn--sm" style="flex:1">查看詳情</a>
        <button class="btn btn--primary btn--sm" style="flex:1" ${out?'disabled':''} onclick="addToCart('${id}',1);toast('已加入購物車：${p.name}')">${out?'已售完':'加入購物車'}</button>
      </div>
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
  updateCartCount();
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

/* ============================================================
   聊聊（文字 + 圖片）· 買家 ↔ 釣客 雙向
   ============================================================ */
