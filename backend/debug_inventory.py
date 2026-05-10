import urllib.request, json, sys

login_data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode()
req = urllib.request.Request('http://localhost:8000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
r = urllib.request.urlopen(req)
token = json.loads(r.read())['access_token']

# Test inventory page by page to find which page causes 500
for page in range(1, 10):
    url = f'http://localhost:8000/api/inventory?limit=20&page={page}'
    req3 = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        r3 = urllib.request.urlopen(req3)
        data = json.loads(r3.read())
        count = len(data.get('items', []))
        print(f'page={page} OK, items={count}')
        if count == 0:
            print('No more items.')
            break
    except urllib.error.HTTPError as e:
        print(f'page={page} FAIL: HTTP {e.code}')
        sys.exit(1)

# Now test limit=200
url2 = 'http://localhost:8000/api/inventory?limit=200'
req4 = urllib.request.Request(url2, headers={'Authorization': f'Bearer {token}'})
try:
    r4 = urllib.request.urlopen(req4)
    data4 = json.loads(r4.read())
    print(f'limit=200 OK total={data4.get("total")} items={len(data4.get("items",[]))}')
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f'limit=200 FAIL: HTTP {e.code}')
    print(body[:1000])
