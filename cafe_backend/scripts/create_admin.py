from uuid import uuid4

from app.security import hash_password
from app.db.mongodb import (
    create_mongo_client,
    get_database,
    ensure_database_structure,
)


def create_admin():
    client = create_mongo_client()
    db = get_database(client)

    ensure_database_structure(db)

    username = input("Enter admin username: ").strip()
    password = input("Enter admin password: ").strip()

    existing_user = db.users.find_one(
        {
            "username": username
        }
    )

    if existing_user:
        print("User already exists.")
        client.close()
        return

    user = {
        "_id": str(uuid4()),
        "username": username,
        "password_hash": hash_password(password),
        "role": "ADMIN",
        "is_active": True,
    }

    db.users.insert_one(user)

    print("Admin user created successfully.")

    client.close()


if __name__ == "__main__":
    create_admin()