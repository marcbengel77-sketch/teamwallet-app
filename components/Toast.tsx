
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ messages, onRemove }) => {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ message: ToastMessage; onRemove: (id: string) => void }> = ({ message, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(message.id), 3000);
    return () => clearTimeout(timer);
  }, [message.id, onRemove]);

  return (
    <div className="pointer-events-auto flex items-center gap-3 bg-white border shadow-2xl rounded-xl p-4 min-w-[280px] animate-in slide-in-from-right-full duration-300">
      <div className={`${message.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      </div>
      <p className="flex-1 text-sm font-semibold text-slate-700">{message.text}</p>
      <button onClick={() => onRemove(message.id)} className="text-slate-400 hover:text-slate-600 transition">
        <X size={16} />
      </button>
    </div>
  );
};
