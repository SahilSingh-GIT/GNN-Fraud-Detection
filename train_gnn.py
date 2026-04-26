# ==============================
# 🔧 IMPORTS
# ==============================
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch_geometric.nn import SAGEConv
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, average_precision_score

print("\n🚀 FRAUD DETECTION PIPELINE STARTED\n")

# ==============================
# 📂 LOAD DATA
# ==============================
df = pd.read_csv("data/train_transaction.csv")

print("📂 Original Dataset Loaded")
print(f"Total Rows: {len(df)}")
print(f"Fraud Ratio (Original): {df['isFraud'].mean():.4f}")

# ==============================
# ⚡ REDUCE DATASET
# ==============================
fraud = df[df["isFraud"] == 1]
non_fraud = df[df["isFraud"] == 0].sample(n=5 * len(fraud), random_state=42)

df_small = pd.concat([fraud, non_fraud]).sample(frac=1, random_state=42)

print("\n⚡ Dataset After Sampling")
print(f"Total Rows: {len(df_small)}")
print(f"Fraud Ratio (After Sampling): {df_small['isFraud'].mean():.4f}")

# ==============================
# 🧹 FEATURE CLEANING
# ==============================
missing_ratio = df_small.isnull().mean()
df_small = df_small[missing_ratio[missing_ratio < 0.8].index]

print("\n🧹 Feature Cleaning Done")
print(f"Remaining Columns: {len(df_small.columns)}")

# ==============================
# 🎯 SELECT FEATURES
# ==============================
selected_features = [
    "TransactionAmt", "card1", "card2", "card3", "addr1", "dist1"
]

v_cols = [c for c in df_small.columns if c.startswith("V")][:30]
selected_features += v_cols + ["isFraud", "TransactionDT"]

df_small = df_small[selected_features]

print("\n🎯 Feature Selection Complete")
print(f"Total Features Used: {len(selected_features)-2}")

# ==============================
# 🧠 BEHAVIOR FEATURES
# ==============================
df_small["card_txn_count"] = df_small.groupby("card1")["TransactionAmt"].transform("count")
df_small["card_avg_amt"] = df_small.groupby("card1")["TransactionAmt"].transform("mean")

df_small["amt_vs_card_avg"] = df_small["TransactionAmt"] / (df_small["card_avg_amt"] + 1e-3)

df_small["card_freq"] = df_small["card1"].map(df_small["card1"].value_counts())
df_small["addr_freq"] = df_small["addr1"].map(df_small["addr1"].value_counts())

card_fraud_rate = df_small.groupby("card1")["isFraud"].mean()
df_small["card_fraud_rate"] = df_small["card1"].map(card_fraud_rate)

df_small["amt_log"] = np.log1p(df_small["TransactionAmt"])

# 🔥 NEW IMPROVEMENT FEATURE
df_small["amt_std_card"] = df_small.groupby("card1")["TransactionAmt"].transform("std").fillna(0)

print("\n🧠 Behavior Features Created")

# ==============================
# 🧹 CLEAN NUMERICAL ISSUES
# ==============================
df_small = df_small.replace([np.inf, -np.inf], np.nan)
df_small = df_small.fillna(0)

for col in df_small.columns:
    if col not in ["isFraud", "TransactionDT"]:
        df_small[col] = df_small[col].clip(-1e6, 1e6)

print("\n🧹 Data Cleaning Completed")

# ==============================
# ⏱️ TIME SPLIT
# ==============================
df_small = df_small.sort_values("TransactionDT")

train_size = int(0.7 * len(df_small))
val_size = int(0.15 * len(df_small))

train_df = df_small.iloc[:train_size]
val_df = df_small.iloc[train_size:train_size + val_size]

# ==============================
# 🧠 FEATURE MATRIX
# ==============================
features = [c for c in df_small.columns if c not in ["isFraud", "TransactionDT"]]

X_train = train_df[features].values
y_train = train_df["isFraud"].values

X_val = val_df[features].values
y_val = val_df["isFraud"].values

# ==============================
# 🔄 SCALING
# ==============================
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_val = scaler.transform(X_val)

X_all = np.vstack([X_train, X_val])
y_all = np.concatenate([y_train, y_val])

# ==============================
# 🔗 GRAPH
# ==============================
df_graph = pd.concat([train_df, val_df]).reset_index(drop=True)

edges = []

# Stronger connections (controlled)
for _, idx in df_graph.groupby("card1").indices.items():
    if len(idx) < 10:  # prevent explosion
        for i in idx:
            for j in idx:
                if i != j:
                    edges.append([i, j])
    else:
        for i in range(len(idx)-1):
            edges.append([idx[i], idx[i+1]])
            edges.append([idx[i+1], idx[i]])

for _, idx in df_graph.groupby("addr1").indices.items():
    for i in range(len(idx)-1):
        edges.append([idx[i], idx[i+1]])

edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()

x = torch.tensor(X_all, dtype=torch.float32)
y = torch.tensor(y_all, dtype=torch.float32).view(-1, 1)

print("\n🔗 Graph Constructed")
print(f"Nodes: {x.shape[0]}")
print(f"Edges: {edge_index.shape[1]}")

# ==============================
# 🧩 MODEL
# ==============================
class GraphSAGE(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.conv1 = SAGEConv(dim, 128)
        self.conv2 = SAGEConv(128, 128)  # 🔥 upgraded
        self.conv3 = SAGEConv(128, 32)
        self.lin = nn.Linear(32, 1)

    def forward(self, x, edge_index):
        x = torch.relu(self.conv1(x, edge_index))
        x = torch.relu(self.conv2(x, edge_index))
        x = torch.relu(self.conv3(x, edge_index))
        return self.lin(x)

model = GraphSAGE(x.shape[1])

# ==============================
# 🏋️ TRAIN
# ==============================
pos_weight = torch.tensor([(len(y_all)-y_all.sum())/y_all.sum()])
criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

optimizer = torch.optim.Adam(model.parameters(), lr=0.0005)

EPOCHS = 80
patience = 8
best_loss = float("inf")
counter = 0

print("\n🏋️ Training Started...\n")

for epoch in range(EPOCHS):
    model.train()
    optimizer.zero_grad()

    out = model(x, edge_index)
    loss = criterion(out, y)

    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()

    if epoch % 5 == 0:
        print(f"Epoch {epoch} → Loss: {loss.item():.4f}")

    if loss.item() < best_loss:
        best_loss = loss.item()
        counter = 0
    else:
        counter += 1

    if counter >= patience:
        print("\n⏹️ Early Stopping Triggered")
        break

# ==============================
# 📊 EVAL
# ==============================
model.eval()

with torch.no_grad():
    logits = model(x, edge_index)
    probs = torch.sigmoid(logits).numpy()

threshold = 0.55
preds = (probs > threshold).astype(int)

precision = precision_score(y.numpy(), preds)
recall = recall_score(y.numpy(), preds)
pr_auc = average_precision_score(y.numpy(), probs)

print("\n📊 FINAL RESULTS")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"PR-AUC: {pr_auc:.4f}")

print("\n📌 Sample Predictions:")
for i in range(5):
    print(f"Prob: {probs[i][0]:.4f} → Pred: {preds[i][0]}")

print("\n✅ PIPELINE COMPLETED SUCCESSFULLY")



