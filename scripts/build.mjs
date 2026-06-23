import { mkdir, writeFile, copyFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { site, primaryNav, programMenu } from "../data/site.mjs";
import { programs, programBySlug } from "../data/programs.mjs";
import { extra as programExtra, regionNote } from "../data/programs-extra.mjs";
import { regions, subways, placeBySlug, regionGroups } from "../data/regions.mjs";
import { layout, esc, faqLd, articleLd, pricingTable, pricingLd, reviewsSection, siteWebsiteLd } from "../src/templates/layout.mjs";
import { buildSeoulPages } from "./locations.mjs";
import { buildRegionTree } from "./region-tree.mjs";
import { incheon } from "../data/incheon.mjs";
import { gyeonggi } from "../data/gyeonggi.mjs";
import { busan, daegu, gwangju, daejeon, ulsan, sejong, jeju } from "../data/metros.mjs";
import {
  gangwon, chungbuk, chungnam, jeonbuk, jeonnam, gyeongbuk, gyeongnam,
} from "../data/provinces.mjs";
import { buildSubwayPages } from "./subway-tree.mjs";
import { subwaySystems } from "../data/subway.mjs";

// 계층(시·구·행정동) 구조로 생성하는 광역 — 평면 지역 루프에서 제외
const HIERARCHICAL = new Set([
  "seoul", "gyeonggi", "incheon",
  "busan", "daegu", "gwangju", "daejeon", "ulsan", "sejong", "jeju",
  "gangwon", "chungbuk", "chungnam", "jeonbuk", "jeonnam", "gyeongbuk", "gyeongnam",
]);

// 광역(구→동) 데이터 → 트리 루트
function metroRoot(m) {
  return {
    kind: "metro",
    name: m.name,
    slug: m.slug,
    intro: m.intro,
    children: m.districts.map((d) => ({
      kind: "gu",
      name: d.name,
      stations: d.stations,
      landmarks: d.landmarks,
      character: d.character,
      dongs: d.dongs,
    })),
  };
}
// 도(시→[구]→동) 데이터 → 트리 루트
function provinceRoot(p) {
  return {
    kind: "metro",
    name: p.name,
    slug: p.slug,
    intro: p.intro,
    children: p.cities.map((c) =>
      c.districts
        ? {
            kind: "si",
            name: c.name,
            character: c.character,
            children: c.districts.map((g) => ({
              kind: "gu",
              name: g.name,
              stations: g.stations,
              landmarks: g.landmarks,
              character: g.character,
              dongs: g.dongs,
            })),
          }
        : {
            kind: "si",
            name: c.name,
            character: c.character,
            stations: c.stations,
            landmarks: c.landmarks,
            dongs: c.dongs,
          }
    ),
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const MODIFIED = "2026-06-21";

// 프로젝트 GitHub Pages 등 하위 경로 배포를 위한 베이스 경로
// (예: BASE_PATH=/health-land). 루트 도메인 배포 시 빈 값.
const BASE = (process.env.BASE_PATH || "").replace(/\/$/, "");

// 페이지 내 루트 상대 링크(href/src="/...")에 베이스 경로를 적용.
// http(s) 절대 URL(canonical/og/JSON-LD)과 //프로토콜 상대 URL은 건드리지 않음.
function applyBase(html) {
  if (!BASE) return html;
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`);
}

// ---------- 유틸 ----------
async function write(path, html) {
  const full = join(DIST, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, applyBase(html), "utf8");
}

const programUrl = (slug) => `/program/${slug}/`;
const labelOf = (slug) => programBySlug[slug]?.label || slug;

// 본문 글자 수(태그 제외, 한글 기준) 카운트 — 도어웨이 방지 검증용
function textLen(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
}

// 작성자/검수 박스 (E-E-A-T)
function authorBox() {
  return `
  <aside class="author-box">
    <div class="avatar">HS</div>
    <div class="meta">
      <strong>${esc(site.author.name)}</strong> · ${esc(site.author.role)}
      <p>${esc(site.author.bio)}</p>
      <p class="updated">최종 수정일 ${MODIFIED} · 검수: ${esc(site.author.reviewer)}</p>
    </div>
  </aside>`;
}

// 지역/안내 내부링크
// 완전 일치 앵커의 반복(과최적화·스팸 신호)을 피하고, 사람이 큐레이션한 듯
// 자연스럽고 다양한 앵커를 섞는다 — 일부는 키워드, 일부는 평범한 지역명/탐색 표현.
// ctx: 프로그램 페이지에서 지정 시 지역+프로그램을 자연스럽게 결합.
// 전국 17개 시·도 — 각기 다른 자연스러운 앵커(일부 키워드 + 평범한 탐색 표현 혼합).
// 동일 '지역+출장마사지' 패턴의 반복을 피하기 위해 지역마다 표현을 달리한다.
const REGION_ANCHORS = [
  ["/region/seoul/", "서울", "출장마사지 안내"],
  ["/region/gyeonggi/", "경기", "지역 안내"],
  ["/region/incheon/", "인천", "홈타이·출장마사지"],
  ["/region/busan/", "부산", "해운대·서면 등"],
  ["/region/daegu/", "대구", "지역 안내"],
  ["/region/gwangju/", "광주", "방문 안내"],
  ["/region/daejeon/", "대전", "출장마사지"],
  ["/region/ulsan/", "울산", "이용 안내"],
  ["/region/sejong/", "세종", "지역 안내"],
  ["/region/gangwon/", "강원", "춘천·원주 등"],
  ["/region/chungbuk/", "충북", "청주 안내"],
  ["/region/chungnam/", "충남", "천안 일대"],
  ["/region/jeonbuk/", "전북", "전주 안내"],
  ["/region/jeonnam/", "전남", "여수·순천 등"],
  ["/region/gyeongbuk/", "경북", "포항·경주"],
  ["/region/gyeongnam/", "경남", "창원·김해 등"],
  ["/region/jeju/", "제주", "출장마사지·홈타이"],
];

// 지역/안내 내부링크
// 완전 일치 앵커의 반복(과최적화·스팸 신호)을 피하고, 사람이 큐레이션한 듯
// 자연스럽고 다양한 앵커를 섞는다 — 전국 17개 시·도 + 지하철/안내.
// ctx: 프로그램 페이지에서 지정 시 지역+프로그램을 자연스럽게 결합.
function regionLinks(ctx) {
  const regionPart = ctx
    ? // 프로그램 페이지: 지역 + 프로그램 자연 결합 (문맥 롱테일)
      REGION_ANCHORS.map(([u, name]) => [u, `${name} ${ctx}`])
    : // 일반 페이지: 지역마다 다른 자연스러운 앵커
      REGION_ANCHORS.map(([u, name, suffix]) => [u, `${name} ${suffix}`]);
  const tail = ctx
    ? [
        ["/subway/line/line2/", `지하철 2호선 ${ctx}`],
        ["/subway/gangnam/", `강남역 주변 ${ctx}`],
        ["/guide/", `예약 전 체크리스트`],
      ]
    : [
        ["/subway/line/line2/", `지하철 2호선 역별 안내`],
        ["/subway/gangnam/", `강남역 주변`],
        ["/guide/", `예약 전 체크리스트`],
      ];
  const links = [...regionPart, ...tail];
  return `<div class="link-cloud">${links
    .map(([u, t]) => `<a href="${u}">${esc(t.replace(/\s+/g, " ").trim())}</a>`)
    .join("")}</div>`;
}

// 메인 → 전국 17개 시·도 롱테일 내부링크
// 완전 일치 앵커 반복(과최적화)을 피하고, 지역마다 대표 생활권·역을 녹인 자연스러운 롱테일 앵커를 사용.
const HOME_REGION_LONGTAIL = [
  ["/region/seoul/", "서울 출장마사지 — 강남·잠실·홍대 방문 예약"],
  ["/region/gyeonggi/", "경기 출장마사지·홈타이 — 수원·성남·고양 안내"],
  ["/region/incheon/", "인천 출장마사지 — 부평·송도·구월동 방문 안내"],
  ["/region/busan/", "부산 출장마사지 — 서면·해운대·센텀 홈타이"],
  ["/region/daegu/", "대구 출장마사지 — 동성로·수성구 방문 예약"],
  ["/region/gwangju/", "광주 출장마사지·홈타이 — 상무지구·첨단 안내"],
  ["/region/daejeon/", "대전 출장마사지 — 둔산·유성온천 방문 안내"],
  ["/region/ulsan/", "울산 출장마사지 — 삼산·남구 홈타이 예약"],
  ["/region/sejong/", "세종 출장마사지 — 도담·나성 생활권 안내"],
  ["/region/gangwon/", "강원 출장마사지 — 춘천·원주·강릉 방문 안내"],
  ["/region/chungbuk/", "충북 출장마사지·홈타이 — 청주 일대 안내"],
  ["/region/chungnam/", "충남 출장마사지 — 천안·아산 방문 예약"],
  ["/region/jeonbuk/", "전북 출장마사지 — 전주·군산 홈타이 안내"],
  ["/region/jeonnam/", "전남 출장마사지 — 여수·순천·목포 안내"],
  ["/region/gyeongbuk/", "경북 출장마사지 — 포항·경주 방문 예약"],
  ["/region/gyeongnam/", "경남 출장마사지·홈타이 — 창원·김해 안내"],
  ["/region/jeju/", "제주 출장마사지 — 제주시·서귀포 방문 안내"],
];

// ---------- 프로그램 페이지 ----------
function programPage(p) {
  const ex = programExtra[p.slug] || {};
  const faqs = p.faqs.map((f) => ({ q: f.q, a: f.a }));
  if (ex.faq) faqs.push({ q: ex.faq.q, a: ex.faq.a });
  const careBlock = p.care
    ? `<h2 id="care">${esc(p.label)} 이용 시 처음 헷갈리는 부분</h2><p>${esc(
        p.care
      )}</p>`
    : "";
  const flowBlock = ex.flow
    ? `<h2 id="flow">이용 흐름과 관리 구성</h2><p>${esc(ex.flow)}</p>`
    : "";
  const notesBlock = ex.notes
    ? `<h2 id="notes">더 알아두면 좋은 점·주의사항</h2><p>${esc(ex.notes)}</p>`
    : "";
  // 홈타이 페이지 자체에서는 '홈타이와 비교'가 순환이 되므로 비교 대상을 매장 마사지로 둔다.
  const isHometaiPage = p.slug === "home-care";
  const hometaiH2 = isHometaiPage ? "매장 마사지와 비교할 점" : "홈타이와 함께 비교할 점";
  const hometaiToc = isHometaiPage
    ? "매장 마사지와 비교할 부분"
    : "홈타이 이용 시 비교할 부분";

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/program/">마사지 프로그램</a><span>›</span>${esc(
      p.label
    )}
  </nav>
  <article class="section-tight">
    <div class="container prose">
      <p class="card-tag" style="color:var(--color-accent);font-weight:700;">${esc(
        p.group
      )}</p>
      <h1>${esc(p.h1)}</h1>

      <div class="toc">
        <strong>이 페이지 목차</strong>
        <ol>
          <li><a href="#overview">프로그램 개요</a></li>
          <li><a href="#flow">이용 흐름과 관리 구성</a></li>
          <li><a href="#who">이런 분들이 많이 찾는 경우</a></li>
          <li><a href="#outcall">출장마사지와 함께 볼 때 확인할 점</a></li>
          <li><a href="#hometai">${hometaiToc}</a></li>
          <li><a href="#notes">더 알아두면 좋은 점·주의사항</a></li>
          <li><a href="#checklist">예약 전 체크리스트</a></li>
          <li><a href="#region">지역별 관련 페이지</a></li>
          <li><a href="#faq">자주 묻는 질문</a></li>
        </ol>
      </div>

      <h2 id="overview">${esc(p.label)}는 어떤 관리인가 (프로그램 개요)</h2>
      ${p.intro.map((t) => `<p>${esc(t)}</p>`).join("\n      ")}
      ${careBlock}
      ${flowBlock}

      <h2 id="who">이런 분들이 많이 찾는 경우</h2>
      <p>${esc(p.whoIntro)}</p>
      <ul>${p.whoList.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>

      <h2 id="outcall">출장마사지로 이용할 때 확인할 부분</h2>
      <p>${esc(p.outcall)}</p>

      <h2 id="hometai">${hometaiH2}</h2>
      <p>${esc(p.hometai)}</p>
      ${notesBlock}

      <h2 id="checklist">예약 전 체크리스트</h2>
      <ul>${p.checklist.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="callout">표시된 정보와 가격은 변동될 수 있으므로, <strong>실제 이용 가능 여부와 비용은 예약 전 ${esc(
        site.phone
      )}로 직접 확인</strong>하는 것이 정확합니다.</div>

      <h2 id="region">지역별 ${esc(p.label)} 및 관련 페이지</h2>
      ${
        regionNote[p.slug]
          ? `<p>${esc(regionNote[p.slug])}</p>`
          : "<p>원하는 지역과 이용 방식에 따라 아래 페이지를 함께 확인하면 선택 기준을 잡기 쉽습니다.</p>"
      }
      ${regionLinks(p.label)}

      <h2 id="faq">자주 묻는 질문</h2>
      <div class="faq">
        ${faqs
          .map(
            (f) =>
              `<details><summary>${esc(f.q)}</summary><p>${esc(
                f.a
              )}</p></details>`
          )
          .join("\n        ")}
      </div>

      ${authorBox()}

      <p><a class="btn btn-primary" href="${site.phoneHref}">📞 ${esc(
    p.label
  )} 전화예약 ${esc(site.phone)}</a></p>
    </div>
  </article>`;

  const structured = [
    faqLd(faqs),
    articleLd({
      headline: p.h1,
      description: p.desc,
      path: programUrl(p.slug),
      modified: MODIFIED,
    }),
  ];

  const html = layout({
    title: `${p.h1} | ${site.name}`,
    description: p.desc,
    path: programUrl(p.slug),
    body,
    structuredData: structured,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "마사지 프로그램", url: "/program/" },
      { name: p.label, url: programUrl(p.slug) },
    ],
  });

  // 도어웨이 방지: 본문 길이 점검 (공백 포함 글자 수 기준 2000~2500자 목표)
  const withSpaces = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
  const len = textLen(body);
  if (withSpaces < 2000) {
    console.warn(`  ⚠️  ${p.slug}: 본문 ${withSpaces}자 (목표 2000자 이상)`);
  }
  return { html, len: withSpaces };
}

// ---------- 프로그램 인덱스 ----------
function programIndex() {
  const groups = programMenu
    .map(
      (g) => `
      <div class="section-head" style="margin-top:var(--sp-6)"><span class="eyebrow">${esc(
        g.group
      )}</span></div>
      <div class="grid grid-3">
        ${g.items
          .map((i) => {
            const p = programBySlug[i.slug];
            return `<a class="card" href="${programUrl(i.slug)}">
              <span class="card-tag">${esc(g.group)}</span>
              <h3>${esc(i.label)}</h3>
              <p>${esc((p?.intro?.[0] || "").slice(0, 60))}…</p>
            </a>`;
          })
          .join("\n        ")}
      </div>`
    )
    .join("");

  const body = `
  <section class="hero">
    <div class="container">
      <p class="eyebrow">마사지 프로그램</p>
      <h1>관리 방식·이용 조건별 마사지 프로그램 안내</h1>
      <p>스웨디시·타이마사지·아로마테라피 등 관리 방식부터 홈타이·24시간 같은 이용 조건까지, 예약 전 비교 기준을 정리했습니다.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>
        <a class="btn btn-outline" href="/guide/">예약 가이드 보기</a>
      </div>
    </div>
  </section>
  <section class="section"><div class="container">
    ${groups}
  </div></section>
  <section class="section section-alt"><div class="container prose">
    <h2>관리 방식부터 고르는 법</h2>
    <p>마사지 프로그램은 크게 ‘어떤 방식으로 푸느냐’로 나눠 보면 선택이 쉬워집니다. 부드러운 오일로 전신을 이완하는 <a href="/program/swedish/">스웨디시</a>·<a href="/program/aroma-therapy/">아로마테라피</a>, 근육을 늘려 시원하게 푸는 <a href="/program/thai-massage/">타이마사지</a>, 다리·발 위주의 부분 관리인 <a href="/program/foot-massage/">발마사지</a>가 대표적입니다. 집·숙소로 받는 방문 방식은 <a href="/program/home-care/">홈타이</a>에서 자세히 확인할 수 있습니다. 처음이라면 자극이 적은 스웨디시나 발마사지부터 60분 코스로 시작하는 것을 권합니다.</p>
    <h2>이용 조건으로 고르기</h2>
    <p>관리 방식 외에도 수면 가능, 24시간 이용, 1인샵/2인샵, 남성전용·여성전용 같은 이용 조건으로도 좁힐 수 있습니다. 같은 프로그램이라도 이용 시간대와 조건에 따라 안내가 달라지므로, 원하는 조건을 먼저 정해 두면 비교가 수월합니다. 비용은 코스 시간(60·90·120분)을 기준으로 하며, 지역·시간대에 따라 방문비·심야 요금이 더해질 수 있으니 예약 시 확인하세요.</p>
    <div class="callout">표시된 정보와 가격은 변동될 수 있습니다. <strong>실제 이용 가능 여부와 비용은 예약 전 ${esc(site.phone)}로 직접 확인</strong>하세요.</div>
  </div></section>`;

  return layout({
    title: `마사지 프로그램 안내 | ${site.name}`,
    description:
      "스웨디시·타이마사지·아로마 등 마사지 프로그램과 홈타이·24시간 이용 조건을 비교 안내합니다.",
    path: "/program/",
    body,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "마사지 프로그램", url: "/program/" },
    ],
  });
}

// ---------- 지역 / 지하철 페이지 ----------
function placePage(r, baseUrl) {
  const progCards = r.programs
    .map((slug) => {
      const p = programBySlug[slug];
      return `<a class="card" href="${programUrl(slug)}">
        <span class="card-tag">${esc(p.group)}</span>
        <h3>${esc(p.label)}</h3>
        <p>${esc((p.intro[0] || "").slice(0, 56))}…</p>
      </a>`;
    })
    .join("\n        ");

  const nearby = (r.nearby || [])
    .map((s) => {
      const n = placeBySlug[s];
      const base = n.type === "subway" ? "/subway/" : "/region/";
      return `<a href="${base}${n.slug}/">${esc(n.name)}</a>`;
    })
    .join("");

  const faqs = [
    {
      q: `${r.name} 출장마사지는 어떻게 예약하나요?`,
      a: `전화로 원하는 지역, 프로그램, 시간을 알리면 방문 가능 여부와 소요 시간을 안내받을 수 있습니다. 예약 전 비용과 포함 범위도 함께 확인하세요.`,
    },
    {
      q: `${r.name}에서 받을 수 있는 프로그램은 무엇인가요?`,
      a: `스웨디시, 아로마테라피, 타이마사지 등 다양한 프로그램을 비교할 수 있습니다. 원하는 관리 방식에 따라 선택 기준이 달라집니다.`,
    },
    {
      q: `방문까지 얼마나 걸리나요?`,
      a: `출발지와 시간대에 따라 다릅니다. 정확한 방문 소요 시간은 예약 시 확인하는 것이 좋습니다.`,
    },
  ];

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="${baseUrl}">${
    r.type === "subway" ? "지하철역별 찾기" : "지역별 찾기"
  }</a><span>›</span>${esc(r.name)}
  </nav>
  <article class="section-tight"><div class="container prose">
    <h1>${esc(r.h1)}</h1>
    ${r.intro.map((t) => `<p>${esc(t)}</p>`).join("\n    ")}

    <h2>${esc(r.name)}에서 비교해 볼 만한 마사지 프로그램</h2>
    <div class="grid grid-3" style="margin:var(--sp-4) 0">
      ${progCards}
    </div>
    <div class="link-cloud">${["swedish", "aroma-therapy", "thai-massage", "home-care", "foot-massage"]
      .map((slug) => {
        const pp = programBySlug[slug];
        return `<a href="/program/${slug}/">${esc(r.name + " " + pp.label)}</a>`;
      })
      .join("")}</div>

    <p>${esc(r.closing)}</p>

    ${
      r.cities && r.cities.length
        ? `<h2>${esc(r.name)} 주요 도시</h2>
    <p>${esc(r.name)}에 속한 주요 도시별로 출장마사지·홈타이 이용 안내를 확인할 수 있습니다.</p>
    <div class="link-cloud">${r.cities
            .map((c) => `<a href="${c.url}">${esc(c.name)}</a>`)
            .join("")}</div>`
        : ""
    }

    ${
      nearby
        ? `<h2>인근 지역·노선</h2><div class="link-cloud">${nearby}</div>`
        : ""
    }

    <div class="callout">표시 정보는 변동될 수 있습니다. <strong>실제 방문 가능 여부와 비용은 ${esc(
      site.phone
    )}로 확인</strong>하세요.</div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map(
          (f) => `<details><summary>${esc(f.q)}</summary><p>${esc(
            f.a
          )}</p></details>`
        )
        .join("\n      ")}
    </div>

    ${authorBox()}
    <p><a class="btn btn-primary" href="${site.phoneHref}">📞 ${esc(
    r.name
  )} 출장마사지 전화예약 ${esc(site.phone)}</a></p>
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const path = `${baseUrl}${r.slug}/`;
  return layout({
    title: `${r.h1} | ${site.name}`,
    description: r.desc,
    path,
    body,
    structuredData: [
      faqLd(faqs),
      articleLd({ headline: r.h1, description: r.desc, path, modified: MODIFIED }),
      pricingLd(),
    ],
    breadcrumb: [
      { name: "홈", url: "/" },
      {
        name: r.type === "subway" ? "지하철역별 찾기" : "지역별 찾기",
        url: baseUrl,
      },
      { name: r.name, url: path },
    ],
  });
}

function placeIndex(list, baseUrl, title, eyebrow, lead) {
  const cards = list
    .map(
      (r) => `<a class="card" href="${baseUrl}${r.slug}/">
        <h3>${esc(r.name)}</h3>
        <p>${esc((r.intro[0] || "").slice(0, 64))}…</p>
      </a>`
    )
    .join("\n        ");
  const body = `
  <section class="hero"><div class="container">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1>${esc(title)}</h1>
    <p>${esc(lead)}</p>
    <div class="hero-actions">
      <a class="btn btn-gold" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>
      <a class="btn btn-outline" href="/program/">프로그램 보기</a>
    </div>
  </div></section>
  <section class="section"><div class="container">
    <div class="grid grid-3">${cards}</div>
  </div></section>`;
  return layout({
    title: `${title} | ${site.name}`,
    description: lead.slice(0, 78),
    path: baseUrl,
    body,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: eyebrow, url: baseUrl },
    ],
  });
}

// 지역 인덱스 (전국 시·도를 권역별로 그룹화하여 나열)
function regionIndex() {
  const lead =
    "서울·경기·인천·부산·대구·광주·대전 등 전국 시·도별로 출장마사지 이용 기준과 프로그램을 비교해 확인할 수 있습니다.";
  const groupsHtml = regionGroups
    .map((g) => {
      const cards = g.slugs
        .map((slug) => {
          const r = placeBySlug[slug];
          if (!r) return "";
          return `<a class="card" href="/region/${slug}/">
            <h3>${esc(r.name)}</h3>
            <p>${esc((r.intro[0] || "").slice(0, 58))}…</p>
          </a>`;
        })
        .join("\n        ");
      return `
      <div class="section-head" style="margin-top:var(--sp-6)"><span class="eyebrow">${esc(
        g.group
      )}</span></div>
      <div class="grid grid-4">${cards}</div>`;
    })
    .join("");

  // 전 지역 빠른 이동 칩
  const chips = regionGroups
    .flatMap((g) => g.slugs)
    .map((slug) => {
      const r = placeBySlug[slug];
      return `<a class="chip" href="/region/${slug}/">${esc(r.name)}</a>`;
    })
    .join("");

  const body = `
  <section class="hero"><div class="container">
    <p class="eyebrow">지역별 찾기</p>
    <h1>전국 지역별 출장마사지 찾기</h1>
    <p>${esc(lead)}</p>
    <div class="hero-actions">
      <a class="btn btn-gold" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>
      <a class="btn btn-outline" href="/program/">프로그램 보기</a>
    </div>
  </div></section>
  <section class="section-tight section-alt"><div class="container">
    <div class="chip-row">${chips}</div>
  </div></section>
  <section class="section"><div class="container">
    ${groupsHtml}
  </div></section>
  <section class="section section-alt"><div class="container prose">
    <h2>지역으로 찾는 방법</h2>
    <p>전국은 시·도(광역) → 시·군·구 → 동(행정동) 순서로 좁혀 갈수록 방문 권역과 도착 소요 시간을 더 정확히 확인할 수 있습니다. 먼저 위에서 큰 지역을 고르고, 이어서 자치구·동까지 선택하면 해당 동네 기준의 출장마사지·홈타이 이용 안내를 볼 수 있습니다. 지하철로 이동이 잦다면 <a href="/subway/">지하철역별 찾기</a>에서 역세권 기준으로 확인하는 방법도 있습니다.</p>
    <h2>지역마다 무엇이 다른가요</h2>
    <p>같은 ‘출장마사지’라도 지역에 따라 방문 가능 권역, 도착 소요 시간, 이용이 많은 시간대가 다릅니다. 도심·역세권은 접근이 빠른 편이고, 외곽은 이동 거리에 따라 도착 시간이 더 걸릴 수 있습니다. 원하는 지역과 시간대를 미리 정해 두면 안내가 한결 빠릅니다. 관리 방식을 먼저 정하고 싶다면 <a href="/program/">마사지 프로그램</a>에서 스웨디시·타이마사지·아로마·홈타이를 비교해 보세요.</p>
    <div class="callout">표시된 정보와 가격은 변동될 수 있습니다. <strong>실제 방문 가능 여부와 비용은 예약 전 ${esc(site.phone)}로 직접 확인</strong>하세요.</div>
  </div></section>
  ${reviewsSection()}
  ${pricingTable()}`;

  return layout({
    title: `전국 지역별 출장마사지 찾기 | ${site.name}`,
    description: "서울·경기·인천·부산·대구 등 전국 시·도별 출장마사지 안내를 확인하세요.",
    path: "/region/",
    body,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "지역별 찾기", url: "/region/" },
    ],
  });
}

// ---------- 홈 ----------
function homePage() {
  const topPrograms = ["swedish", "thai-massage", "aroma-therapy", "foot-massage"];
  const progCards = topPrograms
    .map((slug) => {
      const p = programBySlug[slug];
      return `<a class="card" href="${programUrl(slug)}">
        <span class="card-tag">${esc(p.group)}</span>
        <h3>${esc(p.label)}</h3>
        <p>${esc((p.intro[0] || "").slice(0, 60))}…</p>
      </a>`;
    })
    .join("\n        ");

  const regionChips = [
    ...regions.map((r) => [`/region/${r.slug}/`, `${r.name}`]),
    ...subwaySystems[0].lines.slice(0, 9).map((l) => [`/subway/line/${l.slug}/`, `${l.name}`]),
  ]
    .map(([u, t]) => `<a class="chip" href="${u}">${esc(t)}</a>`)
    .join("");

  const body = `
  <section class="hero">
    <div class="container">
      <p class="eyebrow">${esc(site.tagline)}</p>
      <h1>전국 어디서나, 가까운 지역·지하철역으로 찾는 출장마사지·홈타이</h1>
      <p>헬스 스토리는 시·도부터 동네·역세권까지 단계별로 방문 권역을 좁혀 드립니다. 스웨디시·타이마사지·아로마부터 홈타이·심야 이용까지, 예약 전 확인할 코스 시간·총비용·위생 기준을 한곳에 정리했습니다. 표시 가격은 변동될 수 있으니 통화 시 한 번 더 확인하세요.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>
        <a class="btn btn-outline" href="/program/">마사지 프로그램 보기</a>
      </div>
    </div>
  </section>

  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">인기 관리 프로그램</span>
      <h2>관리 방식부터 골라 보세요</h2>
      <p>처음 이용한다면 부드러운 스웨디시나 부분 관리인 발마사지부터 비교해 보는 것이 좋습니다.</p>
    </div>
    <div class="grid grid-4">${progCards}</div>
    <p style="margin-top:var(--sp-5)"><a class="btn btn-outline" href="/program/">전체 마사지 프로그램 보기</a></p>
  </div></section>

  <section class="section section-alt"><div class="container prose">
    <h2>출장마사지와 홈타이, 무엇이 다를까</h2>
    <p>출장마사지는 관리사가 자택·숙소·오피스텔 등 이용자가 머무는 공간으로 직접 찾아와 관리를 진행하는 방문형 서비스입니다. 매장까지 이동하거나 대기할 필요가 없어, 늦은 시간이거나 익숙한 공간에서 편히 쉬며 받고 싶은 분께 잘 맞습니다. 흔히 쓰는 ‘홈타이’는 집에서 받는 타이식 방문 관리를 가리키는 말로, 넓게 보면 출장마사지의 한 갈래로 이해하면 됩니다. 헬스 스토리는 이 방문형 관리를 지역·지하철역·프로그램·이용 방식의 네 축으로 나눠 비교할 수 있게 정리합니다.</p>
    <h2>헬스 스토리가 정보를 정리하는 방식</h2>
    <p>저희는 ‘무조건 가능’ 같은 단정이나 자극적인 문구 대신, 예약 전에 스스로 따져 볼 항목을 먼저 보여 드립니다. <a href="/region/">지역별 찾기</a>와 <a href="/subway/">지하철역별 찾기</a>로 현재 위치에서 방문 가능한 권역을 좁히고, <a href="/program/">마사지 프로그램</a>에서 스웨디시·타이마사지·아로마·홈타이의 차이를 확인한 뒤, <a href="/guide/">예약 가이드</a>의 체크리스트 순서대로 점검하면 처음 이용하는 분도 막힘 없이 진행할 수 있습니다. 모든 가격·운영 정보는 바뀔 수 있으므로 통화 시점에 다시 확인하는 것을 권장합니다.</p>
  </div></section>

  ${reviewsSection()}
  ${pricingTable()}

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">지역·지하철역별 찾기</span>
      <h2>전국 17개 시·도, 가까운 곳부터 좁혀 보세요</h2>
      <p>아래 안내 링크에서 원하는 광역을 고른 뒤 시·군·구와 동네, 지하철역세권까지 단계별로 방문 권역을 확인할 수 있습니다.</p>
    </div>
    <div class="link-cloud">${HOME_REGION_LONGTAIL.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>
    <div class="chip-row" style="margin-top:var(--sp-5)">${regionChips}</div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">헬스 스토리를 이용하는 이유</span>
      <h2>광고 문구보다 ‘확인 기준’을 먼저 안내합니다</h2>
    </div>
    <div class="grid grid-3">
      <div class="card"><h3>실제 확인 기준 중심</h3><p>자극적인 추천 대신 예약 전 확인해야 할 프로그램 구성·이용 시간·추가 비용 기준을 안내합니다.</p></div>
      <div class="card"><h3>편집팀 검수 정보</h3><p>업체 정보를 정리·검수하고 이용자 문의를 바탕으로 안내 기준을 지속적으로 업데이트합니다.</p></div>
      <div class="card"><h3>예약 전 직접 확인 권장</h3><p>가격·운영 정보는 변동될 수 있으므로 예약 전 ${esc(
        site.phone
      )}로 직접 확인하도록 안내합니다.</p></div>
    </div>
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">예약 가이드</span>
      <h2>처음이라면 이 순서대로 확인하세요</h2>
    </div>
    <div class="grid grid-4">
      <div class="card"><span class="card-tag">STEP 1</span><h3>지역 확인</h3><p>방문 가능 지역과 도착 소요 시간을 먼저 확인합니다.</p></div>
      <div class="card"><span class="card-tag">STEP 2</span><h3>프로그램 선택</h3><p>원하는 관리 방식과 이용 조건을 정합니다.</p></div>
      <div class="card"><span class="card-tag">STEP 3</span><h3>조건 확인</h3><p>시간·비용·추가 요금·위생을 점검합니다.</p></div>
      <div class="card"><span class="card-tag">STEP 4</span><h3>전화예약</h3><p>${esc(
        site.phone
      )}로 최종 확인 후 예약합니다.</p></div>
    </div>
  </div></section>`;

  return layout({
    title: `${site.name} | ${site.tagline}`,
    description:
      "전국 시·도·지하철역별 출장마사지·홈타이 방문 안내. 스웨디시·타이·아로마 예약 기준을 정리했습니다.",
    path: "/",
    body,
    structuredData: [pricingLd(), siteWebsiteLd()],
  });
}

// ---------- 정적 안내 페이지 ----------
function simplePage({ path, eyebrow, h1, desc, sections, faqs, extras }) {
  const faqBlock = faqs
    ? `<h2>자주 묻는 질문</h2><div class="faq">${faqs
        .map(
          (f) => `<details><summary>${esc(f.q)}</summary><p>${esc(
            f.a
          )}</p></details>`
        )
        .join("")}</div>`
    : "";
  const body = `
  <nav class="breadcrumb container" aria-label="위치"><a href="/">홈</a><span>›</span>${esc(
    h1
  )}</nav>
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(
      eyebrow
    )}</p>
    <h1>${esc(h1)}</h1>
    ${sections}
    ${faqBlock}
    ${authorBox()}
    <p><a class="btn btn-primary" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a></p>
  </div></article>
  ${extras || ""}`;
  const structured = faqs ? [faqLd(faqs)] : [];
  return layout({
    title: `${h1} | ${site.name}`,
    description: desc,
    path,
    body,
    structuredData: structured,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: h1, url: path },
    ],
  });
}

function outcallPage() {
  return simplePage({
    path: "/outcall/",
    eyebrow: "출장마사지",
    h1: "출장마사지 이용 안내와 예약 전 확인 기준",
    desc: "출장마사지의 이용 방식과 예약 전 확인 기준, 프로그램·지역별 안내를 정리했습니다.",
    sections: `
      <p>출장마사지는 관리사가 자택·숙소·사무실 등 원하는 장소로 직접 방문해 관리를 진행하는 이용 방식입니다. 매장을 찾아갈 필요가 없어 이동이 번거롭거나, 익숙하고 편안한 공간에서 받고 싶은 분들이 주로 선택합니다. ‘홈타이’는 집에서 받는 타이식 방문 관리를 가리키는 표현으로, 큰 틀에서는 출장마사지의 한 형태로 이해하면 됩니다.</p>

      <h2>출장마사지와 매장 이용의 차이</h2>
      <p>매장 이용이 샤워실·수면 공간 같은 부대 환경을 함께 쓰는 방식이라면, 출장마사지는 내 공간으로 관리사가 찾아오는 방식입니다. 이동·대기 시간이 없고 관리 후 곧바로 휴식할 수 있다는 점이 가장 큰 장점입니다. 다만 관리받을 공간과 타월 등 간단한 준비물은 직접 갖춰야 하므로, 예약 시 준비 사항을 미리 확인하는 것이 좋습니다. 어떤 방식이 맞을지는 이용 목적과 시간대, 동행 여부에 따라 달라집니다.</p>

      <h2>이런 경우에 많이 이용합니다</h2>
      <ul>
        <li>퇴근이 늦거나 외출이 어려워 집·숙소에서 받고 싶은 경우</li>
        <li>출장·여행 중 호텔이나 숙소에서 피로를 풀고 싶은 경우</li>
        <li>오래 앉아 일하거나 운동 후 어깨·허리·다리 뭉침이 심한 경우</li>
        <li>매장의 번잡함 없이 조용한 환경에서 관리받고 싶은 경우</li>
      </ul>

      <h2>프로그램별로 고르는 법</h2>
      <p>부드러운 오일 관리를 원한다면 <a href="/program/swedish/">스웨디시</a>나 <a href="/program/aroma-therapy/">아로마테라피</a>, 근육을 늘려 시원하게 푸는 방식을 원한다면 <a href="/program/thai-massage/">타이마사지</a>, 다리·발 위주의 부분 관리는 <a href="/program/foot-massage/">발마사지</a>가 적합합니다. 방문 이용 방식 자체는 <a href="/program/home-care/">홈타이</a> 페이지에서 더 자세히 확인할 수 있습니다. 처음이라면 자극이 적은 스웨디시나 발마사지부터 60분 코스로 시작해, 몸 상태에 맞춰 시간과 강도를 조절하는 방식이 부담이 적습니다.</p>

      <h2>출장마사지 비용은 어떻게 구성되나요</h2>
      <p>출장마사지 비용은 보통 코스 시간(60·90·120분)을 기준으로 책정되며, 지역·시간대·이동 거리에 따라 방문비나 심야 추가 요금이 더해질 수 있습니다. 표시된 금액에 어떤 항목이 포함되는지, 추가 요금이 있는지 예약 단계에서 확인하면 실제 결제 금액을 정확히 가늠할 수 있습니다. 60분은 핵심 부위 위주, 90분은 전신 표준, 120분은 집중 관리에 적합합니다.</p>

      <h2>출장마사지 예약 전 확인 기준</h2>
      <ul>
        <li>방문 가능 지역과 도착 소요 시간</li>
        <li>원하는 프로그램(스웨디시·타이·아로마 등)과 관리 시간</li>
        <li>관리받을 공간·타월 등 준비물</li>
        <li>총 비용과 방문비·심야 추가 요금 포함 여부</li>
        <li>관리사 성별 지정 등 추가 요청 가능 여부</li>
        <li>위생 관리(일회성 소모품 등)와 응대 방식</li>
      </ul>
      <div class="callout">표시된 정보와 가격은 변동될 수 있습니다. <strong>실제 방문 가능 여부와 비용은 예약 전 ${esc(site.phone)}로 직접 확인</strong>하세요.</div>

      <h2>출장마사지 이용 흐름</h2>
      <p>① 원하는 지역·프로그램·시간을 정해 전화로 문의 → ② 방문 가능 여부와 도착 예정 시간·비용 안내 → ③ 관리받을 공간과 타월 등 간단한 준비 → ④ 관리사 방문 및 관리 진행 → ⑤ 관리 후 별도 이동 없이 그대로 휴식. 늦은 시간 이용을 원한다면 심야 방문 가능 여부와 추가 요금을 미리 확인해 두면 당일 진행이 매끄럽습니다.</p>

      <h2>지역별 출장마사지</h2>
      <p>지역마다 방문 가능 권역과 도착 소요 시간이 다릅니다. 아래에서 원하는 지역을 고른 뒤, 더 좁은 동네·역세권까지 확인하면 안내가 정확해집니다.</p>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "출장마사지와 홈타이는 다른가요?",
        a: "둘 다 방문형 관리라는 점에서 같은 맥락입니다. 홈타이는 방문형 타이식 관리를 가리키는 표현으로 많이 쓰입니다.",
      },
      {
        q: "예약은 어떻게 하나요?",
        a: `${site.phone}로 원하는 지역·프로그램·시간을 알리면 방문 가능 여부와 비용을 안내받을 수 있습니다.`,
      },
    ],
  });
}

function guidePage() {
  return simplePage({
    path: "/guide/",
    eyebrow: "예약 가이드",
    h1: "출장마사지 예약 가이드와 예약 전 체크리스트",
    desc: "출장마사지 예약 순서와 예약 전 체크리스트, 비용·위생 확인 기준을 정리했습니다.",
    sections: `
      <p>처음 이용하는 분들을 위해 예약 순서와 확인 기준을 정리했습니다. 아래 순서대로 확인하면 예상과 다른 상황을 줄일 수 있습니다.</p>
      <h2>예약 순서</h2>
      <ol>
        <li><strong>지역 확인</strong> — 방문 가능 지역과 도착 소요 시간을 먼저 확인합니다.</li>
        <li><strong>프로그램 선택</strong> — 원하는 관리 방식과 이용 조건(수면 가능·24시간 등)을 정합니다.</li>
        <li><strong>조건 확인</strong> — 이용 시간, 총 비용, 추가 요금, 위생 관리를 점검합니다.</li>
        <li><strong>전화예약</strong> — ${site.phone}로 최종 확인 후 예약합니다.</li>
      </ol>
      <h2>예약 전 체크리스트</h2>
      <ul>
        <li>방문 가능 지역 / 방문 소요 시간</li>
        <li>프로그램 구성 / 총 관리 시간</li>
        <li>표시 가격에 방문비·심야 요금 포함 여부</li>
        <li>관리사 성별 지정 가능 여부</li>
        <li>위생(일회성 소모품 등) 관리 방식</li>
        <li>관리 공간·타월 등 준비물</li>
      </ul>
      <div class="callout">가격·운영 정보는 변동될 수 있습니다. <strong>최종 조건은 예약 시 ${esc(
        site.phone
      )}로 확인</strong>하세요.</div>

      <h2>비용을 정확히 이해하는 법</h2>
      <p>대부분의 출장마사지·홈타이 요금은 코스 시간(60·90·120분)을 기준으로 합니다. 여기에 지역과 이동 거리, 이용 시간대(심야 등)에 따라 방문비나 추가 요금이 붙을 수 있으므로, ‘표시 가격’과 ‘실제 결제 금액’을 구분해 확인하는 것이 중요합니다. 예약 시 “표시 금액에 방문비·심야 요금이 포함되나요?”라고 한 번만 물어보면 예상과 다른 비용을 줄일 수 있습니다.</p>

      <h2>시간대별 안내 (당일·심야)</h2>
      <p>당일 예약은 그날의 예약 상황과 관리사 동선에 따라 가능 여부가 달라집니다. 원하는 시간이 정해져 있다면 미리 문의해 두는 편이 안전합니다. 심야 시간대는 도착 소요 시간이 길어지거나 추가 요금이 적용될 수 있으니, 늦은 시간 이용이라면 방문 가능 여부와 요금을 먼저 확인하세요.</p>

      <h2>첫 이용이라면 — 준비와 진행</h2>
      <p>방문(홈타이) 형태로 처음 받는다면 관리받을 공간을 가볍게 정리하고 큰 수건을 준비해 두면 충분합니다. 출입 방법(공동현관·주차 등)을 예약 시 함께 알려 두면 관리사 방문 후 바로 시작할 수 있어 시간을 아낄 수 있습니다. 강도나 집중 부위에 대한 요청은 관리 전에 미리 전달하면 원하는 방향으로 받기 수월합니다.</p>

      <h2>위생·안전 체크 포인트</h2>
      <ul>
        <li>일회성 소모품(시트·도구 등) 사용 여부</li>
        <li>관리사 응대 방식과 사전 안내의 명확성</li>
        <li>오일·로션 등 사용 제품에 대한 안내</li>
      </ul>

      <h2>자주 하는 실수와 피하는 법</h2>
      <p>가장 흔한 경우는 ① 표시 가격만 보고 방문비·심야 요금을 확인하지 않는 것, ② 방문 권역을 확인하지 않아 도착이 늦어지는 것, ③ 원하는 강도·부위를 미리 말하지 않는 것입니다. 위 체크리스트 순서대로 한 번만 확인하면 대부분 예방할 수 있습니다.</p>

      <h2>프로그램·지역 안내</h2>
      <p>관리 방식을 먼저 정하고 싶다면 <a href="/program/">마사지 프로그램</a>에서 비교한 뒤, 아래 지역에서 원하는 곳을 골라 방문 가능 여부를 확인하세요.</p>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "당일 예약도 가능한가요?",
        a: "예약 상황에 따라 다릅니다. 원하는 시간과 지역을 알리고 가능 여부를 확인하세요.",
      },
      {
        q: "비용은 어떻게 확인하나요?",
        a: "표시 가격에 방문비·추가 요금이 포함되는지 예약 시 확인하면 최종 금액을 정확히 알 수 있습니다.",
      },
      {
        q: "처음 이용하는데 무엇을 준비하면 되나요?",
        a: "방문 형태라면 관리받을 공간 정리와 큰 수건 정도면 충분합니다. 출입 방법과 원하는 강도·부위를 예약 시 미리 알려 두면 진행이 매끄럽습니다.",
      },
    ],
  });
}

function aboutPage() {
  return simplePage({
    path: "/about/",
    eyebrow: "이용 안내",
    h1: "헬스 스토리 이용 안내와 편집·운영 정책",
    desc: "헬스 스토리 소개와 편집·운영 정책, 정보 신뢰성에 대한 안내를 정리했습니다.",
    sections: `
      <p>${esc(site.legalName)}은(는) 전국 출장마사지·홈타이 관련 정보를 정리해, 이용자가 예약 전 확인해야 할 기준을 한곳에서 비교할 수 있도록 안내하는 정보 플랫폼입니다. 특정 업체를 일방적으로 홍보하기보다, 지역·프로그램·이용 방식별로 ‘무엇을 확인해야 하는지’를 정리하는 데 중점을 둡니다.</p>

      <h2>무엇을 안내하나요</h2>
      <ul>
        <li>지역(시·도 → 시·군·구 → 동)과 지하철역 기준의 이용 안내</li>
        <li>스웨디시·타이마사지·아로마·홈타이 등 관리 방식별 비교</li>
        <li>코스별 기본 요금과 예약 전 확인해야 할 비용 항목</li>
        <li>예약 순서와 위생·준비물 체크리스트</li>
      </ul>

      <h2>편집·운영 정책</h2>
      <p>${esc(site.editorialPolicy)}</p>

      <h2>정보를 만드는 방식</h2>
      <p>${esc(site.author.bio)} 각 안내는 이용자 문의와 업체 확인을 바탕으로 정리하며, 변동 가능성이 있는 가격·운영 정보는 ‘예약 전 직접 확인’을 함께 권장합니다. 안내 문서에는 최종 수정일을 표기해 정보의 최신성을 가늠할 수 있도록 합니다.</p>

      <h2>책임 안내</h2>
      <ul>
        <li>본 사이트는 건전한 관리 서비스 정보만을 안내합니다.</li>
        <li>${esc(site.name)}는 정보 제공 플랫폼이며, 통신판매의 당사자가 아닙니다.</li>
        <li>모든 가격·운영 정보는 변동될 수 있으므로 예약 전 업체에 직접 확인하시기 바랍니다.</li>
        <li>안내 내용은 참고 자료이며, 실제 이용 조건은 업체와의 예약 과정에서 확정됩니다.</li>
      </ul>

      <h2>운영 정보</h2>
      <p>상호: ${esc(site.name)} · 이메일: ${esc(site.email)} · 전화: ${esc(site.phone)}. 개인정보 처리에 관한 사항은 <a href="/privacy/">개인정보처리방침</a>, 이용 조건은 <a href="/terms/">이용약관</a>에서 확인할 수 있습니다.</p>

      <h2>왜 ‘확인 기준’을 강조하나요</h2>
      <p>출장마사지·홈타이는 가격과 이용 조건이 업체·지역·시간대에 따라 달라지기 쉬운 분야입니다. 그래서 헬스 스토리는 특정 업체를 단정적으로 추천하기보다, 이용자가 스스로 판단할 수 있도록 ‘무엇을 확인해야 하는지’를 일관된 기준으로 정리합니다. 방문 권역, 코스 시간, 총 비용과 추가 요금, 위생·준비물처럼 예약 전에 체크하면 좋은 항목을 각 페이지에 반복해 안내하는 이유입니다.</p>

      <h2>이용 시 유의사항</h2>
      <p>본 사이트의 안내는 일반적인 이용 기준을 정리한 참고 자료이며, 개별 업체의 운영 방침·가격·방문 권역은 수시로 바뀔 수 있습니다. 따라서 어떤 페이지의 정보든 ‘예약 시점에 직접 확인’하는 것을 기본으로 삼아 주시기 바랍니다. 또한 헬스 스토리는 건전한 관리 서비스 정보만을 다루며, 법령에 위배되는 이용을 안내하지 않습니다. 정확하지 않은 정보를 발견하시면 언제든 ${esc(site.email)}로 알려 주시면 확인 후 반영하겠습니다.</p>

      <h2>문의</h2>
      <p>이용 관련 문의는 <a href="/contact/">문의하기</a> 또는 전화 ${esc(
        site.phone
      )}로 가능합니다. 처음 이용한다면 <a href="/guide/">예약 가이드</a>에서 순서를, 관리 방식이 궁금하다면 <a href="/program/">마사지 프로그램</a>에서 비교 기준을 먼저 확인할 수 있습니다.</p>`,
    faqs: [
      {
        q: "헬스 스토리는 어떤 사이트인가요?",
        a: "출장마사지·홈타이 관련 정보를 정리하고 예약 전 확인 기준을 안내하는 정보 플랫폼입니다. 통신판매의 당사자가 아니며, 실제 예약은 이용자와 업체 사이에 이뤄집니다.",
      },
      {
        q: "정보는 얼마나 자주 업데이트되나요?",
        a: "이용자 문의와 업체 확인을 바탕으로 주기적으로 업데이트하며, 각 페이지에 최종 수정일을 표기합니다.",
      },
      {
        q: "특정 업체를 추천해 주나요?",
        a: "단정적인 추천 대신, 지역·프로그램·이용 방식별로 예약 전 확인해야 할 기준을 정리해 안내합니다. 최종 선택과 판단은 이용자의 몫입니다.",
      },
    ],
  });
}

function contactPage() {
  return simplePage({
    path: "/contact/",
    eyebrow: "문의하기",
    h1: "헬스 스토리 전화예약·문의 안내",
    desc: "헬스 스토리 전화예약·문의 방법과 예약 시 안내할 내용, 이용 시간을 정리했습니다.",
    sections: `
      <p>예약과 문의는 전화로 가장 빠르게 안내받을 수 있습니다. 원하는 지역·프로그램·시간만 정해 두면 방문 가능 여부와 도착 예정 시간, 비용을 한 번에 확인할 수 있습니다.</p>
      <div class="callout"><strong>전화예약 ${esc(site.phone)}</strong> · 원하는 지역, 프로그램, 시간을 알려 주시면 방문 가능 여부와 비용을 안내해 드립니다.</div>

      <h2>예약 시 알려 주시면 좋은 내용</h2>
      <ul>
        <li>방문 희망 지역(예: 서울 강남, 경기 수원, 부산 해운대)</li>
        <li>원하는 프로그램(스웨디시·타이·아로마·홈타이 등)</li>
        <li>희망 시간과 관리 시간(60·90·120분)</li>
        <li>관리사 성별 지정 등 추가 요청</li>
      </ul>

      <h2>상담은 이렇게 진행됩니다</h2>
      <p>전화로 위 내용을 전달하면, 해당 지역의 방문 가능 권역과 도착 예정 시간을 안내받게 됩니다. 이어서 원하는 프로그램과 코스 시간을 정하고, 표시 금액에 방문비·심야 추가 요금이 포함되는지 확인한 뒤 예약을 확정하면 됩니다. 처음 이용한다면 <a href="/guide/">예약 가이드</a>를 먼저 살펴보면 순서를 한눈에 파악할 수 있습니다.</p>

      <h2>비즈니스·제휴 문의</h2>
      <p>웹사이트 제작이나 제휴에 관한 문의는 페이지 하단(푸터)의 ‘웹사이트 제작문의 · 제휴문의’ 버튼을 통해 텔레그램으로 보내실 수 있습니다. 일반 이용 문의는 이메일 ${esc(site.email)}로도 접수됩니다.</p>

      <h2>빠른 응대를 위한 팁</h2>
      <p>통화 전에 ‘어느 동네에서, 어떤 프로그램을, 몇 시쯤’ 받을지 대략만 정해 두면 한 번의 통화로 방문 가능 여부와 비용까지 확인할 수 있습니다. 도착 시간이 중요한 약속이 있다면 희망 시간을 먼저 말씀해 주시면 동선에 맞춰 안내가 빠릅니다. 심야 시간대나 당일 예약은 그날의 예약 상황에 따라 달라질 수 있으니 미리 문의해 두는 것이 좋습니다.</p>

      <h2>지역으로 바로 확인하기</h2>
      <p>아래에서 원하는 지역을 고르면 해당 지역의 출장마사지·홈타이 이용 안내와 하위 동네·역세권 페이지로 이동할 수 있습니다.</p>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "전화 외에 예약 방법이 있나요?",
        a: `가장 빠른 방법은 전화예약입니다. ${site.phone}로 연락 주시면 안내해 드립니다. 일반 문의는 ${site.email}로도 접수됩니다.`,
      },
      {
        q: "예약 시 무엇을 준비하면 되나요?",
        a: "방문 지역, 원하는 프로그램, 희망 시간을 미리 정해 두면 안내가 빠릅니다.",
      },
      {
        q: "웹사이트 제작·제휴 문의는 어디로 하나요?",
        a: "페이지 하단(푸터)의 ‘웹사이트 제작문의 · 제휴문의’ 버튼을 통해 텔레그램으로 문의할 수 있습니다.",
      },
    ],
  });
}

function privacyPage() {
  return simplePage({
    path: "/privacy/",
    eyebrow: "개인정보처리방침",
    h1: "개인정보처리방침",
    desc: "헬스 스토리가 수집·이용하는 정보의 범위와 처리 방침, 이용자의 권리를 안내합니다.",
    sections: `
      <p>${esc(site.legalName)}(이하 ‘${esc(site.name)}’)은(는) 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 본 방침은 ${esc(site.name)}가 운영하는 정보 안내 웹사이트에 적용됩니다.</p>
      <h2>1. 수집하는 정보와 방법</h2>
      <p>${esc(site.name)}는 별도의 회원가입 절차 없이 정보를 제공하며, 웹사이트 이용만으로 이름·연락처 등 개인정보를 자동으로 수집하지 않습니다. 전화 상담 과정에서 이용자가 직접 제공하는 정보(희망 지역·프로그램·시간 등)는 문의 응대 목적에 한해 이용됩니다.</p>
      <h2>2. 이용 목적</h2>
      <ul>
        <li>이용자 문의에 대한 응대 및 안내</li>
        <li>서비스 품질 개선과 통계 분석(개인을 식별하지 않는 범위)</li>
      </ul>
      <h2>3. 쿠키 및 분석 도구</h2>
      <p>웹사이트는 이용 통계 분석을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 일부 기능 이용에 제한이 있을 수 있습니다.</p>
      <h2>4. 제3자 제공 및 보관</h2>
      <p>${esc(site.name)}는 법령에 근거하거나 이용자의 동의가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 전화 상담으로 수집된 정보는 응대 목적 달성 후 지체 없이 파기합니다.</p>
      <h2>5. 이용자의 권리</h2>
      <p>이용자는 자신의 정보에 대한 열람·정정·삭제를 요청할 수 있으며, 관련 요청은 아래 연락처로 접수할 수 있습니다.</p>
      <h2>6. 문의 및 개정</h2>
      <p>개인정보 관련 문의는 ${esc(site.email)} 또는 전화 ${esc(site.phone)}로 가능합니다. 본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지에 공지합니다. (최종 개정일 ${MODIFIED})</p>`,
    faqs: [
      { q: "회원가입을 해야 하나요?", a: "아니요. 헬스 스토리는 회원가입 없이 정보를 제공하며, 웹사이트 이용만으로 개인정보를 수집하지 않습니다." },
      { q: "상담 시 알려준 정보는 어떻게 처리되나요?", a: "문의 응대 목적에 한해 이용되며, 목적 달성 후 지체 없이 파기합니다." },
    ],
  });
}

function termsPage() {
  return simplePage({
    path: "/terms/",
    eyebrow: "이용약관",
    h1: "이용약관",
    desc: "헬스 스토리 웹사이트 이용 조건과 정보의 성격, 책임 범위를 안내합니다.",
    sections: `
      <p>본 약관은 ${esc(site.legalName)}(이하 ‘${esc(site.name)}’)가 제공하는 정보 안내 웹사이트의 이용 조건을 규정합니다. 웹사이트를 이용함으로써 본 약관에 동의한 것으로 봅니다.</p>
      <h2>1. 서비스의 성격</h2>
      <p>${esc(site.name)}는 전국 출장마사지·홈타이 관련 정보를 정리해 안내하는 정보 제공 플랫폼이며, 직접 관리 서비스를 제공하거나 통신판매의 당사자가 아닙니다. 실제 예약·이용 계약은 이용자와 해당 업체 사이에 성립합니다.</p>
      <h2>2. 정보의 정확성</h2>
      <p>게시된 가격·운영 시간·방문 권역 등 모든 정보는 변동될 수 있으며, 참고용으로 제공됩니다. 이용자는 예약 전 해당 업체에 직접 최신 정보를 확인해야 합니다.</p>
      <h2>3. 책임의 제한</h2>
      <ul>
        <li>${esc(site.name)}는 제3자 업체의 서비스 품질·이행에 대해 책임지지 않습니다.</li>
        <li>정보의 활용으로 발생한 결과에 대한 최종 판단과 책임은 이용자에게 있습니다.</li>
        <li>건전한 관리 서비스 정보만을 안내하며, 법령에 위배되는 이용을 금지합니다.</li>
      </ul>
      <h2>4. 지식재산권</h2>
      <p>웹사이트에 게시된 콘텐츠의 저작권은 ${esc(site.name)}에 있으며, 무단 복제·배포를 금지합니다.</p>
      <h2>5. 약관의 개정</h2>
      <p>본 약관은 관련 법령과 서비스 정책에 따라 개정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다. 문의는 ${esc(site.email)} 또는 전화 ${esc(site.phone)}로 가능합니다. (최종 개정일 ${MODIFIED})</p>`,
    faqs: [
      { q: "헬스 스토리가 직접 예약을 진행하나요?", a: "헬스 스토리는 정보 안내 플랫폼이며, 실제 예약·이용 계약은 이용자와 해당 업체 사이에 성립합니다." },
      { q: "게시된 가격은 확정 가격인가요?", a: "참고용 정보이며 변동될 수 있으므로, 예약 전 업체에 직접 확인해야 합니다." },
    ],
  });
}

// ---------- 에셋 / 사이트맵 ----------
async function copyAssets() {
  const src = join(ROOT, "src", "assets");
  const dest = join(DIST, "assets");
  await mkdir(dest, { recursive: true });
  for (const f of await readdir(src)) {
    await copyFile(join(src, f), join(dest, f));
  }
  // 기본 OG 이미지 / 파비콘(SVG)
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1220"/><stop offset="1" stop-color="#142544"/></linearGradient><linearGradient id="og-orange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb45a"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1010" cy="120" r="220" fill="url(#og-orange)" opacity="0.16"/><rect x="80" y="232" width="58" height="6" rx="3" fill="url(#og-orange)"/><text x="80" y="312" font-family="Pretendard, sans-serif" font-size="84" font-weight="800" fill="#f6f8fc">헬스 스토리</text><text x="80" y="398" font-family="Pretendard, sans-serif" font-size="40" fill="#d6c08c">전국 출장마사지·홈타이 방문 예약 안내</text><text x="80" y="478" font-family="Pretendard, sans-serif" font-size="36" font-weight="700" fill="#ff9a3d">전화예약 0508-202-4719</text></svg>`;
  await writeFile(join(dest, "og-default.svg"), og, "utf8");
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#101a2c"/><text x="32" y="42" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="28" font-weight="800" fill="#f97316">HS</text></svg>`;
  await writeFile(join(dest, "favicon.svg"), fav, "utf8");

  // 히어로 대표 이미지 (16:9) — 실사진으로 교체 시 이 파일만 바꾸면 됨
  const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="헬스 스토리 프리미엄 출장마사지·홈타이">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1220"/><stop offset="1" stop-color="#15294b"/></linearGradient>
<radialGradient id="glow" cx="76%" cy="26%" r="60%"><stop offset="0" stop-color="#f97316" stop-opacity="0.42"/><stop offset="55%" stop-color="#f97316" stop-opacity="0.07"/><stop offset="100%" stop-color="#f97316" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e7d2a0"/><stop offset="1" stop-color="#c8a86a"/></linearGradient>
<linearGradient id="orange" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb45a"/><stop offset="1" stop-color="#f97316"/></linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#bg)"/>
<rect width="1280" height="720" fill="url(#glow)"/>
<g fill="none" stroke="url(#gold)">
<path d="M-60,520 C260,420 420,650 760,500 1040,385 1170,565 1360,470" stroke-width="1.6" stroke-opacity="0.42"/>
<path d="M-60,565 C290,475 470,690 800,545 1090,430 1210,610 1380,515" stroke-width="1" stroke-opacity="0.26"/>
<path d="M-60,470 C240,380 400,600 740,450 1020,335 1150,520 1340,430" stroke-width="1" stroke-opacity="0.18"/>
</g>
<circle cx="930" cy="232" r="120" fill="#f97316" fill-opacity="0.06"/>
<circle cx="930" cy="232" r="120" fill="none" stroke="url(#orange)" stroke-width="2" stroke-opacity="0.5"/>
<circle cx="930" cy="232" r="150" fill="none" stroke="url(#gold)" stroke-width="1" stroke-opacity="0.2"/>
<g fill="#e7d2a0"><circle cx="985" cy="150" r="3" fill-opacity="0.6"/><circle cx="852" cy="300" r="2.5" fill-opacity="0.45"/><circle cx="1015" cy="295" r="2" fill-opacity="0.5"/><circle cx="1080" cy="200" r="2" fill-opacity="0.4"/></g>
<text x="640" y="392" text-anchor="middle" font-family="'Noto Serif KR', serif" font-size="62" font-weight="700" fill="#f6f8fc" letter-spacing="3">HEALTH STORY</text>
<text x="640" y="442" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="25" fill="#d6c08c" letter-spacing="6">PREMIUM 출장마사지 · 홈타이</text>
<text x="640" y="492" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="21" fill="#ff9a3d" letter-spacing="2">전화예약 0508-202-4719</text>
</svg>`;
  await writeFile(join(dest, "hero.svg"), hero, "utf8");
}

function sitemap(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${site.baseUrl}${u}</loc><lastmod>${MODIFIED}</lastmod></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

// IndexNow 키 (빙·네이버·얀덱스 즉시 색인 통보). 키 파일은 도메인 루트에 동일 내용으로 게시됨.
const INDEXNOW_KEY = "b00508e375ed8ff4e993dc41ca0b8c4a";

// 경로별 메타(타이틀·디스크립션) — RSS 생성에 사용
const pageMetaByPath = {};

// RSS 2.0 피드 — 핵심 페이지(안내·프로그램·시·도 허브)를 노출해 검색엔진 발견을 돕는다.
function rssFeed(urls) {
  const xmlEsc = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pubDate = new Date(MODIFIED + "T09:00:00+09:00").toUTCString();
  // 정적 안내 + 프로그램 + 17개 시·도 허브만 피드에 포함(과도한 항목 방지)
  const feedPaths = [
    "/", "/outcall/", "/program/", "/region/", "/subway/", "/guide/", "/about/", "/contact/",
    ...programs.map((p) => programUrl(p.slug)),
    ...regions.map((r) => `/region/${r.slug}/`),
  ].filter((p, i, a) => urls.includes(p) && a.indexOf(p) === i);

  const items = feedPaths
    .map((p) => {
      const meta = pageMetaByPath[p] || {};
      const title = meta.title || site.name;
      const desc = meta.desc || site.tagline;
      const link = site.baseUrl + p;
      return `  <item>
    <title>${xmlEsc(title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <description>${xmlEsc(desc)}</description>
    <pubDate>${pubDate}</pubDate>
  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEsc(site.name)} — ${xmlEsc(site.tagline)}</title>
  <link>${site.baseUrl}/</link>
  <atom:link href="${site.baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
  <description>${xmlEsc(site.tagline)}</description>
  <language>ko</language>
  <lastBuildDate>${pubDate}</lastBuildDate>
${items}
</channel>
</rss>`;
}

// ---------- 메인 ----------
async function build() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const urls = [];
  const metaTitles = new Map();
  const metaDescs = new Map();
  const add = async (path, file, html) => {
    await write(file, html);
    urls.push(path);
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    metaTitles.set(t, (metaTitles.get(t) || 0) + 1);
    metaDescs.set(d, (metaDescs.get(d) || 0) + 1);
    pageMetaByPath[path] = { title: t, desc: d };
  };

  console.log("→ 페이지 생성 중...");
  await add("/", "index.html", homePage());
  await add("/program/", "program/index.html", programIndex());
  await add("/outcall/", "outcall/index.html", outcallPage());
  await add("/guide/", "guide/index.html", guidePage());
  await add("/about/", "about/index.html", aboutPage());
  await add("/contact/", "contact/index.html", contactPage());
  await add("/privacy/", "privacy/index.html", privacyPage());
  await add("/terms/", "terms/index.html", termsPage());

  // 프로그램 페이지
  let minLen = Infinity;
  for (const p of programs) {
    const { html, len } = programPage(p);
    minLen = Math.min(minLen, len);
    await add(programUrl(p.slug), `program/${p.slug}/index.html`, html);
  }

  // 지역 인덱스 + 페이지 (전국 시·도 권역별 그룹화)
  await add("/region/", "region/index.html", regionIndex());
  for (const r of regions) {
    if (HIERARCHICAL.has(r.slug)) continue; // 계층 구조는 별도 생성
    await add(`/region/${r.slug}/`, `region/${r.slug}/index.html`, placePage(r, "/region/"));
  }

  // 서울 계층 페이지 (광역 → 자치구 → 행정동)
  let seoulMin = Infinity,
    seoulMax = 0;
  for (const pg of buildSeoulPages()) {
    const len = pg.html
      .split("<main")[1]
      .split("</main>")[0]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim().length;
    seoulMin = Math.min(seoulMin, len);
    seoulMax = Math.max(seoulMax, len);
    await add(pg.path, pg.file, pg.html);
  }
  console.log(`✓ 서울 계층 페이지 본문 길이: ${seoulMin}~${seoulMax}자`);

  // 광역시·도 계층 페이지 (광역 → 시 → 구 → 행정동)
  for (const [label, root] of [
    ["인천", metroRoot(incheon)],
    ["경기", provinceRoot(gyeonggi)],
    ["부산", metroRoot(busan)],
    ["대구", metroRoot(daegu)],
    ["광주", metroRoot(gwangju)],
    ["대전", metroRoot(daejeon)],
    ["울산", metroRoot(ulsan)],
    ["세종", provinceRoot(sejong)],
    ["제주", provinceRoot(jeju)],
    ["강원", provinceRoot(gangwon)],
    ["충북", provinceRoot(chungbuk)],
    ["충남", provinceRoot(chungnam)],
    ["전북", provinceRoot(jeonbuk)],
    ["전남", provinceRoot(jeonnam)],
    ["경북", provinceRoot(gyeongbuk)],
    ["경남", provinceRoot(gyeongnam)],
  ]) {
    let mn = Infinity,
      mx = 0,
      cnt = 0;
    for (const pg of buildRegionTree(root)) {
      const len = pg.html
        .split("<main")[1]
        .split("</main>")[0]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim().length;
      mn = Math.min(mn, len);
      mx = Math.max(mx, len);
      cnt++;
      await add(pg.path, pg.file, pg.html);
    }
    console.log(`✓ ${label} 계층 ${cnt}페이지 본문 길이: ${mn}~${mx}자`);
  }

  // 지하철 노선/역 페이지 (인덱스 → 노선 → 역 정규 페이지)
  {
    let mn = Infinity, mx = 0, cnt = 0;
    for (const pg of buildSubwayPages(subwaySystems)) {
      const m = pg.html.split("<main")[1];
      const len = m ? m.split("</main>")[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length : 0;
      mn = Math.min(mn, len); mx = Math.max(mx, len); cnt++;
      await add(pg.path, pg.file, pg.html);
    }
    console.log(`✓ 지하철 ${cnt}페이지(노선+역) 본문 길이: ${mn}~${mx}자`);
  }

  await copyAssets();

  // robots.txt + sitemap.xml
  await writeFile(
    join(DIST, "robots.txt"),
    `# robots.txt — ${site.name}
User-agent: *
Allow: /

# 주요 검색엔진 명시 허용 (구글/빙/네이버/다음)
User-agent: Googlebot
Allow: /
User-agent: bingbot
Allow: /
User-agent: Yeti
Allow: /
User-agent: Daumoa
Allow: /

Sitemap: ${site.baseUrl}/sitemap.xml
`,
    "utf8"
  );
  await writeFile(join(DIST, "sitemap.xml"), sitemap(urls), "utf8");

  // RSS 2.0 피드 (네이버·구글·피드리더 색인/발견용)
  await writeFile(join(DIST, "rss.xml"), rssFeed(urls), "utf8");

  // IndexNow 키 파일 (빙·네이버·얀덱스 즉시 색인 통보용)
  await writeFile(join(DIST, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, "utf8");

  // llms.txt (AI 에이전트용 — H1 헤더 + 링크 포함 마크다운)
  const u = site.baseUrl;
  const llms = `# ${site.name} — 전국 출장마사지·홈타이 정보 안내

${site.legalName}은(는) 전국 출장마사지·홈타이 업체 정보를 정리해 이용자가 예약 전 확인해야 할 기준을 안내하는 정보 플랫폼입니다. 전화예약 ${site.phone}.

## 주요 안내
- [홈](${u}/)
- [출장마사지 안내](${u}/outcall/)
- [마사지 프로그램](${u}/program/)
- [지역별 찾기](${u}/region/)
- [지하철역별 찾기](${u}/subway/)
- [예약 가이드](${u}/guide/)
- [이용 안내](${u}/about/)
- [문의하기](${u}/contact/)

## 마사지 프로그램
${programs.map((p) => `- [${p.label}](${u}/program/${p.slug}/)`).join("\n")}

## 안내
- 가격·운영 정보는 변동될 수 있으므로 예약 전 직접 확인을 권장합니다.
- 본 사이트는 건전한 관리 서비스 정보만 안내합니다.
`;
  await writeFile(join(DIST, "llms.txt"), llms, "utf8");

  // 타이틀·디스크립션 중복 검사 (중복 금지)
  const dupT = [...metaTitles.entries()].filter(([, n]) => n > 1);
  const dupD = [...metaDescs.entries()].filter(([, n]) => n > 1);
  if (dupT.length || dupD.length) {
    console.warn(`  ⚠️  중복 타이틀 ${dupT.length}종 / 중복 디스크립션 ${dupD.length}종`);
    dupT.slice(0, 5).forEach(([t, n]) => console.warn(`     T×${n}: ${t}`));
    dupD.slice(0, 5).forEach(([d, n]) => console.warn(`     D×${n}: ${d}`));
  } else {
    console.log(`✓ 타이틀·디스크립션 중복 없음 (${metaTitles.size}종 고유)`);
  }

  console.log(`✓ 총 ${urls.length}개 페이지 생성 완료`);
  console.log(`✓ 프로그램 페이지 최소 본문 길이: ${minLen}자`);
  console.log(`✓ sitemap.xml / robots.txt 생성 완료`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
