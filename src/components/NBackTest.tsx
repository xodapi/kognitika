import { useEffect } from 'react';
import { useNBackEngine } from '../hooks/useNBackEngine';
import { useAuth } from '../hooks/useAuth';

export function NBackTest() {
  const { state, startGame, answerMatch } = useNBackEngine();
  const { token } = useAuth();
  
  // Track keyboard shortcut
  useEffect(() => {
    if (!state.isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          e.preventDefault();
          answerMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, answerMatch]);

  // Save result on finish
  useEffect(() => {
     if (state.isFinished && token) {
        fetch('/api/game/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({
              gameType: 'N_BACK',
              timeMs: 2500 * state.round, // Estimate
              metadata: { score: state.score, errors: state.errors }
           })
        }).catch(err => console.error('Failed to save session', err));
     }
  }, [state.isFinished, state.round, token, state.score, state.errors]);

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
        <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary uppercase mb-4">Задача N-назад</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Оценка рабочей памяти. Вы увидите последовательность букв.
            </p>
            <p className="text-xs text-foreground bg-secondary/50 p-4 rounded-xl border border-border mb-8">
              Правило (2-назад): Жмите <b>Совпадение</b> или <b>Пробел</b>, если текущая буква совпадает с буквой, показанной <span className="text-primary font-bold">2 шага назад</span>.
            </p>
            <button onClick={startGame} className="w-full max-w-[250px] px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Активировать
            </button>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0 relative">
         <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">Анализ завершен</h2>
            
            <div className="flex items-end justify-center gap-4 mb-8">
              <div className="flex flex-col items-center">
                 <div className="text-6xl font-mono tabular-nums font-bold text-primary">{state.score}</div>
                 <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-2">Верных</div>
              </div>
              <div className="h-12 w-px bg-border mx-2"></div>
              <div className="flex flex-col items-center">
                 <div className="text-6xl font-mono tabular-nums font-bold text-destructive">{state.errors}</div>
                 <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-2">Ошибок</div>
              </div>
            </div>

            <div className="flex gap-4 w-full max-w-sm border-t border-border pt-6">
               <button onClick={startGame} className="flex-1 px-4 py-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
                 Повторить
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-6 lg:pb-0">
      
      {/* Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Шаг</p>
            <p className="text-3xl font-mono font-bold tabular-nums">
              {state.round} <span className="text-xl text-muted-foreground">/ 20</span>
            </p>
         </div>
         <div className="grid grid-cols-2 gap-4">
           <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Счет</p>
              <p className="text-xl font-mono font-bold text-primary">{state.score}</p>
           </div>
           <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Ошибки</p>
              <p className="text-xl font-mono font-bold text-destructive">{state.errors}</p>
           </div>
         </div>
      </div>

      {/* Center Stimulus Display */}
      <div className="lg:col-span-9 bg-card/20 border border-border rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[400px] lg:h-full">
         
         <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="w-full max-w-[280px] sm:max-w-sm aspect-square bg-background border border-border rounded-3xl shadow-sm flex items-center justify-center relative overflow-hidden mb-8 sm:mb-12">
               {state.showFeedback === 'correct' && <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>}
               {state.showFeedback === 'wrong' && <div className="absolute inset-0 bg-destructive/20 animate-pulse"></div>}
               
               <div className="text-7xl sm:text-8xl md:text-[140px] font-black uppercase text-foreground z-10 transition-transform duration-200" key={state.round}>
                 {state.currentStimulus || '?'}
               </div>
            </div>
            
            <button 
              onClick={answerMatch} 
              className="w-full max-w-[280px] sm:max-w-sm px-4 py-6 sm:py-8 bg-primary/10 hover:bg-primary/20 border-2 border-primary text-xl sm:text-2xl uppercase tracking-widest rounded-2xl font-black transition-all active:scale-95 text-primary"
            >
              СОВПАДЕНИЕ
            </button>
            <p className="text-[10px] text-muted-foreground mt-4 tracking-widest uppercase">Или нажмите пробел</p>
         </div>
      </div>

    </div>
  );
}
