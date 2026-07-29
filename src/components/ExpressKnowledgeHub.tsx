import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, Grid3x3, Play, ArrowLeft, CheckCircle2, 
  Trophy, Clock, Target, Zap, Brain, RefreshCw,
  ChevronRight, Info, AlertCircle, Flame, BrainCircuit
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { haptic } from '../lib/haptic';

const logger = createSafeLogger('express-knowledge');

export type ExpressKnowledgeMode = 'mental-math' | 'schulte-90';

interface ExpressKnowledgeStats {
  mentalMath: {
    bestTime: number | null;
    bestScore: number | null;
    totalSessions: number;
    accuracy: number;
    lastPlayed: string | null;
  };
  schulte90: {
    bestTime: number | null;
    bestScore: number | null;
    totalSessions: number;
    accuracy: number;
    lastPlayed: string | null;
  };
}

interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
  reward: number;
}

function getModeKey(mode: ExpressKnowledgeMode): keyof ExpressKnowledgeStats {
  return mode === 'mental-math' ? 'mentalMath' : 'schulte90';
}

export function ExpressKnowledgeHub() {
  const { token, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeMode, setActiveMode] = useState<ExpressKnowledgeMode | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<ExpressKnowledgeStats>({
    mentalMath: { bestTime: null, bestScore: null, totalSessions: 0, accuracy: 0, lastPlayed: null },
    schulte90: { bestTime: null, bestScore: null, totalSessions: 0, accuracy: 0, lastPlayed: null },
  });
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [levelProgress, setLevelProgress] = useState(0);

  // Fetch stats and daily tasks
  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      try {
        // Fetch game stats for both types
        const [mathRes, schulteRes, statusRes] = await Promise.all([
          fetch('/api/progress', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/progress', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/status', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        const [mathData, schulteData, statusData] = await Promise.all([
          mathRes.json(),
          schulteRes.json(),
          statusRes.json(),
        ]);

        // Process mental math stats
        const mathSessions = Array.isArray(mathData) 
          ? mathData.filter((d: any) => d.gameType === 'MENTAL_MATH') 
          : [];
        const schulteSessions = Array.isArray(schulteData)
          ? schulteData.filter((d: any) => d.gameType === 'SCHULTE_90' || d.gameType === 'SCHULTE_GORBOV')
          : [];

        setStats({
          mentalMath: {
            bestTime: mathSessions.length ? Math.min(...mathSessions.map((s: any) => s.timeMs)) : null,
            bestScore: mathSessions.length ? Math.max(...mathSessions.map((s: any) => s.metadata?.score || 0)) : null,
            totalSessions: mathSessions.length,
            accuracy: mathSessions.length 
              ? Math.round(mathSessions.reduce((a: number, s: any) => a + (s.metadata?.accuracy || 0), 0) / mathSessions.length)
              : 0,
            lastPlayed: mathSessions.length ? mathSessions[0].createdAt : null,
          },
          schulte90: {
            bestTime: schulteSessions.length ? Math.min(...schulteSessions.map((s: any) => s.timeMs)) : null,
            bestScore: schulteSessions.length ? Math.max(...schulteSessions.map((s: any) => s.metadata?.score || 0)) : null,
            totalSessions: schulteSessions.length,
            accuracy: schulteSessions.length
              ? Math.round(schulteSessions.reduce((a: number, s: any) => a + (s.metadata?.accuracy || 0), 0) / schulteSessions.length)
              : 0,
            lastPlayed: schulteSessions.length ? schulteSessions[0].createdAt : null,
          },
        });

        if (statusData) {
          if (statusData.dailyTasks) setDailyTasks(statusData.dailyTasks);
          if (statusData.levelProgress !== undefined) setLevelProgress(statusData.levelProgress);
        }
      } catch (err) {
        logger.error('Failed to fetch express knowledge data', { error: safeError(err) });
      }
    };

    fetchData();
  }, [token]);

  const formatTime = (ms: number | null) => {
    if (!ms) return '—';
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return min > 0 ? `${min}:${remainingSec.toString().padStart(2, '0')}` : `${remainingSec}с`;
  };

  const handleStart = async (mode: ExpressKnowledgeMode) => {
    haptic.medium();
    setActiveMode(mode);
    setShowBriefing(true);
  };

  const handleConfirmStart = async () => {
    if (!activeMode) return;
    haptic.success();
    setShowBriefing(false);
    navigate(`/${activeMode}`);
  };

  const handleBack = () => {
    haptic.light();
    setActiveMode(null);
    setShowBriefing(false);
  };

  const MENTAL_MATH_PRESETS = [
    { level: 1, title: 'Сложение/Вычитание', description: 'Базовые операции до 100', ops: ['+', '-'] },
    { level: 2, title: 'Умножение/Деление', description: 'Таблица умножения и деление', ops: ['*', '/'] },
    { level: 3, title: 'Два символа (+/-)', description: 'Смешанные операции слева направо', ops: ['+', '-', '+', '-'] },
    { level: 4, title: 'Четыре символа (+-*/)', description: 'Все операции с приоритетом слева направо', ops: ['+', '-', '*', '/'] },
  ];

  const SCHULTE_90_RULES = [
    { id: 'black-red', title: 'Чёрный → Красный', description: 'Черёдуйте черное и красное число по порядку', icon: '🔴⚫' },
    { id: 'red-black', title: 'Красный → Чёрный', description: 'Черёдуйте красное и чёрное число по порядку', icon: '⚫🔴' },
    { id: 'red-red', title: 'Красный → Красный', description: 'Ищите только красные числа от 1 до 45', icon: '🔴🔴' },
    { id: 'black-black', title: 'Чёрный → Чёрный', description: 'Ищите только чёрные числа от 46 до 90', icon: '⚫⚫' },
  ];

  const renderModeCard = (mode: ExpressKnowledgeMode) => {
    const key = getModeKey(mode);
    const s = stats[key];
    const isMath = mode === 'mental-math';
    
    return (
      <motion.button
        key={mode}
        whileHover={{ y: -4, scale: 1.02, boxShadow: '0 20px 40px -10px rgba(var(--primary-rgb), 0.2)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleStart(mode)}
        className="relative group flex flex-col h-full bg-card/40 backdrop-blur-md border border-border rounded-[2.5rem] p-8 shadow-sm transition-all overflow-hidden"
        style={{ minHeight: '480px' }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl ${
              isMath ? 'bg-emerald-500/20 text-emerald-500' : 'bg-sky-500/20 text-sky-500'
            }`}>
              {isMath ? <Calculator className="w-8 h-8" /> : <Grid3x3 className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${isMath ? 'text-emerald-500' : 'text-sky-500'}`}>
                {isMath ? 'Задание №7' : 'Задание №8'}
              </p>
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                {isMath ? 'Быстрые вычисления' : 'Таблица 1-90'}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1">
            {isMath 
              ? 'Ментальная арифметика под таймером. 4 режима сложности, до 48 примеров за сессию. Считайте в уме, вводите ответ, нажимайте Enter.'
              : 'Расширенный протокол Шульте-Горбова 9x10. 4 цветовых правила, 90 ячеек. Фокус в центр, периферийное зрение ищет числа.'}
          </p>

          {/* Key features */}
          <div className="space-y-3 mb-8">
            {isMath ? MENTAL_MATH_PRESETS.slice(0, 3).map((preset, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background/50 border border-border rounded-2xl">
                <span className="w-6 h-6 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {preset.level}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">{preset.title}</p>
                  <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                </div>
              </div>
            )) : SCHULTE_90_RULES.slice(0, 3).map((rule, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background/50 border border-border rounded-2xl">
                <span className="w-6 h-6 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs">
                  {rule.icon}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">{rule.title}</p>
                  <p className="text-[10px] text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            ))}
            <span
              onClick={(e) => { e.stopPropagation(); handleStart(mode); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleStart(mode); } }}
              className="block w-full text-xs font-black uppercase tracking-widest text-primary hover:underline cursor-pointer"
            >
              Подробнее о режимах →
            </span>
          </div>

          {/* Stats */}
          {s.totalSessions > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <div className="text-center">
                <p className="text-2xl font-mono font-black text-primary">{formatTime(s.bestTime)}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Лучшее время</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-mono font-black text-primary">{s.bestScore}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Рекордный счёт</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-mono font-black text-primary">{s.totalSessions}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Сессий всего</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-mono font-black text-primary">{s.accuracy}%</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Средняя точность</p>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <motion.div
            role="button"
            tabIndex={0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStart(mode)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleStart(mode); }}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all text-center cursor-pointer ${
              isMath 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30' 
                : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/30'
            }`}
          >
            {isGenerating ? 'Генерация...' : `Начать ${isMath ? 'вычисления' : 'поиск'}`}
          </motion.div>
        </div>
      </motion.button>
    );
  };

  const renderBriefing = () => {
    if (!activeMode || !showBriefing) return null;
    const isMath = activeMode === 'mental-math';
    const presets = isMath ? MENTAL_MATH_PRESETS : SCHULTE_90_RULES;

    return (
      <motion.div
        key="briefing"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleBack}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-card/95 backdrop-blur-2xl border border-border rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={handleBack}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Закрыть"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl ${isMath ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'}`}>
                {isMath ? <Calculator className="w-8 h-8" /> : <Grid3x3 className="w-8 h-8" />}
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.2em] ${isMath ? 'text-emerald-500' : 'text-sky-500'}`}>
                  {isMath ? 'Задание №7' : 'Задание №8'}
                </p>
                <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">
                  {isMath ? 'Быстрые вычисления' : 'Таблица 1-90'}
                </h2>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {/* Algorithm */}
              <div className="p-6 bg-secondary/40 border border-border/50 rounded-3xl">
                <h4 className="text-xs text-muted-foreground uppercase font-black tracking-[0.2em] mb-3">
                  Алгоритм
                </h4>
                <p className="text-sm text-foreground leading-relaxed font-medium mb-4">
                  {isMath 
                    ? 'Вычисляйте строго слева направо. Промежуточный результат может быть отрицательным, деление всегда даёт целое число. В режиме 3-4 используйте таблицу символов (Legend).'
                    : 'Найдите последовательно числа от 1 до 90, соблюдая цветовое правило Горбова. Фиксируйте взгляд ближе к центру таблицы и ищите числа периферическим зрением.'}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">
                    {isMath ? 'Нажмите Enter для отправки ответа' : 'Фокус строго в центр таблицы'}
                  </span>
                </div>
              </div>

              {/* Presets/Rules */}
              <div className="space-y-4">
                <h4 className="text-xs text-muted-foreground uppercase font-black tracking-[0.2em]">
                  {isMath ? 'Режимы сложности' : 'Правила Горбова'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presets.map((p, i) => (
                    <div key={i} className="p-4 bg-background/50 border border-border rounded-2xl">
                      <p className="text-xs font-bold text-foreground mb-1">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Normative */}
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary font-black uppercase tracking-widest mb-2">Норматив</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold text-foreground">
                    {isMath ? '~5 мин (48 вопросов)' : '90–150 с'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirmStart}
                disabled={isGenerating}
                className="flex-1 py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all disabled:opacity-60"
              >
                {isGenerating ? 'Генерация заданий...' : 'Инициализировать тест'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                className="flex-1 py-5 border border-border text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all"
              >
                Назад
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Check if express knowledge tasks exist in daily tasks
  const mathTask = dailyTasks.find(t => t.id === 'mental-math' || t.title.includes('Вычисл'));
  const schulteTask = dailyTasks.find(t => t.id === 'schulte-90' || t.title.includes('Таблица') || t.title.includes('Шульте'));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">
            Экспресс-знания
          </p>
          <h1 className="text-3xl font-black tracking-tight">Тренировки №7 и №8</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Ежедневные протоколы скоростного счёта и расширенного поиска Шульте-Горбова.
            Норматив: ~5 минут на вычисления, 90–150 секунд на таблицу 1-90.
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4 max-w-sm">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-primary uppercase font-black tracking-widest mb-0.5">Прогресс уровня</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-foreground">{levelProgress}%</span>
              <span className="text-xs font-mono text-muted-foreground uppercase">до следующего</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks Preview */}
      {(mathTask || schulteTask) && (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 animate-pulse">
              <Flame className="w-8 h-8 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Ежедневные задания Экспресс-знаний
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Выполните оба протокола для бонусного XP и поддержания стика
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {mathTask && (
              <div className={`flex flex-col items-center px-4 py-2 border rounded-2xl min-w-[120px] ${mathTask.completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-background/50 border-border'}`}>
                <span className="text-xs font-black uppercase text-foreground mb-1 text-center">
                  Быстрые вычисления
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase ${mathTask.completed ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {mathTask.completed ? 'БОНУС ПОЛУЧЕН' : `+${mathTask.reward} XP`}
                  </span>
                  {mathTask.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
            )}
            {schulteTask && (
              <div className={`flex flex-col items-center px-4 py-2 border rounded-2xl min-w-[120px] ${schulteTask.completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-background/50 border-border'}`}>
                <span className="text-xs font-black uppercase text-foreground mb-1 text-center">
                  Таблица 1-90
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase ${schulteTask.completed ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {schulteTask.completed ? 'БОНУС ПОЛУЧЕН' : `+${schulteTask.reward} XP`}
                  </span>
                  {schulteTask.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid - Two Mode Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderModeCard('mental-math')}
        {renderModeCard('schulte-90')}
      </div>

      {/* Quick Stats Comparison */}
      {(stats.mentalMath.totalSessions > 0 || stats.schulte90.totalSessions > 0) && (
        <div className="bg-card/20 border border-border rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Сравнение прогресса</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-emerald-500 uppercase">Быстрые вычисления</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Лучшее время</span>
                  <span className="font-mono font-bold text-foreground">{formatTime(stats.mentalMath.bestTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Рекордный счёт</span>
                  <span className="font-mono font-bold text-foreground">{stats.mentalMath.bestScore || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Точность</span>
                  <span className="font-mono font-bold text-foreground">{stats.mentalMath.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Сессий</span>
                  <span className="font-mono font-bold text-foreground">{stats.mentalMath.totalSessions}</span>
                </div>
              </div>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Grid3x3 className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-black text-sky-500 uppercase">Таблица 1-90</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Лучшее время</span>
                  <span className="font-mono font-bold text-foreground">{formatTime(stats.schulte90.bestTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Рекордный счёт</span>
                  <span className="font-mono font-bold text-foreground">{stats.schulte90.bestScore || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Точность</span>
                  <span className="font-mono font-bold text-foreground">{stats.schulte90.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Сессий</span>
                  <span className="font-mono font-bold text-foreground">{stats.schulte90.totalSessions}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-amber-500 uppercase">Нормативы</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• Вычисления: <span className="text-foreground font-bold">~5 мин (48 вопросов)</span></p>
                <p>• Таблица 1-90: <span className="text-foreground font-bold">90–150 сек</span></p>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-primary uppercase">Рекомендация</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• Тренируйтесь ежедневно для стика</p>
                <p>• Чередуйте режимы для когнитивной гибкости</p>
                <p>• Точность важнее скорости на старте</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA to other trainers */}
      <div className="bg-card/40 border border-border rounded-3xl p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Другие модули Базы</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'schulte', label: 'Шульте 5x5', icon: Play, color: 'text-blue-500' },
            { id: 'numerical', label: 'Числовой анализ', icon: Calculator, color: 'text-emerald-500' },
            { id: 'logical', label: 'Логические матрицы', icon: Grid3x3, color: 'text-purple-500' },
            { id: 'nback', label: 'N-назад', icon: BrainCircuit, color: 'text-rose-500' },
          ].map(m => (
            <motion.button
              key={m.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/${m.id}`)}
              className="p-4 bg-background/50 border border-border rounded-2xl flex flex-col items-center gap-2 group"
            >
              <m.icon className={`w-6 h-6 ${m.color} group-hover:scale-110 transition-transform`} />
              <span className="text-xs font-black text-center text-foreground">{m.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {renderBriefing()}
    </div>
  );
}
