import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLuscherEngine, LuscherColor } from '../hooks/useLuscherEngine';
import { Palette, Info } from 'lucide-react';

interface LuscherTestProps {
  title?: string;
  onFinish: (selections: number[]) => void;
}

export function LuscherTest({ title = 'Цветовой тест Люшера', onFinish }: LuscherTestProps) {
  const { selections, availableColors, selectColor, resetTest, isFinished } = useLuscherEngine();

  useEffect(() => {
    resetTest();
  }, [resetTest]);

  useEffect(() => {
    if (isFinished) {
      onFinish(selections);
    }
  }, [isFinished, selections, onFinish]);

  const stepNumber = selections.length + 1;

  return (
    <div className="w-full max-w-2xl mx-auto bg-card/20 border border-border rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden text-center">
      {/* Background gradients */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Palette className="w-8 h-8 text-primary" />
      </div>

      <h2 className="text-[10px] text-primary uppercase tracking-[0.2em] font-black mb-2">Эмоциональный барометр</h2>
      <h3 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight mb-4">
        {title}
      </h3>

      <div className="w-full bg-secondary/30 rounded-2xl p-4 border border-border/50 text-left flex gap-3 items-start max-w-md mx-auto mb-8">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Выберите цвет, который кажется вам <b>наиболее приятным</b> в данный момент. 
          Не ассоциируйте цвета с вещами, выбирайте интуитивно.
        </p>
      </div>

      {/* Progress indicators */}
      <div className="flex justify-center gap-1.5 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < selections.length 
                ? 'w-6 bg-primary' 
                : i === selections.length 
                ? 'w-4 bg-primary/40' 
                : 'w-2 bg-border'
            }`} 
          />
        ))}
      </div>

      {/* Color circles selection container */}
      <div className="grid grid-cols-4 gap-4 sm:gap-6 justify-center items-center max-w-md mx-auto min-h-[160px]">
        <AnimatePresence mode="popLayout">
          {availableColors.map((color: LuscherColor) => (
            <motion.button
              key={color.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectColor(color.id)}
              className="luscher-color-btn aspect-square rounded-full shadow-lg border border-white/10 hover:border-white/30 transition-all cursor-pointer relative group"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {/* Inner ring for premium look */}
              <div className="absolute inset-2 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-8 font-black">
        Выбор {stepNumber > 8 ? 8 : stepNumber} из 8
      </p>
    </div>
  );
}
