import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Grid3x3, Info, Activity, AlertCircle } from 'lucide-react';
import { useSchulte90Engine } from '../hooks/useSchulte90Engine';
import { useAuth } from '../hooks/useAuth';
import { useSessionRecording } from '../hooks/useSessionRecording';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import {
  computeSchulte90Score,
  SCHULTE_90_ROWS,
  SCHULTE_90_COLS,
  SCHULTE_90_TOTAL,
  GORBOV_RULES,
  getGorbovColor,
  type GorbovRuleId,
} from '../lib/schulte90-generator';

const logger = createSafeLogger('schulte-90');

const NORMATIVE_RANGE = '90–150 с';

const CELL_VARIANTS = [
  'rounded-none bg-card font-mono text-xs',
  'rounded-lg bg-secondary/45 font-sans text-sm',
  'rounded-full bg-primary/5 font-serif text-base',
  'rounded-md bg-muted/55 font-mono text-sm',
] as const;

function getCellVariant(number: number) {
  return CELL_VARIANTS[number % CELL_VARIANTS.length];
}

function isGorbovRuleId(value: string): value is GorbovRuleId {
  return GORBOV_RULES.some((rule) => rule.id === value);
}

export function SchulteTable90() {
  const { state, startGame, stopGame, resetGame, clickCell } = useSchulte90Engine();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showBriefing, setShowBriefing] = useState(false);
  const [selectedRule, setSelectedRule] = useState<GorbovRuleId>('black-red');
  const savedRunRef = useRef(false);
  const selectedRuleConfig = GORBOV_RULES.find((rule) => rule.id === selectedRule) ?? GORBOV_RULES[0];

  useSessionRecording(state.isActive, state.isFinished);

  useEffect(() => {
    if (state.outcome === 'completed' && state.timeMs > 0 && token && !savedRunRef.current) {
      savedRunRef.current = true;
      const accuracy = (SCHULTE_90_TOTAL / (SCHULTE_90_TOTAL + state.errors)) * 100;

      fetch('/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameType: 'SCHULTE_90',
          timeMs: state.timeMs,
          metadata: {
            rows: SCHULTE_90_ROWS,
            cols: SCHULTE_90_COLS,
            size: SCHULTE_90_COLS,
            rule: state.rule,
            accuracy,
            correctAnswers: SCHULTE_90_TOTAL,
            totalQuestions: SCHULTE_90_TOTAL,
            errors: state.errors,
            clickHistory: state.clickHistory,
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
          logger.error('Session save failed', { error: safeError(err), gameType: 'SCHULTE_90' })
        );
    }
  }, [state.outcome, state.timeMs, token, refreshUser, state.errors, state.clickHistory]);

  const beginGame = useCallback(() => {
    savedRunRef.current = false;
    setShowBriefing(false);
    startGame(selectedRule);
  }, [selectedRule, startGame]);

  const handleReset = useCallback(() => {
    savedRunRef.current = false;
    resetGame();
  }, [resetGame]);

  const handleSuccess = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(15);
  }, []);
  const handleError = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
  }, []);

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
                <Grid3x3 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">
                  Таблица 1-90
                </h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">
                    Протокол Шульте 9x10
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
                  Найдите последовательно числа от 1 до {SCHULTE_90_TOTAL}, соблюдая цветовое правило «{selectedRuleConfig.title}».
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    Фокус строго в центр
                  </span>
                </div>
              </div>

              <div className="bg-secondary/40 border border-border/50 rounded-3xl p-6 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    Норматив
                  </span>
                  <span className="text-sm font-mono font-black text-primary">{NORMATIVE_RANGE}</span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    Сетка
                  </span>
                  <span className="text-sm font-mono font-black text-primary">
                    {SCHULTE_90_ROWS}x{SCHULTE_90_COLS}
                  </span>
                </div>
                <div className="h-px bg-border/50 w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">
                    Отсчёт
                  </span>
                  <span className="text-[10px] font-black uppercase text-muted-foreground">без лимита</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(var(--primary-rgb), 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={beginGame}
              className="w-full py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all"
            >
              Инициализировать тест
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
                  Режим
                </label>
                <select
                  value={selectedRule}
                  onChange={(event) => {
                    if (isGorbovRuleId(event.target.value)) setSelectedRule(event.target.value);
                  }}
                  className="w-full min-h-11 p-3 text-xs rounded-xl border bg-background/50 border-border outline-none text-foreground font-bold transition-all"
                >
                  {GORBOV_RULES.map((rule) => (
                    <option key={rule.id} value={rule.id}>{rule.title}</option>
                  ))}
                </select>
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {GORBOV_RULES.find((rule) => rule.id === selectedRule)?.description}
                </p>
                <div
                  role="img"
                  aria-label={`Предпросмотр: ${selectedRuleConfig.description}`}
                  className="flex items-center gap-1.5"
                >
                  {Array.from({ length: 8 }, (_, index) => {
                    const color = getGorbovColor(selectedRule, index);
                    return (
                      <span
                        key={index}
                        className={`h-3 w-3 rounded-full ${color === 'red' ? 'bg-red-500' : 'bg-neutral-900'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBriefing(true)}
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
                <Grid3x3 className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-foreground uppercase tracking-[0.3em]">
                {selectedRuleConfig.title}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                Сетка {SCHULTE_90_ROWS}x{SCHULTE_90_COLS}, 90 чисел, чередование цветов по выбранному правилу.
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
                    Фокусируйте взгляд на центральной точке таблицы.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    2
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Используйте периферийное зрение для поиска чисел. Не двигайте зрачками.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    3
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Находите числа от 1 до {SCHULTE_90_TOTAL} максимально быстро по порядку.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">
                  Норматив
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold text-foreground">{NORMATIVE_RANGE}</span>
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
    if (state.outcome !== 'completed') {
      return (
        <div className="col-span-12 flex items-center justify-center h-full min-h-[500px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full bg-card/70 border border-border rounded-[2.5rem] p-10 text-center shadow-2xl"
          >
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-5" />
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">
              Тренировка остановлена
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Найдено {state.expectedIndex} из {SCHULTE_90_TOTAL}. Незавершённая попытка не сохраняется как результат.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleReset}
                className="min-h-11 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest"
              >
                Попробовать снова
              </button>
              <button
                onClick={() => navigate('/')}
                className="min-h-11 py-3 rounded-xl border border-border text-xs font-black uppercase tracking-widest"
              >
                В меню
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    const finalScore = computeSchulte90Score(state.timeMs, state.errors);

    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0 relative pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-start-2 lg:col-span-10 flex flex-col gap-8"
        >
          <PostGameInsight
            gameType="SCHULTE_90"
            score={finalScore}
            timeMs={state.timeMs}
            errors={state.errors}
            correctAnswers={SCHULTE_90_TOTAL}
            totalQuestions={SCHULTE_90_TOTAL}
            onPlayAgain={handleReset}
            onBackToMenu={() => navigate('/')}
          />
        </motion.div>
      </div>
    );
  }

  // Active game screen
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
                  {state.expectedIndex}/{SCHULTE_90_TOTAL}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Прогресс поиска чисел"
                aria-valuemin={0}
                aria-valuemax={SCHULTE_90_TOTAL}
                aria-valuenow={state.expectedIndex}
                className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(state.expectedIndex / SCHULTE_90_TOTAL) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-muted-foreground uppercase font-black">
                  Ошибки
                </span>
                <span
                  className={`text-sm font-mono font-bold ${state.errors > 0 ? 'text-destructive' : 'text-foreground'}`}
                >
                  {state.errors}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-muted-foreground uppercase font-black">
                  Ориентир
                </span>
                <span className="text-sm font-mono font-bold text-primary">{NORMATIVE_RANGE}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current target */}
        <div className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-3xl p-8 flex flex-col items-center justify-center flex-1 shadow-sm shadow-primary/5">
          <p className="text-[10px] text-primary uppercase mb-4 font-black tracking-[0.3em]">
            Текущее число
          </p>
          <div className="relative">
            <motion.div
              key={state.expectedIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl sm:text-8xl font-black text-foreground drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
            >
              {state.expectedIndex < state.expectedSequence.length ? (
                <span className="text-primary">
                  {state.expectedSequence[state.expectedIndex].num}
                </span>
              ) : (
                <span className="text-primary">-</span>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Center: Grid */}
      <motion.div
        animate={state.errors > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="lg:col-span-6 border border-border rounded-[2.5rem] p-4 sm:p-6 flex flex-col items-start sm:items-center justify-center relative min-h-[400px] overflow-x-auto overflow-y-hidden lg:h-full shadow-2xl bg-card/30 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-1.5 w-full min-w-[494px] max-w-[700px] relative z-10"
          style={{ gridTemplateColumns: `repeat(${SCHULTE_90_COLS}, 1fr)` }}
        >
          {state.grid.map((cell, idx) => {
            const isConsumed = cell.num <= state.expectedIndex;
            return (
              <motion.button
              key={cell.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.003 }}
              whileHover={isConsumed ? undefined : { scale: 1.1, zIndex: 30 }}
              whileTap={{ scale: 0.9, backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              disabled={isConsumed}
              aria-label={isConsumed ? `Число ${cell.num}, найдено` : `Число ${cell.num}`}
              aria-description={`${cell.color === 'red' ? 'Красная' : 'Чёрная'} клетка`}
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
              className={`aspect-square min-h-11 min-w-11 border flex items-center justify-center font-bold transition-all select-none shadow-sm ${cell.color === 'red' ? 'text-red-600' : 'text-foreground'} ${getCellVariant(cell.num)} ${
                isConsumed
                  ? 'border-border/30 opacity-20 grayscale cursor-default'
                  : 'border-border cursor-pointer hover:ring-2 hover:ring-primary/20 hover:border-primary'
              }`}
            >
              {cell.num}
            </motion.button>
            );
          })}
        </motion.div>

        <div className="mt-4 flex gap-4 z-10 opacity-40">
          <span className="px-4 py-1.5 bg-background border border-border text-foreground text-[10px] font-black uppercase rounded-full tracking-widest">
            {SCHULTE_90_ROWS}x{SCHULTE_90_COLS} Matrix
          </span>
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
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mb-2">
                Оперативный Контроль
              </p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed uppercase tracking-tighter">
                Система ведет запись когнитивной активности и паттернов внимания на расширенном поле.
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
