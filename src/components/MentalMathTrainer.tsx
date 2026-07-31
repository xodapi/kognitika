import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Calculator, Info, Activity, AlertCircle, Hash } from 'lucide-react';
import { useMentalMathEngine } from '../hooks/useMentalMathEngine';
import { useAuth } from '../hooks/useAuth';
import { useSessionRecording } from '../hooks/useSessionRecording';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { requestMentalMathSet } from '../lib/neurotrainer-client';
import { haptic } from '../lib/haptic';
import {
  computeMentalMathScore,
  MENTAL_MATH_PRESETS,
  type MathLevel,
} from '../lib/mentmath-generator';
import { useGameAttempt } from '../lib/game-attempt-client';

const logger = createSafeLogger('mental-math');

export function MentalMathTrainer() {
  const { state, startGame, stopGame, resetGame, submitAnswer } = useMentalMathEngine();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [level, setLevel] = useState<MathLevel>(1);
  const [questionCount, setQuestionCount] = useState(48);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'llm' | 'fallback' | null>(null);
  const { beginAttempt, saveAttempt } = useGameAttempt(token);
  const generationControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const selectedPreset = MENTAL_MATH_PRESETS.find((preset) => preset.level === level)!;

  useSessionRecording(state.isActive, state.isFinished);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      generationControllerRef.current?.abort();
    };
  }, []);

  // Auto-focus input during game
  useEffect(() => {
    if (state.isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isActive, state.currentIndex]);

  const handleStartWithBriefing = useCallback(() => {
    setShowBriefing(true);
  }, []);

  const confirmStart = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    generationControllerRef.current?.abort();
    const controller = new AbortController();
    generationControllerRef.current = controller;

    try {
      let generatedSet;
      let source: 'llm' | 'fallback' = 'fallback';
      if (token) {
        try {
          const generated = await requestMentalMathSet(
            token,
            { level, count: questionCount },
            controller.signal,
          );
          generatedSet = generated.set;
          source = generated.source;
        } catch (err) {
          if (!isMountedRef.current || controller.signal.aborted) return;
          logger.warn('Remote generation unavailable, using local fallback', {
            error: safeError(err),
          });
        }
      }
      if (!isMountedRef.current || controller.signal.aborted) return;
      await beginAttempt('MENTAL_MATH');
      if (!isMountedRef.current || controller.signal.aborted) return;
      setGenerationSource(source);
      startGame(level, questionCount, generatedSet);
      setShowBriefing(false);
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted) return;
      logger.error('Session start failed', { error: safeError(err), gameType: 'MENTAL_MATH' });
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  }, [isGenerating, token, level, questionCount, beginAttempt, startGame]);

  useEffect(() => {
    const completed = state.outcome === 'completed';
    if (completed && state.timeMs > 0 && token) {
      const finalScore = computeMentalMathScore(
        state.timeMs,
        (state.correctAnswers / Math.max(1, state.questions.length)) * 100,
        state.errors,
      );

      saveAttempt({
        timeMs: state.timeMs,
        metadata: {
          score: finalScore,
          level: state.level,
          questionCount: state.questions.length,
          correctAnswers: state.correctAnswers,
          totalQuestions: state.questions.length,
          accuracy: (state.correctAnswers / Math.max(1, state.questions.length)) * 100,
          errors: state.errors,
        },
      })
        .then((resData) => {
          if (resData.session?.score) {
            refreshUser();
          }
        })
        .catch((err) => {
          logger.error('Session save failed', { error: safeError(err), gameType: 'MENTAL_MATH' });
        });
    }
  }, [state.outcome, state.timeMs, token, refreshUser, state.correctAnswers, state.errors, state.questions.length, state.level, saveAttempt]);

  const handleReset = useCallback(() => {
    setGenerationSource(null);
    resetGame();
  }, [resetGame]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const num = Number(inputValue.trim());
      if (Number.isInteger(num)) {
        haptic.medium();
        submitAnswer(num);
        setInputValue('');
      }
    },
    [inputValue, submitAnswer]
  );

  const accuracy = state.questions.length > 0
    ? Math.round((state.correctAnswers / Math.max(1, state.currentIndex)) * 100)
    : 0;

  // Briefing screen
  if (showBriefing) {
    return (
      <div className="col-span-12 flex items-center justify-center h-full min-h-[500px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-2xl w-full bg-card/80 backdrop-blur-2xl border border-border rounded-[2.5rem] p-10 sm:p-14 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30">
                <Calculator className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">
                  Быстрые вычисления
                </h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">
                    Режим {level}: {selectedPreset.title}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
              <div className="space-y-4">
                <h4 className="text-xs text-muted-foreground uppercase font-black tracking-[0.2em]">
                  Алгоритм
                </h4>
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  {selectedPreset.description} Вычисляйте строго слева направо. Промежуточный
                  результат может быть отрицательным, деление всегда даёт целое число.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Здесь важен темп: лучше дать ответ и двигаться дальше, чем надолго остановиться на одном примере.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase font-bold">
                    Нажмите Enter для отправки
                  </span>
                </div>
              </div>

              <div className="bg-secondary/40 border border-border/50 rounded-3xl p-6 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase font-black">
                    Вопросов
                  </span>
                  <span className="text-sm font-mono font-black text-primary">{questionCount}</span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase font-black">
                    Уровень
                  </span>
                  <span className="text-sm font-mono font-black text-primary">{level}</span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase font-black">
                    Лимит
                  </span>
                  <span className="text-xs font-black uppercase text-muted-foreground">ориентир 5 мин</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(var(--primary-rgb), 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={confirmStart}
              disabled={isGenerating}
              className="w-full py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all disabled:opacity-60"
            >
              {isGenerating ? 'Генерация заданий...' : 'Инициализировать тест'}
            </motion.button>
            {isGenerating && (
              <p role="status" aria-live="polite" className="sr-only">
                Генерация набора заданий
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Settings screen
  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 pb-6">
        {/* Left: Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 flex flex-col gap-6"
        >
          <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 flex flex-col gap-6 flex-1 shadow-sm">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                Настройки
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="mental-math-level" className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">
                  Уровень сложности
                </label>
                <select
                  id="mental-math-level"
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as MathLevel)}
                  className="w-full min-h-11 p-3 text-xs rounded-xl border bg-background/50 border-border focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-bold transition-all"
                >
                  {MENTAL_MATH_PRESETS.map((preset) => (
                    <option key={preset.level} value={preset.level}>
                      Режим {preset.level}: {preset.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="mental-math-question-count" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Количество вопросов
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{questionCount}</span>
                </div>
                <input
                  id="mental-math-question-count"
                  type="range"
                  min={20}
                  max={48}
                  step={4}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full appearance-none bg-secondary cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setQuestionCount(48)}
                  className="mt-3 min-h-11 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 text-xs font-black uppercase tracking-widest text-primary"
                >
                  5-минутный пресет: 48 вопросов
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartWithBriefing}
              className="mt-auto w-full py-4 bg-primary text-primary-foreground text-xs uppercase tracking-[0.2em] rounded-2xl font-black shadow-lg shadow-primary/20 transition-all"
            >
              Начать тест
            </motion.button>
          </div>
        </motion.div>

        {/* Center: Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-6 bg-card/20 border border-border rounded-[2.5rem] p-12 flex flex-col items-center justify-center relative min-h-[400px] lg:h-full overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
            <div className="w-px h-full bg-foreground" />
            <div className="h-px w-full bg-foreground absolute" />
          </div>

          <div className="text-center z-10 flex flex-col items-center gap-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-foreground uppercase tracking-[0.3em]">
                Быстрые вычисления
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                Ментальная арифметика под таймером. Считайте в уме, вводите ответ и нажимайте Enter.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right: Instruction */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 flex flex-col gap-6"
        >
          <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                Инструкция
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    1
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Прочитайте выражение и вычислите результат в уме.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    2
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Введите ответ в поле и нажмите Enter или кнопку отправки.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    3
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Считайте максимально быстро и точно. Ответ может быть отрицательным;
                    деление всегда выполняется без остатка.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary font-black uppercase tracking-widest mb-2">
                  Норматив
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold text-foreground">
                    {Math.round(questionCount * 4)}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground uppercase">секунд</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state.outcome === 'aborted') {
    return (
      <div className="col-span-12 flex min-h-[500px] items-center justify-center">
        <div className="w-full max-w-xl space-y-6 rounded-[2.5rem] border border-border bg-card/60 p-8 text-center shadow-2xl sm:p-12">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Попытка остановлена</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Пройдено {state.currentIndex} из {state.questions.length}. Неполная попытка не сохраняется в прогресс.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button onClick={handleReset} className="min-h-11 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground">
              Начать заново
            </button>
            <button onClick={() => navigate('/')} className="min-h-11 rounded-2xl border border-border px-5 py-3 text-xs font-black uppercase tracking-widest">
              В меню
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (state.isFinished) {
    const finalScore = computeMentalMathScore(
      state.timeMs,
      (state.correctAnswers / Math.max(1, state.questions.length)) * 100,
      state.errors,
    );

    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0 relative pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-start-2 lg:col-span-10 flex flex-col gap-8"
        >
          <PostGameInsight
            gameType="MENTAL_MATH"
            score={finalScore}
            timeMs={state.timeMs}
            errors={state.errors}
            correctAnswers={state.correctAnswers}
            totalQuestions={state.questions.length}
            level={state.level}
            onPlayAgain={handleReset}
            onBackToMenu={() => navigate('/')}
          />
        </motion.div>
      </div>
    );
  }

  // Active game screen
  const currentQuestion = state.questions[state.currentIndex];
  const progress = state.currentIndex / Math.max(1, state.questions.length);

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 relative pb-6 lg:pb-0">
      {/* Left: HUD */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-3 flex flex-col gap-4"
      >
        <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">
              Прогресс
            </span>
            <Activity className="w-4 h-4 text-primary opacity-50" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <p className="text-3xl font-mono font-black tabular-nums text-foreground">
                  {(state.timeMs / 1000).toFixed(2)}
                  <span className="text-xs text-muted-foreground pl-1">s</span>
                </p>
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  {state.currentIndex}/{state.questions.length}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Прогресс вычислений"
                aria-valuemin={0}
                aria-valuemax={state.questions.length}
                aria-valuenow={state.currentIndex}
                className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase font-black">
                  Верных
                </span>
                <span className="text-sm font-mono font-bold text-emerald-500">
                  {state.correctAnswers}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase font-black">
                  Ошибок
                </span>
                <span
                  className={`text-sm font-mono font-bold ${state.errors > 0 ? 'text-destructive' : 'text-foreground'}`}
                >
                  {state.errors}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Symbol legend */}
        {state.level >= 3 && Object.keys(state.legend).length > 0 && (
          <div className="sticky top-3 z-20 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-3xl p-4 shadow-sm shadow-primary/5">
            <p className="text-xs text-primary uppercase mb-3 font-black tracking-[0.3em]">
              Legend
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(state.legend).map(([symbol, op]) => (
                <div
                  key={symbol}
                  className="flex items-center gap-2 bg-background/50 rounded-xl px-3 py-2"
                >
                  <span className="text-lg font-black text-primary">{symbol}</span>
                  <span className="text-xs text-muted-foreground font-bold">=</span>
                  <span className="text-lg font-black text-foreground">{op}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Center: Question + Input */}
      <motion.div
        animate={state.errors > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="lg:col-span-6 border border-border rounded-[2.5rem] p-8 flex flex-col items-center justify-center relative min-h-[400px] overflow-hidden lg:h-full shadow-2xl bg-card/30 backdrop-blur-sm"
      >
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.05]">
          <div className="w-16 h-16 border border-primary rounded-full" />
        </div>

        <div className="text-center z-10 flex flex-col items-center gap-10 w-full max-w-md">
          {/* Question number */}
          <p className="text-xs text-muted-foreground uppercase font-black tracking-[0.3em]">
            Вопрос {state.currentIndex + 1} из {state.questions.length}
          </p>

          {/* Equation */}
          {currentQuestion && (
            <motion.div
              key={state.currentIndex}
              aria-live="polite"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl sm:text-6xl font-black text-foreground"
            >
              {currentQuestion.display}
            </motion.div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
            <input
              aria-label="Ответ на текущий пример"
              ref={inputRef}
              type="number"
              step={1}
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full text-center text-3xl sm:text-5xl font-mono font-black bg-transparent border-b-4 border-border focus:border-primary outline-none text-foreground py-4 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="?"
              autoComplete="off"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="min-h-11 px-10 py-3 bg-primary text-primary-foreground text-xs uppercase font-black tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all"
            >
              Отправить
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* Right: Controls */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-3 flex flex-col gap-6"
      >
        <div className="bg-card/50 border border-border/50 rounded-3xl p-6 backdrop-blur-xl space-y-8 h-full flex flex-col">
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-2xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground uppercase font-black">Уровень</span>
                <span className="text-sm font-mono font-bold text-primary">{state.level}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground uppercase font-black">Точность</span>
                <span
                  className={`text-sm font-mono font-bold ${accuracy >= 80 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-destructive'}`}
                >
                  {accuracy}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-secondary/30 border border-border/50">
                <span className="text-xs text-muted-foreground uppercase font-black">Генератор</span>
                <span className="text-xs font-black uppercase text-primary">
                  {generationSource === 'llm' ? 'LLM' : 'Локальный'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-[0.3em] mb-2">
                Оперативный Контроль
              </p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed uppercase tracking-tighter">
                Система ведет запись времени ответа и точности вычислений.
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopGame}
            className="w-full py-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs uppercase font-black tracking-widest rounded-2xl hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/5"
          >
            Завершить досрочно
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
