/* 上架與逐欄修改的提示詞；處理方式只舉例，不列固定選項。 */

export const SPECIES_QUESTION = "請問想要販售什麼魚類？";

export const QUESTIONS = {
  fish_species: SPECIES_QUESTION,
  weight_kg: "這批總重大約幾公斤？（也可以說台斤）",
  quantity: "總共幾尾？",
  condition: "目前的處理方式是？（例如：活體、放血冰鎮）",
  photo_url: "請提供一張商品照片，請用相機圖示上傳。",
  price: "請問要販賣多少錢？（可回覆每台斤價格或整批價格）"
};

/* 使用者答非所問時只差在語氣，其餘沿用一般提問。 */
export const ASK_AGAIN = Object.assign({}, QUESTIONS, {
  weight_kg: "請問這批大約幾公斤？",
  quantity: "請問總共幾尾？",
  price: "請提供每台斤或整批價格。"
});

export const EDIT_PROMPTS = {
  fish_species: "請提供新的魚種。",
  weight_kg: "請提供新的總重（公斤）。",
  quantity: "請提供新的尾數。",
  condition: "請提供新的處理方式（例如：活體、放血冰鎮）。",
  photo_url: "請點輸入框左邊的相機圖示，重新上傳照片。",
  price: "請提供新的每台斤或整批售價。"
};

const DETAIL_LABELS = {
  weight_kg: "重量",
  condition: "處理方式",
  photo_url: "一張商品照片"
};

const DETAIL_ORDER = ["weight_kg", "condition", "photo_url"];

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] || "";
  return labels.slice(0, -1).join("、") + "，與" + labels[labels.length - 1];
}

/* 先只問魚種；魚種有了再一起問重量、處理方式與照片，不用「還需要」。 */
export function batchFollowupPrompt(missing) {
  if (missing.indexOf("fish_species") !== -1) return SPECIES_QUESTION;
  const details = DETAIL_ORDER.filter(function (slot) {
    return missing.indexOf(slot) !== -1;
  });
  if (details.length === 1 && details[0] === "photo_url") {
    return QUESTIONS.photo_url;
  }
  if (details.length) {
    let text = "請問你要販售魚種的" + joinLabels(details.map(function (slot) {
      return DETAIL_LABELS[slot];
    })) + "（可以一次告訴我）。";
    if (details.indexOf("condition") !== -1) text += "處理方式例如：活體、放血冰鎮。";
    return text;
  }
  return QUESTIONS[missing[0]] || "請補齊上架資料。";
}
