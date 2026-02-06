
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { getPenaltyCatalog, addPenaltyCatalogItem, updatePenaltyCatalogItem, deletePenaltyCatalogItem } from '../services/penaltyService';
import { PenaltyCatalogItem } from '../types';

const PenaltyCatalog: React.FC = () => {
  const { selectedTeam, isAdmin, isViceAdmin } = useTeam();
  const [catalogItems, setCatalogItems] = useState<PenaltyCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddPenaltyModalOpen, setIsAddPenaltyModalOpen] = useState<boolean>(false);
  const [newPenaltyName, setNewPenaltyName] = useState<string>('');
  const [newPenaltyAmount, setNewPenaltyAmount] = useState<number>(0);
  const [addingPenalty, setAddingPenalty] = useState<boolean>(false);

  const [editingItem, setEditingItem] = useState<PenaltyCatalogItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [updatingPenalty, setUpdatingPenalty] = useState<boolean>(false);

  const fetchPenaltyCatalog = useCallback(async () => {
    if (!selectedTeam) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getPenaltyCatalog(selectedTeam.id);
      setCatalogItems(data || []);
    } catch (err: any) {
      console.error("Fehler beim Laden des Katalogs:", err);
      // Hier zeigen wir jetzt die echte Fehlermeldung an
      setError(`Fehler beim Laden: ${err.message || "Unbekannter Datenbankfehler"}`);
      setCatalogItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam?.id]);

  useEffect(() => {
    fetchPenaltyCatalog();
  }, [fetchPenaltyCatalog]);

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || newPenaltyAmount <= 0) return;
    setAddingPenalty(true);
    setError(null);
    try {
      await addPenaltyCatalogItem(selectedTeam.id, newPenaltyName, newPenaltyAmount);
      await fetchPenaltyCatalog();
      setIsAddPenaltyModalOpen(false);
      setNewPenaltyName('');
      setNewPenaltyAmount(0);
    } catch (err: any) {
      console.error("Save error:", err);
      setError(`Speichern fehlgeschlagen: ${err.message}`);
    } finally {
      setAddingPenalty(false);
    }
  };

  const handleUpdatePenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || editAmount <= 0) return;
    setUpdatingPenalty(true);
    setError(null);
    try {
      await updatePenaltyCatalogItem(editingItem.id, editName, editAmount);
      await fetchPenaltyCatalog();
      setEditingItem(null);
    } catch (err: any) {
      setError("Update fehlgeschlagen: " + err.message);
    } finally {
      setUpdatingPenalty(false);
    }
  };

  const handleDeletePenalty = async (id: string) => {
    if (!window.confirm("Diese Strafe wirklich aus dem Katalog entfernen?")) return;
    try {
      await deletePenaltyCatalogItem(id);
      await fetchPenaltyCatalog();
    } catch (err: any) {
      setError("Löschen fehlgeschlagen: " + err.message);
    }
  };

  const openEditModal = (item: PenaltyCatalogItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount);
  };

  if (!selectedTeam && !loading) return <div className="mt-40 text-center p-4">Kein Team ausgewählt.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-36 sm:pt-40 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Katalog</h2>
          <p className="text-slate-500 text-sm font-medium">Strafgebühren für {selectedTeam?.name || 'Mannschaft'}</p>
        </div>
        {(isAdmin || isViceAdmin) && (
          <button
            onClick={() => setIsAddPenaltyModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-sm active:scale-95"
          >
            Neues Vergehen +
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm border border-red-100 flex flex-col gap-2">
          <p>{error}</p>
          <div className="flex gap-4">
             <button onClick={() => fetchPenaltyCatalog()} className="underline text-xs">Erneut versuchen</button>
             <p className="text-[10px] opacity-70">Tipp: Führe das SQL-Skript im Supabase Dashboard aus.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[200px] flex flex-col">
        {loading ? (
          <div className="flex-grow flex items-center justify-center p-20">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Grund / Vergehen</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Gebühr</th>
                  {(isAdmin || isViceAdmin) && (
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Optionen</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {catalogItems.length === 0 ? (
                  <tr><td colSpan={3} className="p-16 text-center text-slate-400 italic font-medium">Noch keine Regeln festgelegt.</td></tr>
                ) : (
                  catalogItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-800 break-words max-w-[200px] sm:max-w-none">{item.name}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-indigo-600 whitespace-nowrap">{item.amount.toFixed(2)} €</td>
                      {(isAdmin || isViceAdmin) && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center gap-1 sm:gap-2">
                            <button 
                              onClick={() => openEditModal(item)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeletePenalty(item.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      <Modal isOpen={isAddPenaltyModalOpen} onClose={() => setIsAddPenaltyModalOpen(false)} title="Vergehen definieren">
        <form onSubmit={handleAddPenalty} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bezeichnung</label>
            <input 
              type="text" 
              placeholder="z.B. Handy in der Kabine" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
              value={newPenaltyName} 
              onChange={e => setNewPenaltyName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Betrag in €</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="5.00" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
              value={newPenaltyAmount} 
              onChange={e => setNewPenaltyAmount(parseFloat(e.target.value) || 0)} 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100" disabled={addingPenalty}>
            {addingPenalty ? 'Wird gespeichert...' : 'Vergehen hinzufügen'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Eintrag bearbeiten">
        <form onSubmit={handleUpdatePenalty} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bezeichnung</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Betrag in €</label>
            <input 
              type="number" 
              step="0.01" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
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
