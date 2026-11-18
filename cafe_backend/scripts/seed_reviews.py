from datetime import datetime, timezone, timedelta
from app.db.mongodb import create_mongo_client, get_database

DUMMY_REVIEWS = [
    {
        "_id": "rev-seed-001",
        "customer_name": "Arijit Mukherjee",
        "table_number": 7,
        "rating": 5,
        "comment": "The Hazelnut Cortado paired with the Basque Burnt Cheesecake is pure perfection. Hands down the best specialty coffee experience on Park Street!",
        "is_approved": True,
        "is_featured": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1, hours=3)).isoformat()
    },
    {
        "_id": "rev-seed-002",
        "customer_name": "Priyanka Sengupta",
        "table_number": 4,
        "rating": 5,
        "comment": "Loved the quiet sanctuary vibe and the contactless ordering. No waiting for bills or menus. The Truffle Mushroom Brioche was sublime.",
        "is_approved": True,
        "is_featured": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2, hours=5)).isoformat()
    },
    {
        "_id": "rev-seed-003",
        "customer_name": "David Richardson",
        "table_number": 8,
        "rating": 5,
        "comment": "Sensational single-origin cold drip! You can really taste the crisp notes of Valencia orange. 72-hour laminated croissants reminded me of Parisian bakeries.",
        "is_approved": True,
        "is_featured": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=3, hours=1)).isoformat()
    },
    {
        "_id": "rev-seed-004",
        "customer_name": "Ananya Roy",
        "table_number": 10,
        "rating": 5,
        "comment": "Such a warm, thoughtful space. Ordering from the wooden QR standee was seamless and fast. The staff are polite, attentive and so welcoming!",
        "is_approved": True,
        "is_featured": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=4, hours=8)).isoformat()
    },
    {
        "_id": "rev-seed-005",
        "customer_name": "Rohan Banerjee",
        "table_number": 4,
        "rating": 4,
        "comment": "Exceptional pour-over coffee and great acoustic jazz playlist. Definitely my new go-to weekend work and coffee spot in Kolkata.",
        "is_approved": True,
        "is_featured": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=5, hours=2)).isoformat()
    }
]

def seed_reviews():
    client = create_mongo_client()
    db = get_database(client)

    inserted = 0
    for rev in DUMMY_REVIEWS:
        res = db.reviews.update_one({"_id": rev["_id"]}, {"$set": rev}, upsert=True)
        if res.upserted_id or res.matched_count:
            inserted += 1

    print(f"Successfully seeded {inserted} customer reviews into db.reviews!")
    client.close()

if __name__ == "__main__":
    seed_reviews()
