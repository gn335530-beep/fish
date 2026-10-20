/* ============ 行情資料（以澎湖魚市為基準） ============ */
const MARKET = {
  amberjack:{avg:486, high:528, low:452, wow:-1.2, label:"紅鰹",
    comp:[["新發號","一支釣",492],["進豐號","一支釣",478],["海豐號","延繩釣",468]]},
  seabream:{avg:648, high:672, low:620, wow:+0.8, label:"嘉鱲",
    comp:[["新發號","一支釣",655],["順興號","一支釣",640],["海豐號","網具",618]]},
  grouper:{avg:742, high:768, low:712, wow:+1.4, label:"玳瑁石斑",
    comp:[["新發號","一支釣",750],["吉利號","一支釣",736],["海豐號","一支釣",724]]},
  tuna:{avg:1580, high:1620, low:1540, wow:+0.4, label:"黑鮪",
    comp:[["新發號","一支釣",1595],["進豐號","延繩釣",1560],["吉利號","一支釣",1572]]},
  seabass:{avg:402, high:418, low:386, wow:-0.6, label:"海鱸",
    comp:[["新發號","一支釣",408],["進豐號","一支釣",396],["順興號","網具",378]]},
  mackerel:{avg:168, high:176, low:158, wow:+0.9, label:"白腹鯖",
    comp:[["新發號","一支釣",172],["海豐號","網具",162],["順興號","一支釣",164]]},
  squid:{avg:392, high:406, low:374, wow:-2.1, label:"澎湖小卷",
    comp:[["新發號","活餌一支釣",398],["進豐號","活餌一支釣",386],["吉利號","網具",372]]}
};
const HIST = {
  amberjack:[438,445,452,461,468,459,455,448,462,475,470,481,489,486],
  seabream:[612,618,625,632,640,651,648,639,635,644,652,658,660,648],
  mackerel:[152,149,155,158,162,166,168,163,159,161,164,167,170,168],
  grouper:[702,710,718,726,735,742,738,730,725,733,740,745,748,742],
  squid:[360,368,375,382,390,398,392,386,380,384,390,396,400,392],
  tuna:[1480,1495,1520,1545,1560,1575,1580,1568,1550,1562,1570,1578,1585,1580],
  seabass:[378,382,388,392,398,404,402,396,392,395,400,405,410,402]
};
const LABELS = ["7/11","7/18","7/25","8/01","8/08","8/15","8/22","8/29","9/05","9/12","9/19","9/26","10/03","10/08"];

function marketFor(id){
  if(MARKET[id]) return MARKET[id];
  const sp = speciesById(id);
  const avg = sp ? sp.market : 300;
  return {avg, high:Math.round(avg*1.08), low:Math.round(avg*0.92), wow:0, label: sp?sp.name:"—",
    comp:[["新發號","一支釣",Math.round(avg*1.01)],["進豐號","一支釣",Math.round(avg*0.98)],["海豐號","網具",Math.round(avg*0.95)]]};
}
function histFor(id){
  if(HIST[id]) return HIST[id];
  const avg = marketFor(id).avg;
  return LABELS.map((_,i)=> Math.round(avg * (0.9 + 0.2*(i/(LABELS.length-1))) ));
}

let curSpecies = "amberjack";

function renderMarket(id){
  const m = marketFor(id);
  /* 魚種欄位旁的均價 */
  document.getElementById("sm-avg").innerHTML = money(m.avg) + '<span class="u"> / 台斤</span>';
  document.getElementById("sm-high").textContent = money(m.high);
  document.getElementById("sm-low").textContent = money(m.low);
  document.getElementById("sm-wow").textContent = (m.wow > 0 ? "+" : "") + m.wow + "%";
  /* 右側面板 */
  document.getElementById("mk-avg").innerHTML = money(m.avg) + '<span class="unit"> / 台斤</span>';
  document.getElementById("mk-high").textContent = money(m.high);
  document.getElementById("mk-low").textContent = money(m.low);
  document.getElementById("mk-wow").textContent = (m.wow > 0 ? "+" : "") + m.wow + "%";
  document.getElementById("hist-species").textContent = m.label;

  document.getElementById("chart-hist").innerHTML = lineChart(
    histFor(id).map((v,i)=>({label:LABELS[i], value:v})),
    {w:420, h:170, color:"#14343F", fill:"rgba(20,52,63,.055)"}
  );

  document.getElementById("compet").innerHTML =
    "<tr><th>釣客</th><th>作業方式</th><th style='text-align:right'>均價</th></tr>" +
    m.comp.map(r=>`<tr><td>${r[0]}</td><td style="color:var(--muted);font-size:.8rem">${r[1]}</td><td style="text-align:right;font-family:var(--font-display)">${money(r[2])}</td></tr>`).join("");

  const s = m.avg;
  document.getElementById("advice").innerHTML = `
    <div class="bulk-row" onclick="setPrice(${Math.round(s*0.92/10)*10})" style="cursor:pointer">
      <div><div class="g">快速成交價</div><div class="s">低於均價 8% · 當日完售機率高</div></div>
      <div class="advice__price">${money(Math.round(s*0.92/10)*10)}</div>
    </div>
    <div class="bulk-row" onclick="setPrice(${Math.round(s/10)*10})" style="cursor:pointer">
      <div><div class="g">均衡價（建議）</div><div class="s">貼近今日澎湖魚市均價</div></div>
      <div class="advice__price">${money(Math.round(s/10)*10)}</div>
    </div>
    <div class="bulk-row" onclick="setPrice(${Math.round(s*1.08/10)*10})" style="cursor:pointer">
      <div><div class="g">職人溢價</div><div class="s">高於均價 8% · 強調一支釣鮮度</div></div>
      <div class="advice__price">${money(Math.round(s*1.08/10)*10)}</div>
    </div>`;
  document.getElementById("price-hint").textContent = "參考魚市均價：" + money(s) + " / 台斤";
  checkPrice();
}
function setPrice(v){
  document.getElementById("price").value = v;
  checkPrice(); validate();
}
