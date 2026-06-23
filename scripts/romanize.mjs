// 한글 → 로마자 슬러그 변환 (개정 로마자 표기 간이 구현)
// 행정구역 슬러그 생성을 위해 사용. 음운 변화(연음/자음동화)는 단순화한다.

const CHO = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const JUNG = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const JONG = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];

export function romanizeSyllable(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  return CHO[cho] + JUNG[jung] + JONG[jong];
}

export function romanize(str) {
  let out = "";
  for (const ch of str) {
    const r = romanizeSyllable(ch);
    out += r === null ? "" : r;
  }
  return out;
}

// 행정구역명 → 슬러그 (구/군/시/동/읍/면 접미사 제거 후 로마자화)
export function slugify(name) {
  const base = name.replace(/(특별시|광역시|특별자치시|특별자치도)$/u, "")
                   .replace(/(구|군|시|동|읍|면)$/u, "");
  let s = romanize(base).toLowerCase().replace(/[^a-z0-9]/g, "");
  return s || romanize(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}
