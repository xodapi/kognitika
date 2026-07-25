import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Languages,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlphabetTableEngine } from '../hooks/useAlphabetTableEngine';
import { useAuth } from '../hooks/useAuth';
import { useSessionRecording } from '../hooks/useSessionRecording';
import {
  ALPHABET_TABLE_PRESETS,
  ALPHABET_ACTION_CUES,
  DEFAULT_ALPHABET_QUESTION_COUNT,
  MAX_ALPHABET_QUESTION_COUNT,
  MIN_ALPHABET_QUESTION_COUNT,
  type AlphabetAction,
  type AlphabetActionCue,
  type AlphabetTablePreset,
} from '../lib/alphabet-table-generator';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { CompletionRecommendation } from './CompletionRecommendation';

const logger = createSafeLogger('alphabet-table');

const ACTION_BUTTONS: ReadonlyArray<{
  action: AlphabetAction;
  cue: AlphabetActionCue;
  label: string;
  shortcut: string;
}> = [
  { action: 'RIGHT', cue: ALPHABET_ACTION_CUES.RIGHT, label: 'Правая рука', shortcut: '→ / D' },
  { action: 'LEFT', cue: ALPHABET_ACTION_CUES.LEFT, label: 'Левая рука', shortcut: '← / A' },
  { action: 'BOTH', cue: ALPHABET_ACTION_CUES.BOTH, label: 'Обе руки', shortcut: 'Пробел' },
];

export function AlphabetTableTrainer() {
  const { state, startGame, stopGame, resetGame, submitAction } = useAlphabetTableEngine();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<AlphabetTablePreset>('balanced');
  const [questionCount, setQuestionCount] = useState(DEFAULT_ALPHABET_QUESTION_COUNT);
  const savedRunRef = useRef(false);

  useSessionRecording(state.isActive, state.isFinished);

  const handleStart = useCallback(() => {
    savedRunRef.current = false;
    startGame(preset, questionCount);
  }, [preset, questionCount, startGame]);

  const handleReset = useCallback(() => {
    savedRunRef.current = false;
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    if (!state.isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        target instanceof HTMLButtonElement
        && (event.key === 'Enter' || event.key === ' ')
      ) {
        return;
      }

      let action: AlphabetAction | null = null;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') action = 'RIGHT';
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') action = 'LEFT';
      if (event.key === ' ' || event.key.toLowerCase() === 'o') action = 'BOTH';

      if (action) {
        event.preventDefault();
        submitAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, submitAction]);

  useEffect(() => {
    if (
      state.outcome !== 'completed'
      || state.timeMs < 100
      || !token
      || savedRunRef.current
    ) {
      return;
    }

    savedRunRef.current = true;
    const totalQuestions = state.items.length;
    const accuracy = (state.correctAnswers / Math.max(1, totalQuestions)) * 100;

    fetch('/api/game/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        gameType: 'ALPHABET_TABLE',
        timeMs: state.timeMs,
        metadata: {
          mode: state.preset,
          questionCount: totalQuestions,
          correctAnswers: state.correctAnswers,
          totalQuestions,
          accuracy,
          errors: state.errors,
          averageReactionTimeMs: state.averageReactionTimeMs,
        },
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Session save failed with status ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data.session?.score) refreshUser();
      })
      .catch((error) => {
        logger.error('Session save failed', {
          error: safeError(error),
          gameType: 'ALPHABET_TABLE',
        });
      });
  }, [
    state.outcome,
    state.timeMs,
    state.items.length,
    state.correctAnswers,
    state.errors,
    state.preset,
    state.averageReactionTimeMs,
    token,
    refreshUser,
  ]);

  const accuracy = useMemo(() => {
    const answered = state.correctAnswers + state.errors;
    return answered > 0 ? Math.round((state.correctAnswers / answered) * 100) : 100;
  }, [state.correctAnswers, state.errors]);

  if (state.outcome === 'completed') {
    return (
      <section className="col-span-12 flex min-h-[520px] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl rounded-[2.5rem] border border-border bg-card/60 p-8 text-center shadow-2xl sm:p-12"
        >
          <Languages className="mx-auto h-14 w-14 text-primary" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-black uppercase tracking-tight">
            Таблица завершена
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Вы отработали переключение между правой, левой и совместной реакцией.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultMetric label="Точность" value={`${accuracy}%`} />
            <ResultMetric label="Ошибки" value={String(state.errors)} />
            <ResultMetric label="Время" value={`${(state.timeMs / 1000).toFixed(1)} с`} />
            <ResultMetric label="Средняя реакция" value={`${state.averageReactionTimeMs} мс`} />
          </dl>
          <CompletionRecommendation
            sourceModuleId="alphabet-table"
            score={Math.round(accuracy * 10)}
            maxScore={1000}
            accuracy={accuracy}
            errors={state.errors}
            durationMs={state.timeMs}
            onRepeat={handleReset}
            onMenu={() => navigate('/')}
            className="mt-8"
          />
        </motion.div>
      </section>
    );
  }

  if (state.outcome === 'aborted') {
    return (
      <section className="col-span-12 flex min-h-[500px] items-center justify-center">
        <div className="w-full max-w-xl rounded-[2.5rem] border border-border bg-card/60 p-8 text-center shadow-2xl sm:p-12">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-black uppercase tracking-tight">Попытка остановлена</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Пройдено {state.currentIndex} из {state.items.length}. Неполная попытка не сохраняется.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Начать заново
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-12 rounded-2xl border border-border px-5 py-3 text-xs font-black uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              В меню
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isActive) {
    return (
      <section className="col-span-12 grid min-h-[540px] gap-6 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl border border-border bg-card/50 p-6 shadow-sm lg:col-span-4"
        >
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-black uppercase tracking-tight">Таблица Алфавит</h1>
          </div>
          <div className="mt-7 space-y-6">
            <div>
              <label
                htmlFor="alphabet-table-preset"
                className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                Режим
              </label>
              <select
                id="alphabet-table-preset"
                value={preset}
                onChange={(event) => setPreset(event.target.value as AlphabetTablePreset)}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {ALPHABET_TABLE_PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {ALPHABET_TABLE_PRESETS.find((item) => item.id === preset)?.description}
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="alphabet-table-question-count"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  Количество букв
                </label>
                <output
                  htmlFor="alphabet-table-question-count"
                  className="font-mono text-sm font-black text-primary"
                >
                  {questionCount}
                </output>
              </div>
              <input
                id="alphabet-table-question-count"
                type="range"
                min={MIN_ALPHABET_QUESTION_COUNT}
                max={MAX_ALPHABET_QUESTION_COUNT}
                step={3}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="mt-8 min-h-12 w-full rounded-2xl bg-primary px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Начать тренировку
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col justify-center rounded-[2.5rem] border border-border bg-card/30 p-8 lg:col-span-8 sm:p-12"
        >
          <div className="flex items-center gap-3 text-primary">
            <Info className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Как выполнять</h2>
          </div>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-foreground">
            На экране появляется буква русского алфавита и команда. Нажмите соответствующую
            кнопку как можно быстрее и точнее. Каждая буква встречается не более одного раза.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <Instruction cue="П" title="Правая" text="Правая рука или клавиша → / D" />
            <Instruction cue="Л" title="Левая" text="Левая рука или клавиша ← / A" />
            <Instruction cue="О" title="Обе" text="Обе руки или клавиша Пробел / O" />
          </dl>
          <p className="mt-7 text-xs leading-relaxed text-muted-foreground">
            Тренажёр не использует камеру или микрофон. Для авторизованного профиля сохраняются
            только итоговые агрегаты: режим, количество, время, точность и ошибки.
          </p>
        </motion.div>
      </section>
    );
  }

  const currentItem = state.items[state.currentIndex];
  const progress = state.currentIndex / Math.max(1, state.items.length);

  return (
    <section className="col-span-12 grid min-h-[540px] gap-6 lg:grid-cols-12">
      <aside className="rounded-3xl border border-border bg-card/50 p-6 lg:col-span-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Прогресс
        </p>
        <p className="mt-3 font-mono text-3xl font-black tabular-nums">
          {(state.timeMs / 1000).toFixed(1)}
          <span className="ml-1 text-xs text-muted-foreground">с</span>
        </p>
        <div
          role="progressbar"
          aria-label="Прогресс таблицы алфавита"
          aria-valuemin={0}
          aria-valuemax={state.items.length}
          aria-valuenow={state.currentIndex}
          className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
        >
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <ResultMetric label="Верно" value={String(state.correctAnswers)} />
          <ResultMetric label="Ошибки" value={String(state.errors)} />
        </div>
        <button
          type="button"
          onClick={stopGame}
          className="mt-8 min-h-12 w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          Завершить досрочно
        </button>
      </aside>

      <motion.div
        key={state.currentIndex}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-[2.5rem] border border-border bg-card/30 p-8 text-center shadow-xl lg:col-span-9 sm:p-12"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
          Буква {state.currentIndex + 1} из {state.items.length}
        </p>
        {currentItem && (
          <div aria-live="polite" aria-atomic="true" className="mt-6">
            <p className="text-7xl font-black leading-none text-foreground sm:text-9xl">
              {currentItem.letter}
            </p>
            <p className="mt-5 text-4xl font-black text-primary" aria-label={`Команда ${currentItem.cue}`}>
              {currentItem.cue}
            </p>
          </div>
        )}
        <div className="mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
          {ACTION_BUTTONS.map((button) => (
            <button
              key={button.action}
              type="button"
              onClick={() => submitAction(button.action)}
              aria-label={`${button.cue} — ${button.label}`}
              className="group min-h-24 rounded-3xl border border-border bg-background/70 p-4 transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            >
              <span className="block text-3xl font-black text-primary">{button.cue}</span>
              <span className="mt-1 block text-xs font-black uppercase tracking-wider">{button.label}</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">{button.shortcut}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Используйте кнопки на экране или клавиатуру</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </div>
      </motion.div>
    </section>
  );
}

function Instruction({
  cue,
  title,
  text,
}: {
  cue: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-5">
      <dt className="text-3xl font-black text-primary">{cue}</dt>
      <dd className="mt-2 text-sm font-black uppercase tracking-wider">{title}</dd>
      <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</dd>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <dt className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-black text-foreground">{value}</dd>
    </div>
  );
}
