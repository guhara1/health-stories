#!/usr/bin/env python3
"""
IndexNow 일괄 색인 통보 — 빙(Bing)·네이버(Naver)·얀덱스(Yandex) 등 IndexNow 참여 엔진에
사이트의 모든 URL을 즉시 통보한다. (구글은 IndexNow 미참여 → google_indexing.py 참고)

사용법:
  python tools/indexnow.py                 # dist/sitemap.xml 의 모든 URL 통보
  python tools/indexnow.py /outcall/ /guide/   # 특정 경로만 통보(글 올릴 때마다)
  HOST=massageintegration.com python tools/indexnow.py

전제:
  - 키 파일이 도메인 루트에 게시되어 있어야 함:
    https://<HOST>/<KEY>.txt  (내용 = <KEY>)
    빌드 시 dist/<KEY>.txt 로 자동 생성됨.
"""
import os
import sys
import json
import xml.etree.ElementTree as ET
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ── 설정 ───────────────────────────────────────────────
HOST = os.environ.get("HOST", "massageintegration.com")
KEY = os.environ.get("INDEXNOW_KEY", "b00508e375ed8ff4e993dc41ca0b8c4a")
SCHEME = os.environ.get("SCHEME", "https")
KEY_LOCATION = f"{SCHEME}://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"  # 참여 엔진 전체로 자동 분배
SITEMAP = os.path.join(os.path.dirname(__file__), "..", "dist", "sitemap.xml")
BATCH = 10000  # IndexNow 1회 최대 10,000 URL


def urls_from_sitemap(path):
    tree = ET.parse(path)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [loc.text.strip() for loc in tree.findall(".//sm:url/sm:loc", ns)]


def normalize(args):
    """경로(/outcall/)나 전체 URL을 절대 URL로 변환."""
    out = []
    for a in args:
        if a.startswith("http"):
            out.append(a)
        else:
            out.append(f"{SCHEME}://{HOST}{a if a.startswith('/') else '/' + a}")
    return out


def submit(url_list):
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": url_list,
    }
    data = json.dumps(payload).encode("utf-8")
    req = Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")
    except URLError as e:
        return 0, str(e)


def main():
    args = sys.argv[1:]
    if args:
        urls = normalize(args)
    else:
        if not os.path.exists(SITEMAP):
            print(f"✗ 사이트맵을 찾을 수 없습니다: {SITEMAP}\n  먼저 `npm run build` 를 실행하세요.")
            sys.exit(1)
        urls = urls_from_sitemap(SITEMAP)

    print(f"→ IndexNow 통보: {len(urls)}개 URL  (host={HOST}, key={KEY[:8]}…)")
    ok = 0
    for i in range(0, len(urls), BATCH):
        chunk = urls[i : i + BATCH]
        status, body = submit(chunk)
        # 200/202 = 수신 성공, 422 = 일부 URL 형식 문제, 403 = 키 검증 실패
        label = {200: "성공", 202: "수락됨"}.get(status, f"응답 {status}")
        print(f"  배치 {i // BATCH + 1}: {len(chunk)}개 → {label}")
        if status in (200, 202):
            ok += len(chunk)
        elif body:
            print(f"    ↳ {body[:200]}")
    print(f"✓ 완료: {ok}/{len(urls)}개 통보")
    if ok == 0:
        print("  키 파일이 도메인 루트에 게시됐는지 확인하세요 →", KEY_LOCATION)


if __name__ == "__main__":
    main()
