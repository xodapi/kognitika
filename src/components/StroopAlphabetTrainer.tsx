import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Languages, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSessionRecording } from '../hooks/useSessionRecording';
import { useStroopAlphabetEngine } from '../hooks/useStroopAlphabetEngine';
import {
  ALPHABET_ACTION_CUES,
  alphabetActionFromKey,
  type AlphabetAction,
} from '../lib/alphabet-table-generator';
import { DEFAULT_STROOP_ALPHABET_COUNT } from '../lib/stroop-alphabet-generator';
import { STROOP_COLORS } from '../lib/stroop-colors';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { CompletionRecommendation } from './CompletionRecommendation';
import { useGameAttempt } from '../lib/game-attempt-client';

const logger = createSafeLogger('stroop-alphabet');

const ACTIONS: ReadonlyArray<{ action: AlphabetAction; label: string; shortcut: string }> = [
  { action: 'RIGHT', label: `${ALPHABET_ACTION_CUES.RIGHT} — Правая рука`, shortcut: '→ / D' },
  { action: 'LEFT', label: `${ALPHABET_ACTION_CUES.LEFT} — Левая рука`, shortcut: '← / A' },
  { action: 'BOTH', label: `${ALPHABET_ACTION_CUES.BOTH} — Обе руки`, shortcut: 'Пробел / O' },
];

export function StroopAlphabetTrainer() {
  const { state, startGame, stopGame, resetGame, submitColor, submitAction, getCompletedAnalyticsJob } = useStroopAlphabetEngine();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [questionCount, setQuestionCount] = useState(DEFAULT_STROOP_ALPHABET_COUNT);
  const { beginAttempt, saveAttempt } = useGameAttempt(token);

  useSessionRecording(state.isActive, state.isFinished);

  const handleStart = useCallback(async () => {
    try {
      await beginAttempt('STROOP_ALPHABET');
      startGame(questionCount);
    } catch (error) {
      logger.error('Game attempt start failed', { error: safeError(error), gameType: 'STROOP_ALPHABET' });
    }
  }, [beginAttempt, questionCount, startGame]);

  const handleReset = useCallback(() => {
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
        || target instanceof HTMLButtonElement
      ) return;

      const key = event.key.toLowerCase();
      if (state.phase === 'color') {
        const color = STROOP_COLORS[Number(key) - 1];
        if (color) {
          event.preventDefault();
          submitColor(color.id);
        }
        return;
      }

      const action = alphabetActionFromKey(event.key);
      if (action) {
        event.preventDefault();
        submitAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, state.phase, submitAction, submitColor]);

  useEffect(() => {
    if (state.outcome !== 'completed' || state.timeMs < 100 || !token) return;

    const totalErrors = state.colorErrors + state.actionErrors;
    const totalQuestions = state.items.length;
    const accuracy = totalQuestions > 0
      ? ((totalQuestions * 2 - totalErrors) / (totalQuestions * 2)) * 100
      : 0;

    void saveAttempt({
      timeMs: state.timeMs,
      metadata: {
        mode: 'stroop-alphabet',
        questionCount: totalQuestions,
        colorErrors: state.colorErrors,
        actionErrors: state.actionErrors,
        errors: totalErrors,
        accuracy,
        averageReactionTimeMs: state.averageReactionTimeMs,
      },
      analyticsJob: getCompletedAnalyticsJob() ?? undefined,
    })
      .then((data) => {
        if (data?.session?.score) refreshUser();
      })
      .catch((error) => {
        logger.error('Session save failed', { error: safeError(error), gameType: 'STROOP_ALPHABET' });
      });
  }, [
    getCompletedAnalyticsJob,
    refreshUser,
    saveAttempt,
    state.actionErrors,
    state.averageReactionTimeMs,
    state.colorErrors,
    state.items.length,
    state.outcome,
    state.timeMs,
    token,
  ]);

  if (state.outcome === 'completed') {
    const totalErrors = state.colorErrors + state.actionErrors;
    const totalAnswers = Math.max(1, state.items.length * 2);
    const accuracy = Math.round(((totalAnswers - totalErrors) / totalAnswers) * 100);
    return (
      <section className="col-span-12 flex min-h-[520px] items-center justify-center">
        <div className="w-full max-w-2xl rounded-[2.5rem] border border-border bg-card/60 p-8 text-center shadow-2xl sm:p-12">
          <Palette className="mx-auto h-14 w-14 text-primary" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-black uppercase tracking-tight">Комбинированный Струп завершён</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Сначала цвет текста, затем команда П/Л/О. Порядок ответа был одинаковым для каждого стимула.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultMetric label="Точность" value={`${accuracy}%`} />
            <ResultMetric label="Ошибки цвета" value={String(state.colorErrors)} />
            <ResultMetric label="Ошибки П/Л/О" value={String(state.actionErrors)} />
            <ResultMetric label="Средняя реакция" value={`${state.averageReactionTimeMs} мс`} />
          </dl>
          <CompletionRecommendation
            sourceModuleId="stroop-alphabet"
            score={Math.round(accuracy * 10)}
            maxScore={1000}
            accuracy={accuracy}
            errors={totalErrors}
            durationMs={state.timeMs}
            onRepeat={handleReset}
            onMenu={() => navigate('/')}
            className="mt-8"
          />
        </div>
      </section>
    );
  }

  if (state.outcome === 'aborted') {
    return (
      <section className="col-span-12 flex min-h-[500px] items-center justify-center">
        <div className="w-full max-w-xl rounded-[2.5rem] border border-border bg-card/60 p-8 text-center shadow-2xl sm:p-12">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-black uppercase tracking-tight">Попытка остановлена</h1>
          <p className="mt-2 text-sm text-muted-foreground">Неполная попытка не сохраняется.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={handleReset} className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground">
              Начать заново
            </button>
            <button type="button" onClick={() => navigate('/')} className="min-h-12 rounded-2xl border border-border px-5 py-3 text-xs font-black uppercase tracking-widest">
              В меню
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isActive) {
    return (
      <section className="col-span-12 flex min-h-[540px] items-center justify-center">
        <div className="w-full max-w-2xl rounded-[2.5rem] border border-border bg-card/50 p-8 text-center shadow-xl sm:p-12">
          <div className="flex items-center justify-center gap-3 text-primary">
            <Palette className="h-6 w-6" aria-hidden="true" />
            <Languages className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-black uppercase tracking-tight">Струп + Алфавит</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Игнорируйте значение цветного слова: сначала выберите фактический цвет текста,
            затем выполните команду П, Л или О.
          </p>
          <label htmlFor="stroop-alphabet-count" className="mx-auto mt-7 block max-w-xs text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Количество стимулов: {questionCount}
          </label>
          <input
            id="stroop-alphabet-count"
            type="range"
            min="9"
            max="33"
            step="3"
            value={questionCount}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
            className="mt-3 h-2 w-full max-w-xs accent-primary"
          />
          <p className="mt-6 text-xs text-muted-foreground">Доступны touch-кнопки и клавиатура. Камера, микрофон и voice input не нужны.</p>
          <button type="button" onClick={handleStart} data-testid="start-button" className="mt-8 min-h-12 w-full max-w-xs rounded-2xl bg-primary px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-primary-foreground">
            Начать тренировку
          </button>
        </div>
      </section>
    );
  }

  const currentItem = state.items[state.currentIndex];
  const textColor = STROOP_COLORS.find((color) => color.id === currentItem.textColorId);
  const progress = state.currentIndex / Math.max(1, state.items.length);

  return (
    <section className="col-span-12 grid min-h-[540px] gap-6 lg:grid-cols-12">
      <aside className="rounded-3xl border border-border bg-card/50 p-6 lg:col-span-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Прогресс</p>
        <p className="mt-3 font-mono text-3xl font-black tabular-nums">{(state.timeMs / 1000).toFixed(1)}<span className="ml-1 text-xs text-muted-foreground">с</span></p>
        <div role="progressbar" aria-label="Прогресс комбинированного Струпа" aria-valuemin={0} aria-valuemax={state.items.length} aria-valuenow={state.currentIndex} className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <ResultMetric label="Ошибки цвета" value={String(state.colorErrors)} />
          <ResultMetric label="Ошибки П/Л/О" value={String(state.actionErrors)} />
        </div>
        <button type="button" onClick={stopGame} className="mt-8 min-h-12 w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-destructive">
          Завершить досрочно
        </button>
      </aside>

      <div className="rounded-[2.5rem] border border-border bg-card/30 p-6 text-center shadow-xl sm:p-10 lg:col-span-9">
        <p
          aria-live="polite"
          className="text-xs font-black uppercase tracking-[0.2em] text-primary"
        >
          Шаг {state.currentIndex + 1} из {state.items.length}: {state.phase === 'color' ? 'выберите цвет текста' : 'выполните команду'}
        </p>
        <div className="mt-8 rounded-3xl border border-border bg-background/60 px-4 py-10">
          <p
            aria-label={`Слово ${currentItem.word}. Цвет текста: ${textColor?.text || 'неизвестен'}`}
            className="text-5xl font-black uppercase tracking-tight sm:text-7xl"
            style={{ color: currentItem.textColor }}
          >
            {currentItem.word}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Команда: <strong>{currentItem.cue}</strong></p>
        </div>
        {state.phase === 'color' ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STROOP_COLORS.map((color, index) => (
              <button key={color.id} type="button" onClick={() => submitColor(color.id)} className="min-h-24 rounded-2xl border border-border bg-card px-3 py-4 text-xs font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="mx-auto mb-2 block h-8 w-8 rounded-full" style={{ backgroundColor: color.color }} />
                {color.text} <span className="block text-[10px] text-muted-foreground">[{index + 1}]</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {ACTIONS.map((item) => (
              <button key={item.action} type="button" onClick={() => submitAction(item.action)} className="min-h-24 rounded-2xl border border-border bg-card px-3 py-4 text-xs font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {item.label}<span className="mt-2 block text-[10px] text-muted-foreground">{item.shortcut}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-black">{value}</dd>
    </div>
  );
}
