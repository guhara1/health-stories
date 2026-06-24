import { site, primaryNav, programMenu } from "../../data/site.mjs";
import { regionGroups, regionNameBySlug } from "../../data/regions.mjs";
import { slugify } from "../../scripts/romanize.mjs";

// HTML 이스케이프
export const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const abs = (url) => (url.startsWith("http") ? url : site.baseUrl + url);

// 메가메뉴 데이터: [{ group, items: [{ label, url }] }]
const PROGRAM_MEGA = programMenu.map((g) => ({
  group: g.group,
  items: g.items.map((i) => ({ label: i.label, url: `/program/${i.slug}/` })),
}));
const REGION_MEGA = regionGroups.map((g) => ({
  group: g.group,
  items: g.slugs.map((s) => ({
    label: regionNameBySlug[s] || s,
    url: `/region/${s}/`,
  })),
}));

// 메가메뉴 렌더 (PC 4열 / 모바일 아코디언 공용 마크업)
function renderMega(menu) {
  const cols = menu
    .map(
      (g) => `
        <div class="mega-col">
          <h4>${esc(g.group)}</h4>
          <ul>
            ${g.items
              .map((i) => `<li><a href="${i.url}">${esc(i.label)}</a></li>`)
              .join("\n            ")}
          </ul>
        </div>`
    )
    .join("");
  return `<div class="mega"><div class="mega-grid">${cols}</div></div>`;
}

function renderNav(currentPath) {
  const items = primaryNav
    .map((item) => {
      const active = item.url === currentPath ? ' aria-current="page"' : "";
      const menu =
        item.mega === "program"
          ? PROGRAM_MEGA
          : item.mega === "region"
          ? REGION_MEGA
          : null;
      if (menu) {
        return `<li class="has-mega">
          <a href="${item.url}" aria-haspopup="true" aria-expanded="false"${active}>${esc(
          item.label
        )}</a>
          ${renderMega(menu)}
        </li>`;
      }
      return `<li><a href="${item.url}"${active}>${esc(item.label)}</a></li>`;
    })
    .join("\n        ");
  return `<nav class="nav" id="primary-nav" aria-label="주 메뉴"><ul>${items}</ul></nav>`;
}

function renderHeader(currentPath) {
  return `
  <a class="skip-link" href="#main">본문 바로가기</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="${esc(site.name)} 홈">
        <span class="brand-mark">HS</span>
        <span>${esc(site.name)}<small>${esc(site.tagline)}</small></span>
      </a>
      ${renderNav(currentPath)}
      <a class="header-cta desktop" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>
      <button class="nav-toggle" aria-label="메뉴 열기" aria-controls="primary-nav" aria-expanded="false">☰</button>
    </div>
  </header>
  <div class="nav-backdrop"></div>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <h4>${esc(site.name)}</h4>
          <p>${esc(site.tagline)}</p>
          <address class="footer-nap">
            <a class="phone" href="${site.phoneHref}">${esc(site.phone)}</a>
            <span class="nap-line">전화예약 · 연중무휴 상담 안내</span>
            <a class="nap-mail" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
          </address>
          <div class="footer-cta">
            <span class="footer-cta-label">비즈니스 문의</span>
            <div class="footer-cta-btns">
              <a class="tg-btn" href="https://t.me/googleseolab" target="_blank" rel="noopener noreferrer nofollow">
                <span class="tg-ico" aria-hidden="true">✈</span> 웹사이트 제작문의
              </a>
              <a class="tg-btn" href="https://t.me/googleseolab" target="_blank" rel="noopener noreferrer nofollow">
                <span class="tg-ico" aria-hidden="true">✈</span> 제휴문의
              </a>
            </div>
          </div>
        </div>
        <nav class="footer-col" aria-label="출장마사지 찾기">
          <h4>출장마사지 찾기</h4>
          <ul>
            <li><a href="/outcall/">출장마사지</a></li>
            <li><a href="/region/">지역별 찾기</a></li>
            <li><a href="/subway/">지하철역별 찾기</a></li>
            <li><a href="/program/">마사지 프로그램</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-label="이용 안내">
          <h4>이용 안내</h4>
          <ul>
            <li><a href="/guide/">예약 가이드</a></li>
            <li><a href="/about/">이용 안내</a></li>
            <li><a href="/contact/">문의하기</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-label="정책 및 약관">
          <h4>정책·약관</h4>
          <ul>
            <li><a href="/privacy/">개인정보처리방침</a></li>
            <li><a href="/terms/">이용약관</a></li>
            <li><a href="/about/">편집·운영 정책</a></li>
            <li><a href="/sitemap.xml">사이트맵</a></li>
          </ul>
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© ${year} ${esc(site.name)}. All rights reserved. · 전화예약 ${esc(site.phone)}</p>
        <p class="disclaimer">본 사이트는 출장마사지·홈타이 업체 정보를 안내하는 정보 플랫폼이며, 통신판매의 당사자가 아닙니다. 모든 가격·운영 정보는 변동될 수 있으므로 예약 전 업체에 직접 확인하시기 바랍니다. 건전한 관리 서비스 정보만을 안내합니다.</p>
      </div>
    </div>
  </footer>
  <a class="mobile-callbar" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>`;
}

// 본문 H2에 앵커 id를 부여하고, 클릭 시 이동하는 목차(TOC)를 자동 생성.
// - 이미 수동 목차(class="toc")가 있는 페이지(프로그램 등)는 건너뜀.
// - 콘텐츠형 페이지(H2 4개 이상)에만 삽입 → 인덱스/허브 페이지는 제외.
function injectToc(body) {
  if (!body || /class="toc"/.test(body)) return body;
  const heads = [];
  const used = new Set();
  // id가 없는 H2에만 슬러그 id 부여
  const withIds = body.replace(
    /<h2(?![^>]*\sid=)([^>]*)>([\s\S]*?)<\/h2>/g,
    (m, attrs, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let base = (slugify(text) || "section").slice(0, 40).replace(/-+$/, "");
      let id = base, n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);
      heads.push({ id, text });
      return `<h2${attrs} id="${id}">${inner}</h2>`;
    }
  );
  if (heads.length < 4) return body;
  const items = heads
    .map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`)
    .join("");
  const toc = `<nav class="toc" aria-label="이 페이지 목차"><strong>이 페이지 목차</strong><ol>${items}</ol></nav>`;
  // 첫 번째 H2 바로 앞에 목차 삽입
  return withIds.replace(/<h2[^>]*\sid=/, toc + "\n      $&");
}

// JSON-LD 직렬화
const jsonld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(
    /</g,
    "\\u003c"
  )}</script>`;

/**
 * 페이지 레이아웃
 * @param {object} o
 * @param {string} o.title - <title>
 * @param {string} o.description - 메타 디스크립션 (80자 이내 권장)
 * @param {string} o.path - 현재 경로 (예: /program/swedish/)
 * @param {string} o.body - 본문 HTML
 * @param {string} [o.ogImage] - 선호 썸네일 경로
 * @param {object[]} [o.structuredData] - 추가 JSON-LD 객체 배열
 * @param {Array<{name,url}>} [o.breadcrumb]
 */
export function layout(o) {
  const canonical = abs(o.path);
  const ogImage = abs(o.ogImage || "/assets/og-default.svg");
  const desc = o.description || site.tagline;
  o = { ...o, body: injectToc(o.body) };

  // 히어로 대표 이미지는 CSS 배경(::after)이라 초기 문서에서 탐색되지 않는다.
  // LCP 조기 발견 + 높은 우선순위 확보를 위해 히어로가 있는 페이지에만 preload 주입.
  const hasHero = /class="hero"/.test(o.body || "");
  const heroPreload = hasHero
    ? `\n  <link rel="preload" as="image" href="/assets/hero.webp" type="image/webp" fetchpriority="high" />`
    : "";

  // 조직(LocalBusiness) 기본 JSON-LD
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: site.name,
    description: site.tagline,
    url: site.baseUrl,
    telephone: site.phone,
    image: ogImage,
    areaServed: "KR",
    knowsLanguage: "ko",
    priceRange: "₩90,000~₩180,000",
  };

  const breadcrumbLd = o.breadcrumb
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: o.breadcrumb.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: abs(b.url),
        })),
      }
    : null;

  const extra = (o.structuredData || [])
    .concat(breadcrumbLd ? [breadcrumbLd] : [])
    .map(jsonld)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="${esc(site.author.name)}" />
  <meta name="naver-site-verification" content="1764caf227da0dc83ffc199c38c21f06e2a9caa2" />
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)} RSS" href="${site.baseUrl}/rss.xml" />

  <!-- Open Graph / 선호 썸네일 지정 -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(site.name)}" />
  <meta property="og:title" content="${esc(o.title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:locale" content="${site.locale}" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />${heroPreload}
  <script>document.documentElement.classList.add('js')</script>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" /></noscript>
  <link rel="stylesheet" href="/assets/styles.css" />

  ${jsonld(orgLd)}
  ${extra}
</head>
<body>
  ${renderHeader(o.path)}
  <main id="main">
    ${o.body}
  </main>
  ${renderFooter()}
  <script src="/assets/main.js" defer></script>
</body>
</html>`;
}

// 코스별 기본 요금표 (전 페이지 공용 컴포넌트)
export const PRICING = [
  { name: "60분 코스", price: "90,000", dur: "60분", desc: "핵심 부위 위주 가벼운 이완" },
  { name: "90분 코스", price: "150,000", dur: "90분", desc: "전신 균형 표준 구성·아로마 포함", featured: true },
  { name: "120분 코스", price: "180,000", dur: "120분", desc: "구석구석 집중하는 프리미엄 구성" },
];

export function pricingTable() {
  const cards = PRICING.map(
    (c) => `
      <div class="price-card${c.featured ? " featured" : ""}">
        ${c.featured ? '<span class="badge">추천</span>' : ""}
        <h3>${esc(c.name)}</h3>
        <div class="price"><strong>${esc(c.price)}</strong><span>원</span></div>
        <p class="dur">${esc(c.dur)}</p>
        <p class="desc">${esc(c.desc)}</p>
        <a class="btn ${c.featured ? "btn-gold" : "btn-outline"}" href="${site.phoneHref}">예약 문의</a>
      </div>`
  ).join("");
  return `
  <section class="pricing" aria-label="코스별 기본 요금">
    <div class="container">
      <div class="pricing-head">
        <h2>코스 시간으로 보는 기본 요금</h2>
        <p>관리 시간(60·90·120분)을 기준으로 정리한 기본 금액입니다. 표시되지 않은 별도 비용은 두지 않는 것을 원칙으로 안내합니다.</p>
      </div>
      <div class="pricing-grid">${cards}</div>
      <p class="pricing-note">방문 지역과 시간대, 이동 거리에 따라 최종 금액은 통화 시 확정됩니다. <a href="/guide/">요금·예약 기준 자세히 보기 →</a></p>
    </div>
  </section>`;
}

// 고객 후기 (전 페이지 공용 컴포넌트) — 페이지별로 다른 후기가 노출되도록 풀을 넉넉히 둔다
export const REVIEWS = [
  { name: "김○○", meta: "서울 강남 · 스웨디시", rating: 5, text: "통화하고 30분 조금 넘어 도착했고, 스웨디시 받고 나니 굳어 있던 어깨가 훨씬 편해졌어요." },
  { name: "이○○", meta: "경기 수원 · 홈타이", rating: 5, text: "굳이 나가지 않고 집에서 받을 수 있어 좋았습니다. 응대도 정중했고 약속한 시간도 잘 지켜졌어요." },
  { name: "박○○", meta: "부산 해운대 · 아로마", rating: 4, text: "숙소로 아로마를 불렀는데 오일 향이 은은하고 분위기가 차분해 푹 쉬다 갔습니다." },
  { name: "정○○", meta: "인천 · 24시간", rating: 5, text: "자정 가까운 시간에 문의했는데도 응대가 빨랐고, 안내받은 금액 그대로여서 마음이 놓였습니다." },
  { name: "최○○", meta: "대구 · 타이마사지", rating: 5, text: "스트레칭 중심으로 쭉쭉 풀어 주셔서 개운했어요. 다음에도 같은 구성으로 받고 싶네요." },
  { name: "한○○", meta: "서울 마포 · 홈타이", rating: 4, text: "홈타이가 처음이라 걱정했는데 준비할 것들을 미리 알려 주셔서 부담 없이 받았습니다." },
  { name: "윤○○", meta: "경기 성남 · 발마사지", rating: 5, text: "종일 서서 일해 발이 무거웠는데, 발마사지로 종아리까지 풀고 나니 발걸음이 가벼웠어요." },
  { name: "장○○", meta: "대전 둔산 · 아로마", rating: 4, text: "출장이라 숙소에서 받았는데 준비부터 마무리까지 군더더기 없이 깔끔하게 진행됐습니다." },
  { name: "임○○", meta: "광주 상무 · 스웨디시", rating: 5, text: "강도를 중간으로 부탁드렸더니 딱 맞게 맞춰 주셔서 자는 듯이 받았네요. 만족합니다." },
  { name: "오○○", meta: "서울 송파 · 커플", rating: 5, text: "둘이 같은 시간에 나란히 받을 수 있어 좋았어요. 사전에 동선을 잘 안내해 주셨습니다." },
  { name: "강○○", meta: "울산 삼산 · 타이마사지", rating: 4, text: "오래 앉아 일해 굳은 허리를 늘려 가며 풀어 주셔서 한결 가벼워졌습니다." },
  { name: "조○○", meta: "경기 고양 · 홈타이", rating: 5, text: "아이 재우고 늦게 받았는데 조용히 진행해 주셔서 편했어요. 시간 약속도 정확했습니다." },
];

const REVIEW_HEADINGS = [
  "먼저 받아 본 분들의 이야기",
  "이용해 본 분들이 남긴 후기",
  "방문 받아 본 분들의 후기",
  "이용 후기 살펴보기",
];

// 키(지역명·역명·경로 등)를 받아 페이지마다 다른 후기 6개와 제목을 노출
export function reviewsSection(key = "") {
  let h = 2166136261 >>> 0;
  const k = String(key) || "default";
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const start = h % REVIEWS.length;
  const picked = Array.from({ length: 6 }, (_, i) => REVIEWS[(start + i) % REVIEWS.length]);
  const heading = REVIEW_HEADINGS[h % REVIEW_HEADINGS.length];
  const cards = picked.map(
    (r) => `
      <div class="review-card">
        <div class="stars" aria-label="별점 ${r.rating}점">${"★".repeat(r.rating)}<span class="off">${"★".repeat(5 - r.rating)}</span></div>
        <p class="review-text">“${esc(r.text)}”</p>
        <p class="review-meta"><strong>${esc(r.name)}</strong> · ${esc(r.meta)}</p>
      </div>`
  ).join("");
  return `
  <section class="reviews" aria-label="고객 후기">
    <div class="container">
      <div class="reviews-head">
        <span class="eyebrow">이용 후기</span>
        <h2>${esc(heading)}</h2>
        <div class="rating-badge">
          <span class="g">G</span>
          <span class="score">4.8</span>
          <span class="stars">★★★★★</span>
          <span class="count">/ 5.0 · 후기 1,300+</span>
        </div>
      </div>
      <div class="grid grid-3">${cards}</div>
      <p class="reviews-note">위 후기는 이용자가 전한 내용을 간추려 구성한 예시로, 실제 만족도는 지역·업체·관리사에 따라 달라질 수 있습니다.</p>
    </div>
  </section>`;
}

// 요금 구조화 데이터 (OfferCatalog)
export const pricingLd = () => ({
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "출장마사지·홈타이",
  provider: { "@type": "HealthAndBeautyBusiness", name: site.name, telephone: site.phone },
  areaServed: "KR",
  offers: PRICING.map((c) => ({
    "@type": "Offer",
    name: c.name,
    price: c.price.replace(/,/g, ""),
    priceCurrency: "KRW",
    description: c.desc,
  })),
});

// WebSite + Organization JSON-LD (홈 전용 — 사이트링크 검색창/조직 신뢰 신호)
export const siteWebsiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  alternateName: site.legalName,
  url: site.baseUrl + "/",
  inLanguage: "ko",
  description: site.tagline,
  publisher: {
    "@type": "Organization",
    name: site.name,
    url: site.baseUrl + "/",
    telephone: site.phone,
    email: site.email,
    logo: site.baseUrl + "/assets/og-default.svg",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: site.baseUrl + "/region/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
});

// FAQPage JSON-LD 헬퍼
export const faqLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

// Article JSON-LD 헬퍼 (E-E-A-T: author/reviewer/dateModified)
export const articleLd = (o) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: o.headline,
  description: o.description,
  image: abs(o.image || "/assets/og-default.svg"),
  datePublished: o.published || "2026-01-10",
  dateModified: o.modified || "2026-06-21",
  author: {
    "@type": "Organization",
    name: site.author.name,
    url: site.baseUrl + "/about/",
  },
  publisher: {
    "@type": "Organization",
    name: site.name,
    url: site.baseUrl,
  },
  mainEntityOfPage: abs(o.path),
});
