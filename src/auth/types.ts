export type AppRole = 'user' | 'driver' | 'admin' | 'super_admin';

export type UserProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: AppRole;
  adminId?: string | null;
  status?: 'active' | 'suspended';
  createdAt?: unknown;
};
