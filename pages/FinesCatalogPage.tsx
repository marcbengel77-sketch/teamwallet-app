
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getFineCatalog,
  addFineDefinition,
  updateFineDefinition,
  deleteFineDefinition,
  issueFine,
  getTeamMembers,
  getTeamMemberProfiles
} from '../services/firestoreService';
import { FineDefinition, UserRole, UserProfile } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dialog from '../components/ui/Dialog';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import TeamMemberAvatar from '../components/TeamMemberAvatar';
import { formatCurrency } from '../utils/helpers';

const FinesCatalogPage: React.FC = () => {
  const { selectedTeamId, selectedTeamMembership, loading: teamLoading, updateTeamMembershipLastSeen } = useTeam();
  const { currentUser } = useAuth();
  const [catalog, setCatalog] = useState<FineDefinition[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For Add/Edit Fine Definition Dialog
  const [isDefDialogOpen, setIsDefDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<FineDefinition | null>(null);
  const [defName, setDefName] = useState('');
  const [defDescription, setDefDescription] = useState('');
  const [defAmount, setDefAmount] = useState<number>(0);
  const [isSavingDef, setIsSavingDef] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);

  // For Issue Fine Dialog
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [issuingFineDef, setIssuingFineDef] = useState<FineDefinition | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  const isAdminOrViceAdmin = selectedTeamMembership?.role === UserRole.ADMIN || selectedTeamMembership?.role === UserRole.VICE_ADMIN;

  const fetchCatalogAndMembers = useCallback(async () => {
    if (!selectedTeamId) return;
    setIsLoading(true);
    try {
      const fetchedCatalog = await getFineCatalog(selectedTeamId);
      setCatalog(fetchedCatalog);
      const profiles = await getTeamMemberProfiles(selectedTeamId);
      setMemberProfiles(profiles);
    } catch (err) {
      console.error('Failed to fetch fine catalog or members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    fetchCatalogAndMembers();
    // Update last seen fines timestamp
    if (selectedTeamId && currentUser?.uid) {
      updateTeamMembershipLastSeen('fines');
    }
  }, [fetchCatalogAndMembers, selectedTeamId, currentUser?.uid, updateTeamMembershipLastSeen]);

  const handleOpenAddDefDialog = useCallback(() => {
    setEditingDef(null);
    setDefName('');
    setDefDescription('');
    setDefAmount(0);
    setDefError(null);
    setIsDefDialogOpen(true);
  }, []);

  const handleOpenEditDefDialog = useCallback((fineDef: FineDefinition) => {
    setEditingDef(fineDef);
    setDefName(fineDef.name);
    setDefDescription(fineDef.description);
    setDefAmount(fineDef.amount);
    setDefError(null);
    setIsDefDialogOpen(true);
  }, []);

  const handleSaveFineDefinition = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !isAdminOrViceAdmin) return;

    setIsSavingDef(true);
    setDefError(null);
    try {
      if (editingDef) {
        await updateFineDefinition(selectedTeamId, editingDef.id, {
          name: defName,
          description: defDescription,
          amount: defAmount,
        });
      } else {
        await addFineDefinition(selectedTeamId, defName, defDescription, defAmount);
      }
      await fetchCatalogAndMembers();
      setIsDefDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to save fine definition:', err);
      setDefError(err.message || 'Fehler beim Speichern der Strafendefinition.');
    } finally {
      setIsSavingDef(false);
    }
  }, [selectedTeamId, editingDef, defName, defDescription, defAmount, isAdminOrViceAdmin, fetchCatalogAndMembers]);

  const handleDeleteFineDefinition = useCallback(async (fineDefId: string) => {
    if (!selectedTeamId || !isAdminOrViceAdmin) return;
    if (window.confirm('Sind Sie sicher, dass Sie diese Strafendefinition löschen möchten? Alle vergebenen Strafen bleiben bestehen.')) {
      try {
        await deleteFineDefinition(selectedTeamId, fineDefId);
        await fetchCatalogAndMembers();
      } catch (err) {
        console.error('Failed to delete fine definition:', err);
      }
    }
  }, [selectedTeamId, isAdminOrViceAdmin, fetchCatalogAndMembers]);

  const handleOpenIssueDialog = useCallback((fineDef: FineDefinition) => {
    setIssuingFineDef(fineDef);
    setSelectedMemberId(null); // Clear previous selection
    setIssueError(null);
    setIsIssueDialogOpen(true);
  }, []);

  const handleIssueFine = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !currentUser?.uid || !issuingFineDef || !selectedMemberId || !isAdminOrViceAdmin) return;

    setIsIssuing(true);
    setIssueError(null);
    try {
      await issueFine(selectedTeamId, issuingFineDef, selectedMemberId, currentUser.uid);
      setIsIssueDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to issue fine:', err);
      setIssueError(err.message || 'Fehler beim Vergeben der Strafe.');
    } finally {
      setIsIssuing(false);
    }
  }, [selectedTeamId, currentUser?.uid, issuingFineDef, selectedMemberId, isAdminOrViceAdmin]);

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
        <p className="text-gray-600">Sie haben nicht die Berechtigung, den Strafenkatalog zu verwalten.</p>
      </div>
    );
  }

  const memberOptions = memberProfiles.map(member => ({
    value: member.id,
    label: member.displayName || member.email,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Strafenkatalog</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Verfügbare Strafen</CardTitle>
            <CardDescription>Definieren und verwalten Sie die Strafen für Ihr Team.</CardDescription>
          </div>
          <Button onClick={handleOpenAddDefDialog}>Neue Strafe hinzufügen</Button>
        </CardHeader>
        <CardContent>
          {catalog.length === 0 ? (
            <p className="text-gray-500">Noch keine Strafen im Katalog.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.map((fineDef) => (
                  <TableRow key={fineDef.id}>
                    <TableCell className="font-medium">{fineDef.name}</TableCell>
                    <TableCell>{fineDef.description}</TableCell>
                    <TableCell>{formatCurrency(fineDef.amount)}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenIssueDialog(fineDef)}>
                        Strafe vergeben
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditDefDialog(fineDef)}>
                        Bearbeiten
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteFineDefinition(fineDef.id)}>
                        Löschen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Fine Definition Dialog */}
      <Dialog
        isOpen={isDefDialogOpen}
        onClose={() => setIsDefDialogOpen(false)}
        title={editingDef ? 'Strafe bearbeiten' : 'Neue Strafe hinzufügen'}
        description="Definieren Sie Name, Beschreibung und Betrag für die Strafe."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDefDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveFineDefinition} isLoading={isSavingDef}>
              {isSavingDef ? 'Speichern...' : 'Speichern'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveFineDefinition} className="space-y-4">
          {defError && <p className="text-red-500 text-sm">{defError}</p>}
          <Input
            label="Name der Strafe"
            value={defName}
            onChange={(e) => setDefName(e.target.value)}
            required
          />
          <Input
            label="Beschreibung"
            value={defDescription}
            onChange={(e) => setDefDescription(e.target.value)}
          />
          <Input
            label="Betrag"
            type="number"
            value={defAmount}
            onChange={(e) => setDefAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            required
          />
        </form>
      </Dialog>

      {/* Issue Fine Dialog */}
      <Dialog
        isOpen={isIssueDialogOpen}
        onClose={() => setIsIssueDialogOpen(false)}
        title={`Strafe vergeben: ${issuingFineDef?.name}`}
        description={`Vergeben Sie die Strafe "${issuingFineDef?.name}" an ein Teammitglied.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleIssueFine} isLoading={isIssuing} disabled={!selectedMemberId}>
              {isIssuing ? 'Vergeben...' : 'Strafe vergeben'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleIssueFine} className="space-y-4">
          {issueError && <p className="text-red-500 text-sm">{issueError}</p>}
          <p>Betrag: <span className="font-semibold">{formatCurrency(issuingFineDef?.amount || 0)}</span></p>
          <p>Beschreibung: {issuingFineDef?.description}</p>
          <Select
            label="Mitglied auswählen"
            options={memberOptions}
            value={selectedMemberId || ''}
            onValueChange={setSelectedMemberId}
            placeholder="Wählen Sie ein Mitglied aus"
            required
          />
        </form>
      </Dialog>
    </div>
  );
};

export default FinesCatalogPage;
