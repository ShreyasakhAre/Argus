import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)
from xgboost import XGBClassifier
from preprocess import DataPreprocessor

# ------------------------------------
# CONFIG
# ------------------------------------

DATA_PATH = "dataset/argus_notifications_10000.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "fraud_model.pkl")

# ------------------------------------
# LOAD DATA
# ------------------------------------

print("Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"Rows: {len(df)}")

target = "is_malicious"
y = df[target]

# ------------------------------------
# PREPROCESSING
# ------------------------------------

print("Initializing and fitting DataPreprocessor...")
preprocessor = DataPreprocessor()
X = preprocessor.extract_features(df, fit=True)

# ------------------------------------
# TRAIN TEST SPLIT
# ------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print(f"Train rows: {len(X_train)}")
print(f"Test rows : {len(X_test)}")

# ------------------------------------
# TRAIN XGBOOST MODEL
# ------------------------------------

print("Training XGBoost model...")
model = XGBClassifier(
    n_estimators=150,
    learning_rate=0.05,
    max_depth=5,
    scale_pos_weight=(len(y_train) - sum(y_train)) / sum(y_train),  # Handle class imbalance
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss'
)

model.fit(X_train, y_train)
print("Training complete.")

# ------------------------------------
# EVALUATE
# ------------------------------------

y_pred = model.predict(X_test)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n--- MODEL PERFORMANCE ---")
print(f"Accuracy : {acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall   : {rec:.4f}")
print(f"F1 Score : {f1:.4f}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# ------------------------------------
# SAVE MODEL & PREPROCESSOR
# ------------------------------------

os.makedirs(MODEL_DIR, exist_ok=True)
joblib.dump(model, MODEL_PATH)

# Save the preprocessor components alongside the model
preprocessor.save(MODEL_DIR)

print(f"\nModel and preprocessor saved to: {MODEL_DIR}")