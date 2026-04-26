import torch
import pickle
import os
from torch_geometric.nn import SAGEConv
import torch.nn as nn

# ==============================
# 🧩 MODEL ARCHITECTURE (MUST MATCH TRAINING)
# ==============================
class GraphSAGE(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.conv1 = SAGEConv(dim, 128)
        self.conv2 = SAGEConv(128, 128)
        self.conv3 = SAGEConv(128, 32)
        self.lin = nn.Linear(32, 1)

    def forward(self, x, edge_index):
        x = torch.relu(self.conv1(x, edge_index))
        x = torch.relu(self.conv2(x, edge_index))
        x = torch.relu(self.conv3(x, edge_index))
        return self.lin(x)

# ==============================
# 📦 LOAD ALL ARTIFACTS
# ==============================
BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "models")

MODEL_PATH = os.path.join(BASE_PATH, "graphsage_model.pth")
SCALER_PATH = os.path.join(BASE_PATH, "scaler.pkl")
FEATURES_PATH = os.path.join(BASE_PATH, "features.pkl")
THRESHOLD_PATH = os.path.join(BASE_PATH, "threshold.txt")


def load_all():

    # Load features
    with open(FEATURES_PATH, "rb") as f:
        features = pickle.load(f)

    input_dim = len(features)

    # Load model
    model = GraphSAGE(input_dim)
    state_dict = torch.load(MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    # Load scaler
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)

    # Load threshold
    with open(THRESHOLD_PATH, "r") as f:
        threshold = float(f.read())

    return model, scaler, features, threshold


# ==============================
# 🧪 DEBUG TEST
# ==============================
if __name__ == "__main__":
    model, scaler, features, threshold = load_all()

    print("✅ MODEL LOADED SUCCESSFULLY")
    print(f"Feature count: {len(features)}")
    print(f"Threshold: {threshold}")