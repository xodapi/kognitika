import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Shield, AlertTriangle, CheckCircle2, ChevronRight, Brain, Zap, Info } from 'lucide-react';
import { useRealityCheckEngine } from '../hooks/useRealityCheckEngine';
import { useAuth } from '../hooks/useAuth';
import { PostGameInsight } from './PostGameInsight';

export function RealityCheck({ onFinish }: { onFinish: (results: any) => void }) {
  const { user } = useAuth();
  const userSeed = user?.id
    ? Array.from(user.id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;
  const { 
    currentPair, 
    progress, 
    isActive, 
    isFinished,
    startSession, 
    submitAnswer,
    score,
    pairsRemaining
  } = useRealityCheckEngine(userSeed, user?.level || 1);

  useEffect(() => {
    startSession();
  }, [startSession]);

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] sm:h-[600px] bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-12 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <PostGameInsight
            gameType="REALITY_CHECK"
            score={score}
            timeMs={1000}
            errors={0}
            onPlayAgain={startSession}
            onBackToMenu={() => onFinish(score)}
          />
        </motion.div>
      </div>
    );
  }

  if (!currentPair && isActive) return (
    <div className="min-h-[500px] sm:h-[600px] flex flex-col items-center justify-center gap-4">
       <Brain className="w-12 h-12 text-primary animate-bounce" />
       <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Инициализация семантического ядра...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 p-3 sm:p-4">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase leading-tight">Проверка Реальности</h2>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1">Детекция семантического дрейфа ИИ</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Точность анализа</p>
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
          key={currentPair?.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8"
        >
          {/* Source Context (Left) */}
          <div className="space-y-2 sm:space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Info className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400/70">Исходный контекст (Fact)</span>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-4 sm:p-6 md:p-8 min-h-[140px] sm:min-h-[200px] md:min-h-[240px] flex items-center justify-center relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-sm sm:text-base md:text-lg font-medium text-foreground leading-relaxed text-center relative z-10">
                 {currentPair?.fact}
               </p>
               <Shield className="absolute bottom-4 right-4 w-12 h-12 text-blue-500/10" />
            </div>
          </div>

          {/* AI Statement (Right) */}
          <div className="space-y-2 sm:space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Brain className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-purple-400/70">Генерация отчета (AI Statement)</span>
            </div>
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-3xl p-4 sm:p-6 md:p-8 min-h-[140px] sm:min-h-[200px] md:min-h-[240px] flex items-center justify-center relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-sm sm:text-base md:text-lg font-bold text-foreground leading-relaxed text-center relative z-10 italic">
                 "{currentPair?.statement}"
               </p>
               <Zap className="absolute bottom-4 right-4 w-12 h-12 text-purple-500/10" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Control Panel */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 py-4 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4 w-full max-w-2xl">
          <button
            onClick={() => submitAnswer(false)}
            className="flex-1 group bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 py-4 sm:py-6 rounded-2xl sm:rounded-3xl transition-all flex flex-col items-center gap-2"
          >
            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-emerald-500">Данные верны</span>
            <span className="text-[8px] text-muted-foreground uppercase">Fact-Check Pass</span>
          </button>

          <button
            onClick={() => submitAnswer(true)}
            className="flex-1 group bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 py-4 sm:py-6 rounded-2xl sm:rounded-3xl transition-all flex flex-col items-center gap-2"
          >
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-rose-500">Галлюцинация</span>
            <span className="text-[8px] text-muted-foreground uppercase">Drift Detected</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <ChevronRight className="w-3 h-3 text-primary" />
          Осталось {pairsRemaining} семантических пар
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}
