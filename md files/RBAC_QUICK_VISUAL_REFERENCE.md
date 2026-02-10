# RBAC IMPLEMENTATION - VISUAL QUICK REFERENCE

## 🎯 At a Glance

```
ARGUS Security System - Role-Based Access Control (RBAC) v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5 ROLES × 11 PERMISSIONS = Secure, Scalable Access Control
```

---

## 📊 Role Overview Grid

```
┏━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┓
┃ ROLE           ┃ PERMISSIONS ┃ PRIMARY USE    ┃ KEY FEATURE   ┃ PRINCIPLE  ┃
┡━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━╇━━━━━━━━━━━━┩
│ 🔴 ADMIN       │ 11/11 ✅    │ System Control │ All Features  │ Full Access│
├────────────────┼─────────────┼────────────────┼───────────────┼────────────┤
│ 🟦 ANALYST     │ 6/11 ✅     │ Investigation  │ URL Scanning  │ Specialized│
├────────────────┼─────────────┼────────────────┼───────────────┼────────────┤
│ 🟩 MANAGER     │ 5/11 ✅     │ Department Mgmt│ Dept Visibility│ Scoped     │
├────────────────┼─────────────┼────────────────┼───────────────┼────────────┤
│ 🟨 EMPLOYEE    │ 2/11 ✅     │ User Awareness │ Acknowledge   │ Minimal    │
├────────────────┼─────────────┼────────────────┼───────────────┼────────────┤
│ 🟪 AUDITOR     │ 4/11 ✅     │ Compliance     │ Audit Logs    │ Read-Only  │
└────────────────┴─────────────┴────────────────┴───────────────┴────────────┘
```

---

## 🔐 Security Matrix

```
                        ADMIN  ANALYST MANAGER EMPLOYEE AUDITOR
                        ═════  ═══════ ═══════ ════════ ═══════

NOTIFICATIONS
├─ View All           │  ✅    ✅      ❌       ❌       ✅
├─ View Department    │  ✅    ❌      ✅       ❌       ✅
└─ View Personal      │  ✅    ❌      ❌       ✅       ❌

INVESTIGATION
├─ Fraud Feed         │  ✅    ✅      ✅       ❌       ❌
├─ Acknowledge        │  ✅    ✅      ✅       ✅       ❌
└─ Scan Links/QR      │  ✅    ✅      ❌       ❌       ❌

ANALYTICS
├─ View Analytics     │  ✅    ✅      ✅       ❌       ✅
└─ Export Reports     │  ✅    ✅      ✅       ❌       ❌

COMPLIANCE
├─ View Audit Logs    │  ✅    ❌      ❌       ❌       ✅
└─ Retrain Model      │  ✅    ❌      ❌       ❌       ❌

SYSTEM
└─ Manage Roles       │  ✅    ❌      ❌       ❌       ❌
```

---

## 🎨 Permission Breakdown by Role

### 🔴 ADMINISTRATOR
```
┌──────────────────────────────────────────────┐
│ FULL SYSTEM ACCESS - ALL 11 PERMISSIONS     │
├──────────────────────────────────────────────┤
│ ✅ view_all_notifications                   │
│ ✅ view_department_notifications            │
│ ✅ view_personal_notifications              │
│ ✅ view_fraud_feed                          │
│ ✅ acknowledge_alerts                       │
│ ✅ access_scanners                          │
│ ✅ view_analytics                           │
│ ✅ export_reports                           │
│ ✅ view_audit_logs                          │
│ ✅ retrain_model                            │
│ ✅ manage_roles_permissions                 │
└──────────────────────────────────────────────┘
```

### 🟦 FRAUD ANALYST
```
┌──────────────────────────────────────────────┐
│ INVESTIGATION & ANALYSIS - 6 PERMISSIONS    │
├──────────────────────────────────────────────┤
│ ✅ view_all_notifications                   │
│ ✅ view_fraud_feed           ⭐ PRIMARY     │
│ ✅ acknowledge_alerts                       │
│ ✅ access_scanners           ⭐ PRIMARY     │
│ ✅ view_analytics                           │
│ ✅ export_reports                           │
│                                             │
│ ❌ manage_roles_permissions                 │
│ ❌ retrain_model (separation)               │
│ ❌ view_audit_logs (compliance)             │
│ ❌ view_department_notifications            │
│ ❌ view_personal_notifications              │
└──────────────────────────────────────────────┘
```

### 🟩 DEPARTMENT HEAD
```
┌──────────────────────────────────────────────┐
│ DEPARTMENT MANAGEMENT - 5 PERMISSIONS       │
├──────────────────────────────────────────────┤
│ ✅ view_department_notifications ⭐ ONLY   │
│ ✅ view_fraud_feed                          │
│ ✅ acknowledge_alerts                       │
│ ✅ view_analytics                           │
│ ✅ export_reports                           │
│                                             │
│ ❌ access_scanners (investigation only)     │
│ ❌ manage_roles_permissions (admin only)    │
│ ❌ view_all_notifications (scoped)          │
│ ❌ retrain_model (admin only)               │
│ ❌ view_audit_logs (compliance only)        │
│ ❌ view_personal_notifications              │
└──────────────────────────────────────────────┘
```

### 🟨 EMPLOYEE
```
┌──────────────────────────────────────────────┐
│ USER AWARENESS - 2 PERMISSIONS              │
│ (MAXIMUM PRIVACY - LEAST PRIVILEGE)         │
├──────────────────────────────────────────────┤
│ ✅ view_personal_notifications  ⭐ ONLY    │
│ ✅ acknowledge_alerts                       │
│                                             │
│ ❌ Everything else (protect privacy)        │
│   Cannot see other employees' data          │
│   Cannot access analytics (sensitive)       │
│   Cannot export data                        │
└──────────────────────────────────────────────┘
```

### 🟪 AUDITOR (READ-ONLY)
```
┌──────────────────────────────────────────────┐
│ COMPLIANCE MONITORING - 4 PERMISSIONS       │
│ (READ-ONLY - NO ACTION AUTHORITY)           │
├──────────────────────────────────────────────┤
│ ✅ view_all_notifications                   │
│ ✅ view_department_notifications            │
│ ✅ view_analytics                           │
│ ✅ view_audit_logs          ⭐ PRIMARY     │
│                                             │
│ ❌ acknowledge_alerts (read-only)           │
│ ❌ export_reports (compliance only)         │
│ ❌ manage_roles_permissions (admin only)    │
│ ❌ retrain_model (admin only)               │
│ ❌ access_scanners (investigation only)     │
│ ❌ view_fraud_feed (read-only)              │
└──────────────────────────────────────────────┘
```

---

## 🛡️ Security Principles Implemented

### 1️⃣ SEPARATION OF DUTIES
```
Who Can Do What:
┌──────────────────────────────────────────┐
│ ADMINS       → Manage system             │
│ ANALYSTS     → Investigate threats       │
│ MANAGERS     → Oversee departments       │
│ EMPLOYEES    → Acknowledge alerts        │
│ AUDITORS     → Monitor compliance        │
│                                          │
│ ❌ NO OVERLAP IN CRITICAL FUNCTIONS     │
└──────────────────────────────────────────┘
```

### 2️⃣ LEAST PRIVILEGE
```
Access Escalation:
┌──────────────────────────────────────────┐
│ EMPLOYEE       → 2 permissions (baseline)│
│ MANAGER        → 5 permissions           │
│ ANALYST        → 6 permissions           │
│ AUDITOR        → 4 permissions (RO)      │
│ ADMIN          → 11 permissions (all)    │
│                                          │
│ Each role has ONLY what's needed ✅     │
└──────────────────────────────────────────┘
```

### 3️⃣ READ-ONLY COMPLIANCE
```
Auditor Protection:
┌──────────────────────────────────────────┐
│ ✅ Can VIEW all system activities        │
│ ❌ Cannot MODIFY anything                │
│ ❌ Cannot EXPORT data                    │
│ ❌ Cannot CHANGE permissions             │
│                                          │
│ Maintains audit trail integrity ✅      │
└──────────────────────────────────────────┘
```

### 4️⃣ DATA PRIVACY
```
Visibility Boundaries:
┌──────────────────────────────────────────┐
│ EMPLOYEE     → See only personal data   │
│ MANAGER      → See only department data │
│ ANALYST      → See all data             │
│ AUDITOR      → See all data (RO)        │
│ ADMIN        → See and manage all       │
│                                          │
│ Cross-data access restricted ✅        │
└──────────────────────────────────────────┘
```

---

## 📁 Implementation Files

```
src/lib/
├─ types.ts                        ← Role & Permission definitions
├─ permissions.ts                  ← Permission checking utilities
├─ dashboardConfig.ts    ⭐ NEW    ← Dashboard features by role
└─ models/
   └─ RolePermission.ts            ← Default permissions config

Documentation/
├─ RBAC_COMPLETE_GUIDE.md          ← Comprehensive guide
├─ RBAC_IMPLEMENTATION_SUMMARY.md   ← Quick overview
├─ RBAC_CODE_EXAMPLES.md           ← Implementation patterns
├─ DASHBOARD_TABS_REFERENCE.md     ← Visual reference
└─ RBAC_QUICK_VISUAL_REFERENCE.md  ← This file
```

---

## 💻 Usage Examples

### Check Permission in Backend
```typescript
import { canAccessScanners } from '@/lib/permissions';

if (!canAccessScanners(user)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Show Feature in Frontend
```typescript
import { canAccessScanners } from '@/lib/permissions';

{canAccessScanners(user) && <ScannerTools />}
```

### Get Role Dashboard
```typescript
import { ROLE_DASHBOARDS } from '@/lib/dashboardConfig';

const dashboard = ROLE_DASHBOARDS[user.role];
// Shows all features available to that role
```

---

## 🚀 Quick Start Integration

### Step 1: Check Backend Endpoints
```bash
grep -r "canUserPerform\|hasPermission" src/app/api/
# Add permission checks to all sensitive endpoints
```

### Step 2: Protect Frontend Components
```bash
grep -r "PermissionGuard\|canAccessScanners" src/components/
# Hide features user can't access
```

### Step 3: Enable Audit Logging
```bash
# Ensure all permission checks are logged
grep -r "logPermissionCheck\|logAuditEvent" src/lib/
```

### Step 4: Test All Roles
```bash
npm test -- permissions.test.ts
# Verify each role's access matrix
```

---

## ✅ Verification Checklist

- [x] ADMIN has all 11 permissions
- [x] FRAUD ANALYST has 6 permissions (no management/audit)
- [x] DEPARTMENT HEAD has 5 permissions (dept-scoped)
- [x] EMPLOYEE has 2 permissions (personal only)
- [x] AUDITOR has 4 permissions (read-only)
- [x] Separation of duties enforced
- [x] Least privilege implemented
- [x] Data privacy protected
- [x] Audit trail intact

---

## 📞 Support & Questions

**For Implementation Help:**
→ See [RBAC_CODE_EXAMPLES.md](RBAC_CODE_EXAMPLES.md)

**For Full Details:**
→ See [RBAC_COMPLETE_GUIDE.md](RBAC_COMPLETE_GUIDE.md)

**For Dashboard Layout:**
→ See [DASHBOARD_TABS_REFERENCE.md](DASHBOARD_TABS_REFERENCE.md)

**For Overview:**
→ See [RBAC_IMPLEMENTATION_SUMMARY.md](RBAC_IMPLEMENTATION_SUMMARY.md)

---

## 🎓 Key Takeaways

1. **5 Distinct Roles** - Each with clear purpose and scope
2. **11 Granular Permissions** - Control access at feature level
3. **Separation of Duties** - No conflicting responsibilities
4. **Least Privilege** - Everyone gets minimum needed access
5. **Audit-Ready** - Full compliance tracking capability

---

**Status:** ✅ COMPLETE AND VERIFIED  
**Last Updated:** January 28, 2026  
**Version:** 1.0
