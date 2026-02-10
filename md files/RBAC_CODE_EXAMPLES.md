# RBAC Implementation Code Examples

## Complete Integration Guide with Code Samples

---

## 1. Backend API Protection

### Example 1: Protect API Endpoint with Single Permission

```typescript
// src/app/api/fraud-feed/route.ts
import { canUserPerform } from '@/lib/permissions';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // Get user from session
    const user = await getSession();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check permission
    if (!canUserPerform(user, 'view_fraud_feed')) {
      return new Response(
        JSON.stringify({ 
          error: 'Access denied',
          message: 'You do not have permission to view the fraud feed'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // User has permission - fetch data
    const fraudAlerts = await db.collection('fraud_alerts').find({}).toArray();
    
    return new Response(
      JSON.stringify(fraudAlerts),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Example 2: Protect Endpoint with Multiple Permissions (AND logic)

```typescript
// src/app/api/scanners/route.ts
import { canAccessScanners, canAcknowledgeAlerts } from '@/lib/permissions';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getSession();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Require BOTH permissions
  if (!canAccessScanners(user) || !canAcknowledgeAlerts(user)) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions for scanning' }),
      { status: 403 }
    );
  }

  // Process scan request
  const { url } = await req.json();
  const scanResult = await scanUrl(url);
  
  return new Response(JSON.stringify(scanResult), { status: 200 });
}
```

### Example 3: Protect Endpoint with OR Logic

```typescript
// src/app/api/analytics/route.ts
import { canViewAnalytics } from '@/lib/permissions';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getSession();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // User needs at least one of these roles
  const allowedRoles = ['admin', 'fraud_analyst', 'department_head', 'auditor'];
  
  if (!allowedRoles.includes(user.role)) {
    return new Response('Access denied', { status: 403 });
  }

  // Process analytics request
  const analytics = await getAnalytics(user);
  
  return new Response(JSON.stringify(analytics), { status: 200 });
}
```

### Example 4: Admin-Only Endpoint

```typescript
// src/app/api/roles/route.ts
import { isAdmin } from '@/lib/permissions';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getSession();
  
  if (!isAdmin(user)) {
    return new Response('Admin access required', { status: 403 });
  }

  // Create new role
  const { roleName, permissions } = await req.json();
  const result = await createRole(roleName, permissions);
  
  return new Response(JSON.stringify(result), { status: 201 });
}
```

---

## 2. Data Filtering by Role

### Example 1: Filter Notifications by User Role

```typescript
// src/app/api/notifications/route.ts
import { filterNotificationsByPermission } from '@/lib/permissions';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getSession();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get all notifications from database
  const allNotifications = await db.collection('notifications').find({}).toArray();
  
  // Filter based on user's role and permissions
  const userNotifications = filterNotificationsByPermission(allNotifications, user);
  
  return new Response(JSON.stringify(userNotifications), { status: 200 });
}
```

### Example 2: Filter Queries with Department Context

```typescript
// src/lib/db-helpers.ts
import { User } from '@/lib/types';

/**
 * Build MongoDB query filter based on user's permissions
 */
export function buildNotificationQuery(user: User | null) {
  if (!user) {
    return { $expr: false }; // No access
  }

  if (user.role === 'admin') {
    // Admin sees all
    return {};
  }

  if (user.role === 'fraud_analyst') {
    // Analysts see all
    return {};
  }

  if (user.role === 'department_head') {
    // Department heads see only their department
    return { departmentId: user.departmentId };
  }

  if (user.role === 'employee') {
    // Employees see only personal notifications
    return { userId: user.email };
  }

  if (user.role === 'auditor') {
    // Auditors see all (for audit purposes)
    return {};
  }

  return { $expr: false }; // Default deny
}

// Usage in API
export async function GET(req: Request) {
  const user = await getSession();
  const query = buildNotificationQuery(user);
  const notifications = await db.collection('notifications').find(query).toArray();
  return new Response(JSON.stringify(notifications), { status: 200 });
}
```

### Example 3: Filter with Aggregation Pipeline

```typescript
// src/lib/db-aggregations.ts
import { User } from '@/lib/types';

/**
 * MongoDB aggregation pipeline that respects user permissions
 */
export function getNotificationsAggregation(user: User | null) {
  const stage: any = {
    $match: {}
  };

  if (!user) {
    stage.$match.$expr = false;
    return [stage];
  }

  if (user.role === 'admin' || user.role === 'fraud_analyst') {
    // No filter - see all
    return [
      { $match: {} },
      { $sort: { createdAt: -1 } },
      { $limit: 100 }
    ];
  }

  if (user.role === 'department_head') {
    return [
      { $match: { departmentId: user.departmentId } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 }
    ];
  }

  if (user.role === 'employee') {
    return [
      { $match: { userId: user.email } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ];
  }

  if (user.role === 'auditor') {
    return [
      { $match: {} }, // See all
      { $sort: { createdAt: -1 } },
      { $limit: 200 }
    ];
  }

  return [{ $match: { $expr: false } }];
}
```

---

## 3. Frontend Components

### Example 1: Conditional Rendering Based on Permission

```typescript
// src/components/features/ScannerButton.tsx
import { canAccessScanners } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export function ScannerButton() {
  const { user } = useUser();
  
  // Don't render if user doesn't have permission
  if (!canAccessScanners(user)) {
    return null;
  }

  return (
    <button className="btn btn-primary">
      🔗 Scan Link
    </button>
  );
}
```

### Example 2: Dashboard Tab Control

```typescript
// src/components/dashboards/DashboardTabs.tsx
import { getRoleFeaturesGrouped } from '@/lib/dashboardConfig';
import { useUser } from '@/hooks/useUser';

export function DashboardTabs() {
  const { user } = useUser();
  
  if (!user) return null;

  // Get features grouped by category for this role
  const featuresGrouped = getRoleFeaturesGrouped(user.role);

  return (
    <div className="tabs">
      {Object.entries(featuresGrouped).map(([category, features]) => (
        <div key={category} className="tab-section">
          <h3>{category}</h3>
          <ul>
            {features.map(feature => (
              <li key={feature.id}>
                ✅ {feature.label}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Role-Based Sidebar Navigation

```typescript
// src/components/layout/Sidebar.tsx
import { ROLE_DASHBOARDS } from '@/lib/dashboardConfig';
import { useUser } from '@/hooks/useUser';

export function Sidebar() {
  const { user } = useUser();
  
  if (!user) return null;

  const dashboard = ROLE_DASHBOARDS[user.role];

  return (
    <aside className="sidebar">
      <h2>{dashboard.title}</h2>
      <p className="text-sm text-gray-500">{dashboard.description}</p>

      <nav className="mt-6">
        {dashboard.features.map(feature => (
          <a
            key={feature.id}
            href={`/dashboard/${feature.id}`}
            className="nav-item"
          >
            {feature.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
```

### Example 4: Permission Guard HOC

```typescript
// src/components/PermissionGuard.tsx
import { ReactNode } from 'react';
import { PermissionType } from '@/lib/types';
import { canUserPerform } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

interface PermissionGuardProps {
  permission: PermissionType | PermissionType[];
  requireAll?: boolean; // true = AND, false = OR
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  requireAll = false,
  fallback = <div className="alert alert-warning">Access denied</div>,
  children,
}: PermissionGuardProps) {
  const { user } = useUser();

  if (!user) {
    return <div>{fallback}</div>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => canUserPerform(user, p))
    : permissions.some(p => canUserPerform(user, p));

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Usage:
export function AnalyticsSection() {
  return (
    <PermissionGuard permission="view_analytics">
      <div>
        {/* This only renders if user has view_analytics permission */}
        <Analytics />
      </div>
    </PermissionGuard>
  );
}

// With multiple permissions (OR logic):
export function AdminPanel() {
  return (
    <PermissionGuard 
      permission={['manage_roles_permissions', 'retrain_model']}
      fallback={<p>Admin access required</p>}
    >
      <AdminControls />
    </PermissionGuard>
  );
}
```

---

## 4. Custom Hooks

### Example 1: usePermissions Hook

```typescript
// src/hooks/usePermissions.ts
import { useUser } from './useUser';
import { PermissionType } from '@/lib/types';
import { canUserPerform } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useUser();

  return {
    hasPermission: (permission: PermissionType) => 
      canUserPerform(user, permission),
    
    canViewNotifications: () =>
      canUserPerform(user, 'view_all_notifications') ||
      canUserPerform(user, 'view_department_notifications') ||
      canUserPerform(user, 'view_personal_notifications'),
    
    canAccessScanners: () =>
      canUserPerform(user, 'access_scanners'),
    
    canViewAnalytics: () =>
      canUserPerform(user, 'view_analytics'),
    
    isAdmin: () =>
      user?.role === 'admin',
    
    isAnalyst: () =>
      user?.role === 'fraud_analyst',
  };
}

// Usage:
export function MyComponent() {
  const { canAccessScanners, canViewAnalytics } = usePermissions();

  return (
    <div>
      {canAccessScanners() && <ScannerTools />}
      {canViewAnalytics() && <Analytics />}
    </div>
  );
}
```

### Example 2: useRoleFeatures Hook

```typescript
// src/hooks/useRoleFeatures.ts
import { useUser } from './useUser';
import { getRoleFeaturesGrouped, DashboardFeature } from '@/lib/dashboardConfig';

export function useRoleFeatures() {
  const { user } = useUser();

  if (!user) return {};

  return getRoleFeaturesGrouped(user.role);
}

// Usage:
export function FeaturesList() {
  const featuresGrouped = useRoleFeatures();

  return (
    <div>
      {Object.entries(featuresGrouped).map(([category, features]) => (
        <section key={category}>
          <h3>{category}</h3>
          <ul>
            {features.map(f => <li key={f.id}>{f.label}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

---

## 5. Testing Examples

### Example 1: Permission Utility Tests

```typescript
// src/lib/__tests__/permissions.test.ts
import { hasPermission, canUserPerform, canAccessScanners } from '@/lib/permissions';
import { User } from '@/lib/types';

describe('Permission Utilities', () => {
  it('should grant fraud analyst access to scanners', () => {
    const analyst = { role: 'fraud_analyst' } as User;
    expect(canAccessScanners(analyst)).toBe(true);
  });

  it('should deny employee access to scanners', () => {
    const employee = { role: 'employee' } as User;
    expect(canAccessScanners(employee)).toBe(false);
  });

  it('should grant admin all permissions', () => {
    const admin = { role: 'admin' } as User;
    expect(canUserPerform(admin, 'view_fraud_feed')).toBe(true);
    expect(canUserPerform(admin, 'manage_roles_permissions')).toBe(true);
  });

  it('should deny auditor action-based permissions', () => {
    const auditor = { role: 'auditor' } as User;
    expect(canUserPerform(auditor, 'acknowledge_alerts')).toBe(false);
    expect(canUserPerform(auditor, 'export_reports')).toBe(false);
  });
});
```

### Example 2: API Endpoint Tests

```typescript
// src/app/api/__tests__/fraud-feed.test.ts
import { GET } from '@/app/api/fraud-feed/route';
import { User } from '@/lib/types';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

describe('GET /api/fraud-feed', () => {
  it('should allow fraud analyst access', async () => {
    const session = { role: 'fraud_analyst' } as User;
    jest.mocked(getSession).mockResolvedValue(session);

    const response = await GET(new Request('http://localhost/api/fraud-feed'));
    expect(response.status).toBe(200);
  });

  it('should deny employee access', async () => {
    const session = { role: 'employee' } as User;
    jest.mocked(getSession).mockResolvedValue(session);

    const response = await GET(new Request('http://localhost/api/fraud-feed'));
    expect(response.status).toBe(403);
  });
});
```

---

## 6. Logging & Audit

### Example 1: Log Permission Checks

```typescript
// src/lib/audit.ts
import { User } from '@/lib/types';
import { PermissionType } from '@/lib/types';

export async function logPermissionCheck(
  user: User | null,
  permission: PermissionType,
  allowed: boolean
) {
  const logEntry = {
    timestamp: new Date(),
    userId: user?.email || 'anonymous',
    userRole: user?.role || 'unknown',
    permission,
    allowed,
    ipAddress: process.env.CLIENT_IP, // Get from request headers
  };

  // Log to database
  await db.collection('permission_logs').insertOne(logEntry);

  // Log denials for security monitoring
  if (!allowed) {
    console.warn(`⚠️ PERMISSION DENIED: ${user?.email} - ${permission}`);
  }
}
```

### Example 2: Audit Permission Changes

```typescript
// src/app/api/roles/[roleId]/route.ts
import { logAuditEvent } from '@/lib/audit';

export async function PUT(req: Request, { params }: any) {
  const user = await getSession();

  if (!isAdmin(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { roleId } = params;
  const { permissions } = await req.json();

  // Update role
  const result = await db.collection('roles').updateOne(
    { _id: roleId },
    { $set: { permissions } }
  );

  // Log the change
  await logAuditEvent({
    action: 'ROLE_PERMISSIONS_UPDATED',
    userId: user.email,
    roleId,
    permissions,
    timestamp: new Date(),
  });

  return new Response(JSON.stringify(result), { status: 200 });
}
```

---

## 7. Error Handling

### Example 1: Permission Error Middleware

```typescript
// src/middleware/permission-error.ts
import { NextRequest, NextResponse } from 'next/server';

export function permissionErrorHandler(error: Error, request: NextRequest) {
  if (error.message.includes('Permission denied')) {
    return NextResponse.json(
      { 
        error: 'Access Denied',
        message: 'You do not have permission to access this resource'
      },
      { status: 403 }
    );
  }

  if (error.message.includes('Unauthorized')) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        message: 'You must be logged in'
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
```

---

## Complete Integration Checklist

- [ ] Add permission checks to all sensitive API endpoints
- [ ] Filter database queries by user role
- [ ] Implement PermissionGuard component in React
- [ ] Add permission-based UI hiding
- [ ] Create custom permission hooks
- [ ] Add audit logging for permission checks
- [ ] Write permission unit tests
- [ ] Test all role combinations
- [ ] Verify API protection
- [ ] Enable audit trail tracking

---

**Last Updated:** January 28, 2026  
**Version:** 1.0
