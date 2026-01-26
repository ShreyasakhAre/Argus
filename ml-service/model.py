import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier
import joblib
import os
from preprocess import DataPreprocessor

class FraudDetectionModel:
    def __init__(self):
        self.model = XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        self.preprocessor = DataPreprocessor()
        self.metrics = {}
        self.is_trained = False
        
    def train(self, data_path='dataset/notifications.csv', feedback_data=None):
        df = pd.read_csv(data_path)
        
        if feedback_data is not None and len(feedback_data) > 0:
            feedback_df = pd.DataFrame(feedback_data)
            if 'corrected_label' in feedback_df.columns:
                for _, row in feedback_df.iterrows():
                    mask = df['notification_id'] == row['notification_id']
                    if mask.any():
                        df.loc[mask, 'is_malicious'] = row['corrected_label']
        
        X = self.preprocessor.extract_features(df, fit=True)
        y = df['is_malicious']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        self.model.fit(X_train, y_train)
        
        y_pred = self.model.predict(X_test)
        
        self.metrics = {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, zero_division=0)),
            'total_samples': len(df),
            'malicious_samples': int(y.sum()),
            'benign_samples': int(len(y) - y.sum())
        }
        
        self.is_trained = True
        return self.metrics
    
    def predict(self, notification_data):
        if not self.is_trained:
            raise ValueError("Model not trained yet")
            
        if isinstance(notification_data, dict):
            df = pd.DataFrame([notification_data])
        else:
            df = notification_data
            
        X = self.preprocessor.extract_features(df, fit=False)
        
        probabilities = self.model.predict_proba(X)[:, 1]
        predictions = self.model.predict(X)
        
        results = []
        for i, (prob, pred) in enumerate(zip(probabilities, predictions)):
            risk_score = float(prob)
            if risk_score < 0.3:
                risk_level = 'Low'
            elif risk_score < 0.7:
                risk_level = 'Medium'
            else:
                risk_level = 'High'
                
            results.append({
                'notification_id': notification_data.get('notification_id', f'N{i}') if isinstance(notification_data, dict) else df.iloc[i].get('notification_id', f'N{i}'),
                'risk_score': risk_score,
                'risk_level': risk_level,
                'is_flagged': bool(pred)
            })
            
        return results[0] if isinstance(notification_data, dict) else results
    
    def predict_batch(self, df):
        if not self.is_trained:
            raise ValueError("Model not trained yet")
            
        X = self.preprocessor.extract_features(df, fit=False)
        probabilities = self.model.predict_proba(X)[:, 1]
        predictions = self.model.predict(X)
        
        results = []
        for i, (prob, pred) in enumerate(zip(probabilities, predictions)):
            risk_score = float(prob)
            if risk_score < 0.3:
                risk_level = 'Low'
            elif risk_score < 0.7:
                risk_level = 'Medium'
            else:
                risk_level = 'High'
                
            results.append({
                'notification_id': df.iloc[i]['notification_id'],
                'org_id': df.iloc[i]['org_id'],
                'department': df.iloc[i]['department'],
                'sender': df.iloc[i]['sender'],
                'receiver': df.iloc[i]['receiver'],
                'content': df.iloc[i]['content'],
                'timestamp': df.iloc[i]['timestamp'],
                'risk_score': risk_score,
                'risk_level': risk_level,
                'is_flagged': bool(pred)
            })
            
        return results
    
    def get_feature_importance(self):
        if not self.is_trained:
            return {}
        feature_names = self.preprocessor.get_feature_names()
        importances = self.model.feature_importances_
        return dict(zip(feature_names, [float(x) for x in importances]))
    
    def save(self, path='models'):
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.model, f'{path}/fraud_model.pkl')
        joblib.dump(self.metrics, f'{path}/metrics.pkl')
        self.preprocessor.save(path)
        
    def load(self, path='models'):
        self.model = joblib.load(f'{path}/fraud_model.pkl')
        self.metrics = joblib.load(f'{path}/metrics.pkl')
        self.preprocessor.load(path)
        self.is_trained = True
