
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
import { analyzeTeamFinances } from '../services/aiService';
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
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedPenaltyCatalogId, setSelectedPenaltyCatalogId] = useState<string>('');
  const [penaltyDate, setPenaltyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assigningPenalty, setAssigningPenalty] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    setError(null);
    try {
      const summary = await getTeamFinancialSummary(selectedTeam.id);
      setCashBalance(summary.cashBalance);
      setOpenPenaltiesAmount(summary.openPenaltiesAmount);

      const paidPenalties = await getAssignedPenalties(selectedTeam.id, 5, true);
      setLatestPaidPenalties(paidPenalties);

      const assignedPenalties = await getAssignedPenalties(selectedTeam.id, 5, undefined, false);
      setLatestAssignedPenalties(assignedPenalties);

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
    fetchData();
  }, [selectedTeam, fetchData]);

  const handleAIAnalysis = async () => {
    if (!selectedTeam) return;
    setLoadingAI(true);
    setIsAIModalOpen(true);
    try {
      const result = await analyzeTeamFinances(cashBalance, openPenaltiesAmount, selectedTeam.name);
      setAiAnalysis(result);
    } catch (err) {
      setAiAnalysis("KI-Analyse fehlgeschlagen.");
    } finally {
      setLoadingAI(false);
    }
  };

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
      await fetchData();
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
    if (!user) return;
    setLoading(true);
    try {
      await markPenaltyAsPaid(penaltyId, userId);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Markieren.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTeam) {
    return (
      <div className="container mx-auto mt-24 p-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Willkommen!</h2>
        <p className="text-lg text-gray-600">Bitte wählen Sie ein Team aus.</p>
      </div>
    );
  }

  if (loading && !latestAssignedPenalties.length) {
    return <div className="container mx-auto mt-24 p-4"><LoadingSpinner /></div>;
  }

  return (
    <div className="container mx-auto mt-24 p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-4xl font-extrabold text-gray-900">{selectedTeam.name}</h2>
        <button 
          onClick={handleAIAnalysis}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-full shadow-lg flex items-center gap-2 transform transition hover:scale-105 active:scale-95"
        >
          <span>✨</span> KI-Kassensturz
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-indigo-500 text-center">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Kassenstand</h3>
          <p className="text-4xl font-black text-indigo-600">{cashBalance.toFixed(2)} €</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-red-500 text-center">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Offene Forderungen</h3>
          <p className="text-4xl font-black text-red-600">{openPenaltiesAmount.toFixed(2)} €</p>
        </div>
        {(isAdmin || isViceAdmin) && (
          <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-center flex flex-col justify-center items-center text-white">
            <button
              onClick={() => setIsNewPenaltyModalOpen(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-3 px-8 rounded-xl shadow-md transition transform hover:scale-105"
            >
              Strafe vergeben
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-red-500">📋</span> Letzte offene Posten
          </h3>
          {latestAssignedPenalties.length === 0 ? (
            <p className="text-gray-500 italic">Keine offenen Strafen.</p>
          ) : (
            <div className="space-y-4">
              {latestAssignedPenalties.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition border border-transparent hover:border-gray-200">
                  <div>
                    <div className="font-bold text-gray-800">{p.member_name}</div>
                    <div className="text-sm text-gray-500">{p.penalty_name} • {p.date_assigned}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-red-600">-{p.amount.toFixed(2)} €</span>
                    {(isAdmin || isViceAdmin) && (
                      <button 
                        onClick={() => handleMarkAsPaid(p.id, p.user_id)}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                        title="Bezahlt"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-green-500">💰</span> Letzte Zahlungseingänge
          </h3>
          {latestPaidPenalties.length === 0 ? (
            <p className="text-gray-500 italic">Noch keine Zahlungen.</p>
          ) : (
            <div className="space-y-4">
              {latestPaidPenalties.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition">
                  <div>
                    <div className="font-bold text-gray-800">{p.member_name}</div>
                    <div className="text-sm text-gray-500">{p.penalty_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-600">+{p.amount.toFixed(2)} €</div>
                    <div className="text-xs text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Modal */}
      <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="✨ KI-Finanzanalyse">
        <div className="py-4">
          {loadingAI ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-gray-500 animate-pulse">Kassenwart Gemini rechnet gerade...</p>
            </div>
          ) : (
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <p className="text-indigo-900 leading-relaxed text-lg italic font-serif">
                "{aiAnalysis}"
              </p>
              <div className="mt-4 text-right text-xs text-indigo-400 font-bold uppercase tracking-widest">
                — Gemini AI Kassenwart
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsAIModalOpen(false)}
            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg"
          >
            Verstanden, Coach!
          </button>
        </div>
      </Modal>

      {/* Neue Strafe Modal */}
      <Modal isOpen={isNewPenaltyModalOpen} onClose={() => setIsNewPenaltyModalOpen(false)} title="Neue Strafe vergeben">
        <form onSubmit={handleAssignPenalty} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Spieler</label>
            <select
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              required
            >
              <option value="">Wähle ein Mitglied...</option>
              {userMemberships.filter(m => m.status === 'active').map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_profile?.full_name || m.user_profile?.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Vergehen</label>
            <select
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedPenaltyCatalogId}
              onChange={(e) => setSelectedPenaltyCatalogId(e.target.value)}
              required
            >
              <option value="">Wähle eine Strafe...</option>
              {penaltyCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.amount.toFixed(2)} €)
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50"
            disabled={assigningPenalty}
          >
            {assigningPenalty ? 'Wird eingetragen...' : 'Strafe jetzt vergeben'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
