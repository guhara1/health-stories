// 변형 엔진 — 도어웨이/유사·복사 방지용
// 한 페이지의 각 문단·문장·목록을 서로 "독립적인" 시드로 선택하여
// 같은 역명/동명이 다른 도시에 있어도 본문이 충분히 달라지게 한다.
//
// 핵심: 슬롯마다 base 문자열에 슬롯 이름을 덧붙여 별도 해시를 만들면
// 한 페이지 안에서 8~12개의 독립적인 선택축이 생겨 조합 수가 폭발한다.

export function vseed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // 추가 확산(avalanche)
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

// 슬롯별 독립 단일 선택
export function vpick(base, slot, arr) {
  return arr[vseed(base + "␟" + slot) % arr.length];
}

// 슬롯별 독립 다중 선택 (n개, 시드 셔플 후 앞에서 n개) — 순서까지 페이지마다 달라짐
export function vsubset(base, slot, arr, n) {
  const idx = arr.map((_, i) => i);
  // Fisher–Yates, 시드 LCG
  let s = vseed(base + "␟" + slot + "␟sub");
  for (let i = idx.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  return idx.slice(0, Math.min(n, arr.length)).map((i) => arr[i]);
}

// 슬롯별 독립 순열 (섹션 순서 셔플 등)
export function vshuffle(base, slot, arr) {
  return vsubset(base, slot, arr, arr.length);
}

// 0/1 토글 (슬롯 기반 불리언)
export function vflag(base, slot) {
  return (vseed(base + "␟" + slot) & 1) === 1;
}
