import { motion } from 'motion/react';

interface StabilityIndicatorProps {
  stability: number; // stability index (variance)
  isAdapting: boolean;
}

export function StabilityIndicator({ stability, isAdapting }: StabilityIndicatorProps) {
  // Normalize stability for visualization (lower is better/more stable)
  // Assuming 0-500ms range for color
  const hue = Math.max(0, Math.min(120, 120 - (stability / 4)));
  const percentage = Math.max(0, Math.min(100, 100 - (stability / 5)));

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Стабильность</span>
        <div className="flex items-center gap-1">
          {isAdapting && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />}
          <span className="text-[9px] font-mono font-bold" style={{ color: `hsl(${hue}, 70%, 50%)` }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <motion.div 
          className="h-full"
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%`, backgroundColor: `hsl(${hue}, 70%, 50%)` }}
          transition={{ type: 'spring', stiffness: 50 }}
        />
      </div>
      <p className="text-[7px] text-muted-foreground/60 uppercase tracking-tighter">
        {stability < 150 ? 'Высокая концентрация' : stability < 300 ? 'Средняя стабильность' : 'Требуется фокусировка'}
      </p>
    </div>
  );
}
