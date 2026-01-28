
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { getPenaltyCatalog, addPenaltyCatalogItem } from '../services/penaltyService';
import { PenaltyCatalogItem } from '../types';

const PenaltyCatalog: React.FC = () => {
  const { selectedTeam, isAdmin, isViceAdmin } = useTeam();
  const [catalogItems, setCatalogItems] = useState<PenaltyCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddPenaltyModalOpen, setIsAddPenaltyModalOpen] = useState<boolean>(false);
  const [newPenaltyName, setNewPenaltyName] = useState<string>('');
  const [newPenaltyAmount, setNewPenaltyAmount] = useState<number>(0);
  const [addingPenalty, setAddingPenalty] = useState<boolean>(false);

  const fetchPenaltyCatalog = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPenaltyCatalog(selectedTeam.id);
      setCatalogItems(data);
    } catch (err: any) {
      console.error('Failed to fetch penalty catalog:', err);
      setError(err.message || 'Fehler beim Laden des Strafenkatalogs.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedTeam) {
      fetchPenaltyCatalog();
    }
  }, [selectedTeam, fetchPenaltyCatalog]);

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) {
      setError('Kein Team ausgewählt.');
      return;
    }
    if (!newPenaltyName || newPenaltyAmount <= 0) {
      setError('Bitte gültigen Namen und Betrag für die Strafe angeben.');
      return;
    }

    setAddingPenalty(true);
    setError(null);
    try {
      await addPenaltyCatalogItem(selectedTeam.id, newPenaltyName, newPenaltyAmount);
      await fetchPenaltyCatalog();
      setIsAddPenaltyModalOpen(false);
      setNewPenaltyName('');
      setNewPenaltyAmount(0);
    } catch (err: any) {
      console.error('Failed to add penalty to catalog:', err);
      setError(err.message || 'Fehler beim Hinzufügen der Strafe.');
    } finally {
      setAddingPenalty(false);
    }
  };

  if (!selectedTeam) {
    return (
      <div className="container mx-auto mt-24 p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Kein Team aktiv</h2>
        <p className="text-gray-600">Bitte wählen Sie oben in der Leiste ein Team aus, um den Katalog zu sehen.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto mt-24 p-4 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-24 p-4">
      <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">{selectedTeam.name} Strafenkatalog</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {(isAdmin || isViceAdmin) && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setIsAddPenaltyModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300"
          >
            Strafe zum Katalog hinzufügen
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg">
        {catalogItems.length === 0 ? (
          <p className="text-gray-600 text-center italic">Noch keine Strafen im Katalog dieses Teams.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Bezeichnung</th>
                  <th className="py-3 px-6 text-left">Betrag</th>
                  <th className="py-3 px-6 text-left">Erstellt am</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {catalogItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-100 transition">
                    <td className="py-3 px-6 text-left whitespace-nowrap font-medium text-gray-800">{item.name}</td>
                    <td className="py-3 px-6 text-left text-indigo-600 font-bold">{item.amount.toFixed(2)} €</td>
                    <td className="py-3 px-6 text-left">{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddPenaltyModalOpen} onClose={() => setIsAddPenaltyModalOpen(false)} title="Neue Strafe zum Katalog">
        <form onSubmit={handleAddPenalty} className="space-y-4">
          <div>
            <label htmlFor="newPenaltyName" className="block text-gray-700 text-sm font-bold mb-2">
              Bezeichnung
            </label>
            <input
              type="text"
              id="newPenaltyName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPenaltyName}
              onChange={(e) => setNewPenaltyName(e.target.value)}
              required
              disabled={addingPenalty}
              placeholder="Z.B. Zuspätkommen"
            />
          </div>
          <div>
            <label htmlFor="newPenaltyAmount" className="block text-gray-700 text-sm font-bold mb-2">
              Betrag (€)
            </label>
            <input
              type="number"
              id="newPenaltyAmount"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPenaltyAmount}
              onChange={(e) => setNewPenaltyAmount(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0.01"
              required
              disabled={addingPenalty}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={addingPenalty}
          >
            {addingPenalty ? 'Speichert...' : 'Katalog erweitern'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default PenaltyCatalog;
