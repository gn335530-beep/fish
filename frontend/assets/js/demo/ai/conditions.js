/* 處理方式抽取與未知魚種猜測：處理方式保留原句片段，白名單只用於辨識。 */

const CONDITION_WORDS = [
  "還活著", "放血冰鎮", "三去處理", "去內臟", "處理好", "清內臟",
  "活體", "活魚", "活跳", "蓄養", "放血", "冰鎮", "碎冰", "冰水",
  "三去", "去鱗", "去鰓", "宰殺", "冷凍", "殺好", "已殺", "現殺",
  "去頭", "去尾", "切片", "真空", "剖肚", "凍"
].sort(function (a, b) { return b.length - a.length; });

const CONDITION_NOISE = CONDITION_WORDS.join("|");

const INTENT_NOISE = /(?:我要賣|我要買|想賣|想買|要賣|要買|賣魚|買魚|上架|出售|賣掉|剛釣到|剛釣|釣到|捕獲|今天|現在|目前|最近|近期|這幾天|幫我|請問|麻煩|謝謝|感謝)/g;

const LEADING = /^(?:我們|已經|有|是|為|叫|叫做|大概|大約|左右|差不多|幫我|麻煩|請|今天|現在|目前|最近|近期|這幾天|的)+/;
const TRAILING = /(?:了|啦|喔|啊|耶|吧|呢|嘛|哦|謝謝|感謝|麻煩了|拜託)+[。.!！?？,，;；\s]*$/;

const GENERIC = [
  "魚", "海鮮", "海產", "東西", "什麼", "什麼魚", "怎麼", "如何", "多少",
  "價格", "價錢", "這個", "那個", "未知", "魚種", "不知道", "我", "你", "他",
  "好", "要", "有", "是", "的"
];

export function cleanCondition(text) {
  return String(text || "").trim().replace(/[。.!！?？,，;；]+$/, "").trim();
}

function trimPhrase(text) {
  let phrase = String(text || "").replace(/[，,。.!！?？、:：;；\s]+/g, " ").trim();
  let previous;
  do {
    previous = phrase;
    phrase = phrase.replace(LEADING, "").trim();
  } while (phrase !== previous && phrase);
  phrase = phrase.replace(TRAILING, "").trim();
  phrase = phrase.replace(/\d+(?:\.\d+)?\s*(?:元|塊|公斤|kg|台斤|斤|尾|條|隻|份)?$/i, "").trim();
  phrase = phrase.replace(/\s+[一二兩三四五六七八九十百千]+\s*(?:尾|條|隻|份)$/, "").trim();
  return phrase;
}

function cleanPhrase(text, speciesName) {
  let phrase = String(text || "");
  if (speciesName) phrase = phrase.split(speciesName).join(" ");
  return trimPhrase(phrase.replace(INTENT_NOISE, " "));
}

/* 從原句找出最早出現的白名單詞，再保留它之後的整段說法。 */
function anchoredPhrase(text, speciesName) {
  let index = -1;
  let word = "";
  CONDITION_WORDS.forEach(function (candidate) {
    const found = text.indexOf(candidate);
    if (found === -1) return;
    if (index === -1 || found < index || (found === index && candidate.length > word.length)) {
      index = found;
      word = candidate;
    }
  });
  if (index === -1) return "";
  return cleanPhrase(text.slice(index), speciesName) || word;
}

function residualPhrase(text, speciesName) {
  return cleanPhrase(text, speciesName);
}

/* 沒命中白名單時仍保留剩下的原句，不硬改成白名單詞。 */
export function extractCondition(text, speciesName) {
  const source = String(text || "").trim();
  if (!source) return "";
  const anchored = anchoredPhrase(source, speciesName);
  if (anchored) return anchored;
  const phrase = residualPhrase(source, speciesName);
  if (!/[\u4e00-\u9fff]/.test(phrase)) return "";
  if (GENERIC.indexOf(phrase) !== -1) return "";
  return phrase;
}

/* 字典沒有的魚種：移除意圖、數量、單位與處理方式後，留下名稱。 */
export function guessUnknownSpecies(text) {
  const noise = new RegExp("我要買魚|我要買|想買|要買|買魚|我要賣魚|我要賣|想賣|要賣|賣魚|上架|出售|賣掉|剛釣到|剛釣|釣到|捕獲|今天|現在|目前|最近|近期|這幾天|幫我|請問|不知道|不確定|忘了|我的|想要|想|大概|大約|左右|差不多|怎麼|什麼魚|什麼|如何|多少|價錢|價格|錢|行情|均價|平均|批發|公斤|kg|KG|Kg|台斤|斤|尾|條|隻|份|元|塊|" + CONDITION_NOISE + "|照片|上傳|一張|一隻|一條|一尾|兩隻|兩條|兩尾|新鮮|現流|最後|這尾|這個|這張|那尾|那個|第|個|我|你|他|的|約|賣", "g");
  const candidate = String(text || "")
    .replace(noise, " ")
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/[一二兩三四五六七八九十]+/g, " ")
    .replace(/^(的|是|為|叫|叫做)+/, "")
    .replace(/[啦喔啊耶吧呢]/g, "")
    .replace(/[，,。.!！?？、:：;；\s]/g, "");

  if (candidate.length < 2 || candidate.length > 20) return "";
  if (!/[\u4e00-\u9fff]/.test(candidate)) return "";
  if (["魚", "海鮮", "海產", "東西", "什麼", "什麼魚", "怎麼", "如何", "多少", "價格", "價錢", "這個", "那個", "未知", "魚種", "不知道"].indexOf(candidate) !== -1) return "";
  return candidate;
}
