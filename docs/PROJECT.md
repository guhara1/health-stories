# 헬스 스토리(Health Story) — 프로젝트 전체 문서

전국 **출장마사지·홈타이 정보 안내 플랫폼**. 데이터·디자인·콘텐츠·SEO·색인까지
구축 내역 전체를 정리한 문서입니다. (최종 갱신: 2026-06-21)

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| 사이트명 | 헬스 스토리 (Health Story) |
| 도메인 | https://massageintegration.com |
| 메인 키워드 | 출장마사지 (보조: 홈타이) |
| 전화예약 | 0508-202-4719 |
| 이메일 | help@massageintegration.com |
| 성격 | 정보 안내 플랫폼 (통신판매 비당사자) |
| 총 페이지 | **3,898개** (전부 고유 타이틀·디스크립션) |

---

## 2. 기술 스택 / 빌드 시스템

- **정적 사이트 생성기**: 순수 Node.js (ESM `.mjs`), 프레임워크 없음
- 템플릿 = 태그드 템플릿 리터럴 → `dist/`에 HTML 파일 출력
- 빌드: `npm run build` (`node scripts/build.mjs`)
- 로컬 서버: `node scripts/serve.mjs`
- 배포: **Cloudflare Pages** (빌드 `npm run build`, 출력 `dist`)
- 도메인/URL은 `SITE_URL` 환경변수로 override 가능

### 파일 구조
```
data/        # 콘텐츠 데이터
  site.mjs        사이트 전역 설정·메뉴·프로그램 메뉴
  programs.mjs    22개 프로그램 본문
  programs-extra.mjs  프로그램 보조 콘텐츠
  regions.mjs     17개 시·도 + 권역 그룹
  seoul.mjs / gyeonggi.mjs / incheon.mjs   수도권 상세
  metros.mjs / provinces.mjs               광역시·도 트리
  subway.mjs      5개 권역 33개 노선 지하철
scripts/
  build.mjs       메인 생성기
  locations.mjs   서울 계층 생성기
  region-tree.mjs 범용 지역 트리 생성기(광역→시→구→동)
  subway-tree.mjs 지하철 노선/역 생성기
  variants.mjs    변형 엔진(도어웨이 방지)
  romanize.mjs    한글→로마자 슬러그
  audit-similarity.mjs  유사도/도어웨이 감사 도구
  serve.mjs       로컬 미리보기 서버
src/
  templates/layout.mjs   공용 레이아웃(head·헤더·푸터·JSON-LD·목차·요금·후기)
  assets/styles.css      디자인 시스템(다크 럭셔리)
  assets/main.js         내비·메가메뉴·스크롤 인터랙션·목차 스파이
  assets/hero.jpg/.webp  히어로 대표 이미지(16:9, 최적화)
tools/
  indexnow.py     IndexNow 일괄/개별 색인 통보(빙·네이버)
  google_indexing.py  구글 Indexing API(선택)
  README.md       색인 운영 가이드
docs/PROJECT.md   (이 문서)
```

---

## 3. 디자인 시스템 — "다크 럭셔리"

토큰 3계층(Primitive → Semantic → Component)으로 구성.

### 색상 팔레트
| 토큰 | 값 | 용도 |
|---|---|---|
| `--c-bg-0~3` | `#091713` · `#0d1f1c` · `#112823` · `#16332c` | 딥 그린 배경 단계 |
| `--c-gold-700~300` | `#9c7c3f` · `#b8965a` · `#c9a96a` · `#d8be86` · `#e3cfa3` | 골드 액센트 스케일 |
| `--color-text` | 아이보리 | 본문 |
| `--color-accent` | `#c9a96a` | 포인트(링크·버튼·강조) |

### 타이포 / 토큰
- 폰트: **Pretendard**(가변, 비동기 로드 — 렌더 차단 제거)
- 모서리: `--r-sm 10px / --r-md 16px / --r-lg 24px / --r-pill 999px`
- 그림자: `--shadow-sm/md/lg`, `--glow-gold`(골드 글로우)
- 이징: `--ease: cubic-bezier(.22,1,.36,1)`

### 컴포넌트 / 인터랙션
- 메가메뉴(PC 4열 / 모바일 아코디언), 카드 골드 보더 글로우(`::before`)
- 히어로 16:9 대표 이미지(데스크톱 우측 프레임 / 모바일 풀폭, webp+jpg image-set)
- **목차(TOC)**: 골드 번호 카운터·좌측 액센트·호버·현재 섹션 스파이
- 본문 H2 골드 액센트 바, 스크롤 등장 마이크로 인터랙션(IntersectionObserver)
- 요금표·후기 카드, 모바일 하단 고정 전화 바

---

## 4. 페이지 구조 & 통계 (총 3,898)

| 구분 | 페이지 수 |
|---|---|
| 지역(region) | 2,943 |
| 지하철(subway) | 925 |
| 프로그램(program) | 23 (인덱스+22) |
| 상단 안내(홈·출장마사지·가이드·이용안내·문의) | 6 |
| 정책(개인정보처리방침·이용약관) | 2 |

### 상단 메뉴 (8개) — 전부 본문 2,000자+
홈 `/` · 출장마사지 `/outcall/` · 지역별 찾기 `/region/` · 지하철역별 찾기
`/subway/` · 마사지 프로그램 `/program/` · 예약 가이드 `/guide/` · 이용 안내
`/about/` · 문의하기 `/contact/`

---

## 5. 마사지 프로그램 (22개 / 4그룹)

각 프로그램 페이지: 고유 본문 2,000자+, 목차·FAQ·JSON-LD·E-E-A-T 바이라인.

**관리 프로그램(9)**: 스웨디시, 타이마사지, 아로마테라피, 로미로미, 중국마사지,
발마사지, 스포츠&경락, 스킨케어, 왁싱
**방문·이용 방식(6)**: 홈타이, 스파/사우나, 호텔식마사지, 수면가능, 24시간, 1인샵/2인샵
**대상·관리사 기준(4)**: 남성전용, 여성전용(여성전용 출장마사지·토닥이 마사지),
남자관리사, 커플환영
**추천·혜택(3)**: 신규업소, 할인업소, 두리코스

URL 예: `/program/swedish/`, `/program/home-care/`(홈타이), `/program/women-only/`

---

## 6. 지역 구조 (전국 17개 시·도 / 2,943 페이지)

광역 → 시·군·구 → 행정동(읍·면)까지 계층 생성. 인천 2026 행정구역 개편
(제물포구·영종구·검단구 신설) 반영. 모든 페이지 고유 본문 2,000자+.

| 권역 | 시·도 (페이지 수) |
|---|---|
| 수도권 | 서울 257 · 경기 409 · 인천 96 |
| 강원·충청 | 강원 183 · 대전 67 · 세종 24 · 충북 151 · 충남 201 |
| 호남 | 광주 65 · 전북 205 · 전남 310 |
| 영남·제주 | 부산 120 · 대구 91 · 울산 49 · 경북 345 · 경남 327 · 제주 42 |

URL 예: `/region/seoul/gangnam/sinsa/`, `/region/gyeonggi/suwon/`(수원=경기 하위)

---

## 7. 지하철 (5개 권역 / 33개 노선 / 925 페이지)

노선 페이지 + 역 페이지. **동명역(부산 시청 ≠ 대전 시청)은 별개 페이지**로 분리,
권역 시스템별 레지스트리로 메타 고유화.

| 권역 | 노선 수 | 비고 |
|---|---|---|
| 수도권 | 22 | 1~9호선·인천1·2·신분당·경의중앙·경춘·수인분당·공항철도·우이신설·신림·김포골드·에버라인·의정부경전철·GTX-A 등 |
| 부산 | 6 | 1~4호선·김해경전철·동해선 |
| 대구 | 3 | 1~3호선 |
| 광주 | 1 | 1호선 |
| 대전 | 1 | 1호선 |

URL 예: `/subway/line/line2/`(노선), `/subway/gangnam/`(역), `/subway/busan-sicheong/`

---

## 8. SEO / E-E-A-T

- **타이틀 규칙**: 모든 지역·지하철 페이지 타이틀이 `지역명 + 출장마사지`로 시작
- **메타 디스크립션** ≤ 80자, 전 페이지 고유(중복 0)
- **타이틀·디스크립션 중복 0** (빌드가 강제 검사)
- **구조화 데이터(JSON-LD)**: HealthAndBeautyBusiness, Article(저자/검수/수정일),
  FAQPage, BreadcrumbList, Service/Offer(요금). (허위 Review/AggregateRating은
  정책상 미사용)
- **E-E-A-T**: 편집팀 바이라인·검수자·최종 수정일, 편집·운영 정책 공개
- **선호 썸네일**: og:image + schema image 동시 지정
- **자동 목차(앵커 링크)**: 3,892개 콘텐츠 페이지에 섹션 id + 클릭 이동 목차
- **내부 링크**: 전국 17개 시·도를 지역마다 다른 자연스러운 앵커로 연결
  (완전 일치 반복·스터핑 회피), 프로그램 페이지는 지역+프로그램 문맥 롱테일
- **성능**: 비동기 폰트(렌더 차단 제거), 히어로 LCP preload(fetchpriority=high),
  image-set(webp/jpg)

### 도어웨이/유사·복사 방지 — 변형 엔진
`scripts/variants.mjs`의 슬롯별 독립 시드(vpick/vsubset/vshuffle)로 각 문단·목록·
섹션 순서를 페이지마다 다르게 선택. 같은 역명/동명이 도시만 달라도 본문이 갈라짐.

| 유사도(≥0.5 쌍) | 조치 전 | 조치 후 |
|---|---|---|
| near-duplicate | 408,810 | **0** |

`node scripts/audit-similarity.mjs`로 상시 감사(MinHash/LSH).

---

## 9. 푸터 / 정책 (E-E-A-T 신뢰 신호)

- **NAP**: `<address>`로 상호·전화·이메일 명시
- **정책·약관**: 개인정보처리방침 `/privacy/`, 이용약관 `/terms/`,
  편집·운영 정책, 사이트맵 링크
- **비즈니스 문의 버튼**: 웹사이트 제작문의·제휴문의 → 텔레그램
  `https://t.me/googleseolab` (rel=noopener noreferrer nofollow)
- 저작권 + 법적 고지(정보 플랫폼·통신판매 비당사자), 시맨틱 nav(aria-label)

---

## 10. 색인(인덱싱) 인프라

빌드 시 자동 생성: `sitemap.xml`(3,898 URL) · `rss.xml` · `robots.txt`(구글봇·빙봇·
네이버 Yeti·다음 Daumoa 명시) · IndexNow 키 파일 · `llms.txt`.
`<head>`에 **네이버 사이트 인증 메타** + RSS 자동발견 링크 포함.

| 경로 | 엔진 | 방법 |
|---|---|---|
| IndexNow | 빙·네이버·얀덱스 | `python tools/indexnow.py [경로…]` (즉시 통보) |
| Search Advisor | 네이버 | sitemap.xml + rss.xml 제출, 메타로 소유확인 |
| Search Console | 구글 | sitemap.xml 제출 (ping은 2023년 폐지) |
| Indexing API | 구글(선택) | `tools/google_indexing.py` (공식: JobPosting 한정) |

운영 가이드: `tools/README.md`. IndexNow 키:
`b00508e375ed8ff4e993dc41ca0b8c4a` (키 파일 도메인 루트 게시 필수).

---

## 11. 검증 결과 (최종)

- 총 페이지 **3,898** / 타이틀·디스크립션 **중복 0** (3,898종 고유)
- near-duplicate(유사도 ≥0.5) **0쌍**
- 내부 링크 **0 broken**
- 전 페이지 본문 **2,000자+** (프로그램 최소 2,100자+)

---

## 12. 명령어 / 운영

```bash
npm run build                 # 사이트 생성 → dist/
node scripts/serve.mjs        # 로컬 미리보기
node scripts/audit-similarity.mjs   # 유사도·중복·도어웨이 감사
python tools/indexnow.py            # 배포 후 빙·네이버 일괄 색인 통보
python tools/indexnow.py /경로/      # 변경 페이지만 즉시 통보
```

### 배포 체크리스트
1. Cloudflare Pages 빌드(`npm run build`, 출력 `dist`)
2. `massageintegration.com` 커스텀 도메인 연결 + DNS
3. 네이버 Search Advisor / 구글 Search Console에 sitemap·rss 제출
4. `python tools/indexnow.py` 1회 실행(전체 통보)
5. 이후 콘텐츠 변경 시 변경 경로만 `tools/indexnow.py`로 통보
