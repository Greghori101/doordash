export type AppRole = 'user' | 'driver' | 'admin' | 'super_admin';

export type UserProfile = {
  id: string;
  name?: string;
  email?: string;
  role?: AppRole;
  adminId?: string;
  status?: 'active' | 'suspended';
  createdAt?: unknown;
};
