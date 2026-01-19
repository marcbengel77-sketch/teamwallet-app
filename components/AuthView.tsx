
import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Mail, Lock, User, ArrowRight, ShieldCheck, Trophy, Wallet, Zap, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
  addToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, addToast }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      if (mode === 'register') {
        console.log("Starting registration...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        console.log("Auth user created, updating profile...");
        await updateProfile(userCredential.user, { displayName: name });
        
        console.log("Updating Firestore user doc...");
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          email,
          avatarUrl: `https://picsum.photos/seed/${userCredential.user.uid}/200`,
          createdAt: new Date().toISOString()
        });

        addToast("Konto erfolgreich erstellt!", "success");
        onLogin();
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        addToast("E-Mail zum Zurücksetzen wurde gesendet.", "success");
        setMode('login');
      } else {
        console.log("Logging in...");
        await signInWithEmailAndPassword(auth, email, password);
        addToast("Willkommen zurück!", "success");
        onLogin();
      }
    } catch (error: any) {
      console.error("Authentication Error:", error);
      let message = "Fehler: " + (error.message || "Unbekannter Fehler");
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = "E-Mail oder Passwort falsch.";
      if (error.code === 'auth/user-not-found') message = "Kein Konto mit dieser E-Mail gefunden.";
      if (error.code === 'auth/email-already-in-use') message = "Diese E-Mail wird bereits verwendet.";
      if (error.code === 'auth/weak-password') message = "Das Passwort ist zu schwach (min. 6 Zeichen).";
      if (error.code === 'permission-denied') message = "Firestore-Zugriff verweigert. Regeln prüfen!";
      
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 overflow-hidden glass-card rounded-[2.5rem] shadow-2xl border-white/50 animate-in zoom-in-95 duration-500">
        
        {/* Visuelle Hero-Sektion */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
             <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-[100px] animate-pulse"></div>
             <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-400 rounded-full blur-[100px] animate-pulse delay-700"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white font-black text-2xl border border-white/30">TW</div>
              <span className="text-2xl font-black tracking-tighter">TeamWallet</span>
            </div>
            
            <h2 className="text-5xl font-black leading-tight mb-6">Schluss mit der Zettelwirtschaft.</h2>
            <p className="text-blue-100 text-lg font-medium leading-relaxed max-w-md">
              Die modernste Kassenführung für Amateurteams. Mit KI-Statistiken, Strafenkatalog und Echtzeit-Übersicht.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition cursor-default">
              <div className="p-2 bg-blue-500/30 rounded-lg"><Trophy size={20} /></div>
              <span className="text-sm font-bold">Team-Katalog</span>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition cursor-default">
              <div className="p-2 bg-indigo-500/30 rounded-lg"><Zap size={20} /></div>
              <span className="text-sm font-bold">Echtzeit-Updates</span>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition cursor-default">
              <div className="p-2 bg-blue-500/30 rounded-lg"><Wallet size={20} /></div>
              <span className="text-sm font-bold">Kassenbericht</span>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition cursor-default">
              <div className="p-2 bg-indigo-500/30 rounded-lg"><Sparkles size={20} /></div>
              <span className="text-sm font-bold">KI-Analyse</span>
            </div>
          </div>
        </div>

        {/* Formular-Sektion */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/40 backdrop-blur-xl">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-blue-200 mb-4">TW</div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">TeamWallet</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {mode === 'login' ? 'Willkommen zurück!' : mode === 'register' ? 'Kabine beitreten' : 'Passwort vergessen?'}
            </h3>
            <p className="text-slate-500 font-medium">
              {mode === 'login' ? 'Logge dich ein, um deine Teamkasse zu verwalten.' : mode === 'register' ? 'Erstelle dein Konto in weniger als einer Minute.' : 'Keine Sorge, wir schicken dir einen Link.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="space-y-1 group">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Vollständiger Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="z.B. Lukas Podolski"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1 group">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-Mail Adresse</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@verein.de"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1 group">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Passwort</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs text-blue-600 font-black hover:underline">Vergessen?</button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4.5 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-white border-t-transparent"></div>
              ) : (
                <>
                  {mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Jetzt registrieren' : 'Link anfordern'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm font-black text-slate-600 hover:text-blue-600 transition uppercase tracking-widest"
            >
              {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden'}
            </button>
            
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <ShieldCheck size={14} />
              Sicheres Cloud-Backend
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
