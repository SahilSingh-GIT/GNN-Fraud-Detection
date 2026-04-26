import numpy as np
import torch
import pandas as pd

from backend.model import load_all
from backend.db_mongo import collection

# ==============================
# LOAD MODEL
# ==============================
model, scaler, features, threshold = load_all()


# ==============================
# GET CONTEXT FROM DB
# ==============================
def get_context(input_data):

    data = list(collection.find({
        "$or": [
            {"card1": input_data["card1"]},
            {"addr1": input_data["addr1"]}
        ]
    }))

    if len(data) == 0:
        return pd.DataFrame()

    return pd.DataFrame(data)


# ==============================
# ADD NEW TRANSACTION
# ==============================
def add_new_txn(df, input_data):

    new_row = input_data.copy()
    new_row["isFraud"] = 0

    for col in df.columns:
        if col.startswith("V"):
            new_row[col] = 0

    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

    return df


# ==============================
# BEHAVIOR FEATURES
# ==============================
def add_behavior(df):

    df["card_txn_count"] = df.groupby("card1")["TransactionAmt"].transform("count")
    df["card_avg_amt"] = df.groupby("card1")["TransactionAmt"].transform("mean")

    df["amt_vs_card_avg"] = df["TransactionAmt"] / (df["card_avg_amt"] + 1e-3)

    df["card_freq"] = df["card1"].map(df["card1"].value_counts())
    df["addr_freq"] = df["addr1"].map(df["addr1"].value_counts())

    fraud_rate = df.groupby("card1")["isFraud"].mean()
    df["card_fraud_rate"] = df["card1"].map(fraud_rate)

    df["amt_log"] = np.log1p(df["TransactionAmt"])
    df["amt_std_card"] = df.groupby("card1")["TransactionAmt"].transform("std").fillna(0)

    return df


# ==============================
# BUILD GRAPH
# ==============================
def build_graph(df):

    edges = []

    for _, idx in df.groupby("card1").indices.items():
        for i in range(len(idx) - 1):
            edges.append([idx[i], idx[i+1]])
            edges.append([idx[i+1], idx[i]])

    for _, idx in df.groupby("addr1").indices.items():
        for i in range(len(idx) - 1):
            edges.append([idx[i], idx[i+1]])

    if len(edges) == 0:
        return None

    return torch.tensor(edges, dtype=torch.long).t().contiguous()


# ==============================
# FEATURE CALIBRATION
# ==============================
def calibrate_probability(prob, input_data, df):

    avg_amt = df["TransactionAmt"].mean()

    # Amount deviation
    if input_data["TransactionAmt"] > avg_amt * 3:
        prob += 0.15

    # New location
    if input_data["addr1"] not in df["addr1"].values:
        prob += 0.10

    # Distance anomaly
    if input_data["dist1"] > df["dist1"].mean() * 2:
        prob += 0.10

    # Fraud history
    if "card_fraud_rate" in df.columns:
        if df["card_fraud_rate"].iloc[-1] > 0.1:
            prob += 0.10

    return min(prob, 1.0)


# ==============================
# PREDICT
# ==============================
def predict(input_data):

    df = get_context(input_data)

    if df.empty:
        return {
            "probability": 0.0,
            "prediction": 0,
            "message": "No user history found"
        }

    df = add_new_txn(df, input_data)

    if len(df) < 10:
        return {
            "probability": 0.0,
            "prediction": 0,
            "message": "Not enough user history"
        }

    df = add_behavior(df)

    # Ensure all features exist
    for col in features:
        if col not in df.columns:
            df[col] = 0

    X = df[features].values

    X_scaled = scaler.transform(X)
    x_tensor = torch.tensor(X_scaled, dtype=torch.float32)

    edge_index = build_graph(df)

    if edge_index is None:
        return {
            "probability": 0.0,
            "prediction": 0,
            "message": "Graph not formed"
        }

    # Model inference
    with torch.no_grad():
        logits = model(x_tensor, edge_index)
        probs = torch.sigmoid(logits).numpy()

    prob = float(probs[-1][0])

    # 🔥 Balanced calibration
    prob = calibrate_probability(prob, input_data, df)

    # ==============================
    # 🔥 DYNAMIC THRESHOLD
    # ==============================
    dynamic_threshold = threshold

    if input_data["addr1"] not in df["addr1"].values:
        dynamic_threshold -= 0.05

    dynamic_threshold = max(dynamic_threshold, 0.45)

    pred = int(prob > dynamic_threshold)

    return {
        "probability": round(prob, 4),
        "prediction": pred
    }


# # ==============================
# # FINAL TEST CASES
# # ==============================
# if __name__ == "__main__":

#     user = 1000

#     tests = [
#         ("Normal", 100, 100, 20),
#         ("Slight Variation", 140, 200, 30),
#         ("High Amount", 900, 100, 25),
#         ("New Location", 120, 999, 50),
#         ("Extreme Fraud", 1500, 999, 300),
#         ("Unknown User", 500, 999, 100, 999999)
#     ]

#     for t in tests:

#         name = t[0]

#         if name == "Unknown User":
#             card = t[4]
#         else:
#             card = user

#         print(f"\n🔹 {name}")

#         result = predict({
#             "TransactionAmt": t[1],
#             "card1": card,
#             "card2": 444,
#             "card3": 160,
#             "addr1": t[2],
#             "dist1": t[3]
#         })

#         print(result)