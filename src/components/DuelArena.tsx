import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Shield, Zap, Target, Activity, AlertCircle, Trophy, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSchulteEngine } from '../hooks/useSchulteEngine';
import { connectSocket, socket } from '../lib/socket';
import { LeagueBadge } from './LeagueBadge';

interface Opponent {
  id: string;
  name: string;
  rating: number;
}

interface DuelArenaProps {
  roomId: string;
  opponent: Opponent;
  onFinish: (result: 'win' | 'loss' | 'draw') => void;
  onClose: () => void;
}

export const DuelArena: React.FC<DuelArenaProps> = ({ roomId, opponent, onFinish, onClose }) => {
  const { user, token } = useAuth();
  const { state, startGame, clickCell } = useSchulteEngine(5, 'classic');
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [isGameReady, setIsGameReady] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [result, setResult] = useState<'win' | 'loss' | 'draw' | null>(null);

  useEffect(() => {
    if (!token) return;

    connectSocket(token);
    socket.emit('duel:join', { roomId });

    socket.on('duel:opponent-progress', (data: { progress: number }) => {
      setOpponentProgress(data.progress);
    });

    return () => {
      socket.off('duel:opponent-progress');
    };
  }, [roomId, token]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsGameReady(true);
      startGame();
    }
  }, [countdown, startGame]);

  useEffect(() => {
    if (state.isActive) {
      const progress = (state.expectedIndex / state.expectedSequence.length) * 100;
      socket.emit('duel:progress', { roomId, progress });
    }
  }, [state.expectedIndex, state.expectedSequence.length, state.isActive, roomId]);

  useEffect(() => {
    if (state.isFinished && !gameEnded) {
      setGameEnded(true);
      if (opponentProgress < 100) {
        setResult('win');
      } else {
        setResult('draw');
      }
    }
  }, [state.isFinished, opponentProgress, gameEnded]);

  useEffect(() => {
    if (opponentProgress >= 100 && !state.isFinished && !gameEnded) {
      setGameEnded(true);
      setResult('loss');
    }
  }, [opponentProgress, state.isFinished, gameEnded]);

  const myProgress = (state.expectedIndex / (state.expectedSequence.length || 1)) * 100;

  return (
    <div className="fixed inset-0 z-[120] bg-background flex flex-col overflow-hidden">
      {/* Header HUD */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black border border-primary/20">
            {user?.pseudonym?.[0] || 'Y'}
          </div>
          <div className="flex-1 max-w-[200px]">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Твой Прогресс</span>
              <span className="text-[10px] font-mono text-muted-foreground">{Math.round(myProgress)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                animate={{ width: `${myProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center px-8">
           <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">vs</div>
           <Sword className="w-5 h-5 text-destructive animate-pulse" />
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="flex-1 max-w-[200px] text-right">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-mono text-muted-foreground">{Math.round(opponentProgress)}%</span>
              <span className="text-[10px] font-black uppercase text-destructive tracking-widest">Противник</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-destructive shadow-[0_0_10px_rgba(var(--destructive-rgb),0.5)]"
                animate={{ width: `${opponentProgress}%` }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive font-black border border-destructive/20">
            {opponent.name[0]}
          </div>
        </div>
      </div>

      {/* Main Arena Area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        <AnimatePresence>
          {countdown > 0 && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute z-20 text-[12rem] font-black text-primary italic drop-shadow-2xl"
            >
              {countdown}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`transition-all duration-700 ${countdown > 0 ? 'blur-2xl opacity-20 scale-95 pointer-events-none' : 'blur-0 opacity-100 scale-100'}`}>
          <div className="grid gap-2 w-full max-w-[500px]" style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}>
            {state.grid.map((cell, idx) => (
              <motion.button
                key={cell.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                onClick={() => clickCell(cell, idx, undefined, () => {}, () => {})}
                className="aspect-square bg-card border border-border flex items-center justify-center font-black text-2xl hover:border-primary transition-all shadow-sm"
              >
                {cell.num}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Action Indicators */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-12 pointer-events-none">
           <AnimatePresence>
             {state.errors > 0 && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-destructive">
                 <AlertCircle className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase">Ошибка!</span>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Results Overlay */}
      <AnimatePresence>
        {gameEnded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-card border border-border rounded-[3rem] p-10 text-center shadow-2xl"
            >
              <div className="flex justify-center mb-6">
                {result === 'win' ? (
                  <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/20">
                    <Trophy className="w-10 h-10 text-yellow-900" />
                  </div>
                ) : result === 'loss' ? (
                  <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center border border-destructive/20">
                    <Shield className="w-10 h-10 text-destructive" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center">
                    <Activity className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">
                {result === 'win' ? 'Победа!' : result === 'loss' ? 'Поражение' : 'Ничья'}
              </h2>
              <p className="text-muted-foreground mb-8">
                {result === 'win' 
                  ? 'Отличный результат! Твоя когнитивная скорость выше, чем у противника.' 
                  : 'Противник оказался быстрее в этот раз. Продолжай тренироваться!'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="bg-secondary/30 p-4 rounded-2xl border border-border">
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Твое время</span>
                  <span className="text-xl font-mono font-black text-foreground">{(state.timeMs / 1000).toFixed(2)}s</span>
                </div>
                <div className="bg-secondary/30 p-4 rounded-2xl border border-border">
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Награда</span>
                  <span className="text-xl font-mono font-black text-primary">+{result === 'win' ? 25 : 5} XP</span>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Вернуться в лобби
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
