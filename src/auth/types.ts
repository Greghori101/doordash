export type AppRole = 'user' | 'driver' | 'admin';

export type UserProfile = {
  id: string;
  name?: string;
  email?: string;
  role?: AppRole;
  adminId?: string;
  createdAt?: unknown;
};
