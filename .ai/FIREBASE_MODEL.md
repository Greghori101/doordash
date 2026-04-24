## Firestore Data Model

### `users/{uid}`
```ts
{
  id: string
  email: string
  role: "user" | "driver" | "admin" | "super_admin"
  adminId?: string          // tenant link (driver/admin)
  status: "active" | "suspended"
  pushTokens: string[]      // ExponentPushToken[…] values
  createdAt: Timestamp
}
```

### `admins/{adminId}`
```ts
{
  id: string
  name: string
  companyName: string
  createdAt: Timestamp
}
```

### `drivers/{driverId}`
```ts
{
  id: string
  userId: string            // links to users/{uid}
  adminId: string           // tenant
  isOnline: boolean
  status: "idle" | "busy"
  currentLocation: GeoPoint // Firestore snapshot (less frequent)
  updatedAt: Timestamp
}
```

### `orders/{orderId}`
```ts
{
  id: string
  userId: string
  adminId: string
  driverId?: string
  pickupLocation: GeoPoint
  dropoffLocation: GeoPoint
  status: "pending" | "assigned" | "accepted" | "picked" | "delivered" | "cancelled"
  price: number
  paymentMethod: "cash" | "prepaid"
  paymentStatus: "unpaid" | "paid"
  paidAt?: Timestamp
  cashCollectedAt?: Timestamp
  driverAcceptedAt?: Timestamp
  pickedAt?: Timestamp
  deliveredAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  updatedBy?: string        // uid of last actor
}
```

### `order_events/{eventId}`
```ts
{
  orderId: string
  status: string            // new status after transition
  actorId: string           // uid who triggered the transition
  driverId?: string
  timestamp: Timestamp
}
```

### `email_otps/{id}` *(function-only, no client access)*
```ts
{
  email: string
  salt: string
  digest: string            // SHA256 of (otp + salt)
  expiresAtMs: number       // 5-minute TTL
  requestedAtMs: number
  attempts: number          // max 8
}
```

### `super_audit_logs/{logId}` *(function-only, no client access)*
```ts
{
  actorId: string           // super admin uid
  type: string              // action type
  details: Record<string, unknown>
  createdAt: Timestamp
}
```

---

## Realtime Database

### `/locations/{driverId}` *(driver writes own; any auth user reads)*
```ts
{
  lat: number
  lng: number
  heading?: number
  speed?: number
  updatedAtMs: number       // epoch ms
}
```

### `/notifications/{uid}` *(function writes; user reads own)*
```ts
{
  [pushId]: {
    type: string
    title: string
    body: string
    data?: Record<string, unknown>
    createdAtMs: number
  }
}
```

---

## Order State Machine

```
pending
  └─ admin_assign / auto-assign on create → assigned
       └─ driver_accept  → accepted
       │    └─ driver_picked → picked
       │         └─ driver_delivered → delivered
       │         └─ driver_collect_cash (cash orders, any point after accepted)
       └─ driver_reject  → pending (driver reset to idle)
       └─ admin_reassign → assigned (different driver)

user_cancel / adminCancelMission → cancelled (from pending | assigned | accepted | picked)
```

All transitions are executed exclusively by the `transitionOrder` Cloud Function — clients never write directly to `orders`.

---

## Firestore Security Rules (summary)

| Collection | Read | Write |
|---|---|---|
| `users` | Self, or super_admin reads all | Self-create own; super_admin updates |
| `admins` | Admin reads own tenant only | Function-only |
| `drivers` | Self or same-tenant admin | Function-only |
| `orders` | User/driver/admin in order (tenant scoped) | User/admin can create; updates via function |
| `order_events` | Any signed-in user | Function-only |
| `email_otps` | None | None (function-only) |
| `super_audit_logs` | None | None (function-only) |
