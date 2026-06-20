import { motion } from 'motion/react';
import { Flame, AlertCircle } from 'lucide-react';

interface StreakBannerProps {
  streak: {
    days?: number;
    current?: number;
    multiplier?: number;
    isBroken?: boolean;
  } | null;
}

export function StreakBanner({ streak }: StreakBannerProps) {
  if (!streak) return null;

  const days = streak.days ?? streak.current ?? 0;
  const multiplier = streak.multiplier ?? 1;
  const isBroken = streak.isBroken ?? false;

  if (isBroken || days === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-destructive/10 border border-destructive/20 rounded-3xl p-5 flex items-center justify-between gap-4 backdrop-blur-md relative overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-destructive/20 rounded-2xl text-destructive shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Стрик прерван</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Вы пропустили день тренировок. Пройдите любую сессию сегодня, чтобы начать новый стрик!
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Calculate days remaining to next multiplier tier
  const daysToNextTier = days < 3 ? 3 - days : days < 7 ? 7 - days : 0;
  const nextTierMultiplier = days < 3 ? '×1.5' : days < 7 ? '×2.0' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-primary/5 border border-primary/10 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0 relative animate-pulse">
          <Flame className="w-6 h-6 fill-primary" />
        </div>
        <div className="text-center sm:text-left">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">
            Когнитивный стрик: <span className="text-primary font-mono">{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {daysToNextTier > 0 
              ? `До повышения множителя опыта (до ${nextTierMultiplier}) осталось ${daysToNextTier} ${daysToNextTier === 1 ? 'день' : 'дня'}.` 
              : 'У вас максимальный множитель опыта! Поддерживайте ритм!'}
          </p>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-2.5 text-center shrink-0">
        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider block">XP Множитель</span>
        <span className="text-lg font-mono font-black text-primary">×{multiplier.toFixed(1)}</span>
      </div>
    </motion.div>
  );
}
