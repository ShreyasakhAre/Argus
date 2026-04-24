import argparse
import json
import os

import joblib
import numpy as np


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

LABEL_MAP = {
    0: "Safe",
    1: "Suspicious",
    2: "Phishing",
    3: "Malware",
    4: "BEC Fraud",
}


def safe_str(value):
    if value is None:
        return ""
    return str(value)


def normalize_payload(payload):
    subject = safe_str(payload.get("subject", ""))
    body = safe_str(payload.get("body", payload.get("content", "")))
    sender = safe_str(payload.get("sender", "unknown@external.com"))
    department = safe_str(payload.get("department", "Unknown"))
    links = payload.get("links", 0)
    attachments = safe_str(payload.get("attachments", payload.get("attachment_type", "none")))

    sender_domain = ""
    if "@" in sender:
        sender_domain = sender.split("@", 1)[1].lower()

    contains_url = 1 if int(links) > 0 else 0
    channel = safe_str(payload.get("channel", "Email"))

    content = f"{subject} {body}".strip()

    row = {
        "content": content,
        "sender": sender,
        "sender_domain": sender_domain,
        "department": department,
        "contains_url": contains_url,
        "attachment_type": attachments,
        "channel": channel,
        "receiver": safe_str(payload.get("receiver", "employee@company.com")),
        "timestamp": safe_str(payload.get("timestamp", "2026-01-01 10:00:00")),
    }

    return row


def build_text(row):
    return f"{safe_str(row.get('sender', ''))} {safe_str(row.get('sender_domain', ''))} {safe_str(row.get('content', ''))}"


def meta_features(row):
    content = safe_str(row.get("content", "")).lower()
    sender_domain = safe_str(row.get("sender_domain", "")).lower()
    contains_url = int(row.get("contains_url", 0))
    attachment = safe_str(row.get("attachment_type", "none")).lower()
    department = safe_str(row.get("department", "Unknown"))

    return {
        "channel": safe_str(row.get("channel", "Email")),
        "department": department,
        "attachment_type": attachment,
        "sender_domain": sender_domain,
        "external_sender": 0 if sender_domain.endswith("company.com") or sender_domain.endswith("argus.local") else 1,
        "department_mismatch": 1 if department and department.lower() not in safe_str(row.get("receiver", "")).lower() else 0,
        "contains_url": contains_url,
        "url_count": int(contains_url),
        "hour_of_day": 12,
        "domain_reputation": 1 if sender_domain.endswith("company.com") or sender_domain.endswith("argus.local") else 0.4,
        "urgent_term_count": sum(content.count(t) for t in ["urgent", "immediate", "asap"]),
        "credential_term_count": sum(content.count(t) for t in ["password", "login", "verify", "credential"]),
        "campaign_spike": 1 if content.count("click") > 1 else 0,
    }


def rule_prior(row):
    content = safe_str(row.get("content", "")).lower()
    sender_domain = safe_str(row.get("sender_domain", "")).lower()
    attachment = safe_str(row.get("attachment_type", "none")).lower()
    contains_url = int(row.get("contains_url", 0)) > 0

    if attachment in {"exe", "zip", "js", "scr", "bat"}:
        return 3
    if any(t in content for t in ["invoice", "wire", "payment"]) and "urgent" in content:
        return 4
    if contains_url and any(t in content for t in ["verify", "login", "password"]):
        return 2
    if any(t in sender_domain for t in ["bit.ly", "tinyurl", "verify", "secure-"]):
        return 2
    if contains_url or any(t in content for t in ["urgent", "suspended", "action required"]):
        return 1
    return 0


def recommended_action(label, risk_score):
    if label in {"Phishing", "Malware", "BEC Fraud"} or risk_score >= 70:
        return "Block sender, isolate message, and escalate to fraud analyst."
    if label == "Suspicious" or risk_score >= 40:
        return "Request analyst review and avoid interacting with links or attachments."
    return "Mark safe and continue monitoring communication patterns."


def feature_reasons(row, ensemble_probs, shap_values=None):
    reasons = []
    content = safe_str(row.get("content", "")).lower()
    domain = safe_str(row.get("sender_domain", "")).lower()

    if "urgent" in content or "immediate" in content:
        reasons.append("Urgency language indicates social engineering pressure.")
    if any(t in content for t in ["verify", "login", "password", "credential"]):
        reasons.append("Credential-related language detected in notification content.")
    if int(row.get("contains_url", 0)) > 0:
        reasons.append("External link presence increased phishing likelihood.")
    if safe_str(row.get("attachment_type", "none")).lower() in {"exe", "zip", "js", "scr"}:
        reasons.append("Executable or compressed attachment indicates malware delivery risk.")
    if any(t in domain for t in ["bit.ly", "tinyurl", "secure-", "verify"]):
        reasons.append("Sender domain pattern appears suspicious or spoof-like.")

    if shap_values is not None:
        top = sorted(shap_values.items(), key=lambda kv: abs(kv[1]), reverse=True)[:3]
        for feat, impact in top:
            direction = "increased" if impact >= 0 else "reduced"
            reasons.append(f"Feature {feat} {direction} risk contribution ({impact:.3f}).")

    if not reasons:
        reasons.append("Verified sender characteristics and low-risk language patterns detected.")

    return reasons[:5]


def load_artifacts():
    text_model = joblib.load(os.path.join(MODEL_DIR, "text_model.pkl"))
    meta_model = joblib.load(os.path.join(MODEL_DIR, "meta_model.pkl"))
    vectorizer = joblib.load(os.path.join(MODEL_DIR, "vectorizer.pkl"))
    meta_vectorizer = joblib.load(os.path.join(MODEL_DIR, "meta_vectorizer.pkl"))
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    return text_model, meta_model, vectorizer, meta_vectorizer, metrics


def predict(payload):
    row = normalize_payload(payload)

    text_model, meta_model, vectorizer, meta_vectorizer, metrics = load_artifacts()

    text_input = [build_text(row)]
    meta_input = [meta_features(row)]

    x_text = vectorizer.transform(text_input)
    x_meta = meta_vectorizer.transform(meta_input)

    text_probs = text_model.predict_proba(x_text)[0]
    meta_probs = meta_model.predict_proba(x_meta)[0]

    rule_label = rule_prior(row)
    rule_probs = np.zeros_like(text_probs)
    if rule_label < len(rule_probs):
        rule_probs[rule_label] = 1.0

    ensemble_probs = 0.5 * text_probs + 0.35 * meta_probs + 0.15 * rule_probs
    pred_id = int(np.argmax(ensemble_probs))
    confidence = float(np.max(ensemble_probs))

    label = LABEL_MAP.get(pred_id, "Suspicious")
    risk_score = int(round(confidence * 100))

    shap_values = None
    try:
        import shap  # type: ignore
        explainer = shap.TreeExplainer(meta_model)
        sv = explainer.shap_values(x_meta)
        if isinstance(sv, list):
            class_sv = sv[pred_id][0]
        else:
            class_sv = sv[0]
        feature_names = meta_vectorizer.get_feature_names_out()
        shap_values = {feature_names[i]: float(class_sv[i]) for i in range(min(len(feature_names), len(class_sv)))}
    except Exception:
        shap_values = None

    reasons = feature_reasons(row, ensemble_probs, shap_values)

    return {
        "label": label,
        "riskScore": risk_score,
        "confidence": round(confidence, 4),
        "reasons": reasons,
        "recommendedAction": recommended_action(label, risk_score),
        "modelVersion": metrics.get("model_version", "argus-ml-unversioned"),
        "shapValues": shap_values or {},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="JSON payload")
    args = parser.parse_args()

    payload = json.loads(args.input)
    result = predict(payload)
    print(json.dumps({"success": True, "data": result}))


if __name__ == "__main__":
    main()
