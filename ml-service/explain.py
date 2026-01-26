import shap
import numpy as np
import pandas as pd

class ExplainabilityEngine:
    def __init__(self, model, preprocessor):
        self.model = model
        self.preprocessor = preprocessor
        self.explainer = None
        self.feature_descriptions = {
            'content_length': 'message length',
            'word_count': 'number of words',
            'has_urgent': 'urgency keywords detected',
            'has_money_keywords': 'financial/money keywords detected',
            'has_action_keywords': 'action-demanding keywords detected',
            'has_threat_keywords': 'threatening language detected',
            'is_external_sender': 'sender is from external domain',
            'exclamation_count': 'excessive exclamation marks',
            'uppercase_ratio': 'high proportion of uppercase letters',
            'department_encoded': 'unusual department pattern',
            'sender_domain_encoded': 'suspicious sender domain'
        }
        
    def initialize(self, background_data):
        X_background = self.preprocessor.extract_features(background_data, fit=False)
        X_sample = X_background.sample(min(50, len(X_background)), random_state=42)
        self.explainer = shap.TreeExplainer(self.model, X_sample)
        
    def explain(self, notification_data):
        if self.explainer is None:
            raise ValueError("Explainer not initialized. Call initialize() first.")
            
        if isinstance(notification_data, dict):
            df = pd.DataFrame([notification_data])
        else:
            df = notification_data
            
        X = self.preprocessor.extract_features(df, fit=False)
        
        shap_values = self.explainer.shap_values(X)
        
        if isinstance(shap_values, list):
            shap_vals = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        else:
            shap_vals = shap_values
            
        if len(shap_vals.shape) > 1:
            shap_vals = shap_vals[0]
            
        feature_names = self.preprocessor.get_feature_names()
        
        feature_impacts = []
        for i, (name, value) in enumerate(zip(feature_names, shap_vals)):
            if abs(value) > 0.001:
                feature_impacts.append({
                    'feature': name,
                    'impact': float(value),
                    'direction': 'increases' if value > 0 else 'decreases'
                })
        
        feature_impacts.sort(key=lambda x: abs(x['impact']), reverse=True)
        top_features = feature_impacts[:3]
        
        explanation_parts = []
        for feat in top_features:
            feature_name = feat['feature']
            if feature_name in self.feature_descriptions:
                desc = self.feature_descriptions[feature_name]
            elif feature_name.startswith('tfidf_'):
                desc = 'suspicious content patterns'
            else:
                desc = feature_name.replace('_', ' ')
                
            if feat['direction'] == 'increases':
                explanation_parts.append(desc)
                
        if explanation_parts:
            explanation_text = f"Flagged because: {', '.join(explanation_parts)}"
        else:
            explanation_text = "No significant risk factors identified"
            
        return {
            'top_features': top_features,
            'explanation_text': explanation_text,
            'all_impacts': feature_impacts[:10]
        }
    
    def batch_explain(self, notifications_df):
        results = []
        for idx, row in notifications_df.iterrows():
            explanation = self.explain(row.to_dict())
            results.append({
                'notification_id': row['notification_id'],
                **explanation
            })
        return results
