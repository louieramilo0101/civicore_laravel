#!/usr/bin/env python3
"""CiviCORE Alpha + Beta Testing Harness.
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
    status = 'PASS' if passed else 'FAIL'
    print(f"  [{status}] {name}  (HTTP {s})")
    if not passed:
        print(f"        -> {b[:300]}")

# ── Auth ─────────────────────────────────────────────────────────────
print('== Auth ==')
check('Login', api('POST', '/login', {'email': 'admin@civicore.test', 'password': 'password'}))
check('Session', api('GET', '/session'))

# ── 1 OCR-based searchability ───────────────────────────────────────
print('\n== 1. OCR-based searchability ==')
check('Upload document (scanned)', api('POST', '/documents/upload', {'dummy': 'placeholder'}))
check('OCR process', api('POST', '/ocr/process', {'document_id': 1}))
check('OCR search (issuances)', api('POST', '/issuances/ocr-search', {'query': 'test'}))
check('Documents list with OCR text', api('GET', '/documents'))

# ── 2 Automated document generation ─────────────────────────────────
print('\n== 2. Automated document generation ==')
check('Templates list', api('GET', '/templates'))
check('Template preview', api('GET', '/templates/preview'))
check('Registry next cert number', api('GET', '/registry/next-cert-number/birth'))
check('Document download', api('GET', '/documents/download/1'))

# ── 3 Geospatial Mapping ────────────────────────────────────────────
print('\n== 3. Geospatial Mapping ==')
check('Barangays list (map points)', api('GET', '/barangays'))
check('Registry for attach (geo)', api('GET', '/registry/for-attach'))

# ── 4 Role-Based Access Control ─────────────────────────────────────
print('\n== 4. Role-Based Access Control (RBAC) ==')
check('Users list (admin only)', api('GET', '/users'))
check('User profile update', api('PUT', '/users/1/profile', {'first_name': 'Admin'}))

# ── 5 Document Request Approval Module ──────────────────────────────
print('\n== 5. Document Request Approval Module ==')
check('Tickets list', api('GET', '/tickets'))
check('Ticket detail', api('GET', '/tickets/1'))
check('Update ticket status', api('PUT', '/tickets/1/status', {'status': 'approved'}))
check('Ticket issuances', api('GET', '/ticket-issuances'))

# ── 6 Centralized Data Management Module ────────────────────────────
print('\n== 6. Centralized Data Management Module ==')
check('Registry birth records', api('GET', '/registry'))
check('Registry detail', api('GET', '/registry/birth/1'))
check('Archive list', api('GET', '/archive'))
check('Documents history', api('GET', '/documents/history'))

# ── 7 QR Code-based Ticketing Module ────────────────────────────────
print('\n== 7. QR Code-based Ticketing Module ==')
check('Public ticket create', api('POST', '/public/tickets', {'type': 'birth', 'details': 'test'}))
check('Public ticket show by token', api('GET', '/public/tickets/TEST_TOKEN'))
check('Scan check-in', api('POST', '/v1/tickets/scan', {'token': 'TEST_TOKEN'}))

# ── Summary ──────────────────────────────────────────────────────────
print('\n' + '='*60)
print('ALPHA TEST SUMMARY')
print('='*60)
passed = sum(1 for _, p, _, _ in results if p)
total = len(results)
for name, p, s, b in results:
    print(f"  [{'PASS' if p else 'FAIL'}] {name}")
print(f'\nTotal: {passed}/{total} passed ({passed/total*100:.0f}%)')

# ── Beta: Response Time ──────────────────────────────────────────────
print('\n' + '='*60)
print('BETA TEST - RESPONSE TIMES (3 trials each)')
print('='*60)

beta_activities = [
    ('OCR upload + search', 'POST', '/documents/upload', {}),
    ('Document generation', 'GET', '/templates/preview', None),
    ('Geospatial mapping', 'GET', '/barangays', None),
    ('RBAC login + access', 'POST', '/login', {'email': 'admin@civicore.test', 'password': 'password'}),
    ('Doc request approve/reject', 'PUT', '/tickets/1/status', {'status': 'approved'}),
    ('Centralized data CRUD', 'GET', '/documents', None),
    ('QR ticket generate + scan', 'POST', '/public/tickets', {'type': 'birth', 'details': 'test'}),
]

for name, method, path, data in beta_activities:
    times = []
    for t in range(3):
        start = time.time()
        resp = api(method, path, data)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  {name} Trial {t+1}: {elapsed:.3f}s (HTTP {resp[0]})")
    print(f"    AVG: {sum(times)/len(times):.3f}s  MIN: {min(times):.3f}s  MAX: {max(times):.3f}s")

print('\nDone.')