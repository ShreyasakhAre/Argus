# RBAC Integration Quick Start Guide

**Last Updated:** January 28, 2026  
**Status:** Ready to Begin Implementation

---

## Overview

You now have three production-ready components for integrating RBAC:

1. **API Middleware** (`src/lib/api-middleware.ts`) - Protect backend endpoints
2. **PermissionGuard** (`src/components/PermissionGuard.tsx`) - Guard frontend features
3. **Audit Logger** (`src/lib/audit-logger.ts`) - Log all access attempts

This guide shows how to integrate each component into your existing code.

---

## Step 1: Protect an API Endpoint (5 minutes)

### Before - No Protection
```typescript
// src/app/api/scan-link/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();
  // ... scan logic
  return NextResponse.json({ result: 'scanned' });
}
```

### After - With Permission Check
```typescript
// src/app/api/scan-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-middleware';
import { logApiAccess, logApiError } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  // Step 1: Check permission
  const { success, response, user } = await requirePermission(
    request,
    'access_scanners'
  );
  
  if (!success) {
    // Return 401/403 error
    logApiError(request, response.status, 'Permission denied');
    return response;
  }

  try {
    // Step 2: Your original logic
    const data = await request.json();
    // ... scan logic
    const result = { result: 'scanned' };

    // Step 3: Log the successful access
    logApiAccess(request, user, 'access_scanners');

    return NextResponse.json(result);
  } catch (error) {
    // Step 4: Log any errors
    logApiError(request, 500, error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Using HOC Pattern (Cleaner)
```typescript
import { protectedRoute } from '@/lib/api-middleware';

export const POST = protectedRoute(
  'access_scanners',
  async (user, request) => {
    const data = await request.json();
    // ... scan logic
    return { result: 'scanned' };
  }
);
```

---

## Step 2: Hide a UI Feature (3 minutes)

### Before - Always Visible
```typescript
// src/components/scanner-tools.tsx
export function ScannerTools() {
  return (
    <div>
      <button onClick={handleScan}>Scan URL</button>
      <button onClick={handleQRScan}>Scan QR</button>
    </div>
  );
}
```

### After - Conditionally Visible
```typescript
// src/components/scanner-tools.tsx
import { PermissionGuard, PermissionGuardNull } from '@/components/PermissionGuard';

export function ScannerTools() {
  return (
    <PermissionGuardNull permission="access_scanners">
      <div>
        <button onClick={handleScan}>Scan URL</button>
        <button onClick={handleQRScan}>Scan QR</button>
      </div>
    </PermissionGuardNull>
  );
}
```

### With User Feedback
```typescript
import { PermissionGuardWarning } from '@/components/PermissionGuard';

export function ScannerTools() {
  return (
    <PermissionGuardWarning permission="access_scanners">
      <div>
        <button onClick={handleScan}>Scan URL</button>
        <button onClick={handleQRScan}>Scan QR</button>
      </div>
    </PermissionGuardWarning>
  );
}
```

---

## Step 3: Set Up Audit Logging (2 minutes)

### Audit Logger Already Integrated
The audit logger works automatically with the API middleware:

```typescript
import { requirePermission, logApiAccess } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  // Permission check automatically logs failures
  const { success, user } = await requirePermission(request, 'view_fraud_feed');
  if (!success) return response; // Denied access is logged

  // Successful access is logged
  logApiAccess(request, user, 'view_fraud_feed');
  
  // Return data
  return NextResponse.json(data);
}
```

### Manual Logging
If you need to log custom events:

```typescript
import { logAuditEvent, logPermissionCheck } from '@/lib/audit-logger';

// Log a permission check
await logPermissionCheck({
  userId: user.id,
  userRole: user.role,
  permission: 'access_scanners',
  granted: true
});

// Log a custom event
await logAuditEvent({
  action: 'CUSTOM_ACTION',
  userId: user.id,
  userRole: user.role,
  details: { customData: 'value' }
});
```

---

## Quick Integration Checklist

### Security-Critical APIs (Do These First)
```typescript
// Each of these needs requirePermission() or adminRoute()

// src/app/api/retrain/route.ts
export const POST = adminRoute(async (user, request) => { /* ... */ });

// src/app/api/scan-link/route.ts
const { success } = await requirePermission(request, 'access_scanners');

// src/app/api/scan-qr/route.ts
const { success } = await requirePermission(request, 'access_scanners');

// src/app/api/audit-logs/route.ts
const { success } = await requirePermission(request, 'view_audit_logs');
```

### UI Features (Update These Next)
```typescript
// Each of these needs PermissionGuard wrapper

// src/components/scanner-tools.tsx
<PermissionGuardNull permission="access_scanners">
  {/* scanner UI */}
</PermissionGuardNull>

// src/components/admin-roles-panel.tsx
<PermissionGuardNull permission="manage_roles_permissions">
  {/* admin UI */}
</PermissionGuardNull>

// src/components/analytics-panel.tsx
<PermissionGuardNull permission="view_analytics">
  {/* analytics UI */}
</PermissionGuardNull>
```

---

## Available Permissions Reference

```typescript
// For API endpoints, use requirePermission():
'view_all_notifications'           // View all notifications
'view_department_notifications'    // View department notifications  
'view_personal_notifications'      // View personal notifications
'view_fraud_feed'                  // Access fraud feed
'acknowledge_alerts'               // Acknowledge alerts
'access_scanners'                  // Use URL/QR scanners
'view_analytics'                   // Access analytics
'export_reports'                   // Export data
'view_audit_logs'                  // Access audit logs
'manage_roles_permissions'         // Manage roles
'retrain_model'                    // Retrain ML model
```

---

## File Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| API Middleware | `src/lib/api-middleware.ts` | Protect API endpoints |
| PermissionGuard | `src/components/PermissionGuard.tsx` | Hide UI features |
| Audit Logger | `src/lib/audit-logger.ts` | Log all access |
| Examples (API) | `EXAMPLE_API_IMPLEMENTATIONS.md` | See 10 API examples |
| Examples (Frontend) | `EXAMPLE_FRONTEND_IMPLEMENTATIONS.md` | See 10 UI examples |

---

## Testing Your Changes

### Test API Endpoint Protection
```bash
# As Admin (should work)
curl -X POST http://localhost:3000/api/scan-link \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# As Employee (should fail with 403)
curl -X POST http://localhost:3000/api/scan-link \
  -H "Authorization: Bearer employee_token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### Test UI Feature Hiding
1. Login as Admin → See all features
2. Login as Fraud Analyst → See scanners, fraud feed, analytics
3. Login as Employee → See only personal notifications
4. Verify hidden features don't appear

### Test Audit Logging
1. Perform an action with permission → Check audit logs
2. Attempt action without permission → Check audit logs for denial
3. Verify each log includes: userId, userRole, permission, timestamp

---

## Common Patterns

### Single Permission Check
```typescript
const { success } = await requirePermission(request, 'view_fraud_feed');
```

### Multiple Permissions (OR)
```typescript
const { success } = await requirePermission(
  request,
  ['view_analytics', 'view_audit_logs']
);
// Success if user has ANY of these permissions
```

### Multiple Permissions (AND)
```typescript
const { success } = await requirePermission(
  request,
  ['access_scanners', 'acknowledge_alerts'],
  { requireAll: true }
);
// Success only if user has ALL of these permissions
```

### Admin-Only Endpoint
```typescript
const { success } = await requireAdmin(request);
// Success only if user role is 'admin'
```

### Using HOC
```typescript
export const POST = protectedRoute('access_scanners', async (user, request) => {
  // Your code here - user is guaranteed to have 'access_scanners'
  return { success: true };
});

export const DELETE = adminRoute(async (user, request) => {
  // Your code here - user is guaranteed to be admin
  return { success: true };
});
```

---

## Next Steps

1. **Today:** Pick one API endpoint and add requirePermission()
2. **Today:** Pick one UI feature and wrap with PermissionGuard
3. **Tomorrow:** Continue with remaining endpoints and features
4. **Tomorrow:** Test everything with different user roles
5. **This Week:** Deploy to staging and test thoroughly
6. **Next Week:** Deploy to production with monitoring

---

## Getting Help

### If an endpoint returns 401
- User is not authenticated
- Check authentication token/session
- Verify user is logged in

### If an endpoint returns 403
- User is authenticated but lacks permission
- Check user's role in database
- Verify permission is assigned to role
- Check EXAMPLE_API_IMPLEMENTATIONS.md for correct permission name

### If PermissionGuard not hiding features
- Check permission name is correct
- Verify useUser() hook is returning correct user
- Check user role is set in database
- Verify PermissionGuardNull is used (returns null when denied)

### If audit logs not working
- Verify logApiAccess() is called after permission check
- Check console for logging output
- Review EXAMPLE_API_IMPLEMENTATIONS.md for logging patterns
- Audit logger.ts is ready, just needs MongoDB connection

---

## Questions?

Refer to these files:
- **API Examples:** `EXAMPLE_API_IMPLEMENTATIONS.md` (10 detailed examples)
- **Frontend Examples:** `EXAMPLE_FRONTEND_IMPLEMENTATIONS.md` (10 detailed examples)
- **RBAC Guide:** `RBAC_IMPLEMENTATION_GUIDE.md` (complete specification)
- **Integration Checklist:** `INTEGRATION_CHECKLIST.md` (full task list)

---

**You have everything you need to get started!**

Start with one endpoint, test it, then move to the next. The patterns are consistent across your codebase.
