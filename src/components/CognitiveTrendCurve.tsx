import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('cognitive-trend-curve');

interface TrendPoint {
  date: string;
  accuracy: number;
  reactionMs: number;
  fatigueIndex: number;
  engagementIndex: number;
  sessionCount: number;
}

interface CognitiveTrendData {
  moduleId: string | null;
  category: string | null;
  points: TrendPoint[];
  overallDirection: 'improving' | 'stable' | 'declining';
  timespanDays: number;
  summary: {
    avgAccuracy: number;
    avgReactionMs: number;
    totalSessions: number;
  };
}

interface CognitiveTrendCurveProps {
  moduleId?: string;
  days?: number;
  compact?: boolean;
}

const DIRECTION_CONFIG = {
  improving: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Улучшение' },
  stable: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Стабильно' },
  declining: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Снижение' },
} as const;

export function CognitiveTrendCurve({ moduleId, days = 30, compact = false }: CognitiveTrendCurveProps) {
  const { token } = useAuth();
  const [data, setData] = useState<CognitiveTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (moduleId) params.set('moduleId', moduleId);
    params.set('days', String(days));

    fetch(`/api/analytics/cognitive-trend?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch trend');
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        logger.error('Cognitive trend fetch failed', { error: safeError(err) });
        setError(true);
        setLoading(false);
      });
  }, [token, moduleId, days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
          Загрузка тренда...
        </span>
      </div>
    );
  }

  if (error || !data || data.points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Brain className="w-8 h-8 text-muted-foreground opacity-20" />
        <p className="text-xs text-muted-foreground text-center">
          Недостаточно данных для построения тренда. Завершите несколько тренировок для анализа.
        </p>
      </div>
    );
  }

  const direction = DIRECTION_CONFIG[data.overallDirection];
  const DirectionIcon = direction.icon;

  const chartData = data.points.map((p) => ({
    ...p,
    label: formatDateLabel(p.date),
    accuracyPct: Math.round(p.accuracy * 100),
    reactionSec: p.reactionMs / 1000,
  }));

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Когнитивный тренд
          </h4>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${direction.bg} ${direction.color}`}>
            <DirectionIcon className="w-3 h-3" />
            {direction.label}
          </div>
        </div>
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--primary-rgb), 0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="accuracy" domain={[0, 100]} tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-2 rounded-lg shadow-xl text-[10px]">
                      <p className="font-bold text-foreground">{d.label}</p>
                      <p className="text-primary">Точность: {d.accuracyPct}%</p>
                      <p className="text-muted-foreground">{d.sessionCount} сессий</p>
                    </div>
                  );
                }}
              />
              <Line yAxisId="accuracy" type="monotone" dataKey="accuracyPct" stroke="var(--primary)" strokeWidth={2} dot={false} animationDuration={1200} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-card/40 border border-border rounded-3xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Когнитивный тренд
          </h4>
          <p className="text-xs text-foreground font-bold">
            {moduleId ? `Модуль: ${moduleId}` : 'Все модули'} · {days} дней
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${direction.bg} ${direction.color}`}>
          <DirectionIcon className="w-3.5 h-3.5" />
          {direction.label}
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendAccuracy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--primary-rgb), 0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="accuracy" domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="%" />
            <YAxis yAxisId="reaction" orientation="right" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} unit="s" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-card border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">{d.label}</p>
                    <p className="text-sm font-mono font-bold text-primary">Точность: {d.accuracyPct}%</p>
                    <p className="text-xs text-foreground">Реакция: {d.reactionSec.toFixed(2)}s</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{d.sessionCount} сессий</p>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 9, fontWeight: 700 }}
              formatter={(value: string) => (value === 'accuracyPct' ? 'Точность' : 'Реакция')}
            />
            <Line yAxisId="accuracy" type="monotone" dataKey="accuracyPct" name="accuracyPct" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--primary)' }} activeDot={{ r: 5 }} animationDuration={1500} />
            <Line yAxisId="reaction" type="monotone" dataKey="reactionSec" name="reactionSec" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-primary rounded-full" />
            <span className="text-[8px] text-muted-foreground uppercase font-black">Точность</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-muted-foreground rounded-full" style={{ borderTop: '1px dashed' }} />
            <span className="text-[8px] text-muted-foreground uppercase font-black">Реакция</span>
          </div>
        </div>
        <p className="text-[8px] text-muted-foreground font-medium">
          Ср. точность: {Math.round(data.summary.avgAccuracy * 100)}% · {data.summary.totalSessions} сессий
        </p>
      </div>
    </motion.div>
  );
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}
