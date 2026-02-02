
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { getPenaltyCatalog, addPenaltyCatalogItem, updatePenaltyCatalogItem, deletePenaltyCatalogItem } from '../services/penaltyService';
import { PenaltyCatalogItem } from '../types';

const PenaltyCatalog: React.FC = () => {
  const { selectedTeam, isAdmin, isViceAdmin } = useTeam();
  const [catalogItems, setCatalogItems] = useState<PenaltyCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State für neue Strafe
  const [isAddPenaltyModalOpen, setIsAddPenaltyModalOpen] = useState<boolean>(false);
  const [newPenaltyName, setNewPenaltyName] = useState<string>('');
  const [newPenaltyAmount, setNewPenaltyAmount] = useState<number>(0);
  const [addingPenalty, setAddingPenalty] = useState<boolean>(false);

  // Modal State für Bearbeitung
  const [editingItem, setEditingItem] = useState<PenaltyCatalogItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [updatingPenalty, setUpdatingPenalty] = useState<boolean>(false);

  const fetchPenaltyCatalog = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const data = await getPenaltyCatalog(selectedTeam.id);
      setCatalogItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchPenaltyCatalog();
  }, [fetchPenaltyCatalog]);

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || newPenaltyAmount <= 0) return;
    setAddingPenalty(true);
    try {
      await addPenaltyCatalogItem(selectedTeam.id, newPenaltyName, newPenaltyAmount);
      await fetchPenaltyCatalog();
      setIsAddPenaltyModalOpen(false);
      setNewPenaltyName('');
      setNewPenaltyAmount(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingPenalty(false);
    }
  };

  const handleUpdatePenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || editAmount <= 0) return;
    setUpdatingPenalty(true);
    try {
      await updatePenaltyCatalogItem(editingItem.id, editName, editAmount);
      await fetchPenaltyCatalog();
      setEditingItem(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingPenalty(false);
    }
  };

  const handleDeletePenalty = async (id: string) => {
    if (!window.confirm("Möchtest du diese Strafe wirklich dauerhaft aus dem Katalog löschen?")) return;
    try {
      await deletePenaltyCatalogItem(id);
      await fetchPenaltyCatalog();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (item: PenaltyCatalogItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount);
  };

  if (!selectedTeam) return <div className="mt-32 text-center p-4">Kein Team ausgewählt.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Strafenkatalog</h2>
          <p className="text-slate-500 text-sm font-medium">Regeln & Gebühren für {selectedTeam.name}</p>
        </div>
        {(isAdmin || isViceAdmin) && (
          <button
            onClick={() => setIsAddPenaltyModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-sm"
          >
            Strafe hinzufügen +
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vergehen / Grund</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Betrag</th>
                  {(isAdmin || isViceAdmin) && (
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalogItems.length === 0 ? (
                  <tr><td colSpan={3} className="p-10 text-center text-slate-400 italic font-medium">Noch keine Strafen definiert.</td></tr>
                ) : (
                  catalogItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-indigo-600">{item.amount.toFixed(2)} €</td>
                      {(isAdmin || isViceAdmin) && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center gap-2">
                            <button 
                              onClick={() => openEditModal(item)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Bearbeiten"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeletePenalty(item.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Strafe hinzufügen */}
      <Modal isOpen={isAddPenaltyModalOpen} onClose={() => setIsAddPenaltyModalOpen(false)} title="Neue Strafe erstellen">
        <form onSubmit={handleAddPenalty} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bezeichnung</label>
            <input 
              type="text" 
              placeholder="z.B. Zuspätkommen zum Meeting" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={newPenaltyName} 
              onChange={e => setNewPenaltyName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Betrag in €</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={newPenaltyAmount} 
              onChange={e => setNewPenaltyAmount(parseFloat(e.target.value) || 0)} 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100" disabled={addingPenalty}>
            {addingPenalty ? 'Wird gespeichert...' : 'Strafe jetzt speichern'}
          </button>
        </form>
      </Modal>

      {/* Modal: Strafe bearbeiten */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Strafe bearbeiten">
        <form onSubmit={handleUpdatePenalty} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bezeichnung</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Betrag in €</label>
            <input 
              type="number" 
              step="0.01" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={editAmount} 
              onChange={e => setEditAmount(parseFloat(e.target.value) || 0)} 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100" disabled={updatingPenalty}>
            {updatingPenalty ? 'Wird aktualisiert...' : 'Änderungen speichern'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default PenaltyCatalog;
