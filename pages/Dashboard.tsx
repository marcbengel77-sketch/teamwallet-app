
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
import { AssignedPenalty, PenaltyCatalogItem } from '../types';

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

      // Hier lag der Fehler: getAssignedPenalties(teamId, limit, isPaid)
      const paidPenalties = await getAssignedPenalties(selectedTeam.id, 5, true);
      setLatestPaidPenalties(paidPenalties);

      const openPenalties = await getAssignedPenalties(selectedTeam.id, 5, false);
      setLatestAssignedPenalties(openPenalties);

      const catalog = await getPenaltyCatalog(selectedTeam.id);
      setPenaltyCatalog(catalog);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Fehler beim Laden der Daten.');
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
    try {
      const penaltyItem = penaltyCatalog.find((item) => item.id === selectedPenaltyCatalogId);
      if (!penaltyItem) throw new Error("Strafe nicht im Katalog.");
      
      await assignPenalty(selectedTeam.id, selectedPlayer, selectedPenaltyCatalogId, penaltyDate, penaltyItem.amount);
      await fetchData();
      setIsNewPenaltyModalOpen(false);
      setSelectedPlayer('');
      setSelectedPenaltyCatalogId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigningPenalty(false);
    }
  };

  const handleMarkAsPaid = async (penaltyId: string, memberId: string) => {
    setLoading(true);
    try {
      await markPenaltyAsPaid(penaltyId, memberId);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTeam) return <div className="p-8 text-center mt-24"><LoadingSpinner /></div>;

  return (
    <div className="container mx-auto mt-24 p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-4xl font-extrabold text-gray-900">{selectedTeam.name}</h2>
        <button onClick={handleAIAnalysis} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition">✨ KI-Check</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-indigo-500 text-center">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Kassenstand</h3>
          <p className="text-4xl font-black text-indigo-600">{cashBalance.toFixed(2)} €</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-red-500 text-center">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Offen</h3>
          <p className="text-4xl font-black text-red-600">{openPenaltiesAmount.toFixed(2)} €</p>
        </div>
        {(isAdmin || isViceAdmin) && (
          <button onClick={() => setIsNewPenaltyModalOpen(true)} className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl font-bold text-xl hover:bg-indigo-700 transition">
            Strafe vergeben +
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">📋 Offene Posten</h3>
          {latestAssignedPenalties.length === 0 ? <p className="text-gray-400">Alles bezahlt!</p> : (
            <div className="space-y-4">
              {latestAssignedPenalties.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition border border-gray-100">
                  <div>
                    <div className="font-bold text-gray-800">{p.member_name}</div>
                    <div className="text-xs text-gray-500">{p.penalty_name} • {p.date_assigned}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-red-600">-{p.amount.toFixed(2)}€</span>
                    {(isAdmin || isViceAdmin) && (
                      <button onClick={() => handleMarkAsPaid(p.id, p.user_id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">✓</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">💰 Letzte Zahlungen</h3>
          <div className="space-y-4">
            {latestPaidPenalties.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl">
                <div>
                  <div className="font-bold text-gray-800">{p.member_name}</div>
                  <div className="text-xs text-gray-500">{p.penalty_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-green-600">+{p.amount.toFixed(2)}€</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isNewPenaltyModalOpen} onClose={() => setIsNewPenaltyModalOpen(false)} title="Strafe vergeben">
        <form onSubmit={handleAssignPenalty} className="space-y-4">
          <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none" value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} required>
            <option value="">Spieler wählen...</option>
            {userMemberships.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.user_profile?.full_name || m.user_profile?.email}</option>
            ))}
          </select>
          <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none" value={selectedPenaltyCatalogId} onChange={(e) => setSelectedPenaltyCatalogId(e.target.value)} required>
            <option value="">Strafe wählen...</option>
            {penaltyCatalog.map(item => (
              <option key={item.id} value={item.id}>{item.name} ({item.amount.toFixed(2)}€)</option>
            ))}
          </select>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50" disabled={assigningPenalty}>{assigningPenalty ? '...' : 'Eintragen'}</button>
        </form>
      </Modal>

      <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="KI-Analyse">
        <div className="py-4">
          {loadingAI ? <LoadingSpinner /> : <p className="bg-indigo-50 p-6 rounded-2xl italic">"{aiAnalysis}"</p>}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
