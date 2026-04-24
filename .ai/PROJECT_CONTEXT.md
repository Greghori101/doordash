## DoorDrop — Multi-Tenant Delivery Platform

### Goal
A production-ready, DoorDash-like delivery app with four roles in a single Expo (React Native) codebase:

- **User**: create orders, track assigned driver in real time, cancel pending orders
- **Driver**: accept/reject jobs, navigate pickup/dropoff, stream live location, collect cash payments
- **Admin**: manage drivers and orders within their tenant, monitor live map, assign/reassign drivers
- **Super Admin**: platform-level management — create/suspend/delete tenant admins, audit logs, system health

### Tech
- **Mobile**: Expo ~54 + React Native 0.81 + TypeScript + Expo Router ~6 (file-based routing)
- **State**: Zustand ^5
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Realtime Database, FCM, Storage)
- **Maps**: React Native Maps 1.20 (platform-specific; web stubs for browser)
- **Location**: Expo Location ~19 (foreground + background tasks for driver streaming)
- **Notifications**: Expo Push Notifications ~0.32 + RTDB fallback channel
- **Email OTP**: SendGrid (via Cloud Functions)

### Tenancy Model
- Each **admin** represents a tenant
- **Drivers** belong to exactly one tenant via `adminId`
- **Orders** are scoped to a tenant via `adminId`
- Cross-tenant data access is blocked by Firestore security rules

### Auth Methods
- Email OTP (SendGrid) — primary mobile flow
- Email + password — native Firebase Auth
- Google / Apple OAuth — web only (federated providers)
- Custom tokens issued after OTP verification

### Payment Methods
- **Cash** — driver marks collected on delivery (`cashCollectedAt`)
- **Prepaid** — auto-marked `paymentStatus: 'paid'` at order creation

### Order State Machine
```
pending → assigned → accepted → picked → delivered
                                        ↘ cancelled (from any state except delivered)
```
All transitions enforced by Cloud Functions (no direct client writes to `orders`).

### Automatic Driver Assignment
On order creation a Cloud Function (Haversine distance) finds the nearest `isOnline + idle` driver within the same tenant and assigns them. Driver receives FCM + RTDB push notification.

### Non-Goals (current scope)
- Merchant menus / catalog
- Web admin portal (mobile admin only)
- Driver payouts / subscriptions
