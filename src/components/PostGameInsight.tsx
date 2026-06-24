import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Award, Brain, Heart, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LuscherTest } from './LuscherTest';
import { EmotionalBarometer } from './EmotionalBarometer';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { CompletionRecommendation } from './CompletionRecommendation';
import { CognitiveTrendCurve } from './CognitiveTrendCurve';
import { buildPraise, type PraiseOutput } from '../lib/praise-engine';

const logger = createSafeLogger('post-game-insight');

interface PostGameInsightProps {
  gameType: string;
  score: number;
  timeMs: number;
  errors?: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  preSequence?: number[] | null;
  sessionId?: string | null;
}

interface ComparisonData {
  deltaPercentage: number;
  trend: 'up' | 'down' | 'stable';
  percentile: number;
  verdict: string;
  recommendedGame: string;
  recommendedGameTitle: string;
}

export function PostGameInsight({
  gameType,
  score,
  timeMs,
  errors = 0,
  onPlayAgain,
  onBackToMenu,
  preSequence = null,
  sessionId = null
}: PostGameInsightProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<ComparisonData | null>(null);
  const [localPostSequence, setLocalPostSequence] = useState<number[] | null>(null);
  const [showPostTest, setShowPostTest] = useState(false);
  const [savingPostTest, setSavingPostTest] = useState(false);

  const handlePostLuscherFinish = async (seq: number[]) => {
    setLocalPostSequence(seq);
    setShowPostTest(false);
    
    if (token && sessionId && preSequence) {
      setSavingPostTest(true);
      try {
        await fetch(`/api/game/session/${sessionId}/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            metadata: {
              preSequence,
              postSequence: seq
            }
          })
        });
      } catch (err) {
        logger.error('Post-game color sequence save failed', { error: safeError(err), gameType });
      } finally {
        setSavingPostTest(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    
    // Fetch comparison insight from server
    fetch(`/api/analytics/compare?gameType=${gameType}&score=${score}&timeMs=${timeMs}&errors=${errors}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch insights');
        return res.json();
      })
      .then(data => {
        if (active) {
          setInsight(data);
          setLoading(false);
        }
      })
      .catch(err => {
        logger.error('Game insights fetch failed', { error: safeError(err), gameType });
        if (active) {
          // Fallback data if API fails or user is offline
          setInsight({
            deltaPercentage: 0,
            trend: 'stable',
            percentile: 50,
            verdict: errors > 3 
              ? 'Вы завершили тренировку! Хороший темп, но обратите внимание на точность — старайтесь совершать меньше ошибок.' 
              : 'Отличная тренировка! Стабильный результат. Продолжайте регулярные занятия для закрепления навыка.',
            recommendedGame: 'schulte',
            recommendedGameTitle: 'Таблицы Шульте'
          });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [gameType, score, timeMs, errors, token]);

  // Game translation helper
  const getGameTitle = (type: string) => {
    const titles: Record<string, string> = {
      SCHULTE: 'Таблицы Шульте',
      STROOP: 'Эффект Струпа',
      N_BACK: 'Задача N-назад',
      NUMERICAL_ANALYSIS: 'Числовой анализ',
      LOGICAL_SEQUENCE: 'Логическая матрица',
      SPEED_TYPING: 'Скоростная печать',
      COLLISION_DETECTOR: 'Детектор коллизий',
      TOPOLOGY_MEMORY: 'Топологическая память',
      ASYNC_DISPATCHER: 'Асинхронный диспетчер',
      NOISE_REDUCTION: 'Редукция шума',
      LANGUAGE_SCANNER: 'Смысловой сканер',
      DECRYPTOR: 'Декриптор',
      REALITY_CHECK: 'Проверка реальности',
      OBJECTIVE_FILTER: 'Объективный фильтр',
      PROFILING_RICE: 'Профайлинг RICE'
    };
    return titles[type] || type;
  };

  const accuracy = useMemo(() => Math.max(0, Math.min(100, 100 - errors * 8)), [errors]);
  const reactionMs = useMemo(() => Math.round(timeMs / Math.max(1, score || 1)), [timeMs, score]);

  const praise: PraiseOutput | null = useMemo(() => {
    if (loading || !insight) return null;

    return buildPraise({
      currentAccuracy: accuracy / 100,
      currentReactionMs: reactionMs,
      currentFatigueIndex: insight.trend === 'down' ? 0.3 : insight.trend === 'up' ? -0.1 : 0.05,
      currentEngagementIndex: insight.trend === 'up' ? 0.9 : 0.7,
      historicalAvgAccuracy: insight.trend !== 'stable' ? undefined : accuracy / 100,
    });
  }, [loading, insight, accuracy, reactionMs]);

  if (showPostTest) {
    return (
      <LuscherTest 
        title="Цветовой тест Люшера ПОСЛЕ игры" 
        onFinish={handlePostLuscherFinish} 
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-card/20 border border-border rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black text-center mb-2">Анализ завершен</h2>
      <h3 className="text-2xl font-black text-center uppercase tracking-tight text-foreground mb-8">
        {getGameTitle(gameType)}
      </h3>

      {/* Raw stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card/30 border border-border/50 rounded-2xl p-4 text-center">
          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Счет</p>
          <p className="text-2xl sm:text-3xl font-mono font-bold text-primary tabular-nums">{score}</p>
        </div>
        <div className="bg-card/30 border border-border/50 rounded-2xl p-4 text-center">
          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Время</p>
          <p className="text-2xl sm:text-3xl font-mono font-bold text-foreground tabular-nums">{(timeMs / 1000).toFixed(1)}s</p>
        </div>
        <div className="bg-card/30 border border-border/50 rounded-2xl p-4 text-center">
          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Ошибки</p>
          <p className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${errors > 0 ? 'text-destructive' : 'text-emerald-500'}`}>{errors}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse">Генерация когнитивных выводов...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Comparison Stats */}
          {insight && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Delta box */}
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${insight.trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : insight.trend === 'down' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                  {insight.trend === 'up' ? <TrendingUp className="w-6 h-6" /> : insight.trend === 'down' ? <TrendingDown className="w-6 h-6" /> : <Brain className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Динамика</p>
                  <p className="text-lg font-black tracking-tight mt-0.5">
                    {insight.deltaPercentage > 0 
                      ? `${insight.trend === 'up' ? '⬆ +' : '⬇ -'}${insight.deltaPercentage}% к истории` 
                      : 'Стабильный уровень'}
                  </p>
                </div>
              </div>

              {/* Percentile box */}
              <div className="bg-secondary/10 border border-border rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-secondary/30 rounded-xl text-secondary-foreground">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Перцентиль</p>
                  <p className="text-lg font-black tracking-tight mt-0.5">
                    Лучше {insight.percentile}% игроков
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Praise Section */}
          {praise && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-primary">{praise.headline}</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {praise.metricHighlights.map((h) => (
                  <div key={h.metric} className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mb-1">{h.label}</p>
                    <p className={`text-lg font-black ${h.isPositive ? 'text-emerald-500' : h.direction === 'stable' ? 'text-foreground' : 'text-amber-500'}`}>
                      {h.metric === 'accuracy' ? `${h.value}%` : h.metric === 'reaction' ? `${h.value}мс` : h.value}
                    </p>
                    {h.delta !== undefined && h.delta !== 0 && (
                      <p className={`text-[9px] font-bold ${h.isPositive ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {h.delta > 0 ? '+' : ''}{h.delta}{h.metric === 'accuracy' ? '%' : 'мс'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {praise.details.length > 0 && (
                <div className="space-y-1.5">
                  {praise.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {d.includes('усталость') || d.includes('снизилась') ? (
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Compact Cognitive Trend */}
          {token && (
            <div className="bg-card/30 border border-border/50 rounded-2xl p-4">
              <CognitiveTrendCurve moduleId={gameType} days={14} compact />
            </div>
          )}

          {insight && (
            <CompletionRecommendation
              sourceModuleId={gameType}
              sourceSessionId={sessionId}
              score={score}
              accuracy={100 - errors * 8}
              errors={errors}
              durationMs={timeMs}
              recommendedModuleId={insight.recommendedGame}
              recommendedTitle={insight.recommendedGameTitle}
              improvementText={insight.verdict}
              onRepeat={onPlayAgain}
              onMenu={onBackToMenu}
            />
          )}
        </motion.div>
      )}

      {/* Luscher Post Game Option or Barometer */}
      {preSequence && (
        <div className="mt-6 border-t border-border/30 pt-6">
          {localPostSequence ? (
            <EmotionalBarometer 
              preSequence={preSequence} 
              postSequence={localPostSequence} 
            />
          ) : (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-primary fill-primary/25 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-foreground">Эмоциональный барометр</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Вы прошли тест Люшера ДО игры. Пройдите его ПОСЛЕ игры, чтобы увидеть, как тренировка повлияла на ваш эмоциональный тонус.
                </p>
              </div>
              <button
                onClick={() => setShowPostTest(true)}
                className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/10"
              >
                {savingPostTest ? 'Сохранение...' : 'Пройти тест ПОСЛЕ игры'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
