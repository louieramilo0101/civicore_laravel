#!/usr/bin/env python3
"""CiviCORE Alpha + Beta testing harness.
Runs the 7 instrument modules against the live API and prints a status table.
"""
import urllib.request, urllib.error, json, http.cookiejar, time, sys, os

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8000/api')
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api(method, path, data=None, raw=False):
    url = BASE + path
    req = urllib.request.Request(url, method=method)
    if data is not None:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode()
    try:
        r = opener.open(req, timeout=60)
        body = r.read()
        return r.status, (body if raw else body.decode('utf-8', 'replace')[:1500])
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')[:800]

def ok(resp):
    s, b = resp
    try:
        j = json.loads(b)
        return s < 400 and j.get('success', True) is not False
    except Exception:
        return s < 400

results = []
def check(name, resp):
    s, b = resp
    passed = ok(resp)
    results.append((name, passed, s, b))
    print(f"  [{'PASS' if passed else 'FAIL'}] {name}  (HTTP {s})")
    if not passed:
        print(f"        -> {b[:300]}")

# ── Bootstrap: list users to find credentials ──────────────────────────
print('== Finding credentials ==')
st, b = api('GET', '/users')
print('users:', b[:600])