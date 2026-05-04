import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { Trophy, Zap, Target, Star, Lock, Activity, Award, Flame } from 'lucide-react';

export function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
     // Fetch leaderboard
     fetch('/api/leaderboard')
       .then(res => res.json())
       .then(resData => {
          if (Array.isArray(resData)) setLeaderboard(resData);
       })
       .catch(console.error);

     if (!token) return;

     // Fetch user progress
     fetch('/api/progress', {
        headers: { 'Authorization': `Bearer ${token}` }
     })
     .then(res => res.json())
     .then(resData => {
          if (Array.isArray(resData)) {
             const schulteData = resData.filter(d => d.gameType === 'SCHULTE');
             const chartData = schulteData.map((d: any) => {
                const dt = new Date(d.createdAt);
                const m = dt.toLocaleString('ru', { month: 'short' });
                return {
                   date: `${dt.getDate()} ${m}`,
                   time: d.timeMs
                };
             });
             setData(chartData.reverse());
          }
     })
     .catch(console.error);
  }, [token]);

  const milestones = [
    { title: 'Базовая концентрация', level: 1, type: 'completed', icon: Award },
    { title: 'Скоростной анализ', level: 5, type: 'active', icon: Zap },
    { title: 'Системное мышление', level: 10, type: 'locked', icon: Star },
    { title: 'Когнитивный поток', level: 25, type: 'locked', icon: Target },
    { title: 'Мастер Интеллекта', level: 50, type: 'locked', icon: Trophy },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Profile Card */}
        <div className="lg:col-span-4 bg-card/40 border border-border rounded-3xl p-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-24 h-24 text-primary" />
           </div>
           <h3 className="text-[10px] text-primary uppercase font-black tracking-widest mb-4">Статус оператора</h3>
           <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                 {user?.name?.[0]?.toUpperCase() || 'G'}
              </div>
              <div>
                 <div className="text-2xl font-black tracking-tighter truncate max-w-[200px]">{user?.name || 'Гость'}</div>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1 text-primary"><Flame className="w-3 h-3 fill-current" /> 12 ДНЕЙ</span>
                    <span>•</span>
                    <span>ПОСЛЕДНИЙ ВХОД СЕГОДНЯ</span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50 text-center shadow-inner">
                 <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">УРОВЕНЬ</p>
                 <p className="text-2xl font-black text-primary">{user?.level || 1}</p>
              </div>
              <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50 text-center shadow-inner">
                 <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">РЕЙТИНГ</p>
                 <p className="text-2xl font-black">{user?.rating || 0}</p>
              </div>
           </div>

           <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                 <span className="text-muted-foreground">ПРОГРЕСС УРОВНЯ</span>
                 <span className="text-primary">45%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
              </div>
           </div>
        </div>

        {/* Chart Card */}
        <div className="lg:col-span-8 bg-card/20 border border-border rounded-3xl p-6 flex flex-col min-h-[350px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Аналитика точности (мс)</h3>
              <div className="flex gap-2">
                 <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-md border border-primary/20">7 ДНЕЙ</span>
              </div>
           </div>
           <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <style>{`
                    .recharts-cartesian-grid-horizontal line { stroke: hsl(var(--border)); }
                    .recharts-cartesian-axis-tick-value { font-weight: 700; }
                  `}</style>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 9, fill: 'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 9, fill: 'hsl(var(--muted-foreground))'}} domain={['auto', 'auto']} axisLine={false} tickLine={false} width={40} />
                  <Tooltip 
                    cursor={{stroke: 'hsl(var(--primary))', strokeWidth: 1}} 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '1rem', fontSize: '11px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2}} 
                    activeDot={{r: 6, fill: 'hsl(var(--primary))', stroke: 'white'}} 
                  />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Trajectory Path */}
      <div className="bg-card/20 border border-border rounded-3xl p-6">
        <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-8 text-center sm:text-left">Траектория когнитивного роста</h3>
        <div className="relative overflow-x-auto pb-4 hide-scrollbar">
           {/* Connecting Line */}
           <div className="absolute top-[24px] left-[40px] right-[40px] h-1 bg-secondary rounded-full hidden md:block"></div>
           
           <div className="flex justify-between gap-8 md:gap-4 relative z-10 min-w-[700px] md:min-w-0">
              {milestones.map((ms, i) => (
                <div key={i} className="flex flex-col items-center gap-4 text-center w-full group">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 border-2 ${
                     ms.type === 'completed' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110' :
                     ms.type === 'active' ? 'bg-background border-primary text-primary animate-pulse' :
                     'bg-secondary border-transparent text-muted-foreground opacity-50'
                   }`}>
                     {ms.type === 'locked' ? <Lock className="w-5 h-5" /> : <ms.icon className="w-5 h-5" />}
                   </div>
                   <div className="min-w-0">
                      <p className={`text-[9px] font-black uppercase tracking-tighter ${ms.type === 'locked' ? 'text-muted-foreground' : 'text-primary'}`}>
                        {ms.type === 'completed' ? 'Пройдено' : ms.type === 'active' ? 'В процессе' : 'Скрыто'}
                      </p>
                      <h4 className={`text-[11px] font-bold leading-tight mt-1 whitespace-nowrap ${ms.type === 'locked' ? 'text-muted-foreground' : 'text-foreground'}`}>{ms.title}</h4>
                      <p className="text-[8px] text-muted-foreground uppercase mt-1 font-bold">LVL {ms.level}+</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Leaderboard & Achievements Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
         <div className="lg:col-span-4 bg-card/40 border border-border rounded-3xl p-6 h-full flex flex-col">
            <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-4">Зал славы</h3>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] lg:max-h-none pr-1 scrollbar-hide">
               {leaderboard.length > 0 ? leaderboard.map((u, i) => (
                 <div key={u.id} className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${i === 0 ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-secondary/30 border-border opacity-70 hover:opacity-100'}`}>
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                       {(i+1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold truncate">{u.name}</p>
                       <p className="text-[9px] text-muted-foreground uppercase font-black">RATING {u.rating}</p>
                    </div>
                    {i === 0 && <Star className="w-4 h-4 text-primary fill-primary" />}
                 </div>
               )) : (
                 <div className="text-center py-8 opacity-30 italic text-xs">Лидеры еще не определены</div>
               )}
            </div>
         </div>

         <div className="lg:col-span-8 bg-card/40 border border-border rounded-3xl p-6">
            <h3 className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-6">Личные достижения</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {[
                 { label: 'Скороход', desc: 'Шульте < 15 сек', icon: Zap, unlocked: true },
                 { label: 'Аналитик', desc: 'Числа: 100%', icon: Star, unlocked: true },
                 { label: 'Магистр', desc: '30 дней тренировок', icon: Award, unlocked: false },
                 { label: 'Легенда', desc: 'Уровень 50', icon: Trophy, unlocked: false },
               ].map((ach, i) => (
                 <div key={i} className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${ach.unlocked ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-secondary/30 border-border opacity-40 grayscale'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${ach.unlocked ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                       <ach.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{ach.label}</span>
                    <p className="text-[8px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter">{ach.desc}</p>
                 </div>
               ))}
            </div>
            
            <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                     <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-primary">Следующее достижение</p>
                     <p className="text-xs font-bold text-foreground">Завершить 50 тестов</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-sm font-black text-foreground">32/50</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
