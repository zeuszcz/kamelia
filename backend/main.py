"""
Камелiя·Мед — Backend API
FastAPI + SQLite + JWT (httpOnly cookies)

Endpoints:
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me
  PATCH  /api/auth/me
  GET    /api/services
  GET    /api/branches
  GET    /api/doctors
  POST   /api/appointments         (auth optional — guest booking)
  GET    /api/appointments         (auth required — user's own list)
  GET    /api/appointments/{id}
  PATCH  /api/appointments/{id}
  DELETE /api/appointments/{id}    (cancel)

Static frontend served at /kamelia/* from ../kamelia/
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request, Response, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text, Boolean, or_, text as sql_text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
import bcrypt
from jose import jwt, JWTError

# ─────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
# Frontend dir: try ../frontend (repo layout), fallback to ../kamelia (dev/legacy)
_candidates = [BASE_DIR.parent / "frontend", BASE_DIR.parent / "kamelia"]
FRONTEND_DIR = next((p for p in _candidates if p.exists()), _candidates[0])
DB_PATH = BASE_DIR / "kamelia.db"

JWT_SECRET = os.environ.get("KAMELIA_SECRET", "kamelia-dev-secret-change-me-in-production-please")
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 14  # 2 weeks
COOKIE_NAME = "kamelia_session"
# Set KAMELIA_SECURE_COOKIE=1 in production (HTTPS) so the session cookie
# is not sent over plain HTTP. In local dev (http://localhost) keep it off.
COOKIE_SECURE = os.environ.get("KAMELIA_SECURE_COOKIE", "0") == "1"

# ─────────────────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────────────────

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(120), nullable=False)
    phone = Column(String(40), nullable=True)
    birth_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    appointments = relationship("Appointment", back_populates="user", cascade="all, delete-orphan")


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(120), nullable=False)
    phone = Column(String(40), nullable=False)
    branch = Column(String(120), nullable=False)
    service = Column(String(120), nullable=True)
    preferred_date = Column(String(10), nullable=True)
    preferred_time = Column(String(40), nullable=True)
    note = Column(Text, nullable=True)
    status = Column(String(40), nullable=False, default="new")  # new · confirmed · done · cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="appointments")


Base.metadata.create_all(engine)


# ── Lightweight migration: add columns that didn't exist in older deployments ──
def _migrate_db():
    with engine.begin() as conn:
        cols = [r[1] for r in conn.execute(sql_text("PRAGMA table_info(users)")).fetchall()]
        if "is_admin" not in cols:
            conn.execute(sql_text("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"))


_migrate_db()


# ── Auto-promote configured emails to admin on startup ──
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("KAMELIA_ADMIN_EMAILS", "").split(",")
    if e.strip()
}


def _ensure_admins():
    if not ADMIN_EMAILS:
        return
    with SessionLocal() as db:
        for email in ADMIN_EMAILS:
            user = db.query(User).filter(User.email == email).first()
            if user and not user.is_admin:
                user.is_admin = True
                db.commit()


_ensure_admins()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────
# AUTH HELPERS
# ─────────────────────────────────────────────────────────────────────

def hash_password(p: str) -> str:
    # bcrypt has a 72-byte limit — truncate to be safe
    raw = p.encode("utf-8")[:72]
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        raw = p.encode("utf-8")[:72]
        return bcrypt.checkpw(raw, h.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Optional[int]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return int(data["sub"])
    except (JWTError, KeyError, ValueError):
        return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    kamelia_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    token = kamelia_session or request.headers.get("X-Auth-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Не авторизованы")
    uid = decode_token(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Сессия истекла, войдите заново")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ только для администраторов")
    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
    kamelia_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
) -> Optional[User]:
    token = kamelia_session or request.headers.get("X-Auth-Token")
    if not token:
        return None
    uid = decode_token(token)
    if not uid:
        return None
    return db.get(User, uid)


# ─────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────

PHONE_RE = re.compile(r"^[+\d\s\(\)\-]{10,20}$")


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    name: str = Field(min_length=1, max_length=120)
    phone: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def v_phone(cls, v):
        if v and not PHONE_RE.match(v):
            raise ValueError("Некорректный номер телефона")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    phone: Optional[str] = None
    birth_date: Optional[str] = None


class AdminAppointmentPatch(BaseModel):
    status: Optional[str] = Field(default=None, pattern=r"^(new|confirmed|done|cancelled)$")
    note: Optional[str] = None


class AdminUserPatch(BaseModel):
    is_admin: Optional[bool] = None


class AppointmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=10, max_length=40)
    branch: str = Field(min_length=1, max_length=120)
    service: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    note: Optional[str] = None


class AppointmentOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    phone: str
    branch: str
    service: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    note: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentPatchIn(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────
# CATALOG (static, hardcoded — matches frontend data.js)
# ─────────────────────────────────────────────────────────────────────

CATEGORIES = [
    {"slug": "consult", "title": "Консультация и диагностика", "price_from": 400},
    {"slug": "therapy", "title": "Терапевтическая стоматология", "price_from": 4900},
    {"slug": "surgery", "title": "Хирургия и имплантация", "price_from": 3900},
    {"slug": "orthodontics", "title": "Ортодонтия", "price_from": 7500},
    {"slug": "prosthetics", "title": "Протезирование", "price_from": 16000},
    {"slug": "hygiene", "title": "Пародонтология и гигиена", "price_from": 1200},
    {"slug": "aesthetics", "title": "Эстетика и отбеливание", "price_from": 9900},
    {"slug": "kids", "title": "Детская стоматология", "price_from": 700},
]

BRANCHES = [
    {"id": 0, "tag": "Главный",   "addr": "ул. Чистопольская, 77/2", "district": "Ново-Савиновский", "hours": "9:00 — 21:00"},
    {"id": 1, "tag": "Северный",  "addr": "ул. Сибгата Хакима, 51",  "district": "Ново-Савиновский", "hours": "9:00 — 21:00"},
    {"id": 2, "tag": "Заречный",  "addr": "ул. Ташаяк, 2а",          "district": "Кировский",        "hours": "8:30 — 21:00"},
    {"id": 3, "tag": "Южный",     "addr": "пр. Победы, 78",          "district": "Приволжский",      "hours": "9:00 — 20:00"},
    {"id": 4, "tag": "Восточный", "addr": "ул. Кул Гали, 27",        "district": "Советский",        "hours": "9:00 — 21:00"},
]

DOCTORS = [
    {"id": "km-01", "name": "Регина Хабибуллина",  "spec": "Стоматолог-ортопед, главврач", "since": 2010, "stat": "22 года"},
    {"id": "km-08", "name": "Айдар Гайнуллин",     "spec": "Хирург-имплантолог",            "since": 2012, "stat": "18 лет"},
    {"id": "km-12", "name": "Эльмира Сафина",      "spec": "Детский стоматолог",            "since": 2014, "stat": "14 лет"},
    {"id": "km-19", "name": "Алина Залялова",      "spec": "Ортодонт · элайнеры",           "since": 2017, "stat": "11 лет"},
    {"id": "km-04", "name": "Ленар Аглиуллин",     "spec": "Челюстно-лицевой хирург",       "since": 2011, "stat": "20 лет"},
    {"id": "km-15", "name": "Гузель Минниханова",  "spec": "Терапевт · эндодонтист",        "since": 2015, "stat": "13 лет"},
    {"id": "km-23", "name": "Ильдар Шакиров",      "spec": "Хирург · удаление",             "since": 2018, "stat": "9 лет"},
    {"id": "km-31", "name": "Лилия Валеева",       "spec": "Терапевт · реставрация",        "since": 2020, "stat": "7 лет"},
    {"id": "km-09", "name": "Артур Газизов",       "spec": "Ортопед · виниры",              "since": 2013, "stat": "16 лет"},
    {"id": "km-22", "name": "Динара Каримова",     "spec": "Пародонтолог · Vector",         "since": 2017, "stat": "10 лет"},
    {"id": "km-28", "name": "Камиля Юсупова",      "spec": "Гигиенист · Air Flow",          "since": 2019, "stat": "8 лет"},
    {"id": "km-35", "name": "Тимур Нуриев",        "spec": "Имплантолог · Neodent",         "since": 2022, "stat": "6 лет"},
]


# ─────────────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Камелiя·Мед API",
    version="1.0.0",
    description="Backend для сети стоматологий «Камелiя-Мед»",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8765", "http://127.0.0.1:8765"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS
# ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=UserOut)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        name=payload.name.strip(),
        phone=payload.phone,
        is_admin=payload.email.lower() in ADMIN_EMAILS,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME, value=token,
        max_age=JWT_TTL_HOURS * 3600,
        httponly=True, samesite="lax", secure=COOKIE_SECURE,
        path="/",
    )
    return user


@app.post("/api/auth/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME, value=token,
        max_age=JWT_TTL_HOURS * 3600,
        httponly=True, samesite="lax", secure=COOKIE_SECURE,
        path="/",
    )
    return user


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@app.patch("/api/auth/me", response_model=UserOut)
def update_me(payload: UserUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.birth_date is not None:
        user.birth_date = payload.birth_date or None
    db.commit()
    db.refresh(user)
    return user


# ─────────────────────────────────────────────────────────────────────
# CATALOG ENDPOINTS
# ─────────────────────────────────────────────────────────────────────

@app.get("/api/services")
def list_services():
    return {"categories": CATEGORIES}


@app.get("/api/branches")
def list_branches():
    return {"branches": BRANCHES}


@app.get("/api/doctors")
def list_doctors():
    return {"doctors": DOCTORS}


# ─────────────────────────────────────────────────────────────────────
# APPOINTMENTS
# ─────────────────────────────────────────────────────────────────────

@app.post("/api/appointments", response_model=AppointmentOut)
def create_appointment(
    payload: AppointmentIn,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    a = Appointment(
        user_id=user.id if user else None,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        branch=payload.branch,
        service=payload.service,
        preferred_date=payload.preferred_date,
        preferred_time=payload.preferred_time,
        note=payload.note,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@app.get("/api/appointments", response_model=List[AppointmentOut])
def list_my_appointments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Appointment)
        .filter(Appointment.user_id == user.id)
        .order_by(Appointment.created_at.desc())
        .all()
    )


@app.get("/api/appointments/{appt_id}", response_model=AppointmentOut)
def get_appointment(
    appt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Appointment, appt_id)
    if not a or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return a


@app.patch("/api/appointments/{appt_id}", response_model=AppointmentOut)
def update_appointment(
    appt_id: int,
    payload: AppointmentPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Appointment, appt_id)
    if not a or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if payload.status is not None and payload.status in {"cancelled", "new"}:
        a.status = payload.status
    if payload.note is not None:
        a.note = payload.note
    db.commit()
    db.refresh(a)
    return a


@app.delete("/api/appointments/{appt_id}")
def cancel_appointment(
    appt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a = db.get(Appointment, appt_id)
    if not a or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    a.status = "cancelled"
    db.commit()
    return {"ok": True, "id": a.id}


# ─────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS  (require is_admin)
# ─────────────────────────────────────────────────────────────────────

@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
    return {
        "appointments_total": db.query(Appointment).count(),
        "appointments_new": db.query(Appointment).filter(Appointment.status == "new").count(),
        "appointments_confirmed": db.query(Appointment).filter(Appointment.status == "confirmed").count(),
        "appointments_done": db.query(Appointment).filter(Appointment.status == "done").count(),
        "appointments_cancelled": db.query(Appointment).filter(Appointment.status == "cancelled").count(),
        "appointments_today_preferred": db.query(Appointment).filter(Appointment.preferred_date == today).count(),
        "appointments_last_7d": db.query(Appointment).filter(Appointment.created_at >= datetime.now(timezone.utc) - timedelta(days=7)).count(),
        "users_total": db.query(User).count(),
        "users_admins": db.query(User).filter(User.is_admin == True).count(),
        "users_last_7d": db.query(User).filter(User.created_at >= datetime.now(timezone.utc) - timedelta(days=7)).count(),
    }


@app.get("/api/admin/appointments", response_model=List[AppointmentOut])
def admin_list_appointments(
    status: Optional[str] = None,
    branch: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    qry = db.query(Appointment)
    if status and status != "all":
        qry = qry.filter(Appointment.status == status)
    if branch and branch != "all":
        qry = qry.filter(Appointment.branch == branch)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(
            or_(
                Appointment.name.ilike(like),
                Appointment.phone.ilike(like),
                Appointment.note.ilike(like),
                Appointment.service.ilike(like),
            )
        )
    return qry.order_by(Appointment.created_at.desc()).limit(min(max(1, limit), 1000)).all()


@app.patch("/api/admin/appointments/{appt_id}", response_model=AppointmentOut)
def admin_update_appointment(
    appt_id: int,
    payload: AdminAppointmentPatch,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    a = db.get(Appointment, appt_id)
    if not a:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if payload.status is not None:
        a.status = payload.status
    if payload.note is not None:
        a.note = payload.note
    db.commit()
    db.refresh(a)
    return a


@app.delete("/api/admin/appointments/{appt_id}")
def admin_delete_appointment(
    appt_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    a = db.get(Appointment, appt_id)
    if not a:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(a)
    db.commit()
    return {"ok": True, "id": appt_id}


@app.get("/api/admin/users", response_model=List[UserOut])
def admin_list_users(
    q: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    qry = db.query(User)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(or_(User.email.ilike(like), User.name.ilike(like), User.phone.ilike(like)))
    return qry.order_by(User.created_at.desc()).limit(min(max(1, limit), 1000)).all()


@app.patch("/api/admin/users/{user_id}", response_model=UserOut)
def admin_update_user(
    user_id: int,
    payload: AdminUserPatch,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if payload.is_admin is not None:
        # safety: don't allow demoting yourself
        if u.id == admin.id and payload.is_admin is False:
            raise HTTPException(status_code=400, detail="Нельзя снять права с себя")
        u.is_admin = payload.is_admin
    db.commit()
    db.refresh(u)
    return u


# ─────────────────────────────────────────────────────────────────────
# STATIC FRONTEND
# ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return RedirectResponse(url="/kamelia/", status_code=307)


@app.get("/kamelia/")
def kamelia_index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/kamelia/services/")
def kamelia_services_index():
    return FileResponse(FRONTEND_DIR / "services" / "index.html")


@app.get("/kamelia/cabinet/")
def kamelia_cabinet_index():
    return FileResponse(FRONTEND_DIR / "cabinet" / "index.html")


# Mount entire frontend directory as static
app.mount("/kamelia", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


# ─────────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
        log_level="info",
    )
