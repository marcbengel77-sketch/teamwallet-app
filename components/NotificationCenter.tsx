
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AppNotification } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { joinWithToken } from '../services/inviteService';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { selectedTeam, refreshTeams, selectTeam } = useTeam();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    
    if (!user || !supabase) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          setNotifications(prev => [payload.new as AppNotification, ...prev].slice(0, 10));
          setUnreadCount(c => c + 1);
          
          if (Notification.permission === 'granted') {
            new Notification((payload.new as any).title, { body: (payload.new as any).message });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!user || !supabase) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleAcceptInvite = async (notification: AppNotification) => {
    // Token aus der Nachricht extrahieren
    const match = notification.message.match(/Token: ([a-z0-9]+)/);
    if (!match) return;
    
    const token = match[1];
    setProcessingId(notification.id);
    
    try {
      const result = await joinWithToken(token);
      if (result.success) {
        // Benachrichtigung als gelesen markieren/löschen
        if (supabase) {
          await supabase.from('notifications').delete().eq('id', notification.id);
        }
        await refreshTeams(true);
        selectTeam(result.team_id);
        setIsOpen(false);
        navigate('/dashboard');
        alert("Erfolgreich beigetreten!");
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert("Fehler beim Beitreten: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const requestPermission = () => {
    Notification.requestPermission();
  };

  return (
    <div className="relative">
      <button 
        onClick={() => { setIsOpen(!isOpen); if(!isOpen) fetchNotifications(); }}
        className="relative p-2 text-indigo-100 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-indigo-700">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden transform origin-top-right animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-slate-800">Meldungen</h3>
              <div className="flex gap-2">
                <button onClick={requestPermission} className="text-[10px] font-bold text-indigo-600 hover:underline">Push erlauben</button>
                <button onClick={markAllAsRead} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 underline">Gelesen</button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">Keine neuen Nachrichten.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-indigo-50/30' : ''}`}>
                    <p className="text-xs font-black text-slate-900 mb-1">{n.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{n.message.split(' Token:')[0]}</p>
                    
                    {n.type === 'team_invite' && (
                      <button 
                        onClick={() => handleAcceptInvite(n)}
                        disabled={processingId === n.id}
                        className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {processingId === n.id ? 'Wird beigetreten...' : 'Team beitreten ✅'}
                      </button>
                    )}
                    
                    <p className="text-[9px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
