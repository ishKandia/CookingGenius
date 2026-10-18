import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from profile_store import ProfileStore


class ProfileStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = ProfileStore(Path(self.temp_dir.name) / "profiles.sqlite3")
        self.token, self.profile = self.store.register(
            "Test Cook", "cook@example.com", "correct horse battery staple"
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_register_login_and_profile_edit(self):
        self.assertEqual(self.profile["email"], "cook@example.com")
        self.assertEqual(self.store.profile_for_token(self.token)["name"], "Test Cook")

        with self.assertRaisesRegex(ValueError, "incorrect"):
            self.store.login("cook@example.com", "wrong password")

        updated = self.store.update_profile(self.profile["id"], "New Name", "new@example.com")
        self.assertEqual(updated["name"], "New Name")
        self.assertEqual(updated["email"], "new@example.com")

        login_token, login_profile = self.store.login("NEW@example.com", "correct horse battery staple")
        self.assertEqual(login_profile["id"], self.profile["id"])
        self.assertIsNotNone(self.store.profile_for_token(login_token))

    def test_duplicate_accounts_and_weak_passwords_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.store.register("Another Cook", "COOK@example.com", "correct horse battery staple")
        with self.assertRaisesRegex(ValueError, "10 characters"):
            self.store.register("Another Cook", "new@example.com", "short")

    def test_password_change_preserves_current_session_and_rejects_old_password(self):
        self.store.change_password(
            self.profile["id"],
            "correct horse battery staple",
            "a new secure password",
            self.token,
        )
        self.assertIsNotNone(self.store.profile_for_token(self.token))
        with self.assertRaisesRegex(ValueError, "incorrect"):
            self.store.login("cook@example.com", "correct horse battery staple")
        _, profile = self.store.login("cook@example.com", "a new secure password")
        self.assertEqual(profile["id"], self.profile["id"])

    def test_cook_record_updates_points_streak_badges_and_history(self):
        result = self.store.record_cook(self.profile["id"], "Garden Bowl", 5, 5)
        self.assertEqual(result["score"], 100)
        self.assertEqual((result["completed_steps"], result["total_steps"]), (5, 5))
        self.assertEqual(result["profile"]["meals_cooked"], 1)
        self.assertEqual(result["profile"]["streak"], 1)
        self.assertGreater(result["points_earned"], 0)
        self.assertIn("first_meal", [badge["id"] for badge in result["new_badges"]])
        self.assertEqual(self.store.history_for_user(self.profile["id"])[0]["recipe_name"], "Garden Bowl")

        repeated = self.store.record_cook(self.profile["id"], "Garden Bowl", 2, 5)
        self.assertEqual(repeated["profile"]["streak"], 1)
        self.assertEqual(repeated["profile"]["meals_cooked"], 2)
        self.assertLess(repeated["score"], result["score"])

    def test_logout_revokes_session(self):
        self.store.logout(self.token)
        self.assertIsNone(self.store.profile_for_token(self.token))

    def test_streak_increments_on_consecutive_days_and_resets_after_a_gap(self):
        start = datetime.now(timezone.utc).date()
        first = self.store.record_cook(self.profile["id"], "Meal 1", 1, 1, start)
        second = self.store.record_cook(self.profile["id"], "Meal 2", 1, 1, start + timedelta(days=1))
        third = self.store.record_cook(self.profile["id"], "Meal 3", 1, 1, start + timedelta(days=2))
        self.assertEqual((first["profile"]["streak"], second["profile"]["streak"], third["profile"]["streak"]), (1, 2, 3))
        self.assertIn("three_day_streak", [badge["id"] for badge in third["new_badges"]])

        after_gap = self.store.record_cook(
            self.profile["id"], "Meal 4", 1, 1, start + timedelta(days=4)
        )
        self.assertEqual(after_gap["profile"]["streak"], 1)


if __name__ == "__main__":
    unittest.main()
