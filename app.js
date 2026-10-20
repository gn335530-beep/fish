/* ============================================================
   海人直送 HAISEN — app.js  v5.0
   個人釣客上網販售當日漁獲 · 可販售多尾，每尾標示重量 · 買家為一般個人消費者
   地區篩選 / 聊聊面板（買家↔釣客）/ 購物車 / 行情折線圖
   ============================================================ */

/* ---------- 平台設定 ---------- */
const PLATFORM = {
  brand: "海人直送",
  brandEn: "HAISEN DIRECT",
  tagline: "個人釣客的當日漁獲，直接賣給你",
  shipTime: "隔日清晨低溫出貨",
  arriveTime: "隔日 08:00–12:00 到貨"
};

/* ---------- 地區 ---------- */
const REGIONS = ["北部", "中部", "南部", "東部", "澎湖"];

/* ---------- 魚種資料庫（供賣家搜尋與行情參考；均價為元／台斤） ---------- */
const SPECIES = [
  {id:"amberjack", name:"紅魽", latin:"Seriola dumerili", market:486},
  {id:"seabream", name:"嘉鱲（真鯛）", latin:"Pagrus major", market:648},
  {id:"grouper", name:"玳瑁石斑", latin:"Epinephelus quoyanus", market:742},
  {id:"tuna", name:"黑鮪", latin:"Thunnus thynnus", market:1580},
  {id:"seabass", name:"海鱸", latin:"Lateolabrax japonicus", market:402},
  {id:"mackerel", name:"白腹鯖", latin:"Scomber japonicus", market:168},
  {id:"squid", name:"澎湖小卷（軟絲）", latin:"Sepioteuthis lessoniana", market:392},
  {id:"redseabream", name:"赤鯮", latin:"Dentex tumifrons", market:560},
  {id:"blackbream", name:"黑鯛", latin:"Acanthopagrus schlegelii", market:380},
  {id:"yellowfin", name:"黃鰭鮪", latin:"Thunnus albacares", market:620},
  {id:"dolphinfish", name:"鬼頭刀", latin:"Coryphaena hippurus", market:220},
  {id:"scad", name:"竹筴魚", latin:"Trachurus japonicus", market:150},
  {id:"ribbonfish", name:"白帶魚", latin:"Trichiurus lepturus", market:240},
  {id:"threadfin", name:"午仔魚", latin:"Eleutheronema tetradactylum", market:420},
  {id:"bigeye", name:"紅目鰱", latin:"Priacanthus macracanthus", market:300},
  {id:"tilefish", name:"馬頭魚", latin:"Branchiostegus japonicus", market:520},
  {id:"rockfish", name:"石狗公", latin:"Sebastiscus marmoratus", market:340},
  {id:"leatherjacket", name:"剝皮魚", latin:"Thamnaconus modestus", market:260},
  {id:"cuttlefish", name:"花枝", latin:"Sepia esculenta", market:360},
  {id:"octopus", name:"章魚", latin:"Octopus vulgaris", market:480},
  {id:"lobster", name:"龍蝦", latin:"Panulirus ornatus", market:1800},
  {id:"crab", name:"三點蟹", latin:"Portunus sanguinolentus", market:520},
  {id:"shrimp", name:"白蝦", latin:"Litopenaeus vannamei", market:380},
  {id:"oyster", name:"牡蠣", latin:"Crassostrea gigas", market:280},
  {id:"clam", name:"文蛤", latin:"Meretrix lusoria", market:200},
  {id:"milkfish", name:"虱目魚", latin:"Chanos chanos", market:180},
  {id:"eel", name:"鰻魚", latin:"Anguilla japonica", market:900},
  {id:"sweetfish", name:"香魚", latin:"Plecoglossus altivelis", market:600}
];
const QUICK_SPECIES = ["amberjack","seabream","grouper","tuna","seabass","mackerel","squid"];

/* ---------- 今日漁獲（示意資料；可販售多尾，每尾有重量） ----------
   注意：此物件為「示意/離線」資料。頁面載入後會由 loadCatchFromApi()
   以 GET /api/fish/data 的結果覆蓋（同 key）或追加（新 key）。
   保留它可確保後端未啟動時介面仍有內容、外觀不變。 */
let CATCH = {
  amberjack: {
    name:"現流紅魽", latin:"Seriola dumerili",
    img:"images/amberjack.png",
    sea:"澎湖東海・姑婆嶼海域", region:"澎湖", location:"澎湖縣馬公市・第三漁港",
    caught:"今日 05:40 釣獲", caughtShort:"05:40",
    unit:"台斤",
    tails:[{weight:6.3},{weight:5.8},{weight:5.2}],
    market:486, price:520,
    remaining:3,
    process:"已宰殺", processNote:"捕獲後立即放血、去內臟，碎冰保鮮 3 分鐘內完成。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:false, amount:0},
    seller:{name:"陳阿海", region:"澎湖", location:"澎湖縣馬公市", rating:4.9, deals:186},
    tags:["當日現流","職人一支釣"],
    note:"紅魽油脂豐厚、肉質彈牙，適合生食、炙燒與香煎。採單鉤一支釣，捕獲後立即放血去內臟、碎冰保鮮。"
  },
  seabream: {
    name:"現流嘉鱲（真鯛）", latin:"Pagrus major",
    img:"images/seabream.png",
    sea:"澎湖西嶼・內垵海域", region:"澎湖", location:"澎湖縣西嶼鄉・內垵漁港",
    caught:"今日 06:05 釣獲", caughtShort:"06:05",
    unit:"台斤",
    tails:[{weight:2.4},{weight:2.1}],
    market:648, price:680,
    remaining:2,
    process:"已宰殺", processNote:"釣獲後立即放血、去鰓去內臟，全程低溫保鮮。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:false, amount:0},
    seller:{name:"陳阿海", region:"澎湖", location:"澎湖縣馬公市", rating:4.9, deals:186},
    tags:["當日現流","高級宴席魚"],
    note:"嘉鱲為高級鯛科，肉質細緻清甜，適合清蒸、鹽烤、日式薄造。釣獲後全程低溫保鮮，鰓紅眼清。"
  },
  grouper: {
    name:"現流玳瑁石斑", latin:"Epinephelus quoyanus",
    img:"images/grouper.jpg",
    sea:"屏東・小琉球礁區", region:"南部", location:"屏東縣琉球鄉・白沙尾漁港",
    caught:"今日 05:55 釣獲", caughtShort:"05:55",
    unit:"台斤",
    tails:[{weight:3.1},{weight:2.7}],
    market:742, price:780,
    remaining:2,
    process:"活體", processNote:"以活魚艙蓄養，到貨仍為活體，可指定到貨前宰殺。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:true, amount:300},
    seller:{name:"林文彬", region:"南部", location:"屏東縣琉球鄉", rating:4.8, deals:132},
    tags:["當日現流","珊瑚礁魚"],
    note:"礁岩區一支釣石斑，肉質緊實 Q 彈、膠質豐富，適合清蒸、砂鍋與湯品。可指定活體或到貨前宰殺。"
  },
  tuna: {
    name:"現流黑鮪腹肉", latin:"Thunnus thynnus",
    img:"images/tuna.jpg",
    sea:"台東・成功外海", region:"東部", location:"台東縣成功鎮・新港漁港",
    caught:"今日 06:20 釣獲", caughtShort:"06:20",
    unit:"台斤",
    tails:[{weight:5.2}],
    market:1580, price:1680,
    remaining:1,
    process:"已宰殺", processNote:"放血後立即冰鎮，全程 0–4°C 冷鏈，生食級處理。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:true, amount:500},
    seller:{name:"黃志明", region:"東部", location:"台東縣成功鎮", rating:5.0, deals:74},
    tags:["當日現流","珍稀漁獲","生食級"],
    note:"本日僅 1 尾黑鮪，腹肉油花分布均勻，入口即化，為生食級高檔食材，售完不補。"
  },
  seabass: {
    name:"現流海鱸", latin:"Lateolabrax japonicus",
    img:"images/seabass.png",
    sea:"基隆・東北角海域", region:"北部", location:"基隆市中正區・八斗子漁港",
    caught:"今日 05:30 釣獲", caughtShort:"05:30",
    unit:"台斤",
    tails:[{weight:2.8},{weight:2.5}],
    market:402, price:420,
    remaining:2,
    process:"已宰殺", processNote:"去鰓去內臟、碎冰保鮮，適合當日料理。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:false, amount:0},
    seller:{name:"張家豪", region:"北部", location:"基隆市中正區", rating:4.7, deals:98},
    tags:["當日現流","家常首選"],
    note:"東北角一支釣海鱸，肉質細白無腥味，適合清蒸、乾煎與中式料理，家庭餐桌首選。"
  },
  mackerel: {
    name:"現流白腹鯖", latin:"Scomber japonicus",
    img:"images/mackerel.jpg",
    sea:"彰化・王功外海", region:"中部", location:"彰化縣芳苑鄉・王功漁港",
    caught:"今日 05:10 釣獲", caughtShort:"05:10",
    unit:"台斤",
    tails:[{weight:1.2}],
    market:168, price:180,
    remaining:0,
    process:"已宰殺", processNote:"去鰓去內臟、冰鎮保鮮，油脂豐富建議當日食用。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:false, amount:0},
    seller:{name:"李建宏", region:"中部", location:"彰化縣芳苑鄉", rating:4.6, deals:210},
    tags:["當日現流","家庭號"],
    note:"白腹鯖油脂豐富、風味濃郁，適合鹽烤、一夜干與味噌煮。"
  },
  squid: {
    name:"現流澎湖小卷（軟絲）", latin:"Sepioteuthis lessoniana",
    img:"images/squid.jpg",
    sea:"澎湖馬公・虎井海域", region:"澎湖", location:"澎湖縣馬公市・虎井嶼",
    caught:"今日 04:50 釣獲", caughtShort:"04:50",
    unit:"台斤",
    tails:[{weight:1.6},{weight:1.3}],
    market:392, price:420,
    remaining:2,
    process:"活體", processNote:"活體蓄養，到貨前處理，甜度極高。",
    shipping:["買家自取","賣家代送（代送去餐廳）"], payment:["貨到付款","轉帳"], deposit:{on:false, amount:0},
    seller:{name:"陳阿海", region:"澎湖", location:"澎湖縣馬公市", rating:4.9, deals:186},
    tags:["當日現流","活餌釣獲"],
    note:"澎湖軟絲以活餌一支釣捕獲，甜度極高、口感脆彈，適合刺身、三杯與酥炸。當日現流、數量極少。"
  }
};

const CATCH_ORDER = ["amberjack","seabream","grouper","tuna","seabass","mackerel","squid"];

/* 供內嵌 onclick 事件處理器（例如 product-detail 的 openChat(CATCH[ITEM]...)）
   透過全域物件解析 CATCH。Object.assign 只變更內容、不換綁定，故此參考恆有效。 */
window.CATCH = CATCH;

/* ---------- 小工具 ---------- */
function money(n){ return "$" + Number(n).toLocaleString("en-US"); }
function getParam(name){
  try { return new URLSearchParams(location.search).get(name); } catch(e){ return null; }
}
function catchHref(id){ return "product-detail.html?id=" + encodeURIComponent(id); }
function priceFor(id){ const p = CATCH[id]; return p ? p.price : 0; }
function soldOut(id){ return CATCH[id].remaining <= 0; }
function speciesById(id){ return SPECIES.find(s=>s.id===id) || null; }
function tailCount(id){ const p = CATCH[id]; return p && p.tails ? p.tails.length : 0; }
function tailRange(id){
  const p = CATCH[id];
  if(!p || !p.tails || !p.tails.length) return {w:"—"};
  const ws = p.tails.map(t=>t.weight);
  const fmt = a => { const mn = Math.min(...a), mx = Math.max(...a); return mn === mx ? String(mn) : mn + "–" + mx; };
  return {w: fmt(ws)};
}

/* ---------- 買家地區偏好 ---------- */
const REGION_KEY = "haisen_region_v1";
function getRegion(){ return localStorage.getItem(REGION_KEY) || ""; }
function setRegion(r){ localStorage.setItem(REGION_KEY, r || ""); }

/* ---------- 購物車（localStorage） ---------- */
const CART_KEY = "haisen_cart_v1";
function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }catch(e){ return {}; } }
function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartCount(); }
function addToCart(id, qty){
  qty = qty || 1;
  const c = getCart();
  c[id] = (c[id] || 0) + qty;
  saveCart(c);
  return c[id];
}
function setQty(key, qty){
  const c = getCart();
  if(qty <= 0){ delete c[key]; } else { c[key] = qty; }
  saveCart(c);
}
function cartCount(){ return Object.values(getCart()).reduce((a,b)=>a+b,0); }
function updateCartCount(){
  const n = cartCount();
  document.querySelectorAll("[data-cart-count]").forEach(el=>{
    el.textContent = n;
    el.style.display = n > 0 ? "grid" : "none";
  });
}

/* ---------- 登入狀態（localStorage，跨頁保留） ---------- */
const USER_KEY = "haisen_user_v1";
function getUser(){ try{ return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }catch(e){ return null; } }
function setUser(u){
  try{ if(u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY); }catch(e){}
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
/* 導覽列右上角三條線選單：已登入＝個人資訊／賣家資訊／聊聊／登出；未登入＝登入引導 */
function renderAuthNav(){
  const inner = document.getElementById("nav-menu-inner");
  if(!inner) return;
  const u = getUser();
  const links = `
    <div class="nav-menu__sec nav-menu__links">
      <div class="nav-menu__label">瀏覽</div>
      <a class="nav-menu__item" href="index.html">首頁</a>
      <a class="nav-menu__item" href="products.html">今日漁獲</a>
      <a class="nav-menu__item" href="seller.html">我要賣魚</a>
    </div>`;
  if(u && u.nick){
    inner.innerHTML = `
      <div class="nav-menu__who">
        <span class="nav-menu__av avatar">${avatarInner()}</span>
        <div><b>${u.nick}</b><span>${u.phone || "—"}</span></div>
      </div>
      <div class="nav-menu__sec">
        <div class="nav-menu__label">我的</div>
        <button class="nav-menu__item" type="button" data-menu-tab="profile">個人資訊</button>
        <button class="nav-menu__item" type="button" data-menu-tab="seller">賣家資訊</button>
        <button class="nav-menu__item" type="button" data-menu-tab="chat">聊聊</button>
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
      ${links}`;
  }
  bindNavMenu();
  refreshNavAvatar();
}
function bindNavMenu(){
  const inner = document.getElementById("nav-menu-inner");
  if(!inner) return;
  inner.querySelectorAll("[data-menu-tab]").forEach(b => b.addEventListener("click", ()=>{
    closeNavMenu();
    openDrawer(b.dataset.menuTab);
  }));
  const out = document.getElementById("nav-menu-logout");
  if(out) out.addEventListener("click", ()=>{
    setUser(null); closeNavMenu(); toast("已登出"); renderAuthNav();
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
/* role: "buyer"（買家問釣客）或 "seller"（釣客回買家） */
let chatState = { role:"buyer", peer:"賣家", item:"", msgs:[] };

/* 聊聊訊息持久化（localStorage，跨頁保留；過大圖片不寫入以免超出配額） */
const CHAT_KEY = "haisen_chat_v1";
function chatKey(){ return chatState.role + "|" + chatState.peer + "|" + chatState.item; }
function loadChat(){
  try{ const all = JSON.parse(localStorage.getItem(CHAT_KEY) || "{}"); chatState.msgs = all[chatKey()] || []; }
  catch(e){ chatState.msgs = []; }
}
function saveChat(){
  try{
    const all = JSON.parse(localStorage.getItem(CHAT_KEY) || "{}");
    all[chatKey()] = chatState.msgs.map(m => (m.img && m.img.length > 300000) ? {from:m.from, text:m.text, img:null} : m);
    localStorage.setItem(CHAT_KEY, JSON.stringify(all));
  }catch(e){}
}

function ensureChatPanel(){
  if(document.getElementById("chat-panel")) return;
  const el = document.createElement("div");
  el.id = "chat-panel";
  el.className = "chat";
  el.innerHTML = `
    <div class="chat__head">
      <div class="chat__who">
        <span class="chat__av" id="chat-av">釣</span>
        <div><b id="chat-name">賣家</b><span id="chat-sub">聊聊商品細節</span></div>
      </div>
      <button class="chat__close" id="chat-close" aria-label="關閉聊聊">✕</button>
    </div>
    <div class="chat__body" id="chat-body"></div>
    <div class="chat__foot">
      <button class="chat__img" id="chat-img-btn" aria-label="上傳圖片" title="上傳圖片">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-4 4-3-3-6 6"/></svg>
      </button>
      <input type="file" id="chat-file" accept="image/*" hidden>
      <input type="text" id="chat-input" placeholder="輸入訊息，或貼上圖片…" aria-label="訊息">
      <button class="chat__send" id="chat-send">送出</button>
    </div>`;
  document.body.appendChild(el);

  document.getElementById("chat-close").addEventListener("click", closeChat);
  document.getElementById("chat-send").addEventListener("click", sendChatText);
  document.getElementById("chat-input").addEventListener("keydown", e=>{ if(e.key==="Enter") sendChatText(); });
  document.getElementById("chat-img-btn").addEventListener("click", ()=> document.getElementById("chat-file").click());
  document.getElementById("chat-file").addEventListener("change", e=>{
    if(e.target.files && e.target.files[0]) readChatImage(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("chat-input").addEventListener("paste", e=>{
    const items = (e.clipboardData || {}).items || [];
    for(const it of items){
      if(it.type && it.type.indexOf("image") === 0){
        const f = it.getAsFile();
        if(f){ e.preventDefault(); readChatImage(f); }
      }
    }
  });
}

function readChatImage(file){
  if(!/^image\//.test(file.type)){ toast("僅支援圖片檔案"); return; }
  if(file.size > 5*1024*1024){ toast("圖片超過 5MB 上限"); return; }
  const r = new FileReader();
  r.onload = e=>{ pushChat("me", "", e.target.result); };
  r.readAsDataURL(file);
}

function pushChat(from, text, img){
  chatState.msgs.push({from, text, img});
  saveChat();
  renderChat();
  if(from === "me") autoReply();
}

function renderChat(){
  const body = document.getElementById("chat-body");
  if(!body) return;
  if(chatState.msgs.length === 0){
    body.innerHTML = chatState.role === "seller"
      ? `<div class="chat__empty">買家會在這裡詢問魚體外觀、規格、處理方式或到貨時間。<br>你可以回覆文字或圖片。</div>`
      : `<div class="chat__empty">向釣客確認魚體外觀、規格、處理方式或到貨時間。<br>可傳文字或圖片。</div>`;
    return;
  }
  body.innerHTML = chatState.msgs.map(m=>{
    const side = m.from === "me" ? "chat__msg--me" : "chat__msg--seller";
    const img = m.img ? `<div class="chat__imgwrap"><img src="${m.img}" alt="訊息圖片"></div>` : "";
    const txt = m.text ? `<div class="chat__bubble">${m.text}</div>` : "";
    return `<div class="chat__msg ${side}">${img}${txt}</div>`;
  }).join("");
  body.scrollTop = body.scrollHeight;
}

function sendChatText(){
  const input = document.getElementById("chat-input");
  const v = (input.value || "").trim();
  if(!v) return;
  input.value = "";
  pushChat("me", v, null);
}

let replyTimer = null;
function autoReply(){
  clearTimeout(replyTimer);
  replyTimer = setTimeout(()=>{
    const buyerReplies = [
      "收到，我確認一下今天的魚況，稍後回覆你。",
      "這尾是今天清晨釣的，魚眼清澈、鰓很紅，鮮度沒問題。",
      "可以指定處理方式（活體或到貨前宰殺），下單時備註就好。",
      "到貨時間是隔日 08:00–12:00，若需指定時段也可以跟我說。"
    ];
    const sellerReplies = [
      "好的，我確認一下這尾的實際重量，稍後回你。",
      "這尾是今天清晨釣的，魚眼清澈、鰓很紅，鮮度沒問題。",
      "可以指定處理方式（活體或到貨前宰殺），下單時備註就好。",
      "沒問題，我幫你保留，下單後隔日清晨低溫出貨。"
    ];
    const pool = chatState.role === "seller" ? sellerReplies : buyerReplies;
    pushChat("seller", pool[Math.floor(Math.random()*pool.length)], null);
  }, 900 + Math.random()*700);
}

/* 買家端：向釣客聊聊 */
function openChat(sellerName, itemName){
  ensureChatPanel();
  chatState.role = "buyer";
  chatState.peer = sellerName || "賣家";
  chatState.item = itemName || "";
  document.getElementById("chat-name").textContent = chatState.peer;
  document.getElementById("chat-av").textContent = (chatState.peer || "釣").slice(0,1);
  document.getElementById("chat-sub").textContent = itemName ? ("關於「" + itemName + "」") : "聊聊商品細節";
  document.getElementById("chat-panel").classList.add("show");
  loadChat();
  if(chatState.msgs.length === 0){
    chatState.msgs.push({from:"seller", text:"你好，我是" + chatState.peer + "。有想確認的魚況或規格都可以問我。", img:null});
    saveChat();
  }
  renderChat();
  setTimeout(()=>{ const i = document.getElementById("chat-input"); if(i) i.focus(); }, 120);
}

/* 賣家端：回覆買家訊息 */
function openBuyerChat(buyerName, itemName){
  ensureChatPanel();
  chatState.role = "seller";
  chatState.peer = buyerName || "買家";
  chatState.item = itemName || "";
  document.getElementById("chat-name").textContent = chatState.peer;
  document.getElementById("chat-av").textContent = (chatState.peer || "買").slice(0,1);
  document.getElementById("chat-sub").textContent = itemName ? ("詢問「" + itemName + "」") : "買家訊息";
  document.getElementById("chat-panel").classList.add("show");
  loadChat();
  if(chatState.msgs.length === 0){
    chatState.msgs.push({from:"seller", text:"你好，我想確認這尾魚的實際重量與處理方式，可以嗎？", img:null});
    saveChat();
  }
  renderChat();
  setTimeout(()=>{ const i = document.getElementById("chat-input"); if(i) i.focus(); }, 120);
}

function closeChat(){
  const el = document.getElementById("chat-panel");
  if(el) el.classList.remove("show");
}

/* ============================================================
   個人選單（右上角）· 個人抽屜（個人資訊 / 賣家資訊 / 聊聊）
   ============================================================ */

/* ---------- 縣市 / 鄉鎮市區（地址用，含所屬地區自動判定） ---------- */
const TAIWAN_CITIES = {
  "澎湖縣":{region:"澎湖", districts:["馬公市","湖西鄉","白沙鄉","西嶼鄉","望安鄉","七美鄉"]},
  "基隆市":{region:"北部", districts:["中正區","信義區","仁愛區","中山區","安樂區","暖暖區","七堵區"]},
  "台北市":{region:"北部", districts:["中正區","大同區","中山區","松山區","大安區","萬華區","信義區","士林區","北投區","內湖區","南港區","文山區"]},
  "新北市":{region:"北部", districts:["板橋區","三重區","中和區","永和區","新莊區","新店區","樹林區","鶯歌區","三峽區","淡水區","汐止區","瑞芳區","土城區","蘆洲區","五股區","泰山區","林口區","深坑區","石碇區","坪林區","三芝區","石門區","八里區","平溪區","雙溪區","貢寮區","金山區","萬里區","烏來區"]},
  "桃園市":{region:"北部", districts:["桃園區","中壢區","平鎮區","八德區","楊梅區","蘆竹區","大溪區","龍潭區","龜山區","大園區","觀音區","新屋區","復興區"]},
  "新竹縣":{region:"北部", districts:["竹北市","竹東鎮","新埔鎮","關西鎮","湖口鄉","新豐鄉","峨眉鄉","寶山鄉","北埔鄉","芎林鄉","橫山鄉","尖石鄉","五峰鄉"]},
  "新竹市":{region:"北部", districts:["東區","北區","香山區"]},
  "宜蘭縣":{region:"東部", districts:["宜蘭市","羅東鎮","蘇澳鎮","頭城鎮","礁溪鄉","壯圍鄉","員山鄉","冬山鄉","五結鄉","三星鄉","大同鄉","南澳鄉"]},
  "苗栗縣":{region:"中部", districts:["苗栗市","頭份市","苑裡鎮","通霄鎮","竹南鎮","後龍鎮","卓蘭鎮","大湖鄉","公館鄉","銅鑼鄉","南庄鄉","頭屋鄉","三義鄉","西湖鄉","造橋鄉","三灣鄉","獅潭鄉","泰安鄉"]},
  "台中市":{region:"中部", districts:["中區","東區","南區","西區","北區","北屯區","西屯區","南屯區","太平區","大里區","霧峰區","烏日區","豐原區","后里區","石岡區","東勢區","和平區","新社區","潭子區","大雅區","神岡區","大肚區","沙鹿區","龍井區","梧棲區","清水區","大甲區","外埔區","大安區"]},
  "彰化縣":{region:"中部", districts:["彰化市","員林市","和美鎮","鹿港鎮","溪湖鎮","二林鎮","田中鎮","北斗鎮","花壇鄉","芬園鄉","大村鄉","永靖鄉","伸港鄉","線西鄉","福興鄉","秀水鄉","埔心鄉","埔鹽鄉","大城鄉","芳苑鄉","竹塘鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","溪州鄉"]},
  "南投縣":{region:"中部", districts:["南投市","埔里鎮","草屯鎮","竹山鎮","集集鎮","名間鄉","鹿谷鄉","中寮鄉","魚池鄉","國姓鄉","水里鄉","信義鄉","仁愛鄉"]},
  "雲林縣":{region:"中部", districts:["斗六市","斗南鎮","虎尾鎮","西螺鎮","土庫鎮","北港鎮","古坑鄉","大埤鄉","莿桐鄉","林內鄉","二崙鄉","崙背鄉","麥寮鄉","東勢鄉","褒忠鄉","臺西鄉","元長鄉","四湖鄉","口湖鄉","水林鄉"]},
  "嘉義縣":{region:"南部", districts:["太保市","朴子市","布袋鎮","大林鎮","民雄鄉","溪口鄉","新港鄉","六腳鄉","東石鄉","義竹鄉","鹿草鄉","水上鄉","中埔鄉","竹崎鄉","梅山鄉","番路鄉","大埔鄉","阿里山鄉"]},
  "嘉義市":{region:"南部", districts:["東區","西區"]},
  "台南市":{region:"南部", districts:["中西區","東區","南區","北區","安平區","安南區","永康區","歸仁區","新化區","左鎮區","玉井區","楠西區","南化區","仁德區","關廟區","龍崎區","官田區","麻豆區","佳里區","西港區","七股區","將軍區","學甲區","北門區","新營區","後壁區","白河區","東山區","六甲區","下營區","柳營區","鹽水區","善化區","大內區","山上區","新市區","安定區"]},
  "高雄市":{region:"南部", districts:["楠梓區","左營區","鼓山區","三民區","鹽埕區","前金區","新興區","苓雅區","前鎮區","旗津區","小港區","鳳山區","大寮區","鳥松區","林園區","仁武區","大樹區","大社區","岡山區","路竹區","橋頭區","梓官區","彌陀區","永安區","燕巢區","田寮區","阿蓮區","茄萣區","湖內區","旗山區","美濃區","內門區","杉林區","甲仙區","六龜區","茂林區","桃源區","那瑪夏區"]},
  "屏東縣":{region:"南部", districts:["屏東市","潮州鎮","東港鎮","恆春鎮","萬丹鄉","長治鄉","麟洛鄉","九如鄉","里港鄉","鹽埔鄉","高樹鄉","萬巒鄉","內埔鄉","竹田鄉","新埤鄉","枋寮鄉","新園鄉","崁頂鄉","林邊鄉","南州鄉","佳冬鄉","琉球鄉","車城鄉","滿州鄉","枋山鄉","三地門鄉","霧臺鄉","瑪家鄉","泰武鄉","來義鄉","春日鄉","獅子鄉","牡丹鄉"]},
  "台東縣":{region:"東部", districts:["台東市","成功鎮","關山鎮","卑南鄉","大武鄉","太麻里鄉","東河鄉","長濱鄉","鹿野鄉","池上鄉","綠島鄉","延平鄉","海端鄉","達仁鄉","金峰鄉","蘭嶼鄉"]},
  "花蓮縣":{region:"東部", districts:["花蓮市","鳳林鎮","玉里鎮","新城鄉","吉安鄉","壽豐鄉","光復鄉","豐濱鄉","瑞穗鄉","富里鄉","秀林鄉","萬榮鄉","卓溪鄉"]}
};
function districtsOf(city){ const c = TAIWAN_CITIES[city]; return c ? c.districts.slice() : []; }
function regionOfCity(city){ const c = TAIWAN_CITIES[city]; return c ? c.region : ""; }

/* ---------- 賣家上架紀錄（localStorage） ---------- */
const LISTINGS_KEY = "haisen_listings_v1";
function getListings(){ try{ return JSON.parse(localStorage.getItem(LISTINGS_KEY)) || []; }catch(e){ return []; } }
function saveListings(arr){ try{ localStorage.setItem(LISTINGS_KEY, JSON.stringify(arr)); }catch(e){} }
function addListing(o){
  const arr = getListings();
  o.id = "L" + Date.now().toString(36).toUpperCase();
  o.ts = Date.now();
  o.status = "上架中";
  arr.unshift(o);
  saveListings(arr);
  return o;
}
function updateListing(id, patch){ saveListings(getListings().map(x => x.id === id ? Object.assign({}, x, patch) : x)); }
function removeListing(id){ saveListings(getListings().filter(x => x.id !== id)); }

/* ---------- 聊聊對話彙整（依對話鍵分組，取最新一則） ---------- */
function chatThreads(){
  let all = {};
  try{ all = JSON.parse(localStorage.getItem(CHAT_KEY) || "{}"); }catch(e){ all = {}; }
  return Object.keys(all).map(k=>{
    const parts = k.split("|");
    const msgs = all[k] || [];
    if(!msgs.length) return null;
    const last = msgs[msgs.length-1];
    return {key:k, role:parts[0], peer:parts[1]||"", item:parts[2]||"",
            last: last.text || (last.img ? "（圖片）" : ""), from: last.from};
  }).filter(Boolean);
}

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
        <button type="button" class="drawer__tab" data-tab="chat">聊聊</button>
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
  else if(drawerTab === "seller") body.innerHTML = sellerPanelHTML();
  else body.innerHTML = chatPanelHTML();
  bindDrawerBody();
}
function profileHTML(u){
  const nick = (u.nick || "").replace(/"/g, "&quot;");
  const phone = (u.phone || "—");
  return `
  <div class="drawer__sec"><h4>個人資訊</h4>
    <p class="drawer__note">暱稱可自行編輯；電話號碼為註冊時綁定，僅供顯示、不可修改。</p></div>
  <div class="field" id="dr-f-av">
    <label>個人頭像 <span class="opt-tag">選填</span></label>
    <div class="av-upload" id="dr-av-upload">
      <input type="file" class="upload__input" id="dr-av-file" accept="image/*">
      <span class="av-upload__preview avatar ${getUserAvatar() ? "avatar--img" : ""}" id="dr-av-preview">${avatarInner()}</span>
      <div class="av-upload__text"><b>點擊或拖放照片上傳</b><span>支援 JPG / PNG / WEBP，單檔上限 5MB</span></div>
    </div>
    <div class="upload-err" id="dr-av-err"></div>
    <button class="btn btn--quiet btn--sm" type="button" id="dr-av-clear" style="margin-top:10px">移除頭像</button>
  </div>
  <div class="field" id="dr-f-nick">
    <label>暱稱 <span class="req">*</span></label>
    <input class="input" type="text" id="dr-nick-input" value="${nick}" placeholder="請輸入你的名字（買家或賣家皆同）">
    <div class="field-err" id="dr-e-nick">請填寫暱稱（2–20 字）</div>
  </div>
  <div class="field">
    <label>電話號碼</label>
    <div class="readonly-field" id="dr-phone-ro">${phone}</div>
    <p class="hint" style="margin-top:8px">電話號碼於註冊時綁定，不可修改。</p>
  </div>
  <button class="btn btn--primary btn--sm" type="button" id="dr-save">儲存變更</button>
  <div class="drawer__stat">
    <div><b>${getListings().length}</b><span>已上架漁獲</span></div>
    <div><b>${chatThreads().length}</b><span>聊聊對話</span></div>
  </div>`;
}
function sellerPanelHTML(){
  const arr = getListings();
  const head = `
  <div class="drawer__sec"><h4>賣家資訊</h4>
    <p class="drawer__note">你上架的漁獲清單。可更新售價、下架或刪除。</p></div>
  <div class="drawer__acts"><a href="seller.html" class="btn btn--primary btn--sm">＋ 上架新漁獲</a></div>`;
  if(!arr.length){
    return head + `<div class="drawer__empty">尚無上架紀錄。<br>到「漁人上架」完成一次上架後，這裡會列出你販售中的漁獲。</div>`;
  }
  return head + `<div class="listing-list">` + arr.map(l=>{
    const up = l.status !== "已下架";
    const weightDescription = l.weightMode === "average"
      ? "平均每尾 " + l.weights
      : l.weightMode === "individual"
        ? "各尾 " + l.weights
        : "每尾約 " + l.weights;
    return `<article class="listing-item">
      <div class="listing-item__top"><b>${l.species}</b><span class="badge ${up?'':'badge--coral'}">${l.status}</span></div>
      <div class="listing-item__meta">${l.tails} 尾 · ${weightDescription} 台斤</div>
      <div class="listing-item__meta">${l.region ? l.region + " · " : ""}${l.city || ""}${l.district || ""}</div>
      <div class="listing-item__price">
        <label>售價（元 / 台斤）</label>
        <input class="input" type="number" step="10" min="0" value="${l.price}" data-price="${l.id}">
        <button class="btn btn--ghost btn--sm" type="button" data-saveprice="${l.id}">儲存</button>
      </div>
      <div class="listing-item__acts">
        <button class="btn btn--ghost btn--sm" type="button" data-toggle="${l.id}">${up?'下架':'重新上架'}</button>
        <button class="btn btn--ghost btn--sm" type="button" data-del="${l.id}">刪除</button>
      </div>
    </article>`;
  }).join("") + `</div>`;
}
function chatPanelHTML(){
  const th = chatThreads();
  const head = `<div class="drawer__sec"><h4>聊聊</h4>
    <p class="drawer__note">買家與賣家的對話都在這裡。於漁獲詳情頁點「與賣家聊聊」即會建立對話。</p></div>`;
  if(!th.length){
    return head + `<div class="drawer__empty">目前沒有對話。<br>到「今日漁獲」任一件商品點「與賣家聊聊」即可開始。</div>`;
  }
  return head + `<div class="msg-list">${th.map(t=>`
    <button type="button" class="msg-item" data-thread="${t.key}">
      <span class="msg-item__av">${(t.peer||"對").slice(0,1)}</span>
      <span class="msg-item__body"><b>${t.peer}${t.role==='seller'?`（我賣 · ${t.item}）`:''}</b><span>${t.from==='me'?'我：':''}${t.last}</span></span>
      <span class="msg-item__dot"></span>
    </button>`).join("")}</div>`;
}
function handleAvatarFile(file){
  const err = document.getElementById("dr-av-err");
  const fail = m => { if(err){ err.textContent = m; err.classList.add("show"); } toast(m); };
  if(err){ err.textContent = ""; err.classList.remove("show"); }
  const typeOk = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if(!typeOk){ fail("格式不支援，僅接受 JPG / PNG / WEBP"); return; }
  if(file.size > 5 * 1024 * 1024){ fail("頭像超過 5MB 上限（" + (file.size/1048576).toFixed(2) + " MB）"); return; }
  const r = new FileReader();
  r.onload = e=>{
    try{ setUserAvatar(e.target.result); }
    catch(e2){ fail("瀏覽器儲存空間不足，請改用較小的圖片"); return; }
    toast("已更新頭像");
    renderAuthNav();
    renderDrawer();
  };
  r.readAsDataURL(file);
}
function bindDrawerBody(){
  const av = document.getElementById("dr-av-upload");
  if(av){
    const af = document.getElementById("dr-av-file");
    av.addEventListener("click", ()=> af.click());
    af.addEventListener("change", e=>{ if(e.target.files && e.target.files[0]) handleAvatarFile(e.target.files[0]); e.target.value = ""; });
    ["dragenter","dragover"].forEach(ev=> av.addEventListener(ev, e=>{ e.preventDefault(); av.classList.add("upload--drop"); }));
    ["dragleave","drop"].forEach(ev=> av.addEventListener(ev, e=>{ e.preventDefault(); av.classList.remove("upload--drop"); }));
    av.addEventListener("drop", e=>{ if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleAvatarFile(e.dataTransfer.files[0]); });
  }
  const avc = document.getElementById("dr-av-clear");
  if(avc) avc.addEventListener("click", ()=>{
    setUserAvatar("");
    toast("已移除頭像");
    renderAuthNav();
    renderDrawer();
  });
  const save = document.getElementById("dr-save");
  if(save) save.addEventListener("click", ()=>{
    const nick = document.getElementById("dr-nick-input").value.trim();
    let ok = true;
    ok = setSimple("dr-f-nick", nick.length >= 2 && nick.length <= 20, "dr-e-nick") && ok;
    if(!ok) return;
    const cur = getUser() || {};
    setUser({nick, phone: cur.phone || ""});
    toast("已儲存個人資訊");
    renderAuthNav();
    renderDrawer();
  });
  document.querySelectorAll("[data-saveprice]").forEach(b => b.addEventListener("click", ()=>{
    const id = b.dataset.saveprice;
    const inp = document.querySelector('[data-price="' + id + '"]');
    const n = Number(inp ? inp.value : 0);
    if(!n || n <= 0){ toast("請輸入大於 0 的售價"); return; }
    updateListing(id, {price:n});
    toast("已更新售價");
    renderDrawer();
  }));
  document.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", ()=>{
    const id = b.dataset.toggle;
    const item = getListings().find(x=>x.id===id);
    updateListing(id, {status: (item && item.status === "已下架") ? "上架中" : "已下架"});
    toast("已更新上架狀態");
    renderDrawer();
  }));
  document.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", ()=>{
    removeListing(b.dataset.del);
    toast("已刪除上架紀錄");
    renderDrawer();
  }));
  document.querySelectorAll("[data-thread]").forEach(b => b.addEventListener("click", ()=>{
    const t = chatThreads().find(x=>x.key === b.dataset.thread);
    if(!t) return;
    closeDrawer();
    if(t.role === "seller") openBuyerChat(t.peer, t.item);
    else openChat(t.peer, t.item);
  }));
}
function setSimple(fieldId, ok, errId){
  const f = document.getElementById(fieldId);
  if(f){ f.classList.toggle("invalid", !ok); f.classList.toggle("valid", ok); }
  const e = document.getElementById(errId);
  if(e) e.classList.toggle("show", !ok);
  return ok;
}
function initUserMenu(){
  ensureDrawer();
  refreshNavAvatar();
}

/* ============================================================
   後端資料載入（海人直送 × VMS API）
   ============================================================ */
/* [API 對接點] GET /api/fish/data → 併入 CATCH（同 key 覆蓋、新 key 追加）。
   app.js 既有的 render* 函式完全不動，只替換資料來源。
   連線失敗時保留下方的示意資料，介面不會空白，外觀維持不變。 */
async function loadCatchFromApi(){
  if(!window.HaisenAPI){ document.dispatchEvent(new CustomEvent("haisen:catch-ready")); return; }
  try{
    const rows = await window.HaisenAPI.listFish();
    const mapped = window.HaisenAPI.rowsToCatch(rows, SPECIES);
    const keys = Object.keys(mapped);
    if(keys.length){
      Object.assign(CATCH, mapped);
      // 後端已依 created_at DESC 排序；把新出現的 key 放到最前面。
      keys.slice().reverse().forEach(k=>{
        if(CATCH_ORDER.indexOf(k) === -1) CATCH_ORDER.unshift(k);
      });
    }
  }catch(e){
    console.warn("[HAISEN] 無法載入後端漁獲，改用示意資料：", e && e.message);
  }finally{
    document.dispatchEvent(new CustomEvent("haisen:catch-ready"));
  }
}

/* [API 對接點] GET /api/auth/me → 以既有 token 重新整理登入狀態與暱稱。 */
async function syncSessionFromApi(){
  if(!window.HaisenAPI || !window.HaisenAPI.getToken()) return;
  try{
    await window.HaisenAPI.me();
    renderAuthNav();
  }catch(e){
    // token 失效：清除本機狀態，維持未登入外觀。
    window.HaisenAPI.logout();
    renderAuthNav();
  }
}

/* ---------- 初始化 ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  initNav();
  initUserMenu();
  loadCatchFromApi();
  syncSessionFromApi();
});
