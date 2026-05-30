export const EXPENSE_RULES: { cat: string; kws: string[] }[] = [
  { cat: "사례비",     kws: ["사례비", "목사사례", "전도사사례", "목사님사례", "사례"] },
  { cat: "교회관리비", kws: ["교회관리", "관리비", "코웨이", "정수기", "냉방", "난방", "전기세", "수도세", "청소비", "렌탈"] },
  { cat: "보험료",     kws: ["보험료", "보험", "한화손보", "한화생명", "국민건강", "건강보험", "화재보험", "생명보험"] },
  { cat: "현대카드",   kws: ["현대카드", "카드대금", "카드비"] },
  { cat: "대출이자",   kws: ["대출이자", "이자", "은행이자", "원리금"] },
  { cat: "선교비",     kws: ["선교비", "선교", "해외선교", "국내선교", "선교사"] },
  { cat: "목회활동비", kws: ["목회활동", "활동비", "목회비", "교역자"] },
  { cat: "행정비",     kws: ["행정비", "사무비", "소모품", "문구", "복사", "인쇄"] },
  { cat: "식비",       kws: ["식비", "식사", "점심", "저녁", "간식", "음식", "배달"] },
  { cat: "교육비",     kws: ["교육비", "교육", "훈련", "세미나", "수련회", "강사비"] },
  { cat: "구제비",     kws: ["구제비", "구제", "도움", "후원", "헌물"] },
  { cat: "건축비",     kws: ["건축비", "건축", "리모델링", "공사", "수리", "인테리어"] },
  { cat: "차량비",     kws: ["차량비", "차량", "주유", "유류비", "자동차"] },
  { cat: "통신비",     kws: ["통신비", "전화비", "인터넷", "핸드폰"] },
  { cat: "기타",       kws: ["기타"] },
];

export const OFFERING_RULES: { kind: string; kws: string[] }[] = [
  { kind: "십일조헌금",   kws: ["십일조", "1/10", "10분의1"] },
  { kind: "감사헌금",     kws: ["감사헌금", "감사"] },
  { kind: "주일헌금",     kws: ["주일헌금", "주일"] },
  { kind: "건축헌금",     kws: ["건축헌금", "건축"] },
  { kind: "선교헌금",     kws: ["선교헌금", "선교"] },
  { kind: "구역예배헌금", kws: ["구역예배", "구역"] },
  { kind: "특별헌금",     kws: ["특별헌금", "특별"] },
  { kind: "절기헌금",     kws: ["절기헌금", "성탄", "부활", "추수감사"] },
  { kind: "봉헌",         kws: ["봉헌"] },
  { kind: "성금",         kws: ["성금"] },
  { kind: "기타헌금",     kws: ["기타"] },
];

export function detectExpenseCat(text: string): string | null {
  const t = text.toLowerCase().replace(/\s+/g, "");
  for (const rule of EXPENSE_RULES) {
    if (rule.kws.some((kw) => t.includes(kw.toLowerCase()))) return rule.cat;
  }
  return null;
}

export function detectOfferingKind(text: string): string | null {
  const t = text.toLowerCase().replace(/\s+/g, "");
  for (const rule of OFFERING_RULES) {
    if (rule.kws.some((kw) => t.includes(kw.toLowerCase()))) return rule.kind;
  }
  return null;
}

export function parseKoreanAmount(text: string): number {
  let t = text.replace(/,/g, "").replace(/원/g, "").trim();
  let total = 0;
  const okuM = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (okuM) { total += parseFloat(okuM[1]) * 1e8; t = t.replace(okuM[0], ""); }
  const baekmanM = t.match(/(\d+(?:\.\d+)?)\s*백만/);
  if (baekmanM) { total += parseFloat(baekmanM[1]) * 1e6; t = t.replace(baekmanM[0], ""); }
  else {
    const manM = t.match(/(\d+(?:\.\d+)?)\s*만/);
    if (manM) { total += parseFloat(manM[1]) * 10000; t = t.replace(manM[0], ""); }
  }
  const cheonM = t.match(/(\d+(?:\.\d+)?)\s*천/);
  if (cheonM) { total += parseFloat(cheonM[1]) * 1000; t = t.replace(cheonM[0], ""); }
  if (total > 0) return Math.round(total);
  const bigNum = t.match(/\d{4,}/); if (bigNum) return parseInt(bigNum[0]);
  const anyNum = t.match(/\d+/); if (anyNum) return parseInt(anyNum[0]);
  return 0;
}
