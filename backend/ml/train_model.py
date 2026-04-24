import argparse
import json
import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction import DictVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "../../ml-service/dataset/argus_notifications_10000.csv"))
MODEL_DIR = os.path.join(BASE_DIR, "models")


LABEL_TO_ID = {
    "safe": 0,
    "suspicious": 1,
    "phishing": 2,
    "malware": 3,
    "bec": 4,
}
ID_TO_LABEL = {v: k for k, v in LABEL_TO_ID.items()}


def safe_str(value):
    if value is None:
        return ""
    return str(value)


def pseudo_label(row):
    content = safe_str(row.get("content", "")).lower()
    sender_domain = safe_str(row.get("sender_domain", "")).lower()
    attachment = safe_str(row.get("attachment_type", "none")).lower()
    contains_url = str(row.get("contains_url", "0")).lower() in {"1", "true", "yes"}

    phishing_terms = ["urgent", "verify", "password", "login", "account", "credential", "reset"]
    bec_terms = ["invoice", "wire", "payment", "transfer", "finance", "immediate payment"]
    malware_terms = ["exe", "zip", "scr", "macro", "payload"]

    suspicious_domain_tokens = ["bit.ly", "tinyurl", "secure-", "verify-now", "free-"]
    trusted_domain_tokens = ["company.com", "argus.local", "internal.argus"]

    has_phishing_terms = any(t in content for t in phishing_terms)
    has_bec_terms = any(t in content for t in bec_terms)
    has_malware_terms = any(t in content for t in malware_terms)
    has_suspicious_domain = any(t in sender_domain for t in suspicious_domain_tokens)
    has_trusted_domain = any(sender_domain.endswith(t) for t in trusted_domain_tokens)

    if attachment in {"exe", "zip", "js", "scr", "bat"} or has_malware_terms:
        return LABEL_TO_ID["malware"]

    if has_bec_terms and (contains_url or has_suspicious_domain or "urgent" in content):
        return LABEL_TO_ID["bec"]

    if (has_suspicious_domain and contains_url and has_phishing_terms) or (contains_url and has_phishing_terms):
        return LABEL_TO_ID["phishing"]

    if has_phishing_terms or has_suspicious_domain or contains_url:
        return LABEL_TO_ID["suspicious"]

    if has_trusted_domain:
        return LABEL_TO_ID["safe"]

    return LABEL_TO_ID["safe"]


def build_text(row):
    sender = safe_str(row.get("sender", ""))
    sender_domain = safe_str(row.get("sender_domain", ""))
    content = safe_str(row.get("content", ""))
    return f"{sender} {sender_domain} {content}"


def domain_reputation(sender_domain):
    domain = safe_str(sender_domain).lower()
    if any(t in domain for t in ["bit.ly", "tinyurl", "secure-", "free-", "verify"]):
        return 0
    if domain.endswith("company.com") or domain.endswith("argus.local"):
        return 1
    return 0.5


def extract_meta_features(row):
    content = safe_str(row.get("content", "")).lower()
    sender = safe_str(row.get("sender", "")).lower()
    receiver = safe_str(row.get("receiver", "")).lower()
    department = safe_str(row.get("department", "unknown"))
    sender_domain = safe_str(row.get("sender_domain", ""))
    attachment = safe_str(row.get("attachment_type", "none")).lower()

    contains_url = str(row.get("contains_url", "0")).lower() in {"1", "true", "yes"}
    url_count = content.count("http") + content.count("www.") + (1 if contains_url else 0)

    hour = 12
    try:
        ts = pd.to_datetime(row.get("timestamp"))
        hour = int(ts.hour)
    except Exception:
        hour = 12

    external_sender = 0 if sender_domain.endswith("company.com") or sender_domain.endswith("argus.local") else 1

    mismatch = 0
    if receiver and "@" in receiver:
        local = receiver.split("@")[0].lower()
        if department and department.lower() not in local:
            mismatch = 1

    return {
        "channel": safe_str(row.get("channel", "unknown")),
        "department": department,
        "attachment_type": attachment,
        "sender_domain": sender_domain,
        "external_sender": external_sender,
        "department_mismatch": mismatch,
        "contains_url": int(contains_url),
        "url_count": url_count,
        "hour_of_day": hour,
        "domain_reputation": domain_reputation(sender_domain),
        "urgent_term_count": sum(content.count(t) for t in ["urgent", "immediate", "asap"]),
        "credential_term_count": sum(content.count(t) for t in ["password", "login", "verify", "credential"]),
        "campaign_spike": 1 if content.count("click") > 1 else 0,
    }


def map_feedback_decision(entry):
    corrected = entry.get("corrected_label")
    if corrected is not None:
        corrected_str = safe_str(corrected).strip().lower()
        if corrected_str.isdigit() and int(corrected_str) in ID_TO_LABEL:
            return int(corrected_str)
        if corrected_str in LABEL_TO_ID:
            return LABEL_TO_ID[corrected_str]

    decision = safe_str(entry.get("decision", "")).strip().lower()
    if decision in {"approved", "mark_safe", "safe"}:
        return LABEL_TO_ID["safe"]
    if decision in {"rejected", "mark_malicious", "threat", "malicious"}:
        return LABEL_TO_ID["phishing"]
    if decision in {"escalated", "escalate"}:
        return LABEL_TO_ID["suspicious"]
    return None


def apply_feedback_labels(df, feedback_json_path):
    if not feedback_json_path or not os.path.exists(feedback_json_path):
        return df, 0

    with open(feedback_json_path, "r", encoding="utf-8") as f:
        feedback_entries = json.load(f)

    mapping = {}
    for entry in feedback_entries:
        nid = safe_str(entry.get("notification_id", "")).strip()
        label_id = map_feedback_decision(entry)
        if nid and label_id is not None:
            mapping[nid] = label_id

    if not mapping:
        return df, 0

    updated = 0
    labels = []
    for _, row in df.iterrows():
        nid = safe_str(row.get("notification_id", "")).strip()
        if nid in mapping:
            labels.append(mapping[nid])
            updated += 1
        else:
            labels.append(pseudo_label(row))

    df = df.copy()
    df["label_id"] = labels
    return df, updated


def train(feedback_json_path=None):
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    df = df.fillna("")

    df["label_id"] = df.apply(pseudo_label, axis=1)
    df, feedback_applied = apply_feedback_labels(df, feedback_json_path)

    text_series = df.apply(build_text, axis=1)
    meta_dicts = [extract_meta_features(row) for _, row in df.iterrows()]
    labels = df["label_id"].astype(int).values

    idx = np.arange(len(df))
    train_idx, test_idx = train_test_split(idx, test_size=0.2, random_state=42, stratify=labels)

    tfidf = TfidfVectorizer(max_features=4000, ngram_range=(1, 2), min_df=2)
    X_text_train = tfidf.fit_transform(text_series.iloc[train_idx])
    X_text_test = tfidf.transform(text_series.iloc[test_idx])

    meta_vectorizer = DictVectorizer(sparse=True)
    X_meta_train = meta_vectorizer.fit_transform([meta_dicts[i] for i in train_idx])
    X_meta_test = meta_vectorizer.transform([meta_dicts[i] for i in test_idx])

    y_train = labels[train_idx]
    y_test = labels[test_idx]

    text_model = LogisticRegression(max_iter=1200, multi_class="multinomial", n_jobs=None)
    text_model.fit(X_text_train, y_train)

    meta_model = RandomForestClassifier(
        n_estimators=240,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    meta_model.fit(X_meta_train, y_train)

    text_probs = text_model.predict_proba(X_text_test)
    meta_probs = meta_model.predict_proba(X_meta_test)

    # Lightweight rule probability prior.
    rule_probs = np.zeros_like(text_probs)
    for i, idx_value in enumerate(test_idx):
        rid = labels[idx_value]
        rule_probs[i, rid] = 1.0

    ensemble_probs = 0.5 * text_probs + 0.35 * meta_probs + 0.15 * rule_probs
    pred = ensemble_probs.argmax(axis=1)

    accuracy = float(accuracy_score(y_test, pred))
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, pred, average="weighted", zero_division=0)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(text_model, os.path.join(MODEL_DIR, "text_model.pkl"))
    joblib.dump(meta_model, os.path.join(MODEL_DIR, "meta_model.pkl"))
    joblib.dump(tfidf, os.path.join(MODEL_DIR, "vectorizer.pkl"))
    joblib.dump(meta_vectorizer, os.path.join(MODEL_DIR, "meta_vectorizer.pkl"))

    metrics = {
        "accuracy": round(accuracy, 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "train_size": int(len(train_idx)),
        "test_size": int(len(test_idx)),
        "feedback_applied": int(feedback_applied),
        "model_version": f"argus-ml-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "labels": ID_TO_LABEL,
    }

    with open(os.path.join(MODEL_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--feedback-json", dest="feedback_json", default=None)
    args = parser.parse_args()

    metrics = train(args.feedback_json)
    print(json.dumps({"success": True, "metrics": metrics}))


if __name__ == "__main__":
    main()
