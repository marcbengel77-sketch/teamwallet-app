
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import {
  createTeam,
  updateTeam,
  createInviteLink,
  getTeamMembers,
  updateTeamMemberRole,
  removeTeamMember,
  getTeamMemberProfiles,
  addTeamMember,
  getInviteLink,
  invalidateInviteLink,
  getTeamMember, // Added getTeamMember
} from '../services/firestoreService';
import { UserRole, TeamMember, Team, UserProfile, InviteLink } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Dialog from '../components/ui/Dialog';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import TeamMemberAvatar from '../components/TeamMemberAvatar';
import { Link, useSearchParams } from 'react-router-dom';
import { compressAndResizeImage, generateShareableInviteLink } from '../utils/helpers';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../services/firebase';

const teamRoles = [
  { value: UserRole.MEMBER, label: 'Mitglied' },
  { value: UserRole.VICE_ADMIN, label: 'Vize-Admin' },
  { value: UserRole.ADMIN, label: 'Admin' },
];

const TeamSettingsPage: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { selectedTeam, selectedTeamId, selectedTeamMembership, loading: teamLoading, refetchTeams, selectTeam, error: teamContextError } = useTeam();

  const [searchParams] = useSearchParams();
  const inviteIdFromUrl = searchParams.get('inviteId');

  const [teamName, setTeamName] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [memberLoading, setMemberLoading] = useState(true);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [inviteLinkRole, setInviteLinkRole] = useState<UserRole>(UserRole.MEMBER);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const [isJoinTeamDialogOpen, setIsJoinTeamDialogOpen] = useState(false);
  const [joinTeamId, setJoinTeamId] = useState('');
  const [joinInviteId, setJoinInviteId] = useState('');
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [joinTeamError, setJoinTeamError] = useState<string | null>(null);

  const isAdmin = selectedTeamMembership?.role === UserRole.ADMIN;
  const isViceAdmin = selectedTeamMembership?.role === UserRole.VICE_ADMIN;
  const canManageTeam = isAdmin || isViceAdmin;

  const fetchMembers = useCallback(async () => {
    if (!selectedTeamId) return;
    setMemberLoading(true);
    try {
      const teamMembers = await getTeamMembers(selectedTeamId);
      setMembers(teamMembers);
      const profiles = await getTeamMemberProfiles(selectedTeamId);
      setMemberProfiles(profiles);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setMemberLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (selectedTeam) {
      setTeamName(selectedTeam.name);
      setTeamLogoPreview(selectedTeam.logoUrl);
    } else {
      setTeamName('');
      setTeamLogoFile(null);
      setTeamLogoPreview(null);
    }
    fetchMembers();
  }, [selectedTeam, fetchMembers]);

  useEffect(() => {
    if (inviteIdFromUrl && currentUser) {
      const [teamId, inviteId] = inviteIdFromUrl.split(':');
      if (teamId && inviteId) {
        setJoinTeamId(teamId);
        setJoinInviteId(inviteId);
        setIsJoinTeamDialogOpen(true);
      }
    }
  }, [inviteIdFromUrl, currentUser]);

  const handleCreateTeam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsCreatingTeam(true);
    setCreateTeamError(null);
    try {
      let logoUrl: string | null = null;
      if (teamLogoFile) {
        const compressedFile = await compressAndResizeImage(teamLogoFile);
        const storageRef = ref(storage, `team-logos/${currentUser.uid}/${Date.now()}-${compressedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, compressedFile);
        logoUrl = await getDownloadURL(uploadResult.ref);
      }

      const newTeam = await createTeam(newTeamName, currentUser.uid, logoUrl);
      await refetchTeams(); // Update list of user teams
      selectTeam(newTeam.id); // Automatically select the new team
      setNewTeamName('');
      setTeamLogoFile(null);
      setTeamLogoPreview(null);
      setIsCreatingTeam(false);
    } catch (err) {
      console.error('Failed to create team:', err);
      setCreateTeamError('Fehler beim Erstellen des Teams.');
    } finally {
      setIsCreatingTeam(false);
    }
  }, [currentUser, newTeamName, teamLogoFile, refetchTeams, selectTeam]);

  const handleUpdateTeam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !selectedTeam || !canManageTeam) return;

    setIsSavingTeam(true);
    try {
      let logoUrl = selectedTeam.logoUrl;
      if (teamLogoFile) {
        const compressedFile = await compressAndResizeImage(teamLogoFile);
        const storageRef = ref(storage, `team-logos/${selectedTeamId}/${Date.now()}-${compressedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, compressedFile);
        logoUrl = await getDownloadURL(uploadResult.ref);
      } else if (teamLogoPreview === null && selectedTeam.logoUrl) {
        // If logo was removed and there was an old one, delete it from storage
        const oldLogoRef = ref(storage, selectedTeam.logoUrl); // This might need parsing URL to get path
        // For simplicity, just removing the reference here. Real deletion would need more robust path extraction
        // await deleteObject(oldLogoRef);
        logoUrl = null;
      }

      await updateTeam(selectedTeamId, { name: teamName, logoUrl });
      await refetchTeams(); // Update the selected team in context
    } catch (err) {
      console.error('Failed to update team:', err);
    } finally {
      setIsSavingTeam(false);
    }
  }, [selectedTeamId, selectedTeam, teamName, teamLogoFile, teamLogoPreview, canManageTeam, refetchTeams]);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTeamLogoFile(file);
      setTeamLogoPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setTeamLogoFile(null);
    setTeamLogoPreview(null);
  }, []);

  const handleGenerateInviteLink = useCallback(async () => {
    if (!selectedTeamId || !currentUser) return;
    setIsGeneratingInvite(true);
    setInviteError(null);
    setNewInviteLink(null);
    try {
      const invite = await createInviteLink(selectedTeamId, currentUser.uid, inviteLinkRole);
      const shareableLink = generateShareableInviteLink(selectedTeamId, invite.id);
      setNewInviteLink(shareableLink);
    } catch (err) {
      console.error('Failed to generate invite link:', err);
      setInviteError('Fehler beim Generieren des Einladungslinks.');
    } finally {
      setIsGeneratingInvite(false);
    }
  }, [selectedTeamId, currentUser, inviteLinkRole]);

  const handleUpdateMemberRole = useCallback(async (memberId: string, role: UserRole) => {
    if (!selectedTeamId || !canManageTeam) return;
    try {
      await updateTeamMemberRole(selectedTeamId, memberId, role);
      await fetchMembers(); // Refresh member list
    } catch (err) {
      console.error('Failed to update member role:', err);
    }
  }, [selectedTeamId, canManageTeam, fetchMembers]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!selectedTeamId || !isAdmin) return;
    if (window.confirm('Sind Sie sicher, dass Sie dieses Mitglied entfernen möchten?')) {
      try {
        await removeTeamMember(selectedTeamId, memberId);
        await fetchMembers(); // Refresh member list
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    }
  }, [selectedTeamId, isAdmin, fetchMembers]);

  const handleJoinTeam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsJoiningTeam(true);
    setJoinTeamError(null);
    try {
      const invite = await getInviteLink(joinTeamId, joinInviteId);
      if (!invite || !invite.isValid) {
        setJoinTeamError('Ungültiger oder abgelaufener Einladungslink.');
        return;
      }

      // Check if user is already a member
      const existingMembership = await getTeamMember(joinTeamId, currentUser.uid);
      if (existingMembership) {
        setJoinTeamError('Sie sind bereits Mitglied dieses Teams.');
        selectTeam(joinTeamId);
        setIsJoinTeamDialogOpen(false);
        return;
      }

      await addTeamMember(joinTeamId, currentUser.uid, invite.role);
      await invalidateInviteLink(joinTeamId, joinInviteId); // Invalidate after successful use
      await refetchTeams();
      selectTeam(joinTeamId);
      setIsJoinTeamDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to join team:', err);
      setJoinTeamError(err.message || 'Fehler beim Beitritt zum Team.');
    } finally {
      setIsJoiningTeam(false);
    }
  }, [currentUser, joinTeamId, joinInviteId, refetchTeams, selectTeam]);


  const getMemberProfile = useCallback((userId: string) => {
    return memberProfiles.find(profile => profile.id === userId);
  }, [memberProfiles]);

  if (authLoading || teamLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // If no teams are selected and no existing teams for the user, show create/join options
  if (!selectedTeamId || teamContextError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Team verwalten</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Neues Team erstellen</CardTitle>
              <CardDescription>Gründen Sie ein brandneues Team und laden Sie Mitglieder ein.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                {createTeamError && <p className="text-red-500 text-sm">{createTeamError}</p>}
                <Input
                  label="Teamname"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Mein Super Team"
                  required
                />
                <label className="block text-sm font-medium text-gray-700">Team-Logo</label>
                <div className="flex items-center space-x-4">
                  <Avatar
                    src={teamLogoPreview || undefined}
                    fallbackText={newTeamName.charAt(0) || '?'}
                    size="lg"
                    className="flex-shrink-0"
                  />
                  <Input type="file" accept="image/*" onChange={handleLogoChange} />
                  {teamLogoPreview && <Button variant="outline" size="sm" onClick={handleRemoveLogo}>Entfernen</Button>}
                </div>
                <Button type="submit" isLoading={isCreatingTeam}>Team erstellen</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Einem Team beitreten</CardTitle>
              <CardDescription>Treten Sie einem Team über einen Einladungslink bei.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinTeam} className="space-y-4">
                {joinTeamError && <p className="text-red-500 text-sm">{joinTeamError}</p>}
                <Input
                  label="Einladungs-ID"
                  value={joinInviteId}
                  onChange={(e) => setJoinInviteId(e.target.value)}
                  placeholder="Geben Sie hier die ID des Einladungslinks ein"
                  required
                />
                <Input
                  label="Team-ID (aus Link)"
                  value={joinTeamId}
                  onChange={(e) => setJoinTeamId(e.target.value)}
                  placeholder="Geben Sie hier die ID des Einladungslinks ein"
                  required
                />
                <Button type="submit" isLoading={isJoiningTeam}>Team beitreten</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        {teamContextError && (
            <div className="text-red-500 bg-red-50 p-3 rounded-md mt-4">
                <p>Fehler: {teamContextError}</p>
                <p>Bitte stellen Sie sicher, dass Sie einem Team beigetreten sind oder eines erstellen.</p>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{selectedTeam?.name} Team-Einstellungen</h1>

      {/* Team Details */}
      <Card>
        <CardHeader>
          <CardTitle>Team-Details</CardTitle>
          <CardDescription>Verwalten Sie den Namen und das Logo Ihres Teams.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <Input
              label="Teamname"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Teamname"
              required
              disabled={!canManageTeam}
            />
            <label className="block text-sm font-medium text-gray-700">Team-Logo</label>
            <div className="flex items-center space-x-4">
              <Avatar
                src={teamLogoPreview || undefined}
                fallbackText={selectedTeam?.name.charAt(0) || '?'}
                size="lg"
                className="flex-shrink-0"
              />
              {canManageTeam && (
                <>
                  <Input type="file" accept="image/*" onChange={handleLogoChange} disabled={!canManageTeam} />
                  {teamLogoPreview && <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={!canManageTeam}>Entfernen</Button>}
                </>
              )}
            </div>
            {canManageTeam && <Button type="submit" isLoading={isSavingTeam}>Änderungen speichern</Button>}
          </form>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team-Mitglieder</CardTitle>
          <CardDescription>Verwalten Sie die Mitglieder und deren Rollen.</CardDescription>
        </CardHeader>
        <CardContent>
          {memberLoading ? (
            <p>Mitglieder werden geladen...</p>
          ) : members.length === 0 ? (
            <p className="text-gray-500">Noch keine Mitglieder in diesem Team.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitglied</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Beigetreten am</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const profile = getMemberProfile(member.userId);
                  const isCurrentUser = member.userId === currentUser?.uid;
                  return (
                    <TableRow key={member.userId}>
                      <TableCell>
                        {profile ? <TeamMemberAvatar member={profile} /> : 'Unbekanntes Mitglied'}
                      </TableCell>
                      <TableCell>
                        <Select
                          options={teamRoles}
                          value={member.role}
                          onValueChange={(value) => handleUpdateMemberRole(member.userId, value as UserRole)}
                          disabled={!isAdmin || isCurrentUser} // Only admin can change roles, not own role
                          className="w-[150px]"
                        />
                      </TableCell>
                      <TableCell>{member.joinedAt?.toDate().toLocaleDateString()}</TableCell>
                      <TableCell>
                        {isAdmin && !isCurrentUser && ( // Admin can remove others, not themselves
                          <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(member.userId)}>
                            Entfernen
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

      {/* Invite Links */}
      {canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Einladungslinks</CardTitle>
            <CardDescription>Generieren Sie Links, um neue Mitglieder in Ihr Team einzuladen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <Select
                label="Standardrolle für neue Mitglieder"
                options={teamRoles.filter(role => role.value !== UserRole.ADMIN)} // Cannot invite new admins directly
                value={inviteLinkRole}
                onValueChange={(value) => setInviteLinkRole(value as UserRole)}
                className="flex-grow"
              />
              <Button onClick={() => setIsInviteDialogOpen(true)} disabled={!canManageTeam}>
                Einladungslink generieren
              </Button>
            </div>

            {newInviteLink && (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border">
                <Input
                  value={newInviteLink}
                  readOnly
                  className="flex-grow bg-white"
                />
                <Button onClick={() => navigator.clipboard.writeText(newInviteLink!)} variant="secondary" size="sm">
                  Kopieren
                </Button>
              </div>
            )}
            {inviteError && <p className="text-red-500 text-sm">{inviteError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        title="Einladungslink generieren"
        description="Dieser Link erlaubt es neuen Mitgliedern, Ihrem Team beizutreten."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleGenerateInviteLink} isLoading={isGeneratingInvite}>
              {isGeneratingInvite ? 'Generieren...' : 'Link generieren'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>
            Möchten Sie einen Einladungslink mit der Rolle{' '}
            <span className="font-semibold">{teamRoles.find(r => r.value === inviteLinkRole)?.label}</span> generieren?
          </p>
          {newInviteLink && (
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border">
              <Input value={newInviteLink} readOnly className="flex-grow bg-white" />
              <Button onClick={() => navigator.clipboard.writeText(newInviteLink!)} variant="secondary" size="sm">
                Kopieren
              </Button>
            </div>
          )}
          {inviteError && <p className="text-red-500 text-sm">{inviteError}</p>}
        </div>
      </Dialog>

      {/* Join Team Dialog (from URL invite) */}
      <Dialog
        isOpen={isJoinTeamDialogOpen}
        onClose={() => setIsJoinTeamDialogOpen(false)}
        title="Team beitreten"
        description="Sie wurden eingeladen, diesem Team beizutreten."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsJoinTeamDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleJoinTeam} isLoading={isJoiningTeam}>
              {isJoiningTeam ? 'Beitreten...' : 'Jetzt beitreten'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleJoinTeam} className="space-y-4">
          {joinTeamError && <p className="text-red-500 text-sm">{joinTeamError}</p>}
          <p>Sie sind dabei, dem Team mit der ID <b>{joinTeamId}</b> beizutreten.</p>
          <p>Möchten Sie den Einladungslink mit der ID <b>{joinInviteId}</b> akzeptieren?</p>
        </form>
      </Dialog>
    </div>
  );
};

export default TeamSettingsPage;