# 헬스 스토리 (Health Story)

출장마사지·홈타이 정보 안내 정적 사이트. SEO(E-E-A-T·구조화 데이터)와 빠른 로딩(Core Web Vitals)에 맞춰 정적 HTML로 생성합니다.

- **상호:** 헬스 스토리
- **전화예약:** 0508-202-4719

## 빠른 시작

```bash
npm run build   # dist/ 에 정적 사이트 생성
npm run serve   # http://localhost:4173 미리보기
npm run dev     # build + serve
```

빌드 결과(`dist/`)는 어떤 정적 호스팅(Netlify, Vercel, S3, Nginx 등)에도 그대로 올릴 수 있습니다.

## 구조

```
data/
  site.mjs            # 비즈니스 정보, 상단 메뉴, 메가메뉴(4그룹) 정의
  programs.mjs        # 22개 프로그램 페이지 고유 본문
  programs-extra.mjs  # 프로그램별 추가 고유 콘텐츠(이용 흐름/주의/지역 선택 기준)
  regions.mjs         # 지역·지하철역 페이지 데이터
src/
  assets/styles.css   # 프리미엄 팔레트 디자인 토큰 + 컴포넌트 오버레이(Pretendard)
  assets/main.js      # PC 메가메뉴 / 모바일 아코디언 내비
  templates/layout.mjs# 공통 레이아웃 + SEO 헤드 + JSON-LD 헬퍼
scripts/
  build.mjs           # 정적 사이트 생성기
  serve.mjs           # 의존성 없는 미리보기 서버
dist/                 # 생성된 정적 사이트(배포 대상)
```

## 메뉴 구조

상단 메뉴: 홈 · 출장마사지 · 지역별 찾기 · 지하철역별 찾기 · **마사지 프로그램** · 예약 가이드 · 이용 안내 · 문의하기

「마사지 프로그램」 메가메뉴 4그룹 (PC 4열 / 모바일 아코디언):

1. **관리 프로그램** — 스웨디시, 타이마사지, 아로마테라피, 로미로미, 중국마사지, 발마사지, 스포츠&경락, 스킨케어, 왁싱
2. **방문·이용 방식** — 홈타이(방문), 스파/사우나, 호텔식마사지, 수면가능, 24시간, 1인샵/2인샵
3. **대상·관리사 기준** — 남성전용, 여성전용, 남자관리사, 커플환영
4. **추천·혜택** — 신규업소, 할인업소, 두리코스

> 홈타이 단독 상단 메뉴는 만들지 않으며, 본문 내 출장마사지의 보조 키워드로만 사용합니다.

## SEO 적용 사항

- **메타 디스크립션 80자 이내** (전 페이지 자동 검증)
- **프로그램 페이지 2,000~2,500자 고유 콘텐츠** (빌드 시 분량 검증, 도어웨이 방지)
- **E-E-A-T**: 작성자·검수자 표기, 최종 수정일, 편집/운영 정책 공개(`/about/`)
- **구조화 데이터(JSON-LD)**: HealthAndBeautyBusiness, Article(author/dateModified), FAQPage, BreadcrumbList
- **선호 썸네일 지정**: `og:image` + schema `image`
- **내부링크**: 프로그램 ↔ 지역/지하철 페이지 롱테일 키워드 연결
- `sitemap.xml`, `robots.txt` 자동 생성
- 시맨틱 마크업, 모바일 최적화, HTTPS 권장, JS 비차단(`defer`)

## 콘텐츠 추가

- 프로그램: `data/programs.mjs` + `data/programs-extra.mjs` 에 항목 추가
- 지역/역: `data/regions.mjs` 에 항목 추가

추가 후 `npm run build` 한 번이면 메뉴·사이트맵·내부링크에 자동 반영됩니다.

## 주의

가격·운영 정보는 변동될 수 있으므로, 페이지에는 항상 "예약 전 직접 확인" 안내를 노출합니다. 건전한 관리 서비스 정보만 안내합니다.
