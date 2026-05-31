/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, Sun, Code2, Play, LayoutDashboard, LogIn, LogOut, 
  Calculator, Cog, Grid3x3, BrainCircuit, 
  Users, Menu, X, Info, MessageSquare, Lock, Trophy, 
  ExternalLink, ChevronRight, Settings, Heart, Lightbulb, Palette,
  GitBranch, Filter, Cpu, VolumeX, Leaf, Search
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { SpeedTyping } from './components/SpeedTyping';
import { SpatialConcealment } from './components/SpatialConcealment';
import { SchulteGrid } from './components/SchulteGrid';
import { Dashboard } from './components/Dashboard';
import { NumericalAnalysis } from './components/NumericalAnalysis';
import { LogicalMatrix } from './components/LogicalMatrix';
import { StroopTest } from './components/StroopTest';
import { NBackTest } from './components/NBackTest';
import { SituationalJudgmentTest } from './components/SituationalJudgmentTest';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthModal } from './components/AuthModal';
import { SymbolChat } from './components/SymbolChat';
import { FeedbackModal } from './components/FeedbackModal';

import { AdminPanel } from './components/AdminPanel';
import { IdeasWall } from './components/IdeasWall';
import { ObjectiveFilter } from './components/ObjectiveFilter';
import { ProfilingRICE } from './components/ProfilingRICE';
import { AnomalyDetector } from './components/AnomalyDetector';
import { DialogueArchitecture } from './components/DialogueArchitecture';
import { LeaderboardView } from './components/LeaderboardView';
import { TopologyMemory } from './components/TopologyMemory';
import { CollisionDetector } from './components/CollisionDetector';
import { AsyncDispatcher } from './components/AsyncDispatcher';
import { NoiseReduction } from './components/NoiseReduction';
import { LanguageScanner } from './components/LanguageScanner';
import { Decryptor } from './components/Decryptor';
import { RealityCheck } from './components/RealityCheck';
import { DonateButton } from './components/DonateButton';
import { NeuroSilence } from './components/NeuroSilence';
import { CognitiveTrashFilter } from './components/CognitiveTrashFilter';

type Tab = 'dashboard' | 'schulte' | 'numerical' | 'logical' | 'stroop' | 'nback' | 'situational' | 'typing' | 'spatial' | 'admin' | 'ideas' | 'objective' | 'profiling' | 'anomaly' | 'dialogue' | 'leaderboard' | 'topology' | 'collision' | 'dispatcher' | 'noise' | 'scanner' | 'decryptor' | 'reality' | 'silence' | 'filter';

const tabTitles: Record<string, string> = {
  '/': 'Обзор',
  '/dashboard': 'Обзор',
  '/leaderboard': 'Рейтинг лидеров',
  '/schulte': 'Таблицы Шульте',
  '/numerical': 'Числовой анализ',
  '/logical': 'Системная логика',
  '/stroop': 'Эффект Струпа',
  '/nback': 'N-назад (Память)',
  '/situational': 'Ситуационный тест',
  '/typing': 'Скоростная печать',
  '/spatial': 'Пространство',
  '/topology': 'Архитектура контекста',
  '/collision': 'Детектор коллизий',
  '/dispatcher': 'Асинхронный диспетчер',
  '/noise': 'Редукция шума',
  '/scanner': 'Смысловой сканер',
  '/decryptor': 'Декриптор',
  '/reality': 'Верификация реальности',
  '/ideas': 'Предложения',
  '/admin': 'Админ-панель',
  '/objective': 'Объективный фильтр',
  '/profiling': 'Профилирование RICE',
  '/anomaly': 'Детектор аномалий',
  '/dialogue': 'Архитектура диалога',
  '/silence': 'Нейрорегуляция: «Тишина»',
  '/filter': 'Когнитивный фильтр'
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = (location.pathname.slice(1) || 'dashboard') as Tab;
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const { user, logout, token } = useAuth();
  const isAdmin = (user as any)?.role === 'ADMIN';

  useEffect(() => {
    const title = tabTitles[location.pathname] || 'Когнитика';
    document.title = `${title} | Когнитика`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 bg-background text-foreground relative">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px]"></div>
      </div>

      <header className="flex justify-between items-center bg-card/50 border-b border-border px-4 sm:px-8 py-3 sm:py-4 flex-shrink-0 backdrop-blur-md relative z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary border border-primary/50 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current rotate-45"></div>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tighter text-foreground uppercase">Когнитика</h1>
              <p className="text-[9px] text-primary font-bold uppercase tracking-[0.2em] hidden sm:block">Система когнитивного развития</p>
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
          <button 
            onClick={() => navigate('/')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'dashboard' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Обзор
          </button>
          <button 
            onClick={() => navigate('/leaderboard')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'leaderboard' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Trophy className="w-4 h-4" /> Рейтинг
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button 
            onClick={() => navigate('/schulte')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'schulte' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Play className="w-4 h-4" /> Шульте
          </button>
          <button 
            onClick={() => navigate('/numerical')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'numerical' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Calculator className="w-4 h-4" /> Числа
          </button>
          <button 
            onClick={() => navigate('/logical')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'logical' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Grid3x3 className="w-4 h-4" /> Логика
          </button>
          <button 
            onClick={() => navigate('/stroop')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'stroop' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Palette className="w-4 h-4" /> Струп
          </button>
          <button 
            onClick={() => navigate('/nback')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'nback' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <BrainCircuit className="w-4 h-4" /> Память
          </button>
          <button 
            onClick={() => navigate('/typing')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'typing' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Play className="w-4 h-4" /> Печать
          </button>
          <button 
            onClick={() => navigate('/spatial')} 
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${activeTab === 'spatial' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <Grid3x3 className="w-4 h-4" /> Пространство
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:block">
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
              title="Отправить отзыв"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          
          {user ? (
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 bg-secondary rounded-full border border-border hover:border-primary/30 transition-all group"
            >
              <div className="text-right hidden md:block px-1">
                <p className="text-[10px] font-bold leading-none transition-colors group-hover:text-primary">
                  {user.pseudonym || user.name || 'Аноним'}
                </p>
                <p className="text-[8px] text-primary uppercase font-black tracking-tighter">LVL {user.level || 1}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/10 uppercase">
                {(user.pseudonym || user.name || 'A')[0]}
              </div>
            </button>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[10px] sm:text-xs uppercase tracking-wider rounded-lg font-bold hover:shadow-lg hover:shadow-primary/30 transition-all shadow-md">
              <LogIn className="w-4 h-4" /> <span className="hidden xs:inline">Войти</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Sidebar / Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-[50] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              key="sidebar"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-card/60 backdrop-blur-2xl border-r border-white/10 z-[51] lg:hidden flex flex-col p-6 shadow-2xl"
            >
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <div className="w-4 h-4 border-2 border-current rotate-45"></div>
                 </div>
                 <span className="font-black uppercase tracking-tighter text-sm">Центр Управления</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* User Section */}
              {user ? (
                <div className="bg-secondary/50 rounded-2xl p-4 border border-border shadow-inner">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 uppercase">
                         {(user.pseudonym || user.name || 'A')[0]}
                      </div>
                      <div className="min-w-0">
                         <p className="font-bold text-base truncate">{user.pseudonym || user.name || 'Аноним'}</p>
                         <p className="text-[10px] text-muted-foreground uppercase font-medium">{user.email || 'Anonymous Session'}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="bg-background rounded-xl p-2 text-center border border-border">
                         <p className="text-[8px] text-muted-foreground uppercase font-bold">Уровень</p>
                         <p className="text-sm font-black text-primary">{user.level || 1}</p>
                      </div>
                      <div className="bg-background rounded-xl p-2 text-center border border-border">
                         <p className="text-[8px] text-muted-foreground uppercase font-bold">Рейтинг</p>
                         <p className="text-sm font-black">{user.rating || 0}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
                  <Trophy className="w-8 h-8 text-primary mx-auto mb-3 opacity-50" />
                  <p className="text-xs font-bold uppercase tracking-widest mb-4">Войдите для сохранения прогресса</p>
                  <button onClick={() => { setIsAuthOpen(true); setIsMobileMenuOpen(false); }} className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md">
                    Авторизация
                  </button>
                </div>
              )}

              {/* Mobile Navigation */}
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-muted-foreground uppercase px-3 mb-3 tracking-widest">Когнитивные тесты</p>
                 {[
                   { id: 'dashboard', icon: LayoutDashboard, label: 'Рабочий стол' },
                   { id: 'leaderboard', icon: Trophy, label: 'Рейтинг лидеров' },
                   { id: 'schulte', icon: Play, label: 'Таблицы Шульте' },
                   { id: 'numerical', icon: Calculator, label: 'Анализ чисел' },
                   { id: 'logical', icon: Grid3x3, label: 'Системная логика' },
                   { id: 'stroop', icon: Palette, label: 'Эффект Струпа' },
                   { id: 'nback', icon: BrainCircuit, label: 'N-назад (Память)' },
                   { id: 'situational', icon: Users, label: 'Ситуации' },
                   { id: 'typing', icon: Play, label: 'Скоростная печать' },
                   { id: 'spatial', icon: Grid3x3, label: 'Пространство' },
                   { id: 'topology', icon: GitBranch, label: 'Архитектура контекста' },
                   { id: 'collision', icon: Filter, label: 'Детектор коллизий' },
                   { id: 'dispatcher', icon: Cpu, label: 'Асинхр. диспетчер' },
                   { id: 'noise', icon: VolumeX, label: 'Редукция шума' },
                   { id: 'scanner', icon: Search, label: 'Смысловой сканер' },
                   { id: 'ideas', icon: Lightbulb, label: 'Предложения' },
                 ].map((item) => (
                   <button 
                      key={item.id}
                      onClick={() => { navigate(item.id === 'dashboard' ? '/' : `/${item.id}`); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                   >
                      <div className="flex items-center gap-3">
                         <item.icon className="w-4 h-4" /> {item.label}
                      </div>
                      {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
                   </button>
                 ))}
              </div>

              {/* Settings & System */}
              <div className="pt-4 border-t border-border">
                 <p className="text-[10px] font-black text-muted-foreground uppercase px-3 mb-3 tracking-widest">Персонализация</p>
                 <div className="bg-secondary/30 rounded-2xl p-2 border border-border">
                    <button 
                       onClick={() => { setIsFeedbackOpen(true); setIsMobileMenuOpen(false); }}
                       className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                         <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                            <MessageSquare className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-bold">Обратная связь</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button 
                       onClick={() => setIsChatEnabled(!isChatEnabled)}
                       className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                         <div className={`p-1.5 rounded-lg ${isChatEnabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <MessageSquare className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-bold">Интерактивный чат</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isChatEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                         <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${isChatEnabled ? 'right-1' : 'left-1'}`} />
                      </div>
                    </button>
                    <button 
                       onClick={() => { setIsDonateOpen(true); setIsMobileMenuOpen(false); }}
                       className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                         <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500">
                            <Heart className="w-4 h-4" />
                         </div>
                         <span className="text-sm font-bold">Поддержать проект</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="px-3 py-2">
                       <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2">Цветовая схема</p>
                       <ThemeToggle />
                    </div>
                 </div>
              </div>

              {/* About & Credits */}
              <div className="pt-4 border-t border-border">
                 <div className="bg-background border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                       <Info className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-wider">Metatext</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
                      Создано <span className="text-foreground font-black">Gemini AI</span> по заданию <span className="text-foreground font-black">Богорад Сергея Борисовича</span>.
                    </p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                      <a href="https://syntog.ru" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline font-black uppercase tracking-tight">
                        syntog.ru <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold italic">
                         2026 Edition <Heart className="w-2 h-2 text-primary fill-primary" />
                      </div>
                    </div>
                 </div>
              </div>
            </div>

            {user && (
              <div className="p-4 border-t border-border bg-secondary/10">
                <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-destructive/20">
                  <LogOut className="w-4 h-4" /> Завершить сеанс
                </button>
              </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 pb-32 lg:pb-10 px-4 md:px-8 mt-4">
         <div className="lg:col-span-9 h-full">
            <Routes>
              <Route path="/" element={<Dashboard onStartGame={(game) => navigate(`/${game}`)} />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/schulte" element={<SchulteGrid />} />
              <Route path="/numerical" element={<NumericalAnalysis />} />
              <Route path="/logical" element={<LogicalMatrix />} />
              <Route path="/stroop" element={<StroopTest />} />
              <Route path="/nback" element={<NBackTest />} />
              <Route path="/situational" element={<SituationalJudgmentTest />} />
              <Route path="/typing" element={<SpeedTyping />} />
              <Route path="/spatial" element={<SpatialConcealment />} />
              <Route path="/objective" element={<ObjectiveFilter />} />
              <Route path="/profiling" element={<ProfilingRICE />} />
              <Route path="/anomaly" element={<AnomalyDetector />} />
              <Route path="/dialogue" element={<DialogueArchitecture />} />
              <Route path="/admin" element={<AdminPanel token={token} />} />
              <Route path="/ideas" element={<IdeasWall token={token} />} />
              <Route path="/leaderboard" element={<LeaderboardView />} />
              <Route path="/topology" element={<TopologyMemory />} />
              <Route path="/collision" element={<CollisionDetector />} />
              <Route path="/dispatcher" element={<AsyncDispatcher />} />
              <Route path="/noise" element={<NoiseReduction level={1} />} />
              <Route path="/scanner" element={<LanguageScanner />} />
              <Route path="/decryptor" element={<Decryptor />} />
              <Route path="/reality" element={<RealityCheck onFinish={() => navigate('/')} />} />
              <Route path="/silence" element={<NeuroSilence />} />
              <Route path="/filter" element={<CognitiveTrashFilter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
         </div>
         
         {/* Adaptive Chat Position */}
         {isChatEnabled && (
           <div className="fixed bottom-28 right-4 lg:relative lg:bottom-0 lg:right-0 lg:col-span-3 h-[450px] lg:h-full z-40 transition-all">
             <div className="h-full bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl lg:shadow-none">
                <SymbolChat />
             </div>
           </div>
         )}
      </main>

      {/* Floating Mobile Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-16 bg-card/60 backdrop-blur-2xl border border-white/10 rounded-3xl lg:hidden z-50 flex items-center justify-around px-2 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.3)]">
         {[
           { id: 'dashboard', icon: LayoutDashboard },
           { id: 'schulte', icon: Play },
           { id: 'logical', icon: Grid3x3 },
           { id: 'nback', icon: BrainCircuit },
           { id: 'situational', icon: Users },
         ].map((item) => (
           <button 
             key={item.id}
             onClick={() => navigate(item.id === 'dashboard' ? '/' : `/${item.id}`)}
             className={`p-3 rounded-2xl transition-all relative ${activeTab === item.id ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}
           >
             <item.icon className="w-5 h-5" />
             {activeTab === item.id && (
                <motion.div 
                   layoutId="activeTabMobile" 
                   className="absolute inset-0 bg-primary/10 rounded-2xl -z-10"
                   transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                />
             )}
           </button>
         ))}
         <div className="w-px h-6 bg-border mx-1"></div>
         <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
         </button>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      <DonateButton isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
       <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-background text-primary shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/50'}`} title="Светлая">
         <Sun className="w-3.5 h-3.5" />
       </button>
       <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-background text-primary shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/50'}`} title="Темная">
         <Moon className="w-3.5 h-3.5" />
       </button>
       <button onClick={() => setTheme('matrix')} className={`p-1.5 rounded-md transition-all ${theme === 'matrix' ? 'bg-background text-primary shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/50'}`} title="Матрица">
         <Code2 className="w-3.5 h-3.5" />
       </button>
       <button onClick={() => setTheme('nature')} className={`p-1.5 rounded-md transition-all ${theme === 'nature' ? 'bg-background text-primary shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/50'}`} title="Позитив">
         <Leaf className="w-3.5 h-3.5" />
       </button>
    </div>
  )
}
