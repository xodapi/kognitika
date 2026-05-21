import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import { Download, Brain, TrendingUp, History, Info } from 'lucide-react';

interface ProfileData {
  profile: Record<string, number>;
  trend: number;
  sessionsCount: number;
  updatedAt: string;
}

export function CognitiveProfile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/profile', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    const res = await fetch('/api/analytics/export', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kognitika_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Анализ нейронных связей...</div>;
  if (!data || !data.profile) return (
    <div className="p-8 bg-card/30 border border-border rounded-3xl text-center">
      <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
      <p className="text-muted-foreground">Недостаточно данных. Пройдите хотя бы 5-10 тренировок.</p>
    </div>
  );

  const radarData = [
    { subject: 'Внимание', A: data.profile.attention, fullMark: 100 },
    { subject: 'Память', A: data.profile.memory, fullMark: 100 },
    { subject: 'Логика', A: data.profile.logic, fullMark: 100 },
    { subject: 'Скорость', A: data.profile.speed, fullMark: 100 },
    { subject: 'Стрессоуст.', A: data.profile.resilience, fullMark: 100 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card/40 border border-border rounded-3xl p-6 flex flex-col items-center"
      >
        <div className="flex items-center justify-between w-full mb-6">
          <h3 className="text-lg font-black tracking-tight">Когнитивный Профиль</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-[10px] font-bold text-primary">
            <Activity className="w-3 h-3" /> ПОСЛЕДНИЕ {data.sessionsCount} СЕССИЙ
          </div>
        </div>
        
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} />
              <Radar
                name="Вы"
                dataKey="A"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Stats & Export */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card/40 border border-border rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Динамика</span>
            </div>
            <div className={`text-2xl font-black ${data.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {data.trend > 0 ? '+' : ''}{data.trend}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Относительно прошлых сессий</p>
          </div>

          <div className="bg-card/40 border border-border rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2 text-muted-foreground">
              <History className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Прогресс</span>
            </div>
            <div className="text-2xl font-black text-primary">
              {data.sessionsCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Всего тренировок</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-sm font-black mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" /> Экспорт данных (JSON)
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Ваши данные в формате KCTS (Kognitika Cognitive Time-Series). 
              Оптимизировано для анализа в ChatGPT, Claude или вашей собственной LLM.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-primary/20"
            >
              Скачать JSON
            </button>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Brain className="w-24 h-24 rotate-12" />
          </div>
        </div>

        <div className="bg-card/40 border border-border rounded-3xl p-4 flex gap-3 items-start">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Профиль строится на основе алгоритма нормализации баллов по 5 ключевым векторам. 
            Данные за последние 100 сессий анализируются для выявления трендов когнитивной выносливости.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Activity } from 'lucide-react';
