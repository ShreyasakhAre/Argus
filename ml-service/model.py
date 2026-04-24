import joblib
import pandas as pd
import os

class FraudDetectionModel:
    def __init__(self):
        self.model = None
        self.is_trained = False
        self.metrics = {}

    def load(self, path="models"):
        file_path = os.path.join(path, "fraud_model.pkl")
        self.model = joblib.load(file_path)
        self.is_trained = True
        self.metrics = {"status": "loaded"}

    def predict(self, data):
        df = pd.DataFrame([data])

        pred = self.model.predict(df)[0]
        prob = self.model.predict_proba(df)[0][1]

        risk = float(prob)

        if risk >= 0.8:
            level = "High"
        elif risk >= 0.5:
            level = "Medium"
        else:
            level = "Low"

        return {
            "notification_id": data.get("notification_id", ""),
            "risk_score": round(risk, 4),
            "risk_level": level,
            "is_flagged": int(pred) == 1,
            "department": data.get("department", "")
        }

    def predict_batch(self, df):
        results = []
        for _, row in df.iterrows():
            results.append(self.predict(row.to_dict()))
        return results