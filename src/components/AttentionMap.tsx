import { useMemo } from 'react';
import { motion } from 'motion/react';

interface Click {
  x?: number;
  y?: number;
  isCorrect?: boolean;
}

interface AttentionMapProps {
  clicks: Click[];
  width?: number;
  height?: number;
}

export function AttentionMap({ clicks, width = 300, height = 300 }: AttentionMapProps) {
  const points = useMemo(() => {
    return clicks.filter(c => c.x !== undefined && c.y !== undefined);
  }, [clicks]);

  return (
    <div 
      className="relative bg-background/20 border border-border rounded-3xl overflow-hidden shadow-inner"
      style={{ width, height }}
    >
      <svg width="100%" height="100%" viewBox="0 0 1 1" className="absolute inset-0">
        <defs>
          <radialGradient id="dotGradient">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Heatmap intensity circles */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            cx={p.x}
            cy={p.y}
            r="0.08"
            fill="url(#dotGradient)"
            className="pointer-events-none"
          />
        ))}

        {/* Precision dots */}
        {points.map((p, i) => (
          <circle
            key={`p-${i}`}
            cx={p.x}
            cy={p.y}
            r="0.01"
            className={p.isCorrect ? 'fill-primary' : 'fill-destructive'}
          />
        ))}
      </svg>

      {/* Grid lines for reference */}
      <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 opacity-[0.05] pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="border border-primary" />
        ))}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Live Attention Link</span>
      </div>
    </div>
  );
}
