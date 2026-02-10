# RBAC Integration Checklist

**Status:** Ready for Implementation  
**Date:** January 28, 2026

---

## Backend Integration

### API Middleware Setup
- [ ] Import `requirePermission`, `requireAuth`, `requireAdmin` from `@/lib/api-middleware`
- [ ] Import `logApiAccess`, `logApiError` from `@/lib/api-middleware`
- [ ] Test middleware with sample endpoint

### Protected Endpoints Implementation

#### High Priority (Security Sensitive)
- [ ] **POST /api/retrain** - Require `retrain_model` (admin only)
  ```typescript
  export const POST = adminRoute(async (user, request) => {
    // Implementation
  });
  ```

- [ ] **GET /api/audit-logs** - Require `view_audit_logs`
  ```typescript
  const { success, response, user } = await requirePermission(
    request,
    'view_audit_logs'
  );
  ```

- [ ] **POST /api/admin/roles** - Require `manage_roles_permissions`
  ```typescript
  const { success, response, user } = await requireAdmin(request);
  ```

#### Medium Priority (Data Access)
- [ ] **GET /api/fraud-feed** - Require `view_fraud_feed`
- [ ] **POST /api/scan-link** - Require `access_scanners`
- [ ] **POST /api/scan-qr** - Require `access_scanners`
- [ ] **POST /api/acknowledge** - Require `acknowledge_alerts`
- [ ] **GET /api/analytics** - Require `view_analytics`
- [ ] **POST /api/reports/export** - Require `export_reports`

#### Low Priority (Informational)
- [ ] **GET /api/notifications** - Filter by role (no direct restriction)
- [ ] **GET /api/departments/[id]/alerts** - Filter by department access
- [ ] **GET /api/stats** - Filter based on visible data

### API Error Handling
- [ ] Add try-catch blocks to all endpoints
- [ ] Log errors using `logApiError()`
- [ ] Return proper HTTP status codes:
  - 401 for unauthorized
  - 403 for forbidden
  - 500 for server errors
- [ ] Sanitize error messages (don't leak sensitive info)

### API Logging
- [ ] Add `logApiAccess()` call after permission check passes
- [ ] Add `logApiError()` call in catch blocks
- [ ] Include relevant context (endpoint, method, permission)
- [ ] Test audit log entries are created

---

## Frontend Integration

### PermissionGuard Component Setup
- [ ] Component exists at `src/components/PermissionGuard.tsx`
- [ ] PermissionGuardNull exported ✅
- [ ] PermissionGuardWarning exported ✅
- [ ] PermissionGuardError exported ✅
- [ ] withPermissionGuard HOC exported ✅

### UI Feature Gating

#### Navigation
- [ ] Sidebar hides links based on permissions
  - [ ] /fraud-feed requires `view_fraud_feed`
  - [ ] /scanners requires `access_scanners`
  - [ ] /analytics requires `view_analytics`
  - [ ] /audit-logs requires `view_audit_logs`
  - [ ] /admin/* requires `manage_roles_permissions`

#### Buttons
- [ ] Scan button hidden without `access_scanners`
- [ ] Acknowledge button hidden without `acknowledge_alerts`
- [ ] Export button hidden without `export_reports`
- [ ] Admin buttons hidden without `manage_roles_permissions`

#### Sections/Panels
- [ ] Analytics section hidden without `view_analytics`
- [ ] Admin panel hidden without `manage_roles_permissions`
- [ ] Audit logs hidden without `view_audit_logs`
- [ ] Scanner tools hidden without `access_scanners`

#### Dashboard Tabs
- [ ] All Notifications tab hidden without `view_all_notifications`
- [ ] Department Notifications hidden without `view_department_notifications`
- [ ] Personal Notifications hidden without `view_personal_notifications`
- [ ] Fraud Feed tab hidden without `view_fraud_feed`
- [ ] Analytics tab hidden without `view_analytics`
- [ ] Audit Logs tab hidden without `view_audit_logs`

### Component Usage Examples
- [ ] Create `components/features/ScannerButton.tsx` using PermissionGuardNull
- [ ] Create `components/features/ExportButton.tsx` using PermissionGuardWarning
- [ ] Create `components/features/AdminPanel.tsx` using PermissionGuardError
- [ ] Create `components/layout/ProtectedSidebar.tsx` with permission checks
- [ ] Create `components/dashboards/RoleDashboard.tsx` with dynamic tabs

### Hooks Usage
- [ ] `usePermissions()` hook for checking multiple permissions
- [ ] `useRoleFeatures()` hook for getting role-specific features
- [ ] `useUser()` hook for getting current user info

---

## Audit Logging

### Audit Logger Setup
- [ ] `src/lib/audit-logger.ts` exists ✅
- [ ] `logAuditEvent()` function callable ✅
- [ ] `logPermissionCheck()` function callable ✅
- [ ] `logApiAccess()` function callable ✅
- [ ] `logApiError()` function callable ✅

### Event Types to Log
- [ ] Permission checks (allowed/denied)
- [ ] API access (endpoint, method, user, permission)
- [ ] API errors (with error message)
- [ ] Role assignments
- [ ] Permission changes
- [ ] Model retraining
- [ ] Sensitive operations (exports, admin actions)

### Audit Database
- [ ] Create `audit_logs` MongoDB collection
- [ ] Schema includes: timestamp, action, userId, userRole, details
- [ ] Indexes on: timestamp, userId, action, userRole
- [ ] Retention policy: 1+ years
- [ ] Read-only access for auditors

### Audit Log Viewing
- [ ] GET /api/audit-logs endpoint created
- [ ] Requires `view_audit_logs` permission
- [ ] Supports filtering (userId, action, date range)
- [ ] Supports pagination (limit, offset)
- [ ] Return results with full details

### Compliance Reporting
- [ ] Export audit logs as CSV
- [ ] Generate compliance report
- [ ] Track permission denials
- [ ] Track role changes
- [ ] Generate audit summary

---

## Testing

### Unit Tests
- [ ] Test `hasPermission()` for each role
- [ ] Test `canUserPerform()` with different roles
- [ ] Test permission filters
- [ ] Test audit log functions

### Integration Tests
- [ ] Test API endpoint with correct permission → success
- [ ] Test API endpoint with wrong permission → 403
- [ ] Test unauthenticated access → 401
- [ ] Test audit log creation on access
- [ ] Test audit log on denial
- [ ] Test data filtering by role

### E2E Tests
- [ ] Login as different roles
- [ ] Verify visible features match role
- [ ] Verify hidden features not accessible
- [ ] Verify API calls fail without permission
- [ ] Verify buttons/links disabled as expected
- [ ] Verify audit logs created

### Manual Testing Scenarios

#### Admin User
- [ ] Can access all features
- [ ] Can manage roles
- [ ] Can retrain model
- [ ] Can view audit logs
- [ ] Can scan URLs
- [ ] Can acknowledge alerts

#### Fraud Analyst User
- [ ] Can access scanners
- [ ] Can view fraud feed
- [ ] Can acknowledge alerts
- [ ] Can view analytics
- [ ] Cannot manage roles
- [ ] Cannot retrain model
- [ ] Cannot view audit logs

#### Department Head User
- [ ] Can see dept notifications only
- [ ] Can see fraud feed
- [ ] Can acknowledge alerts
- [ ] Can view analytics
- [ ] Cannot scan URLs
- [ ] Cannot see other departments
- [ ] Cannot manage roles

#### Employee User
- [ ] Can see personal notifications only
- [ ] Can acknowledge alerts
- [ ] Cannot see other employees' data
- [ ] Cannot access analytics
- [ ] Cannot scan URLs
- [ ] Cannot view fraud feed

#### Auditor User
- [ ] Can see all notifications
- [ ] Can view analytics
- [ ] Can view audit logs
- [ ] Cannot acknowledge alerts
- [ ] Cannot take actions
- [ ] Cannot export data
- [ ] Cannot modify anything

---

## Documentation

### Code Documentation
- [ ] API middleware functions documented with JSDoc
- [ ] PermissionGuard component documented with examples
- [ ] Audit logger functions documented
- [ ] Error handling documented

### Developer Guide
- [ ] Create guide on protecting API endpoints
- [ ] Create guide on using PermissionGuard in components
- [ ] Create guide on implementing permission checks
- [ ] Create troubleshooting section

### API Documentation
- [ ] Document permission requirements for each endpoint
- [ ] Document error responses
- [ ] Document audit log format
- [ ] Document rate limiting (if any)

---

## Deployment Preparation

### Pre-Deployment Checklist
- [ ] All permission checks implemented
- [ ] All components using PermissionGuard
- [ ] All API endpoints logged
- [ ] Audit logging working
- [ ] Database indices created
- [ ] Tests passing
- [ ] No console errors
- [ ] No hardcoded permissions
- [ ] Error messages are user-friendly

### Database Migration
- [ ] Create audit_logs collection
- [ ] Create indices on audit_logs
- [ ] Set up log retention
- [ ] Test audit log queries
- [ ] Backup existing data

### Deployment Steps
1. [ ] Deploy new code to staging
2. [ ] Run all tests in staging
3. [ ] Verify audit logging works
4. [ ] Test with different user roles
5. [ ] Check performance impact
6. [ ] Get approval to deploy to production
7. [ ] Deploy to production
8. [ ] Monitor logs for errors
9. [ ] Verify all features working
10. [ ] Announce to users

---

## Monitoring & Maintenance

### Ongoing Monitoring
- [ ] Monitor permission denial rate
- [ ] Check for unusual access patterns
- [ ] Review audit logs for anomalies
- [ ] Check database performance
- [ ] Monitor storage usage

### Maintenance Tasks
- [ ] Weekly review of permission denials
- [ ] Monthly compliance reporting
- [ ] Archive old audit logs
- [ ] Update documentation as needed
- [ ] Review and optimize permission checks

### Troubleshooting
- [ ] User cannot access feature they should → Check role assignment
- [ ] API returning 403 unexpectedly → Check permission configuration
- [ ] Audit logs not recording → Check logger connection
- [ ] Performance degradation → Check audit log query performance

---

## Completion Status

### Must Complete Before Launch
- [x] API middleware created
- [x] PermissionGuard component created
- [x] Audit logger created
- [x] Example implementations provided
- [ ] API endpoints protected
- [ ] Frontend components updated
- [ ] Testing completed
- [ ] Documentation finalized

### Nice to Have
- [ ] Admin dashboard for role management
- [ ] Audit log viewer UI
- [ ] Permission management UI
- [ ] Performance optimization
- [ ] Additional logging options

---

## Notes

- Start with highest priority endpoints first
- Test thoroughly before deploying
- Monitor audit logs after deployment
- Get user feedback on hidden features
- Adjust permissions based on feedback

---

**Prepared by:** GitHub Copilot  
**Date:** January 28, 2026  
**Version:** 1.0
