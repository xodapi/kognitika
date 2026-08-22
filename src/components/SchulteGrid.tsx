import { useState, useEffect, useRef } from 'react';
import { useGameAttempt } from '../lib/game-attempt-client';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Target, Info, Activity, AlertCircle, History } from 'lucide-react';
import { useSchulteEngine, CellValue, GameMode } from '../hooks/useSchulteEngine';
import { useAudioDistraction } from '../hooks/useAudioDistraction';
import { useAuth } from '../hooks/useAuth';
import { SchulteStats } from './SchulteStats';
import { ConcentrationCurve } from './ConcentrationCurve';
import { AttentionMap } from './AttentionMap';
import { useSessionRecording } from '../hooks/useSessionRecording';
import { StabilityIndicator } from './StabilityIndicator';
import { useEventBus } from '../hooks/useEventBus';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { haptic } from '../lib/haptic';

const PASTEL_COLORS = [
  '#fecaca', '#fed7aa', '#fef08a', '#dcfce7', '#d1fae5', '#ccfbf1', '#e0f2fe', '#e0e7ff', '#ede9fe', '#fae8ff',
  '#fce7f3', '#ffe4e6', '#f3f4f6', '#ecfdf5', '#fff7ed', '#fff1f2', '#f0f9ff', '#f5f3ff', '#fdf2f8', '#f0fdf4',
  '#fffbeb', '#f8fafc', '#eff6ff', '#faf5ff', '#fff1f2'
];
const logger = createSafeLogger('schulte-grid');

const HIGH_CONTRAST_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

type TrainingLevel = 'classic' | 'level1' | 'level2' | 'level3' | 'level4' | 'adaptive';
type ResultsView = 'stats' | 'curve' | 'attention';

/**
 * The active-play layout has a real behavioral boundary at Tailwind's `lg`
 * breakpoint. CSS can hide a chart, but a hidden Recharts tree still mounts,
 * reconciles and animates. This hook lets the render tree omit the mobile
 * analytics column altogether while preserving the desktop three-column view.
 */
function useMobilePlayLayout() {
  const query = '(max-width: 1023px)';
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateChaosStyle(modifications: any, timeMs: number, cellId: number) {
  const interval = modifications.chaosIntervalMs || 500;
  const tick = Math.floor(timeMs / interval);
  const seed = tick * 1000 + cellId;

  const r1 = pseudoRandom(seed);
  const r2 = pseudoRandom(seed + 1);
  const r3 = pseudoRandom(seed + 2);

  const styles: any = {
    opacity: 0.7 + r1 * 0.3,
  };

  let transforms = [];
  
  if (modifications.distortion) {
    transforms.push(`rotate(${r2 * 20 - 10}deg)`);
  } else {
    transforms.push(`rotate(${r2 * 4 - 2}deg)`);
  }

  if (modifications.inversion) {
    if (r3 < 0.33) transforms.push('rotate(180deg)');
    else if (r3 < 0.66) transforms.push('scaleX(-1)');
    else transforms.push('scaleY(-1)');
  }

  if (modifications.digitRotation) {
    const rotationFreq = 1 / 2000; // 1 full rotation every 2s
    const rotationDeg = (timeMs * rotationFreq * 360 + cellId * 45) % 360;
    transforms.push(`rotate(${rotationDeg}deg)`);
  }

  styles.transform = transforms.join(' ');

  if (modifications.colorNoise === 'pastel') {
    styles.backgroundColor = PASTEL_COLORS[Math.floor(r1 * PASTEL_COLORS.length)];
    styles.color = '#334155';
  } else if (modifications.colorNoise === 'high_contrast') {
    styles.backgroundColor = HIGH_CONTRAST_COLORS[Math.floor(r1 * HIGH_CONTRAST_COLORS.length)];
    styles.color = 'white';
  }

  return styles;
}

export function SchulteGrid() {
  // Test IDs for mobile layout verification
  const [distraction, setDistraction] = useState<'none' | 'audio' | 'visual' | 'chaos'>('none');
  const isAIAdaptationEnabled = false; // AI Adaptation disabled as per user request

  const { state, startGame, stopGame, resetGame, clickCell, setSettings, applyDifficultySuggestion, getCompletedAnalyticsJob } = useSchulteEngine(5, 'classic', distraction, isAIAdaptationEnabled);
  const isMobilePlayLayout = useMobilePlayLayout();
  const [activeResultsView, setActiveResultsView] = useState<ResultsView>('stats');
  const [isHardcore, setIsHardcore] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [bonusAwarded, setBonusAwarded] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<TrainingLevel>('classic');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const { token, refreshUser } = useAuth();
  const { beginAttempt, saveAttempt } = useGameAttempt(token);
  const gameTypeRef = useRef<'SCHULTE_GORBOV' | 'SCHULTE' | null>(null);
  const navigate = useNavigate();
  
  const [currentStability, setCurrentStability] = useState({ avg: 0, stability: 0 });
  useEventBus('STABILITY_UPDATE', (data) => {
    setCurrentStability(data);
  });
  
  const size = state.size;
  const mode = state.mode;
  
  useSessionRecording(state.isActive, state.isFinished);

  const applyLevel = (level: TrainingLevel) => {
    setCurrentLevel(level);
    switch (level) {
      case 'classic':
        setSettings(5, 'classic', { colorNoise: 'none', distortion: false, inversion: false, bgTheme: 'default', chaosIntervalMs: 500 });
        break;
      case 'level1':
        setSettings(5, 'classic', { colorNoise: 'pastel', distortion: false, inversion: false, bgTheme: 'default', chaosIntervalMs: 800 });
        break;
      case 'level2':
        setSettings(5, 'classic', { colorNoise: 'high_contrast', distortion: true, inversion: false, bgTheme: 'default', chaosIntervalMs: 1000 });
        break;
      case 'level3':
        setSettings(6, 'classic', { colorNoise: 'none', distortion: false, inversion: false, bgTheme: 'default', chaosIntervalMs: 500 });
        break;
      case 'level4':
        setSettings(6, 'classic', { colorNoise: 'high_contrast', distortion: true, inversion: true, bgTheme: 'dark-green', chaosIntervalMs: 1500, digitRotation: true });
        break;
      case 'adaptive':
        setSettings(5, 'classic', { colorNoise: 'none', distortion: false, inversion: false, bgTheme: 'default', chaosIntervalMs: 1000 });
        break;
    }
  };

  useAudioDistraction(
    distraction, 
    state.isActive, 
    state.expectedSequence[state.expectedIndex]?.num
  );

  // Pro/Railway Standard: 60s limit
  useEffect(() => {
    if (state.isActive && (mode === 'gorbov' || isHardcore) && state.timeMs > 60000) {
      stopGame();
    }
  }, [state.isActive, state.timeMs, mode, isHardcore, stopGame]);

  // Session tracking for Hardcore mode (3-5 min limit)
  useEffect(() => {
    if (state.isActive && isHardcore) {
      if (!sessionStartTime) setSessionStartTime(Date.now());
      else if (Date.now() - sessionStartTime > 300000) { // 5 minutes
        stopGame();
        alert('Рекомендуется перерыв после 5 минут интенсивной тренировки.');
        setSessionStartTime(null);
      }
    }
  }, [state.isActive, isHardcore, sessionStartTime, stopGame]);

  // Adaptive Difficulty Engine
  useEffect(() => {
    if (isAIAdaptationEnabled && state.isActive && state.clickHistory.length >= 3) {
      const last3 = state.clickHistory.slice(-3);
      const avgLast3 = last3.reduce((a, b) => a + b.reactionTimeMs, 0) / 3;
      
      if (avgLast3 < 800) {
        const nextInterval = Math.max(200, state.modifications.chaosIntervalMs - 50);
        if (nextInterval !== state.modifications.chaosIntervalMs) {
           setSettings(size, mode, { chaosIntervalMs: nextInterval });
        }
      } else if (avgLast3 > 2500) {
        const nextInterval = Math.min(3000, state.modifications.chaosIntervalMs + 100);
        if (nextInterval !== state.modifications.chaosIntervalMs) {
          setSettings(size, mode, { chaosIntervalMs: nextInterval });
        }
      }
    }
  }, [isAIAdaptationEnabled, state.isActive, state.clickHistory.length, state.modifications.chaosIntervalMs, size, mode, setSettings]);

  // Real-time Adaptive UI based on stability
  useEffect(() => {
    if (isAIAdaptationEnabled && state.isActive && currentLevel === 'adaptive' && currentStability.stability > 0) {
      // If stability is low (variance > 400ms), reduce noise to help focus
      if (currentStability.stability > 400) {
        if (state.modifications.colorNoise !== 'none' || state.modifications.distortion) {
          setSettings(size, mode, { colorNoise: 'none', distortion: false });
        }
      } 
      // If stability is high (variance < 150ms), increase noise to challenge
      else if (currentStability.stability < 150) {
        if (state.modifications.colorNoise === 'none') {
          setSettings(size, mode, { colorNoise: 'pastel', distortion: true });
        }
      }
    }
  }, [isAIAdaptationEnabled, state.isActive, currentLevel, currentStability.stability, state.modifications.colorNoise, state.modifications.distortion, size, mode, setSettings]);

  const isGorbov = mode === 'gorbov';
  const targetTime = isGorbov ? 60 : (size === 5 ? 25 : 45);

  useEffect(() => {
      if (state.isFinished && state.timeMs > 0 && token) {
         import('../lib/cognitive-metrics').then(async (m) => {
           const analysis = await m.analyzeSession(
             state.clickHistory.map((click) => ({
               cellId: click.cellId,
               reactionTimeMs: click.reactionTimeMs
             }))
           );
           await m.getDifficultySuggestion(analysis.averageTime, analysis.stabilityIndex);
         });

         const baseScore = Math.max(10, Math.floor(100000 / (state.timeMs || 10000)));
         let multiplier = 1;
         if (state.modifications.colorNoise !== 'none') multiplier += 0.2;
         if (state.modifications.distortion) multiplier += 0.3;
         if (state.modifications.inversion) multiplier += 0.5;
         if (state.size > 5) multiplier += 0.4;
         if (isHardcore) multiplier += 0.5;
         const finalScore = Math.floor(baseScore * multiplier);

         const gameType = gameTypeRef.current;
         if (!gameType) {
           logger.error('Session save failed', { error: 'No game type is available', gameType: isGorbov ? 'SCHULTE_GORBOV' : 'SCHULTE' });
           return;
         }
         void saveAttempt({
           timeMs: state.timeMs,
           metadata: { score: finalScore, mode, size, distraction, errors: state.errors, modifications: state.modifications, clickHistory: state.clickHistory },
           analyticsJob: getCompletedAnalyticsJob() ?? undefined,
         })
         .then(resData => {
            if (resData?.session?.score) {
              setBonusAwarded(resData.session.score);
              refreshUser();
            }
         })
         .catch(err => logger.error('Session save failed', { error: safeError(err), gameType }));
      }
  }, [state.isFinished, state.timeMs, token, mode, size, distraction, state.errors, isGorbov, refreshUser, state.modifications, isHardcore, saveAttempt]);

  const handleSuccess = () => {
     haptic.success();
  };
  const handleError = () => {
     haptic.error();
  };

  const handleStartWithBriefing = () => {
    setShowBriefing(true);
  };

  const confirmStart = async () => {
    const gameType = mode === 'gorbov' ? 'SCHULTE_GORBOV' : 'SCHULTE';
    try {
      await beginAttempt(gameType);
      gameTypeRef.current = gameType;
      setShowBriefing(false);
      startGame();
    } catch (error) {
      gameTypeRef.current = null;
      logger.error('Game attempt start failed', { error: safeError(error), gameType });
    }
  };

  if (!state.isActive && !state.isFinished && !showBriefing) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full min-h-0 min-w-0">
        
        {/* Left Column: Settings */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 flex flex-col gap-6"
        >
          <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 flex-1 shadow-sm">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Настройки</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Размер таблицы</label>
                  <span className="text-sm font-mono font-bold text-primary">{size}x{size}</span>
                </div>
                <input 
                  type="range" min="3" max="7" 
                  disabled={isGorbov}
                  value={isGorbov ? 7 : size} 
                  onChange={e => setSettings(Number(e.target.value), mode)} 
                  className="w-full accent-primary h-1.5 rounded-full appearance-none bg-secondary cursor-pointer" 
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Пресет сложности</label>
                <select value={currentLevel} onChange={(e: any) => applyLevel(e.target.value)} className="w-full min-h-11 p-3 text-sm rounded-xl border bg-background/50 border-border focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-bold transition-all">
                  <option value="classic">Классическая таблица</option>
                  <option value="level1">Ур. 1: Цветовой шум</option>
                  <option value="level2">Ур. 2: Пространственный хаос</option>
                  <option value="level3">Ур. 3: Расширение поля (6x6)</option>
                  <option value="level4">Ур. 4: Инверсия (Hardcore)</option>
                  <option value="adaptive">Адаптивный ИИ-режим</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Алгоритм генерации</label>
                <select value={mode} onChange={(e: any) => setSettings(e.target.value === 'gorbov' ? 7 : size, e.target.value)} className="w-full min-h-11 p-3 text-sm rounded-xl border bg-background/50 border-border outline-none text-foreground">
                  <option value="classic">Прямой (1-25)</option>
                  <option value="reverse">Обратный (25-1)</option>
                  <option value="gorbov">Горбов-Шульте (Черно-красный)</option>
                  <option value="colorNoise">Цветовой шум</option>
                  <option value="scattered">Разбросанные карты</option>
                  <option value="peripheral">Периферийное расширение</option>
                  <option value="hardcore">Хардкорная инверсия</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Когнитивные помехи</label>
                <select value={distraction} onChange={(e: any) => setDistraction(e.target.value)} className="w-full min-h-11 p-3 text-sm rounded-xl border bg-background/50 border-border outline-none text-foreground">
                  <option value="none">Без отвлечения</option>
                  <option value="audio">Аудио-фон (Слова + Числа)</option>
                  <option value="visual">Визуальный шум (Chaos)</option>
                  <option value="chaos">Комбинированный (Max Intensity)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border/50 transition-all hover:border-primary/30">
                 <div className="flex flex-col">
                   <span className="text-sm text-foreground font-bold uppercase tracking-wider">Вращение цифр</span>
                   <span className="text-sm text-muted-foreground uppercase">Динамический наклон</span>
                 </div>
                <button 
                  onClick={() => setSettings(size, mode, { digitRotation: !state.modifications.digitRotation })}
                  aria-label="Вращение цифр"
                  className={`min-h-11 min-w-11 rounded-full transition-all relative flex items-center justify-center ${state.modifications.digitRotation ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${state.modifications.digitRotation ? 'ml-auto mr-0.5' : 'ml-0.5 mr-auto'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border/50 transition-all hover:border-primary/30">
                 <div className="flex flex-col">
                   <span className="text-sm text-foreground font-bold uppercase tracking-wider">Pro-режим</span>
                   <span className="text-sm text-muted-foreground uppercase">Лимит 60с + No Tips</span>
                 </div>
                <button 
                  onClick={() => setIsHardcore(!isHardcore)}
                  aria-label="Pro-режим (лимит 60с)"
                  className={`min-h-11 min-w-11 rounded-full transition-all relative flex items-center justify-center ${isHardcore ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${isHardcore ? 'ml-auto mr-0.5' : 'ml-0.5 mr-auto'}`} />
                </button>
              </div>

              {/* AI Адаптация toggle removed as per user request */}

            </div>

            {/* Sticky on phones: the settings list is taller than the viewport,
                so a static CTA forced a scroll before the test could start. */}
            <div className="sticky bottom-mobile-chrome z-30 -mx-4 -mb-4 mt-auto rounded-b-3xl bg-gradient-to-t from-card via-card/95 to-transparent px-4 pb-4 pt-3 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6 lg:static lg:bottom-auto lg:mx-0 lg:mb-0 lg:rounded-none lg:bg-none lg:px-0 lg:pb-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartWithBriefing}
                data-testid="start-button"
                className="w-full py-4 bg-primary text-primary-foreground text-sm uppercase tracking-[0.2em] rounded-2xl font-black shadow-lg shadow-primary/20 transition-all"
              >
                Начать тест
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Center Column: Grid Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden lg:col-span-6 bg-card/20 border border-border rounded-[2.5rem] p-12 lg:flex flex-col items-center justify-center relative min-h-[400px] lg:h-full overflow-hidden"
        >
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
              <div className="w-px h-full bg-foreground"></div>
              <div className="h-px w-full bg-foreground absolute"></div>
              <div className="w-[80%] aspect-square border border-foreground rounded-full"></div>
              <div className="w-[50%] aspect-square border border-foreground rounded-full"></div>
           </div>
           
           <div className="text-center z-10 flex flex-col items-center gap-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                   <Target className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-black text-white shadow-lg">?</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black text-foreground uppercase tracking-[0.3em]">Центрация внимания</p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                  Готовность системы: 100%. <br/> Настройте параметры и активируйте протокол.
                </p>
              </div>
           </div>
        </motion.div>

        {/* Right Column: Instruction */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 flex flex-col gap-6"
        >
          <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Инструкция</h3>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                   <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">1</div>
                   <p className="text-sm text-muted-foreground leading-relaxed">Фокусируйте взгляд на центральной точке таблицы.</p>
                </div>
                <div className="flex gap-4">
                   <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">2</div>
                   <p className="text-sm text-muted-foreground leading-relaxed">Используйте периферийное зрение для поиска чисел. Не двигайте зрачками.</p>
                </div>
                <div className="flex gap-4">
                   <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">3</div>
                   <p className="text-sm text-muted-foreground leading-relaxed">Находите числа максимально быстро. Система адаптирует сложность под ваш темп.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                 <p className="text-sm text-primary font-black uppercase tracking-widest mb-2">Норматив ({size}x{size})</p>
                 <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-mono font-bold text-foreground">{targetTime}</span>
                   <span className="text-xs font-mono text-muted-foreground uppercase">секунд</span>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showBriefing) {
    return (
      <div className="col-span-12 flex items-center justify-center py-2 sm:min-h-[500px]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-2xl w-full bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-5 sm:rounded-[2.5rem] sm:p-14 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-destructive/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-start gap-3 mb-6 sm:items-center sm:gap-6 sm:mb-10">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 sm:w-16 sm:h-16 sm:rounded-3xl">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-tight text-foreground uppercase sm:text-3xl">Когнитивный Брифинг</h2>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">
                    {isGorbov ? 'Протокол Горбова' : `Протокол ${mode.toUpperCase()}`}
                  </span>
                  {isHardcore && (
                    <span className="text-xs bg-destructive/10 text-destructive px-3 py-1 rounded-full font-black uppercase tracking-widest border border-destructive/20">Hardcore Mode</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 sm:gap-8 sm:mb-12">
               <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] sm:text-xs">Целевой алгоритм</h4>
                  <p className="text-sm text-foreground leading-relaxed font-medium">
                    {isGorbov 
                      ? "ЧЕРЕДОВАНИЕ: 1 Черное → 24 Красное → 2 Черное → 23 Красное... Это тест на переключение когнитивных установок."
                      : mode === 'reverse'
                        ? `ОБРАТНЫЙ ПОРЯДОК: Найдите все числа от ${size*size} до 1.`
                        : `ПРЯМОЙ ПОРЯДОК: Найдите последовательно все числа от 1 до ${size*size}.`
                    }
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                     <AlertCircle className="w-4 h-4 text-primary" />
                     <span className="text-sm text-muted-foreground uppercase font-bold">Фокус строго в центр</span>
                  </div>
               </div>

               <div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 flex flex-col justify-center gap-3 sm:rounded-3xl sm:p-6 sm:gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase font-black">Норматив</span>
                    <span className="text-sm font-mono font-black text-primary">{targetTime}s</span>
                  </div>
                  <div className="h-px bg-border/50 w-full" />
                  <div className="flex justify-between items-center opacity-30">
                    <span className="text-sm text-muted-foreground uppercase font-black">Адаптивность</span>
                    <span className="text-sm text-muted-foreground font-black uppercase">Выключена</span>
                  </div>
                  <div className="h-px bg-border/50 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase font-black">Помехи</span>
                    <span className="text-sm font-black uppercase">{distraction === 'none' ? 'Нет' : 'Включены'}</span>
                  </div>
               </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(var(--primary-rgb), 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={confirmStart}
              className="w-full min-h-12 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all sm:rounded-[1.5rem] sm:py-5 sm:text-sm sm:tracking-[0.3em]"
            >
              Инициализировать Тест
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state.isFinished) {
    const baseScore = Math.max(10, Math.floor(100000 / (state.timeMs || 10000)));
    let multiplier = 1;
    if (state.modifications.colorNoise !== 'none') multiplier += 0.2;
    if (state.modifications.distortion) multiplier += 0.3;
    if (state.modifications.inversion) multiplier += 0.5;
    if (state.size > 5) multiplier += 0.4;
    if (isHardcore) multiplier += 0.5;
    const finalScore = Math.floor(baseScore * multiplier);

    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0 relative pb-10 lg:pb-0 min-w-0">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="lg:col-start-2 lg:col-span-10 flex flex-col gap-8"
         >
            {isMobilePlayLayout ? (
              <section
                data-testid="session-verdict"
                className="rounded-3xl border border-border bg-card/50 p-4 shadow-sm"
                aria-label="Итог тренировки"
              >
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Итог тренировки</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm uppercase text-muted-foreground">Счёт</p>
                    <p className="text-xl font-mono font-black text-primary">{finalScore}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase text-muted-foreground">Время</p>
                    <p className="text-xl font-mono font-black">{(state.timeMs / 1000).toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase text-muted-foreground">Ошибки</p>
                    <p className="text-xl font-mono font-black">{state.errors}</p>
                  </div>
                </div>
                <div data-testid="session-primary-actions" className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setActiveResultsView('stats');
                      resetGame();
                    }}
                    className="min-h-11 rounded-xl bg-primary px-3 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground"
                  >
                    Повторить
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="min-h-11 rounded-xl border border-border px-3 py-2 text-xs font-black uppercase tracking-wider"
                  >
                    В меню
                  </button>
                </div>
              </section>
            ) : (
              <PostGameInsight
                gameType={isGorbov ? 'SCHULTE_GORBOV' : 'SCHULTE'}
                score={finalScore}
                timeMs={state.timeMs}
                errors={state.errors}
                onPlayAgain={resetGame}
                onBackToMenu={() => navigate('/')}
              />
            )}

            <div data-testid="results-section" className="w-full bg-background/50 border border-border rounded-[2.5rem] p-4 sm:p-8 overflow-hidden shadow-inner grid grid-cols-1 lg:grid-cols-2 gap-8">
              {isMobilePlayLayout && (
                <div data-testid="results-view-tabs" role="tablist" aria-label="Подробности результата" className="col-span-full grid grid-cols-3 gap-2">
                  {([
                    ['stats', 'Статистика', 'Статистика'],
                    ['curve', 'Кривая', 'Кривая концентрации'],
                    ['attention', 'Внимание', 'Карта внимания'],
                  ] as const).map(([view, label, accessibleLabel]) => (
                    <button
                      key={view}
                      type="button"
                      role="tab"
                      aria-label={accessibleLabel}
                      aria-selected={activeResultsView === view}
                      aria-controls={`results-view-${view}`}
                      onClick={() => setActiveResultsView(view)}
                      className={`min-h-11 rounded-xl border px-1 py-2 text-sm font-black uppercase tracking-tight ${
                        activeResultsView === view ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {(!isMobilePlayLayout || activeResultsView === 'stats') && (
                <div id="results-view-stats" role={isMobilePlayLayout ? 'tabpanel' : undefined} data-testid="result-stats">
                  {state.clickHistory.length > 0 ? (
                    <SchulteStats
                      history={state.clickHistory}
                      size={state.size}
                      totalTimeMs={state.timeMs}
                      errors={state.errors}
                    />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Нет данных по нажатиям. Завершите несколько шагов, чтобы увидеть статистику.
                    </p>
                  )}
                </div>
              )}
              {(!isMobilePlayLayout || activeResultsView === 'curve') && (
                <div id="results-view-curve" role={isMobilePlayLayout ? 'tabpanel' : undefined} data-testid="result-curve" className="h-[300px] lg:h-full min-h-[250px]">
                   <ConcentrationCurve data={state.clickHistory} />
                </div>
              )}
              {isMobilePlayLayout && activeResultsView === 'attention' && (
                <div id="results-view-attention" role="tabpanel" data-testid="result-attention" className="flex justify-center">
                  <AttentionMap clicks={state.clickHistory} />
                </div>
              )}
            </div>
         </motion.div>
      </div>
    );
  }

  return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 h-full min-h-0 relative min-w-0">
      {/* HUD: Left Status */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-3 flex flex-col gap-4 min-w-0"
      >
         <div data-testid="hud-timer" className="bg-card/40 backdrop-blur-md border border-border rounded-2xl lg:rounded-3xl p-3 lg:p-6 shadow-sm min-w-0">
            <div className="flex items-center justify-between mb-2 lg:mb-4 flex-wrap gap-2">
              <span className="text-sm text-muted-foreground uppercase font-black tracking-widest whitespace-nowrap">Прогресс</span>
              <Activity className="w-4 h-4 text-primary opacity-50 flex-shrink-0" />
            </div>
            <div className="space-y-2 lg:space-y-4">
               <div data-testid="timer-display">
                  <div className="flex justify-between items-baseline mb-1 flex-wrap gap-2">
                    <p className="text-2xl lg:text-3xl font-mono font-black tabular-nums text-foreground whitespace-nowrap">
                      {(state.timeMs / 1000).toFixed(2)}<span className="text-sm text-muted-foreground pl-1">s</span>
                    </p>
                    <span className="text-sm font-mono text-muted-foreground uppercase whitespace-nowrap">{(state.timeMs/targetTime/10).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (state.timeMs / (targetTime * 1000)) * 100)}%` }}
                    />
                  </div>
               </div>
               <div className="flex items-center justify-between pt-0 lg:pt-2 flex-wrap gap-2" data-testid="errors-count">
                 <div className="flex flex-row items-baseline gap-2 lg:flex-col lg:gap-0">
                    <span className="text-sm text-muted-foreground uppercase font-black whitespace-nowrap">Ошибки</span>
                    <span className={`text-sm font-mono font-bold ${state.errors > 0 ? 'text-destructive' : 'text-foreground'}`}>{state.errors}</span>
                 </div>
                 <div className="flex flex-row items-baseline gap-2 lg:flex-col lg:items-end lg:gap-0">
                    <span className={`text-sm uppercase font-black ${state.modifications.chaosIntervalMs < 500 ? 'text-destructive' : 'text-muted-foreground'}`}>Интенсивность</span>
                    <span className="text-sm font-mono font-bold whitespace-nowrap">{(1000 / state.modifications.chaosIntervalMs).toFixed(1)}x</span>
                 </div>
               </div>
            </div>
         </div>

         {/* Compact row on phones so the grid stays above the fold; the tall
             centred card is kept for the desktop three-column HUD. */}
         <div data-testid="target-indicator" className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-3xl px-4 py-3 lg:p-8 flex flex-row items-center justify-between gap-3 lg:flex-col lg:justify-center lg:flex-1 shadow-sm shadow-primary/5 min-w-0">
            <p className="text-xs lg:text-sm text-primary uppercase lg:mb-4 font-black tracking-[0.2em] lg:tracking-[0.3em] whitespace-nowrap">
               {isGorbov ? 'АКТИВНАЯ ЦЕЛЬ' : 'ТЕКУЩЕЕ ЧИСЛО'}
            </p>
            <div className="relative min-w-0">
              <motion.div 
                key={state.expectedIndex}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl lg:text-8xl font-black leading-none text-foreground drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
              >
                {state.expectedIndex < state.expectedSequence.length ? (
                   (isGorbov || isHardcore) ? (
                      <span className="text-primary opacity-20">?</span>
                   ) : (
                      <span className={state.expectedSequence[state.expectedIndex].color === 'red' ? 'text-destructive' : 'text-primary'}>
                         {state.expectedSequence[state.expectedIndex].num}
                      </span>
                   )
                ) : <span className="text-primary">-</span>}
              </motion.div>
              {(isGorbov || isHardcore) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-primary/20 rounded-full animate-ping" />
                </div>
              )}
            </div>
            <p className="hidden lg:block text-sm text-muted-foreground uppercase mt-8 font-black tracking-widest text-center opacity-60 whitespace-nowrap">
              {isHardcore ? 'Pro-режим: Подсказки скрыты' : 'Визуальный трекер активен'}
            </p>
         </div>
      </motion.div>

      {/* HUD: Center Grid */}
      <motion.div 
        animate={state.errors > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`lg:col-span-6 border border-border rounded-3xl sm:rounded-[2.5rem] p-2 sm:p-8 flex flex-col items-center justify-center relative min-h-0 lg:min-h-[400px] overflow-hidden lg:h-full shadow-2xl ${state.modifications.bgTheme === 'dark-green' ? 'bg-[#064e3b]' : 'bg-card/30 backdrop-blur-sm'} min-w-0`}
        data-testid="grid-container"
      >
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.05]">
            <div className="w-px h-24 bg-primary"></div>
            <div className="h-px w-24 bg-primary absolute"></div>
            <div className="w-12 h-12 border border-primary rounded-full"></div>
         </div>

         <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="play-grid-fit grid gap-1 sm:gap-2 min-w-0 relative z-10"
           style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}
         >
            {state.grid.map((cell, idx) => {
               const isRed = cell.color === 'red';
               return (
                  <motion.button
                    key={cell.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    whileHover={{ scale: 1.05, zIndex: 30 }}
                    whileTap={{ scale: 0.9, backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      if (rect) {
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        clickCell(cell, idx, { x, y }, handleSuccess, handleError);
                      } else {
                        clickCell(cell, idx, undefined, handleSuccess, handleError);
                      }
                    }}
                    className={`aspect-square bg-card border border-border flex items-center justify-center font-black transition-all cursor-pointer select-none shadow-sm
                       ${isRed ? 'text-destructive' : 'text-foreground'} 
                       ${state.size > 5 ? 'text-lg sm:text-xl' : state.size > 3 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}
                       hover:ring-4 hover:ring-primary/20 hover:border-primary transition-all duration-75`}
                    style={ cell.chaosStyle ? { 
                       opacity: cell.chaosStyle.opacity, 
                       transform: `rotate(${cell.chaosStyle.rotate}deg) scale(${cell.chaosStyle.scale})` 
                    } : (distraction === 'visual' || distraction === 'chaos' || currentLevel !== 'classic') ? generateChaosStyle(state.modifications, state.timeMs, cell.id) : {} }
                  >
                    {cell.num}
                  </motion.button>
               )
            })}
         </motion.div>

         <div className="mt-8 hidden lg:flex gap-4 z-10 opacity-40">
            <span className="px-4 py-1.5 bg-background border border-border text-foreground text-sm font-black uppercase rounded-full tracking-widest">{distraction !== 'none' ? 'Jammer Active' : 'Clear Link'}</span>
            <span className="px-4 py-1.5 bg-background border border-border text-foreground text-sm font-black uppercase rounded-full tracking-widest">{size}x{size} Matrix</span>
         </div>
      </motion.div>

      {/* In normal flow, not fixed: as an overlay it sat on top of the last grid
          rows and the build badge. */}
      {isMobilePlayLayout && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={stopGame}
          data-testid="stop-button"
          className="w-full min-h-11 rounded-2xl border border-destructive/30 bg-card/95 px-4 py-3 text-sm font-black uppercase tracking-widest text-destructive shadow-sm backdrop-blur-md"
        >
          Завершить досрочно
        </motion.button>
      )}

      {/* Analytics stay available during desktop play. On phones they must not
          mount at all: hidden charts still reconcile and animate below fold. */}
      {!isMobilePlayLayout && (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-3 flex flex-col gap-6 min-w-0"
      >
        <div className="bg-card/50 border border-border/50 rounded-3xl p-6 backdrop-blur-xl space-y-8 h-full flex flex-col">
          <div className="flex-1 space-y-8">
             <div className="w-full space-y-6 min-w-0">
                <StabilityIndicator stability={currentStability.stability} isAdapting={state.lastSuggestion !== null} />
                <div className="h-[180px] min-w-0">
                   <ConcentrationCurve data={state.clickHistory} />
                </div>
                <AttentionMap clicks={state.clickHistory} />
             </div>
             <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase font-black tracking-[0.3em] mb-2">Оперативный Контроль</p>
                <p className="text-sm text-muted-foreground/60 leading-relaxed uppercase tracking-tighter">Система ведет запись когнитивной активности и паттернов внимания.</p>
             </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopGame} 
            data-testid="stop-button"
            className="w-full py-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm uppercase font-black tracking-widest rounded-2xl hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/5"
          >
            Завершить досрочно
          </motion.button>
        </div>
      </motion.div>
      )}
    </div>
  );
}
