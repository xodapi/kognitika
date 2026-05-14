import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Volume2 } from 'lucide-react';

interface StressOverlayProps {
  isActive: boolean;
  intensity: 'none' | 'low' | 'medium' | 'high';
  children: React.ReactNode;
}

export function StressOverlay({ isActive, intensity, children }: StressOverlayProps) {
  const [glitch, setGlitch] = useState(false);
  const [jitter, setJitter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isActive || intensity === 'none') return;

    const interval = setInterval(() => {
      if (Math.random() > (intensity === 'high' ? 0.7 : intensity === 'medium' ? 0.9 : 0.95)) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 100);
      }
      
      const factor = intensity === 'high' ? 3 : intensity === 'medium' ? 1.5 : 0.5;
      setJitter({
        x: (Math.random() - 0.5) * factor,
        y: (Math.random() - 0.5) * factor,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, intensity]);

  if (intensity === 'none') return <>{children}</>;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl">
      {/* Noise layer */}
      <div className={`absolute inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]`} />
      
      {/* Flashing lights for High intensity */}
      <AnimatePresence>
        {isActive && intensity === 'high' && glitch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-destructive z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Main Content with Jitter */}
      <div 
        style={{ 
          transform: `translate(${jitter.x}px, ${jitter.y}px)`,
          filter: glitch ? 'hue-rotate(90deg) contrast(1.2)' : 'none'
        }}
        className="w-full h-full transition-transform duration-75"
      >
        {children}
      </div>

      {/* Stress Indicators */}
      {isActive && (
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {intensity === 'high' && (
             <motion.div 
               animate={{ opacity: [1, 0.5, 1] }}
               transition={{ repeat: Infinity, duration: 0.5 }}
               className="bg-destructive text-white px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 shadow-lg"
             >
               <AlertTriangle className="w-2 h-2" />
               Critical Stress
             </motion.div>
          )}
          <div className="bg-primary/20 backdrop-blur-md text-primary px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-primary/30">
            <Volume2 className="w-2 h-2" />
            Station Noise Active
          </div>
        </div>
      )}

      {/* Border glow */}
      {isActive && (
        <div className={`absolute inset-0 border-2 pointer-events-none z-50 rounded-3xl transition-colors duration-500 ${
          intensity === 'high' ? 'border-destructive/30 animate-pulse' : 
          intensity === 'medium' ? 'border-primary/20' : 'border-primary/10'
        }`} />
      )}
    </div>
  );
}
