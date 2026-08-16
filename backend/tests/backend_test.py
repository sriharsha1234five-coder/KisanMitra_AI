"""
KisanMitra AI backend tests
Covers: auth, assess, chat, daily-plan, schemes, schemes/match, guide, farms CRUD, tasks CRUD, history, tts
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass

API = f"{BASE_URL}/api"
UNIQUE = uuid.uuid4().hex[:8]
FARMER_EMAIL = f"TEST_farmer_{UNIQUE}@test.com"
FARMER_PASSWORD = "farmer123"
ADMIN_EMAIL = "admin@kisanmitra.ai"
ADMIN_PASSWORD = "admin123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def farmer_token():
    r = requests.post(f"{API}/auth/register", json={
        "name": "Test Farmer", "email": FARMER_EMAIL, "password": FARMER_PASSWORD
    }, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"].lower() == FARMER_EMAIL.lower()
    return data["token"]


@pytest.fixture(scope="session")
def farmer_headers(farmer_token):
    return {"Authorization": f"Bearer {farmer_token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d
        assert d["user"]["email"] == ADMIN_EMAIL

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, farmer_headers):
        r = requests.get(f"{API}/auth/me", headers=farmer_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"].lower() == FARMER_EMAIL.lower()

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_duplicate_register(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "dup", "email": FARMER_EMAIL, "password": "x"
        }, timeout=15)
        assert r.status_code == 400


# ---------- Schemes / Guide (no AI) ----------
class TestSchemesGuide:
    def test_list_schemes(self):
        r = requests.get(f"{API}/schemes", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("schemes"), list) and len(d["schemes"]) > 0
        assert "categories" in d
        s = d["schemes"][0]
        for k in ("id", "name", "category", "what", "keywords"):
            assert k in s

    def test_schemes_search(self):
        r = requests.get(f"{API}/schemes?q=insurance", timeout=15)
        assert r.status_code == 200
        # search should either narrow results or return an empty list, both are valid
        assert isinstance(r.json()["schemes"], list)

    def test_guide(self):
        r = requests.get(f"{API}/guide", timeout=15)
        assert r.status_code == 200
        arts = r.json()["articles"]
        assert isinstance(arts, list) and len(arts) > 0


# ---------- Farms CRUD ----------
class TestFarms:
    def test_farm_crud(self, farmer_headers):
        # CREATE
        payload = {"name": "TEST_Farm", "crop": "Rice", "growth_stage": "Vegetative",
                   "soil_type": "Loamy", "irrigation": "Flood", "location": "Punjab"}
        r = requests.post(f"{API}/farms", headers=farmer_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        farm = r.json()
        assert farm["name"] == "TEST_Farm"
        assert farm["crop"] == "Rice"
        assert "id" in farm and "_id" not in farm
        fid = farm["id"]

        # LIST -> contains it
        r = requests.get(f"{API}/farms", headers=farmer_headers, timeout=15)
        assert r.status_code == 200
        assert any(f["id"] == fid for f in r.json())

        # UPDATE
        r = requests.put(f"{API}/farms/{fid}", headers=farmer_headers, json={"variety": "Basmati"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("variety") == "Basmati"

        # DELETE
        r = requests.delete(f"{API}/farms/{fid}", headers=farmer_headers, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/farms", headers=farmer_headers, timeout=15)
        assert not any(f["id"] == fid for f in r.json())


# ---------- Tasks CRUD ----------
class TestTasks:
    def test_task_crud(self, farmer_headers):
        r = requests.post(f"{API}/tasks", headers=farmer_headers,
                          json={"title": "TEST_task", "priority": "High"}, timeout=15)
        assert r.status_code == 200
        t = r.json()
        assert t["title"] == "TEST_task"
        assert t["priority"] == "High"
        assert t["done"] is False
        tid = t["id"]

        # toggle done
        r = requests.put(f"{API}/tasks/{tid}", headers=farmer_headers, json={"done": True}, timeout=15)
        assert r.status_code == 200
        assert r.json()["done"] is True

        # list
        r = requests.get(f"{API}/tasks", headers=farmer_headers, timeout=15)
        assert r.status_code == 200
        assert any(x["id"] == tid for x in r.json())

        # delete
        r = requests.delete(f"{API}/tasks/{tid}", headers=farmer_headers, timeout=15)
        assert r.status_code == 200


# ---------- AI: assess, chat, daily-plan, schemes/match (slow) ----------
class TestAIEndpoints:
    def test_assess(self, farmer_headers):
        r = requests.post(f"{API}/assess", headers=farmer_headers, json={
            "crop": "Rice", "growth_stage": "Vegetative", "soil_type": "Loamy",
            "irrigation": "Flood", "problem": "yellowing leaves on rice", "language": "en"
        }, timeout=90)
        assert r.status_code == 200, f"assess failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        result = data.get("result", {})
        assert result.get("overall_status") in ("Good", "Needs Attention", "Urgent")
        assert isinstance(result.get("action_plan", {}).get("today"), list)
        assert isinstance(result.get("possible_factors"), list)
        assert "id" in data  # history record
        # also verify /history now has this record
        h = requests.get(f"{API}/history", headers=farmer_headers, timeout=15)
        assert h.status_code == 200
        assert any(item.get("id") == data["id"] for item in h.json())

    def test_assess_empty(self, farmer_headers):
        r = requests.post(f"{API}/assess", headers=farmer_headers, json={"language": "en"}, timeout=30)
        assert r.status_code == 400

    def test_chat(self, farmer_headers):
        r = requests.post(f"{API}/chat", headers=farmer_headers, json={
            "message": "My tomato leaves are turning yellow", "language": "en"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("reply") and isinstance(d["reply"], str)
        assert d.get("session_id")

    def test_daily_plan(self, farmer_headers):
        r = requests.post(f"{API}/daily-plan", headers=farmer_headers, json={
            "farm": {"crop": "Rice", "growth_stage": "Vegetative"},
            "tasks": [{"title": "Check irrigation", "priority": "High"}],
            "language": "en"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("items"), list) and len(d["items"]) > 0

    def test_schemes_match(self, farmer_headers):
        r = requests.post(f"{API}/schemes/match", headers=farmer_headers, json={
            "state": "Punjab", "district": "Ludhiana", "crop": "Rice",
            "category": "General", "land": "2 acres", "irrigation": "Flood", "language": "en"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("matches"), list)
        if d["matches"]:
            m = d["matches"][0]
            assert m.get("match") in ("High", "Medium", "Low")
            assert "id" in m and "name" in m

    def test_tts(self, farmer_headers):
        r = requests.post(f"{API}/tts", headers=farmer_headers,
                          json={"text": "Hello farmer, check your crop today."}, timeout=60)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 500


# ---------- cleanup ----------
def teardown_module(module):
    # best-effort cleanup: log in as farmer and delete account data
    try:
        r = requests.post(f"{API}/auth/login", json={"email": FARMER_EMAIL, "password": FARMER_PASSWORD}, timeout=15)
        if r.status_code == 200:
            tok = r.json()["token"]
            requests.delete(f"{API}/account/data",
                            headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    except Exception:
        pass
