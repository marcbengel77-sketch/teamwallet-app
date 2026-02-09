import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface Team {
  id: string;
  name: string;
  season: string;
  created_by: string;
  is_premium: boolean;
  created_at: string;
  paypal_handle?: string | null;
}

export enum UserRole {
  Admin = 'admin',
  ViceAdmin = 'vice_admin',
  Member = 'member',
}

export enum MembershipStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

export interface Membership {
  id: string;
  user_id: string;
  team_id: string;
  role: UserRole;
  status: MembershipStatus;
  created_at: string;
  user_profile?: UserProfile;
}

export interface PenaltyCatalogItem {
  id: string;
  team_id: string;
  name: string;
  amount: number;
  created_at: string;
}

export interface AssignedPenalty {
  id: string;
  team_id: string;
  user_id: string;
  penalty_catalog_id: string | null;
  date_assigned: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
  penalty_name?: string;
  member_name?: string;
}

export enum TransactionType {
  PenaltyPayment = 'penalty_payment',
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  Expense = 'expense',
}

export interface Expense {
  id: string;
  team_id: string;
  amount: number;
  description: string;
  category: string;
  date_expense: string;
  created_by: string;
  receipt_url?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  team_id: string;
  payer_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  created_at: string;
  payer_name?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  team_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  sessionLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface TeamContextType {
  selectedTeam: Team | null;
  userTeams: Team[];
  userMemberships: Membership[];
  selectTeam: (teamId: string) => void;
  loadingTeams: boolean;
  // Fixed: refreshTeams accepts an optional boolean parameter to force loading state
  refreshTeams: (forceLoading?: boolean) => Promise<void>;
  userRole: UserRole | null;
  isAdmin: boolean;
  isViceAdmin: boolean;
}