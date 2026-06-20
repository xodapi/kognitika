import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, Zap, Target, RefreshCw, Trophy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { emitEvent } from '../hooks/useEventBus';
import { useSessionRecording } from '../hooks/useSessionRecording';

import { useTypingEngine } from '../hooks/useTypingEngine';
import { CompletionRecommendation } from './CompletionRecommendation';

const TEXTS = [
  "Цифровая трансформация железных дорог требует высокого уровня когнитивной гибкости и скорости принятия решений в условиях неопределенности.",
  "Система управления движением поездов базируется на строгом соблюдении графиков и мгновенном реагировании на любые отклонения от нормы.",
  "Когнитивный аудит персонала позволяет выявить скрытые резервы эффективности и снизить вероятность ошибок, вызванных человеческим фактором.",
  "Интеграция искусственного интеллекта в процессы планирования перевозок оптимизирует логистические цепочки и повышает общую пропускную способность сети.",
  "Безопасность на транспорте является приоритетной задачей, решение которой невозможно без постоянного совершенствования профессиональных навыков сотрудников.",
  "Оператор сложной системы удерживает в памяти несколько потоков событий и переключает внимание без потери качества решений.",
  "Короткая пауза перед ответом снижает число ошибок, помогает заметить противоречия и возвращает контроль над автоматическими реакциями.",
  "Точная формулировка задачи экономит время команды, потому что уменьшает шум, лишние уточнения и случайные интерпретации.",
  "Регулярная тренировка внимания похожа на настройку прибора: маленькие повторения постепенно делают реакцию устойчивее.",
  "Когда данные меняются быстро, полезно сначала выделить сигнал, затем проверить источник и только после этого принимать решение."
];

const integerFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export function formatTypingCpm(value: number) {
  return integerFormatter.format(value);
}

export function formatTypingAccuracy(value: number) {
  return percentFormatter.format(value);
}

export function SpeedTyping() {
  const { state, startTest, handleInput } = useTypingEngine(TEXTS);
  const { text, userInput, isFinished, cpm, accuracy, errors, isActive } = state;
  const { token } = useAuth();
  const displayCpm = formatTypingCpm(cpm);
  const displayAccuracy = formatTypingAccuracy(accuracy);
  
  useSessionRecording(isActive, isFinished);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInput(e.target.value);
  };

  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-4">
      {/* Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="bg-card/40 border border-border rounded-2xl p-4 flex flex-col gap-4 flex-1">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Статистика</h3>
          
          <div className="space-y-4">
            <div className="bg-background/50 rounded-xl p-3 border border-border">
              <p className="text-[8px] text-muted-foreground uppercase font-black mb-1">Скорость (CPM)</p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xl font-black tabular-nums">{displayCpm}</span>
              </div>
            </div>

            <div className="bg-background/50 rounded-xl p-3 border border-border">
              <p className="text-[8px] text-muted-foreground uppercase font-black mb-1">Точность</p>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xl font-black tabular-nums">{displayAccuracy}%</span>
              </div>
            </div>

            <div className="bg-background/50 rounded-xl p-3 border border-border">
              <p className="text-[8px] text-muted-foreground uppercase font-black mb-1">Ошибки</p>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xl font-black tabular-nums text-destructive">{errors}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={startTest} 
            className="mt-auto w-full px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Начать заново
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-9 flex flex-col gap-4">
        <div className="bg-card/20 border border-border rounded-3xl p-6 sm:p-8 flex-1 flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!isActive && !isFinished ? (
              <motion.div 
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center gap-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Keyboard className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-2">Скоростная печать</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Проверьте свою скорость набора текста и точность. Используйте профессиональную терминологию для погружения в контекст.
                  </p>
                </div>
                <button 
                  onClick={startTest}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  Запустить тест
                </button>
              </motion.div>
            ) : isFinished ? (
              <motion.div 
                key="finished"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center gap-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                  <Trophy className="w-10 h-10 text-primary" />
                  <motion.div 
                    className="absolute inset-0 border-2 border-primary rounded-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-2">Тест завершен!</h2>
                  <div className="flex gap-8 mt-4">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Скорость</p>
                      <p className="text-3xl font-black text-primary">{displayCpm} <span className="text-xs">CPM</span></p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Точность</p>
                      <p className="text-3xl font-black text-primary">{displayAccuracy}%</p>
                    </div>
                  </div>
                </div>
                <CompletionRecommendation
                  sourceModuleId="typing"
                  score={cpm}
                  accuracy={accuracy}
                  errors={errors}
                  onRepeat={startTest}
                  className="max-w-3xl"
                />
              </motion.div>
            ) : (
              <motion.div 
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col gap-6"
              >
                <div className="relative p-6 bg-background/50 rounded-2xl border border-border min-h-[120px] text-lg leading-relaxed font-medium select-none">
                  {text.split('').map((char, i) => {
                    let color = 'text-muted-foreground';
                    if (i < userInput.length) {
                      color = userInput[i] === text[i] ? 'text-primary' : 'text-destructive underline decoration-2';
                    }
                    return <span key={i} className={color}>{char}</span>;
                  })}
                  {isActive && (
                    <motion.span 
                      className="inline-block w-0.5 h-6 bg-primary ml-0.5 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </div>

                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={onInputChange}
                  className="w-full bg-secondary/30 border border-border rounded-2xl p-6 text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-32"
                  placeholder="Начинайте печатать здесь..."
                  spellCheck={false}
                />

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <div className="flex gap-4">
                    <span>Символов: {userInput.length} / {text.length}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className={accuracy < 90 ? 'text-destructive' : 'text-primary'}>Качество: {accuracy}%</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
