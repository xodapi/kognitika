import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Award, Brain, Zap, RotateCcw, Menu, ArrowRight, ShieldAlert, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LuscherTest } from './LuscherTest';
import { EmotionalBarometer } from './EmotionalBarometer';
import { useNavigate } from 'react-router-dom';
import { routeForRecommendedGame } from '../lib/routes';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { eventBus } from '../client/analytics/event-bus';
import {
  buildCompletionNarrative,
  createClientSourceSessionId,
  getPracticeGameTitle,
  getPracticeRecommendation,
  type PracticeRecommendation,
} from '../lib/practice-recommendations';

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
  recommendedGame?: string;
  recommendedGameTitle?: string;
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<ComparisonData | null>(null);
  const [localPostSequence, setLocalPostSequence] = useState<number[] | null>(null);
  const [showPostTest, setShowPostTest] = useState(false);
  const [savingPostTest, setSavingPostTest] = useState(false);
  const sourceSessionId = useMemo(
    () => sessionId || createClientSourceSessionId({ gameType, score, timeMs }),
    [gameType, score, sessionId, timeMs],
  );
  const recommendation: PracticeRecommendation = useMemo(
    () => getPracticeRecommendation(gameType, {
      recommendedGame: insight?.recommendedGame,
      recommendedGameTitle: insight?.recommendedGameTitle,
      errors,
      trend: insight?.trend,
    }),
    [errors, gameType, insight?.recommendedGame, insight?.recommendedGameTitle, insight?.trend],
  );
  const narrative = useMemo(
    () => buildCompletionNarrative({
      gameType,
      score,
      errors,
      percentile: insight?.percentile,
      verdict: insight?.verdict,
      recommendation,
    }),
    [errors, gameType, insight?.percentile, insight?.verdict, recommendation, score],
  );

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

  const handleStartRecommended = () => {
    eventBus.emit('PracticeRecommended', {
      category: recommendation.category,
      moduleId: recommendation.moduleId,
      reason: recommendation.reason,
      sourceSessionId,
    });
  };

  useEffect(() => {
    return eventBus.on('PracticeRecommended', (payload) => {
      if (payload.sourceSessionId !== sourceSessionId) return;
      navigate(routeForRecommendedGame(payload.moduleId));
    });
  }, [navigate, sourceSessionId]);

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
          const fallback = getPracticeRecommendation(gameType, { errors });
          // Fallback data if API fails or user is offline
          setInsight({
            deltaPercentage: 0,
            trend: 'stable',
            percentile: 50,
            verdict: errors > 3 
              ? 'Вы завершили тренировку! Хороший темп, но обратите внимание на точность — старайтесь совершать меньше ошибок.' 
              : 'Отличная тренировка! Стабильный результат. Продолжайте регулярные занятия для закрепления навыка.',
            recommendedGame: fallback.moduleId,
            recommendedGameTitle: fallback.moduleTitle
          });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [gameType, score, timeMs, errors, token]);

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
        {getPracticeGameTitle(gameType)}
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

          {/* Completion contract */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-card/40 border border-border/80 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-2">Что получилось</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{narrative.didWell}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/40 border border-border/80 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-2">Что улучшить</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{narrative.improve}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/10 border border-border/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                <div className="text-center sm:text-left">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Что дальше</p>
                  <p className="text-sm font-bold text-foreground">{recommendation.moduleTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{narrative.recommendationReason}</p>
                </div>
              </div>
              <button
                onClick={handleStartRecommended}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors group"
              >
                Начать рекомендованное <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
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

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 border-t border-border pt-6 mt-8">
        <button
          onClick={onBackToMenu}
          className="flex-1 py-4 bg-card border border-border text-foreground hover:bg-secondary rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Menu className="w-4 h-4" />
          В меню
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-98"
        >
          <RotateCcw className="w-4 h-4" />
          Повторить
        </button>
      </div>
    </div>
  );
}
