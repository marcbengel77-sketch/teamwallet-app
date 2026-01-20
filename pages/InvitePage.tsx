
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { getInviteLink, addTeamMember, invalidateInviteLink, getTeamMember, getTeamById } from '../services/firestoreService'; // Added getTeamById
import Button from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { UserRole } from '../types';

const InvitePage: React.FC = () => {
  const { inviteId: fullInviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { refetchTeams, selectTeam } = useTeam();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<UserRole | null>(null);
  const [isValidInvite, setIsValidInvite] = useState(false);

  const [teamId, inviteId] = fullInviteId ? fullInviteId.split(':') : [null, null];

  const handleAcceptInvite = useCallback(async () => {
    if (!currentUser || !teamId || !inviteId || !inviteRole) {
      setError('Fehler: Unzureichende Informationen, um der Einladung beizutreten.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Check if user is already a member
      const existingMembership = await getTeamMember(teamId, currentUser.uid);
      if (existingMembership) {
        setError('Sie sind bereits Mitglied dieses Teams.');
        selectTeam(teamId);
        navigate('/');
        return;
      }

      await addTeamMember(teamId, currentUser.uid, inviteRole);
      await invalidateInviteLink(teamId, inviteId); // Invalidate after successful use
      await refetchTeams(); // Refresh user's teams in context
      selectTeam(teamId); // Set this team as the active team
      navigate('/'); // Redirect to dashboard
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      setError(err.message || 'Fehler beim Beitritt zum Team.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, teamId, inviteId, inviteRole, refetchTeams, selectTeam, navigate]);

  useEffect(() => {
    const checkInvite = async () => {
      if (!fullInviteId || !currentUser) {
        if (!currentUser && !authLoading) {
            // If not logged in, but auth loading is done, redirect to auth to log in/register
            navigate(`/auth?inviteId=${fullInviteId}`);
        }
        setIsLoading(false);
        return;
      }

      if (!teamId || !inviteId) {
        setError('Ungültiger Einladungslink-Format.');
        setIsLoading(false);
        return;
      }

      try {
        const invite = await getInviteLink(teamId, inviteId);
        if (invite && invite.isValid) {
          setIsValidInvite(true);
          setInviteRole(invite.role);
          // Fetch team details to display
          const team = await getTeamById(teamId); // Assuming getTeamById exists in firestoreService
          if (team) {
            setTeamName(team.name);
          } else {
            setError('Team nicht gefunden.');
          }
        } else {
          setError('Einladungslink ist ungültig oder abgelaufen.');
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Ein Fehler ist aufgetreten beim Überprüfen des Links.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
        checkInvite();
    }
  }, [fullInviteId, currentUser, authLoading, teamId, inviteId, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] p-4">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Fehler</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{error}</CardDescription>
            <Button className="mt-4" onClick={() => navigate('/')}>Zurück zum Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidInvite || !teamName || !inviteRole) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Einladung ungültig</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Dieser Einladungslink ist ungültig oder abgelaufen.</CardDescription>
            <Button className="mt-4" onClick={() => navigate('/')}>Zurück zum Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Team-Einladung</CardTitle>
          <CardDescription>Sie wurden eingeladen, dem Team <span className="font-semibold">{teamName}</span> beizutreten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Als {inviteRole} erhalten Sie Zugriff auf die Teamkasse.</p>
          <Button onClick={handleAcceptInvite} isLoading={isLoading}>
            {isLoading ? 'Beitreten...' : 'Einladung annehmen'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} disabled={isLoading}>
            Ablehnen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage;