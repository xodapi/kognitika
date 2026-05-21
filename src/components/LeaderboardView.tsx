import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, Target, Activity, Search, ArrowUpRight, Award, Zap } from 'lucide-react';
import { LeagueBadge } from './LeagueBadge';

interface LeaderboardUser {
  id: string;
  name: string;
  pseudonym?: string;
  experience: number;
  level: number;
  rating: number;
  _count?: {
    sessions: number;
  };
}

export function LeaderboardView() {
// ... [rest of states]
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'all' | 'weekly'>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLeaderboard(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Leaderboard Fetch Error:', err);
        setLoading(false);
      });
  }, [period]);

  const filteredLeaderboard = leaderboard.filter(u => 
    (u.pseudonym || u.name || 'Аноним').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = filteredLeaderboard.slice(0, 3);
  const rest = filteredLeaderboard.slice(3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">Зал Славы</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <Trophy className="w-4 h-4 text-primary" />
            Лучшие когнитивные атлеты системы Когнитика
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-secondary/50 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setPeriod('all')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === 'all' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Весь период
            </button>
            <button 
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === 'weekly' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              За неделю
            </button>
          </div>

          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Поиск атлета..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 md:gap-x-4 lg:gap-x-8 items-end pt-16 pb-8 max-w-5xl mx-auto px-4">
          {/* Silver - 2nd Place */}
          {top3[1] && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="order-2 md:order-1"
            >
              <div className="bg-card/40 border border-border rounded-3xl p-4 lg:p-6 flex flex-col items-center relative group hover:border-primary/30 transition-all">
                <div className="absolute -top-10 flex flex-col items-center">
                   <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-secondary border-2 border-border flex items-center justify-center text-muted-foreground font-black text-lg lg:text-xl shadow-lg uppercase">
                      {(top3[1].pseudonym || top3[1].name || 'A')[0]}
                   </div>
                   <div className="mt-2 scale-90">
                      <LeagueBadge rating={top3[1].rating} size="sm" showLabel={false} />
                   </div>
                </div>
                <div className="mt-8 text-center w-full">
                   <p className="font-black text-base lg:text-lg truncate px-2">{top3[1].name || 'Машинист'}</p>
                   <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-3"><span>Серебро</span> • Уровень {top3[1].level}</p>
                   <div className="bg-primary/10 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl border border-primary/20 inline-block">
                      <p className="text-lg lg:text-xl font-black text-foreground">{top3[1].experience} <span className="text-[10px] text-muted-foreground">XP</span></p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Gold - 1st Place */}
          {top3[0] && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="order-1 md:order-2"
            >
              <div className="bg-primary/5 border-2 border-primary/30 rounded-[2.5rem] p-6 lg:p-8 flex flex-col items-center relative group hover:border-primary/50 transition-all shadow-xl shadow-primary/5">
                <div className="absolute -top-12 lg:top-[-3.5rem] flex flex-col items-center">
                   <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl bg-primary flex items-center justify-center text-white font-black text-2xl lg:text-3xl shadow-2xl shadow-primary/30 relative uppercase">
                      {(top3[0].pseudonym || top3[0].name || 'A')[0]}
                      <div className="absolute -top-2 -right-2 bg-yellow-400 p-1 rounded-full shadow-lg border-2 lg:border-4 border-card">
                         <Star className="w-4 h-4 lg:w-5 lg:h-5 fill-yellow-900 text-yellow-900" />
                      </div>
                   </div>
                   <div className="mt-3">
                      <LeagueBadge rating={top3[0].rating} size="md" showLabel={false} />
                   </div>
                </div>
                <div className="mt-12 lg:mt-14 text-center w-full">
                   <p className="font-black text-xl lg:text-2xl truncate px-2 mb-1">{top3[0].name || 'Машинист'}</p>
                   <p className="text-[10px] lg:text-xs text-primary uppercase font-black tracking-[0.2em] mb-4 lg:mb-6"><span>Чемпион</span> • Уровень {top3[0].level}</p>
                   <div className="bg-primary text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-2xl shadow-lg shadow-primary/30 inline-block">
                      <p className="text-xl lg:text-2xl font-black">{top3[0].experience} <span className="text-[10px] lg:text-xs opacity-70">XP</span></p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Bronze - 3rd Place */}
          {top3[2] && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="order-3"
            >
              <div className="bg-card/40 border border-border rounded-3xl p-4 lg:p-6 flex flex-col items-center relative group hover:border-primary/30 transition-all">
                <div className="absolute -top-10 flex flex-col items-center">
                   <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-secondary border-2 border-border flex items-center justify-center text-muted-foreground font-black text-lg lg:text-xl shadow-lg">
                      {top3[2].name?.[0]?.toUpperCase() || 'M'}
                   </div>
                   <div className="mt-2 scale-90">
                      <LeagueBadge rating={top3[2].rating} size="sm" showLabel={false} />
                   </div>
                </div>
                <div className="mt-8 text-center w-full">
                   <p className="font-black text-base lg:text-lg truncate px-2">{top3[2].pseudonym || top3[2].name || 'Аноним'}</p>
                   <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-3"><span>Бронза</span> • Уровень {top3[2].level}</p>
                   <div className="bg-primary/10 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl border border-primary/20 inline-block">
                      <p className="text-lg lg:text-xl font-black text-foreground">{top3[2].experience} <span className="text-[10px] text-muted-foreground">XP</span></p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-card/30 border border-border rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Место</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Атлет</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Лига</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Уровень</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Сессии</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Опыт (XP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rest.length > 0 ? (
                rest.map((user, i) => (
                  <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-muted-foreground">#{i + 4}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-black text-primary border border-border group-hover:border-primary/30 transition-colors uppercase">
                          {(user.pseudonym || user.name || 'A')[0]}
                        </div>
                        <span className="text-sm font-bold">{user.pseudonym || user.name || 'Аноним'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <LeagueBadge rating={user.rating} size="sm" showLabel={false} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black px-2 py-1 bg-secondary rounded-md border border-border uppercase">LVL {user.level}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-foreground">{user._count?.sessions || 0}</span>
                          <span className="text-[8px] text-muted-foreground uppercase font-black">Служб</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-primary font-black">
                        {user.experience.toLocaleString()}
                        <Zap className="w-3 h-3 fill-current" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredLeaderboard.length <= 3 && filteredLeaderboard.length > 0 ? (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                       Остальные участники пока не набрали достаточно опыта
                    </td>
                 </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                    Атлеты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Motivation Footer */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center">
         <div className="max-w-2xl mx-auto">
            <Activity className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-black mb-2 uppercase">Твой результат — твоя дисциплина</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
               Рейтинг обновляется в режиме реального времени. Каждая завершенная сессия Шульте, Струп-теста или тренировки памяти приближает тебя к вершине. 
               Используй <span className="text-primary font-bold">инвертированные таблицы</span> и <span className="text-primary font-bold">режим Горбова</span> для получения максимального опыта.
            </p>
         </div>
      </div>
    </div>
  );
}
