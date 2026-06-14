import { motion } from 'motion/react';
import { useDispatcherEngine } from '../hooks/useDispatcherEngine';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { Cpu, ChevronRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';

export function AsyncDispatcher() {
  const { state, startGame, triggerStream } = useDispatcherEngine();
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.isFinished && token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'ASYNC_DISPATCHER',
          timeMs: state.timeMs,
          metadata: { score: state.score, level: state.level, triggers: state.totalTriggers, overflows: state.totalOverflows },
        }),
      }).catch(() => {});
    }
  }, [state.isFinished, token]);

  // Intro
  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-6">
            <Cpu className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Асинхронный диспетчер</h2>
          <p className="text-sm text-muted-foreground mb-2 max-w-md">
            Несколько потоков заполняются одновременно. Нажимай на поток, когда его прогресс входит в жёлтую зону (70–88%). Переполнение штрафует, ранний триггер — тоже.
          </p>
          <p className="text-xs text-amber-400 font-mono mb-8">Тренирует: разделённое внимание · периферийное зрение · управление многозадачностью</p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[1, 2, 3].map(lvl => (
              <button
                key={lvl}
                onClick={() => startGame(lvl)}
                className={`px-6 py-3 rounded-xl text-xs uppercase font-bold transition-colors ${
                  lvl === 1 ? 'bg-amber-600 text-white hover:bg-amber-500' :
                  lvl === 2 ? 'bg-orange-600 text-white hover:bg-orange-500' :
                  'bg-red-600 text-white hover:bg-red-500'
                }`}
              >
                Уровень {lvl} — {['2 потока', '3 потока', '4 потока'][lvl - 1]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Result
  if (state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-3 lg:col-span-8 flex flex-col items-center gap-4">
          <PostGameInsight
            gameType="ASYNC_DISPATCHER"
            score={state.score}
            timeMs={state.timeMs}
            errors={state.totalOverflows}
            onPlayAgain={() => startGame(state.level)}
            onBackToMenu={() => navigate('/')}
          />
          {state.score >= 80 && state.level < 3 && (
            <button onClick={() => startGame(state.level + 1)} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-500 transition-colors">
              Уровень {state.level + 1} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active game
  const timeLeft = Math.max(0, state.sessionDurationMs - state.timeMs);

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
      <div className="lg:col-start-1 lg:col-span-12 flex flex-col gap-4 h-full">
        {/* HUD */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Счёт</div>
            <div className="text-2xl font-black text-amber-400">{state.score}</div>
          </div>
          <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Триггеров</div>
            <div className="text-2xl font-black">{state.totalTriggers}</div>
          </div>
          <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Переполнений</div>
            <div className="text-2xl font-black text-red-400">{state.totalOverflows}</div>
          </div>
          <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Осталось</div>
            <div className="text-2xl font-black font-mono">{(timeLeft / 1000).toFixed(0)}с</div>
          </div>
        </div>

        {/* Streams */}
        <div className="flex-1 grid grid-cols-1 gap-4 content-center">
          {state.streams.map(stream => {
            const inZone = stream.progress >= stream.targetZoneMin && stream.progress <= stream.targetZoneMax;
            const isOverflow = stream.status === 'overflow';

            return (
              <motion.button
                key={stream.id}
                onClick={() => triggerStream(stream.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`relative bg-card/40 border rounded-2xl p-5 text-left transition-all overflow-hidden ${
                  inZone ? 'border-amber-500/70 ring-1 ring-amber-500/30' :
                  isOverflow ? 'border-red-500/70' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stream.color }} />
                    <span className="text-xs font-bold font-mono">{stream.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {inZone && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      >
                        <Zap className="w-4 h-4 text-amber-400" />
                      </motion.div>
                    )}
                    <span className="text-xs font-mono text-muted-foreground">{Math.round(stream.progress)}%</span>
                  </div>
                </div>

                {/* Progress bar track */}
                <div className="relative w-full h-6 bg-secondary rounded-lg overflow-hidden">
                  {/* Target zone highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-amber-500/20 border-x border-amber-500/40"
                    style={{
                      left: `${stream.targetZoneMin}%`,
                      width: `${stream.targetZoneMax - stream.targetZoneMin}%`,
                    }}
                  />
                  {/* Progress fill */}
                  <motion.div
                    className="absolute top-0 left-0 bottom-0 rounded-lg transition-none"
                    style={{
                      width: `${Math.min(stream.progress, 100)}%`,
                      backgroundColor: isOverflow ? '#ef4444' : inZone ? '#f59e0b' : stream.color,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">0</span>
                  <span className="text-[9px] text-amber-400 font-bold">ЗОНА {stream.targetZoneMin}–{stream.targetZoneMax}%</span>
                  <span className="text-[9px] text-red-400">100</span>
                </div>

                {isOverflow && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-red-500/10 flex items-center justify-center rounded-2xl"
                  >
                    <span className="text-red-400 font-black text-sm uppercase tracking-widest">ПЕРЕПОЛНЕНИЕ</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Кликай на поток когда прогресс в жёлтой зоне · Используй периферийное зрение
          </p>
        </div>
      </div>
    </div>
  );
}
