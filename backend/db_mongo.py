from pymongo import MongoClient

# 🔥 PASTE YOUR CONNECTION STRING HERE
MONGO_URI = "mongodb+srv://helpdesk_user:fraud@cluster0.nxi8mhu.mongodb.net/?appName=Cluster0"

client = MongoClient(MONGO_URI)

db = client["fraudDB"]
collection = db["transactions"]


# ==============================
# ADD TRANSACTION
# ==============================
def add_transaction(txn):
    collection.insert_one(txn)


# ==============================
# GET USER HISTORY
# ==============================
def get_user_history(card1):
    return list(collection.find({"card1": card1}))


# ==============================
# TEST CONNECTION
# ==============================
if __name__ == "__main__":

    test_txn = {
        "TransactionAmt": 50,
        "card1": 1234,
        "card2": 111,
        "card3": 150,
        "addr1": 300,
        "dist1": 10,
        "V1": 1.0,
        "V2": 0.0,
        "V3": 1.0,
        "V4": 0.0,
        "V5": 1.0,
        "isFraud": 0,
        "timestamp": 1710000000
    }

    add_transaction(test_txn)

    data = get_user_history(1234)

    print("\n✅ Mongo Connected")
    print("User history:", data)