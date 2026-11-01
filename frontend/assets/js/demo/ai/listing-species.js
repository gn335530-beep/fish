/* 上架魚種：用名稱查官方代碼；單一候選自動採用，多候選回問，查無也不擋上架。 */

import { lookupSpecies } from "../../api/market.js";

export async function resolveCandidates(name) {
  const text = String(name || "").trim();
  if (!text) return [];
  try {
    const data = await lookupSpecies(text);
    return (data && data.candidates) || [];
  } catch (error) {
    return [];
  }
}

function namesOf(row) {
  return [row.official_name].concat(row.aliases || []);
}

/* 先比完整名稱；只有一個候選被句子包含時才選，避免誤配到較短的名稱。 */
export function matchCandidate(text, candidates) {
  const source = String(text || "").trim();
  const exact = candidates.filter(function (row) {
    return namesOf(row).some(function (name) { return name === source; });
  });
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const contained = candidates.filter(function (row) {
    return namesOf(row).some(function (name) { return source.indexOf(name) !== -1; });
  });
  return contained.length === 1 ? contained[0] : null;
}

export function candidateReply(context, name, candidates) {
  const labels = candidates.map(function (row) {
    return row.official_name;
  }).join("、");
  return {
    context: Object.assign({}, context, {
      listing_pending: { name: name, candidates: candidates },
      market_quoted: false
    }),
    replies: [{ text: "搜尋到多種" + name + "，請問是哪一種" + name + "？請選擇：" + labels }]
  };
}
