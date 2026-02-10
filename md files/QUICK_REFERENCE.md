## ARGUS RBAC System - Quick Reference Guide

### 🚀 Quick Start

#### 1. Import Permission Hook
```tsx
import { usePermissions } from '@/hooks/use-permissions';

export function MyComponent() {
  const { canViewFraudFeed, isAdmin, user } = usePermissions();
  // ...
}
```

#### 2. Check Permissions
```tsx
const { canExportReports, hasPermission } = usePermissions();

// Specific check
if (canExportReports) {
  // Show export button
}

// Generic check
if (hasPermission('view_audit_logs')) {
  // Show audit panel
}
```

#### 3. Types & Constants
```tsx
import { 
  Role, 
  PermissionType, 
  ROLES, 
  ALL_PERMISSIONS,
  ROLE_NAMES 
} from '@/lib/types';
```

---

### 📚 User Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | All (11/11) | System administrator |
| **fraud_analyst** | Fraud + analytics (6/11) | Security analyst |
| **department_head** | Department view (4/11) | Department manager |
| **employee** | Personal notifications (1/11) | Regular employee |
| **auditor** | Audit + all view (4/11) | Compliance auditor |

---

### 🔐 All Permissions

```
1. view_all_notifications       - See all org notifications
2. view_department_notifications - See department notifications
3. view_personal_notifications  - See personal notifications
4. view_fraud_feed              - Access fraud analysis
5. acknowledge_alerts           - Mark alerts as read
6. access_scanners              - Use URL/QR scanners
7. view_analytics               - View reports & charts
8. export_reports               - Download data
9. view_audit_logs              - See compliance logs
10. retrain_model               - Trigger ML retraining
11. manage_roles_permissions    - Edit role permissions ★
```

---

### 🔔 Notification API

#### Create Notification
```tsx
const res = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user@org.com',
    orgId: 'ORG001',
    departmentId: 'DEPT001',
    title: 'Critical Alert',
    message: 'Malicious URL detected...',
    severity: 'critical',
    category: 'fraud',
    metadata: { url: 'http://...' },
  }),
});
```

#### Fetch Notifications
```tsx
const res = await fetch(
  '/api/notifications?limit=50&severity=critical&unreadOnly=true'
);
const { data, pagination } = await res.json();
```

#### Mark as Read
```tsx
const res = await fetch('/api/notifications/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'notificationId' }),
});
```

#### Delete Notification
```tsx
const res = await fetch('/api/notifications/notificationId', {
  method: 'DELETE',
});
```

---

### 🎙️ Real-time Notifications

#### Listen to Notifications
```tsx
useEffect(() => {
  const handleNotification = (event: Event) => {
    const { detail } = event as CustomEvent;
    const { notification, severity, type } = detail;
    // Handle notification
  };

  window.addEventListener('fraud-alert', handleNotification);
  return () => window.removeEventListener('fraud-alert', handleNotification);
}, []);
```

#### Listen to Read Events
```tsx
useEffect(() => {
  const handleRead = (event: Event) => {
    const { detail } = event as CustomEvent;
    const { notification } = detail;
    // Update UI
  };

  window.addEventListener('notification-read', handleRead);
  return () => window.removeEventListener('notification-read', handleRead);
}, []);
```

---

### 🎛️ Admin Panel (Roles & Permissions)

#### Location
- **Component**: `src/components/admin-roles-panel.tsx`
- **Dashboard Tab**: Admin Dashboard → "🔐 Roles & Permissions"
- **Access**: Admin-only (enforced frontend + backend)

#### Features
- View all 5 roles
- Toggle permissions with checkboxes
- Save to MongoDB
- Real-time validation

#### API
```tsx
// Get all permissions
const res = await fetch('/api/permissions', {
  headers: { 'Authorization': `Bearer ${token}` },
});

// Update permissions
const res = await fetch('/api/permissions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    role: 'fraud_analyst',
    permissions: ['view_fraud_feed', 'view_all_notifications'],
  }),
});
```

---

### 📊 Notification Severities

```
┌──────────┬──────────┬────────────────┐
│ Severity │ Icon     │ Behavior       │
├──────────┼──────────┼────────────────┤
│ critical │ 🔴       │ Toast + Sound  │
│ high     │ 🟠       │ Toast Only     │
│ medium   │ 🟡       │ Toast Only     │
│ safe     │ ✅       │ Toast Only     │
└──────────┴──────────┴────────────────┘
```

---

### 🔧 Utility Functions

#### Permission Checks
```tsx
import {
  hasPermission,           // Check permission for role
  canViewAllNotifications, // Specific check
  isAdmin,                // Check if admin
  getNotificationScope,   // Get user's visibility scope
  filterNotificationsByPermission, // Filter data
  getRolePermissions,     // Get role's permissions
} from '@/lib/permissions';
```

#### Usage
```tsx
const role: Role = 'fraud_analyst';
const perm = hasPermission(role, 'view_fraud_feed');

const user = { role: 'admin' };
const isAdminUser = isAdmin(user);

const scope = getNotificationScope(user);
// Returns: 'all' | 'department' | 'personal' | 'fraud' | 'none'
```

---

### 🎨 Component Examples

#### Conditional Render Based on Role
```tsx
import { usePermissions } from '@/hooks/use-permissions';

export function Dashboard() {
  const { isAdmin } = usePermissions();

  return (
    <>
      <MainContent />
      {isAdmin && <AdminPanel />}
    </>
  );
}
```

#### Require Fraud Feed Access
```tsx
export function FraudAnalysis() {
  const { canViewFraudFeed } = usePermissions();

  if (!canViewFraudFeed) {
    return <AccessDenied />;
  }

  return <FraudDashboard />;
}
```

#### Get User Context
```tsx
export function ProfileMenu() {
  const { user, isAuthenticated } = usePermissions();

  if (!isAuthenticated) return null;

  return (
    <menu>
      <p>Welcome, {user?.name}!</p>
      <p>Role: {user?.role}</p>
    </menu>
  );
}
```

---

### 🔐 Backend Security

#### Validate Request
```tsx
import { User } from '@/lib/types';
import { canViewFraudFeed } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user = extractUser(request);
  
  // Enforce permission
  if (!canViewFraudFeed(user)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Return data
  return NextResponse.json({ data: [...] });
}
```

#### Filter Data
```tsx
import { filterNotificationsByPermission } from '@/lib/permissions';

const notifications = await Notification.find({...});
const filtered = filterNotificationsByPermission(notifications, user);
```

---

### 📡 Socket.IO Emission

#### Emit Notification
```tsx
import { emitNotification } from '@/socket-server';

emitNotification({
  type: 'new',
  notification: {
    userId: 'user123',
    orgId: 'ORG001',
    title: 'Alert',
    message: 'Details...',
    severity: 'critical',
    category: 'fraud',
  },
  severity: 'critical',
  timestamp: new Date(),
  recipients: {
    roles: ['admin', 'fraud_analyst'],
    departmentIds: ['DEPT001'],
  },
});
```

---

### 🧪 Testing

#### Test Admin Access
```tsx
// Login as admin
const token = encodeJWT({
  email: 'admin@org.com',
  role: 'admin',
  orgId: 'ORG001',
  name: 'Administrator',
});

// Should see permissions panel
const { isAdmin } = usePermissions();
expect(isAdmin).toBe(true);
```

#### Test Notification Filtering
```tsx
// Employee should only see personal notifications
const notifications = await fetch('/api/notifications');
const result = await notifications.json();
// Should all have userId === user.email
```

#### Test Permission Changes
```tsx
// Admin updates fraud_analyst permissions
await fetch('/api/permissions', {
  method: 'POST',
  body: JSON.stringify({
    role: 'fraud_analyst',
    permissions: ['view_fraud_feed'], // Remove access_scanners
  }),
});

// Fraud analyst should no longer see scanners
const { canAccessScanners } = usePermissions();
expect(canAccessScanners).toBe(false);
```

---

### 🐛 Debugging

#### Enable Logging
```tsx
// In notification-provider.tsx, logs are already present:
console.log("🔔 SOCKET EVENT:", data);
console.log("📢 NotificationsFeed received event:", { type, notification });
```

#### Check Permission State
```tsx
const { user, isAdmin, canViewFraudFeed } = usePermissions();
console.log('User:', user);
console.log('Is Admin:', isAdmin);
console.log('Can View Fraud:', canViewFraudFeed);
```

#### Verify Socket Connection
```tsx
import { getSocket } from '@/components/notification-provider';

const socket = getSocket();
console.log('Connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

---

### 📦 File Structure

```
src/
├── lib/
│   ├── types.ts                    # All types & constants
│   ├── permissions.ts              # Permission utilities
│   ├── models/
│   │   ├── RolePermission.ts       # Role permissions schema
│   │   ├── Notification.ts         # Notification schema
│   │   └── Alert.ts                # Alert schema
│   └── db.ts                       # MongoDB connection
├── components/
│   ├── notification-provider.tsx   # Socket listener & toasts
│   ├── notifications-feed.tsx      # Notification list UI
│   ├── notification-bell.tsx       # Bell icon with badge
│   ├── admin-roles-panel.tsx       # Admin panel
│   ├── auth-provider.tsx           # Auth context
│   ├── role-provider.tsx           # Role context
│   ├── providers.tsx               # Context stack
│   └── dashboards/
│       └── admin-dashboard.tsx     # Admin dashboard with tabs
├── hooks/
│   └── use-permissions.ts          # Permission hook
├── app/
│   ├── socket-server.ts            # Socket.IO server
│   ├── api/
│   │   ├── notifications/
│   │   │   ├── route.ts            # GET/POST notifications
│   │   │   ├── [id]/
│   │   │   │   └── route.ts        # DELETE notification
│   │   │   └── read/
│   │   │       └── route.ts        # Mark as read
│   │   └── permissions/
│   │       └── route.ts            # GET/POST permissions
│   └── globals.css                 # Severity styles
└── RBAC_IMPLEMENTATION_GUIDE.md    # Complete documentation
```

---

### ✅ Verification Checklist

Before going to production:

- [ ] All 5 roles defined
- [ ] All 11 permissions implemented
- [ ] Admin panel accessible only to admin
- [ ] Notification API filters by role
- [ ] Socket emits all notifications
- [ ] Frontend handles all severities
- [ ] Sound plays only on critical
- [ ] Unread count updates in real-time
- [ ] Mark as read removes from unread
- [ ] Database has proper indexes
- [ ] No duplicate socket listeners
- [ ] Permission checks on all protected routes
- [ ] Toast notifications appear
- [ ] UI looks enterprise-grade
- [ ] Types are TypeScript-safe

---

**Last Updated:** January 28, 2026
**Status:** ✅ Production Ready
