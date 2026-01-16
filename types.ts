
export type Role = 'admin' | 'vice-admin' | 'member';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl: string;
}

export interface TeamMember extends UserProfile {
  role: Role;
}

export interface PenaltyCategory {
  id: string;
  name: string;
  description: string;
  amount: number;
}

export interface PenaltyRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  date: string;
  status: 'open' | 'paid';
  description?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  purpose: string;
  date: string;
  userId?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}
