#!/usr/bin/env python3
"""Submit every URL in the live sitemap to IndexNow (Bing, Yandex, and others).

Usage: python3 scripts/indexnow.py
Run once after a deploy is live. The key is public by design; the key file at the
site root proves we own the host. Standard library only.
"""
import json, re, sys, urllib.request

HOST = "www.system6point9.com"
KEY = "cd349d59d162502c560f120945d8f636"
SITEMAP = f"https://{HOST}/sitemap.xml"
KEY_URL = f"https://{HOST}/{KEY}.txt"
UA = {"User-Agent": "indexnow-submit/1.0"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return r.read().decode("utf-8", "replace")

def main():
    if get(KEY_URL).strip() != KEY:
        sys.exit(f"Key file at {KEY_URL} is missing or wrong; deploy it first.")
    urls = sorted(set(re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", get(SITEMAP))))
    urls = [u for u in urls if u.split("/")[2] == HOST]
    if not urls:
        sys.exit("No URLs for this host in the sitemap.")
    body = json.dumps({"host": HOST, "key": KEY, "keyLocation": KEY_URL, "urlList": urls}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, method="POST",
                                 headers={**UA, "Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    print(f"IndexNow {HOST}: submitted {len(urls)} URLs, HTTP {code}")
    sys.exit(0 if code in (200, 202) else 1)

if __name__ == "__main__":
    main()
