
import argparse

from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)
from app.services.embeddings import (
    EmbeddingError,
    build_embedding_text,
    get_embedding,
)


def run(db, force: bool) -> None:
    query = {} if force else {"embedding": {"$exists": False}}

    documents = list(
        db.menu_items.find(
            query,
            {"name": 1, "description": 1, "category": 1, "tags": 1},
        )
    )

    updated = 0
    skipped = 0

    for document in documents:
        text = build_embedding_text(document)

        if not text:
            print(f"Skipping {document['_id']}: nothing to embed.")
            skipped += 1
            continue

        try:
            vector = get_embedding(text)
        except EmbeddingError as exc:
            print(f"Skipping {document['_id']}: {exc}")
            skipped += 1
            continue

        db.menu_items.update_one(
            {"_id": document["_id"]},
            {"$set": {"embedding": vector}},
        )
        updated += 1

    print(f"Generated embeddings for {updated} menu item(s).")
    if skipped:
        print(f"Skipped {skipped} item(s) - see messages above.")

    if not force:
        already_had = db.menu_items.count_documents(
            {"embedding": {"$exists": True}}
        ) - updated
        if already_had > 0:
            print(
                f"{already_had} item(s) already had embeddings and "
                f"were left unchanged."
            )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate embeddings for every item, not just missing ones.",
    )
    args = parser.parse_args()

    client = create_mongo_client()
    try:
        client.admin.command("ping")
        db = get_database(client)
        ensure_database_structure(db)
        run(db, args.force)
    finally:
        client.close()


if __name__ == "__main__":
    main()