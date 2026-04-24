# Dataset Migration Guide: Old → New Schema

## NEW DATASET SCHEMA (argus_notifications_10000.csv)

```csv
notification_id,org_id,department,channel,sender,receiver,sender_domain,content,contains_url,url,attachment_type,priority,threat_category,risk_score,timestamp,country,device_type,is_malicious,review_status,analyst_feedback
```

### Field Definitions:
- `notification_id`: Unique identifier (N#### format)
- `org_id`: Organization identifier (ORG### format)
- `department`: Department name (Admin, IT, Legal, Marketing, etc.)
- `channel`: Communication channel (Teams, Email, Slack, ERP, HR Portal)
- `sender`: Sender email address
- `receiver`: Receiver email address
- `sender_domain`: Sender domain name
- `content`: Message content
- `contains_url`: Boolean flag (0/1) for URL presence
- `url`: Actual URL if present
- `attachment_type`: Type of attachment (none, docx, pdf, etc.)
- `priority`: Message priority (low, medium, high, critical)
- `threat_category`: Threat classification (Safe, Low Risk Suspicious, BEC, Ransomware, etc.)
- `risk_score`: Numerical risk score (0.0-1.0)
- `timestamp`: ISO timestamp
- `country`: Geographic location
- `device_type`: Device type (Desktop, Laptop, Mobile, Tablet)
- `is_malicious`: Boolean flag (0/1) for malicious content
- `review_status`: Review status (Approved, Pending, Rejected)
- `analyst_feedback`: Analyst comments/feedback

## OLD → NEW FIELD MAPPING

| OLD FIELD | NEW FIELD | NOTES |
|-----------|-----------|-------|
| `id` | `notification_id` | Format change to N#### |
| `orgId` | `org_id` | Snake case conversion |
| `departmentId` | `department` | Direct mapping |
| `source_app` | `channel` | Rename for clarity |
| `sender` | `sender` | Same |
| `receiver` | `receiver` | Same |
| `sender_domain` | `sender_domain` | Same |
| `content`/`message` | `content` | Consolidate message fields |
| `has_url` | `contains_url` | Boolean flag |
| `url` | `url` | Same |
| `attachment` | `attachment_type` | Rename |
| `priority` | `priority` | Same |
| `threat_category`/`type` | `threat_category` | Consolidate threat fields |
| `risk_score` | `risk_score` | Same |
| `timestamp` | `timestamp` | Same |
| `country` | `country` | New field |
| `device_type` | `device_type` | New field |
| `is_flagged` | `is_malicious` | Rename for clarity |
| `review_status` | `review_status` | Same |
| `analyst_feedback` | `analyst_feedback` | Same |

## THREAT CATEGORY MAPPINGS

| OLD CATEGORY | NEW CATEGORY | RISK_SCORE_RANGE |
|--------------|--------------|------------------|
| `Safe` | `Safe` | 0.0-0.3 |
| `Low` | `Low Risk Suspicious` | 0.3-0.5 |
| `Medium` | `Suspicious` | 0.5-0.7 |
| `High` | `High Risk Suspicious` | 0.7-0.8 |
| `Critical` | `BEC`/`Ransomware`/`Phishing` | 0.8-1.0 |

## PRIORITY MAPPINGS

| OLD PRIORITY | NEW PRIORITY | SEVERITY_LEVEL |
|--------------|--------------|----------------|
| `low` | `low` | Informational |
| `medium` | `medium` | Warning |
| `high` | `high` | Alert |
| `critical` | `critical` | Critical |

## DEPARTMENT MAPPINGS

| OLD DEPARTMENT | NEW DEPARTMENT |
|----------------|----------------|
| `Finance` | `Finance` |
| `IT` | `IT` |
| `HR` | `HR` |
| `Executive` | `Admin` |
| `Sales` | `Sales` |
| `Marketing` | `Marketing` |
| `Legal` | `Legal` |
| `Operations` | `Operations` |
| `Procurement` | `Procurement` |
| `Security` | `Security` |

## CHANNEL MAPPINGS

| OLD SOURCE_APP | NEW CHANNEL |
|----------------|-------------|
| `Email` | `Email` |
| `Slack` | `Slack` |
| `Microsoft Teams` | `Teams` |
| `HR Portal` | `HR Portal` |
| `Finance System` | `ERP` |
| `Internal Mobile App` | `Mobile` |

## CRITICAL CHANGES REQUIRED

1. **Field Name Updates**: Update all references from camelCase to snake_case where applicable
2. **New Fields**: Add support for `country`, `device_type` 
3. **Category Consolidation**: Merge old threat categories into new standardized categories
4. **Risk Score Alignment**: Ensure all calculations use 0.0-1.0 scale
5. **Boolean Flags**: Convert `has_url` to `contains_url`, `is_flagged` to `is_malicious`
6. **Department Normalization**: Standardize department names across all components
7. **Channel Renaming**: Update `source_app` references to `channel`

## FRAUD ANALYST REVIEW IMPACT

The review module needs updates for:
- New `review_status` values (Approved, Pending, Rejected)
- `analyst_feedback` field support
- `threat_category` filtering with new values
- `priority` based sorting
- `is_malicious` flag handling

## VALIDATION RULES

- `notification_id`: Required, format N####
- `org_id`: Required, format ORG###
- `risk_score`: Required, 0.0-1.0 range
- `contains_url`: Boolean (0/1)
- `is_malicious`: Boolean (0/1)
- `timestamp`: Valid ISO format
- `review_status`: One of [Approved, Pending, Rejected]
