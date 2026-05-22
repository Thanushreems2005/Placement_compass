import urllib.request, urllib.parse, json, sys

def fetch(path, timeout=10):
    try:
        with urllib.request.urlopen(path, timeout=timeout) as r:
            body = r.read().decode('utf-8')
            try:
                parsed = json.loads(body)
                print(f"OK {path} -> STATUS {r.getcode()} KEYS {list(parsed.keys())[:6]}")
            except Exception:
                print(f"OK {path} -> STATUS {r.getcode()} BODY_SNIPPET {body[:200]!r}")
    except Exception as e:
        print(f"ERR {path} -> {e}")

if __name__ == '__main__':
    base = 'http://127.0.0.1:8000'
    fetch(base + '/')
    fetch(base + '/api/v1/openapi.json')
    name = 'Adobe Inc.'
    encoded = urllib.parse.quote(name, safe='')
    fetch(base + f'/api/v1/companies/search/{encoded}', timeout=30)
