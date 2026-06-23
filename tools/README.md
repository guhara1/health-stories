# 색인(인덱싱) 도구 — 빙·네이버·구글 빠른 색인

사이트의 빠른 검색 노출을 위한 도구 모음입니다. 빌드(`npm run build`) 시
색인에 필요한 파일이 `dist/`에 자동 생성됩니다.

## 자동 생성되는 파일 (빌드 결과물)

| 파일 | 용도 |
|---|---|
| `sitemap.xml` | 전체 URL 목록 — 구글/네이버/빙 Search Console 제출용 |
| `rss.xml` | RSS 2.0 피드 — 네이버·피드리더 발견/색인용 |
| `robots.txt` | 크롤러 허용 + 사이트맵 위치 안내 (구글봇·빙봇·네이버 Yeti·다음 Daumoa 명시) |
| `<KEY>.txt` | IndexNow 키 파일 (도메인 루트 게시 필수) |
| `llms.txt` | AI 에이전트용 사이트 요약 |

`<head>`에는 네이버 사이트 인증 메타와 RSS 자동발견 링크가 포함됩니다.

## 1. IndexNow — 빙·네이버·얀덱스 즉시 통보 (주력, 권장)

구글은 IndexNow에 참여하지 않지만, **빙·네이버·얀덱스**는 즉시 반영됩니다.

```bash
# 전체 URL 일괄 통보 (배포 후 1회)
python tools/indexnow.py

# 글/페이지를 새로 올리거나 수정할 때 — 해당 URL만 즉시 통보
python tools/indexnow.py /outcall/ /region/seoul/gangnam/
```

전제: 키 파일이 `https://massageintegration.com/b00508e375ed8ff4e993dc41ca0b8c4a.txt`
로 게시되어 있어야 합니다(빌드 시 `dist/`에 자동 생성 → 배포하면 충족).

## 2. 네이버 — Search Advisor

1. https://searchadvisor.naver.com → 사이트 등록
2. 소유 확인: `<head>`에 이미 인증 메타가 들어 있음 (자동 확인됨)
3. **요청 → 사이트맵 제출**: `https://massageintegration.com/sitemap.xml`
4. **요청 → RSS 제출**: `https://massageintegration.com/rss.xml`
5. IndexNow는 위 `tools/indexnow.py`로 즉시 통보 (네이버 IndexNow 참여)

## 3. 구글 — Search Console (기본 경로)

> ⚠️ 구글 sitemap "ping"(`google.com/ping`)은 2023년 폐지됨. 아래가 정식 경로입니다.

1. https://search.google.com/search-console → 도메인 등록
2. **색인 → Sitemaps** 에 `sitemap.xml` 제출
3. 개별 URL은 **URL 검사 → 색인 요청** 으로 수동 요청

### (선택) 구글 Indexing API
```bash
pip install google-auth requests
GOOGLE_APPLICATION_CREDENTIALS=sa.json python tools/google_indexing.py /outcall/
```
공식 지원 대상은 JobPosting·BroadcastEvent이므로 일반 페이지는 보장되지 않습니다
(`tools/google_indexing.py` 상단 주석 참고).

## 권장 운영 흐름

1. 콘텐츠 수정 → `npm run build` → 배포
2. `python tools/indexnow.py <바뀐 경로들>` (빙·네이버 즉시)
3. 큰 변경 시 구글 Search Console에서 sitemap 재처리 확인

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `HOST` | `massageintegration.com` | 도메인 |
| `SCHEME` | `https` | 프로토콜 |
| `INDEXNOW_KEY` | `b00508e375ed8ff4e993dc41ca0b8c4a` | IndexNow 키 |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | 구글 서비스 계정 JSON 경로 |
