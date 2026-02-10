# ROLE-BASED ACCESS CONTROL (RBAC) GUIDE
## ARGUS Security System - Role Definitions & Permissions

---

## 📋 OVERVIEW

This document defines the complete RBAC model for ARGUS, ensuring proper separation of duties, least-privilege access, and organizational security compliance.

**Key Principles:**
- ✅ **Separation of Duties**: Security roles are isolated (analysts don't manage permissions, auditors are read-only)
- ✅ **Least Privilege**: Each role gets only the permissions needed for their function
- ✅ **Clear Boundaries**: Each role has distinct responsibilities and restrictions

---

## 🔴 1. ADMINISTRATOR

**Purpose:** Full system control and role management  
**User Type:** Senior IT/Security Manager, System Administrator

### ✅ PERMISSIONS GRANTED

| Permission | Feature | Purpose |
|-----------|---------|---------|
| `view_all_notifications` | View All Notifications | See all organization-wide alerts |
| `view_department_notifications` | View Department Notifications | Monitor specific departments |
| `view_personal_notifications` | View Personal Notifications | See personal alerts |
| `view_fraud_feed` | View Fraud Feed | Access all fraud investigations |
| `acknowledge_alerts` | Acknowledge Alerts | Mark alerts as reviewed |
| `access_scanners` | Access Scanners | Scan links and QR codes |
| `view_analytics` | View Analytics | View all fraud trends and patterns |
| `export_reports` | Export Reports | Generate any reports |
| `view_audit_logs` | View Audit Logs | Access system audit trail |
| `retrain_model` | Retrain Model | Update ML detection model |
| `manage_roles_permissions` | Manage Roles & Permissions | **Create/edit/delete roles** |

### ❌ RESTRICTIONS

- None (full system access)

### 💼 DASHBOARD TABS

1. **Notifications & Alerts**
   - View all organization notifications
   - View department-specific notifications
   - View personal notifications

2. **Fraud Investigation**
   - Full fraud feed access
   - Acknowledge all alerts
   - Scan links and QR codes

3. **Analytics & Reporting**
   - View all fraud trends
   - Export all reports
   - Analyze patterns across departments

4. **Compliance & Audit**
   - View system audit logs
   - Track user actions
   - Compliance monitoring

5. **System Administration** ⚙️
   - Manage user roles
   - Edit permissions
   - Retrain ML model
   - System configuration

---

## 🟦 2. FRAUD ANALYST

**Purpose:** Investigate fraud alerts and scan suspicious links/QR codes  
**User Type:** Fraud Investigator, Security Analyst, Threat Detection Specialist

### ✅ PERMISSIONS GRANTED

| Permission | Feature | Purpose |
|-----------|---------|---------|
| `view_all_notifications` | View All Notifications | See all fraud alerts |
| `view_fraud_feed` | View Fraud Feed | **Primary tool for investigation** |
| `acknowledge_alerts` | Acknowledge Alerts | Mark alerts as investigated |
| `access_scanners` | Access Scanners | **Scan links/QR codes for threats** |
| `view_analytics` | View Analytics | Analyze fraud patterns & trends |
| `export_reports` | Export Reports | Generate investigation reports |

### ❌ RESTRICTIONS (Separation of Duties)

| Denied Permission | Feature | Why Restricted |
|------------------|---------|-----------------|
| `manage_roles_permissions` | Manage Roles | Admins only - prevent privilege escalation |
| `retrain_model` | Retrain Model | Admin/ML team only - prevent model tampering |
| `view_audit_logs` | View Audit Logs | Compliance/auditor only - prevent tampering evidence |
| `view_department_notifications` | Department Notifications | Sees all instead - no dept filtering needed |

### 💼 DASHBOARD TABS

1. **Notifications & Alerts**
   - View all organization-wide fraud alerts
   - Filter by severity, category, date

2. **Fraud Investigation** (Core Tools) 🔍
   - Access fraud feed
   - Acknowledge/close investigations
   - View investigation history
   - Add investigation notes

3. **Scanner Tools**
   - Scan suspicious links
   - Scan QR codes
   - View scan results history
   - Check domain reputation

4. **Analytics & Reporting**
   - View fraud trends by type/source
   - Track threat patterns
   - Export investigation reports
   - Create custom analysis reports

### 📊 USE CASES

```
✅ Can Do:
- Investigate phishing emails and links
- Scan URLs submitted by users
- Review fraud trends over time
- Export investigation findings

❌ Cannot Do:
- Add new analysts or change permissions
- Retrain detection model
- View audit logs of other users
- Modify alert thresholds
```

---

## 🟩 3. DEPARTMENT HEAD

**Purpose:** Monitor department-level risk and manage department security  
**User Type:** Department Manager, Team Lead, Director

### ✅ PERMISSIONS GRANTED

| Permission | Feature | Purpose |
|-----------|---------|---------|
| `view_department_notifications` | View Department Notifications | **See only your dept alerts** |
| `view_fraud_feed` | View Fraud Feed | Review fraud trends affecting dept |
| `view_analytics` | View Analytics | Monitor dept risk exposure |
| `export_reports` | Export Reports | Generate dept-specific reports |
| `acknowledge_alerts` | Acknowledge Alerts | Acknowledge dept alerts |

### ❌ RESTRICTIONS (Least Privilege)

| Denied Permission | Feature | Why Restricted |
|------------------|---------|-----------------|
| `view_all_notifications` | View All Notifications | Only sees their dept - no cross-dept access |
| `access_scanners` | Access Scanners | Investigation role only - not needed for management |
| `manage_roles_permissions` | Manage Roles | Admin only |
| `retrain_model` | Retrain Model | Admin/ML team only |
| `view_audit_logs` | View Audit Logs | Auditor only - compliance separation |

### 💼 DASHBOARD TABS

1. **Department Notifications**
   - View all department-specific alerts
   - Filter by severity and type
   - Acknowledge department alerts

2. **Fraud Analysis** (Department View)
   - View fraud trends in dept
   - Identify risk patterns
   - Track frequent threat types

3. **Analytics & Reporting**
   - Department risk metrics
   - Employee compliance scores
   - Export dept-specific reports

### 📊 USE CASES

```
✅ Can Do:
- See fraud alerts in their department
- Review security trends for their team
- Acknowledge department-level alerts
- Generate department reports
- Track employee security behavior

❌ Cannot Do:
- See alerts from other departments
- Scan URLs directly (escalate to analysts)
- Change system permissions
- Retrain ML models
- Access audit logs
- View individual user's private data
```

---

## 🟨 4. EMPLOYEE

**Purpose:** Receive security notifications and acknowledge warnings  
**User Type:** Any employee, End user

### ✅ PERMISSIONS GRANTED

| Permission | Feature | Purpose |
|-----------|---------|---------|
| `view_personal_notifications` | View Personal Notifications | **See only their own alerts** |
| `acknowledge_alerts` | Acknowledge Alerts | Confirm they've seen warnings |

### ❌ RESTRICTIONS (Least Privilege - Maximum Protection)

| Denied Permission | Feature | Why Restricted |
|------------------|---------|-----------------|
| `view_all_notifications` | View All Notifications | Security: no visibility into other users' data |
| `view_department_notifications` | Department Notifications | Security: no cross-employee data access |
| `view_fraud_feed` | View Fraud Feed | Analysis role only |
| `access_scanners` | Access Scanners | Investigation tool only |
| `view_analytics` | View Analytics | Sensitive data - not for end users |
| `export_reports` | Export Reports | Sensitive data - prevent unauthorized export |
| `manage_roles_permissions` | Manage Roles | Admin only |
| `retrain_model` | Retrain Model | Admin only |
| `view_audit_logs` | View Audit Logs | Compliance only |

### 💼 DASHBOARD TABS

1. **My Notifications**
   - View only personal security alerts
   - Shows date, severity, action needed

2. **Alert Response**
   - Acknowledge receipt of alerts
   - Mark as read
   - Take recommended action (e.g., password reset)

### 📊 USE CASES

```
✅ Can Do:
- Receive phishing warnings
- Acknowledge security alerts
- See if a link is safe
- Understand what action to take

❌ Cannot Do:
- See other employees' alerts (privacy)
- View fraud statistics (sensitive)
- Export data
- Change anything in system
- Access admin tools
- View audit logs
```

---

## 🟪 5. AUDITOR

**Purpose:** Monitor compliance and maintain audit trail (Read-only access)  
**User Type:** Compliance Officer, Internal Auditor, Audit Manager

### ✅ PERMISSIONS GRANTED

| Permission | Feature | Purpose |
|-----------|---------|---------|
| `view_all_notifications` | View All Notifications | Full visibility for audit trail |
| `view_department_notifications` | View Department Notifications | Track dept compliance |
| `view_analytics` | View Analytics | Monitor system metrics |
| `view_audit_logs` | View Audit Logs | **Access complete audit trail** |

### ❌ RESTRICTIONS (Read-Only Principle)

| Denied Permission | Feature | Why Restricted |
|------------------|---------|-----------------|
| `view_personal_notifications` | View Personal Notifications | See all, not filtered |
| `acknowledge_alerts` | Acknowledge Alerts | Cannot take actions - read-only |
| `view_fraud_feed` | View Fraud Feed | Investigation tool - read-only role |
| `access_scanners` | Access Scanners | Investigation tool - no direct scanning |
| `export_reports` | Export Reports | Cannot export - prevent data leakage |
| `manage_roles_permissions` | Manage Roles | Admin only - prevents audit manipulation |
| `retrain_model` | Retrain Model | Admin only - prevents model tampering |

### 💼 DASHBOARD TABS

1. **All Notifications** (Audit View)
   - Complete notification history
   - Filter by time range, severity
   - Export lists for compliance reports

2. **Compliance Monitoring**
   - Track department compliance
   - Monitor alert response times
   - Identify policy violations

3. **System Metrics**
   - View fraud detection rates
   - Monitor system uptime
   - Track alert volumes

4. **Audit Logs** 🔐
   - View all user actions
   - Track permission changes
   - Monitor alert acknowledgments
   - Review model retraining history
   - Access change logs

### 📊 USE CASES

```
✅ Can Do:
- Review all system activities (audit trail)
- Verify compliance with security policies
- Check who acknowledged which alerts
- Monitor department compliance
- Generate compliance reports
- Track security metric trends

❌ Cannot Do:
- Take action on alerts (read-only)
- Modify any settings (read-only)
- Export raw data (prevent leakage)
- Manage user roles (prevent bias)
- Change detection model (prevent tampering)
- Export detailed reports (compliance only)
```

---

## 🔐 SECURITY PRINCIPLES

### Separation of Duties
- **Fraud Analysts** investigate threats; **Admins** manage system
- **Auditors** monitor compliance; **Analysts** take action
- **Department Heads** see their dept; **Analysts** see all
- **Employees** see only their alerts; **Everyone else** sees more

### Least Privilege
- Each role has ONLY the permissions needed
- No extra access "just in case"
- Restrictive by default, permissive only when necessary

### Read-Only Principle
- **Auditors** cannot modify anything
- **Employees** cannot see cross-dept data
- **Department Heads** cannot scan or analyze deeply

### Audit Trail
- All user actions logged
- Changes tracked with timestamp and user ID
- Auditors can verify compliance

---

## 📊 PERMISSION MATRIX

| Feature | Admin | Analyst | Dept Head | Employee | Auditor |
|---------|-------|---------|-----------|----------|---------|
| View All Notifications | ✅ | ✅ | ❌ | ❌ | ✅ |
| View Department Notifications | ✅ | ❌ | ✅ | ❌ | ✅ |
| View Personal Notifications | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Fraud Feed | ✅ | ✅ | ✅ | ❌ | ❌ |
| Acknowledge Alerts | ✅ | ✅ | ✅ | ✅ | ❌ |
| Access Scanners | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ❌ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ✅ |
| Retrain Model | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Roles | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🚀 IMPLEMENTATION GUIDE

### 1. Database Initialization
Default permissions are automatically set when the system initializes:
```bash
npm run init-permissions  # Initialize default role permissions
```

### 2. Code Usage
Check permissions in your code:
```typescript
import { canAccessScanners, canViewAnalytics } from '@/lib/permissions';

if (canAccessScanners(user)) {
  // Show scanner tools
}
```

### 3. API Protection
Protect endpoints with permission checks:
```typescript
// In API route handler
if (!canUserPerform(user, 'view_fraud_feed')) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### 4. Frontend Visibility
Show/hide UI based on permissions:
```typescript
import { getRoleFeaturesById } from '@/lib/dashboardConfig';

const features = getRoleFeaturesById(user.role);
// Render only available features
```

---

## 📝 AUDIT LOG REQUIREMENTS

All sensitive actions should be logged:
- ✅ Permission changes
- ✅ Role assignments
- ✅ Alert acknowledgments
- ✅ Model retrainings
- ✅ Report exports
- ✅ Scanner results
- ✅ User login/logout

---

## ❓ FAQ

**Q: Can a Fraud Analyst see alerts from other departments?**  
A: Yes, they see ALL notifications to investigate cross-department fraud patterns.

**Q: Can a Department Head scan URLs?**  
A: No, they escalate suspicious links to Fraud Analysts.

**Q: Can an Employee see the fraud feed?**  
A: No, only their personal notifications.

**Q: Can an Auditor acknowledge alerts?**  
A: No, they're read-only to maintain audit integrity.

**Q: Can I create custom roles?**  
A: Yes, Admins can create custom roles using the Admin Panel.

---

## 🔄 ROLE ASSIGNMENT

**When assigning roles:**

1. **Admin** → IT Security Manager
   - Manages the system
   - Creates/edits roles
   - Oversees all operations

2. **Fraud Analyst** → Security Team Members
   - Multiple people can have this role
   - Primary investigators
   - Can scan URLs and QR codes

3. **Department Head** → Department Managers
   - One per department typically
   - See only their department
   - Don't perform detailed investigations

4. **Employee** → All other staff
   - Default role for end users
   - Least privileges
   - See only personal notifications

5. **Auditor** → Compliance/Internal Audit Team
   - Independent from operations
   - Read-only access
   - Track all activities

---

**Last Updated:** January 28, 2026  
**Version:** 1.0  
**Status:** Active ✅
