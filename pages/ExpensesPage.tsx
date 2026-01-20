
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getTeamPayouts,
  recordPayout,
  deletePayout,
  getTeamMemberProfiles,
} from '../services/firestoreService';
import { Payout, UserRole, UserProfile } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dialog from '../components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import TeamMemberAvatar from '../components/TeamMemberAvatar';
import { formatCurrency, formatDate } from '../utils/helpers';

const ExpensesPage: React.FC = () => {
  const { selectedTeam, selectedTeamId, selectedTeamMembership, loading: teamLoading, updateTeamMembershipLastSeen } = useTeam();
  const { currentUser } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For Add Payout Dialog
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [payoutPurpose, setPayoutPurpose] = useState('');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [isRecordingPayout, setIsRecordingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const isAdminOrViceAdmin = selectedTeamMembership?.role === UserRole.ADMIN || selectedTeamMembership?.role === UserRole.VICE_ADMIN;
  const isAdmin = selectedTeamMembership?.role === UserRole.ADMIN;

  const fetchPayoutsAndMembers = useCallback(async () => {
    if (!selectedTeamId) return;
    setIsLoading(true);
    try {
      const fetchedPayouts = await getTeamPayouts(selectedTeamId);
      setPayouts(fetchedPayouts);
      const profiles = await getTeamMemberProfiles(selectedTeamId);
      setMemberProfiles(profiles);
    } catch (err) {
      console.error('Failed to fetch payouts or members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    fetchPayoutsAndMembers();
    // Update last seen expenses timestamp
    if (selectedTeamId && currentUser?.uid) {
      updateTeamMembershipLastSeen('expenses');
    }
  }, [fetchPayoutsAndMembers, selectedTeamId, currentUser?.uid, updateTeamMembershipLastSeen]);

  const handleOpenAddPayoutDialog = useCallback(() => {
    setPayoutPurpose('');
    setPayoutAmount(0);
    setPayoutError(null);
    setIsPayoutDialogOpen(true);
  }, []);

  const handleRecordPayout = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !currentUser?.uid || !isAdminOrViceAdmin) return;

    if (!payoutPurpose.trim() || payoutAmount <= 0) {
      setPayoutError('Zweck und Betrag müssen gültig sein.');
      return;
    }

    setIsRecordingPayout(true);
    setPayoutError(null);
    try {
      await recordPayout(selectedTeamId, payoutAmount, payoutPurpose, currentUser.uid);
      await fetchPayoutsAndMembers();
      setIsPayoutDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to record payout:', err);
      setPayoutError(err.message || 'Fehler beim Erfassen der Ausgabe.');
    } finally {
      setIsRecordingPayout(false);
    }
  }, [selectedTeamId, currentUser?.uid, payoutAmount, payoutPurpose, isAdminOrViceAdmin, fetchPayoutsAndMembers]);

  const handleDeletePayout = useCallback(async (payoutId: string) => {
    if (!selectedTeamId || !isAdmin) return;
    if (window.confirm('Sind Sie sicher, dass Sie diese Ausgabe löschen möchten?')) {
      try {
        await deletePayout(selectedTeamId, payoutId);
        await fetchPayoutsAndMembers();
      } catch (err) {
        console.error('Failed to delete payout:', err);
      }
    }
  }, [selectedTeamId, isAdmin, fetchPayoutsAndMembers]);

  const getMemberProfile = useCallback((userId: string) => {
    return memberProfiles.find(profile => profile.id === userId);
  }, [memberProfiles]);

  if (teamLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!selectedTeamId || !isAdminOrViceAdmin) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Zugriff verweigert</h2>
        <p className="text-gray-600">Sie haben nicht die Berechtigung, Ausgaben zu verwalten.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{selectedTeam?.name} Ausgaben</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Erfasste Ausgaben</CardTitle>
            <CardDescription>Übersicht aller Auszahlungen aus der Teamkasse.</CardDescription>
          </div>
          <Button onClick={handleOpenAddPayoutDialog}>Neue Ausgabe erfassen</Button>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-gray-500">Noch keine Ausgaben erfasst.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Zweck</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Ausgestellt von</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => {
                  const issuer = getMemberProfile(payout.issuedBy);
                  return (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">{formatDate(payout.issuedAt.toDate())}</TableCell>
                      <TableCell>{payout.purpose}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(payout.amount)}</TableCell>
                      <TableCell>
                        {issuer ? <TeamMemberAvatar member={issuer} /> : 'Unbekannt'}
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => handleDeletePayout(payout.id)}>
                            Löschen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Payout Dialog */}
      <Dialog
        isOpen={isPayoutDialogOpen}
        onClose={() => setIsPayoutDialogOpen(false)}
        title="Neue Ausgabe erfassen"
        description="Erfassen Sie eine neue Auszahlung aus der Teamkasse."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleRecordPayout} isLoading={isRecordingPayout}>
              {isRecordingPayout ? 'Erfassen...' : 'Erfassen'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordPayout} className="space-y-4">
          {payoutError && <p className="text-red-500 text-sm">{payoutError}</p>}
          <Input
            label="Zweck der Ausgabe"
            value={payoutPurpose}
            onChange={(e) => setPayoutPurpose(e.target.value)}
            placeholder="Z.B. Trikots gekauft, Fahrtkosten"
            required
          />
          <Input
            label="Betrag"
            type="number"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            min="0.01"
            required
          />
        </form>
      </Dialog>
    </div>
  );
};

export default ExpensesPage;