import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguageScannerEngine } from '../hooks/useLanguageScannerEngine';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Brain, 
  EyeOff, 
  UserX, 
  Split, 
  BoxSelect, 
  Play, 
  Info,
  Timer,
  AlertCircle
} from 'lucide-react';

export const LanguageScanner: React.FC = () => {
  const engine = useLanguageScannerEngine();
  const { state, startScan, flagCard } = engine;

  React.useEffect(() => {
    engine.startGame(1, 123);
  }, []);

  // Instruction Phase
  if (state.phase === 'memorize') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] sm:min-h-screen py-4 sm:py-6 px-4 sm:px-6 text-center bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full space-y-6"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <Shield className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">База Знаний: {state.domain}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {state.rules.map((rule, idx) => {
              const [title, desc] = rule.text.includes(': ') 
                ? rule.text.split(': ') 
                : rule.text.split(' — ');
              const icons = {
                'Газлайтинг': EyeOff,
                'Чучело': BoxSelect,
                'Ad Hominem': UserX,
                'Ложная дилемма': Split,
                'Дилемма': Split,
                'Emotional Loading': AlertCircle,
                'Moral Superiority': Shield,
                'Vagueness': EyeOff,
                'Bias Confirmation': CheckCircle,
                'Противоречие': XCircle,
                'Фабрикация': BoxSelect,
                'Логический дрейф': Split
              };
              const colors = {
                'Газлайтинг': 'text-purple-600 bg-purple-50',
                'Чучело': 'text-amber-600 bg-amber-50',
                'Ad Hominem': 'text-rose-600 bg-rose-50',
                'Дилемма': 'text-blue-600 bg-blue-50',
                'Ложная дилемма': 'text-blue-600 bg-blue-50',
              };
              
              const Icon = (icons as any)[title] || Info;
              const colorClass = (colors as any)[title] || 'text-slate-600 bg-slate-50';

              return (
                <div key={idx} className="p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colorClass.split(' ')[0]}`} />
                    <span className="font-black text-xs sm:text-sm uppercase tracking-tight">{title}</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug font-medium">{desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold">
             Задача: Распознать эти приемы в реальных сообщениях.
          </div>

          <button
            onClick={startScan}
            className="w-full group relative flex items-center justify-center gap-3 rounded-xl sm:rounded-2xl bg-emerald-500 px-6 py-4 sm:px-8 sm:py-5 text-lg sm:text-xl font-black text-white shadow-xl shadow-emerald-100 transition-all hover:bg-emerald-600 active:scale-95"
          >
            <Play className="h-6 w-6 fill-current" />
            ВСЁ ПОНЯТНО, В БОЙ
          </button>
        </motion.div>
      </div>
    );
  }

  // Active Scan Phase
  return (
    <div className="relative flex flex-col min-h-[500px] sm:min-h-[600px] h-full bg-slate-50 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header HUD */}
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg text-emerald-600 text-xs font-black uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            Active Scan
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-slate-500 text-xs font-bold tabular-nums">
            <Timer className="w-3.5 h-3.5" />
            {(state.timeMs / 1000).toFixed(1)}s
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Core Integrity</div>
          <div className="flex gap-1">
            {[1, 2, 3].map((heart) => (
              <div 
                key={heart} 
                className={`w-3 h-3 rounded-sm transform rotate-45 ${heart <= 3 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Scanner Window */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
        <AnimatePresence mode="wait">
          {state.activeCard && (
            <motion.div
              key={state.activeCard.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, rotate: -2 }}
              className="w-full max-w-xl z-10"
            >
              <div className="relative p-4 sm:p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                <blockquote className="text-base sm:text-xl md:text-2xl font-bold text-slate-800 leading-snug mb-4 sm:mb-8 text-center italic">
                  "{state.activeCard.text}"
                </blockquote>

                {/* Card Progress */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: state.cardDurationMs / 1000, ease: "linear" }}
                    className="h-full bg-emerald-500"
                  />
                </div>


              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Footer */}
      <div className="px-4 py-4 sm:px-6 sm:py-8 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto mb-4 sm:mb-6">
          {state.rules.map((rule) => {
            const label = rule.text.includes(':') ? rule.text.split(':')[0] : rule.text.split('—')[0];
            const icons = {
              'Газлайтинг': EyeOff,
              'Чучело': BoxSelect,
              'Ad Hominem': UserX,
              'Ложная дилемма': Split,
              'Дилемма': Split,
              'Emotional Loading': AlertCircle,
              'Moral Superiority': Shield,
              'Vagueness': EyeOff,
              'Bias Confirmation': CheckCircle,
              'Противоречие': XCircle,
              'Фабрикация': BoxSelect,
              'Логический дрейф': Split
            };
            const colors = {
              'Газлайтинг': 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100',
              'Чучело': 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100',
              'Ad Hominem': 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-100',
              'Дилемма': 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100',
              'Ложная дилемма': 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100',
            };
            
            const Icon = (icons as any)[label] || Info;
            const colorClass = (colors as any)[label] || 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-100';

            return (
              <button
                key={rule.id}
                onClick={() => flagCard(rule.id)}
                disabled={!!state.lastFeedback}
                className={`flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border-2 p-2 sm:p-4 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 ${colorClass}`}
              >
                <Icon className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                <span className="text-[11px] sm:text-sm md:text-base font-black uppercase tracking-tight leading-tight text-center">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => flagCard(0)}
            disabled={!!state.lastFeedback}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl sm:rounded-2xl border-2 border-slate-200 bg-slate-50 p-3.5 sm:p-5 text-base sm:text-xl font-black text-slate-600 transition-all hover:bg-slate-100 hover:border-slate-300 active:scale-[0.98] disabled:opacity-30"
          >
            <CheckCircle className="h-6 w-6 text-emerald-500" />
            НЕТ МАНИПУЛЯЦИИ
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-8 text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Semantic Scanner v2.0
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sync Stable
          </div>
        </div>
      </div>

      {/* Explanation Overlay */}
      <AnimatePresence>
        {state.lastFeedback && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-6 bg-white/95 rounded-3xl text-center overflow-hidden"
          >
            <div className="overflow-y-auto w-full max-h-full py-4 px-2 scrollbar-hide flex flex-col items-center">
              <div className="my-auto flex flex-col items-center space-y-4 w-full">
                <div className={`p-3 rounded-full w-fit ${state.lastFeedback.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {state.lastFeedback.isCorrect ? (
                    <CheckCircle className="w-8 h-8" />
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}
                </div>
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${state.lastFeedback.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {state.lastFeedback.isCorrect ? 'ВЕРНО!' : 'ОШИБКА!'}
                </h3>
                <p className="text-slate-600 font-semibold leading-relaxed text-sm sm:text-base max-w-md">
                  {state.lastFeedback.explanation}
                </p>
                
                {!state.lastFeedback.isCorrect && (
                  <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-slate-600 text-[10px] sm:text-xs font-black uppercase tracking-wider inline-block">
                    Это был: {state.lastFeedback.correctRuleName}
                  </div>
                )}

                <div className="pt-2">
                   <button 
                     onClick={() => flagCard(0)} 
                     className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-slate-200"
                   >
                     Понятно
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
