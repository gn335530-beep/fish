/* ============================================================
   海人直送 HAISEN — app.js  v5.0
   個人釣客上網販售當日漁獲 · 可販售多尾，每尾標示重量 · 買家為一般個人消費者
   魚種資料 / 示意漁獲 / 共用小工具
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

/* ---------- 今日漁獲（示意資料；可販售多尾，每尾有重量） ----------
   注意：此物件為「示意/離線」資料。頁面載入後會由 loadCatchFromApi()
   以 GET /api/fish/data 的結果覆蓋（同 key）或追加（新 key）。
   保留它可確保後端未啟動時介面仍有內容、外觀不變。 */
let CATCH = {
  amberjack: {
    name:"現流紅魽", latin:"Seriola dumerili",
    img:"../assets/images/amberjack.png",
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
    img:"../assets/images/seabream.png",
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
    img:"../assets/images/grouper.jpg",
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
    img:"../assets/images/tuna.jpg",
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
    img:"../assets/images/seabass.png",
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
    img:"../assets/images/mackerel.jpg",
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
    img:"../assets/images/squid.jpg",
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

/* 供內嵌 onclick 事件處理器（例如 product-detail 的 FishMatchBot.open()）
   透過全域物件解析 CATCH。Object.assign 只變更內容、不換綁定，故此參考恆有效。 */
window.CATCH = CATCH;

/* ---------- 小工具 ---------- */
function money(n){ return "$" + Number(n).toLocaleString("en-US"); }
function getParam(name){
  try { return new URLSearchParams(location.search).get(name); } catch(e){ return null; }
}
function catchHref(id){ return "product-detail.html?id=" + encodeURIComponent(id); }
function soldOut(id){ return CATCH[id].remaining <= 0; }
function tailCount(id){ const p = CATCH[id]; return p && p.tails ? p.tails.length : 0; }
function tailRange(id){
  const p = CATCH[id];
  if(!p || !p.tails || !p.tails.length) return {w:"—"};
  const ws = p.tails.map(t=>t.weight);
  const fmt = a => { const mn = Math.min(...a), mx = Math.max(...a); return mn === mx ? String(mn) : mn + "–" + mx; };
  return {w: fmt(ws)};
}
