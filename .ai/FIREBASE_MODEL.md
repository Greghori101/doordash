## Firestore Entities (Draft)

### `users/{uid}`
```ts
{
  id: string,
  name: string,
  email: string,
  role: "user" | "driver" | "admin",
  adminId?: string,
  createdAt: Timestamp
}
```

### `admins/{adminId}`
```ts
{
  id: string,
  name: string,
  companyName: string,
  createdAt: Timestamp
}
```

### `drivers/{driverId}`
```ts
{
  id: string,
  userId: string,
  adminId: string,
  isOnline: boolean,
  currentLocation: GeoPoint,
  status: "idle" | "busy",
  updatedAt: Timestamp
}
```

### `orders/{orderId}`
```ts
{
  id: string,
  userId: string,
  adminId: string,
  driverId?: string,
  pickupLocation: GeoPoint,
  dropoffLocation: GeoPoint,
  status: "pending" | "assigned" | "picked" | "delivered" | "cancelled",
  price: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `order_events/{eventId}`
```ts
{
  orderId: string,
  status: string,
  timestamp: Timestamp,
  actorId: string
}
```

## Realtime Database (Optional)
`/locations/{driverId}`
```ts
{
  lat: number,
  lng: number,
  heading?: number,
  speed?: number,
  updatedAt: number
}
```

