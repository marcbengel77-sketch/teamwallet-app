
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc, // Added setDoc
  serverTimestamp,
  limit,
  orderBy,
} from 'firebase/firestore';
import { firestore } from './firebase';
import {
  Team,
  TeamMember,
  UserProfile,
  FineDefinition,
  Fine,
  FineStatus,
  Payout,
  InviteLink,
  UserRole,
  Transaction,
  TransactionType, // Added TransactionType
} from '../types';
import { generateUniqueId } from '../utils/helpers';
import { getAuth } from 'firebase/auth';

// --- Team Management ---
export const createTeam = async (name: string, userId: string, logoUrl: string | null = null): Promise<Team> => {
  const teamRef = collection(firestore, 'teams');
  const newTeam: Omit<Team, 'id'> = {
    name,
    logoUrl,
    createdAt: serverTimestamp() as any, // Firebase Timestamp
    createdBy: userId,
  };
  const docRef = await addDoc(teamRef, newTeam);

  // Add creator as admin member
  await addTeamMember(docRef.id, userId, UserRole.ADMIN);

  return { id: docRef.id, ...newTeam, createdAt: new Date() as any }; // Convert for client-side
};

export const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<void> => {
  const teamRef = doc(firestore, 'teams', teamId);
  await updateDoc(teamRef, updates);
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  // TODO: Implement cascading delete for subcollections (members, fines, payouts, catalog, invites)
  // This typically requires Firebase Cloud Functions or manual iteration.
  // For now, this will only delete the team document.
  await deleteDoc(doc(firestore, 'teams', teamId));
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const memberTeamsQuery = query(collection(firestore, 'team_members'), where('userId', '==', userId));
  const memberTeamDocs = await getDocs(memberTeamsQuery);

  const teamIds: string[] = memberTeamDocs.docs.map(doc => doc.data().teamId);

  if (teamIds.length === 0) {
    return [];
  }

  // Firestore `in` query limit is 10. If more than 10 teams, needs multiple queries.
  // For simplicity, assuming less than 10 teams for now.
  const teamsQuery = query(collection(firestore, 'teams'), where('id', 'in', teamIds));
  const teamDocs = await getDocs(teamsQuery);
  return teamDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Team[];
};

export const getTeamById = async (teamId: string): Promise<Team | null> => {
  const teamRef = doc(firestore, 'teams', teamId);
  const docSnap = await getDoc(teamRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Team;
  }
  return null;
};

// --- Member Management ---
export const addTeamMember = async (teamId: string, userId: string, role: UserRole): Promise<TeamMember> => {
  const memberRef = doc(firestore, 'teams', teamId, 'members', userId);
  const newMember: Omit<TeamMember, 'teamId'> = {
    userId,
    role,
    joinedAt: serverTimestamp() as any,
    lastSeenDashboard: serverTimestamp() as any,
    lastSeenFines: serverTimestamp() as any,
  };
  await setDoc(memberRef, newMember);
  return { teamId, ...newMember, joinedAt: new Date() as any, lastSeenDashboard: new Date() as any, lastSeenFines: new Date() as any };
};

export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  const membersCollectionRef = collection(firestore, 'teams', teamId, 'members');
  const q = query(membersCollectionRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ teamId, ...doc.data() })) as TeamMember[];
};

export const getTeamMember = async (teamId: string, userId: string): Promise<TeamMember | null> => {
  const memberRef = doc(firestore, 'teams', teamId, 'members', userId);
  const docSnap = await getDoc(memberRef);
  if (docSnap.exists()) {
    return { teamId, ...docSnap.data() } as TeamMember;
  }
  return null;
};

export const updateTeamMemberRole = async (teamId: string, memberUserId: string, newRole: UserRole): Promise<void> => {
  const memberRef = doc(firestore, 'teams', teamId, 'members', memberUserId);
  await updateDoc(memberRef, { role: newRole });
};

export const removeTeamMember = async (teamId: string, memberUserId: string): Promise<void> => {
  const memberRef = doc(firestore, 'teams', teamId, 'members', memberUserId);
  await deleteDoc(memberRef);
};

export const updateTeamMemberLastSeen = async (teamId: string, userId: string, field: 'dashboard' | 'fines' | 'expenses'): Promise<void> => {
  const memberRef = doc(firestore, 'teams', teamId, 'members', userId);
  if (field === 'dashboard') {
    await updateDoc(memberRef, { lastSeenDashboard: serverTimestamp() });
  } else if (field === 'fines') {
    await updateDoc(memberRef, { lastSeenFines: serverTimestamp() });
  } else if (field === 'expenses') {
    await updateDoc(memberRef, { lastSeenExpenses: serverTimestamp() }); // Assuming a new field 'lastSeenExpenses'
  }
};


// --- Invite Links ---
export const createInviteLink = async (teamId: string, createdBy: string, role: UserRole): Promise<InviteLink> => {
  const inviteId = generateUniqueId(); // Generate a short unique ID
  const invitesCollectionRef = collection(firestore, 'teams', teamId, 'invites');
  const newInvite: Omit<InviteLink, 'id'> = {
    teamId,
    createdBy,
    createdAt: serverTimestamp() as any,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) as any, // 7 days expiration
    role,
    isValid: true,
  };
  await setDoc(doc(invitesCollectionRef, inviteId), newInvite);
  return { id: inviteId, ...newInvite, createdAt: new Date() as any, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) as any };
};

export const getInviteLink = async (teamId: string, inviteId: string): Promise<InviteLink | null> => {
  const inviteRef = doc(firestore, 'teams', teamId, 'invites', inviteId);
  const docSnap = await getDoc(inviteRef);
  if (docSnap.exists()) {
    const inviteData = { id: docSnap.id, ...docSnap.data() } as InviteLink;
    // Check if expired
    if (inviteData.expiresAt.toDate() < new Date()) {
      await updateDoc(inviteRef, { isValid: false });
      return null;
    }
    return inviteData;
  }
  return null;
};

export const invalidateInviteLink = async (teamId: string, inviteId: string): Promise<void> => {
  const inviteRef = doc(firestore, 'teams', teamId, 'invites', inviteId);
  await updateDoc(inviteRef, { isValid: false });
};

// --- Fine Catalog Management ---
export const getFineCatalog = async (teamId: string): Promise<FineDefinition[]> => {
  const catalogCollectionRef = collection(firestore, 'teams', teamId, 'fineCatalog');
  const q = query(catalogCollectionRef, orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FineDefinition[];
};

export const addFineDefinition = async (teamId: string, name: string, description: string, amount: number): Promise<FineDefinition> => {
  const catalogCollectionRef = collection(firestore, 'teams', teamId, 'fineCatalog');
  const newDef: Omit<FineDefinition, 'id'> = {
    teamId,
    name,
    description,
    amount,
    createdAt: serverTimestamp() as any,
  };
  const docRef = await addDoc(catalogCollectionRef, newDef);
  return { id: docRef.id, ...newDef, createdAt: new Date() as any };
};

export const updateFineDefinition = async (teamId: string, fineDefId: string, updates: Partial<FineDefinition>): Promise<void> => {
  const fineDefRef = doc(firestore, 'teams', teamId, 'fineCatalog', fineDefId);
  await updateDoc(fineDefRef, updates);
};

export const deleteFineDefinition = async (teamId: string, fineDefId: string): Promise<void> => {
  const fineDefRef = doc(firestore, 'teams', teamId, 'fineCatalog', fineDefId);
  await deleteDoc(fineDefRef);
};

// --- Fines (Individual) Management ---
export const issueFine = async (teamId: string, fineDef: FineDefinition, memberId: string, issuedBy: string): Promise<Fine> => {
  const finesCollectionRef = collection(firestore, 'teams', teamId, 'fines');
  const newFine: Omit<Fine, 'id'> = {
    teamId,
    fineDefId: fineDef.id,
    memberId,
    amount: fineDef.amount,
    reason: fineDef.description, // Store description at issuance time
    status: FineStatus.OPEN,
    issuedAt: serverTimestamp() as any,
    issuedBy,
  };
  const docRef = await addDoc(finesCollectionRef, newFine);
  return { id: docRef.id, ...newFine, issuedAt: new Date() as any };
};

export const getTeamFines = async (teamId: string, status?: FineStatus): Promise<Fine[]> => {
  const finesCollectionRef = collection(firestore, 'teams', teamId, 'fines');
  let q = query(finesCollectionRef, orderBy('issuedAt', 'desc'));
  if (status) {
    q = query(q, where('status', '==', status));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Fine[];
};

export const getMemberFines = async (teamId: string, memberId: string, status?: FineStatus): Promise<Fine[]> => {
  const finesCollectionRef = collection(firestore, 'teams', teamId, 'fines');
  let q = query(finesCollectionRef, where('memberId', '==', memberId), orderBy('issuedAt', 'desc'));
  if (status) {
    q = query(q, where('status', '==', status));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Fine[];
};

export const updateFineStatus = async (teamId: string, fineId: string, status: FineStatus): Promise<void> => {
  const fineRef = doc(firestore, 'teams', teamId, 'fines', fineId);
  await updateDoc(fineRef, {
    status,
    paidAt: status === FineStatus.PAID ? serverTimestamp() : null,
  });
};

// --- Payout Management ---
export const recordPayout = async (teamId: string, amount: number, purpose: string, issuedBy: string): Promise<Payout> => {
  const payoutsCollectionRef = collection(firestore, 'teams', teamId, 'payouts');
  const newPayout: Omit<Payout, 'id'> = {
    teamId,
    amount,
    purpose,
    issuedAt: serverTimestamp() as any,
    issuedBy,
  };
  const docRef = await addDoc(payoutsCollectionRef, newPayout);
  return { id: docRef.id, ...newPayout, issuedAt: new Date() as any };
};

export const getTeamPayouts = async (teamId: string): Promise<Payout[]> => {
  const payoutsCollectionRef = collection(firestore, 'teams', teamId, 'payouts');
  const q = query(payoutsCollectionRef, orderBy('issuedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payout[];
};

export const deletePayout = async (teamId: string, payoutId: string): Promise<void> => {
  const payoutRef = doc(firestore, 'teams', teamId, 'payouts', payoutId);
  await deleteDoc(payoutRef);
};

// --- Dashboard & Reporting ---
export const getTeamBalance = async (teamId: string): Promise<{ balance: number; openFinesTotal: number; paidFinesTotal: number }> => {
  const fines = await getTeamFines(teamId);
  const payouts = await getTeamPayouts(teamId);

  let openFinesTotal = 0;
  let paidFinesTotal = 0;
  fines.forEach(fine => {
    if (fine.status === FineStatus.OPEN) {
      openFinesTotal += fine.amount;
    } else {
      paidFinesTotal += fine.amount;
    }
  });

  const totalPayouts = payouts.reduce((sum, payout) => sum + payout.amount, 0);

  const balance = paidFinesTotal - totalPayouts;

  return { balance, openFinesTotal, paidFinesTotal };
};

export const getTeamTransactions = async (teamId: string): Promise<Transaction[]> => {
  const fines = await getTeamFines(teamId, FineStatus.PAID);
  const payouts = await getTeamPayouts(teamId);

  const fineTransactions: Transaction[] = fines.map(f => ({
    ...f,
    type: TransactionType.FINE_PAYMENT,
  }));
  const payoutTransactions: Transaction[] = payouts.map(p => ({
    ...p,
    type: TransactionType.PAYOUT,
  }));

  const allTransactions = [...fineTransactions, ...payoutTransactions];

  // Sort by issuedAt/paidAt in descending order
  allTransactions.sort((a, b) => {
    const aDate = (a as Fine).paidAt || (a as Payout).issuedAt;
    const bDate = (b as Fine).paidAt || (b as Payout).issuedAt;
    return bDate.toDate().getTime() - aDate.toDate().getTime();
  });

  return allTransactions;
};

export const getTeamMemberProfiles = async (teamId: string): Promise<UserProfile[]> => {
  const members = await getTeamMembers(teamId);
  if (members.length === 0) return [];
  const userIds = members.map(m => m.userId);

  // Firestore `in` query limit is 10.
  const userProfiles: UserProfile[] = [];
  const userBatches: string[][] = [];
  for (let i = 0; i < userIds.length; i += 10) {
    userBatches.push(userIds.slice(i, i + 10));
  }

  for (const batch of userBatches) {
    const q = query(collection(firestore, 'users'), where('id', 'in', batch));
    const querySnapshot = await getDocs(q);
    userProfiles.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[]);
  }

  return userProfiles;
};

// --- Notifications ---
export const getUnreadNotificationsForUser = async (teamId: string, userId: string): Promise<boolean> => {
  const memberShip = await getTeamMember(teamId, userId);
  if (!memberShip) return false;

  const lastSeenDashboard = memberShip.lastSeenDashboard.toDate();
  const lastSeenFines = memberShip.lastSeenFines.toDate();
  const lastSeenExpenses = (memberShip as any).lastSeenExpenses?.toDate() || new Date(0); // Get lastSeenExpenses, default to epoch if not set

  // Check for new fines
  const newFinesQuery = query(collection(firestore, 'teams', teamId, 'fines'), where('issuedAt', '>', lastSeenFines), limit(1));
  const newFinesSnapshot = await getDocs(newFinesQuery);
  if (!newFinesSnapshot.empty) {
    return true;
  }

  // Check for new payouts (as part of general dashboard updates)
  const newPayoutsQuery = query(collection(firestore, 'teams', teamId, 'payouts'), where('issuedAt', '>', lastSeenDashboard), limit(1));
  const newPayoutsSnapshot = await getDocs(newPayoutsQuery);
  if (!newPayoutsSnapshot.empty) {
    return true;
  }

  // Check for new expenses (using payouts collection as source for now)
  const newExpensesQuery = query(collection(firestore, 'teams', teamId, 'payouts'), where('issuedAt', '>', lastSeenExpenses), limit(1));
  const newExpensesSnapshot = await getDocs(newExpensesQuery);
  if (!newExpensesSnapshot.empty) {
    return true;
  }


  // Add other notification checks here (e.g., new team members, role changes)
  // For now, this covers fines and general financial movements.

  return false;
};