import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { EyeOff, VolumeX, ShieldAlert } from 'lucide-react';
import { CompletionRecommendation } from './CompletionRecommendation';

export function NeuroSilence() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes (120 seconds)
  const [breathState, setBreathState] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathTimer, setBreathTimer] = useState(4); // Seconds left in current breath state
  const [isFinished, setIsFinished] = useState(false);

  // Total Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsFinished(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Breath Cycle Timer
  useEffect(() => {
    if (isFinished) return;

    if (breathTimer <= 1) {
      // Transition to next state
      if (breathState === 'inhale') {
        setBreathState('hold');
        setBreathTimer(4); // 4 seconds hold
      } else if (breathState === 'hold') {
        setBreathState('exhale');
        setBreathTimer(6); // 6 seconds exhale
      } else {
        setBreathState('inhale');
        setBreathTimer(4); // 4 seconds inhale
      }
    } else {
      const timer = setTimeout(() => setBreathTimer(breathTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [breathTimer, breathState, isFinished]);

  // Format total seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getBreathLabel = () => {
    switch (breathState) {
      case 'inhale': return 'Вдох';
      case 'hold': return 'Задержка';
      case 'exhale': return 'Выдох';
    }
  };

  const getBreathScale = () => {
    switch (breathState) {
      case 'inhale': return 1.5; // Expanding
      case 'hold': return 1.5;   // Staying large
      case 'exhale': return 1.0;  // Contracting
    }
  };

  const getBreathDuration = () => {
    switch (breathState) {
      case 'inhale': return 4;
      case 'hold': return 4;
      case 'exhale': return 6;
    }
  };

  const restartSession = () => {
    setTimeLeft(120);
    setBreathState('inhale');
    setBreathTimer(4);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <div className="col-span-12 flex items-center justify-center min-h-[500px] bg-black text-white p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-2">Перезагрузка завершена</h2>
            <h3 className="text-2xl font-black uppercase tracking-tight">Миндалина спокойна</h3>
            <p className="text-sm text-neutral-400 mt-4 leading-relaxed">
              Вы успешно выполнили 2-минутную дыхательную сессию. Ваше сердцебиение нормализовалось, уровень кортизола снизился. Мозг готов к эффективной работе.
            </p>
          </div>
          <CompletionRecommendation
            sourceModuleId="silence"
            score={100}
            durationMs={120000}
            onRepeat={restartSession}
            onMenu={() => navigate('/')}
            menuLabel="На дашборд"
            className="border-neutral-800 bg-neutral-950"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="col-span-12 fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-between p-8 select-none">
      
      {/* Top info row */}
      <div className="w-full max-w-4xl flex items-center justify-between opacity-40">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Полная изоляция</span>
        </div>
        <div className="flex items-center gap-2">
          <VolumeX className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Режим тишины</span>
        </div>
      </div>

      {/* Center Breathing Circle */}
      <div className="flex flex-col items-center justify-center flex-1 space-y-12">
        <div className="relative flex items-center justify-center">
          {/* Breathing outer halo */}
          <motion.div 
            animate={{ 
              scale: getBreathScale(),
              opacity: breathState === 'hold' ? 0.3 : [0.1, 0.2, 0.1]
            }}
            transition={{ 
              duration: getBreathDuration(),
              ease: 'easeInOut'
            }}
            className="absolute w-48 h-48 rounded-full bg-primary/20 blur-xl pointer-events-none"
          />
          
          {/* Breathing main circle */}
          <motion.div 
            animate={{ 
              scale: getBreathScale() 
            }}
            transition={{ 
              duration: getBreathDuration(),
              ease: 'easeInOut'
            }}
            className="w-32 h-32 rounded-full border border-white/20 bg-neutral-900/60 flex flex-col items-center justify-center relative shadow-2xl"
          >
            <AnimatePresence mode="wait">
              <motion.span 
                key={breathState}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-black uppercase tracking-wider text-white"
              >
                {getBreathLabel()}
              </motion.span>
            </AnimatePresence>
            <span className="text-[10px] font-mono opacity-50 mt-1">{breathTimer}s</span>
          </motion.div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] opacity-40 font-black">Техника расслабления миндалины</p>
          <p className="text-neutral-400 text-[11px] max-w-xs mx-auto leading-relaxed">
            Сфокусируйтесь на дыхательном круге. Отпустите посторонние мысли.
          </p>
        </div>
      </div>

      {/* Bottom timer and exit button */}
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-3xl font-mono font-bold tracking-tight">{formatTime(timeLeft)}</p>
          <p className="text-[9px] uppercase tracking-widest opacity-35 font-bold mt-1">Осталось времени</p>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
        >
          Прервать сессию
        </button>
      </div>

    </div>
  );
}
