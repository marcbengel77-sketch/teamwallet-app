
import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
  addToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ addToast }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
        
        // Profil in Firestore anlegen
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          email,
          avatarUrl: `https://picsum.photos/seed/${userCredential.user.uid}/200`,
          createdAt: new Date().toISOString()
        });

        addToast("Konto erstellt! Bitte prüfe deine E-Mails zur Verifizierung.", "info");
        setMode('login');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        addToast("E-Mail zum Zurücksetzen wurde gesendet.", "success");
        setMode('login');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        addToast("Willkommen zurück!", "success");
      }
    } catch (error: any) {
      console.error(error);
      let message = "Ein Fehler ist aufgetreten.";
      if (error.code === 'auth/wrong-password') message = "Falsches Passwort.";
      if (error.code === 'auth/user-not-found') message = "Benutzer nicht gefunden.";
      if (error.code === 'auth/email-already-in-use') message = "E-Mail wird bereits verwendet.";
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-blue-200">TW</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">TeamWallet</h1>
          <p className="text-slate-500 font-medium">Das digitale Strafen-Management.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Vollständiger Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Max Mustermann"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">E-Mail Adresse</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="beispiel@email.de"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-bold text-slate-700">Passwort</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs text-blue-600 font-bold hover:underline">Vergessen?</button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  {mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Konto erstellen' : 'Link senden'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm font-bold text-slate-500 hover:text-blue-600 transition"
            >
              {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
          <ShieldCheck size={14} />
          Sichere Authentifizierung via Firebase
        </div>
      </div>
    </div>
  );
};
