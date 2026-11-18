from app.db.mongodb import create_mongo_client, get_database

def add_signatures():
    client = create_mongo_client()
    db = get_database(client)

    items = [
        {
            "_id": "menu-sig-001",
            "name": "Hazelnut Cortado",
            "category": "Beverages",
            "category_key": "beverages",
            "price_paise": 16000,
            "stock_quantity": 50,
            "is_available": True,
            "description": "Equal parts double ristretto and silky steamed milk infused with roasted Piedmont hazelnut.",
            "tags": ["coffee", "espresso", "signature", "hot"],
            "customization_groups": [
                {
                    "id": "milk_type",
                    "label": "Milk Choice",
                    "type": "single",
                    "required": True,
                    "choices": [
                        {"id": "whole", "label": "Whole Milk", "price_delta_paise": 0},
                        {"id": "oat", "label": "Oat Milk", "price_delta_paise": 3000},
                        {"id": "almond", "label": "Almond Milk", "price_delta_paise": 3000}
                    ]
                }
            ]
        },
        {
            "_id": "menu-sig-002",
            "name": "Cold Brew Tonic",
            "category": "Beverages",
            "category_key": "beverages",
            "price_paise": 18000,
            "stock_quantity": 45,
            "is_available": True,
            "description": "18-hour single-origin cold drip topped with crisp botanical tonic and dehydrated Valencia orange.",
            "tags": ["coffee", "cold brew", "signature", "cold"],
            "customization_groups": [
                {
                    "id": "sweetness",
                    "label": "Sweetness",
                    "type": "single",
                    "required": True,
                    "choices": [
                        {"id": "standard", "label": "Standard Botanical", "price_delta_paise": 0},
                        {"id": "less_sweet", "label": "Less Sweet", "price_delta_paise": 0},
                        {"id": "zero_sugar", "label": "Zero Sugar Tonic", "price_delta_paise": 0}
                    ]
                }
            ]
        },
        {
            "_id": "menu-sig-003",
            "name": "Basque Burnt Cheesecake",
            "category": "Desserts",
            "category_key": "desserts",
            "price_paise": 24000,
            "stock_quantity": 25,
            "is_available": True,
            "description": "Caramelized deeply on top with a silky, rich molten cream cheese center baked daily.",
            "tags": ["dessert", "bakery", "cheesecake", "signature"],
            "customization_groups": []
        },
        {
            "_id": "menu-sig-004",
            "name": "Truffle Mushroom Brioche",
            "category": "Main Course",
            "category_key": "main_course",
            "price_paise": 29000,
            "stock_quantity": 30,
            "is_available": True,
            "description": "Sautéed wild forest mushrooms on house-toasted butter brioche with black truffle oil.",
            "tags": ["savoury", "brioche", "mushrooms", "signature"],
            "customization_groups": []
        }
    ]

    for item in items:
        res = db.menu_items.update_one({"_id": item["_id"]}, {"$set": item}, upsert=True)
        print(f"Upserted {item['name']} (Stock: {item['stock_quantity']}, Price: ₹{item['price_paise']/100:.0f})")

    print("\nAll 4 signature items added to menu successfully!")
    client.close()

if __name__ == "__main__":
    add_signatures()
