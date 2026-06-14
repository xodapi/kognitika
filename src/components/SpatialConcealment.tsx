import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid3x3, Target, Trophy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { emitEvent } from '../hooks/useEventBus';
import { useSessionRecording } from '../hooks/useSessionRecording';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { CompletionRecommendation } from './CompletionRecommendation';

const logger = createSafeLogger('spatial-concealment');

type Cell = {
  id: number;
  isActive: boolean;
  isRevealed: boolean;
  isCorrect: boolean;
};

import { useSpatialEngine } from '../hooks/useSpatialEngine';

export function SpatialConcealment() {
  const { state, startTraining, handleCellClick } = useSpatialEngine();
  const { level, gridSize, activeCount, grid, phase, score, errors } = state;
  const { token } = useAuth();
  const MEMORIZE_SECS = 3; // matches useSpatialEngine memorize duration
  
  useSessionRecording(phase !== 'idle' && phase !== 'result', phase === 'result');

  useEffect(() => {
    if (phase === 'result') {
      if (token) {
        fetch('/api/game/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            gameType: 'SPATIAL_CONCEALMENT',
            timeMs: 1000,
            metadata: { level, score, errors }
          })
        }).catch(err => logger.error('Session save failed', { error: safeError(err), gameType: 'SPATIAL_CONCEALMENT' }));
      }
    }
  }, [phase, level, score, errors, token]);

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-4">
      {/* Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="bg-card/40 border border-border rounded-2xl p-4 flex flex-col gap-4 flex-1">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Прогресс</h3>
          
          <div className="space-y-4">
            <div className="bg-background/50 rounded-xl p-3 border border-border">
              <p className="text-[8px] text-muted-foreground uppercase font-black mb-1">Уровень</p>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xl font-black tabular-nums">{level}</span>
              </div>
            </div>

            <div className="bg-background/50 rounded-xl p-3 border border-border">
              <p className="text-[8px] text-muted-foreground uppercase font-black mb-1">Счет</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-xl font-black tabular-nums">{score}</span>
              </div>
            </div>

            {phase === 'memorize' && (
              <div className="bg-primary/10 rounded-xl p-3 border border-primary/30">
                <p className="text-[8px] text-primary uppercase font-black mb-1">Запоминание</p>
                <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden mt-2">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: MEMORIZE_SECS, ease: 'linear' }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={startTraining} 
            className="mt-auto w-full px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Начать заново
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-9 flex flex-col gap-4">
        <div className="bg-card/20 border border-border rounded-3xl p-6 sm:p-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {phase === 'idle' ? (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center text-center gap-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Grid3x3 className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-2">Пространство скрыто</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Запомните расположение активных ячеек и воспроизведите их после того, как они исчезнут.
                  </p>
                </div>
                <button 
                  onClick={startTraining}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  Начать тренировку
                </button>
              </motion.div>
            ) : phase === 'result' ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                  <EyeOff className="w-10 h-10 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-destructive">Ошибка!</h2>
                  <p className="text-sm text-muted-foreground">Вы достигли уровня {level}</p>
                  <p className="text-4xl font-black mt-4">{score} <span className="text-xs uppercase text-muted-foreground">очков</span></p>
                </div>
                <CompletionRecommendation
                  sourceModuleId="spatial"
                  score={score}
                  errors={errors}
                  onRepeat={startTraining}
                  repeatLabel="Попробовать снова"
                  className="max-w-3xl"
                />
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-8 w-full"
              >
                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                  {phase === 'memorize' ? (
                    <>
                      <Eye className="w-4 h-4 text-primary animate-pulse" />
                      <span>Запомните ячейки: {activeCount}</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      <span>Воспроизведите паттерн</span>
                    </>
                  )}
                </div>

                <div 
                  className="grid gap-2 w-full max-w-[400px] aspect-square"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                >
                  {grid.map((cell) => (
                    <motion.button
                      key={cell.id}
                      onClick={() => handleCellClick(cell.id)}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        aspect-square rounded-xl border transition-all duration-300
                        ${phase === 'memorize' && cell.isActive ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-card border-border'}
                        ${phase === 'recall' && cell.isRevealed ? (cell.isCorrect ? 'bg-primary border-primary' : 'bg-destructive border-destructive') : ''}
                        ${phase === 'recall' && !cell.isRevealed ? 'hover:border-primary/50 cursor-pointer' : ''}
                      `}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
