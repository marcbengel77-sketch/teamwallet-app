
import React, { useMemo } from 'react';
import { PenaltyRecord, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, CartesianGrid } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface StatisticsProps {
  records: PenaltyRecord[];
  transactions: Transaction[];
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export const Statistics: React.FC<StatisticsProps> = ({ records, transactions }) => {
  const topSinners = useMemo(() => {
    const counts: Record<string, { name: string; total: number }> = {};
    records.forEach(r => {
      if (!counts[r.userName]) counts[r.userName] = { name: r.userName, total: 0 };
      counts[r.userName].total += r.amount;
    });
    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [records]);

  const frequentPenalties = useMemo(() => {
    const counts: Record<string, { name: string; value: number }> = {};
    records.forEach(r => {
      if (!counts[r.categoryName]) counts[r.categoryName] = { name: r.categoryName, value: 0 };
      counts[r.categoryName].value += 1;
    });
    return Object.values(counts)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [records]);

  // Kassenverlauf: Wir stellen sicher, dass immer eine Linie gezeichnet werden kann
  const trendData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    let currentBalance = 0;
    const data = transactions.map((t, idx) => {
      if (t.type === 'income') currentBalance += t.amount;
      else currentBalance -= t.amount;
      
      return {
        name: t.date,
        balance: currentBalance,
      };
    });

    // Falls nur ein Datenpunkt da ist, fügen wir einen 0-Punkt davor ein für die Optik
    if (data.length === 1) {
      return [{ name: 'Start', balance: 0 }, ...data];
    }
    return data;
  }, [transactions]);

  const hasData = records.length > 0 || transactions.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <TrendingUp size={32} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Noch keine Daten vorhanden</h3>
          <p className="text-slate-500 text-sm max-w-xs mt-1">Sobald die ersten Strafen gezahlt oder Ausgaben gebucht werden, erscheinen hier eure Statistiken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Kassenverlauf */}
      <section>
        <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">Finanzielle Entwicklung</h4>
        <div className="h-64 w-full bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)}€`, 'Kontostand']}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorBal)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPlaceholder text="Keine Kontobewegungen" />
          )}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Top Sünder */}
        <section>
          <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">Größte Einzahler</h4>
          <div className="h-64 w-full">
            {topSinners.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSinners} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} 
                    width={90} 
                  />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={20}>
                    {topSinners.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPlaceholder text="Noch keine Sünden erfasst" />
            )}
          </div>
        </section>

        {/* Häufigste Vergehen */}
        <section>
          <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">Häufigste Vergehen</h4>
          <div className="h-64 w-full">
            {frequentPenalties.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={frequentPenalties}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {frequentPenalties.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPlaceholder text="Katalog ist noch unberührt" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const EmptyPlaceholder: React.FC<{ text: string }> = ({ text }) => (
  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 space-y-2">
    <AlertTriangle size={24} />
    <span className="text-xs font-bold uppercase tracking-widest">{text}</span>
  </div>
);
