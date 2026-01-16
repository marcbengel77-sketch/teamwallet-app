
import React, { useMemo } from 'react';
import { PenaltyRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';

interface StatisticsProps {
  records: PenaltyRecord[];
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export const Statistics: React.FC<StatisticsProps> = ({ records }) => {
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

  // Mock trend data
  const trendData = [
    { name: 'Jan', balance: 120 },
    { name: 'Feb', balance: 190 },
    { name: 'Mär', balance: 150 },
    { name: 'Apr', balance: 280 },
    { name: 'Mai', balance: 240 },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div>
        <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Kassenverlauf (Mock)</h4>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorBal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Top 5 Sünder (€)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSinners} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                  {topSinners.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Häufigste Strafen</h4>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={frequentPenalties}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {frequentPenalties.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
