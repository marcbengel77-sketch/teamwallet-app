
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
import { AssignedPenalty, PenaltyCatalogItem } from '../types';

const Dashboard: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, isViceAdmin } = useTeam();
  const { user } = useAuth();

  const [cashBalance, setCashBalance] = useState<number>(0);
  const [openPenaltiesAmount, setOpenPenaltiesAmount] = useState<number>(0);
  const [latestAssignedPenalties, setLatestAssignedPenalties] = useState<AssignedPenalty[]>([]);
  const [penaltyCatalog, setPenaltyCatalog] = useState<PenaltyCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewPenaltyModalOpen, setIsNewPenaltyModalOpen] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedPenaltyCatalogId, setSelectedPenaltyCatalogId] = useState<string>('');
  const [penaltyDate, setPenaltyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assigning, setAssigning] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const summary = await getTeamFinancialSummary(selectedTeam.id);
      setCashBalance(summary.cashBalance);
      setOpenPenaltiesAmount(summary.openPenaltiesAmount);

      const openPenalties = await getAssignedPenalties(selectedTeam.id, 15, false);
      setLatestAssignedPenalties(openPenalties);

      const catalog = await getPenaltyCatalog(selectedTeam.id);
      setPenaltyCatalog(catalog);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsPaid = async (penaltyId: string, memberId: string) => {
    try {
      await markPenaltyAsPaid(penaltyId, memberId);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedPlayer || !selectedPenaltyCatalogId) return;
    setAssigning(true);
    try {
      const item = penaltyCatalog.find(i => i.id === selectedPenaltyCatalogId);
      await assignPenalty(selectedTeam.id, selectedPlayer, selectedPenaltyCatalogId, penaltyDate, item?.amount || 0);
      setIsNewPenaltyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const getPaypalUrl = (p: AssignedPenalty) => {
    if (!selectedTeam?.paypal_handle) return null;
    const handle = selectedTeam.paypal_handle.trim();
    const dateStr = new Date(p.date_assigned).toLocaleDateString('de-DE');
    const today = new Date().toLocaleDateString('de-DE');
    const description = `Strafe: ${p.penalty_name} | Erhalten: ${dateStr} | Bezahlt: ${today}`;
    
    return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(handle)}&amount=${p.amount.toFixed(2)}&currency_code=EUR&item_name=${encodeURIComponent(description)}&no_shipping=1`;
  };

  if (loading && !latestAssignedPenalties.length) return <div className="mt-24 flex justify-center"><LoadingSpinner /></div>;
  if (!selectedTeam) return <div className="mt-24 text-center">Kein Team ausgewählt.</div>;

  return (
    <div className="container mx-auto mt-24 p-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">{selectedTeam.name}</h2>
        {(isAdmin || isViceAdmin) && (
          <button onClick={() => setIsNewPenaltyModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:scale-105 transition">
            Strafe eintragen +
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-indigo-500">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kassenstand</h3>
          <p className="text-3xl font-black text-indigo-600">{cashBalance.toFixed(2)} €</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-red-500">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Offene Strafen</h3>
          <p className="text-3xl font-black text-red-600">{openPenaltiesAmount.toFixed(2)} €</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">📋 Offene Posten</h3>
        {latestAssignedPenalties.length === 0 ? (
          <p className="text-center py-8 text-gray-400">Keine offenen Strafen. Alles sauber! ✨</p>
        ) : (
          <div className="space-y-4">
            {latestAssignedPenalties.map(p => {
              const ppUrl = getPaypalUrl(p);
              return (
                <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition">
                  <div>
                    <div className="font-bold text-gray-800">{p.member_name}</div>
                    <div className="text-xs text-gray-500">{p.penalty_name} • {new Date(p.date_assigned).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-red-600">-{p.amount.toFixed(2)}€</span>
                    
                    {ppUrl && (
                      <a 
                        href={ppUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-[#0070ba] hover:bg-[#003087] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-sm active:scale-95"
                        title="Direkt per PayPal bezahlen"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.067 8.178c-.644 4.542-3.667 6.967-8.067 6.967h-1.6c-.5 0-.8.3-.9 1.1l-1.1 6.8c-.1.6-.4.9-1 .9h-4.3c-.6 0-.9-.4-.8-1l2.4-15.1c.1-.6.5-1 1.1-1h6.6c4.6 0 7.8 2.2 7.6 6.333z"/>
                        </svg>
                        PayPal
                      </a>
                    )}

                    {(isAdmin || isViceAdmin) && (
                      <button 
                        onClick={() => handleMarkAsPaid(p.id, p.user_id)}
                        className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-green-600 hover:text-white transition"
                        title="Als bezahlt markieren"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isNewPenaltyModalOpen} onClose={() => setIsNewPenaltyModalOpen(false)} title="Strafe zuweisen">
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Mitglied</label>
            <select className="w-full border p-2 rounded" value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} required>
              <option value="">Wählen...</option>
              {userMemberships.map(m => <option key={m.user_id} value={m.user_id}>{m.user_profile?.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Grund (aus Katalog)</label>
            <select className="w-full border p-2 rounded" value={selectedPenaltyCatalogId} onChange={e => setSelectedPenaltyCatalogId(e.target.value)} required>
              <option value="">Wählen...</option>
              {penaltyCatalog.map(c => <option key={c.id} value={c.id}>{c.name} ({c.amount}€)</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold disabled:opacity-50" disabled={assigning}>
            {assigning ? 'Speichere...' : 'Eintragen'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
