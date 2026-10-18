"""SQLite-backed accounts and cooking progress for the Cooking Genius API."""

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator


SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60
PASSWORD_ITERATIONS = 600_000
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

BADGES = {
    "first_meal": {"name": "First Dish", "description": "Finish your first recipe.", "icon": "chef"},
    "five_meals": {"name": "Kitchen Regular", "description": "Cook five recipes.", "icon": "spark"},
    "three_day_streak": {"name": "On a Roll", "description": "Cook on three consecutive days.", "icon": "flame"},
    "250_points": {"name": "Point Collector", "description": "Earn 250 cooking points.", "icon": "star"},
}


def validate_email(email: str) -> str:
    normalized = email.strip().lower()
    if len(normalized) > 254 or not EMAIL_PATTERN.fullmatch(normalized):
        raise ValueError("Enter a valid email address.")
    return normalized


def validate_password(password: str) -> None:
    if len(password) < 10:
        raise ValueError("Password must be at least 10 characters long.")
    if len(password) > 256:
        raise ValueError("Password must be 256 characters or fewer.")


def _password_hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)


def _public_profile(row: sqlite3.Row) -> dict[str, Any]:
    unlocked = set(json.loads(row["badges"]))
    streak = row["streak"]
    if row["last_cooked_date"]:
        last_cooked = datetime.fromisoformat(row["last_cooked_date"]).date()
        if last_cooked < datetime.now(timezone.utc).date() - timedelta(days=1):
            streak = 0
    else:
        streak = 0
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "points": row["points"],
        "streak": streak,
        "meals_cooked": row["meals_cooked"],
        "badges": [
            {"id": badge_id, **badge, "unlocked": badge_id in unlocked}
            for badge_id, badge in BADGES.items()
        ],
    }


class ProfileStore:
    def __init__(self, database_path: str | Path):
        self.database_path = str(database_path)
        if self.database_path != ":memory:":
            Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_salt BLOB NOT NULL,
                    password_hash BLOB NOT NULL,
                    points INTEGER NOT NULL DEFAULT 0,
                    streak INTEGER NOT NULL DEFAULT 0,
                    last_cooked_date TEXT,
                    meals_cooked INTEGER NOT NULL DEFAULT 0,
                    badges TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS cooking_history (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    recipe_name TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    points_earned INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS cooking_history_user_id_idx
                    ON cooking_history(user_id, created_at DESC);
                """
            )

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _new_session(connection: sqlite3.Connection, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (ProfileStore._token_hash(token), user_id, int(time.time()) + SESSION_LIFETIME_SECONDS),
        )
        return token

    def register(self, name: str, email: str, password: str) -> tuple[str, dict[str, Any]]:
        normalized_name = name.strip()
        if not normalized_name or len(normalized_name) > 60:
            raise ValueError("Name must be between 1 and 60 characters.")
        normalized_email = validate_email(email)
        validate_password(password)
        salt = secrets.token_bytes(16)
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            try:
                connection.execute(
                    """INSERT INTO users
                    (id, name, email, password_salt, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    (user_id, normalized_name, normalized_email, salt, _password_hash(password, salt), now),
                )
            except sqlite3.IntegrityError as error:
                if "email" in str(error).lower():
                    raise ValueError("An account with that email already exists.") from error
                raise
            token = self._new_session(connection, user_id)
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return token, _public_profile(row)

    def login(self, email: str, password: str) -> tuple[str, dict[str, Any]]:
        normalized_email = validate_email(email)
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (normalized_email,)).fetchone()
            if row is None or not hmac.compare_digest(
                _password_hash(password, row["password_salt"]), row["password_hash"]
            ):
                raise ValueError("Email or password is incorrect.")
            token = self._new_session(connection, row["id"])
            return token, _public_profile(row)

    def profile_for_token(self, token: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                """SELECT users.* FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ?""",
                (self._token_hash(token), int(time.time())),
            ).fetchone()
            return _public_profile(row) if row else None

    def update_profile(self, user_id: str, name: str, email: str) -> dict[str, Any]:
        normalized_name = name.strip()
        if not normalized_name or len(normalized_name) > 60:
            raise ValueError("Name must be between 1 and 60 characters.")
        normalized_email = validate_email(email)
        with self._connect() as connection:
            try:
                connection.execute(
                    "UPDATE users SET name = ?, email = ? WHERE id = ?",
                    (normalized_name, normalized_email, user_id),
                )
            except sqlite3.IntegrityError as error:
                if "email" in str(error).lower():
                    raise ValueError("An account with that email already exists.") from error
                raise
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row is None:
                raise ValueError("Account not found.")
            return _public_profile(row)

    def change_password(
        self, user_id: str, current_password: str, new_password: str, session_token: str
    ) -> None:
        validate_password(new_password)
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row is None or not hmac.compare_digest(
                _password_hash(current_password, row["password_salt"]), row["password_hash"]
            ):
                raise ValueError("Current password is incorrect.")
            salt = secrets.token_bytes(16)
            connection.execute(
                "UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?",
                (salt, _password_hash(new_password, salt), user_id),
            )
            connection.execute(
                "DELETE FROM sessions WHERE user_id = ? AND token_hash != ?",
                (user_id, self._token_hash(session_token)),
            )

    def logout(self, token: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (self._token_hash(token),))

    def record_cook(
        self,
        user_id: str,
        recipe_name: str,
        completed_steps: int,
        total_steps: int,
        cooked_on: date | None = None,
    ) -> dict[str, Any]:
        if not recipe_name.strip() or len(recipe_name) > 120:
            raise ValueError("Recipe name must be between 1 and 120 characters.")
        if total_steps < 1 or total_steps > 100 or completed_steps < 0 or completed_steps > total_steps:
            raise ValueError("Recipe progress is invalid.")

        score = round(50 + 50 * completed_steps / total_steps)
        today = cooked_on or datetime.now(timezone.utc).date()
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row is None:
                raise ValueError("Account not found.")
            previous_badges = set(json.loads(row["badges"]))
            last_cooked = (
                datetime.fromisoformat(row["last_cooked_date"]).date()
                if row["last_cooked_date"]
                else None
            )
            streak = row["streak"]
            if last_cooked != today:
                streak = streak + 1 if last_cooked == today - timedelta(days=1) else 1
            streak_bonus = min(streak * 2, 20) if last_cooked != today else 0
            completion_points = round(score / 5)
            step_points = min(completed_steps, 10)
            points_earned = 15 + completion_points + step_points + streak_bonus
            meals_cooked = row["meals_cooked"] + 1
            points = row["points"] + points_earned
            unlocked = set(previous_badges)
            if meals_cooked >= 1:
                unlocked.add("first_meal")
            if meals_cooked >= 5:
                unlocked.add("five_meals")
            if streak >= 3:
                unlocked.add("three_day_streak")
            if points >= 250:
                unlocked.add("250_points")
            new_badges = sorted(unlocked - previous_badges)
            connection.execute(
                """UPDATE users SET points = ?, streak = ?, last_cooked_date = ?,
                meals_cooked = ?, badges = ? WHERE id = ?""",
                (points, streak, today.isoformat(), meals_cooked, json.dumps(sorted(unlocked)), user_id),
            )
            connection.execute(
                """INSERT INTO cooking_history
                (id, user_id, recipe_name, score, points_earned, created_at)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), user_id, recipe_name.strip(), score, points_earned, now),
            )
            updated = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return {
                "score": score,
                "completed_steps": completed_steps,
                "total_steps": total_steps,
                "points_earned": points_earned,
                "streak_bonus": streak_bonus,
                "point_breakdown": {
                    "base": 15,
                    "completion": completion_points,
                    "steps": step_points,
                    "streak": streak_bonus,
                },
                "new_badges": [
                    {"id": badge_id, **BADGES[badge_id]} for badge_id in new_badges
                ],
                "profile": _public_profile(updated),
            }

    def history_for_user(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                """SELECT recipe_name, score, points_earned, created_at
                FROM cooking_history WHERE user_id = ?
                ORDER BY created_at DESC LIMIT 20""",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]


DEFAULT_DATABASE_PATH = Path(
    os.getenv("COOKINGGENIUS_DATABASE_PATH", Path(__file__).with_name("cookinggenius.sqlite3"))
)
profile_store = ProfileStore(DEFAULT_DATABASE_PATH)
