"""
SQLite database for SlimBuddy
Pure local storage, no server upload
"""
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "slimbuddy.db")

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY CHECK(id=1),
            name TEXT DEFAULT 'BingLi',
            height_cm REAL DEFAULT 171.0,
            age INTEGER DEFAULT 22,
            start_weight_kg REAL,
            allergies TEXT DEFAULT '',
            conditions TEXT DEFAULT '',
            medications TEXT DEFAULT '',
            activity_level TEXT DEFAULT 'light',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS weight_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recorded_at TEXT NOT NULL,
            weight_kg REAL NOT NULL,
            source TEXT DEFAULT 'manual',
            body_fat_pct REAL,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS weekly_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week_start TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,
            schedule_date TEXT NOT NULL,
            plan_notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS daily_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_date TEXT NOT NULL UNIQUE,
            breakfast TEXT,
            lunch TEXT,
            dinner TEXT,
            exercise TEXT,
            extra_notes TEXT,
            generated_at TEXT DEFAULT (datetime('now','localtime')),
            modified INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkin_date TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            photo_path TEXT,
            note TEXT,
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS body_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recorded_date TEXT NOT NULL UNIQUE,
            sleep_hours REAL,
            sleep_quality TEXT,
            mood TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS ai_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memory_date TEXT NOT NULL,
            category TEXT,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        INSERT OR IGNORE INTO user_profile (id, name, height_cm, age, start_weight_kg)
        VALUES (1, 'BingLi', 171.0, 22, 100.5);
    """)
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_latest_weight():
    conn = get_db()
    row = conn.execute(
        "SELECT weight_kg, recorded_at FROM weight_records ORDER BY recorded_at DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def save_weight(weight_kg, source="manual", body_fat_pct=None, notes=None):
    conn = get_db()
    conn.execute(
        "INSERT INTO weight_records(recorded_at,weight_kg,source,body_fat_pct,notes) "
        "VALUES(datetime('now','localtime'),?,?,?,?)",
        (weight_kg, source, body_fat_pct, notes))
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_weight_trend(days=30):
    conn = get_db()
    rows = conn.execute(
        "SELECT recorded_at, weight_kg FROM weight_records "
        "WHERE recorded_at >= date('now','localtime',?) ORDER BY recorded_at ASC",
        (f"-{days} days",)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_today_plan(today):
    conn = get_db()
    row = conn.execute("SELECT * FROM daily_plans WHERE plan_date=?", (today,)).fetchone()
    conn.close()
    return dict(row) if row else None

def save_today_plan(today, breakfast, lunch, dinner, exercise, notes=""):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO daily_plans(plan_date,breakfast,lunch,dinner,exercise,extra_notes,modified) "
        "VALUES(?,?,?,?,?,?,0)",
        (today, breakfast, lunch, dinner, exercise, notes))
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_week_schedule(week_start):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM weekly_schedule WHERE week_start=? ORDER BY day_of_week",
        (week_start,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_week_schedule(week_start, day_of_week, schedule_date, plan_notes):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO weekly_schedule(week_start,day_of_week,schedule_date,plan_notes) "
        "VALUES(?,?,?,?)",
        (week_start, day_of_week, schedule_date, plan_notes))
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_today_checkins(today):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM checkins WHERE checkin_date=? ORDER BY created_at", (today,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_checkin(today, meal_type, photo_path=None, note=None, completed=1):
    conn = get_db()
    conn.execute(
        "INSERT INTO checkins(checkin_date,meal_type,photo_path,note,completed) VALUES(?,?,?,?,?)",
        (today, meal_type, photo_path, note, completed))
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_last_checkin_date():
    conn = get_db()
    row = conn.execute(
        "SELECT checkin_date FROM checkins ORDER BY checkin_date DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return row["checkin_date"] if row else None

def get_week_stats(week_start):
    conn = get_db()
    total = conn.execute(
        "SELECT COUNT(*) as cnt FROM checkins "
        "WHERE checkin_date>=? AND checkin_date<date(?,'+7 days')",
        (week_start, week_start)).fetchone()["cnt"]
    days = conn.execute(
        "SELECT COUNT(DISTINCT checkin_date) as cnt FROM checkins "
        "WHERE checkin_date>=? AND checkin_date<date(?,'+7 days')",
        (week_start, week_start)).fetchone()["cnt"]
    first = conn.execute(
        "SELECT weight_kg FROM weight_records WHERE recorded_at>=? "
        "ORDER BY recorded_at ASC LIMIT 1",
        (week_start,)).fetchone()
    last = conn.execute(
        "SELECT weight_kg FROM weight_records WHERE recorded_at<date(?,'+7 days') "
        "ORDER BY recorded_at DESC LIMIT 1",
        (week_start,)).fetchone()
    conn.close()
    return {
        "total_checkins": total,
        "active_days": days,
        "start_weight": first["weight_kg"] if first else None,
        "end_weight": last["weight_kg"] if last else None,
        "weight_change": round(last["weight_kg"] - first["weight_kg"], 2) if first and last else None
    }

def save_body_state(date_str, sleep_hours=None, sleep_quality=None, mood=None, notes=None):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO body_state(recorded_date,sleep_hours,sleep_quality,mood,notes) "
        "VALUES(?,?,?,?,?)",
        (date_str, sleep_hours, sleep_quality, mood, notes))
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_ai_memories(limit=10):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM ai_memory ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_ai_memory(content, category="insight"):
    conn = get_db()
    conn.execute(
        "INSERT INTO ai_memory(memory_date,category,content) "
        "VALUES(date('now','localtime'),?,?)",
        (category, content))
    # Migration: add new columns if missing
    for col, defval in [('age','22'),('allergies',''),('conditions',''),('medications',''),('activity_level','light')]:
        try: conn.execute(f"ALTER TABLE user_profile ADD COLUMN {col} TEXT DEFAULT '{defval}'")
        except: pass
    conn.commit()
    conn.close()

def get_user_profile():
    conn = get_db()
    row = conn.execute("SELECT * FROM user_profile WHERE id=1").fetchone()
    conn.close()
    return dict(row) if row else None
