import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDecryptorEngine } from '../hooks/useDecryptorEngine';
import { Cpu, Terminal, CheckCircle2, XCircle, Brain, Layers, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

export const Decryptor: React.FC = () => {
  const { state, startGame, handleAnswer } = useDecryptorEngine();

  if (state.phase === 'memorize') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-900 text-white rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0,transparent_100%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Layers className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-bold tracking-tight">Когнитивный щит: Декриптор</h2>
          </div>
          <p className="text-slate-400">Изучите типы искажений реальности. Отделите факты от эмоционального шума.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10 w-full max-w-2xl mb-8">
          {state.rules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-colors"
            >
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                  {rule.id}
                </span>
                <p className="text-sm text-slate-200 leading-relaxed">{rule.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="z-10 text-center">
          <div className="text-5xl font-black text-purple-500 mb-4 tabular-nums">
            {state.memorizeTimeLeft}
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Инициализация дешифратора...</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'result') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 bg-slate-900 text-white rounded-2xl border border-purple-500/30 shadow-2xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Brain className="w-16 h-16 text-purple-500 mx-auto mb-6" />
          <h2 className="text-4xl font-black mb-2">Анализ завершен</h2>
          <div className="text-6xl font-black text-purple-400 mb-8">{state.score} XP</div>
          
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="text-center">
              <div className="text-sm text-slate-500 uppercase mb-1">Точность</div>
              <div className="text-2xl font-bold text-green-400">{state.hits}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 uppercase mb-1">Ошибки</div>
              <div className="text-2xl font-bold text-red-400">{state.misses}</div>
            </div>
          </div>

          <button
            onClick={() => startGame(state.level)}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/25"
          >
            НОВЫЙ ЦИКЛ
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Background Matrix Effect */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none overflow-hidden">
         <div className="grid grid-cols-12 gap-1 text-[8px] leading-none text-purple-500">
           {Array.from({ length: 120 }).map((_, i) => (
             <div key={i}>{Math.random() > 0.5 ? '1' : '0'}</div>
           ))}
         </div>
      </div>

      {/* Header HUD */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-md text-purple-400 text-xs font-bold uppercase tracking-widest">
            <Terminal className="w-3 h-3" />
            Decoding Stream
          </div>
          <div className="text-xs text-slate-500 uppercase font-mono">
            Entropy: <span className="text-slate-200">High</span>
          </div>
        </div>
        <div className="text-xl font-bold text-purple-500 tabular-nums font-mono">
          {(state.timeMs / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
        <AnimatePresence mode="wait">
          {state.activeCard && (
            <motion.div
              key={state.activeCard.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full max-w-3xl"
            >
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                 
                 <div className="mb-4 flex items-center gap-2 text-[10px] text-purple-400 font-black uppercase tracking-widest opacity-60">
                    <Cpu className="w-3 h-3" /> Encrypted Data Input
                 </div>

                 <p className="text-2xl font-medium text-slate-100 leading-relaxed italic mb-8">
                   "{state.activeCard.text}"
                 </p>

                 <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      className="h-full bg-purple-500/50"
                      transition={{ duration: 0.5 }}
                    />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl z-10">
          {state.options.map((opt, idx) => (
            <motion.button
              key={opt}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.1 }}
              onClick={() => handleAnswer(opt)}
              className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-purple-500/50 hover:bg-slate-800 transition-all active:scale-95 flex flex-col justify-between"
            >
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-4 flex items-center justify-between">
                Core Fact 0{idx + 1}
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </div>
              <p className="text-sm font-bold text-slate-200 group-hover:text-white leading-snug">
                {opt}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex justify-between">
        <span>Sublayer Analysis v2.0</span>
        <span>Secure Cognitive Core</span>
      </div>
    </div>
  );
};
