
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  deleteAssignedPenalty,
  recordExpense
} from '../services/penaltyService';
import { analyzeTeamFinances, analyzeReceipt } from '../services/aiService';
import { AssignedPenalty, PenaltyCatalogItem } from '../types';

const Dashboard: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, isViceAdmin } = useTeam();
  const { user } = useAuth();

  const [cashBalance, setCashBalance] = useState<number>(0);
  const [openPenaltiesAmount, setOpenPenaltiesAmount] = useState<number>(0);
  const [latestAssignedPenalties, setLatestAssignedPenalties] = useState<AssignedPenalty[]>([]);
  const [penaltyCatalog, setPenaltyCatalog] = useState<PenaltyCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzingFinances, setAnalyzingFinances] = useState(false);

  const [isNewPenaltyModalOpen, setIsNewPenaltyModalOpen] = useState<boolean>(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedPenaltyCatalogId, setSelectedPenaltyCatalogId] = useState<string>('');
  const [penaltyDate, setPenaltyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assigning, setAssigning] = useState<boolean>(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!selectedTeam) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const [summary, openPenalties, catalog] = await Promise.all([
        getTeamFinancialSummary(selectedTeam.id),
        getAssignedPenalties(selectedTeam.id, 5, false),
        getPenaltyCatalog(selectedTeam.id)
      ]);

      setCashBalance(summary.cashBalance);
      setOpenPenaltiesAmount(summary.openPenaltiesAmount);
      setLatestAssignedPenalties(openPenalties);
      setPenaltyCatalog(catalog);
    } catch (err: any) {
      console.error('Fehler beim Laden der Dashboard-Daten:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedTeam]);

  const fetchAiAnalysis = useCallback(async () => {
    if (!selectedTeam || analyzingFinances) return;
    setAnalyzingFinances(true);
    try {
      const analysis = await analyzeTeamFinances(cashBalance, openPenaltiesAmount, selectedTeam.name);
      setAiAnalysis(analysis);
    } catch (e) {
      setAiAnalysis("");
    } finally {
      setAnalyzingFinances(false);
    }
  }, [selectedTeam, cashBalance, openPenaltiesAmount, analyzingFinances]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if ((cashBalance > 0 || openPenaltiesAmount > 0) && !aiAnalysis) {
      fetchAiAnalysis();
    }
  }, [cashBalance, openPenaltiesAmount, fetchAiAnalysis, aiAnalysis]);

  const handleMarkAsPaid = async (penaltyId: string, memberId: string) => {
    if (!window.confirm("Zahlung wirklich bestätigen?")) return;
    try {
      await markPenaltyAsPaid(penaltyId, memberId);
      await fetchData(false);
    } catch (err: any) {
      alert("Fehler beim Markieren als bezahlt: " + err.message);
    }
  };

  const handleDeletePenalty = async (penaltyId: string) => {
    if (!window.confirm("Soll diese Strafe wirklich unwiderruflich gelöscht werden?")) return;
    try {
      await deleteAssignedPenalty(penaltyId);
      await fetchData(false);
    } catch (err: any) {
      alert("Fehler beim Löschen der Strafe: " + err.message);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedPlayer || !selectedPenaltyCatalogId) {
      alert("Bitte fülle alle Felder aus.");
      return;
    }
    
    setAssigning(true);
    try {
      const item = penaltyCatalog.find(i => i.id === selectedPenaltyCatalogId);
      if (!item) throw new Error("Strafe nicht im Katalog gefunden.");

      await assignPenalty(
        selectedTeam.id, 
        selectedPlayer, 
        selectedPenaltyCatalogId, 
        penaltyDate, 
        item.amount
      );
      
      setIsNewPenaltyModalOpen(false);
      setSelectedPlayer('');
      setSelectedPenaltyCatalogId('');
      setPenaltyDate(new Date().toISOString().split('T')[0]);
      
      setTimeout(() => fetchData(false), 300);
    } catch (err: any) {
      alert("Fehler beim Speichern: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setAssigning(false);
    }
  };

  const triggerScan = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setIsScanModalOpen(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await analyzeReceipt(base64);
          setScanResult(result);
        } catch (err) {
          alert("Beleg-Analyse fehlgeschlagen.");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Fehler beim Dateizugriff");
      setIsScanning(false);
      setIsScanModalOpen(false);
    }
  };

  const confirmExpense = async () => {
    if (!selectedTeam || !user || !scanResult) return;
    setAssigning(true);
    try {
      await recordExpense(selectedTeam.id, scanResult.amount, scanResult.merchant + ": " + (scanResult.description || ""), scanResult.category, user.id);
      setIsScanModalOpen(false);
      setScanResult(null);
      await fetchData(false);
    } catch (err) {
      alert("Fehler beim Speichern der Ausgabe");
    } finally {
      setAssigning(false);
    }
  };

  const getPaypalUrl = (p: AssignedPenalty) => {
    if (!selectedTeam?.paypal_handle) return null;
    const handle = selectedTeam.paypal_handle.trim();
    const dateStr = new Date(p.date_assigned).toLocaleDateString('de-DE');
    const description = `Strafe: ${p.penalty_name} (${dateStr})`;
    
    return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(handle)}&amount=${p.amount.toFixed(2)}&currency_code=EUR&item_name=${encodeURIComponent(description)}&no_shipping=1`;
  };

  if (loading && !latestAssignedPenalties.length) return <div className="mt-40 flex justify-center"><LoadingSpinner /></div>;
  if (!selectedTeam) return <div className="mt-40 text-center p-4">Kein Team ausgewählt.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-36 sm:pt-40 pb-10">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-10 gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight break-words">{selectedTeam.name}</h2>
          <p className="text-slate-500 text-sm font-medium">Finanzielle Übersicht</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={() => fetchData()}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            title="Aktualisieren"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          {(isAdmin || isViceAdmin) && (
            <button 
              onClick={triggerScan}
              className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              Scan
            </button>
          )}
          {(isAdmin || isViceAdmin) && (
            <button 
              onClick={() => setIsNewPenaltyModalOpen(true)} 
              className="flex-[2] sm:flex-none bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-sm whitespace-nowrap"
            >
              Strafe +
            </button>
          )}
        </div>
      </div>

      {aiAnalysis && (
        <div className="mb-8 bg-white border border-indigo-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-start shadow-sm">
          <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-md shadow-indigo-100 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">KI-Analyse</h4>
            <p className="text-sm text-indigo-900 font-medium leading-relaxed italic">"{aiAnalysis}"</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kassenstand</h3>
            <span className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg">💰</span>
          </div>
          <p className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{cashBalance.toFixed(2)} €</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ausstehend</h3>
            <span className="text-red-600 bg-red-50 p-1.5 rounded-lg">⚖️</span>
          </div>
          <p className="text-3xl font-black text-slate-900 group-hover:text-red-600 transition-colors">{openPenaltiesAmount.toFixed(2)} €</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-lg text-white hidden lg:flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Saison</p>
            <p className="text-xl font-black mt-1">2025/26 🚀</p>
          </div>
          <div className="text-[10px] font-medium opacity-60">Vollständig synchronisiert</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 sm:px-6 sm:py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-sm sm:text-lg font-black text-slate-800 flex items-center gap-2">📋 Letzte offene Strafen</h3>
          <span className="text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{latestAssignedPenalties.length}</span>
        </div>
        
        {latestAssignedPenalties.length === 0 ? (
          <div className="text-center py-16 px-4">
            <span className="text-5xl mb-4 block">🥳</span>
            <p className="text-slate-500 font-bold">Keine offenen Schulden!</p>
            <p className="text-xs text-slate-400 mt-2">Das Team hat eine weiße Weste.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-hidden relative">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mitglied</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Grund</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Betrag</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {latestAssignedPenalties.map(p => {
                  const ppUrl = getPaypalUrl(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">{p.member_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{new Date(p.date_assigned).toLocaleDateString('de-DE')}</div>
                        <div className="sm:hidden text-[10px] text-indigo-600 mt-0.5 italic">{p.penalty_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-xs font-medium text-slate-600">{p.penalty_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-black text-red-600">-{p.amount.toFixed(2)}€</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end items-center gap-1.5 sm:gap-2">
                          {ppUrl && (
                            <a href={ppUrl} target="_blank" rel="noopener noreferrer" className="bg-[#0070ba] text-white p-2 rounded-lg hover:opacity-80 transition-all flex items-center justify-center" title="PayPal">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.067 8.178c-.644 4.542-3.667 6.967-8.067 6.967h-1.6c-.5 0-.8.3-.9 1.1l-1.1 6.8c-.1.6-.4.9-1 .9h-4.3c-.6 0-.9-.4-.8-1l2.4-15.1c.1-.6.5-1 1.1-1h6.6c4.6 0 7.8 2.2 7.6 6.333z"/></svg>
                            </a>
                          )}
                          {(isAdmin || isViceAdmin) && (
                            <button 
                              onClick={() => handleMarkAsPaid(p.id, p.user_id)} 
                              className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-600 hover:text-white transition-all font-bold"
                              title="Bezahlt"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </button>
                          )}
                          {(isAdmin || isViceAdmin) && (
                            <button 
                              onClick={() => handleDeletePenalty(p.id)} 
                              className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                              title="Löschen"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} title="KI Beleg-Scan">
        {isScanning ? (
          <div className="py-12 text-center">
            <LoadingSpinner />
            <p className="mt-4 text-slate-500 font-bold animate-pulse text-sm">Beleg wird ausgelesen...</p>
          </div>
        ) : scanResult && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gefundene Belegdaten</p>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Händler</p>
                  <p className="font-bold text-slate-800 break-words">{scanResult.merchant}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Betrag</p>
                  <p className="font-black text-indigo-600 text-lg">{scanResult.amount.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Kategorie</p>
                  <p className="text-sm font-bold text-slate-700">{scanResult.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Zweck</p>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">{scanResult.description}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={confirmExpense} 
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
              disabled={assigning}
            >
              {assigning ? 'Speichert...' : 'Als Ausgabe verbuchen'}
            </button>
          </div>
        )}
      </Modal>

      <Modal isOpen={isNewPenaltyModalOpen} onClose={() => setIsNewPenaltyModalOpen(false)} title="Strafe eintragen">
        <form onSubmit={handleAssign} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mitglied</label>
            <select 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" 
              value={selectedPlayer} 
              onChange={e => setSelectedPlayer(e.target.value)} 
              required
            >
              <option value="">Bitte wählen...</option>
              {userMemberships.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_profile?.full_name || m.user_profile?.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vergehen</label>
            <select 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" 
              value={selectedPenaltyCatalogId} 
              onChange={e => setSelectedPenaltyCatalogId(e.target.value)} 
              required
            >
              <option value="">Aus Katalog wählen...</option>
              {penaltyCatalog.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.amount.toFixed(2)}€)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Datum</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={penaltyDate} 
              onChange={e => setPenaltyDate(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 mt-2" 
            disabled={assigning}
          >
            {assigning ? 'Wird gespeichert...' : 'Strafe jetzt buchen'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
