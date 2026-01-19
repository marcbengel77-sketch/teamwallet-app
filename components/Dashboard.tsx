
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Role, PenaltyRecord, Transaction, TeamMember, PenaltyCategory } from '../types';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, getDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { CreditCard, Wallet, TrendingUp, AlertCircle, Sparkles, PlusCircle, Search, X, Check, Loader2, UserPlus, Copy, Filter, MinusCircle, ShoppingCart } from 'lucide-react';
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
  
  const [showAddModal, setShowAddModal] = useState<'penalty' | 'expense' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [records, setRecords] = useState<PenaltyRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [categories, setCategories] = useState<PenaltyCategory[]>([]);

  // Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');

  useEffect(() => {
    const unsubRole = onSnapshot(doc(db, `teams/${activeTeamId}/members/${currentUser.id}`), (doc) => {
      if (doc.exists()) setRole(doc.data().role as Role);
    });
    const unsubPenalties = onSnapshot(collection(db, `teams/${activeTeamId}/penalties`), (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PenaltyRecord)).sort((a, b) => b.date.localeCompare(a.date)));
    });
    const unsubTrans = onSnapshot(collection(db, `teams/${activeTeamId}/transactions`), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)).sort((a, b) => a.date.localeCompare(b.date)));
    });
    const unsubCats = onSnapshot(collection(db, `teams/${activeTeamId}/catalog`), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PenaltyCategory)));
    });
    const unsubMembers = onSnapshot(collection(db, `teams/${activeTeamId}/members`), async (snapshot) => {
      const list: TeamMember[] = [];
      for (const mDoc of snapshot.docs) {
        const uDoc = await getDoc(doc(db, 'users', mDoc.id));
        if (uDoc.exists()) list.push({ id: mDoc.id, ...uDoc.data(), role: mDoc.data().role } as TeamMember);
      }
      setMembers(list);
    });

    return () => { unsubRole(); unsubPenalties(); unsubTrans(); unsubCats(); unsubMembers(); };
  }, [activeTeamId, currentUser.id]);

  const stats = useMemo(() => {
    const totalPaid = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
    const totalOpen = records.filter(r => r.status === 'open').reduce((sum, r) => sum + r.amount, 0);
    const personalOpen = records.filter(r => r.userId === currentUser.id && r.status === 'open').reduce((sum, r) => sum + r.amount, 0);
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalPaid, totalOpen, personalOpen, balance: income - expenses };
  }, [records, transactions, currentUser.id]);

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedCategoryId) return;
    setIsSubmitting(true);
    try {
      const user = members.find(m => m.id === selectedUserId);
      const category = categories.find(c => c.id === selectedCategoryId);
      if (!user || !category) return;
      await addDoc(collection(db, `teams/${activeTeamId}/penalties`), {
        userId: user.id, userName: user.name, userAvatar: user.avatarUrl,
        categoryId: category.id, categoryName: category.name, amount: category.amount,
        date: new Date().toISOString().split('T')[0], status: 'open'
      });
      addToast(`Strafe für ${user.name} eingetragen!`, "success");
      setShowAddModal(null);
    } catch (e) { addToast("Fehler beim Speichern.", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || !expensePurpose) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `teams/${activeTeamId}/transactions`), {
        type: 'expense',
        amount: amount,
        purpose: expensePurpose,
        date: new Date().toISOString().split('T')[0],
        createdBy: currentUser.id
      });
      addToast("Ausgabe erfolgreich gebucht.", "success");
      setExpenseAmount(''); setExpensePurpose(''); setShowAddModal(null);
    } catch (e) { addToast("Fehler beim Buchen.", "error"); }
    finally { setIsSubmitting(false); }
  };

  const togglePaidStatus = async (id: string) => {
    if (role === 'member') return;
    const record = records.find(r => r.id === id);
    if (!record) return;
    const newStatus = record.status === 'paid' ? 'open' : 'paid';
    await updateDoc(doc(db, `teams/${activeTeamId}/penalties/${id}`), { status: newStatus });
    if (newStatus === 'paid') {
      await addDoc(collection(db, `teams/${activeTeamId}/transactions`), {
        type: 'income', amount: record.amount, date: new Date().toISOString().split('T')[0],
        purpose: `Zahlung: ${record.userName} (${record.categoryName})`, userId: record.userId
      });
    }
    addToast(newStatus === 'paid' ? "Zahlung erfasst!" : "Wieder auf Offen gesetzt.");
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${activeTeamId}`;
    navigator.clipboard.writeText(link);
    addToast("Einladungslink kopiert!", "success");
  };

  const isAdmin = role === 'admin' || role === 'vice-admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium">Kassenstand: <span className="text-green-600 font-bold">{stats.balance.toFixed(2)}€</span></p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={copyInviteLink}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition shadow-sm"
            >
              <UserPlus size={18} className="text-blue-600" />
              <span>Einladen</span>
            </button>
            <button 
              onClick={() => setShowAddModal('expense')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition shadow-sm"
            >
              <MinusCircle size={18} />
              <span>Ausgabe</span>
            </button>
            <button 
              onClick={() => setShowAddModal('penalty')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
            >
              <PlusCircle size={18} />
              <span>Strafe</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Wallet />} label="Bilanz" value={stats.balance} color="green" />
        <KpiCard icon={<AlertCircle />} label="Offene Posten" value={stats.totalOpen} color="amber" />
        <KpiCard icon={<TrendingUp />} label="Einnahmen" value={stats.totalPaid} color="blue" />
        <KpiCard icon={<CreditCard />} label="Dein Deckel" value={stats.personalOpen} color="blue" highlight />
      </div>

      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Sparkles size={24} className={isGeneratingReport ? "animate-spin" : ""} />
              <h2 className="text-xl font-bold tracking-tight">Wochenbericht der Schande</h2>
            </div>
            <p className="text-blue-50 text-sm max-w-md leading-relaxed">Lass die KI einen humorvollen Bericht für euren Team-Chat erstellen.</p>
          </div>
          <button 
            onClick={async () => {
              setIsGeneratingReport(true);
              setAiReport(null);
              try {
                const report = await generateAIWeeklyReport(records, transactions);
                setAiReport(report);
                addToast("Bericht erstellt!", "success");
              } catch (e) {
                addToast("Fehler bei KI-Analyse.", "error");
              } finally { setIsGeneratingReport(false); }
            }}
            disabled={isGeneratingReport}
            className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap"
          >
            {isGeneratingReport ? <Loader2 className="animate-spin" size={18} /> : 'KI-Bericht erstellen'}
          </button>
        </div>
      </div>

      {aiReport && (
        <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 italic"><Sparkles size={16} className="text-blue-500" /> Der Kassenwart spricht...</h3>
            <button onClick={() => setAiReport(null)} className="p-1 hover:bg-slate-100 rounded-full transition"><X size={18} /></button>
          </div>
          <div className="text-slate-700 leading-relaxed italic whitespace-pre-line text-sm md:text-base">"{aiReport}"</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b bg-slate-50/30">
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Sünden" />
          <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} label="Konto" />
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Analyse" />
        </div>
        <div className="p-4 md:p-6">
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {[...transactions].reverse().map(t => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-50 bg-white flex items-center justify-between hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'income' ? <TrendingUp size={20} /> : <ShoppingCart size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{t.purpose}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.date}</p>
                    </div>
                  </div>
                  <p className={`font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'history' && (
             <div className="space-y-3">
                {records.map(record => (
                  <div key={record.id} className="p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={record.userAvatar} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{record.userName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{record.categoryName} • {record.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-black ${record.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>{record.amount.toFixed(2)}€</p>
                      {isAdmin && (
                        <button onClick={() => togglePaidStatus(record.id)} className={`p-2 rounded-lg transition ${record.status === 'paid' ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-green-50'}`}>
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          )}
          {activeTab === 'stats' && <Statistics records={records} transactions={transactions} />}
        </div>
      </div>

      {showAddModal === 'penalty' && (
        <Modal title="Strafe vergeben" onClose={() => setShowAddModal(null)}>
          <form onSubmit={handleAddPenalty} className="space-y-4">
            <Select label="Spieler" value={selectedUserId} onChange={setSelectedUserId} options={members.map(m => ({ value: m.id, label: m.name }))} />
            <Select label="Vergehen" value={selectedCategoryId} onChange={setSelectedCategoryId} options={categories.map(c => ({ value: c.id, label: `${c.name} (${c.amount.toFixed(2)}€)` }))} />
            <SubmitButton loading={isSubmitting} label="Strafe eintragen" />
          </form>
        </Modal>
      )}

      {showAddModal === 'expense' && (
        <Modal title="Ausgabe buchen" onClose={() => setShowAddModal(null)}>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Zweck / Artikel</label>
              <input type="text" required value={expensePurpose} onChange={(e) => setExpensePurpose(e.target.value)} placeholder="z.B. Kasten Bier" className="w-full p-3 rounded-xl bg-slate-100 border-none text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Betrag (€)</label>
              <input type="number" step="0.01" required value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="w-full p-3 rounded-xl bg-slate-100 border-none text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <SubmitButton loading={isSubmitting} label="Betrag abziehen" variant="danger" />
          </form>
        </Modal>
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const Select: React.FC<{ label: string, value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }> = ({ label, value, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <select required value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-3 rounded-xl bg-slate-100 border-none text-sm focus:ring-2 focus:ring-blue-500">
      <option value="">Wähle...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const SubmitButton: React.FC<{ loading: boolean, label: string, variant?: 'default' | 'danger' }> = ({ loading, label, variant = 'default' }) => (
  <button type="submit" disabled={loading} className={`w-full py-4 rounded-2xl font-bold transition shadow-xl flex items-center justify-center gap-2 ${variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'} disabled:opacity-50`}>
    {loading ? <Loader2 className="animate-spin" /> : label}
  </button>
);

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
  <button onClick={onClick} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${active ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'}`}>
    {label}
  </button>
);
