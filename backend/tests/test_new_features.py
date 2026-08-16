"""
KisanMitra AI - Iteration 2 NEW features tests:
- Weather (Open-Meteo proxy)
- Voice-First Onboarding backend (/farm/extract)
- Crop Photo Diary (POST/GET/GET image/DELETE)
"""
import io
import os
import uuid
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
UNIQUE = uuid.uuid4().hex[:8]
FARMER_EMAIL = f"TEST_it2_{UNIQUE}@test.com"
FARMER_PASSWORD = "farmer123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/register", json={
        "name": "It2 Farmer", "email": FARMER_EMAIL, "password": FARMER_PASSWORD
    }, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


def _make_jpeg(size=(200, 200), color=(120, 180, 90)):
    img = Image.new("RGB", size, color)
    # add a bit of variety
    for x in range(0, size[0], 20):
        for y in range(0, size[1], 20):
            img.putpixel((x, y), (200, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


# ---------------- Weather ----------------
class TestWeather:
    def test_weather_by_latlon(self):
        r = requests.get(f"{API}/weather", params={"lat": 13.08, "lon": 80.27}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        cur = d.get("current") or {}
        for k in ("temp", "humidity", "precipitation", "wind", "condition"):
            assert k in cur, f"missing {k} in current: {cur}"
        fc = d.get("forecast")
        assert isinstance(fc, list) and len(fc) >= 3
        f0 = fc[0]
        for k in ("date", "condition"):
            assert k in f0

    def test_weather_by_place(self):
        r = requests.get(f"{API}/weather", params={"place": "Chennai"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "current" in d and "forecast" in d
        assert isinstance(d["forecast"], list) and len(d["forecast"]) >= 3

    def test_weather_invalid_place(self):
        r = requests.get(f"{API}/weather", params={"place": "zzzzzznotarealplace12345"}, timeout=30)
        assert r.status_code == 404

    def test_weather_missing_params(self):
        r = requests.get(f"{API}/weather", timeout=15)
        assert r.status_code == 400


# ---------------- Voice-First Onboarding ----------------
class TestFarmExtract:
    def test_extract_english(self, headers):
        r = requests.post(f"{API}/farm/extract", headers=headers, json={
            "text": "I have a rice field near Thanjavur, loamy soil, flood irrigation, vegetative stage",
            "language": "en"
        }, timeout=60)
        assert r.status_code == 200, r.text
        fields = r.json().get("fields") or {}
        # All allowed keys present (may be empty string)
        for k in ("name", "crop", "variety", "growth_stage", "soil_type", "irrigation", "location"):
            assert k in fields
        # Populated fields
        assert "rice" in fields["crop"].lower()
        assert "loam" in fields["soil_type"].lower()
        assert fields["irrigation"] and "flood" in fields["irrigation"].lower()
        assert fields["growth_stage"] and "veg" in fields["growth_stage"].lower()
        assert fields["location"] and "thanjavur" in fields["location"].lower()
        # variety was NOT mentioned - should be empty (do not invent)
        assert fields["variety"] == "", f"variety should be empty, got: {fields['variety']!r}"

    def test_extract_empty_text(self, headers):
        r = requests.post(f"{API}/farm/extract", headers=headers, json={"text": "", "language": "en"}, timeout=30)
        assert r.status_code == 400

    def test_extract_requires_auth(self):
        r = requests.post(f"{API}/farm/extract", json={"text": "rice", "language": "en"}, timeout=15)
        assert r.status_code == 401


# ---------------- Crop Photo Diary ----------------
class TestDiary:
    diary_id = None

    def test_upload_diary_photo(self, headers):
        content = _make_jpeg()
        files = {"file": (f"TEST_diary_{UNIQUE}.jpg", content, "image/jpeg")}
        data = {"note": "TEST diary photo", "crop": "Rice", "farm_id": ""}
        r = requests.post(f"{API}/diary", headers=headers, files=files, data=data, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d and d["id"]
        assert "storage_path" in d and d["storage_path"]
        assert d["crop"] == "Rice"
        assert d["note"] == "TEST diary photo"
        assert d["user_id"]  # present
        assert d.get("is_deleted") is False
        TestDiary.diary_id = d["id"]

    def test_list_diary_contains_upload(self, headers):
        assert TestDiary.diary_id, "no diary uploaded"
        r = requests.get(f"{API}/diary", headers=headers, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(x["id"] == TestDiary.diary_id for x in items)

    def test_fetch_diary_image(self, headers):
        assert TestDiary.diary_id, "no diary uploaded"
        r = requests.get(f"{API}/diary/{TestDiary.diary_id}/image", headers=headers, timeout=60)
        assert r.status_code == 200, r.text[:200]
        ctype = r.headers.get("content-type", "")
        assert "image" in ctype, f"unexpected content-type: {ctype}"
        assert len(r.content) > 200

    def test_delete_diary(self, headers):
        assert TestDiary.diary_id, "no diary uploaded"
        r = requests.delete(f"{API}/diary/{TestDiary.diary_id}", headers=headers, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # Confirm no longer listed
        r = requests.get(f"{API}/diary", headers=headers, timeout=30)
        assert r.status_code == 200
        assert not any(x["id"] == TestDiary.diary_id for x in r.json())

    def test_diary_requires_auth(self):
        r = requests.get(f"{API}/diary", timeout=15)
        assert r.status_code == 401


# ---------------- Daily plan now takes weather ----------------
class TestDailyPlanWeather:
    def test_daily_plan_with_weather(self, headers):
        r = requests.post(f"{API}/daily-plan", headers=headers, json={
            "farm": {"crop": "Rice", "growth_stage": "Vegetative"},
            "tasks": [{"title": "Check irrigation", "priority": "High"}],
            "weather": "28C, humidity 70%, light rain expected",
            "language": "en"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("items"), list) and len(d["items"]) > 0


def teardown_module(module):
    try:
        r = requests.post(f"{API}/auth/login", json={"email": FARMER_EMAIL, "password": FARMER_PASSWORD}, timeout=15)
        if r.status_code == 200:
            tok = r.json()["token"]
            requests.delete(f"{API}/account/data", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    except Exception:
        pass
