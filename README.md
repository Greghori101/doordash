# DoorDash-like Delivery App (Expo + Firebase)

Single Expo (React Native) codebase with role-based UX for:

- User: create delivery orders, track assigned driver live
- Driver: accept jobs, navigate pickup/dropoff, stream live location
- Admin: manage drivers + orders scoped to their tenant (`adminId`), monitor live map

## Architecture Summary

- Mobile: Expo + React Native + TypeScript + Expo Router (tabs template)
- Backend: Firebase Auth, Firestore, Cloud Functions, FCM, Storage
- Real-time:
  - Firestore listeners for orders/status
  - Optional Realtime Database stream for high-frequency driver location

Core Firestore collections:

- `users` (role + tenant membership)
- `admins` (tenants)
- `drivers` (availability + last known location snapshot)
- `orders` (state machine)
- `order_events` (audit trail)

## Getting Started

```bash
cd doordash
npm run ios
```

Other platforms:

```bash
npm run android
npm run web
```

## Next Implementation Steps

- Auth: Google/Apple sign-in + `users/{uid}` role bootstrap
- Navigation: route to Admin/Driver/User stacks based on role
- Orders: create + status updates + real-time order tracking UI
- Assignment: Cloud Function to select nearest available driver per tenant
- Location: background location updates (driver) + live map rendering (user/admin)

## Project Notes

- App idea + architecture references live in `.ai/` at the repo root.

