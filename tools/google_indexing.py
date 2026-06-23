#!/usr/bin/env python3
"""
구글 Indexing API 통보 (선택) — 구글은 IndexNow에 참여하지 않으므로 별도 경로.

⚠️ 중요 / 정직한 안내:
  - 구글 Indexing API는 공식적으로 JobPosting·BroadcastEvent 페이지만 지원합니다.
    일반 페이지에도 호출은 되지만 색인이 보장되지 않습니다(비공식 활용).
  - 구글 sitemap "ping"(google.com/ping?sitemap=)은 2023년에 폐지되었습니다.
    → 구글 정식 경로: Search Console에 sitemap.xml 제출 + 필요한 URL 수동 색인 요청.
  - 따라서 빠른 색인의 주력은 IndexNow(빙·네이버), 구글은 Search Console가 기본입니다.

사전 준비:
  1) Google Cloud 프로젝트 → Indexing API 사용 설정
  2) 서비스 계정 생성 → JSON 키 다운로드 → 환경변수 GOOGLE_APPLICATION_CREDENTIALS 지정
  3) Search Console에서 해당 서비스 계정 이메일을 '소유자'로 추가
  4) 의존성:  pip install google-auth requests

사용법:
  GOOGLE_APPLICATION_CREDENTIALS=sa.json python tools/google_indexing.py /outcall/ /guide/
  GOOGLE_APPLICATION_CREDENTIALS=sa.json python tools/google_indexing.py   # sitemap 전체
"""
import os
import sys
import xml.etree.ElementTree as ET

HOST = os.environ.get("HOST", "massageintegration.com")
SCHEME = os.environ.get("SCHEME", "https")
SITEMAP = os.path.join(os.path.dirname(__file__), "..", "dist", "sitemap.xml")
ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SCOPES = ["https://www.googleapis.com/auth/indexing"]


def urls_from_sitemap(path):
    tree = ET.parse(path)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [loc.text.strip() for loc in tree.findall(".//sm:url/sm:loc", ns)]


def normalize(args):
    out = []
    for a in args:
        out.append(a if a.startswith("http") else f"{SCHEME}://{HOST}{a if a.startswith('/') else '/' + a}")
    return out


def main():
    try:
        import requests
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        print("✗ 의존성이 필요합니다:  pip install google-auth requests")
        sys.exit(1)

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path or not os.path.exists(cred_path):
        print("✗ 환경변수 GOOGLE_APPLICATION_CREDENTIALS 에 서비스 계정 JSON 경로를 지정하세요.")
        sys.exit(1)

    args = sys.argv[1:]
    urls = normalize(args) if args else urls_from_sitemap(SITEMAP)

    creds = service_account.Credentials.from_service_account_file(cred_path, scopes=SCOPES)
    session = AuthorizedSession(creds)

    print(f"→ 구글 Indexing API 통보: {len(urls)}개 URL (일일 쿼터 기본 200건 주의)")
    ok = 0
    for url in urls:
        r = session.post(ENDPOINT, json={"url": url, "type": "URL_UPDATED"})
        if r.status_code == 200:
            ok += 1
        else:
            print(f"  {r.status_code}  {url}  {r.text[:120]}")
    print(f"✓ 완료: {ok}/{len(urls)}건")


if __name__ == "__main__":
    main()
