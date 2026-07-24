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
import type { MathLevel } from '../lib/mentmath-generator';

const logger = createSafeLogger('mental-math');

export function MentalMathTrainer() {
  const { state, startGame, stopGame, resetGame, submitAnswer } = useMentalMathEngine();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [level, setLevel] = useState<MathLevel>(1);
  const [questionCount, setQuestionCount] = useState(20);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'llm' | 'fallback' | null>(null);
  const savedRunRef = useRef(false);

  useSessionRecording(state.isActive, state.isFinished);

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
    savedRunRef.current = false;

    try {
      if (token) {
        const generated = await requestMentalMathSet(token, { level, count: questionCount });
        setGenerationSource(generated.source);
        startGame(level, questionCount, generated.set);
      } else {
        setGenerationSource('fallback');
        startGame(level, questionCount);
      }
      setShowBriefing(false);
    } catch (err) {
      logger.warn('Remote generation unavailable, using local fallback', {
        error: safeError(err),
      });
      setGenerationSource('fallback');
      startGame(level, questionCount);
      setShowBriefing(false);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, token, level, questionCount, startGame]);

  useEffect(() => {
    const completed = state.questions.length > 0 && state.currentIndex >= state.questions.length;
    if (completed && state.timeMs > 0 && token && !savedRunRef.current) {
      savedRunRef.current = true;
      const finalScore = Math.floor(
        (state.correctAnswers / Math.max(1, state.questions.length)) *
        1000 *
        Math.max(0.1, 1 - state.timeMs / 120000)
      );

      fetch('/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameType: 'MENTAL_MATH',
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
        }),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.session?.score) {
            refreshUser();
          }
        })
        .catch((err) =>
          logger.error('Session save failed', { error: safeError(err), gameType: 'MENTAL_MATH' })
        );
    }
  }, [state.currentIndex, state.timeMs, token, refreshUser, state.correctAnswers, state.errors, state.questions.length, state.level]);

  const handleReset = useCallback(() => {
    savedRunRef.current = false;
    setGenerationSource(null);
    resetGame();
  }, [resetGame]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const num = parseInt(inputValue.trim(), 10);
      if (!isNaN(num)) {
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
                  <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">
                    {level === 1 ? 'Уровень 1: Базовый' : 'Уровень 2: Символы'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
              <div className="space-y-4">
                <h4 className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">
                  Алгоритм
                </h4>
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  {level === 1
                    ? 'Вычислите результат арифметического выражения как можно быстрее. Сложение и вычитание, ответ всегда положительный.'
                    : 'Считайте по Legend-таблице: операторы заменены символами. Расшифруйте и вычислите.'}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    Нажмите Enter для отправки
                  </span>
                </div>
              </div>

              <div className="bg-secondary/40 border border-border/50 rounded-3xl p-6 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    Вопросов
                  </span>
                  <span className="text-sm font-mono font-black text-primary">{questionCount}</span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    Уровень
                  </span>
                  <span className="text-sm font-mono font-black text-primary">{level}</span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    Лимит
                  </span>
                  <span className="text-[10px] font-black uppercase text-muted-foreground">120с</span>
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
                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 block">
                  Уровень сложности
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as MathLevel)}
                  className="w-full p-3 text-xs rounded-xl border bg-background/50 border-border focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-bold transition-all"
                >
                  <option value={1}>Ур. 1: Базовый (+, -)</option>
                  <option value={2}>Ур. 2: Символы (+, -, *, /)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Количество вопросов
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{questionCount}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={30}
                  step={5}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full appearance-none bg-secondary cursor-pointer"
                />
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
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    1
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Прочитайте выражение и вычислите результат в уме.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    2
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Введите ответ в поле и нажмите Enter или кнопку отправки.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    3
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Считайте максимально быстро и точно. Все ответы положительные числа 1-200.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">
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

  // Result screen
  if (state.isFinished) {
    const finalScore = Math.floor(
      (state.correctAnswers / Math.max(1, state.questions.length)) *
        1000 *
        Math.max(0.1, 1 - state.timeMs / 120000)
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
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
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
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {state.currentIndex}/{state.questions.length}
                </span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-muted-foreground uppercase font-black">
                  Верных
                </span>
                <span className="text-sm font-mono font-bold text-emerald-500">
                  {state.correctAnswers}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-muted-foreground uppercase font-black">
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

        {/* Legend (level 2) */}
        {state.level === 2 && Object.keys(state.legend).length > 0 && (
          <div className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-3xl p-4 shadow-sm shadow-primary/5">
            <p className="text-[10px] text-primary uppercase mb-3 font-black tracking-[0.3em]">
              Legend
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(state.legend).map(([symbol, op]) => (
                <div
                  key={symbol}
                  className="flex items-center gap-2 bg-background/50 rounded-xl px-3 py-2"
                >
                  <span className="text-lg font-black text-primary">{symbol}</span>
                  <span className="text-[10px] text-muted-foreground font-bold">=</span>
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
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em]">
            Вопрос {state.currentIndex + 1} из {state.questions.length}
          </p>

          {/* Equation */}
          {currentQuestion && (
            <motion.div
              key={state.currentIndex}
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
              ref={inputRef}
              type="number"
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
              className="px-10 py-3 bg-primary text-primary-foreground text-xs uppercase font-black tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all"
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
                <span className="text-[10px] text-muted-foreground uppercase font-black">Уровень</span>
                <span className="text-sm font-mono font-bold text-primary">{state.level}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-secondary/30 border border-border/50">
                <span className="text-[10px] text-muted-foreground uppercase font-black">Точность</span>
                <span
                  className={`text-sm font-mono font-bold ${accuracy >= 80 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-destructive'}`}
                >
                  {accuracy}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-secondary/30 border border-border/50">
                <span className="text-[10px] text-muted-foreground uppercase font-black">Генератор</span>
                <span className="text-[10px] font-black uppercase text-primary">
                  {generationSource === 'llm' ? 'LLM' : 'Локальный'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mb-2">
                Оперативный Контроль
              </p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed uppercase tracking-tighter">
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
