let ITEM, p;
function pickItem(){
  const REQ = getParam("id");
  ITEM = (REQ && CATCH[REQ]) ? REQ : "amberjack";
  p = CATCH[ITEM];
  window.ITEM = ITEM;
}

function renderDetail(){
  pickItem();

  /* 主圖與縮圖 */
  document.getElementById("pd-main").src = p.img;
  document.getElementById("pd-main").alt = p.name;
  const gallery = [p.img, "../assets/images/catch-still.jpg", "../assets/images/seabream.png", "../assets/images/grouper.jpg"];
  document.getElementById("pd-thumbs").innerHTML = gallery.map((src,i)=>
    `<div class="${i===0?'on':''}"><img src="${src}" alt="${p.name} 照片 ${i+1}"></div>`
  ).join("");
  document.querySelectorAll(".pd__thumbs div").forEach(d=>{
    d.addEventListener("click", ()=>{
      document.querySelectorAll(".pd__thumbs div").forEach(x=>x.classList.remove("on"));
      d.classList.add("on");
      document.getElementById("pd-main").src = d.querySelector("img").src;
    });
  });

  /* 標題與基本資訊 */
  document.title = p.name + " — 今日漁獲詳情 | 海人直送";
  document.getElementById("crumb-name").textContent = p.name;
  document.getElementById("pd-name").textContent = p.name;
  document.getElementById("pd-latin").textContent = p.latin;
  document.getElementById("pd-region").textContent = p.region;
  document.getElementById("pd-rating").textContent = "評分 " + p.seller.rating + " / " + p.seller.deals + " 筆成交";
  document.getElementById("pd-price").innerHTML = money(p.price) + `<span class="unit"> / ${p.unit}</span>`;
  document.getElementById("pd-stock-note").innerHTML = soldOut(ITEM)
    ? '<b style="color:var(--coral)">已售完</b>'
    : `可購買 <b style="color:var(--ink)">${p.remaining} 尾</b> · 共 ${tailCount(ITEM)} 尾上架`;
  document.getElementById("subtotal").textContent = money(p.price);
  document.getElementById("pd-qty").textContent = p.remaining;
  document.getElementById("pd-qty-inline").textContent = p.remaining;

  /* 規格表（買家視角：魚種、這尾重量、產地、捕獲時間、處理方式） */
  document.getElementById("pd-spec").innerHTML = `
    <div>魚種</div><div>${p.name}（${p.latin}）</div>
    <div>捕獲時間</div><div>${p.caught}</div>
    <div>產地 / 地區</div><div>${p.location}（${p.region}）</div>
    <div>捕獲海域</div><div>${p.sea}</div>
    <div>可購買尾數</div><div><b style="color:var(--ink)">${p.remaining} 尾</b>（共 ${tailCount(ITEM)} 尾上架）</div>
    <div>各尾重量</div><div>${p.tails.map((t,i)=>`第 ${i+1} 尾：約 ${t.weight} ${p.unit}`).join("<br>")}</div>
    <div>處理方式</div><div>${p.process}${p.processNote ? "　" + p.processNote : ""}</div>
    <div>庫存</div><div>${soldOut(ITEM) ? '<b style="color:var(--coral)">已售完</b>' : `可購買 ${p.remaining} 尾`}</div>
    <div>保存方式</div><div>0–4°C 冷藏，建議 2 日內食用完畢</div>`;

  /* 運送與付款 */
  document.getElementById("pd-ship").innerHTML = `
    <div>運送方式</div><div>${p.shipping.join("、")}</div>
    <div>到貨時間</div><div>隔日 08:00–12:00（可備註指定時段）</div>
    <div>付款方式</div><div>${p.payment.join("、")}</div>
    <div>定金</div><div>${p.deposit.on ? ("需付定金 " + money(p.deposit.amount)) : "免定金"}</div>`;

  /* 釣客資訊 */
  document.getElementById("seller-av").textContent = p.seller.name.slice(0,1);
  document.getElementById("seller-name").textContent = p.seller.name;
  document.getElementById("seller-meta").textContent = p.seller.region + "・" + p.seller.location + " · 一支釣資歷 20+ 年";
  document.getElementById("seller-region").textContent = p.seller.region;
  document.getElementById("seller-deals").textContent = p.seller.deals + " 筆";
  document.getElementById("seller-rating").textContent = p.seller.rating + " / 5.0（96 則）";

  /* 其他漁獲 */
  document.getElementById("related").innerHTML =
    CATCH_ORDER.filter(id=>id!==ITEM).slice(0,4).map(catchCardHTML).join("");
}
renderDetail();
/* [資料綁定] 後端漁獲載入完成後重繪詳情頁（支援新上架商品 id，如 f<id>）。 */
document.addEventListener("haisen:catch-ready", renderDetail);
