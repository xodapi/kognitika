import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, Target, Star, Lock, Activity, Award, Flame, CheckCircle2, MessageSquare, Lightbulb, Shield, ArrowUpRight, Share2, Brain } from 'lucide-react';
import { IdeasWall } from './IdeasWall';
import { AdminPanel } from './AdminPanel';
import { TrainingGallery } from './TrainingGallery';
import { BrainIdBadge } from './BrainIdBadge';
import { LeagueBadge } from './LeagueBadge';
import { ShareCard } from './ShareCard';
import { DuelsView } from './DuelsView';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { DailyTrajectoryPanel } from './DailyTrajectoryPanel';

const logger = createSafeLogger('dashboard');
import { CognitiveProfile } from './CognitiveProfile';
import { Wiki } from './Wiki';
import { StreakBanner } from './StreakBanner';
import { Sword, LayoutDashboard, BookOpen } from 'lucide-react';

export function Dashboard({ onStartGame }: { onStartGame: (game: string) => void }) {
  const { user, token, refreshUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [levelProgress, setLevelProgress] = useState(0);
  const [userRole, setUserRole] = useState<string>('USER');
  const [streak, setStreak] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'training' | 'profile' | 'duels' | 'wiki' | 'ideas' | 'admin'>('training');
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
     // Fetch leaderboard
     fetch('/api/leaderboard')
       .then(res => res.json())
       .then(resData => {
          if (Array.isArray(resData)) setLeaderboard(resData);
       })
       .catch(err => logger.error('Leaderboard fetch failed', { error: safeError(err) }));

     if (!token) return;

     // Fetch daily status
     fetch('/api/dashboard/status', {
        headers: { 'Authorization': `Bearer ${token}` }
     })
     .then(res => res.json())
     .then(resData => {
        if (resData.dailyTasks) setDailyTasks(resData.dailyTasks);
        if (resData.levelProgress !== undefined) setLevelProgress(resData.levelProgress);
        if (resData.role) setUserRole(resData.role);
        if (resData.streak) setStreak(resData.streak);
     })
     .catch(err => logger.error('Dashboard status fetch failed', { error: safeError(err) }));

     // Fetch user progress
     fetch('/api/progress', {
        headers: { 'Authorization': `Bearer ${token}` }
     })
     .then(res => res.json())
     .then(resData => {
          if (Array.isArray(resData)) {
             const schulteData = resData.filter(d => d.gameType === 'SCHULTE' || d.gameType === 'SCHULTE_GORBOV');
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
     .catch(err => logger.error('Progress fetch failed', { error: safeError(err) }));
  }, [token]);

  const milestones = [
    { title: 'Базовая концентрация', level: 1, icon: Award },
    { title: 'Скоростной анализ', level: 5, icon: Zap },
    { title: 'Системное мышление', level: 10, icon: Star },
    { title: 'Когнитивный поток', level: 25, icon: Target },
    { title: 'Мастер Интеллекта', level: 50, icon: Trophy },
  ];

  return (
    <div className="space-y-8 flex flex-col pb-12">
      {/* Navigation Tabs - Decluttered: Only Training and Admin */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid w-full grid-cols-2 gap-2 bg-card/30 p-1.5 border border-border rounded-2xl sm:w-fit sm:flex sm:flex-wrap">
          <button 
            onClick={() => setActiveTab('training')}
            className={`flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all sm:px-6 ${activeTab === 'training' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            Тренировки
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all sm:px-6 ${activeTab === 'profile' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Brain className="w-4 h-4 shrink-0" />
            Профиль
          </button>
          <button 
            onClick={() => setActiveTab('duels')}
            className={`flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all sm:px-6 ${activeTab === 'duels' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Sword className="w-4 h-4 shrink-0" />
            Дуэли
          </button>
          <button 
            onClick={() => setActiveTab('wiki')}
            className={`flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all sm:px-6 ${activeTab === 'wiki' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Знания
          </button>
          {userRole === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all sm:px-6 ${activeTab === 'admin' ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20' : 'text-muted-foreground hover:text-destructive'}`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              Админ
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3 xl:justify-end">
          {user?.rating !== undefined && <LeagueBadge rating={user.rating} size="md" />}
          {user?.brainId && <BrainIdBadge brainId={user.brainId} pseudonym={user.pseudonym || 'Anonymous'} />}
        </div>
      </div>

       <AnimatePresence mode="wait">
        {activeTab === 'training' && (
          <motion.div
            key="training"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Streak Banner */}
            <StreakBanner streak={streak} />

            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black tracking-tight mb-2">Привет, {user?.pseudonym || user?.name || 'Мастер'}!</h1>
                <p className="text-muted-foreground text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Ваш прогресс за сегодня: <span className="text-foreground font-bold">{dailyTasks.filter(t => t.completed).length}/{dailyTasks.length} задач</span>
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-0.5">Совет дня</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    В режиме Горбова не ищите число глазами, старайтесь охватить взглядом всю таблицу сразу.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
               <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
               
               <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 animate-pulse">
                     <Trophy className="w-8 h-8 fill-current" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black tracking-tight text-foreground">
                        Центр подготовки
                     </h2>
                     <p className="text-sm text-muted-foreground font-medium">
                        Выберите модуль для начала ежедневной тренировки
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-4 relative z-10 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  {dailyTasks.map(task => (
                    <div key={task.id} className={`flex flex-col items-center px-4 py-2 border rounded-2xl min-w-[120px] ${task.completed ? 'bg-green-500/10 border-green-500/20' : 'bg-background/50 border-border'}`}>
                       <span className="text-[9px] font-black uppercase text-foreground mb-1 text-center">
                          {task.title}
                       </span>
                       <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase ${task.completed ? 'text-green-500' : 'text-muted-foreground'}`}>
                             {task.completed ? 'БОНУС ПОЛУЧЕН' : `+${task.reward} XP`}
                          </span>
                          {task.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Библиотека симуляций</h2>
                 <div className="flex items-center gap-2 text-[10px] text-primary font-bold uppercase">
                    <Activity className="w-3 h-3" /> 9 Доступных модулей
                 </div>
              </div>
              <TrainingGallery onStart={onStartGame} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               {/* Stats & Charts */}
               <div className="lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-card/40 border border-border rounded-2xl p-5 flex flex-col gap-1 relative group">
                        <button 
                          onClick={() => setIsShareOpen(true)}
                          className="absolute top-4 right-4 p-2 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20"
                          title="Поделиться профилем"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Уровень {user?.level || 1}</span>
                           <Award className="w-4 h-4 text-primary opacity-50" />
                        </div>
                        <div className="text-2xl font-black text-foreground">{user?.experience || 0} <span className="text-xs text-muted-foreground">XP</span></div>
                        <div className="w-full bg-secondary/50 h-1.5 rounded-full mt-2 overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} className="h-full bg-primary" />
                        </div>
                     </div>
                      <div className="bg-card/40 border border-border rounded-2xl p-5 flex flex-col gap-1">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Тренировки</span>
                            <Activity className="w-4 h-4 text-primary opacity-50" />
                         </div>
                         <div className="text-2xl font-black text-foreground">{user?._count?.sessions || 0}</div>
                         <p className="text-[10px] text-muted-foreground mt-1">ВСЕГО СЕССИЙ</p>
                      </div>

                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden group">
                         <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-orange-500/20 rounded-full blur-2xl animate-pulse" />
                         <div className="flex items-center justify-between relative z-10">
                            <span className="text-[10px] text-orange-500 uppercase font-black tracking-widest">Ударный режим</span>
                            <Flame className={`w-4 h-4 ${user?.streakDays ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'} transition-all`} />
                         </div>
                         <div className="text-2xl font-black text-foreground relative z-10">
                            {user?.streakDays || 0} <span className="text-xs text-muted-foreground uppercase">дней</span>
                         </div>
                         <p className="text-[10px] text-muted-foreground mt-1 relative z-10">
                            {user?.streakDays ? 'ВАШ РЕКОРД В ПУТИ' : 'НАЧНИТЕ СЕГОДНЯ'}
                         </p>
                      </div>

                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden group">
                         <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/20 rounded-full blur-2xl" />
                         <div className="flex items-center justify-between relative z-10">
                            <span className="text-[10px] text-primary uppercase font-black tracking-widest">Следующая цель</span>
                            <Target className="w-4 h-4 text-primary" />
                         </div>
                         <div className="text-xl font-black text-foreground relative z-10">
                            {data.length > 0 && Math.min(...data.map(d => d.time)) < 30000 
                              ? 'Выйти из 25с' 
                              : 'Выйти из 30с'}
                         </div>
                         <p className="text-[10px] text-muted-foreground mt-1 relative z-10">ПРОФ. СТАНДАРТ</p>
                      </div>
                  </div>

                  <div className="bg-card/40 border border-border rounded-3xl p-6 h-[320px]">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Динамика Шульте</h3>
                     </div>
                     <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => typeof v === 'number' ? `${(v / 1000).toFixed(0)}s` : ''}
                              />
                              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }} />
                              <Line type="monotone" dataKey="time" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>

               {/* Right Sidebar */}
               <div className="lg:col-span-4 space-y-6">
                  {/* Daily Trajectory */}
                  <DailyTrajectoryPanel onStartGame={onStartGame} />

                  <div className="bg-card/40 border border-border rounded-3xl p-6">
                     <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Ваш Путь</h3>
                     <div className="space-y-6">
                        {milestones.map((m, i) => (
                           <div key={i} className="flex items-center gap-4 relative">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${m.level <= (user?.level || 1) ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground'}`}>
                                 <m.icon className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className={`text-xs font-black uppercase tracking-wide ${m.level <= (user?.level || 1) ? 'text-foreground' : 'text-muted-foreground'}`}>{m.title}</p>
                                 <p className="text-[10px] text-muted-foreground uppercase font-bold">Уровень {m.level}</p>
                              </div>
                              {m.level > (user?.level || 1) && <Lock className="w-3 h-3 text-muted-foreground/30 ml-auto" />}
                           </div>
                        ))}
                     </div>
                  </div>

                   <div className="bg-card/40 border border-border rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                         <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Лидеры</h3>
                         <button onClick={() => onStartGame('leaderboard')} className="text-[9px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                            Весь список <ArrowUpRight className="w-2.5 h-2.5" />
                         </button>
                      </div>
                     <div className="space-y-3">
                        {leaderboard.slice(0, 5).map((u, i) => (
                           <div key={i} className="flex items-center justify-between p-2 rounded-xl">
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-black text-muted-foreground">{i + 1}</span>
                                 <span className="text-xs font-bold text-foreground">{u.name || 'Машинист'}</span>
                              </div>
                              <div className="text-[10px] font-black text-primary">{u.experience} XP</div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
        
        {activeTab === 'profile' && (
          <motion.div 
            key="profile" 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <CognitiveProfile />
          </motion.div>
        )}

        {activeTab === 'wiki' && (
          <motion.div 
            key="wiki" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Wiki />
          </motion.div>
        )}

        {activeTab === 'duels' && (
          <motion.div key="duels" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <DuelsView />
          </motion.div>
        )}

        {activeTab === 'ideas' && (
          <motion.div key="ideas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <IdeasWall token={token} />
          </motion.div>
        )}

        {activeTab === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <AdminPanel token={token} />
          </motion.div>
        )}
      </AnimatePresence>

      <ShareCard isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
}
