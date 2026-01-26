from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import os
from dotenv import load_dotenv

from model import FraudDetectionModel
from explain import ExplainabilityEngine
from qr_scanner import process_qr_image, scan_qr_url

load_dotenv()

app = FastAPI(title="ARGUS ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fraud_model = FraudDetectionModel()
explainer = None
notifications_df = None

class NotificationInput(BaseModel):
    notification_id: str
    org_id: str
    department: str
    sender: str
    receiver: str
    content: str
    timestamp: str

class FeedbackInput(BaseModel):
    notification_id: str
    decision: str
    corrected_label: Optional[int] = None
    analyst_notes: Optional[str] = None

class PredictionResponse(BaseModel):
    notification_id: str
    risk_score: float
    risk_level: str
    is_flagged: bool

@app.on_event("startup")
async def startup_event():
    global fraud_model, explainer, notifications_df
    
    try:
        fraud_model.load('models')
        print("Loaded existing model")
    except:
        print("Training new model...")
        metrics = fraud_model.train('dataset/notifications.csv')
        fraud_model.save('models')
        print(f"Model trained with metrics: {metrics}")
    
    notifications_df = pd.read_csv('dataset/notifications.csv')
    
    explainer = ExplainabilityEngine(fraud_model.model, fraud_model.preprocessor)
    explainer.initialize(notifications_df)
    print("Explainer initialized")

@app.get("/")
async def root():
    return {"message": "ARGUS ML Service is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_trained": fraud_model.is_trained,
        "explainer_ready": explainer is not None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(notification: NotificationInput):
    if not fraud_model.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    
    notification_dict = notification.dict()
    result = fraud_model.predict(notification_dict)
    return result

@app.get("/predict/batch")
async def predict_batch(org_id: Optional[str] = None):
    if not fraud_model.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    
    df = notifications_df.copy()
    if org_id:
        df = df[df['org_id'] == org_id]
    
    results = fraud_model.predict_batch(df)
    return {"notifications": results, "total": len(results)}

@app.get("/stats")
async def get_stats():
    if not fraud_model.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    
    df = notifications_df.copy()
    predictions = fraud_model.predict_batch(df)
    
    flagged_count = sum(1 for p in predictions if p['is_flagged'])
    
    dept_stats = {}
    for p in predictions:
        dept = p['department']
        if dept not in dept_stats:
            dept_stats[dept] = {'total': 0, 'flagged': 0, 'risk_scores': []}
        dept_stats[dept]['total'] += 1
        dept_stats[dept]['risk_scores'].append(p['risk_score'])
        if p['is_flagged']:
            dept_stats[dept]['flagged'] += 1
    
    for dept in dept_stats:
        scores = dept_stats[dept]['risk_scores']
        dept_stats[dept]['avg_risk'] = sum(scores) / len(scores) if scores else 0
        del dept_stats[dept]['risk_scores']
    
    return {
        "total_notifications": len(df),
        "flagged_notifications": flagged_count,
        "benign_notifications": len(df) - flagged_count,
        "model_metrics": fraud_model.metrics,
        "department_stats": dept_stats,
        "feature_importance": fraud_model.get_feature_importance()
    }

@app.post("/explain")
async def explain_prediction(notification: NotificationInput):
    if explainer is None:
        raise HTTPException(status_code=503, detail="Explainer not initialized")
    
    notification_dict = notification.dict()
    
    prediction = fraud_model.predict(notification_dict)
    explanation = explainer.explain(notification_dict)
    
    return {
        "notification_id": notification.notification_id,
        "prediction": prediction,
        "explanation": explanation
    }

@app.get("/explain/{notification_id}")
async def explain_by_id(notification_id: str):
    if explainer is None:
        raise HTTPException(status_code=503, detail="Explainer not initialized")
    
    notification = notifications_df[notifications_df['notification_id'] == notification_id]
    if notification.empty:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification_dict = notification.iloc[0].to_dict()
    prediction = fraud_model.predict(notification_dict)
    explanation = explainer.explain(notification_dict)
    
    return {
        "notification_id": notification_id,
        "notification": notification_dict,
        "prediction": prediction,
        "explanation": explanation
    }

feedback_store = []

@app.post("/feedback")
async def submit_feedback(feedback: FeedbackInput):
    feedback_dict = feedback.dict()
    feedback_dict['timestamp'] = pd.Timestamp.now().isoformat()
    feedback_store.append(feedback_dict)
    
    return {"message": "Feedback recorded", "total_feedback": len(feedback_store)}

@app.get("/feedback")
async def get_feedback():
    return {"feedback": feedback_store, "total": len(feedback_store)}

@app.post("/retrain")
async def retrain_model():
    global fraud_model, explainer
    
    feedback_for_training = [f for f in feedback_store if f.get('corrected_label') is not None]
    
    old_accuracy = fraud_model.metrics.get('accuracy', 0)
    
    metrics = fraud_model.train('dataset/notifications.csv', feedback_data=feedback_for_training)
    fraud_model.save('models')
    
    explainer = ExplainabilityEngine(fraud_model.model, fraud_model.preprocessor)
    explainer.initialize(notifications_df)
    
    return {
        "message": "Model retrained successfully",
        "old_accuracy": old_accuracy,
        "new_accuracy": metrics['accuracy'],
        "metrics": metrics,
        "feedback_samples_used": len(feedback_for_training)
    }

@app.get("/notifications")
async def get_notifications(
    org_id: Optional[str] = None,
    department: Optional[str] = None,
    flagged_only: bool = False
):
    df = notifications_df.copy()
    
    if org_id:
        df = df[df['org_id'] == org_id]
    if department:
        df = df[df['department'] == department]
    
    predictions = fraud_model.predict_batch(df)
    
    if flagged_only:
        predictions = [p for p in predictions if p['is_flagged']]
    
    return {"notifications": predictions, "total": len(predictions)}

@app.get("/departments")
async def get_departments():
    departments = notifications_df['department'].unique().tolist()
    return {"departments": departments}

@app.get("/organizations")
async def get_organizations():
    orgs = notifications_df['org_id'].unique().tolist()
    return {"organizations": orgs}


class UrlScanInput(BaseModel):
    url: str


@app.post("/scan-qr")
async def scan_qr(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    image_bytes = await file.read()
    
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")
    
    result = process_qr_image(image_bytes)
    
    if not result['success']:
        raise HTTPException(status_code=422, detail=result.get('error', 'Failed to process QR code'))
    
    return result


@app.post("/scan-url")
async def scan_url(input_data: UrlScanInput):
    if not input_data.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    result = scan_qr_url(input_data.url)
    return result

@app.get("/heatmap")
async def get_heatmap(org_id: Optional[str] = None):
    df = notifications_df.copy()
    if org_id:
        df = df[df['org_id'] == org_id]
    
    predictions = fraud_model.predict_batch(df)
    
    heatmap_data = {}
    for p in predictions:
        dept = p['department']
        if dept not in heatmap_data:
            heatmap_data[dept] = {
                'total': 0,
                'flagged': 0,
                'high_risk': 0,
                'medium_risk': 0,
                'low_risk': 0,
                'total_risk_score': 0
            }
        
        heatmap_data[dept]['total'] += 1
        heatmap_data[dept]['total_risk_score'] += p['risk_score']
        
        if p['is_flagged']:
            heatmap_data[dept]['flagged'] += 1
        
        if p['risk_level'] == 'High':
            heatmap_data[dept]['high_risk'] += 1
        elif p['risk_level'] == 'Medium':
            heatmap_data[dept]['medium_risk'] += 1
        else:
            heatmap_data[dept]['low_risk'] += 1
    
    for dept in heatmap_data:
        total = heatmap_data[dept]['total']
        heatmap_data[dept]['avg_risk_score'] = heatmap_data[dept]['total_risk_score'] / total if total > 0 else 0
        heatmap_data[dept]['flagged_percentage'] = (heatmap_data[dept]['flagged'] / total * 100) if total > 0 else 0
        del heatmap_data[dept]['total_risk_score']
    
    return {"heatmap": heatmap_data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
