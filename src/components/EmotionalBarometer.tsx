import { motion } from 'motion/react';
import { calculateLuscherShift, LUSCHER_COLORS } from '../hooks/useLuscherEngine';
import { Heart, Activity, AlertTriangle } from 'lucide-react';

interface EmotionalBarometerProps {
  preSequence: number[];
  postSequence: number[];
}

export function EmotionalBarometer({ preSequence, postSequence }: EmotionalBarometerProps) {
  const result = calculateLuscherShift(preSequence, postSequence);
  const { scoreChange, emotionalState, preScore, postScore } = result;

  const getColorHex = (id: number) => {
    return LUSCHER_COLORS.find(c => c.id === id)?.hex || '#ccc';
  };

  const getColorName = (id: number) => {
    return LUSCHER_COLORS.find(c => c.id === id)?.name || '';
  };

  return (
    <div className="w-full bg-card/30 border border-border/80 rounded-2xl p-6 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Эмоциональный барометр</h4>
      </div>

      {/* Comparison Progress Bars */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            <span>ДО тренировки</span>
            <span className="font-mono">{preScore}%</span>
          </div>
          <div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden border border-border/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${preScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-muted-foreground/30"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-primary">
            <span>ПОСЛЕ тренировки</span>
            <span className="font-mono">{postScore}%</span>
          </div>
          <div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden border border-border/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${postScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-primary"
            />
          </div>
        </div>
      </div>

      {/* Result announcement */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center sm:text-left">
        <p className="text-sm font-bold text-foreground">
          {scoreChange > 0 ? (
            <span className="text-emerald-500">✨ Тренировка улучшила ваше состояние на +{scoreChange}%!</span>
          ) : scoreChange < 0 ? (
            <span className="text-rose-500">📉 Напряжение возросло на {Math.abs(scoreChange)}% (признак утомления).</span>
          ) : (
            <span className="text-muted-foreground">⚖️ Состояние осталось стабильным (0% изменений).</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {emotionalState === 'improvement' 
            ? 'Цвета спокойствия и активности сдвинулись вперед. Тренировка помогла переключить внимание и снять стресс.'
            : emotionalState === 'fatigue'
            ? 'Цвета усталости вышли вперед. Рекомендуем сделать перерыв и не перегружать рабочую память.'
            : 'Ваш эмоциональный баланс остался неизменным. Хороший знак устойчивости нервной системы.'}
        </p>
      </div>

      {/* Selected colors comparison row */}
      <div className="space-y-3 pt-3 border-t border-border/30">
        <h5 className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Первые выборы цвета (ДО vs ПОСЛЕ)</h5>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold w-12">До:</span>
            <div className="flex gap-1.5">
              {preSequence.slice(0, 4).map((colorId, i) => (
                <div 
                  key={i} 
                  className="w-5 h-5 rounded-full border border-white/10 shadow-sm"
                  style={{ backgroundColor: getColorHex(colorId) }}
                  title={getColorName(colorId)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-primary uppercase font-bold w-12">После:</span>
            <div className="flex gap-1.5">
              {postSequence.slice(0, 4).map((colorId, i) => (
                <div 
                  key={i} 
                  className="w-5 h-5 rounded-full border border-white/10 shadow-sm"
                  style={{ backgroundColor: getColorHex(colorId) }}
                  title={getColorName(colorId)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Medical disclaimer */}
      <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex gap-2 items-start">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          <b>Дисклеймер:</b> Тест Люшера используется для самонаблюдения и оценки текущего тонуса. Это не является медицинской диагностикой или основанием для клинических выводов.
        </p>
      </div>
    </div>
  );
}
