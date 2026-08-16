from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging
import json
import uuid
import bcrypt
import jwt
import io
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech

from schemes_data import SCHEMES, GUIDE_ARTICLES

# ---------------- Config ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALGORITHM = "HS256"
GEMINI_MODEL = "gemini-3.1-pro-preview"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("kisanmitra")

app = FastAPI(title="KisanMitra AI")
api_router = APIRouter(prefix="/api")

# ---------------- Mongo helpers ----------------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v))]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


LANG_NAMES = {"en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu"}
LANG_ISO = {"en": "en", "hi": "hi", "ta": "ta", "te": "te"}

# ---------------- Auth Models ----------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# ---------------- Auth Endpoints ----------------
def public_user(user: dict) -> dict:
    return {"id": str(user["_id"]), "name": user.get("name"), "email": user["email"], "role": user.get("role", "farmer")}


@api_router.post("/auth/register")
async def register(body: RegisterInput):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"name": body.name, "email": email, "password_hash": hash_password(body.password),
           "role": "farmer", "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email)
    return {"token": token, "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(body: LoginInput):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email)
    return {"token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------- LLM helpers ----------------
def new_chat(session_id: str, system_message: str) -> LlmChat:
    return LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id,
                   system_message=system_message).with_model("gemini", GEMINI_MODEL)


def strip_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


ASSESS_SYSTEM = (
    "You are KisanMitra AI, an accessible farming decision-support assistant for Indian farmers. "
    "You conceptually coordinate several specialist agents: Crop Agent, Soil Agent, Weather Agent, "
    "Irrigation Agent, Vision Agent (for images) and a Decision Agent that combines everything. "
    "You provide AI-assisted observations and practical next steps. You NEVER give a definite diagnosis, "
    "never guarantee outcomes, and always recommend verifying important decisions with a qualified "
    "agricultural professional. Use simple, short, farmer-friendly language. "
    "You MUST reply with ONLY valid JSON, no markdown, matching this exact schema: "
    '{"overall_status":"Good|Needs Attention|Urgent",'
    '"primary_concern":"one short sentence",'
    '"factors_considered":["list of factors you used, e.g. Crop, Growth stage, Soil, Irrigation, Weather, Image"],'
    '"possible_factors":["3-5 short possible causes, each cautiously worded"],'
    '"image_observations":["visible observations if an image was provided, else empty array"],'
    '"action_plan":{"today":["2-4 short actions"],"next_days":["2-3 short monitoring steps"],"if_changes":["1-3 signs that mean seek professional help"]},'
    '"why":["3-5 short bullet points on which factors led to this recommendation"],'
    '"confidence":"Low|Medium|High",'
    '"important_note":"one or two sentences on uncertainty + verify with professional",'
    '"summary":"a short 2-3 sentence spoken summary of the whole assessment"}'
)


@api_router.post("/assess")
async def assess(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    lang = data.get("language", "en")
    lang_name = LANG_NAMES.get(lang, "English")
    parts = []
    for k in ["crop", "variety", "growth_stage", "soil_type", "location", "irrigation", "weather", "problem", "notes"]:
        v = data.get(k)
        if v:
            parts.append(f"{k.replace('_',' ').title()}: {v}")
    if not parts and not data.get("image_base64"):
        raise HTTPException(status_code=400, detail="Please describe the problem or add details.")
    prompt = ("Analyze this farm situation and return the JSON assessment. "
              f"Write all text values in {lang_name}.\n\n" + "\n".join(parts))
    file_contents = None
    if data.get("image_base64"):
        img = data["image_base64"].split(",")[-1]
        file_contents = [ImageContent(image_base64=img)]
        prompt += "\n\nAn image of the crop is attached. Use the Vision Agent to describe visible observations."
    chat = new_chat(f"assess-{user['id']}-{uuid.uuid4()}", ASSESS_SYSTEM)
    try:
        msg = UserMessage(text=prompt, file_contents=file_contents) if file_contents else UserMessage(text=prompt)
        raw = await chat.send_message(msg)
        result = json.loads(strip_json(raw))
    except Exception as e:
        logger.error(f"assess error: {e}")
        raise HTTPException(status_code=502, detail="AI analysis is unavailable right now. Please try again.")
    record = {
        "user_id": user["id"], "type": "assessment", "language": lang,
        "inputs": {k: data.get(k) for k in ["crop", "variety", "growth_stage", "soil_type", "location", "irrigation", "weather", "problem", "notes"]},
        "has_image": bool(file_contents), "result": result, "created_at": now_iso(),
    }
    res = await db.history.insert_one(record)
    record["id"] = str(res.inserted_id)
    record.pop("_id", None)
    return record


CHAT_SYSTEM = (
    "You are KisanMitra AI, a friendly farming companion for Indian farmers. Answer in simple, short, "
    "clear language with practical steps. Use short paragraphs or small bullet lists. Never give a definite "
    "diagnosis or guarantee; gently suggest verifying important decisions with a qualified agricultural "
    "professional. Keep answers concise and easy to read aloud."
)


@api_router.post("/chat")
async def chat_endpoint(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    message = data.get("message", "").strip()
    lang = data.get("language", "en")
    session_id = data.get("session_id") or str(uuid.uuid4())
    lang_name = LANG_NAMES.get(lang, "English")
    if not message and not data.get("image_base64"):
        raise HTTPException(status_code=400, detail="Message is empty.")
    file_contents = None
    prompt = f"Reply in {lang_name}.\n\nFarmer: {message}"
    if data.get("image_base64"):
        img = data["image_base64"].split(",")[-1]
        file_contents = [ImageContent(image_base64=img)]
        prompt += "\n\nThe farmer attached a crop image. Describe visible observations cautiously and suggest next steps."
    chat = new_chat(f"chat-{session_id}", CHAT_SYSTEM)
    try:
        msg = UserMessage(text=prompt, file_contents=file_contents) if file_contents else UserMessage(text=prompt)
        reply = await chat.send_message(msg)
    except Exception as e:
        logger.error(f"chat error: {e}")
        raise HTTPException(status_code=502, detail="AI is unavailable right now. Please try again.")
    await db.chat_messages.insert_one({"user_id": user["id"], "session_id": session_id,
                                       "message": message, "reply": reply, "created_at": now_iso()})
    return {"reply": reply, "session_id": session_id}


DAILY_SYSTEM = (
    "You are KisanMitra AI. Create a very short, simple daily farm checklist (4-6 items) for the farmer "
    "based on their farm profile and tasks. Each item must be one short actionable line. "
    "Reply with ONLY valid JSON: {\"items\":[\"...\"],\"summary\":\"one short spoken sentence\"}"
)


@api_router.post("/daily-plan")
async def daily_plan(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    lang = data.get("language", "en")
    lang_name = LANG_NAMES.get(lang, "English")
    farm = data.get("farm") or {}
    tasks = data.get("tasks") or []
    ctx = f"Farm: {json.dumps(farm)}\nOpen tasks: {json.dumps(tasks)}"
    chat = new_chat(f"daily-{user['id']}-{uuid.uuid4()}", DAILY_SYSTEM)
    try:
        raw = await chat.send_message(UserMessage(text=f"Write in {lang_name}. {ctx}"))
        return json.loads(strip_json(raw))
    except Exception as e:
        logger.error(f"daily error: {e}")
        raise HTTPException(status_code=502, detail="AI is unavailable right now.")


# ---------------- Schemes ----------------
@api_router.get("/schemes")
async def get_schemes(q: Optional[str] = None, category: Optional[str] = None):
    items = SCHEMES
    if category and category != "all":
        items = [s for s in items if s["category"] == category]
    if q:
        ql = q.lower()
        items = [s for s in items if ql in s["name"].lower() or ql in s["what"].lower()
                 or any(ql in k for k in s["keywords"]) or ql in s["category"].lower()]
    return {"schemes": items, "categories": sorted({s["category"] for s in SCHEMES})}


MATCH_SYSTEM = (
    "You are the Scheme Agent of KisanMitra AI. You are given a farmer profile and a list of REAL Indian "
    "government schemes (with ids). Rank which schemes are potentially relevant. You must NOT invent schemes, "
    "benefits, or eligibility. Only use the provided schemes. Never say the farmer is definitely eligible; "
    "say they 'may be eligible' and must verify on the official source. "
    "Reply with ONLY valid JSON: {\"matches\":[{\"id\":\"scheme-id\",\"match\":\"High|Medium|Low\",\"reason\":\"one short sentence why it may be relevant\"}]}"
)


@api_router.post("/schemes/match")
async def match_schemes(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    lang = data.get("language", "en")
    lang_name = LANG_NAMES.get(lang, "English")
    profile = {k: data.get(k) for k in ["state", "district", "crop", "category", "land", "irrigation"]}
    catalog = [{"id": s["id"], "name": s["name"], "category": s["category"], "what": s["what"],
                "keywords": s["keywords"]} for s in SCHEMES]
    prompt = (f"Write reasons in {lang_name}.\nFarmer profile: {json.dumps(profile)}\n"
              f"Available schemes: {json.dumps(catalog)}")
    chat = new_chat(f"match-{user['id']}-{uuid.uuid4()}", MATCH_SYSTEM)
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        parsed = json.loads(strip_json(raw))
    except Exception as e:
        logger.error(f"match error: {e}")
        raise HTTPException(status_code=502, detail="AI matching is unavailable right now.")
    by_id = {s["id"]: s for s in SCHEMES}
    out = []
    for m in parsed.get("matches", []):
        sch = by_id.get(m.get("id"))
        if sch:
            out.append({**sch, "match": m.get("match", "Low"), "reason": m.get("reason", "")})
    return {"matches": out}


@api_router.get("/guide")
async def get_guide():
    return {"articles": GUIDE_ARTICLES}


# ---------------- Farms / Tasks / History CRUD ----------------
def clean(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc


@api_router.get("/farms")
async def list_farms(user: dict = Depends(get_current_user)):
    docs = await db.farms.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [clean(d) for d in docs]


@api_router.post("/farms")
async def create_farm(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    doc = {"user_id": user["id"], "name": body.get("name", "My Farm"),
           "crop": body.get("crop"), "variety": body.get("variety"),
           "growth_stage": body.get("growth_stage"), "soil_type": body.get("soil_type"),
           "irrigation": body.get("irrigation"), "location": body.get("location"),
           "created_at": now_iso()}
    res = await db.farms.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.put("/farms/{farm_id}")
async def update_farm(farm_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    body.pop("id", None)
    body.pop("user_id", None)
    await db.farms.update_one({"_id": ObjectId(farm_id), "user_id": user["id"]}, {"$set": body})
    doc = await db.farms.find_one({"_id": ObjectId(farm_id)})
    return clean(doc)


@api_router.delete("/farms/{farm_id}")
async def delete_farm(farm_id: str, user: dict = Depends(get_current_user)):
    await db.farms.delete_one({"_id": ObjectId(farm_id), "user_id": user["id"]})
    return {"ok": True}


@api_router.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user)):
    docs = await db.tasks.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [clean(d) for d in docs]


@api_router.post("/tasks")
async def create_task(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    doc = {"user_id": user["id"], "title": body.get("title", "Task"),
           "due": body.get("due"), "priority": body.get("priority", "Medium"),
           "done": False, "reminder": body.get("reminder"),
           "source": body.get("source"), "created_at": now_iso()}
    res = await db.tasks.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    body.pop("id", None)
    body.pop("user_id", None)
    await db.tasks.update_one({"_id": ObjectId(task_id), "user_id": user["id"]}, {"$set": body})
    doc = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return clean(doc)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": user["id"]})
    return {"ok": True}


@api_router.get("/history")
async def list_history(user: dict = Depends(get_current_user)):
    docs = await db.history.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [clean(d) for d in docs]


@api_router.delete("/history/{item_id}")
async def delete_history(item_id: str, user: dict = Depends(get_current_user)):
    await db.history.delete_one({"_id": ObjectId(item_id), "user_id": user["id"]})
    return {"ok": True}


@api_router.delete("/account/data")
async def delete_account_data(user: dict = Depends(get_current_user)):
    for col in ["farms", "tasks", "history", "chat_messages"]:
        await db[col].delete_many({"user_id": user["id"]})
    return {"ok": True}


# ---------------- Voice: STT + TTS ----------------
@api_router.post("/stt")
async def speech_to_text(file: UploadFile = File(...), language: str = Form("en"),
                         user: dict = Depends(get_current_user)):
    try:
        content = await file.read()
        buf = io.BytesIO(content)
        buf.name = file.filename or "audio.webm"
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        resp = await stt.transcribe(file=buf, model="whisper-1",
                                    language=LANG_ISO.get(language, "en"), response_format="json")
        return {"text": resp.text}
    except Exception as e:
        logger.error(f"stt error: {e}")
        raise HTTPException(status_code=502, detail="Could not transcribe audio. Please type instead.")


def clean_for_tts(text: str) -> str:
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"`{1,3}[^`]*`{1,3}", "", text)
    text = re.sub(r"[*_#>~|]", "", text)
    return re.sub(r"\s+", " ", text).strip()[:4000]


@api_router.post("/tts")
async def text_to_speech(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    text = clean_for_tts(data.get("text", ""))
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")
    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio = await tts.generate_speech(text=text, model="tts-1", voice="nova", response_format="mp3")
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"tts error: {e}")
        raise HTTPException(status_code=502, detail="Audio is unavailable right now.")


@api_router.get("/")
async def root():
    return {"message": "KisanMitra AI backend running"}


# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kisanmitra.ai").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"name": "KisanMitra Admin", "email": admin_email,
                                   "password_hash": hash_password(admin_password),
                                   "role": "admin", "created_at": now_iso()})
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
