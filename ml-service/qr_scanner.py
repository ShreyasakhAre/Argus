import re
from typing import Optional
from PIL import Image
from io import BytesIO

try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False

SUSPICIOUS_KEYWORDS = [
    'login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm',
    'banking', 'paypal', 'amazon', 'microsoft', 'apple', 'google', 'netflix',
    'password', 'credential', 'suspended', 'urgent', 'expire', 'locked',
    'winner', 'prize', 'free', 'gift', 'claim', 'reward', 'lucky'
]

SUSPICIOUS_TLDS = [
    '.xyz', '.top', '.club', '.work', '.click', '.link', '.gq', '.ml', '.cf',
    '.tk', '.ga', '.pw', '.cc', '.su', '.buzz', '.rest', '.fit'
]

LEGITIMATE_DOMAINS = [
    'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'github.com',
    'linkedin.com', 'facebook.com', 'twitter.com', 'youtube.com', 'netflix.com',
    'paypal.com', 'dropbox.com', 'slack.com', 'zoom.us', 'salesforce.com'
]


def extract_qr_data(image_bytes: bytes) -> Optional[str]:
    if not PYZBAR_AVAILABLE:
        return _fallback_qr_decode(image_bytes)
    
    try:
        image = Image.open(BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        decoded_objects = pyzbar_decode(image)
        
        for obj in decoded_objects:
            if obj.type == 'QRCODE':
                return obj.data.decode('utf-8')
        
        return None
    except Exception:
        return None


def _fallback_qr_decode(image_bytes: bytes) -> Optional[str]:
    return None


def extract_features(url: str) -> list[dict]:
    features = []
    
    try:
        from urllib.parse import urlparse
        if not url.startswith(('http://', 'https://')):
            url = f'http://{url}'
        parsed = urlparse(url)
        hostname = parsed.hostname or ''
        path = parsed.path or ''
    except Exception:
        return [{'feature': 'invalid_url', 'value': True, 'risk_impact': 'positive', 'description': 'URL format is invalid'}]

    features.append({
        'feature': 'url_length',
        'value': len(url),
        'risk_impact': 'positive' if len(url) > 75 else 'neutral' if len(url) > 50 else 'negative',
        'description': 'Unusually long URL' if len(url) > 75 else 'Moderate URL length' if len(url) > 50 else 'Normal URL length'
    })

    is_https = url.startswith('https://')
    features.append({
        'feature': 'uses_https',
        'value': is_https,
        'risk_impact': 'negative' if is_https else 'positive',
        'description': 'Uses secure HTTPS protocol' if is_https else 'Missing HTTPS encryption'
    })

    ip_pattern = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
    uses_ip = bool(ip_pattern.match(hostname))
    features.append({
        'feature': 'uses_ip_address',
        'value': uses_ip,
        'risk_impact': 'positive' if uses_ip else 'negative',
        'description': 'Uses IP address instead of domain (suspicious)' if uses_ip else 'Uses domain name'
    })

    found_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in url.lower()]
    features.append({
        'feature': 'suspicious_keywords',
        'value': len(found_keywords),
        'risk_impact': 'positive' if len(found_keywords) > 2 else 'neutral' if len(found_keywords) > 0 else 'negative',
        'description': f"Contains suspicious keywords: {', '.join(found_keywords[:3])}" if found_keywords else 'No suspicious keywords detected'
    })

    has_suspicious_tld = any(hostname.endswith(tld) for tld in SUSPICIOUS_TLDS)
    features.append({
        'feature': 'suspicious_tld',
        'value': has_suspicious_tld,
        'risk_impact': 'positive' if has_suspicious_tld else 'negative',
        'description': 'Uses suspicious top-level domain' if has_suspicious_tld else 'Uses common top-level domain'
    })

    subdomain_count = len(hostname.split('.')) - 2 if hostname else 0
    features.append({
        'feature': 'subdomain_count',
        'value': subdomain_count,
        'risk_impact': 'positive' if subdomain_count > 2 else 'neutral' if subdomain_count > 1 else 'negative',
        'description': 'Excessive subdomains (potential spoofing)' if subdomain_count > 2 else 'Multiple subdomains' if subdomain_count > 1 else 'Normal subdomain structure'
    })

    special_chars = len(re.findall(r'[@!#$%^&*()_+=\[\]{}|\\:;"\'<>,?]', url))
    features.append({
        'feature': 'special_characters',
        'value': special_chars,
        'risk_impact': 'positive' if special_chars > 5 else 'neutral' if special_chars > 2 else 'negative',
        'description': 'Many special characters (obfuscation attempt)' if special_chars > 5 else 'Some special characters' if special_chars > 2 else 'Minimal special characters'
    })

    has_at = '@' in url
    features.append({
        'feature': 'contains_at_symbol',
        'value': has_at,
        'risk_impact': 'positive' if has_at else 'negative',
        'description': 'Contains @ symbol (URL spoofing technique)' if has_at else 'No @ symbol'
    })

    shortener_pattern = re.compile(r'bit\.ly|goo\.gl|tinyurl|t\.co|ow\.ly|is\.gd|buff\.ly|adf\.ly|j\.mp', re.IGNORECASE)
    is_shortened = bool(shortener_pattern.search(hostname))
    features.append({
        'feature': 'url_shortener',
        'value': is_shortened,
        'risk_impact': 'neutral' if is_shortened else 'negative',
        'description': 'Uses URL shortening service (hides destination)' if is_shortened else 'Direct URL'
    })

    is_legitimate = any(hostname == d or hostname.endswith(f'.{d}') for d in LEGITIMATE_DOMAINS)
    features.append({
        'feature': 'known_legitimate',
        'value': is_legitimate,
        'risk_impact': 'negative' if is_legitimate else 'neutral',
        'description': 'Recognized legitimate domain' if is_legitimate else 'Unknown domain reputation'
    })

    double_ext_pattern = re.compile(r'\.(exe|zip|rar|js|vbs|bat|cmd|scr|pif)\.', re.IGNORECASE)
    has_double_ext = bool(double_ext_pattern.search(path))
    features.append({
        'feature': 'double_extension',
        'value': has_double_ext,
        'risk_impact': 'positive' if has_double_ext else 'negative',
        'description': 'Suspicious double file extension' if has_double_ext else 'Normal file extension'
    })

    dash_count = hostname.count('-')
    features.append({
        'feature': 'excessive_dashes',
        'value': dash_count,
        'risk_impact': 'positive' if dash_count > 3 else 'neutral' if dash_count > 1 else 'negative',
        'description': 'Excessive dashes in domain (typosquatting indicator)' if dash_count > 3 else 'Some dashes in domain' if dash_count > 1 else 'Normal domain format'
    })

    return features


def calculate_risk_score(features: list[dict]) -> float:
    weights = {
        'invalid_url': 0.95,
        'uses_ip_address': 0.25,
        'uses_https': -0.15,
        'suspicious_keywords': 0.08,
        'suspicious_tld': 0.20,
        'subdomain_count': 0.05,
        'special_characters': 0.03,
        'contains_at_symbol': 0.20,
        'url_shortener': 0.10,
        'known_legitimate': -0.30,
        'double_extension': 0.25,
        'excessive_dashes': 0.05,
        'url_length': 0.02
    }

    score = 0.3

    for feature in features:
        weight = weights.get(feature['feature'], 0)
        value = feature['value']
        
        if isinstance(value, bool):
            score += weight if value else 0
        elif isinstance(value, (int, float)):
            score += min(value * weight, weight * 5)

    return max(0, min(1, score))


def generate_explanation(features: list[dict], risk_score: float) -> str:
    high_risk_features = [f for f in features if f['risk_impact'] == 'positive']
    safe_features = [f for f in features if f['risk_impact'] == 'negative']

    if risk_score >= 0.7:
        reasons = ', '.join([f['description'].lower() for f in high_risk_features[:3]])
        return f"This QR code URL is likely malicious. Key indicators: {reasons}. Exercise extreme caution."
    elif risk_score >= 0.4:
        concerns = ', '.join([f['description'].lower() for f in high_risk_features[:2]])
        return f"This QR code URL shows suspicious characteristics: {concerns}. Verify the source before proceeding."
    else:
        positives = ', '.join([f['description'].lower() for f in safe_features[:2]])
        return f"This QR code URL appears relatively safe. Positive indicators: {positives}."


def scan_qr_url(url: str) -> dict:
    features = extract_features(url)
    risk_score = calculate_risk_score(features)
    is_malicious = risk_score >= 0.6
    risk_level = 'High' if risk_score >= 0.7 else 'Medium' if risk_score >= 0.4 else 'Low'
    explanation = generate_explanation(features, risk_score)

    return {
        'url': url,
        'is_malicious': is_malicious,
        'risk_score': round(risk_score, 2),
        'risk_level': risk_level,
        'explanation': explanation,
        'features': [f for f in features if f['risk_impact'] != 'neutral' or f['value']]
    }


def process_qr_image(image_bytes: bytes) -> dict:
    extracted_data = extract_qr_data(image_bytes)
    
    if not extracted_data:
        return {
            'success': False,
            'error': 'No QR code detected in the image or unable to decode',
            'qr_data': None,
            'is_url': False,
            'scan_result': None
        }

    url_pattern = re.compile(r'^https?://|^www\.', re.IGNORECASE)
    is_url = bool(url_pattern.match(extracted_data))

    if is_url:
        scan_result = scan_qr_url(extracted_data)
        return {
            'success': True,
            'qr_data': extracted_data,
            'is_url': True,
            'scan_result': scan_result
        }
    else:
        return {
            'success': True,
            'qr_data': extracted_data,
            'is_url': False,
            'scan_result': {
                'url': extracted_data,
                'is_malicious': False,
                'risk_score': 0.0,
                'risk_level': 'Low',
                'explanation': 'QR code contains non-URL data. No URL-based risk assessment applicable.',
                'features': []
            }
        }
