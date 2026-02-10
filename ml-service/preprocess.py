import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import re
from urllib.parse import urlparse

class DataPreprocessor:
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        self.department_encoder = LabelEncoder()
        self.sender_domain_encoder = LabelEncoder()
        self.is_fitted = False
        
    def extract_sender_domain(self, sender):
        try:
            return sender.split('@')[1] if '@' in sender else 'unknown'
        except:
            return 'unknown'
    
    def extract_url_features(self, url_or_text):
        """Extract security features from URLs found in text"""
        if pd.isna(url_or_text):
            url_or_text = ''
        
        features = {
            'has_urls': 0,
            'url_count': 0,
            'has_suspicious_urls': 0,
            'has_http_url': 0,
            'has_https_url': 0,
            'url_entropy_avg': 0,
            'has_shortener_url': 0,
            'has_ip_url': 0,
            'url_special_chars_ratio': 0,
        }
        
        # Find URLs in text
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, str(url_or_text), re.IGNORECASE)
        
        if urls:
            features['has_urls'] = 1
            features['url_count'] = min(len(urls), 5)  # Cap at 5
            
            shorteners = ['bit.ly', 'tinyurl', 't.co', 'goo.gl', 'ow.ly', 'is.gd']
            tunneling = ['serveo.net', 'ngrok.io', 'ngrok.com', 'trycloudflare.com', 'localtunnel.me']
            
            for url in urls:
                url_lower = url.lower()
                
                # Check for dangerous patterns
                if any(s in url_lower for s in shorteners):
                    features['has_shortener_url'] = 1
                    features['has_suspicious_urls'] = 1
                
                if any(t in url_lower for t in tunneling):
                    features['has_suspicious_urls'] = 1
                
                # Check for IP-based URLs
                if re.match(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
                    features['has_ip_url'] = 1
                    features['has_suspicious_urls'] = 1
                
                if url.startswith('http://'):
                    features['has_http_url'] = 1
                elif url.startswith('https://'):
                    features['has_https_url'] = 1
                
                # Calculate entropy for URL hostname
                try:
                    parsed = urlparse(url)
                    hostname = parsed.hostname or ''
                    if hostname:
                        entropy = self.calculate_entropy(hostname)
                        features['url_entropy_avg'] = max(features['url_entropy_avg'], entropy)
                except:
                    pass
        
        return features
    
    def calculate_entropy(self, text):
        """Calculate Shannon entropy of a string"""
        if not text:
            return 0
        text_lower = text.lower()
        freq = {}
        for char in text_lower:
            freq[char] = freq.get(char, 0) + 1
        entropy = 0
        for count in freq.values():
            p = count / len(text_lower)
            entropy -= p * np.log2(p)
        return entropy
    
    def extract_features(self, df, fit=False):
        df = df.copy()
        
        df['sender_domain'] = df['sender'].apply(self.extract_sender_domain)
        
        df['content_length'] = df['content'].str.len()
        df['word_count'] = df['content'].str.split().str.len()
        df['has_urgent'] = df['content'].str.lower().str.contains('urgent|immediately|now|asap|emergency', regex=True).astype(int)
        df['has_money_keywords'] = df['content'].str.lower().str.contains('transfer|wire|payment|account|money|\$|dollar', regex=True).astype(int)
        df['has_action_keywords'] = df['content'].str.lower().str.contains('click|verify|confirm|update|send|act', regex=True).astype(int)
        df['has_threat_keywords'] = df['content'].str.lower().str.contains('penalty|legal|compromised|expired|ransom|leaked', regex=True).astype(int)
        df['is_external_sender'] = (~df['sender'].str.contains('company.com', na=False)).astype(int)
        df['exclamation_count'] = df['content'].str.count('!')
        df['uppercase_ratio'] = df['content'].apply(lambda x: sum(1 for c in x if c.isupper()) / len(x) if len(x) > 0 else 0)
        
        # Extract URL features (NEW)
        url_features_df = df['content'].apply(lambda x: pd.Series(self.extract_url_features(x)))
        df = pd.concat([df, url_features_df], axis=1)
        
        if fit:
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(df['content'].fillna(''))
            
            all_departments = list(df['department'].unique()) + ['Unknown']
            self.department_encoder.fit(all_departments)
            
            all_domains = list(df['sender_domain'].unique()) + ['unknown_domain']
            self.sender_domain_encoder.fit(all_domains)
            
            self.is_fitted = True
        else:
            tfidf_matrix = self.tfidf_vectorizer.transform(df['content'].fillna(''))
        
        tfidf_df = pd.DataFrame(
            tfidf_matrix.toarray(),
            columns=[f'tfidf_{i}' for i in range(tfidf_matrix.shape[1])],
            index=df.index
        )
        
        df['department_encoded'] = df['department'].apply(
            lambda x: self.department_encoder.transform([x])[0] if x in self.department_encoder.classes_ else -1
        )
        df['sender_domain_encoded'] = df['sender_domain'].apply(
            lambda x: self.sender_domain_encoder.transform([x])[0] if x in self.sender_domain_encoder.classes_ else -1
        )
        
        feature_columns = [
            'content_length', 'word_count', 'has_urgent', 'has_money_keywords',
            'has_action_keywords', 'has_threat_keywords', 'is_external_sender',
            'exclamation_count', 'uppercase_ratio', 'department_encoded', 'sender_domain_encoded',
            'has_urls', 'url_count', 'has_suspicious_urls', 'has_http_url', 'has_https_url',
            'url_entropy_avg', 'has_shortener_url', 'has_ip_url', 'url_special_chars_ratio'
        ]
        
        features_df = pd.concat([df[feature_columns].reset_index(drop=True), tfidf_df.reset_index(drop=True)], axis=1)
        
        return features_df
    
    def get_feature_names(self):
        base_features = [
            'content_length', 'word_count', 'has_urgent', 'has_money_keywords',
            'has_action_keywords', 'has_threat_keywords', 'is_external_sender',
            'exclamation_count', 'uppercase_ratio', 'department_encoded', 'sender_domain_encoded',
            'has_urls', 'url_count', 'has_suspicious_urls', 'has_http_url', 'has_https_url',
            'url_entropy_avg', 'has_shortener_url', 'has_ip_url', 'url_special_chars_ratio'
        ]
        tfidf_features = [f'tfidf_{i}' for i in range(100)]
        return base_features + tfidf_features
    
    def save(self, path='models'):
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.tfidf_vectorizer, f'{path}/tfidf_vectorizer.pkl')
        joblib.dump(self.department_encoder, f'{path}/department_encoder.pkl')
        joblib.dump(self.sender_domain_encoder, f'{path}/sender_domain_encoder.pkl')
        
    def load(self, path='models'):
        self.tfidf_vectorizer = joblib.load(f'{path}/tfidf_vectorizer.pkl')
        self.department_encoder = joblib.load(f'{path}/department_encoder.pkl')
        self.sender_domain_encoder = joblib.load(f'{path}/sender_domain_encoder.pkl')
        self.is_fitted = True
