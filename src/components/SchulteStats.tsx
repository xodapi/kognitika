import { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Activity, Target } from 'lucide-react';

interface ClickData {
  num: number;
  color: string;
  timeMs: number;
  reactionTimeMs: number;
  cellId: number;
  gridIndex: number;
}

interface SchulteStatsProps {
  history: ClickData[];
  size: number;
  totalTimeMs: number;
  errors: number;
}

export function SchulteStats({ history, size, totalTimeMs, errors }: SchulteStatsProps) {
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    
    const reactionTimes = history.map(h => h.reactionTimeMs);
    const avgRT = reactionTimes.reduce((a, b) => a + b, 0) / history.length;
    const maxRT = Math.max(...reactionTimes);
    const minRT = Math.min(...reactionTimes);
    
    // Neuro-Drift: Difference between first 25% and last 25% of clicks
    const quarter = Math.max(1, Math.floor(history.length / 4));
    const startRT = reactionTimes.slice(0, quarter).reduce((a, b) => a + b, 0) / quarter;
    const endRT = reactionTimes.slice(-quarter).reduce((a, b) => a + b, 0) / quarter;
    const drift = ((endRT - startRT) / startRT) * 100;

    // Consistency: standard deviation (lower is better)
    const variance = reactionTimes.reduce((a, b) => a + Math.pow(b - avgRT, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev / avgRT) * 100).toFixed(1);

    // Heatmap data
    const cellStats = new Map<number, number>();
    history.forEach(h => {
      cellStats.set(h.gridIndex, h.reactionTimeMs);
    });

    return { avgRT, maxRT, minRT, consistency, cellStats, reactionTimes, drift };
  }, [history]);

  if (!stats) return null;

  // SVG Sparkline calculation
  const chartWidth = 300;
  const chartHeight = 60;
  const points = stats.reactionTimes.map((rt, i) => {
    const x = (i / (history.length - 1)) * chartWidth;
    const y = chartHeight - ((rt - stats.minRT) / (stats.maxRT - stats.minRT || 1)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full space-y-8 mt-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-background/40 border border-border p-4 rounded-2xl flex flex-col items-center text-center">
          <Activity className="w-4 h-4 text-primary mb-2" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Ср. реакция</span>
          <span className="text-lg font-mono font-bold">{(stats.avgRT / 1000).toFixed(2)}s</span>
        </div>
        <div className="bg-background/40 border border-border p-4 rounded-2xl flex flex-col items-center text-center">
          <TrendingUp className="w-4 h-4 text-green-500 mb-2" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Стабильность</span>
          <span className="text-lg font-mono font-bold">{stats.consistency}%</span>
        </div>
        <div className="bg-background/40 border border-border p-4 rounded-2xl flex flex-col items-center text-center">
          <Target className="w-4 h-4 text-destructive mb-2" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Точность</span>
          <span className="text-lg font-mono font-bold">{Math.max(0, 100 - (errors * 10))}%</span>
        </div>
        <div className="bg-background/40 border border-border p-4 rounded-2xl flex flex-col items-center text-center">
          <TrendingUp className={`w-4 h-4 mb-2 ${stats.drift > 20 ? 'text-destructive' : 'text-primary'}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Когнитивный дрейф</span>
          <span className={`text-lg font-mono font-bold ${stats.drift > 20 ? 'text-destructive' : 'text-primary'}`}>{stats.drift > 0 ? '+' : ''}{stats.drift.toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Heatmap Section */}
        <div className="space-y-4">
          <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" /> Тепловая карта внимания
          </h4>
          <div 
            className="grid gap-1 aspect-square w-full max-w-[240px] mx-auto" 
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {Array.from({ length: size * size }).map((_, i) => {
              const rt = stats.cellStats.get(i) || 0;
              const intensity = rt ? Math.min(1, rt / (stats.avgRT * 2)) : 0;
              
              return (
                <div 
                  key={i}
                  className="rounded-sm relative group"
                  style={{ 
                    backgroundColor: rt 
                      ? `rgba(var(--primary-rgb), ${0.1 + intensity * 0.9})` 
                      : 'rgba(255,255,255,0.05)'
                  }}
                >
                   {rt > 0 && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-sm">
                        <span className="text-[8px] font-mono">{(rt/1000).toFixed(1)}s</span>
                     </div>
                   )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground text-center italic">
            Чем темнее ячейка, тем выше время реакции в этой зоне зрения.
          </p>
        </div>

        {/* Reaction Time Chart */}
        <div className="space-y-4">
          <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500" /> Динамика прогресса
          </h4>
          <div className="bg-background/20 border border-border p-6 rounded-2xl h-full flex flex-col justify-center">
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
               <path 
                 d={`M 0,${chartHeight} ${points} L ${chartWidth},${chartHeight} Z`}
                 fill="url(#gradient)"
                 className="opacity-20"
               />
               <polyline
                 points={points}
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="2"
                 className="text-primary"
               />
               <defs>
                 <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
                   <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                 </linearGradient>
               </defs>
            </svg>
            <div className="flex justify-between text-[8px] text-muted-foreground uppercase mt-4 font-mono">
               <span>Старт</span>
               <span>Финиш</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
