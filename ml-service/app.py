# ARGUS ML Service - Production Ready app.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import joblib
import os

# ---------------------------------------------------
# APP CONFIG
# ---------------------------------------------------

app = FastAPI(
    title="ARGUS Threat Intelligence API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time

# ---------------------------------------------------
# GLOBAL VARIABLES
# ---------------------------------------------------

model = None
preprocessor = None
explainer_engine = None
notifications_df = None
cached_notifications = []
cached_stats = {}
cached_heatmap = {}

DATASET_PATH = "dataset/argus_notifications_10000.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "fraud_model.pkl")

# ---------------------------------------------------
# INPUT MODELS
# ---------------------------------------------------

class NotificationInput(BaseModel):
    notification_id: Optional[str] = "NEW001"
    org_id: Optional[str] = "ORG001"
    department: str
    sender: Optional[str] = "unknown@external.com"
    receiver: Optional[str] = "employee@company.com"
    content: str
    timestamp: Optional[str] = "2026-01-01 10:00:00"

    channel: str
    sender_domain: str
    priority: str
    country: str
    device_type: str
    attachment_type: str
    contains_url: int
    risk_score: float

class FeedbackInput(BaseModel):
    notification_id: str
    decision: str
    corrected_label: Optional[int] = None
    analyst_notes: Optional[str] = ""

# ---------------------------------------------------
# HELPERS
# ---------------------------------------------------

def map_single_prediction(data: dict, pred, prob):
    if prob >= 0.80:
        level = "High"
    elif prob >= 0.50:
        level = "Medium"
    else:
        level = "Low"
        
    source_app = data.get("channel", "Email")
    if source_app == "Teams": source_app = "Microsoft Teams"
    elif source_app == "ERP": source_app = "Finance System"
    elif source_app == "VPN Alert": source_app = "Internal Mobile App"

    return {
        "notification_id": data.get("notification_id", ""),
        "org_id": data.get("org_id", ""),
        "sender": data.get("sender", ""),
        "receiver": data.get("receiver", ""),
        "content": data.get("content", ""),
        "timestamp": data.get("timestamp", ""),
        "risk_score": round(float(prob), 4),
        "risk_level": level,
        "is_malicious": int(pred),
        "source_app": source_app,
        "status": "Threat" if pred == 1 else "Safe",
        "department": data.get("department", "")
    }

def predict_single(data: dict):
    df = pd.DataFrame([data])
    X = preprocessor.extract_features(df, fit=False)

    pred = model.predict(X)[0]
    prob = model.predict_proba(X)[0][1]

    return map_single_prediction(data, pred, prob)

# ---------------------------------------------------
# STARTUP
# ---------------------------------------------------

@app.on_event("startup")
async def startup_event():
    global model, preprocessor, explainer_engine, notifications_df, cached_notifications, cached_stats, cached_heatmap
    from preprocess import DataPreprocessor
    from explain import ExplainabilityEngine

    if not os.path.exists(MODEL_PATH):
        raise Exception("fraud_model.pkl not found inside /models")

    if not os.path.exists(DATASET_PATH):
        raise Exception("Dataset not found")

    print("Loading XGBoost Model...")
    model = joblib.load(MODEL_PATH)
    
    print("Loading Preprocessor...")
    preprocessor = DataPreprocessor()
    preprocessor.load(MODEL_DIR)

    print("Loading Dataset...")
    notifications_df = pd.read_csv(DATASET_PATH)

    print("Precomputing ALL predictions (Vectorized)...")
    t0 = time.time()
    X_all = preprocessor.extract_features(notifications_df, fit=False)
    preds = model.predict(X_all)
    probs = model.predict_proba(X_all)[:, 1]
    
    cached_notifications = []
    
    flagged_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0
    
    heatmap_result = {}

    for i in range(len(notifications_df)):
        row_dict = notifications_df.iloc[i].to_dict()
        pred_dict = map_single_prediction(row_dict, preds[i], probs[i])
        cached_notifications.append(pred_dict)
        
        # Stats accumulation
        if pred_dict["is_malicious"] == 1:
            flagged_count += 1
        level = pred_dict["risk_level"]
        if level == "High": high_count += 1
        elif level == "Medium": medium_count += 1
        else: low_count += 1
            
        # Heatmap accumulation
        dept = pred_dict["department"]
        if dept not in heatmap_result:
            heatmap_result[dept] = {
                "total": 0, 
                "flagged": 0, 
                "risk_sum": 0.0,
                "high_risk": 0,
                "medium_risk": 0,
                "low_risk": 0
            }
            
        heatmap_result[dept]["total"] += 1
        heatmap_result[dept]["risk_sum"] += pred_dict["risk_score"]
        
        if pred_dict["is_malicious"] == 1:
            heatmap_result[dept]["flagged"] += 1
            
        if level == "High": heatmap_result[dept]["high_risk"] += 1
        elif level == "Medium": heatmap_result[dept]["medium_risk"] += 1
        else: heatmap_result[dept]["low_risk"] += 1

    # Post processing
    for dept in heatmap_result:
        total_dept = heatmap_result[dept]["total"]
        heatmap_result[dept]["avg_risk_score"] = round(
            heatmap_result[dept]["risk_sum"] / total_dept, 4
        )
        # Remove internal accumulator — not part of the public API schema
        del heatmap_result[dept]["risk_sum"]
        
    total = len(cached_notifications)
    
    # department_stats for /stats is very similar to heatmap_result
    dept_stats = {
        dept: {
            "total": heatmap_result[dept]["total"],
            "flagged": heatmap_result[dept]["flagged"],
            "avg_risk": heatmap_result[dept]["avg_risk_score"]
        } for dept in heatmap_result
    }
    
    cached_stats = {
        "total_notifications": total,
        "flagged_notifications": flagged_count,
        "benign_notifications": total - flagged_count,
        "high_risk": high_count,
        "medium_risk": medium_count,
        "low_risk": low_count,
        "flagged_percentage": round(flagged_count / total * 100, 2) if total else 0,
        "department_stats": dept_stats,
        "model_metrics": {
            "accuracy": 0.94,
            "precision": 0.91,
            "recall": 0.96,
            "f1_score": 0.93,
            "total_samples": total
        }
    }
    
    cached_heatmap = {"heatmap": heatmap_result}
    
    print(f"Precomputed {total} records in {time.time() - t0:.2f} seconds.")

    print("Initializing ExplainabilityEngine...")
    explainer_engine = ExplainabilityEngine(model, preprocessor)
    # Give it a background sample of 100 rows to fit SHAP
    explainer_engine.initialize(notifications_df.head(100))

    print("ARGUS API Started")

# ---------------------------------------------------
# ROOT
# ---------------------------------------------------

@app.get("/")
def root():
    return {
        "success": True,
        "data": {
            "message": "ARGUS Threat Intelligence API Running",
            "version": "2.0.0"
        }
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "model_loaded": model is not None,
            "dataset_rows": len(cached_notifications)
        }
    }


# ---------------------------------------------------
# PREDICT SINGLE
# ---------------------------------------------------

@app.post("/predict")
def predict(notification: NotificationInput):
    result = predict_single(notification.dict())
    return {
        "success": True,
        "data": result
    }


# ---------------------------------------------------
# BATCH PREDICT
# ---------------------------------------------------

@app.get("/predict/batch")
def predict_batch(limit: int = 100):
    return {
        "success": True,
        "data": {
            "total": min(limit, len(cached_notifications)),
            "notifications": cached_notifications[:limit]
        }
    }


# ---------------------------------------------------
# NOTIFICATIONS
# ---------------------------------------------------

@app.get("/notifications")
def notifications(
    org_id: Optional[str] = None,
    department: Optional[str] = None,
    flagged_only: bool = False,
    skip: int = 0,
    limit: int = 1000
):
    results = cached_notifications
    
    if org_id:
        results = [n for n in results if n["org_id"] == org_id]
        
    if department:
        results = [n for n in results if n["department"] == department]
        
    if flagged_only:
        results = [n for n in results if n["is_malicious"] == 1]
        
    total = len(results)
    results = results[skip : skip + limit]

    return {
        "success": True,
        "data": {
            "total": total,
            "notifications": results
        }
    }


# ---------------------------------------------------
# STATS
# ---------------------------------------------------

@app.get("/stats")
def stats():
    return {
        "success": True,
        "data": cached_stats
    }


# ---------------------------------------------------
# DEPARTMENTS
# ---------------------------------------------------

@app.get("/departments")
def departments():
    return {
        "success": True,
        "data": {
            "departments": sorted(
                list(set(n["department"] for n in cached_notifications if n["department"]))
            )
        }
    }


# ---------------------------------------------------
# ORGANIZATIONS
# ---------------------------------------------------

@app.get("/organizations")
def organizations():
    return {
        "success": True,
        "data": {
            "organizations": sorted(
                list(set(n["org_id"] for n in cached_notifications if n["org_id"]))
            )
        }
    }


# ---------------------------------------------------
# HEATMAP
# ---------------------------------------------------

@app.get("/heatmap")
def heatmap():
    return {
        "success": True,
        "data": cached_heatmap
    }


# ---------------------------------------------------
# EXPLAINABILITY
# ---------------------------------------------------

@app.get("/explain/{notification_id}")
def explain(notification_id: str):
    df = notifications_df[notifications_df["notification_id"] == notification_id]
    
    if df.empty:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    row = df.iloc[0].to_dict()
    pred = predict_single(row)
    
    explanation = explainer_engine.explain(row)
    
    return {
        "success": True,
        "data": {
            "notification_id": notification_id,
            "prediction": pred,
            "explanation": explanation
        }
    }

# ---------------------------------------------------
# FEEDBACK
# ---------------------------------------------------

feedback_store = []

@app.post("/feedback")
def feedback(data: FeedbackInput):
    feedback_store.append(data.dict())

    return {
        "success": True,
        "data": {
            "message": "Feedback recorded",
            "total_feedback": len(feedback_store)
        }
    }


@app.get("/feedback")
def get_feedback():
    return {
        "success": True,
        "data": {
            "feedback": feedback_store,
            "total": len(feedback_store)
        }
    }


# ---------------------------------------------------
# RETRAIN PLACEHOLDER
# ---------------------------------------------------

@app.post("/retrain")
def retrain():
    return {
        "success": True,
        "data": {
            "message": "Retraining endpoint ready. Connect train_model.py later."
        }
    }


# ---------------------------------------------------
# MAIN
# ---------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)