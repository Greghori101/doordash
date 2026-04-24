## System Architecture (Expo + Firebase)

### Client — Single Expo App, Four Roles
Role stored in `users/{uid}.role` drives routing:

| Role | Entry point |
|---|---|
| `user` | `/(app)/(user)/` |
| `driver` | `/(app)/(driver)/` |
| `admin` | `/(app)/(admin)/` |
| `super_admin` | `/(app)/(admin)/(super)/` |

### Auth Stack `/(auth)/`
- `sign-in` — email entry (OTP or password)
- `verify-email` — 6-digit OTP confirmation
- `select-role` — choose `user` or `admin` on first signup
- `account-disabled` — shown when `users.status === 'suspended'`

### App Screens

**Admin** `/(app)/(admin)/`
- `index` — dashboard: driver count, active orders, health metrics, pending order queue
- `orders` — all tenant orders; edit/delete/cancel pending, reassign driver
- `drivers` — driver list (status badges); tap to view, suspend, or delete
- `profile` — admin info + logout

**Super Admin** `/(app)/(admin)/(super)/` *(role guard)*
- `admins` — list all tenant admins, create new admin
- `tenants` — tenant management
- `health` — system status
- `settings` — theme toggle

**Driver** `/(app)/(driver)/`
- `index` — dashboard: live map, online toggle, battery status, order queue, accept/reject/pickup/delivered/cash buttons
- `orders` — detailed order view (pickup+dropoff coords, distances)
- `profile` — driver info + logout

**User** `/(app)/(user)/`
- `index` — order creation (pickup=current location, dropoff coords, price, payment method) + order history
- `orders` — order list with status badges
- `profile` — user info + logout

### Firebase Services

| Service | Usage |
|---|---|
| **Auth** | Email/password, OTP custom tokens, Google/Apple OAuth (web) |
| **Firestore** | Primary data model, real-time listeners, order state machine |
| **Realtime Database** | High-frequency driver location + RTDB notification queue |
| **Cloud Functions** | All business logic (assignment, transitions, auth, notifications) |
| **Cloud Messaging (FCM)** | Push notifications via Expo Push API + ExponentPushToken |
| **Storage** | Images / documents (future) |

### Cloud Functions

**Auth**
- `requestEmailOtp` — generate + SendGrid OTP (5-min TTL, 30s rate limit)
- `verifyEmailOtp` — verify OTP (8-attempt limit), create/lookup user, return custom token

**Super Admin**
- `superAdminSetUserStatus` — activate/suspend any user (writes `super_audit_logs`)
- `superAdminCreateAdmin` — create tenant admin + Firebase Auth account
- `superAdminDeleteAdmin` — delete admin, auth user, linked documents

**Admin**
- `adminCreateDriver` — onboard driver with email (creates auth user, RTDB notification)
- `adminSetDriverStatus` — suspend/activate driver
- `adminDeleteDriver` — delete idle driver (cleans RTDB locations + notifications)
- `adminUpdateOrder` — edit pending order (coords, price, paymentMethod)
- `adminDeleteOrder` — delete pending order
- `adminCancelMission` — cancel non-final order, reset driver to idle

**Orders**
- `transitionOrder` — state machine with 8 actions:
  - `admin_assign`, `admin_reassign`
  - `driver_accept`, `driver_reject`
  - `driver_picked`, `driver_delivered`
  - `driver_collect_cash`
  - `user_cancel`

**Firestore Triggers**
- `onOrderCreated` — auto-assign nearest idle+online driver (Haversine), send push
- `onOrderUpdated` — sync `drivers.status` (busy ↔ idle) with order state
- `onOrderEventCreated` — fan-out RTDB notification + Expo push to user/admin/driver

### Real-Time Location Flow
```
Driver (background task, every ~3–5s)
  → Realtime DB: /locations/{driverId} { lat, lng, heading, speed, updatedAtMs }
  → Firestore snapshot (less frequent): drivers/{driverId}.currentLocation (GeoPoint)
```
Admin and user screens subscribe to RTDB location for live map updates.

### Notification Architecture (Dual Channel)
1. **Expo FCM** — `exp.host/--/api/v2/push/send` using `ExponentPushToken[…]` stored in `users.pushTokens[]`
2. **RTDB** — `notifications/{uid}` queue; client `useRtdbNotifications` hook reads and clears on receipt

Both channels are written by `onOrderEventCreated` for reliability.

### Key Client Hooks / State

| Hook/Store | Purpose |
|---|---|
| `useAuthStore` (Zustand) | Auth state: user, role, profile, bootstrapping flag |
| `useUserOrders` | Firestore listener: user's order list |
| `useAdminData` | Firestore listeners: tenant drivers + orders |
| `useAdminDriverUsers` | Driver user account list for admin |
| `useSuperAdminData` | All admins + audit logs (super admin only) |
| `useRtdbNotifications` | RTDB notification queue listener |
| `useBatteryStatus` | Device battery level + charging state |

### Security Model Summary
- **Firestore rules**: tenant-scoped reads (no cross-tenant), all writes via Cloud Functions
- **RTDB rules**: drivers write own location only; users read own notifications only
- **Super admin**: identified by custom claim, can read/write across tenants
- **OTP + audit records**: function-only access (no client read/write)
