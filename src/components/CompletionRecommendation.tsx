import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, CheckCircle2, Menu, RotateCcw, Sparkles, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { emitEvent } from '../hooks/useEventBus';
import { routeForRecommendedGame } from '../lib/routes';
import {
  buildPracticeRecommendation,
  categoryForPracticeModule,
  normalizePracticeModuleId,
  PracticeRecommendation,
  PracticeRecommendationReason,
} from '../lib/practice-recommendations';

interface CompletionRecommendationProps {
  sourceModuleId: string;
  sourceSessionId?: string | null;
  score?: number | null;
  maxScore?: number | null;
  accuracy?: number | null;
  errors?: number | null;
  durationMs?: number | null;
  recommendedModuleId?: string | null;
  recommendedTitle?: string | null;
  successText?: string | null;
  improvementText?: string | null;
  reason?: PracticeRecommendationReason | null;
  reasonText?: string | null;
  onRepeat?: () => void;
  onMenu?: () => void;
  repeatLabel?: string;
  menuLabel?: string;
  className?: string;
}

function withOverrides(
  base: PracticeRecommendation,
  props: CompletionRecommendationProps,
): PracticeRecommendation {
  const moduleId = props.recommendedModuleId
    ? normalizePracticeModuleId(props.recommendedModuleId)
    : base.moduleId;

  return {
    ...base,
    moduleId,
    category: categoryForPracticeModule(moduleId),
    title: props.recommendedTitle || base.title,
    reason: props.reason || base.reason,
    reasonText: props.reasonText || base.reasonText,
    successText: props.successText || base.successText,
    improvementText: props.improvementText || base.improvementText,
  };
}

export function CompletionRecommendation(props: CompletionRecommendationProps) {
  const navigate = useNavigate();
  const emittedKey = useRef<string | null>(null);

  const recommendation = useMemo(() => {
    const base = buildPracticeRecommendation({
      sourceModuleId: props.sourceModuleId,
      score: props.score,
      maxScore: props.maxScore,
      accuracy: props.accuracy,
      errors: props.errors,
      durationMs: props.durationMs,
    });
    return withOverrides(base, props);
  }, [
    props.sourceModuleId,
    props.score,
    props.maxScore,
    props.accuracy,
    props.errors,
    props.durationMs,
    props.recommendedModuleId,
    props.recommendedTitle,
    props.successText,
    props.improvementText,
    props.reason,
    props.reasonText,
  ]);

  const sourceSessionId = props.sourceSessionId || `local:${normalizePracticeModuleId(props.sourceModuleId)}`;

  useEffect(() => {
    const key = `${sourceSessionId}:${recommendation.moduleId}:${recommendation.reason}`;
    if (emittedKey.current === key) return;
    emittedKey.current = key;

    emitEvent('PRACTICE_RECOMMENDED', {
      category: recommendation.category,
      moduleId: recommendation.moduleId,
      reason: recommendation.reason,
      sourceSessionId,
    });
  }, [recommendation.category, recommendation.moduleId, recommendation.reason, sourceSessionId]);

  const startRecommended = () => {
    navigate(routeForRecommendedGame(recommendation.moduleId));
  };

  const backToMenu = () => {
    if (props.onMenu) {
      props.onMenu();
      return;
    }
    navigate('/');
  };

  return (
    <section
      aria-label="Рекомендация следующей тренировки"
      className={`w-full rounded-2xl border border-border bg-card/30 p-4 sm:p-5 text-left ${props.className || ''}`}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            Что получилось
          </div>
          <p className="text-sm leading-relaxed text-foreground">{recommendation.successText}</p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
            <Target className="h-4 w-4" />
            Что улучшить
          </div>
          <p className="text-sm leading-relaxed text-foreground">{recommendation.improvementText}</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" />
            Следующий тест
          </div>
          <p className="text-sm font-black text-foreground">{recommendation.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{recommendation.reasonText}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={startRecommended}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-95"
        >
          Начать рекомендованное
          <ArrowRight className="h-4 w-4" />
        </button>

        {props.onRepeat && (
          <button
            type="button"
            onClick={props.onRepeat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:bg-secondary active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            {props.repeatLabel || 'Повторить'}
          </button>
        )}

        <button
          type="button"
          onClick={backToMenu}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:bg-secondary active:scale-95"
        >
          <Menu className="h-4 w-4" />
          {props.menuLabel || 'В меню'}
        </button>
      </div>
    </section>
  );
}
