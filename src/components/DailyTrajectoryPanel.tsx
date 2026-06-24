import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, SkipForward, Target, Zap, Shield, Leaf } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type DailyPracticeItem,
} from '../lib/daily-practice-types';

const logger = createSafeLogger('daily-trajectory-panel');

interface DailyTrajectoryPanelProps {
  onStartGame?: (game: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cognitive: <Target className="w-3.5 h-3.5" />,
  somatic: <Leaf className="w-3.5 h-3.5" />,
  safety: <Shield className="w-3.5 h-3.5" />,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  in_progress: <div className="w-4 h-4 border-2 border-primary rounded-full animate-pulse" />,
  planned: <Circle className="w-4 h-4 text-muted-foreground" />,
  skipped: <SkipForward className="w-4 h-4 text-muted-foreground" />,
};

export function DailyTrajectoryPanel({ onStartGame }: DailyTrajectoryPanelProps) {
  const { token } = useAuth();
  const [items, setItems] = useState<DailyPracticeItem[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/daily-trajectory', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setItems(data.items);
        if (data.progress) setProgress(data.progress);
        setLoading(false);
      })
      .catch((err) => {
        logger.error('Daily trajectory fetch failed', { error: safeError(err) });
        setLoading(false);
      });
  }, [token]);

  const handleStatusChange = async (itemId: string, newStatus: 'completed' | 'skipped') => {
    if (!token || updatingId) return;
    setUpdatingId(itemId);

    try {
      const res = await fetch('/api/daily-trajectory/item', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.items) setItems(data.items);
        if (data.progress) setProgress(data.progress);
      }
    } catch (err) {
      logger.error('Failed to update item status', { error: safeError(err) });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card/40 border border-border rounded-3xl p-5">
        <div className="flex items-center justify-center py-6 gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
            Загрузка плана...
          </span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, DailyPracticeItem[]>,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card/40 border border-border rounded-3xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
            Траектория дня
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {progress.completed} из {progress.total} выполнено
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] font-bold text-primary">{progress.percent}%</span>
        </div>
      </div>

      {/* Items by category */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryItems]) => {
          const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.cognitive;
          return (
            <div key={category}>
              <div className={`flex items-center gap-1.5 mb-2 px-1`}>
                <span className={colors.text}>{CATEGORY_ICONS[category]}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>
                  {CATEGORY_LABELS[category] || category}
                </span>
              </div>
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {categoryItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                        item.status === 'completed'
                          ? 'bg-emerald-500/5 border-emerald-500/10'
                          : item.status === 'in_progress'
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-card/30 border-border/50 hover:border-border'
                      }`}
                    >
                      <div className="shrink-0">{STATUS_ICONS[item.status]}</div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            item.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          +{item.xpReward} XP
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === 'planned' && (
                          <>
                            <button
                              onClick={() => onStartGame?.(item.moduleId)}
                              className="px-2.5 py-1 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-colors active:scale-95"
                            >
                              Старт
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'skipped')}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="Пропустить"
                            >
                              <SkipForward className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-[9px] text-emerald-500 font-bold uppercase">Готово</span>
                        )}
                        {item.status === 'skipped' && (
                          <span className="text-[9px] text-muted-foreground font-bold uppercase">Пропущено</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
        <Zap className="w-3 h-3 text-primary" />
        <p className="text-[9px] text-muted-foreground">
          Выполняйте план ежедневно для поддержания стрика и роста когнитивных способностей.
        </p>
      </div>
    </motion.div>
  );
}
