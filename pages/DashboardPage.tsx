
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getTeamBalance,
  getTeamFines,
  getTeamTransactions,
  getTeamMemberProfiles,
  updateFineStatus,
  getMemberFines,
} from '../services/firestoreService';
import { Fine, FineStatus, Payout, TransactionType, UserRole, UserProfile, Transaction } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import Dialog from '../components/ui/Dialog';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TeamMemberAvatar from '../components/TeamMemberAvatar';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { generateWeeklyReport } from '../services/genkitService';
import { PREMIUM_FEATURES } from '../constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardPage: React.FC = () => {
  const { selectedTeam, selectedTeamId, selectedTeamMembership, loading, updateTeamMembershipLastSeen } = useTeam();
  const { currentUser, userProfile, isPremiumUser } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [openFinesTotal, setOpenFinesTotal] = useState<number>(0);
  const [paidFinesTotal, setPaidFinesTotal] = useState<number>(0);
  const [personalOpenFines, setPersonalOpenFines] = useState<Fine[]>([]);
  const [allFines, setAllFines] = useState<Fine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMarkingFinePaid, setIsMarkingFinePaid] = useState<string | null>(null);

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const isAdmin = selectedTeamMembership?.role === UserRole.ADMIN || selectedTeamMembership?.role === UserRole.VICE_ADMIN;

  const fetchData = useCallback(async () => {
    if (!selectedTeamId || !currentUser?.uid) return;
    setIsLoadingData(true);
    try {
      const { balance: newBalance, openFinesTotal: newOpenFinesTotal, paidFinesTotal: newPaidFinesTotal } = await getTeamBalance(selectedTeamId);
      setBalance(newBalance);
      setOpenFinesTotal(newOpenFinesTotal);
      setPaidFinesTotal(newPaidFinesTotal);

      const allTeamFines = await getTeamFines(selectedTeamId);
      setAllFines(allTeamFines);

      const memberFines = await getMemberFines(selectedTeamId, currentUser.uid, FineStatus.OPEN);
      setPersonalOpenFines(memberFines);

      const teamTransactions = await getTeamTransactions(selectedTeamId);
      setTransactions(teamTransactions);

      const members = await getTeamMemberProfiles(selectedTeamId);
      setTeamMembers(members);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedTeamId, currentUser?.uid]);

  useEffect(() => {
    fetchData();
    // Update last seen dashboard timestamp
    if (selectedTeamId && currentUser?.uid) {
      updateTeamMembershipLastSeen('dashboard');
    }
  }, [fetchData, selectedTeamId, currentUser?.uid, updateTeamMembershipLastSeen]);

  const handleMarkFinePaid = useCallback(async (fineId: string) => {
    if (!selectedTeamId) return;
    setIsMarkingFinePaid(fineId);
    try {
      await updateFineStatus(selectedTeamId, fineId, FineStatus.PAID);
      await fetchData(); // Re-fetch data to update UI
    } catch (error) {
      console.error('Failed to mark fine as paid:', error);
    } finally {
      setIsMarkingFinePaid(null);
    }
  }, [selectedTeamId, fetchData]);

  const getMemberProfile = useCallback((userId: string) => {
    return teamMembers.find(member => member.id === userId);
  }, [teamMembers]);

  const renderFineRow = useCallback((fine: Fine) => {
    const member = getMemberProfile(fine.memberId);
    const issuer = getMemberProfile(fine.issuedBy);
    return (
      <TableRow key={fine.id} className={fine.status === FineStatus.PAID ? 'opacity-70' : ''}>
        <TableCell>{formatDate(fine.issuedAt.toDate())}</TableCell>
        <TableCell>
          {member ? <TeamMemberAvatar member={member} /> : 'Unbekannt'}
        </TableCell>
        <TableCell>{fine.reason}</TableCell>
        <TableCell>{formatCurrency(fine.amount)}</TableCell>
        <TableCell>{fine.status === FineStatus.PAID ? 'Bezahlt' : 'Offen'}</TableCell>
        <TableCell>{issuer ? issuer.displayName || issuer.email : 'Unbekannt'}</TableCell>
        <TableCell>
          {fine.status === FineStatus.OPEN && isAdmin && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleMarkFinePaid(fine.id)}
              isLoading={isMarkingFinePaid === fine.id}
            >
              Mark as Paid
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  }, [getMemberProfile, isAdmin, handleMarkFinePaid, isMarkingFinePaid]);

  const renderTransactionRow = useCallback((transaction: Transaction) => {
    const isFine = (transaction as Fine).fineDefId !== undefined;
    const member = isFine ? getMemberProfile((transaction as Fine).memberId) : null;
    const issuer = getMemberProfile(transaction.issuedBy);
    const date = isFine ? (transaction as Fine).paidAt || (transaction as Fine).issuedAt : (transaction as Payout).issuedAt;
    const amount = isFine ? transaction.amount : -transaction.amount; // Payouts are negative
    const purpose = isFine ? (transaction as Fine).reason : (transaction as Payout).purpose;

    return (
      <TableRow key={transaction.id}>
        <TableCell>{formatDate(date?.toDate())}</TableCell>
        <TableCell>
          {isFine ? (member ? <TeamMemberAvatar member={member} /> : 'Unbekannt') : 'Team'}
        </TableCell>
        <TableCell>{purpose}</TableCell>
        <TableCell className={amount > 0 ? 'text-green-600' : 'text-red-600'}>
          {formatCurrency(amount)}
        </TableCell>
        <TableCell>{issuer ? issuer.displayName || issuer.email : 'Unbekannt'}</TableCell>
      </TableRow>
    );
  }, [getMemberProfile]);

  // Statistics: Top 5 Sünder (Top 5 Offenders)
  const topOffendersData = useMemo(() => {
    const offenderMap = new Map<string, { totalAmount: number; member: UserProfile | undefined }>();
    allFines.filter(f => f.status === FineStatus.OPEN).forEach(fine => {
      const current = offenderMap.get(fine.memberId) || { totalAmount: 0, member: getMemberProfile(fine.memberId) };
      current.totalAmount += fine.amount;
      offenderMap.set(fine.memberId, current);
    });

    const sortedOffenders = Array.from(offenderMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    return {
      labels: sortedOffenders.map(o => o.member?.displayName || o.member?.email || 'Unbekannt'),
      datasets: [
        {
          label: 'Offene Strafen (total)',
          data: sortedOffenders.map(o => o.totalAmount),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    };
  }, [allFines, getMemberProfile]);

  // Statistics: Häufigste Strafen (Most Frequent Fines)
  const mostFrequentFinesData = useMemo(() => {
    const fineDefCountMap = new Map<string, { count: number; name: string }>();
    allFines.forEach(fine => {
      const current = fineDefCountMap.get(fine.fineDefId) || { count: 0, name: fine.reason }; // Use reason as name
      current.count += 1;
      fineDefCountMap.set(fine.fineDefId, current);
    });

    const sortedFrequentFines = Array.from(fineDefCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      labels: sortedFrequentFines.map(f => f.name),
      datasets: [
        {
          label: 'Anzahl vergebener Strafen',
          data: sortedFrequentFines.map(f => f.count),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
      ],
    };
  }, [allFines]);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedTeam || !selectedTeamId || !currentUser) {
      setReportError('Team oder Benutzer nicht geladen.');
      return;
    }

    if (!isPremiumUser) {
        setReportError('Premium-Funktion: Für diesen Bericht ist ein Premium-Konto erforderlich.');
        return;
    }

    setIsGeneratingReport(true);
    setReportError(null);
    setReportText('');

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentFines = allFines.filter(fine => fine.issuedAt.toDate() >= sevenDaysAgo);
      const recentPayouts = transactions.filter(t => t.type === TransactionType.PAYOUT && ((t as Payout).issuedAt?.toDate() || new Date()) >= sevenDaysAgo);

      const report = await generateWeeklyReport({
        teamName: selectedTeam.name,
        fines: recentFines,
        payouts: recentPayouts as Payout[], // Cast because recentPayouts are filtered from Transaction
      });
      setReportText(report);
      setIsReportDialogOpen(true);
    } catch (error: any) {
      console.error('Error generating AI report:', error);
      setReportError(error.message || 'Fehler beim Generieren des Berichts.');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [selectedTeam, selectedTeamId, currentUser, allFines, transactions, isPremiumUser]);


  if (loading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!selectedTeamId || !selectedTeam || !selectedTeamMembership) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Kein Team ausgewählt</h2>
        <p className="text-gray-600 mb-6">Sie sind noch keinem Team beigetreten oder haben keines erstellt.</p>
        <Button onClick={() => window.location.hash = '/team-settings'}>
          Team erstellen oder beitreten
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{selectedTeam.name} Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Kassenstand</CardTitle>
            <CardDescription>Aktueller Saldo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Offene Strafen</CardTitle>
            <CardDescription>Summe aller offenen Strafen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(openFinesTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bezahlte Strafen</CardTitle>
            <CardDescription>Summe aller bezahlten Strafen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paidFinesTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Meine offenen Strafen</CardTitle>
            <CardDescription>Ihre persönlichen offenen Strafen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(personalOpenFines.reduce((sum, fine) => sum + fine.amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Report Button */}
      <Card>
        <CardHeader>
          <CardTitle>AI Wochenbericht</CardTitle>
          <CardDescription>Generieren Sie einen humorvollen Bericht über die Finanzaktivitäten der letzten 7 Tage.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={handleGenerateReport}
            isLoading={isGeneratingReport}
            disabled={!isPremiumUser || isGeneratingReport}
            variant={isPremiumUser ? 'default' : 'secondary'}
          >
            {isGeneratingReport ? 'Bericht wird generiert...' : PREMIUM_FEATURES.GENKIT_REPORT.name}
          </Button>
          {!isPremiumUser && (
            <p className="text-sm text-gray-600">
              {PREMIUM_FEATURES.GENKIT_REPORT.name} ist eine Premium-Funktion. Bitte upgraden Sie Ihr Konto, um sie nutzen zu können.
            </p>
          )}
          {reportError && <p className="text-red-500 text-sm mt-2">{reportError}</p>}
        </CardContent>
      </Card>

      {/* Tabs for Details and Statistics */}
      <Tabs defaultValue="fines" className="w-full">
        <TabsList>
          <TabsTrigger value="fines">Strafenverlauf</TabsTrigger>
          <TabsTrigger value="transactions">Kontobewegungen</TabsTrigger>
          <TabsTrigger value="statistics">Statistiken</TabsTrigger>
        </TabsList>
        <TabsContent value="fines">
          <Card>
            <CardHeader>
              <CardTitle>Strafenverlauf</CardTitle>
              <CardDescription>Alle vergebenen Strafen in Ihrem Team.</CardDescription>
            </CardHeader>
            <CardContent>
              {allFines.length === 0 ? (
                <p className="text-gray-500">Noch keine Strafen vergeben.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Mitglied</TableHead>
                      <TableHead>Grund</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aussteller</TableHead>
                      <TableHead>Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allFines.map(renderFineRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Kontobewegungen</CardTitle>
              <CardDescription>Chronologische Ansicht aller Einnahmen und Ausgaben.</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-gray-500">Noch keine Kontobewegungen.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Betroffen</TableHead>
                      <TableHead>Zweck</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Verantwortlicher</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(renderTransactionRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="statistics">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Sünder (offene Strafen)</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar data={topOffendersData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Häufigste Strafen</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar data={mostFrequentFinesData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Report Dialog */}
      <Dialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        title="AI Wochenbericht"
        description="Ein humorvoller Bericht über die Finanzaktivitäten deines Teams."
        footer={<Button onClick={() => setIsReportDialogOpen(false)}>Schliessen</Button>}
      >
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{reportText}</p>
        </div>
      </Dialog>
    </div>
  );
};

export default DashboardPage;