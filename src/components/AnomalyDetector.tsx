import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, AlertOctagon, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function AnomalyDetector() {
  const [gameState, setGameState] = useState<'idle' | 'scanning' | 'anomaly' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [anomaliesFound, setAnomaliesFound] = useState(0);
  const [nextAnomalyTime, setNextAnomalyTime] = useState(0);
  const [chartData, setChartData] = useState<number[]>(Array(50).fill(50));
  const [timeLeft, setTimeLeft] = useState(60);
  const { token, refreshUser } = useAuth();
  
  const gameInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  const startGame = () => {
    setGameState('scanning');
    setScore(0);
    setAnomaliesFound(0);
    setTimeLeft(60);
    startTime.current = Date.now();
    scheduleNextAnomaly();
  };

  const scheduleNextAnomaly = () => {
    const delay = 2000 + Math.random() * 4000;
    setNextAnomalyTime(Date.now() + delay);
  };

  const handleDetection = () => {
    if (gameState === 'anomaly') {
      const reactionTime = Date.now() - (nextAnomalyTime);
      const points = Math.max(10, 100 - Math.floor(reactionTime / 10));
      setScore(s => s + points);
      setAnomaliesFound(a => a + 1);
      setGameState('scanning');
      scheduleNextAnomaly();
    } else {
      // False positive
      setScore(s => Math.max(0, s - 50));
    }
  };

  const finishGame = useCallback(() => {
    setGameState('finished');
    if (gameInterval.current) clearInterval(gameInterval.current);
    
    if (token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'ANOMALY_DETECTOR',
          score,
          timeMs: 60000,
          isCompleted: true,
          metadata: { anomaliesFound }
        })
      })
      .then(() => refreshUser())
      .catch(err => console.error(err));
    }
  }, [score, anomaliesFound, token, refreshUser]);

  useEffect(() => {
    if (gameState === 'scanning' || gameState === 'anomaly') {
      gameInterval.current = setInterval(() => {
        setChartData(prev => {
          const newData = [...prev.slice(1)];
          let val = 45 + Math.random() * 10;
          if (gameState === 'anomaly') {
             val = Math.random() > 0.5 ? 90 + Math.random() * 10 : 5 + Math.random() * 10;
          }
          newData.push(val);
          return newData;
        });

        setTimeLeft(t => {
          if (t <= 1) {
            finishGame();
            return 0;
          }
          return t - 0.1;
        });

        if (gameState === 'scanning' && Date.now() >= nextAnomalyTime) {
          setGameState('anomaly');
        }
      }, 100);
    }
    return () => { if (gameInterval.current) clearInterval(gameInterval.current); };
  }, [gameState, nextAnomalyTime, finishGame]);

  if (gameState === 'idle') {
    return (
      <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] gap-8 p-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden">
           <Activity className="w-10 h-10 text-primary" />
           <motion.div 
             animate={{ x: [-40, 40] }} 
             transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
             className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-full" 
           />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Детектор аномалий</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Следите за показаниями приборов. При возникновении резкого скачка или аномалии на графике — немедленно нажмите <b>КРАСНУЮ КНОПКУ</b>.
          </p>
          <button onClick={startGame} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
            Активировать мониторинг
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
     return (
       <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
         <ShieldCheck className="w-16 h-16 text-green-500 mb-6" />
         <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Отчет о дежурстве</h2>
         <div className="text-6xl font-black mb-2 text-primary">{score}</div>
         <div className="text-[10px] text-muted-foreground uppercase font-black mb-8">АНОМАЛИЙ ПРЕДОТВРАЩЕНО: {anomaliesFound}</div>
         <button onClick={() => setGameState('idle')} className="px-8 py-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold">
            В систему
         </button>
       </div>
     );
  }

  return (
    <div className="col-span-12 h-full flex flex-col p-8">
      {/* HUD Header */}
      <div className="flex justify-between items-end mb-8 border-b border-border pb-4">
        <div>
           <div className="text-[8px] text-muted-foreground uppercase font-black tracking-[0.3em]">System Monitoring</div>
           <div className="text-2xl font-mono font-black text-primary">SCANNING_ACTIVE</div>
        </div>
        <div className="text-right">
           <div className="text-[8px] text-muted-foreground uppercase font-black tracking-[0.3em]">Operation Time</div>
           <div className="text-2xl font-mono font-black">{timeLeft.toFixed(1)}s</div>
        </div>
      </div>

      {/* Main Radar Screen */}
      <div className="flex-1 bg-black/40 rounded-[2rem] border border-border p-8 relative overflow-hidden flex flex-col">
         {/* Grid lines */}
         <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10 pointer-events-none">
            {Array(24).fill(0).map((_, i) => <div key={i} className="border border-primary/20" />)}
         </div>

         {/* Waveform Visualization */}
         <div className="flex-1 flex items-end gap-[2px] pb-12">
            {chartData.map((val, i) => (
              <motion.div 
                key={i}
                initial={false}
                animate={{ height: `${val}%` }}
                className={`flex-1 min-w-[4px] rounded-full transition-colors duration-300 ${
                  gameState === 'anomaly' && i > 40 ? 'bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-primary/40'
                }`}
              />
            ))}
         </div>

         {/* Scanning line */}
         <motion.div 
           animate={{ left: ['0%', '100%'] }}
           transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
           className="absolute top-0 bottom-0 w-[1px] bg-primary/30 z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
         />

         {/* Anomaly UI Elements */}
         <AnimatePresence>
            {gameState === 'anomaly' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-destructive text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl z-20"
              >
                <AlertOctagon className="w-6 h-6 animate-pulse" />
                Anomaly Detected
              </motion.div>
            )}
         </AnimatePresence>

         <div className="absolute bottom-8 left-8">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Score</div>
            <div className="text-3xl font-black font-mono">{score.toString().padStart(6, '0')}</div>
         </div>
      </div>

      {/* Control Panel */}
      <div className="mt-8 flex justify-center">
         <button 
           onMouseDown={handleDetection}
           className="group relative w-24 h-24 sm:w-32 sm:h-32 bg-destructive/10 rounded-full border-4 border-destructive/30 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
         >
            <div className="absolute inset-2 bg-destructive rounded-full shadow-inner flex items-center justify-center overflow-hidden">
               <Zap className="w-10 h-10 text-white fill-current" />
               <motion.div 
                 animate={{ opacity: [0.1, 0.3, 0.1] }}
                 transition={{ repeat: Infinity, duration: 1 }}
                 className="absolute inset-0 bg-white"
               />
            </div>
            <div className="absolute -inset-4 border border-destructive/20 rounded-full animate-ping pointer-events-none" />
         </button>
      </div>
    </div>
  );
}
