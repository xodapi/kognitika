import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSchulteEngine, CellValue, GameMode } from '../hooks/useSchulteEngine';
import { useAudioDistraction } from '../hooks/useAudioDistraction';
import { useAuth } from '../hooks/useAuth';

function generateChaosStyle() {
  return {
    opacity: 0.8 + Math.random() * 0.2,
    transform: `rotate(${Math.random() * 2 - 1}deg)`,
  };
}

export function SchulteGrid() {
  const [distraction, setDistraction] = useState<'none' | 'audio' | 'visual' | 'chaos'>('none');
  const { state, startGame, stopGame, resetGame, clickCell, setSettings } = useSchulteEngine(5, 'classic', distraction);
  const { token } = useAuth();
  
  const size = state.size;
  const mode = state.mode;

  useAudioDistraction(distraction, state.isActive);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (state.isActive && (distraction === 'visual' || distraction === 'chaos')) {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [state.isActive, distraction]);

  useEffect(() => {
     if (state.isFinished && state.timeMs > 0 && token) {
        fetch('/api/game/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({
              gameType: 'SCHULTE',
              timeMs: state.timeMs,
              metadata: { mode, size, distraction, errors: state.errors }
           })
        }).catch(err => console.error('Failed to save session', err));
     }
  }, [state.isFinished, state.timeMs, token, mode, size, distraction, state.errors]);

  const handleSuccess = () => {
     if (navigator.vibrate) navigator.vibrate(15);
  };
  const handleError = () => {
     if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
  };

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-4">
        
        {/* Settings column */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto lg:h-full">
          <div className="bg-card/40 border border-border rounded-2xl p-4 flex flex-col gap-4 flex-1">
            <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Настройки</h3>
            
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-2 block">Размер таблицы ({size}x{size})</label>
              <input type="range" min="3" max="7" value={size} onChange={e => setSettings(Number(e.target.value), mode)} className="w-full accent-primary" />
            </div>
            
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-2 block">Режим игры</label>
              <select value={mode} onChange={(e: any) => setSettings(size, e.target.value as GameMode)} className="w-full p-2 text-xs rounded-lg border bg-background border-border focus:border-primary outline-none text-foreground">
                <option value="classic">Классический (1-{size*size})</option>
                <option value="reverse">Обратный ({size*size}-1)</option>
                <option value="gorbov">Горбов-Шульте</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-2 block">Помехи</label>
              <select value={distraction} onChange={(e: any) => setDistraction(e.target.value)} className="w-full p-2 text-xs rounded-lg border bg-background border-border focus:border-primary outline-none text-foreground">
                <option value="none">Без помех</option>
                <option value="audio">Аудио (Речь)</option>
                <option value="visual">Визуальные (Chaos)</option>
                <option value="chaos">Хаос (Аудио + Визуальные)</option>
              </select>
            </div>

            <button onClick={startGame} className="lg:mt-auto w-full px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Начать тренировку
            </button>
          </div>
        </div>

        {/* Center Grid block - empty state */}
        <div className="lg:col-span-6 bg-card/20 border border-border rounded-3xl p-6 flex flex-col items-center justify-center relative min-h-[300px] lg:h-full">
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
              <div className="w-px h-full bg-foreground"></div>
              <div className="h-px w-full bg-foreground absolute"></div>
              <div className="w-32 h-32 border border-foreground rounded-full"></div>
           </div>
           
           <div className="text-center z-10 flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary rotate-45"></div>
             </div>
             <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-balance">Готов к тренировке</p>
           </div>
        </div>

        {/* Right Info block */}
        <div className="lg:col-span-3">
          <div className="bg-card/40 border border-border rounded-2xl p-4">
            <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Инструкция</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 text-balance">
              Фокусируйте взгляд строго в центре таблицы. Не используйте микродвижения глаз. Постарайтесь увидеть все числа на периферии зрения.
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-[10px] text-primary uppercase">
              <span className="font-bold">Цель:</span> Найти числа от 1 до {size*size} без артикуляции.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 relative">
         <div className="lg:col-start-4 lg:col-span-6 bg-card/20 border border-border rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">Тренировка завершена</h2>
            <div className="text-3xl sm:text-4xl font-mono tabular-nums mb-2 font-bold text-primary">{(state.timeMs / 1000).toFixed(2)}s</div>
            <div className="text-xs sm:text-sm font-medium mb-8 uppercase tracking-widest"><span className="text-destructive font-bold">{state.errors}</span> ОШИБОК</div>
            
            <div className="flex gap-4 w-full max-w-sm">
               <button onClick={resetGame} className="flex-1 px-4 py-3 border border-border bg-card text-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold hover:bg-secondary transition-colors">
                 Меню
               </button>
               <button onClick={startGame} className="flex-1 px-4 py-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
                 Повторить
               </button>
            </div>
         </div>
      </div>
    );
  }

  // Active State
  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 relative pb-4 lg:pb-0">
      <div className="lg:col-span-3 flex flex-col gap-4">
         {/* Left Info Panel */}
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Таймер</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-foreground">
              {(state.timeMs / 1000).toFixed(2)}<span className="text-lg text-muted-foreground pl-1">s</span>
            </p>
         </div>
         <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center flex-1">
            <p className="text-[10px] text-primary uppercase mb-1 sm:mb-2 tracking-widest">Ищем число</p>
            <p className="text-4xl sm:text-6xl font-bold text-shadow-glow">
              {state.expectedIndex < state.expectedSequence.length ? (
                 <span className={state.expectedSequence[state.expectedIndex].color === 'red' ? 'text-destructive' : 'text-primary'}>
                    {state.expectedSequence[state.expectedIndex].num}
                 </span>
              ) : <span className="text-primary">-</span>}
            </p>
         </div>
      </div>

      {/* Center Grid block */}
      <div className="lg:col-span-6 bg-card/20 border border-border rounded-3xl p-3 sm:p-6 flex flex-col items-center justify-center relative min-h-[400px] overflow-hidden lg:h-full">
         
         {(distraction === 'visual' || distraction === 'chaos') && (
           <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-20 mix-blend-screen">
             <div className="w-[300px] h-[300px] bg-destructive rounded-full blur-[80px]" style={{ transform: `translate(${(mousePos.x - window.innerWidth/2) * -0.5}px, ${(mousePos.y - window.innerHeight/2) * -0.5}px)` }} />
           </div>
         )}

         {/* Crosshair Overlay */}
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 z-0">
            <div className="w-px h-full bg-primary"></div>
            <div className="h-px w-full bg-primary absolute"></div>
            <div className="w-32 h-32 border-2 border-primary rounded-full"></div>
         </div>

         <div className="grid gap-1 sm:gap-2 w-full aspect-square max-w-[480px] relative z-10" style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}>
            {state.grid.map((cell: CellValue, i: number) => {
               const isRed = cell.color === 'red';
               return (
                 <motion.button
                   key={cell.id}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => clickCell(cell, handleSuccess, handleError)}
                   className={`aspect-square bg-card border border-border flex items-center justify-center font-bold transition-all cursor-pointer select-none hover:bg-secondary 
                      ${isRed ? 'text-destructive' : 'text-foreground'} 
                      ${state.size > 5 ? 'text-lg sm:text-xl' : state.size > 3 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}
                      hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background hover:z-20`}
                   style={ (distraction === 'visual' || distraction === 'chaos') ? generateChaosStyle() : {} }
                 >
                   {cell.num}
                 </motion.button>
               )
            })}
         </div>

         <div className="mt-6 sm:mt-8 flex gap-3 sm:gap-4 z-10">
            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase rounded-full">Помехи: {distraction !== 'none' ? 'ВКЛ' : 'ВЫКЛ'}</span>
            <span className="px-3 py-1 bg-card border border-border text-muted-foreground text-[10px] uppercase rounded-full">Сетка: {size}x{size}</span>
         </div>
      </div>

      {/* Right Info block */}
      <div className="lg:col-span-3 flex flex-col gap-4">
         <div className="bg-card/40 border border-border rounded-2xl p-4 flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">Контроль</p>
            <button onClick={stopGame} className="w-full px-4 py-3 border border-border bg-card text-foreground hover:bg-destructive hover:border-destructive hover:text-destructive-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold transition-colors">
              Сдаться
            </button>
         </div>
      </div>
    </div>
  );
}
