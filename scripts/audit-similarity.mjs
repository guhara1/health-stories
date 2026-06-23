// 도어웨이/유사·복사/중복 감사 스크립트
// - 타이틀·메타 디스크립션 정확 중복 검사
// - 본문(고유 콘텐츠) 글자 수 검사
// - MinHash + LSH 로 near-duplicate(유사·도어웨이) 쌍 탐지
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("find dist -name index.html", { encoding: "utf8" })
  .trim()
  .split("\n");

// ---------- HTML -> 고유 본문 텍스트 추출 ----------
function extractMain(html) {
  let m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let s = m ? m[1] : html;
  // 전 페이지 공통 보일러플레이트 제거 (요금표/후기/JSON-LD/script/style)
  s = s.replace(/<section class="pricing[\s\S]*?<\/section>/gi, " ");
  s = s.replace(/<section class="reviews[\s\S]*?<\/section>/gi, " ");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  // 태그 제거 + 공백 정리
  s = s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
function meta(html, re) {
  const m = html.match(re);
  return m ? m[1] : "";
}

const docs = files.map((f) => {
  const html = readFileSync(f, "utf8");
  const text = extractMain(html);
  return {
    path: f.replace(/^dist/, "").replace(/index\.html$/, ""),
    title: meta(html, /<title>([\s\S]*?)<\/title>/i),
    desc: meta(html, /<meta name="description" content="([^"]*)"/i),
    text,
    // 글자 수: 한글 기준 공백 제외
    chars: text.replace(/\s/g, "").length,
  };
});

// ---------- 1) 타이틀/디스크립션 정확 중복 ----------
function dupReport(key) {
  const map = new Map();
  for (const d of docs) {
    const v = d[key];
    if (!map.has(v)) map.set(v, []);
    map.get(v).push(d.path);
  }
  const dups = [...map.entries()].filter(([, ps]) => ps.length > 1);
  return dups;
}
const titleDups = dupReport("title");
const descDups = dupReport("desc");

// ---------- 2) 본문 글자 수 ----------
const lens = docs.map((d) => d.chars).sort((a, b) => a - b);
const under2000 = docs.filter((d) => d.chars < 2000);
const min = lens[0], max = lens[lens.length - 1];
const median = lens[Math.floor(lens.length / 2)];

// ---------- 3) MinHash + LSH near-duplicate ----------
const K = 5;       // shingle 크기(단어)
const NUM = 96;    // minhash 개수
const BANDS = 24;  // LSH 밴드 (rows = NUM/BANDS = 4)
const ROWS = NUM / BANDS;

// 해시 계수 (서로 다른 96개 해시 함수)
const A = [], B = [];
let seed = 0x9e3779b1 >>> 0;
const rnd = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed >>> 0;
};
for (let i = 0; i < NUM; i++) { A.push((rnd() | 1) >>> 0); B.push(rnd() >>> 0); }
const MOD = 4294967311; // prime > 2^32 (BigInt 불필요하게 근사)

function shingles(text) {
  const w = text.split(" ").filter(Boolean);
  const set = new Set();
  for (let i = 0; i + K <= w.length; i++) {
    const sh = w.slice(i, i + K).join(" ");
    // 32-bit FNV-ish 해시
    let h = 2166136261 >>> 0;
    for (let j = 0; j < sh.length; j++) { h ^= sh.charCodeAt(j); h = Math.imul(h, 16777619) >>> 0; }
    set.add(h);
  }
  return [...set];
}

function minhash(shs) {
  const sig = new Array(NUM).fill(0xffffffff);
  for (const x of shs) {
    for (let i = 0; i < NUM; i++) {
      const hv = (Math.imul(A[i], x) + B[i]) >>> 0;
      if (hv < sig[i]) sig[i] = hv;
    }
  }
  return sig;
}

const sigs = docs.map((d) => {
  const shs = shingles(d.text);
  return { shs, sig: shs.length >= K ? minhash(shs) : null };
});

// LSH 후보 쌍 수집
const candidates = new Set();
for (let b = 0; b < BANDS; b++) {
  const buckets = new Map();
  for (let i = 0; i < docs.length; i++) {
    const s = sigs[i].sig;
    if (!s) continue;
    let key = b + ":";
    for (let r = 0; r < ROWS; r++) key += s[b * ROWS + r] + ",";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(i);
  }
  for (const arr of buckets.values()) {
    if (arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++)
        candidates.add(arr[i] < arr[j] ? arr[i] * 100000 + arr[j] : arr[j] * 100000 + arr[i]);
  }
}

// 실제 Jaccard 로 검증
function jaccard(a, b) {
  const A = new Set(a), inter = b.reduce((n, x) => n + (A.has(x) ? 1 : 0), 0);
  return inter / (a.length + b.length - inter);
}
const pairs = [];
for (const c of candidates) {
  const i = Math.floor(c / 100000), j = c % 100000;
  const ji = jaccard(sigs[i].shs, sigs[j].shs);
  if (ji >= 0.5) pairs.push([ji, docs[i].path, docs[j].path]);
}
pairs.sort((a, b) => b[0] - a[0]);

// 유사도 구간 분포
const band = (t) => pairs.filter((p) => p[0] >= t).length;

// ---------- 출력 ----------
console.log("===== 헬스 스토리 콘텐츠 감사 =====");
console.log(`총 페이지: ${docs.length}`);
console.log(`\n[1] 타이틀 정확 중복 그룹: ${titleDups.length}`);
titleDups.slice(0, 10).forEach(([t, ps]) => console.log(`   "${t}" → ${ps.length}개`));
console.log(`[1] 디스크립션 정확 중복 그룹: ${descDups.length}`);
descDups.slice(0, 10).forEach(([t, ps]) => console.log(`   "${t.slice(0,40)}..." → ${ps.length}개`));

console.log(`\n[2] 본문 글자수(공백 제외): min ${min} / median ${median} / max ${max}`);
console.log(`[2] 2000자 미만 페이지: ${under2000.length}`);
under2000.slice(0, 20).forEach((d) => console.log(`   ${d.chars}자  ${d.path}`));

console.log(`\n[3] near-duplicate 유사 쌍 (Jaccard, K=${K} 단어 shingle):`);
console.log(`   ≥0.50: ${band(0.5)}쌍   ≥0.60: ${band(0.6)}쌍   ≥0.70: ${band(0.7)}쌍   ≥0.80: ${band(0.8)}쌍   ≥0.90: ${band(0.9)}쌍`);
console.log(`   상위 20 유사 쌍:`);
pairs.slice(0, 20).forEach(([j, a, b]) => console.log(`   ${(j * 100).toFixed(1)}%  ${a}  ↔  ${b}`));
