/* 上架與逐欄修改的提示詞；處理方式只舉例，不列固定選項。 */

export const QUESTIONS = {
  fish_species: "請問釣到的是什麼魚？",
  weight_kg: "這批總重大約幾公斤？（也可以說台斤）",
  quantity: "總共幾尾？",
  condition: "目前的處理方式是？（例如：活體、放血冰鎮）",
  photo_url: "還需要一張實拍照片，請點輸入框左邊的相機圖示上傳。",
  price: "請問要販賣多少錢？（可回覆每台斤價格或整批價格）"
};

export const ASK_AGAIN = {
  fish_species: "還缺魚種，請問釣到的是什麼魚？",
  weight_kg: "還缺重量，這批大約幾公斤？",
  quantity: "還缺尾數，總共幾尾？",
  condition: "還缺處理方式，請描述目前的處理方式（例如：活體、放血冰鎮）。",
  photo_url: "還缺照片，請點相機圖示上傳一張實拍照片。",
  price: "還缺售價，請提供每台斤或整批價格。"
};

export const EDIT_PROMPTS = {
  fish_species: "請提供新的魚種。",
  weight_kg: "請提供新的總重（公斤）。",
  quantity: "請提供新的尾數。",
  condition: "請提供新的處理方式（例如：活體、放血冰鎮）。",
  photo_url: "請點輸入框左邊的相機圖示，重新上傳照片。",
  price: "請提供新的每台斤或整批售價。"
};

const NON_PRICE_LABELS = {
  fish_species: "魚種",
  weight_kg: "重量",
  quantity: "尾數",
  condition: "處理方式",
  photo_url: "照片"
};

function exampleFor(missing) {
  const parts = [];
  if (missing.indexOf("fish_species") !== -1) parts.push("石斑");
  if (missing.indexOf("weight_kg") !== -1) parts.push("3 公斤");
  if (missing.indexOf("quantity") !== -1) parts.push("2 尾");
  if (missing.indexOf("condition") !== -1) parts.push("放血冰鎮");
  return parts.join(" ");
}

/* 第一次進上架流程時列出所有缺的非價格欄位，不問價格。 */
export function batchFollowupPrompt(missing) {
  if (missing.length === 1 && missing[0] === "photo_url") {
    return "還需要一張照片，請用相機圖示上傳。";
  }
  const labels = missing.map(function (slot) { return NON_PRICE_LABELS[slot] || slot; });
  const example = exampleFor(missing.filter(function (slot) { return slot !== "photo_url"; }));
  let text = "還需要：" + labels.join("、") + "。";
  if (example) text += "可以一次告訴我，例如「" + example + "」。";
  if (missing.indexOf("photo_url") !== -1) text += "照片請用相機圖示上傳。";
  return text;
}
