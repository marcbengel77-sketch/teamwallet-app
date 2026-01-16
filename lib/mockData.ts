
import { UserProfile, Team, Role, PenaltyCategory, PenaltyRecord, Transaction } from '../types';

export const mockUsers: UserProfile[] = [
  { id: 'u1', name: 'Max Mustermann', email: 'max@example.com', avatarUrl: 'https://picsum.photos/seed/u1/200' },
  { id: 'u2', name: 'Lukas Podolski', email: 'lukas@example.com', avatarUrl: 'https://picsum.photos/seed/u2/200' },
  { id: 'u3', name: 'Thomas Müller', email: 'thomas@example.com', avatarUrl: 'https://picsum.photos/seed/u3/200' },
  { id: 'u4', name: 'Manuel Neuer', email: 'manuel@example.com', avatarUrl: 'https://picsum.photos/seed/u4/200' },
];

export const mockTeams: Team[] = [
  { id: 't1', name: 'FC Bolzplatz', logoUrl: 'https://picsum.photos/seed/t1/200' },
  { id: 't2', name: 'Sonntagskicker', logoUrl: 'https://picsum.photos/seed/t2/200' },
];

export const mockMembers: { teamId: string; userId: string; role: Role }[] = [
  { teamId: 't1', userId: 'u1', role: 'admin' },
  { teamId: 't1', userId: 'u2', role: 'member' },
  { teamId: 't1', userId: 'u3', role: 'member' },
  { teamId: 't1', userId: 'u4', role: 'vice-admin' },
  { teamId: 't2', userId: 'u1', role: 'member' },
  { teamId: 't2', userId: 'u3', role: 'admin' },
];

export const mockPenaltyCategories: PenaltyCategory[] = [
  { id: 'c1', name: 'Zu spät zum Training', description: 'Gilt pro angefangene 5 Minuten', amount: 2.50 },
  { id: 'c2', name: 'Handy in der Kabine', description: 'Klingeln oder Benutzen', amount: 5.00 },
  { id: 'c3', name: 'Gelbe Karte (Meckern)', description: 'Unsportliches Verhalten', amount: 10.00 },
  { id: 'c4', name: 'Trikot vergessen', description: 'Pro Teil', amount: 3.00 },
];

export const mockPenaltyRecords: PenaltyRecord[] = [
  { id: 'r1', categoryId: 'c1', categoryName: 'Zu spät zum Training', userId: 'u1', userName: 'Max Mustermann', userAvatar: 'https://picsum.photos/seed/u1/200', amount: 2.50, date: '2024-05-10', status: 'paid' },
  { id: 'r2', categoryId: 'c3', categoryName: 'Gelbe Karte (Meckern)', userId: 'u2', userName: 'Lukas Podolski', userAvatar: 'https://picsum.photos/seed/u2/200', amount: 10.00, date: '2024-05-12', status: 'open' },
  { id: 'r3', categoryId: 'c2', categoryName: 'Handy in der Kabine', userId: 'u1', userName: 'Max Mustermann', userAvatar: 'https://picsum.photos/seed/u1/200', amount: 5.00, date: '2024-05-14', status: 'open' },
  { id: 'r4', categoryId: 'c1', categoryName: 'Zu spät zum Training', userId: 'u4', userName: 'Manuel Neuer', userAvatar: 'https://picsum.photos/seed/u4/200', amount: 2.50, date: '2024-05-15', status: 'paid' },
];

export const mockTransactions: Transaction[] = [
  { id: 'tr1', type: 'income', amount: 2.50, purpose: 'Strafe Max Mustermann', date: '2024-05-10' },
  { id: 'tr2', type: 'income', amount: 2.50, purpose: 'Strafe Manuel Neuer', date: '2024-05-15' },
  { id: 'tr3', type: 'expense', amount: 45.00, purpose: 'Getränke für die Kabine', date: '2024-05-11' },
];
