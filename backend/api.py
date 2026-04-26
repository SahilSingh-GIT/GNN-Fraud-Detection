from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from backend.predict import predict

app = FastAPI(title="Fraud Detection API")

# ✅ FIX CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Transaction(BaseModel):
    TransactionAmt: float
    card1: int
    card2: int
    card3: int
    addr1: int
    dist1: float

@app.get("/")
def home():
    return {"message": "Fraud Detection API Running"}

@app.post("/predict")
def predict_fraud(txn: Transaction):
    try:
        input_data = txn.model_dump()
        result = predict(input_data)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}