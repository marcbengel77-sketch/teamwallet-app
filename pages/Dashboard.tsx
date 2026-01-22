
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import {
  getAssignedPenalties,
  getTeamFinancialSummary,
  getPenaltyCatalog,
  assignPenalty,
  markPenaltyAsPaid,
} from '../services/penaltyService';
import { AssignedPenalty, PenaltyCatalogItem, Membership, TransactionType, UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, isViceAdmin } = useTeam();
  const { user } = useAuth();

  const [cashBalance, setCashBalance] = useState<number>(0);
  const [openPenaltiesAmount, setOpenPenaltiesAmount] = useState<number>(0);
  const [latestPaidPenalties, setLatestPaidPenalties] = useState<AssignedPenalty[]>([]);
  const [latestAssignedPenalties, setLatestAssignedPenalties] = useState<AssignedPenalty[]>([]);
  const [penaltyCatalog, setPenaltyCatalog] = useState<PenaltyCatalogItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewPenaltyModalOpen, setIsNewPenaltyModalOpen] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedPenaltyCatalogId, setSelectedPenaltyCatalogId] = useState<string>('');
  const [penaltyDate, setPenaltyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assigningPenalty, setAssigningPenalty] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    setError(null);
    try {
      // Finanzübersicht
      const summary = await getTeamFinancialSummary(selectedTeam.id);
      setCashBalance(summary.cashBalance);
      setOpenPenaltiesAmount(summary.openPenaltiesAmount);

      // Letzte 5 bezahlte Strafen
      const paidPenalties = await getAssignedPenalties(selectedTeam.id, 5, true);
      setLatestPaidPenalties(paidPenalties);

      // Letzte 5 vergebene Strafen
      const assignedPenalties = await getAssignedPenalties(selectedTeam.id, 5, undefined, false); // Only show unpaid here, otherwise it's just 'latest' regardless of status
      setLatestAssignedPenalties(assignedPenalties);

      // Strafenkatalog für das Formular
      const catalog = await getPenaltyCatalog(selectedTeam.id);
      setPenaltyCatalog(catalog);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Fehler beim Laden der Dashboard-Daten.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchData();
  }, [selectedTeam, fetchData]);

  const handleAssignPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !user || !selectedPlayer || !selectedPenaltyCatalogId || !penaltyDate) {
      setError('Bitte füllen Sie alle Felder aus.');
      return;
    }

    setAssigningPenalty(true);
    setError(null);
    try {
      const penaltyItem = penaltyCatalog.find((item) => item.id === selectedPenaltyCatalogId);
      if (!penaltyItem) {
        setError('Ausgewählte Strafe nicht im Katalog gefunden.');
        return;
      }
      await assignPenalty(selectedTeam.id, selectedPlayer, selectedPenaltyCatalogId, penaltyDate, penaltyItem.amount);
      await fetchData(); // Daten neu laden
      setIsNewPenaltyModalOpen(false);
      setSelectedPlayer('');
      setSelectedPenaltyCatalogId('');
      setPenaltyDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Failed to assign penalty:', err);
      setError(err.message || 'Fehler beim Vergeben der Strafe.');
    } finally {
      setAssigningPenalty(false);
    }
  };

  const handleMarkAsPaid = async (penaltyId: string, userId: string) => {
    if (!user) {
      setError('Sie müssen angemeldet sein, um Strafen zu markieren.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await markPenaltyAsPaid(penaltyId, userId);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to mark penalty as paid:', err);
      setError(err.message || 'Fehler beim Markieren der Strafe als bezahlt.');
    } finally {
      setLoading(false);
    }
  };


  if (!selectedTeam) {
    return (
      <div className="container mx-auto mt-24 p-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Willkommen!</h2>
        <p className="text-lg text-gray-600">Bitte wählen Sie ein Team aus oder erstellen Sie ein neues Team im <a href="#/setup" className="text-indigo-600 hover:underline">Setup-Bereich</a>.</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto mt-24 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-24 p-4">
      <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">{selectedTeam.name} Dashboard</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Finanzübersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Kassenstand (Aktuell)</h3>
          <p className="text-4xl font-bold text-indigo-600">{cashBalance.toFixed(2)} €</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Offene Strafen (Soll)</h3>
          <p className="text-4xl font-bold text-red-600">{openPenaltiesAmount.toFixed(2)} €</p>
        </div>
        {(isAdmin || isViceAdmin) && (
          <div className="bg-indigo-600 p-6 rounded-lg shadow-lg text-center flex flex-col justify-center items-center">
            <h3 className="text-xl font-semibold text-white mb-4">Aktion</h3>
            <button
              onClick={() => setIsNewPenaltyModalOpen(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-100 font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Neue Strafe vergeben
            </button>
          </div>
        )}
      </div>

      {/* Letzte Strafen Tabellen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Letzte 5 vergebene Strafen</h3>
          {latestAssignedPenalties.length === 0 ? (
            <p className="text-gray-600">Keine offenen Strafen vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Spieler</th>
                    <th className="py-3 px-6 text-left">Strafe</th>
                    <th className="py-3 px-6 text-left">Betrag</th>
                    <th className="py-3 px-6 text-left">Datum</th>
                    <th className="py-3 px-6 text-left">Status</th>
                    <th className="py-3 px-6 text-left">Aktion</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {latestAssignedPenalties.map((penalty) => (
                    <tr key={penalty.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">{penalty.member_name}</td>
                      <td className="py-3 px-6 text-left">{penalty.penalty_name}</td>
                      <td className="py-3 px-6 text-left">{penalty.amount.toFixed(2)} €</td>
                      <td className="py-3 px-6 text-left">{penalty.date_assigned}</td>
                      <td className="py-3 px-6 text-left">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${penalty.is_paid ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                          {penalty.is_paid ? 'Bezahlt' : 'Offen'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-left">
                        {!penalty.is_paid && (isAdmin || isViceAdmin) && (
                          <button
                            onClick={() => handleMarkAsPaid(penalty.id, penalty.user_id)}
                            className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-md text-xs transition duration-300"
                            disabled={loading}
                          >
                            Als bezahlt markieren
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Letzte 5 bezahlte Strafen</h3>
          {latestPaidPenalties.length === 0 ? (
            <p className="text-gray-600">Noch keine Strafen bezahlt.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Spieler</th>
                    <th className="py-3 px-6 text-left">Strafe</th>
                    <th className="py-3 px-6 text-left">Betrag</th>
                    <th className="py-3 px-6 text-left">Datum Bezahlt</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {latestPaidPenalties.map((penalty) => (
                    <tr key={penalty.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">{penalty.member_name}</td>
                      <td className="py-3 px-6 text-left">{penalty.penalty_name}</td>
                      <td className="py-3 px-6 text-left">{penalty.amount.toFixed(2)} €</td>
                      <td className="py-3 px-6 text-left">{penalty.paid_at ? new Date(penalty.paid_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal für neue Strafe */}
      <Modal isOpen={isNewPenaltyModalOpen} onClose={() => setIsNewPenaltyModalOpen(false)} title="Neue Strafe vergeben">
        <form onSubmit={handleAssignPenalty} className="space-y-4">
          <div>
            <label htmlFor="player" className="block text-gray-700 text-sm font-bold mb-2">
              Spieler
            </label>
            <select
              id="player"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              required
              disabled={assigningPenalty}
            >
              <option value="">Spieler auswählen</option>
              {userMemberships.filter(m => m.status === 'active').map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user_profile?.full_name || member.user_profile?.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="penaltyType" className="block text-gray-700 text-sm font-bold mb-2">
              Strafe
            </label>
            <select
              id="penaltyType"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={selectedPenaltyCatalogId}
              onChange={(e) => setSelectedPenaltyCatalogId(e.target.value)}
              required
              disabled={assigningPenalty}
            >
              <option value="">Strafe auswählen</option>
              {penaltyCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.amount.toFixed(2)} €)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="penaltyDate" className="block text-gray-700 text-sm font-bold mb-2">
              Datum der Strafe
            </label>
            <input
              type="date"
              id="penaltyDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={penaltyDate}
              onChange={(e) => setPenaltyDate(e.target.value)}
              required
              disabled={assigningPenalty}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={assigningPenalty}
          >
            {assigningPenalty ? <LoadingSpinner /> : 'Strafe vergeben'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
