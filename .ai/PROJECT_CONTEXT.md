## DoorDrop / DoorDash-like Delivery App

### Goal
Build a multi-tenant, DoorDash-like delivery app with three roles using a single Expo (React Native) codebase:

- User: create orders, track assigned driver in real time
- Driver: accept jobs, navigate pickup/dropoff, stream live location
- Admin: manage drivers and orders for their tenant, monitor live map

### Tech
- Mobile: Expo + React Native + TypeScript
- Backend: Firebase (Auth, Firestore, Cloud Functions, FCM, Storage)
- Location realtime: Firestore listeners + optional Firebase Realtime Database for ultra-low-latency driver location streaming

### Tenancy model
- Admins represent tenants
- Drivers belong to exactly one admin tenant via `adminId`
- Orders are scoped to a tenant via `adminId`

### Non-goals (initial)
- Payments, payouts, subscriptions
- Merchant menus/catalog
- Web admin portal (mobile admin only)

