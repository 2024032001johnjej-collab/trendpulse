import time
import requests

email = f"loopfix_{int(time.time())}@example.com"
pwd = "Pass123!"
base = "http://localhost:5001"

s = requests.Session()

r1 = s.post(base + "/api/auth/signup", json={"name": "Loop Fix User", "email": email, "password": pwd}, timeout=20)
print("signup", r1.status_code, r1.text)

r2 = s.post(base + "/api/auth/login", json={"email": email, "password": pwd}, timeout=20)
print("login", r2.status_code)

data = r2.json()
token = data.get("token", "")
print("token_present", bool(token))

headers = {"Authorization": f"Bearer {token}"}
r3 = s.get(base + "/api/auth/me", headers=headers, timeout=20)
print("me", r3.status_code, r3.text)
