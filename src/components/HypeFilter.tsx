import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, AlertTriangle, Eye, Flame, Brain, HelpCircle, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useHypeFilterEngine, HypeCategory } from '../hooks/useHypeFilterEngine';
import { useAuth } from '../hooks/useAuth';
import { PostGameInsight } from './PostGameInsight';

export function HypeFilter({ onFinish }: { onFinish: (results: any) => void }) {
  const { user } = useAuth();
  const userSeed = user?.id
    ? Array.from(user.id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;

  const {
    currentStatement,
    progress,
    isActive,
    isFinished,
    score,
    errors,
    startSession,
    submitAnswer,
    itemsRemaining,
    lastFeedback
  } = useHypeFilterEngine(userSeed, user?.level || 1);

  useEffect(() => {
    startSession();
  }, [startSession]);

  if (isFinished) {
    return (
      <PostGameInsight 
        gameType="HYPE_FILTER"
        score={score}
        timeMs={0}
        errors={errors}
        onPlayAgain={startSession}
        onBackToMenu={() => onFinish({ score, errors })}
      />
    );
  }

  if (!currentStatement && isActive) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4">
        <Brain className="w-12 h-12 text-primary animate-bounce" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Калибровка детектора...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 p-3 sm:p-4">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase leading-tight">Фактчек или Хайп</h2>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1">Критическое мышление</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Очки</p>
            <p className="text-lg sm:text-xl font-black text-primary mt-1">{score} <span className="text-xs text-muted-foreground uppercase">PTS</span></p>
          </div>
          <div className="w-24 sm:w-32 bg-secondary/30 h-1.5 sm:h-2 rounded-full overflow-hidden border border-border">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStatement?.id || 'feedback'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative min-h-[300px] flex flex-col items-center justify-center bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-12"
        >
          {lastFeedback ? (
            <div className="text-center space-y-4">
              {lastFeedback.correct ? (
                <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
              ) : (
                <div className="mx-auto w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-rose-500" />
                </div>
              )}
              <h3 className="text-2xl font-black">{lastFeedback.correct ? 'Верно!' : 'Ошибка'}</h3>
              <p className="text-muted-foreground max-w-md mx-auto">{lastFeedback.explanation}</p>
            </div>
          ) : (
            <>
              <Shield className="absolute top-6 right-6 w-16 h-16 text-primary/5" />
              <p className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed text-center relative z-10 italic max-w-2xl">
                "{currentStatement?.text}"
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Control Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 py-4 sm:py-8 pointer-events-auto">
        <button
          disabled={!!lastFeedback}
          onClick={() => submitAnswer('fact')}
          className="group disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 py-4 sm:py-6 rounded-2xl transition-all flex flex-col items-center gap-2"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-emerald-500 text-center">Твердый факт</span>
        </button>

        <button
          disabled={!!lastFeedback}
          onClick={() => submitAnswer('fallacy')}
          className="group disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 py-4 sm:py-6 rounded-2xl transition-all flex flex-col items-center gap-2"
        >
          <HelpCircle className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-blue-500 text-center">Логическая ошибка</span>
        </button>

        <button
          disabled={!!lastFeedback}
          onClick={() => submitAnswer('fear')}
          className="group disabled:opacity-50 disabled:cursor-not-allowed bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 py-4 sm:py-6 rounded-2xl transition-all flex flex-col items-center gap-2"
        >
          <AlertTriangle className="w-6 h-6 text-rose-500 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-rose-500 text-center">Манипуляция страхом</span>
        </button>

        <button
          disabled={!!lastFeedback}
          onClick={() => submitAnswer('clickbait')}
          className="group disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 py-4 sm:py-6 rounded-2xl transition-all flex flex-col items-center gap-2"
        >
          <Flame className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-orange-500 text-center">Кликбейт</span>
        </button>
      </div>

      <div className="flex justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">
        <ChevronRight className="w-3 h-3 text-primary mr-1" />
        Осталось {itemsRemaining} утверждений
      </div>
    </div>
  );
}
