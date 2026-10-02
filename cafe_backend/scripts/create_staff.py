"""
Script: create_staff.py

Creates a new Staff user in the database.
Run from the cafe_backend directory:

    python -m scripts.create_staff

You will be prompted for a username, display name, and password.
"""

import sys
import os

# Allow running from the cafe_backend directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.db.mongodb import create_mongo_client, get_database
from app.security import hash_password


def main():
    print("=== Create Staff User ===\n")

    username = input("Username (alphanumeric + underscores): ").strip()

    if not username:
        print("Error: Username cannot be empty.")
        sys.exit(1)

    display_name = input("Display name (optional, press Enter to skip): ").strip()
    display_name = display_name or None

    password = input("Password (min 6 chars): ").strip()

    if len(password) < 6:
        print("Error: Password must be at least 6 characters.")
        sys.exit(1)

    client = create_mongo_client()

    try:
        client.admin.command("ping")
        db = get_database(client)

        existing = db.users.find_one({"username": username})

        if existing:
            print(f"\nError: Username '{username}' is already taken.")
            sys.exit(1)

        doc = {
            "username": username,
            "password_hash": hash_password(password),
            "display_name": display_name,
            "role": "STAFF",
            "is_active": True,
        }

        result = db.users.insert_one(doc)

        print(f"\n✓ Staff user created successfully!")
        print(f"  ID:           {result.inserted_id}")
        print(f"  Username:     {username}")
        print(f"  Display name: {display_name or '(none)'}")
        print(f"  Role:         STAFF")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    main()
