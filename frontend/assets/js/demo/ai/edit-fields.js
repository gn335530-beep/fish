/* 草稿欄位定義與自由文字比對：最長別名優先，避免「魚」搶走整句。 */

export const DRAFT_FIELDS = [
  { slot: "fish_species", label: "魚種" },
  { slot: "weight_kg", label: "總重" },
  { slot: "quantity", label: "尾數" },
  { slot: "condition", label: "處理方式" },
  { slot: "photo_url", label: "照片" },
  { slot: "price", label: "售價" }
];

const EDIT_ALIASES = {
  fish_species: ["魚種", "魚名"],
  weight_kg: ["重量", "總重", "公斤", "kg"],
  quantity: ["尾數", "數量", "幾尾", "尾"],
  condition: ["處理方式", "處理"],
  photo_url: ["照片", "相片", "圖片"],
  price: ["售價", "價格", "價錢", "每台斤", "整批", "元"]
};

export const EDIT_LABELS = {};
DRAFT_FIELDS.forEach(function (field) { EDIT_LABELS[field.slot] = field.label; });

/* 找出句子裡最長的欄位別名；回傳 { slot, alias } 或 null。 */
export function findEditField(text) {
  const source = String(text || "");
  let best = null;
  DRAFT_FIELDS.forEach(function (field) {
    (EDIT_ALIASES[field.slot] || []).forEach(function (alias) {
      if (source.indexOf(alias) === -1) return;
      if (!best || alias.length > best.alias.length) best = { slot: field.slot, alias: alias };
    });
  });
  return best;
}

const CONNECTORS = /^\s*(?:我(?:想|要))?\s*(?:把|將)?\s*(?:改成|改為|改|換成|換|變成|調整成|調整為|設為|修改成|修改為|是|為|[:：])?\s*/;

/* 去掉欄位詞與前面的連接詞，留下可抽取的值。 */
export function stripFieldWords(text, match) {
  let rest = String(text || "");
  /* 魚種與處理方式會把整句當成名稱／描述，必須先移除欄位詞。 */
  if (match.slot === "fish_species" || match.slot === "condition") {
    rest = rest.replace(match.alias, " ");
  }
  return rest.replace(CONNECTORS, "").trim();
}
