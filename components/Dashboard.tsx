
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Role, PenaltyRecord, Transaction } from '../types';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { CreditCard, Wallet, TrendingUp, AlertCircle, Sparkles, PlusCircle, Search, X, Check, Loader2, UserPlus, Copy } from 'lucide-react';
import { Statistics } from './Statistics';
import { generateAIWeeklyReport } from '../services/geminiService';

interface DashboardProps {
  activeTeamId: string;
  currentUser: UserProfile;
  addToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeTeamId, currentUser, addToast }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'transactions' | 'stats'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('member');
  
  const [records, setRecords] = useState<PenaltyRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Roles Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, `teams/${activeTeamId}/members/${currentUser.id}`), (doc) => {
      if (doc.exists()) {
        setRole(doc.data().role as Role);
      }
    });
    return () => unsubscribe();
  }, [activeTeamId, currentUser.id]);

  // Penalties Listener
  useEffect(() => {
    const q = collection(db, `teams/${activeTeamId}/penalties`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PenaltyRecord));
      setRecords(items.sort((a, b) => b.date.localeCompare(a.date)));
    });
    return () => unsubscribe();
  }, [activeTeamId]);

  // Transactions Listener
  useEffect(() => {
    const q = collection(db, `teams/${activeTeamId}/transactions`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(items.sort((a, b) => b.date.localeCompare(a.date)));
    });
    return () => unsubscribe();
  }, [activeTeamId]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    return records.filter(r => 
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const stats = useMemo(() => {
    const totalPaid = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
    const totalOpen = records.filter(r => r.status === 'open').reduce((sum, r) => sum + r.amount, 0);
    const personalOpen = records.filter(r => r.userId === currentUser.id && r.status === 'open').reduce((sum, r) => sum + r.amount, 0);
    
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;

    return { totalPaid, totalOpen, personalOpen, balance };
  }, [records, transactions, currentUser.id]);

  const togglePaidStatus = async (id: string) => {
    if (role === 'member') return;
    try {
      const recordRef = doc(db, `teams/${activeTeamId}/penalties/${id}`);
      const record = records.find(r => r.id === id);
      if (!record) return;
      
      const newStatus = record.status === 'paid' ? 'open' : 'paid';
      await updateDoc(recordRef, { status: newStatus });
      addToast(`Status auf ${newStatus === 'paid' ? 'Bezahlt' : 'Offen'} gesetzt.`, 'success');
    } catch (e) {
      addToast("Fehler beim Aktualisieren.", "error");
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    try {
      const report = await generateAIWeeklyReport(records, transactions);
      setAiReport(report);
      addToast("KI-Bericht erstellt!", "success");
    } catch (error) {
      addToast("KI-Bericht fehlgeschlagen. Prüfe API Key.", "error");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${activeTeamId}`;
    navigator.clipboard.writeText(link);
    addToast("Einladungslink kopiert!", "success");
  };

  const isAdmin = role === 'admin' || role === 'vice-admin';

  return (
    <div className="space-y-6">
      {/* Top Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium">Alles im Griff, Kassenwart.</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={copyInviteLink}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition shadow-sm active:scale-95"
            >
              <UserPlus size={18} className="text-blue-600" />
              <span>Einladen</span>
            </button>
            <button 
              onClick={() => addToast("Funktion wird in Kürze freigeschaltet!", "info")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95"
            >
              <PlusCircle size={18} />
              <span>Strafe</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Wallet />} label="Kassenstand" value={stats.balance} color="green" />
        <KpiCard icon={<AlertCircle />} label="Offen (Team)" value={stats.totalOpen} color="amber" />
        <KpiCard icon={<TrendingUp />} label="Einnahmen" value={stats.totalPaid} color="blue" />
        <KpiCard icon={<CreditCard />} label="Deine Schulden" value={stats.personalOpen} color="blue" highlight />
      </div>

      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Sparkles className={isGeneratingReport ? "animate-spin" : "animate-pulse"} size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Wochenbericht der Schande</h2>
          </div>
          <p className="text-blue-50 text-sm max-w-md mb-6 leading-relaxed">Unser KI-Kassenwart analysiert die Sünden der Woche. Perfekt für den Team-Chat!</p>
          <button 
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="bg-white text-blue-700 px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isGeneratingReport ? <Loader2 className="animate-spin" size={18} /> : 'Bericht generieren'}
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors"></div>
      </div>

      {aiReport && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles size={16} className="text-blue-500" /> KI-Analyse</h3>
            <button onClick={() => setAiReport(null)} className="p-1 hover:bg-slate-100 rounded-full transition"><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed italic whitespace-pre-line">
            "{aiReport}"
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b bg-slate-50/30">
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Strafen" />
          <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} label="Konto" />
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Stats" />
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Sünder oder Strafe suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredRecords.length > 0 ? filteredRecords.map(record => (
                  <div key={record.id} className="group p-3 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={record.userAvatar} alt={record.userName} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm" />
                        <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ring-2 ring-white ${record.status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {record.status === 'paid' ? <Check size={8} className="text-white" /> : <X size={8} className="text-white" />}
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{record.userName}</p>
                        <p className="text-xs text-slate-500 font-medium">{record.categoryName} • {record.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{record.amount.toFixed(2)}€</p>
                      </div>
                      {role !== 'member' && (
                        <button 
                          onClick={() => togglePaidStatus(record.id)}
                          className={`p-2 rounded-lg transition-colors ${record.status === 'paid' ? 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500' : 'bg-blue-50 text-blue-600 hover:bg-green-50 hover:text-green-600'}`}
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400 font-medium">Noch keine Einträge vorhanden.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
             <div className="space-y-4">
               <div className="divide-y border rounded-xl overflow-hidden">
                 {transactions.length > 0 ? transactions.map(t => (
                   <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                     <div className="flex items-center gap-4">
                       <div className={`p-2.5 rounded-xl ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                         {t.type === 'income' ? <TrendingUp size={20} /> : <AlertCircle size={20} />}
                       </div>
                       <div>
                         <p className="font-bold text-slate-800 text-sm">{t.purpose}</p>
                         <p className="text-xs text-slate-500 font-medium">{t.date}</p>
                       </div>
                     </div>
                     <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                       {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}€
                     </p>
                   </div>
                 )) : (
                   <div className="p-12 text-center text-slate-400">Keine Kontobewegungen.</div>
                 )}
               </div>
             </div>
          )}

          {activeTab === 'stats' && <Statistics records={records} />}
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: any, label: string, value: number, color: string, highlight?: boolean }> = ({ icon, label, value, color, highlight }) => {
  const colorMap: Record<string, string> = {
    green: highlight ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600',
    amber: highlight ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600',
    blue: highlight ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-blue-50 text-blue-600'
  };

  return (
    <div className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.02] ${highlight ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
      <div className={`w-fit p-2 rounded-xl mb-4 ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</p>
        <h3 className="text-xl font-bold text-slate-900 mt-0.5">{value.toFixed(2)}€</h3>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${active ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 border-b-2 border-transparent'}`}
  >
    {label}
  </button>
);
