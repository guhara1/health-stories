// 범용 지역 계층 생성기 (광역 → 시 → 구 → 행정동, 임의 깊이)
// - 경기(시→구→동 / 시→동), 인천(구·군→동) 등에 사용
// - 각 페이지 2000~2500자 목표, 구/동별 실제 정보 + 인접 동 + 문장 변형으로 도어웨이 방지
import { layout, esc, faqLd, articleLd, pricingTable, pricingLd, reviewsSection } from "../src/templates/layout.mjs";
import { site } from "../data/site.mjs";
import { programBySlug } from "../data/programs.mjs";
import { slugify } from "./romanize.mjs";
import { vpick, vsubset, vshuffle } from "./variants.mjs";

const MODIFIED = "2026-06-21";
const PROGRAM_PICKS = ["swedish", "aroma-therapy", "thai-massage", "home-care", "foot-massage"];
const phone = site.phone;

function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
const pick = (s, arr) => arr[s % arr.length];

// 타이틀·디스크립션 변형 (중복 방지: 지역명 조합 + 시드 기반 문형 변형)
export function dongMeta(dongName, metro, areaName) {
  const s = seed(metro + "|" + areaName + "|" + dongName);
  // 타이틀은 무조건 '지역명 + 출장마사지'로 시작
  const titles = [
    `${dongName} 출장마사지·홈타이 가이드 — ${metro} ${areaName} | ${site.name}`,
    `${dongName} 출장마사지 신청 방법 · ${metro} ${areaName} | ${site.name}`,
    `${dongName} 출장마사지·홈타이 방문 신청 — ${metro} ${areaName} | ${site.name}`,
    `${dongName} 출장마사지 예약 길잡이 (${metro} ${areaName}) | ${site.name}`,
  ];
  const descs = [
    `${metro} ${areaName} ${dongName} 출장마사지·홈타이의 방문 가능 범위와 신청 전 점검 항목 소개.`,
    `${areaName} ${dongName} 출장마사지·홈타이 선택 시 살필 방문 범위와 신청 기준 소개.`,
    `${dongName}(${areaName}) 홈타이·출장마사지 진행 순서와 요금·신청 절차 소개.`,
    `${areaName} ${dongName} 방문 마사지(홈타이)의 코스·시간·예약 점검 항목 소개.`,
    `${dongName} 출장마사지 신청 점검 목록과 주변 동 정보를 ${metro} 단위로 모음.`,
  ];
  return {
    title: titles[s % titles.length],
    description: descs[(s >>> 2) % descs.length].slice(0, 80),
  };
}
export function branchMeta(fullName, childLabel) {
  const s = seed("b|" + fullName);
  // 타이틀은 무조건 '지역명 + 출장마사지'로 시작
  const titles = [
    `${fullName} 출장마사지·홈타이 신청 가이드 | ${site.name}`,
    `${fullName} 출장마사지 — ${childLabel}별 방문 정보 | ${site.name}`,
    `${fullName} 출장마사지·홈타이 예약·코스 소개 | ${site.name}`,
    `${fullName} 출장마사지 방문 이용 길잡이 | ${site.name}`,
  ];
  const descs = [
    `${fullName} 출장마사지·홈타이 소개와 ${childLabel}별 방문 범위, 신청 점검 항목 모음.`,
    `${fullName}의 출장마사지·홈타이를 ${childLabel}별로 견주고 신청 기준을 살펴보세요.`,
    `${fullName} 홈타이·출장마사지의 코스와 이용 시간·요금, 신청 절차를 소개합니다.`,
    `${fullName} 방문 마사지 진행 순서와 ${childLabel}별 소개, 신청 전 점검 목록 모음.`,
  ];
  return {
    title: titles[s % titles.length],
    description: descs[(s >>> 2) % descs.length].slice(0, 80),
  };
}

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
function callout() {
  return `<div class="callout">표시된 정보와 가격은 변동될 수 있으므로, <strong>실제 방문 가능 여부와 비용은 예약 전 ${esc(
    phone
  )}로 직접 확인</strong>하는 것이 정확합니다.</div>`;
}
const ctaBtn = (label) =>
  `<p><a class="btn btn-primary" href="${site.phoneHref}">📞 ${esc(label)} 전화예약 ${esc(phone)}</a></p>`;
function programChips(place) {
  const pre = place ? `${place} ` : "";
  return `<div class="link-cloud">${PROGRAM_PICKS.map((slug) => {
    const p = programBySlug[slug];
    return `<a href="/program/${slug}/">${esc(pre + p.label)}</a>`;
  }).join("")}</div>`;
}
const stationsText = (n) => (n.stations && n.stations.length ? n.stations.slice(0, 4).join("·") : "");
const landmarksText = (n) => (n.landmarks && n.landmarks.length ? n.landmarks.slice(0, 4).join("·") : "");
function bcNav(node) {
  const parts = [
    `<a href="/">홈</a>`,
    `<a href="/region/">지역별 찾기</a>`,
    ...node.ancestors.map((a) => `<a href="${a.url}">${esc(a.name)}</a>`),
    esc(node.name),
  ];
  return `<nav class="breadcrumb container" aria-label="위치">${parts.join("<span>›</span>")}</nav>`;
}
const crumb = (node) => [
  { name: "홈", url: "/" },
  { name: "지역별 찾기", url: "/region/" },
  ...node.ancestors.map((a) => ({ name: a.name, url: a.url })),
  { name: node.name, url: node.url },
];

// ---------- 트리 정규화 ----------
function normalize(node, ancestors, parent) {
  node.ancestors = ancestors;
  node.parent = parent || null;
  if (node.kind !== "metro") node.slug = node._slug || slugify(node.name);
  node.url = "/region/" + [...ancestors.map((a) => a.slug), node.slug].join("/") + "/";

  let kids = node.children;
  if (node.dongs) {
    kids = node.dongs.map((d) => (typeof d === "string" ? { kind: "dong", name: d } : d));
    node.children = kids;
  }
  if (kids && kids.length) {
    const used = new Set();
    const childAnc = [...ancestors, { name: node.name, url: node.url, slug: node.slug }];
    for (const k of kids) {
      let sg = slugify(k.name) || "area";
      let base = sg,
        n = 2;
      while (used.has(sg)) sg = base + n++;
      used.add(sg);
      k._slug = sg;
      normalize(k, childAnc, node);
    }
  }
}

// ---------- 행정동(말단) 페이지 ----------
function dongPage(node) {
  const parent = node.parent; // 구 또는 시
  const dongName = node.name;
  const areaName = parent.name; // 예: 영통구 / 부천시
  const metro = node.ancestors[0].name; // 경기 / 인천
  const st = stationsText(parent);
  const lm = landmarksText(parent);
  const sib = (parent.children || []).filter((c) => c.kind === "dong" && c.name !== dongName);
  const near = sib.slice(0, 5);
  const nearText = near.length ? near.map((d) => d.name).join("·") : areaName + " 일대";
  const n1 = near[0] ? near[0].name : areaName + " 일대";

  // 변형 base: 광역+상위지역+동명 → 동명 동(여러 도시의 중앙동 등)도 분기
  const vb = "DG␟" + metro + "␟" + areaName + "␟" + dongName;

  // ── 개요 2문단 (독립 슬롯 조합) ──
  const openA = vpick(vb, "openA", [
    `${dongName}은(는) ${metro} ${areaName} 관할에 들어가는 행정동입니다.`,
    `${metro} ${areaName} ${dongName} 일대는 주거지와 생활 시설이 함께 자리한 권역입니다.`,
    `${areaName} ${dongName}은(는) ${metro} 내에서도 방문 관리 문의가 꾸준한 동네로 꼽힙니다.`,
    `${dongName}은(는) ${areaName} 생활권을 떠받치는 ${metro} 산하의 행정동 가운데 하나입니다.`,
    `${metro} ${areaName}에 자리한 ${dongName}은(는) 이웃 동과 권역이 빈틈없이 맞물린 지역입니다.`,
    lm ? `${dongName} 일대는 ${esc(lm)} 인근으로 알려져 있으며, 생활 기반이 탄탄한 ${areaName} 권역의 중심지입니다.` : null,
    st ? `${dongName}은(는) ${esc(st)} 등과 가까워, ${areaName} 내에서도 접근성이 좋은 편입니다.` : null,
  ].filter(Boolean));
  const openCtx = (parent.character ? esc(parent.character) + " " : "") +
    (st ? `가까운 곳에 ${esc(st)} 등이 있어 오가기가 수월하고, ` : "") +
    (lm ? `${esc(lm)} 등의 시설이 생활 권역을 가늠하는 기준이 됩니다.` : "주변 생활 권역을 따라 이동 동선이 자연스럽게 이어집니다.");
  const demand = vpick(vb, "demand", [
    `${dongName}에서 출장마사지나 홈타이를 알아본다면 어디까지 방문되는지와 도착까지 걸리는 시간을 가장 먼저 살펴보길 권합니다.`,
    `${dongName} 일대에서 방문 관리를 받으려는 분이라면 같은 ${areaName} 안이라도 위치에 따라 도착 시각이 달라질 수 있다는 점을 미리 알아 두면 도움이 됩니다.`,
    `${dongName}에서 이용하려 한다면 방문이 되는 곳인지와 걸리는 시간을 신청 단계에서 짚어 두는 편이 확실합니다.`,
    `${n1} 쪽과 이웃한 ${dongName}은(는) 출발 지점에 따라 도착 시각이 바뀔 수 있으니, 위치를 또렷이 전하면 안내가 한결 매끄럽습니다.`,
    st ? `${esc(st)} 근처인 ${dongName}에서는 대중교통 접근성과 도착까지의 거리를 함께 고려해 신청하면 편합니다.` : null,
  ].filter(Boolean));

  // ── '이런 경우' 불릿 (6개 중 4개, 순서 셔플) ──
  const whoBullets = vsubset(vb, "who", [
    `${areaName} 안에서 굳이 나가지 않고 집이나 숙소에서 느긋하게 관리받고 싶은 경우`,
    `일과를 마친 뒤나 밤늦은 시간에 ${dongName} 가까이에서 받고 싶은 경우`,
    `오래 앉아 일하거나 이동이 많아 어깨·허리에 피로가 쌓인 경우`,
    `처음이라 자극이 적은 스웨디시나 발마사지처럼 가벼운 코스부터 견주고 싶은 경우`,
    `${n1} 같은 이웃 동까지 범위에 넣고 ${dongName}을(를) 함께 들여다보려는 경우`,
    `${metro} 바깥에서 ${areaName}을(를) 방문해 숙소에서 관리를 받고 싶은 경우`,
    lm ? `${esc(lm)} 인근에서 일하거나 방문하다 ${dongName}에서 관리받고 싶은 경우` : null,
    st ? `${esc(st)} 이용 후 ${dongName} 일대에서 편하게 관리받고 싶은 경우` : null,
  ].filter(Boolean), 4);

  // ── 확인할 점 문단 + 불릿 ──
  const checkPara = vpick(vb, "checkP", [
    `안내된 운영 시간이나 요금은 바뀔 수 있으니, 방문이 되는지·전체 비용·추가 요금은 신청하는 자리에서 직접 짚어 두길 권합니다. ${dongName} 일대는 출발 지점에 따라 방문에 걸리는 시간이 달라질 수 있어, 원하는 시간대를 정해 문의하면 안내가 빨라집니다.`,
    `같은 ${areaName}이라도 ${dongName} 기준의 방문 범위와 도착 시간은 출발 지점마다 차이가 납니다. 신청할 때 위치·시간·코스를 한꺼번에 전하면 안내가 더 정확해집니다.`,
    `${dongName}에서 받을 때는 방문이 되는 구역, 비용, 추가 요금을 신청 과정에서 못 박아 두는 편이 좋습니다. 화면의 정보는 참고용일 뿐, 실제 조건은 상담에서 가려집니다.`,
  ]);
  const checkBullets = vsubset(vb, "check", [
    `${dongName} 방문이 되는 구역과 도착까지 걸리는 시간`,
    `받고 싶은 코스(스웨디시·아로마·타이마사지 등)와 관리 시간`,
    `안내 요금에 방문비·심야 요금이 들어 있는지 여부`,
    `관리사 성별 지정 같은 추가 요청이 되는지 여부`,
    `관리 공간·타월 등 챙겨 둘 준비물`,
    `${areaName} 내 이동 동선에 맞춘 방문 시간대`,
    lm ? `${esc(lm)} 근처 위치와 ${dongName}의 정확한 주소` : null,
    st ? `${esc(st)}에서 ${dongName} 일대까지의 거리와 이동 방식` : null,
  ].filter(Boolean), 5);

  // ── 관리 방식 비교 문단 ──
  const comparePara = vpick(vb, "compare", [
    `오일로 부드럽게 풀고 싶다면 스웨디시나 아로마테라피를, 시원하게 늘려 주는 관리를 바란다면 타이마사지를 견줘 보세요. 집이나 숙소에서 편히 받고 싶다면 홈타이를, 다리만 살짝 풀고 싶다면 발마사지처럼 일부만 받는 관리도 고를 수 있습니다.`,
    `${dongName} 일대에서는 오일을 쓰는 스웨디시·아로마, 근육을 펴 주는 타이마사지, 찾아오는 홈타이, 일부만 받는 발마사지를 목적에 맞춰 정하면 됩니다. 어디가 피로한지와 원하는 세기를 먼저 잡으면 고르기가 수월합니다.`,
    `처음이라면 자극이 덜한 스웨디시나 발마사지부터, 뭉침이 심하다면 타이마사지나 경락 쪽으로 견줘 보세요. 나가지 않고 받고 싶다면 ${dongName} 일대 방문이 되는 홈타이를 살펴보면 됩니다.`,
    st ? `${esc(st)} 이용할 때와 ${dongName} 위치를 함께 고려해 스케줄링하면, 관리 방식(스웨디시·아로마·타이마사지)를 더 효율적으로 고를 수 있습니다.` : null,
  ].filter(Boolean));

  // ── 이용 흐름 문단 ──
  const flowPara = vpick(vb, "flow", [
    `신청할 때 ${dongName} 위치와 받고 싶은 코스·시간을 전하면, 방문이 되는지와 도착 예정 시각을 안내받습니다. 찾아오는 방식(홈타이)은 관리 공간과 타월 정도만 갖춰 두면 익숙한 곳에서 받을 수 있고, 끝난 뒤 따로 움직일 필요 없이 곧장 쉴 수 있다는 점이 좋습니다.`,
    `${dongName}에서 받을 때는 위치를 알리고 → 코스·시간을 고른 뒤 → 방문 여부와 비용을 짚고 → 전화로 예약하는 흐름으로 가면 깔끔합니다. 홈타이는 오가는 수고가 적은 대신 관리 공간·타월 같은 준비물을 미리 챙겨 두면 좋습니다.`,
    `우선 ${dongName} 위치와 시간대를 정해 문의하면 도착 예정 시각을 안내받을 수 있습니다. 밤늦게 받고자 한다면 심야 방문이 되는지와 추가 요금을 함께 짚어 두세요.`,
    lm ? `${esc(lm)} 근처에서 일정을 마친 후 ${dongName}으로 오는 경로와 도착 시간을 함께 알려 주면, 더욱 정확한 예약 안내를 받을 수 있습니다.` : null,
  ].filter(Boolean));

  const faqs = [
    {
      q: `${dongName}에서 출장마사지는 어떻게 예약하나요?`,
      a: vpick(vb, "fa1", [
        `전화로 ${dongName}(${metro} ${areaName}) 위치와 받고 싶은 코스·시간을 전하면 방문이 되는지와 도착까지 걸리는 시간을 안내받을 수 있습니다. 비용과 포함 범위도 함께 짚어 두세요.`,
        `${metro} ${areaName} ${dongName}이라고 알리고 코스·시간을 전하면 도착 예정 시각과 비용을 안내받습니다. 추가 요금이 들어 있는지도 미리 짚어 두세요.`,
      ]),
    },
    {
      q: `${dongName}에서 홈타이도 이용할 수 있나요?`,
      a: vpick(vb, "fa2", [
        `홈타이는 집이나 숙소로 찾아오는 형태의 출장마사지를 가리키며, ${dongName}에서도 방문되는 구역인지 신청할 때 짚어 보면 됩니다. 스웨디시·아로마·타이마사지 등 코스를 골라 받을 수 있습니다.`,
        `네, 홈타이는 ${dongName} 일대의 집·숙소로 찾아오는 방문 관리입니다. 해당 구역에 드는지 신청할 때 짚어 두고 받고 싶은 코스·시간을 함께 정하면 됩니다.`,
      ]),
    },
    {
      q: `${dongName}까지 방문에 얼마나 걸리나요?`,
      a: vpick(vb, "fa3", [
        `출발 지점과 시간대, ${areaName} 안에서의 위치에 따라 달라집니다. 정확히 얼마나 걸리는지는 신청할 때 짚어 두는 편이 좋습니다.`,
        `${dongName}은(는) 출발 지점과 도로 상황에 따라 도착 시각이 바뀝니다. 신청할 때 위치를 전하면 예상 소요 시간을 안내받을 수 있습니다.`,
      ]),
    },
  ];

  const secOverview = `
    <h2>${esc(dongName)} 지역 개요</h2>
    <p>${esc(openA)} ${openCtx}</p>
    <p>${esc(demand)} 같은 ${esc(areaName)} 안에서 ${esc(nearText)} 등 인접 동과 권역이 맞닿아 있어, 방문 위치를 정확히 알리면 안내가 한결 수월합니다.</p>`;
  const secWho = `
    <h2>${esc(dongName)}에서 출장마사지·홈타이를 찾는 경우</h2>
    <ul>${whoBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secCheck = `
    <h2>${esc(dongName)}에서 이용 시 확인할 점</h2>
    <p>${esc(checkPara)}</p>
    <ul>${checkBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    ${callout()}`;
  const secCompare = `
    <h2>${esc(dongName)}에서 비교해 볼 관리 방식</h2>
    <p>${esc(comparePara)}</p>
    ${programChips(dongName)}`;
  const secFlow = `
    <h2>${esc(dongName)} 출장마사지·홈타이 이용 흐름</h2>
    <p>${esc(flowPara)}</p>`;
  const tipAItems = [
    `${dongName} 일대에서 처음 받는다면 60분 코스로 몸 상태를 가늠한 뒤 뭉침이 심할 때 90·120분으로 늘리는 방식이 부담이 덜합니다. 코스가 길수록 온몸을 천천히 풀 수 있어 피로가 오래 쌓인 경우에 잘 맞습니다.`,
    `${dongName}에서는 살짝 풀고 싶다면 60분, 온몸을 고르게 받고 싶다면 90분, 집중해서 받아야 한다면 120분 코스가 기준이 됩니다. 받고 싶은 부위와 낼 수 있는 시간에 맞춰 고르면 한결 수월합니다.`,
    `${areaName} 일대에서 코스를 정할 때는 ‘오늘 얼마나 풀지’를 먼저 떠올리면 됩니다. 짧게 60분, 보통 90분, 집중 120분으로 나눠 두고 ${dongName} 방문 시간대와 묶어 정하면 편합니다.`,
    `${dongName} 일대가 처음이라면 센 강도로 무리하기보다 60·90분 코스로 출발해 몸 상태를 보며 맞춰 가는 편이 좋습니다. 세기와 시간은 받기 전에 미리 전해 두면 맞춰 받기 좋습니다.`,
  ];
  if (st) tipAItems.push(`${esc(st)}에서 ${dongName}으로 이동하는 중 시간이 남는다면 60분 코스로 빠르게 풀어 주는 관리를 추천합니다. 여유가 있다면 90분 이상을 잡아 충분히 풀어 주는 것이 효과적입니다.`);

  const tipBItems = [
    `${dongName}에서 홈타이로 받는다면 관리받을 자리를 미리 치워 두고 큰 수건을 챙겨 두면 진행이 깔끔합니다. 한밤 시간대는 방문 여부와 추가 요금이 달라질 수 있으니 신청할 때 함께 짚어 두세요.`,
    `찾아오는(홈타이) 방식으로 ${dongName}에서 받는다면 매트를 깔 공간과 타월 정도만 갖추면 됩니다. 늦은 시간대는 도착이 길어질 수 있어, 원하는 시각을 미리 일러 두는 편이 좋습니다.`,
    `${dongName} 일대에서 늦은 시간 이용을 떠올린다면 심야에 방문되는지와 추가 요금, 도착까지 걸리는 시간을 신청 단계에서 짚어 두면 당일이 깔끔하게 흘러갑니다.`,
    `${dongName}에서 홈타이를 처음 받는다면 들어오는 길과 주차, 준비물(수건·관리 공간)을 신청할 때 미리 맞춰 두면 관리사가 도착하자마자 시작할 수 있어 시간을 아낄 수 있습니다.`,
  ];
  if (lm) tipBItems.push(`${esc(lm)} 근처 숙소에서 홈타이를 받으실 예정이라면, 관리 공간과 물이 충분한지 미리 확인해 두시고 신청할 때 꼭 알려 두세요.`);

  const secTips = `
    <h2>${esc(dongName)} 코스·시간대 선택 안내</h2>
    <p>${esc(vpick(vb, "tipA", tipAItems))}</p>
    <p>${esc(vpick(vb, "tipB", tipBItems))}</p>`;

  const middle = vshuffle(vb, "order", [secWho, secCheck, secCompare, secFlow, secTips]).join("\n");

  const body = `
  ${bcNav(node)}
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(metro)} ${esc(
    areaName
  )}</p>
    <h1>${esc(dongName)} 출장마사지·홈타이 이용 안내</h1>
    ${secOverview}
    ${middle}

    <h2>${esc(dongName)} 인근 지역</h2>
    <p>같은 ${esc(areaName)} 내 ${esc(nearText)} 등 인접 동과 함께 비교하면 방문 권역을 잡기 쉽습니다.</p>
    <div class="link-cloud">
      ${near.map((d) => `<a href="${d.url}">${esc(d.name)}</a>`).join("")}
      <a href="${parent.url}">${esc(areaName)} 전체</a>
      <a href="${node.ancestors[0].url}">${esc(metro)} 전체</a>
    </div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join("\n      ")}
    </div>

    ${authorBox()}
    ${ctaBtn(dongName + " 출장마사지")}
  </div></article>
  ${reviewsSection(node.url)}
  ${pricingTable()}`;

  return {
    path: node.url,
    file: node.url.replace(/^\//, "").replace(/\/$/, "") + "/index.html",
    html: layout({
      ...dongMeta(dongName, metro, areaName),
      path: node.url,
      body,
      structuredData: [
        faqLd(faqs),
        articleLd({
          headline: `${dongName} 출장마사지·홈타이 이용 안내`,
          description: `${dongName}(${metro} ${areaName}) 출장마사지·홈타이 이용 안내`,
          path: node.url,
          modified: MODIFIED,
        }),
        pricingLd(),
      ],
      breadcrumb: crumb(node),
    }),
  };
}

// ---------- 시/구(중간) 페이지 ----------
function branchPage(node) {
  const metro = node.kind === "metro" ? node.name : node.ancestors[0].name;
  const childKind = node.children && node.children[0] ? node.children[0].kind : "dong";
  const childLabel = childKind === "si" ? "시·군" : childKind === "gu" ? "자치구·구" : "행정동";
  const st = stationsText(node);
  const lm = landmarksText(node);
  const fullName = node.kind === "metro" ? node.name : `${metro} ${node.name}`;

  const childLinks = (node.children || [])
    .map((c) => `<a href="${c.url}">${esc(c.name)}</a>`)
    .join("");
  const childCards = (node.children || [])
    .map(
      (c) => `<a class="card" href="${c.url}">
        <h3>${esc(c.name)}</h3>
        <p>${esc((c.character || `${c.name} 출장마사지·홈타이 이용 안내`).slice(0, 50))}…</p>
      </a>`
    )
    .join("\n        ");

  const nm = node.name;
  const child1 = node.children && node.children[0] ? node.children[0].name : childLabel;
  // 변형 base: 광역 + 지역명 → 동명 구(여러 광역시의 동구·남구 등)도 분기
  const vb = "BR␟" + metro + "␟" + nm;

  const faqs = [
    {
      q: `${fullName} 출장마사지는 어떻게 예약하나요?`,
      a: vpick(vb, "fa1", [
        `전화로 ${fullName} 안의 ${childLabel}와 받고 싶은 코스·시간을 전하면 방문이 되는지와 걸리는 시간을 안내받을 수 있습니다.`,
        `${fullName}에서는 원하는 ${childLabel}, 코스, 시간을 전화로 전하면 방문이 되는지와 도착 예정 시각을 안내받을 수 있습니다.`,
      ]),
    },
    {
      q: `${fullName}에서 받을 수 있는 프로그램은 무엇인가요?`,
      a: vpick(vb, "fa2", [
        `스웨디시·아로마테라피·타이마사지 같은 여러 코스와 집·숙소로 찾아오는 홈타이를 견줘 볼 수 있습니다.`,
        `오일 관리(스웨디시·아로마), 늘려 주는 타이마사지, 찾아오는 홈타이, 일부만 받는 발마사지 등을 ${nm} 단위로 견줘 볼 수 있습니다.`,
      ]),
    },
    {
      q: `${fullName} 어디까지 방문이 되나요?`,
      a: vpick(vb, "fa3", [
        `${childLabel}마다 방문되는 구역이 다를 수 있습니다. 아래 목록에서 해당 지역을 짚고 신청할 때 위치를 전하면 됩니다.`,
        `${nm} 안의 ${childLabel}에 따라 구역이 달라집니다. ${child1} 같은 원하는 지역을 고른 뒤 신청할 때 위치를 전하면 방문이 되는지 짚어 볼 수 있습니다.`,
      ]),
    },
  ];

  // 중간 페이지 본문 (2000자 목표)
  const noCharItems = [
    `${fullName}은(는) 면적이 넓어 같은 지역이라도 ${childLabel}에 따라 방문되는 구역과 도착까지 걸리는 시간이 달라질 수 있습니다.`,
    `${fullName}은(는) ${child1} 같은 여러 ${childLabel}로 나뉘어, 어느 지역을 먼저 고르느냐에 따라 방문 구역과 안내가 달라집니다.`,
    `${fullName}은(는) 생활권이 길게 이어져 있어, ${childLabel}마다 방문되는 구역과 도착 시간을 따로 짚어 두는 편이 좋습니다.`,
  ];
  if (st) noCharItems.push(`${fullName} 내에서 ${esc(st)}와 가깝거나 인접한 ${childLabel}들은 교통 접근성이 좋아 출장마사지·홈타이 이용이 활발합니다.`);
  if (lm) noCharItems.push(`${esc(lm)} 근처의 ${fullName}은(는) 방문 수요가 지속되고 있으며, ${childLabel}별로 구역을 나누어 안내하는 것이 중요합니다.`);

  const charPara = node.character
    ? `<p>${esc(nm)}은(는) ${esc(node.character)}${
        st ? ` ${esc(st)} 등으로 이동이 이어지고,` : ""
      }${lm ? ` ${esc(lm)} 같은 시설이 생활 권역의 기준점이 됩니다.` : ""}</p>`
    : `<p>${esc(node.intro || vpick(vb, "noChar", noCharItems))}</p>`;

  const isMetro = node.kind === "metro";

  const childSection = isMetro
    ? `<section class="section"><div class="container">
        <div class="section-head"><span class="eyebrow">${esc(node.name)} ${esc(
        childLabel
      )}</span>
          <h2>${esc(childLabel)}를 선택하세요</h2>
          <p>${esc(
            childLabel
          )}를 고른 뒤 하위 지역까지 좁혀 가면, 해당 지역의 출장마사지·홈타이 이용 안내를 확인할 수 있습니다.</p>
        </div>
        <div class="grid grid-4">${childCards}</div>
      </div></section>`
    : `<h2>${esc(node.name)} ${esc(childLabel)}에서 찾기</h2>
       <p>아래에서 ${esc(node.name)}의 ${esc(
        childLabel
      )}를 선택하면 해당 지역의 출장마사지·홈타이 이용 안내를 확인할 수 있습니다. (숫자 행정동은 대표 동명으로 통합해 안내합니다.)</p>
       <div class="link-cloud">${childLinks}</div>`;

  const secFeature = `
    <h2>${esc(nm)} 지역 특징</h2>
    ${charPara}`;
  const featItems = [
    `똑같은 ‘${fullName} 출장마사지’라도 ${childLabel}에 따라 방문되는 구역과 도착까지 걸리는 시간이 달라질 수 있어, 원하는 지역을 먼저 정하면 방문 여부와 코스를 더 또렷이 짚을 수 있습니다.`,
    `${nm}은(는) ${child1} 같은 곳으로 구역이 나뉘어, 어느 ${childLabel}을(를) 먼저 고르느냐에 따라 방문되는 구역과 도착 시간이 달라집니다.`,
    `${fullName}에서 출장마사지·홈타이를 알아볼 때는 ${childLabel}별 구역 차이를 먼저 들여다보면 방문 여부를 정확히 좁힐 수 있습니다.`,
  ];
  if (st) featItems.push(`${fullName}은(는) ${esc(st)} 같은 교통 요지가 있어, ${childLabel}별로 ${metro} 전역으로의 접근성이 다릅니다.`);
  if (lm) featItems.push(`${esc(lm)} 근처의 ${fullName}은(는) 업무 지구와 생활권이 함께 형성되어 있어, ${childLabel}마다 방문 패턴이 다릅니다.`);
  const secFeature2 = `
    <p>${esc(vpick(vb, "feat", featItems))}</p>`;

  const secWho = `
    <h2>${esc(nm)}에서 출장마사지·홈타이 이용이 많은 경우</h2>
    <ul>${vsubset(vb, "who", [
      `매장에 가지 않고 집이나 숙소에서 느긋하게 관리받고 싶은 경우`,
      `${nm} 안에서 퇴근 뒤나 늦은 시간에 받고 싶은 경우`,
      `오래 앉아 일하거나 이동이 많아 어깨·허리가 뭉친 경우`,
      `처음이라 자극이 적은 스웨디시·발마사지부터 견줘 보고 싶은 경우`,
      `${child1} 같은 ${nm} 안 여러 지역을 두고 구역을 함께 살펴보려는 경우`,
      `다른 지역에서 ${nm}을(를) 찾아와 숙소에서 방문 관리를 받고 싶은 경우`,
      st ? `${esc(st)} 이용 후 ${nm} 일대에서 편하게 관리받고 싶은 경우` : null,
      lm ? `${esc(lm)} 근처에서 업무를 마친 후 ${nm} 숙소에서 관리를 받고 싶은 경우` : null,
    ].filter(Boolean), 4).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

  const compareItems = [
    `매장 이용이 시설과 곁들임 서비스를 함께 누리는 방식이라면, 홈타이는 ${nm} 안의 집·숙소로 관리사가 찾아오는 방문 방식입니다. 오가는 수고가 적고 끝난 뒤 곧장 쉴 수 있는 대신, 관리 공간과 타월 같은 준비물을 직접 갖춰야 하므로 신청할 때 준비 사항을 짚어 두는 편이 좋습니다.`,
    `${nm}에서 매장 이용은 곁들임 시설을 함께 쓸 수 있고, 홈타이는 집·숙소로 받아 움직임 없이 곧장 쉴 수 있다는 점이 다릅니다. 목적과 시간대에 맞춰 알맞은 방식을 고르면 됩니다.`,
    `홈타이는 ${nm} 일대의 집·숙소로 관리사가 찾아오는 형태라 오가는 수고가 적습니다. 다만 관리 공간·타월 같은 준비가 필요하니, 매장 이용과 견줘 신청 전에 준비 사항을 짚어 두는 편이 좋습니다.`,
  ];
  if (st) compareItems.push(`${nm} 내에서도 ${esc(st)} 근처 지역과 그 외 지역은 교통 접근성이 달라, 매장과 홈타이 선택이 달라질 수 있습니다.`);

  const secCompare = `
    <h2>${esc(nm)}에서 방문(홈타이)과 매장 이용 비교</h2>
    <p>${esc(vpick(vb, "compare", compareItems))}</p>`;

  const guideItems = [
    `${nm}에서 출장마사지·홈타이를 받을 때는 방문 구역(어디까지 찾아오는지), 코스(스웨디시·아로마·타이마사지·홈타이), 이용 시간(60·90·120분), 전체 비용과 추가 요금을 차례대로 짚으면 고르기가 수월해집니다. 특히 ${childLabel}에 따라 도착까지 걸리는 시간이 달라질 수 있으니, 원하는 지역을 먼저 정해 두는 편이 좋습니다.`,
    `${nm} 이용은 ① 방문 구역 ② 코스 ③ 이용 시간(60·90·120분) ④ 비용·추가 요금 차례로 짚으면 갈무리가 쉽습니다. ${childLabel}마다 구역이 달라 원하는 지역을 먼저 정하는 것이 관건입니다.`,
    `${nm}에서는 어느 ${childLabel}까지 찾아오는지, 어떤 코스를 받을지, 시간과 비용은 어떻게 되는지를 하나씩 짚으면 고르는 기준이 또렷해집니다. 지역에 따라 도착 시간이 달라진다는 점만 미리 헤아려 두세요.`,
  ];
  if (st) guideItems.push(`${nm} 내 ${esc(st)} 인근 ${childLabel}는 교통 접근성이 좋아, 타지역보다 도착 시간이 빠를 수 있으니 신청할 때 구역을 명확히 해 두세요.`);

  const secGuide = `
    <h2>${esc(nm)} 출장마사지 한눈에 보기</h2>
    <p>${esc(vpick(vb, "guide", guideItems))}</p>`;

  const progItems = [
    `오일로 부드럽게 풀고 싶다면 스웨디시·아로마테라피, 늘려 주는 관리를 바란다면 타이마사지, 집·숙소에서 편히 받고 싶다면 홈타이, 가볍게 일부만 받으려면 발마사지를 견줘 보세요.`,
    `${nm} 일대에서는 오일을 쓰는 스웨디시·아로마, 근육을 펴 주는 타이마사지, 찾아오는 홈타이, 일부만 받는 발마사지를 목적에 맞춰 고르면 됩니다.`,
    `피로한 부위와 좋아하는 세기에 따라 스웨디시·아로마(풀어 줌), 타이마사지(늘려 줌), 발마사지(일부), 홈타이(방문) 가운데 ${nm} 단위로 견줘 보세요.`,
  ];
  if (lm) progItems.push(`${esc(lm)} 근처에서 일하는 분들은 빠른 회복을 위해 타이마사지나 경락을 선호하는 경향이 있으므로, ${nm}에서 이용 가능한 프로그램을 미리 확인해 두세요.`);

  const secPrograms = `
    <h2>${esc(nm)}에서 비교해 볼 관리 방식</h2>
    <p>${esc(vpick(vb, "prog", progItems))}</p>
    ${programChips(nm)}
    ${callout()}`;

  const bookingItems = [
    `${nm}에서 출장마사지나 홈타이를 신청할 때는 원하는 하위 지역, 코스, 시간을 함께 전하면 방문이 되는지와 도착 예정 시각을 안내받을 수 있습니다. 처음이라면 지역을 짚고 → 코스를 고르고 → 시간·비용을 살핀 뒤 → 전화로 예약하는 순서로 가면 됩니다. 안내 요금에 방문비나 심야 추가 요금이 들어가는지, 관리사 성별 지정이 되는지도 미리 짚어 두면 좋습니다.`,
    `${nm} 신청은 원하는 ${childLabel}와 코스·시간을 전화로 전하는 것에서 출발합니다. 방문이 되는지와 도착 예정 시각, 전체 비용을 함께 짚고, 심야 추가 요금이나 관리사 성별 지정이 되는지도 미리 물어 두면 좋습니다.`,
    `${nm}에서 처음 신청한다면 ${child1} 같은 지역을 먼저 정하고, 코스와 시간을 고른 뒤 비용을 짚는 순서가 편합니다. 방문비·심야 요금이 들어 있는지 함께 살피면 실제 비용을 가늠하기 쉽습니다.`,
  ];
  if (st) bookingItems.push(`${nm} 내에서도 ${esc(st)} 인근 지역은 도착 시간이 더 빠를 수 있으므로, 신청할 때 정확한 ${childLabel}을(를) 전하면 더욱 정확한 예약 안내를 받을 수 있습니다.`);

  const secBooking = `
    <h2>${esc(nm)} 출장마사지 예약 안내</h2>
    <p>${esc(vpick(vb, "booking", bookingItems))} 안내된 정보는 참고용이며 실제 이용 조건은 예약 과정에서 확정됩니다.</p>`;

  const secChecklist = `
    <h2>예약 전 체크리스트</h2>
    <ul>${vsubset(vb, "check", [
      `방문받고 싶은 지역과 방문까지 걸리는 시간`,
      `받고 싶은 코스와 관리 시간`,
      `안내 요금에 방문비·심야 요금이 들어 있는지 여부`,
      `관리사 성별 지정 같은 추가 요청`,
      `관리 공간·타월 등 챙겨 둘 준비물`,
      `${childLabel}마다 방문되는 구역의 차이`,
      st ? `${esc(st)} 접근성과 실제 목적지까지의 거리 확인` : null,
      lm ? `${esc(lm)} 근처라는 점을 고려한 방문 가능 구역과 도착 시간` : null,
    ].filter(Boolean), 5).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

  const secFaq = `
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join("\n      ")}
    </div>
    ${authorBox()}
    ${ctaBtn(fullName + " 출장마사지")}`;

  let body;
  if (isMetro) {
    body = `
    ${bcNav(node)}
    <section class="hero"><div class="container">
      <p class="eyebrow">${esc(node.name)}</p>
      <h1>${esc(node.name)} 출장마사지·홈타이 — ${esc(childLabel)}·행정동별 찾기</h1>
      <p>${esc(
        node.intro ||
          `${node.name}은(는) ${childLabel}와 행정동에 따라 방문되는 구역과 도착까지 걸리는 시간이 달라집니다. 원하는 지역을 먼저 정하면 방문 여부와 코스를 더 또렷이 짚을 수 있습니다.`
      )}</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="${site.phoneHref}">📞 전화예약 ${esc(phone)}</a>
        <a class="btn btn-outline" href="/program/">프로그램 보기</a>
      </div>
    </div></section>
    ${childSection}
    <section class="section section-alt"><div class="container prose">
      ${secFeature}${secFeature2}${secWho}${secCompare}${secGuide}${secPrograms}${secBooking}${secChecklist}${secFaq}
    </div></section>
    ${reviewsSection(node.url)}
  ${pricingTable()}`;
  } else {
    // 본문 섹션 순서를 페이지마다 다르게(도어웨이 방지) — 도입/목록/FAQ 위치는 유지
    const pre = vshuffle(vb, "preOrder", [secWho, secCompare, secGuide]).join("");
    const post = vshuffle(vb, "postOrder", [secPrograms, secBooking, secChecklist]).join("");
    body = `
    ${bcNav(node)}
    <article class="section-tight"><div class="container prose">
      <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(metro)}</p>
      <h1>${esc(fullName)} 출장마사지·홈타이 이용 안내</h1>
      ${secFeature}${secFeature2}${pre}
      ${childSection}
      ${post}${secFaq}
    </div></article>
    ${reviewsSection(node.url)}
  ${pricingTable()}`;
  }

  return {
    path: node.url,
    file: node.url.replace(/^\//, "").replace(/\/$/, "") + "/index.html",
    html: layout({
      ...branchMeta(fullName, childLabel),
      path: node.url,
      body,
      structuredData: [
        faqLd(faqs),
        articleLd({
          headline: `${fullName} 출장마사지·홈타이 이용 안내`,
          description: `${fullName} 출장마사지·홈타이 이용 안내`,
          path: node.url,
          modified: MODIFIED,
        }),
        pricingLd(),
      ],
      breadcrumb: crumb(node),
    }),
  };
}

function collect(node, out) {
  if (node.kind === "dong") out.push(dongPage(node));
  else {
    out.push(branchPage(node));
    for (const k of node.children || []) collect(k, out);
  }
}

// 지역 트리 전체 빌드
export function buildRegionTree(root) {
  normalize(root, [], null);
  const pages = [];
  collect(root, pages);
  return pages;
}
