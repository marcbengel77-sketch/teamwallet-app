
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogOut, Camera, Save, Mail, User } from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateUser, onLogout }) => {
  const [name, setName] = useState(currentUser.name);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      onUpdateUser({ ...currentUser, name });
      setSaving(false);
      alert("Profil gespeichert!");
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <img 
            src={currentUser.avatarUrl} 
            alt={currentUser.name} 
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl" 
          />
          <button className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition">
            <Camera size={18} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">{currentUser.name}</h2>
          <p className="text-slate-500">{currentUser.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <User size={16} /> Vollständiger Name
          </label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2 opacity-50">
            <Mail size={16} /> E-Mail Adresse (nicht änderbar)
          </label>
          <input 
            type="email" 
            value={currentUser.email} 
            disabled
            className="w-full p-3 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
        >
          {saving ? 'Speichert...' : <><Save size={20} /> Änderungen speichern</>}
        </button>
      </div>

      <button 
        onClick={onLogout}
        className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center gap-2"
      >
        <LogOut size={20} /> Ausloggen
      </button>

      <div className="text-center pt-8">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">TeamWallet v1.0.0</p>
      </div>
    </div>
  );
};
