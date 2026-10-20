let ckRegion = getRegion();

/* 收件地區 chips */
function renderCkRegions(){
  document.getElementById("ck-region-chips").innerHTML = REGIONS.map(r=>
    `<button type="button" class="region-chip ${ckRegion===r?'on':''}" data-ck-region="${r}">${r}</button>`
  ).join("");
  document.querySelectorAll("[data-ck-region]").forEach(b=>{
    b.addEventListener("click", ()=>{
      ckRegion = b.dataset.ckRegion;
      setRegion(ckRegion);
      renderCkRegions();
      document.getElementById("e-ck-region").classList.remove("show");
    });
  });
}

/* 餐廳勾選 */
document.getElementById("ck-is-restaurant").addEventListener("change", e=>{
  document.getElementById("restaurant-name-wrap").style.display = e.target.checked ? "block" : "none";
});

function renderCart(){
  const c = getCart();
  const keys = Object.keys(c);
  const box = document.getElementById("cart-items");

  if(keys.length === 0){
    box.innerHTML = `<div style="padding:64px 0;text-align:center;border-bottom:1px solid var(--rule-2)">
      <p style="font-family:var(--font-display);font-size:1.15rem;margin-bottom:10px">購物車是空的</p>
      <p style="font-size:.86rem;color:var(--muted);margin-bottom:26px">今日漁獲數量有限，售完為止。</p>
      <a href="products.html" class="btn btn--primary">看今日漁獲</a>
    </div>`;
    updateSummary();
    return;
  }

  box.innerHTML = keys.map(key=>{
    const id = key;
    const p = CATCH[id];
    if(!p) return "";
    const unit = priceFor(id);
    return `<div class="cart-item">
      <div class="cart-item__img"><img src="${p.img}" alt="${p.name}"></div>
      <div>
        <h4><a href="${catchHref(id)}">${p.name}</a></h4>
        <div class="meta">${p.location} · ${p.caught} · 共 ${tailCount(id)} 尾 · 各尾約 ${tailRange(id).w} ${p.unit}</div>
        <div class="meta" style="margin-top:6px">${money(unit)} / ${p.unit}${soldOut(id)?'　<span style="color:var(--coral)">已售完</span>':''}</div>
        <button class="btn btn--quiet" style="margin-top:12px" onclick="removeItem('${key}')">移除</button>
      </div>
      <div style="text-align:right">
        <div class="qty-inline">
          <button type="button" onclick="chg('${key}',-1)" aria-label="減少">−</button>
          <input type="number" value="${c[key]}" min="1" max="${p.remaining}" onchange="chg('${key}',0,Number(this.value))" aria-label="數量">
          <button type="button" onclick="chg('${key}',1)" aria-label="增加">＋</button>
        </div>
        <div style="font-family:var(--font-display);font-size:1.1rem;font-weight:600;margin-top:12px">${money(unit * c[key])}</div>
      </div>
    </div>`;
  }).join("");

  updateSummary();
}

function chg(key, delta, abs){
  const c = getCart();
  const cur = c[key] || 1;
  const max = CATCH[key] ? CATCH[key].remaining : 1;
  let next = (abs !== undefined) ? abs : cur + delta;
  if(next < 1) next = 1;
  if(next > max) next = max;
  setQty(key, next);
  renderCart();
}
function removeItem(key){ setQty(key, 0); toast("已移除商品"); renderCart(); }

function updateSummary(){
  const c = getCart();
  const keys = Object.keys(c);
  let sub = 0;
  keys.forEach(key=>{ if(CATCH[key]) sub += priceFor(key) * c[key]; });

  document.getElementById("sum-lines").innerHTML = keys.length
    ? keys.map(k=>{
        const p = CATCH[k];
        return `<div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--muted);padding:3px 0"><span>${p.name} × ${c[k]}</span></div>`;
      }).join("")
    : '<p style="font-size:.82rem;color:var(--muted-2)">尚無商品</p>';

  document.getElementById("sum-sub").textContent = money(sub);
  document.getElementById("sum-total").textContent = money(sub);

  document.getElementById("place-btn").disabled = keys.length === 0;
}

async function placeOrder(e){
  e.preventDefault();
  const c = getCart();
  if(Object.keys(c).length === 0){ toast("購物車是空的"); return false; }

  if(!ckRegion){
    document.getElementById("e-ck-region").classList.add("show");
    toast("請選擇收件地區");
    return false;
  }

  const name = document.getElementById("ck-name").value || "貴賓";
  const addr = document.getElementById("ck-addr").value || "—";
  const isRest = document.getElementById("ck-is-restaurant").checked;
  const restName = document.getElementById("ck-restaurant").value;
  const ship = document.getElementById("ck-ship").value;
  const win = document.getElementById("ck-window").value;
  const pay = document.getElementById("ck-pay").value;
  const no = "HS" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Math.floor(Math.random()*9000)+1000);

  let sub = 0, count = 0;
  const lines = [];
  for(const key in c){
    const p = CATCH[key];
    if(!p) continue;
    const up = priceFor(key);
    sub += up * c[key]; count += c[key];
    lines.push(`<div><span>${p.name} × ${c[key]} ${p.unit}</span><b>${money(up*c[key])}</b></div>`);
  }
  document.getElementById("order-summary").innerHTML =
    `<div><span>訂單編號</span><b>${no}</b></div>
     <div><span>收件人</span><b>${name}${isRest && restName ? "（餐廳：" + restName + "）" : ""}</b></div>
     <div><span>收件地區</span><b>${ckRegion}</b></div>
     <div><span>收件地址</span><b>${addr}</b></div>
     <div><span>運送方式</span><b>${ship}</b></div>
     <div><span>到貨時段</span><b>${win}</b></div>
     <div><span>付款方式</span><b>${pay}</b></div>
     <div><span>品項</span><b>${lines.length} 種 · 共 ${count} 尾</b></div>
     <div><span>應付總額</span><b>${money(sub)}</b></div>`;

  /* [API 對接點] 買家下單 → 將各品項標記為「待付款」並記錄買家（鎖定庫存）。
     METHOD  : PUT
     ENDPOINT: /api/fish/data/{id}
     PARAMS  : { status: "PENDING_PAYMENT", buyer_id, buyer_name }
     資料庫  : fish_data(status, buyer_id, buyer_name)
     說明    : 後端無獨立訂單表，以下單即更新漁獲狀態表示交易成立。
               屬非阻斷流程，即使標記失敗仍顯示訂單成立畫面。 */
  if(window.HaisenAPI && window.HaisenAPI.getToken()){
    const me = window.HaisenAPI.getUser() || {};
    try{
      await Promise.all(Object.keys(c).map(k=>{
        const p = CATCH[k];
        if(!p || !p.inventoryId) return Promise.resolve();
        return window.HaisenAPI.updateFish(p.inventoryId, {
          status: "PENDING_PAYMENT",
          buyer_id: me.id,
          buyer_name: name
        });
      }));
    }catch(err){
      console.warn("[HAISEN] 訂單狀態同步失敗：", err && err.message);
    }
  }

  document.getElementById("order-modal").classList.add("show");
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  renderCart();
  return false;
}

renderCkRegions();
renderCart();
