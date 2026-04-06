## System Architecture (Expo + Firebase)

### Clients
Single Expo app with role-based rendering:

- User App
- Driver App
- Admin App

Roles are stored in `users/{uid}.role` and drive navigation/permissions.

### Firebase services
- Auth: Google / Apple sign-in
- Firestore: primary data model + real-time sync
- Realtime Database (optional): high-frequency driver location streaming
- Cloud Functions: assignment logic, status automation, notifications, auditing
- Cloud Messaging (FCM): push notifications (new assignment, status updates)
- Storage: images/documents

### Firestore data model (core)
Collections:

- `users`: identity + role + tenant relationships
- `admins`: tenant metadata
- `drivers`: driver operational state
- `orders`: lifecycle state machine for deliveries
- `order_events`: immutable audit trail

### Real-time flow (order lifecycle)
1. User creates order (`orders` write)
2. Function triggers on create:
   - find nearest available driver within tenant (`adminId`)
   - assign driver (`driverId`, `status: assigned`)
   - notify driver via FCM
3. Driver accepts and updates order status (`picked` → `delivered`)
4. User and admin subscribe to `orders/{orderId}` and render live status changes

### Location flow (recommended hybrid)
- Driver publishes frequent location updates (every ~3–5 seconds) to:
  - Realtime DB: `/locations/{driverId} → { lat, lng, heading, speed, updatedAt }`
- Snapshot to Firestore less frequently for indexing/querying:
  - `drivers/{driverId}.currentLocation` + `updatedAt`

