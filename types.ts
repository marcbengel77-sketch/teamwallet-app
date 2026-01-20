
import { User as FirebaseAuthUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { UserRole } from './constants';

// Re-export UserRole from constants to make it accessible through types.ts
export { UserRole } from './constants';

// Firebase User extends
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Timestamp;
  isPremium?: boolean; // Added for premium features
}

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: Timestamp;
  createdBy: string; // userId of the creator
}

export interface TeamMember {
  userId: string;
  teamId: string;
  role: UserRole;
  joinedAt: Timestamp;
  // Last seen timestamp for notifications, specific to this member in this team
  lastSeenDashboard: Timestamp;
  lastSeenFines: Timestamp;
  lastSeenExpenses?: Timestamp; // New field for expenses page notifications
}

export interface FineDefinition {
  id: string;
  teamId: string;
  name: string;
  description: string;
  amount: number;
  createdAt: Timestamp;
}

export enum FineStatus {
  OPEN = 'open',
  PAID = 'paid',
}

export interface Fine {
  id: string;
  teamId: string;
  fineDefId: string; // Reference to FineDefinition
  memberId: string; // userId of the member who received the fine
  amount: number; // Stored here to allow definition changes without affecting existing fines
  reason: string; // Description from fine definition
  status: FineStatus;
  issuedAt: Timestamp;
  issuedBy: string; // userId of the admin who issued it
  paidAt?: Timestamp; // Only if status is PAID
}

export enum TransactionType {
  FINE_PAYMENT = 'fine_payment',
  PAYOUT = 'payout',
}

export interface Payout {
  id: string;
  teamId: string;
  amount: number;
  purpose: string;
  issuedAt: Timestamp;
  issuedBy: string; // userId of the admin who issued it
}

export type Transaction = Fine | Payout;

export interface InviteLink {
  id: string;
  teamId: string;
  createdBy: string; // userId
  createdAt: Timestamp;
  expiresAt: Timestamp;
  role: UserRole; // Role assigned to new members joining via this link
  isValid: boolean;
}

// Context types
export interface AuthContextType {
  currentUser: FirebaseAuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string, avatarFile: File | null) => Promise<void>;
  isPremiumUser: boolean; // Derived from userProfile
}

export interface TeamContextType {
  userTeams: Team[];
  selectedTeamId: string | null;
  selectedTeam: Team | null;
  selectedTeamMembership: TeamMember | null;
  selectTeam: (teamId: string) => void;
  loading: boolean;
  error: string | null;
  refetchTeams: () => Promise<void>;
  unreadNotifications: boolean;
  clearUnreadNotifications: () => Promise<void>;
  updateTeamMembershipLastSeen: (type: 'dashboard' | 'fines' | 'expenses') => Promise<void>; // Added 'expenses' type
}