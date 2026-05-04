import { useEffect, useState } from 'react';
import { useStroopEngine } from '../hooks/useStroopEngine';
import { useAuth } from '../hooks/useAuth';

export function StroopTest() {
  const { state, startGame, answerQuestion, colors } = useStroopEngine();
  const { token } = useAuth();
  
  // Track button mappings for keyboard shortcuts (Q, W, E, R / 1, 2, 3, 4)
  useEffect(() => {
    if (!state.isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'й' || key === 'q') answerQuestion(colors[0].id); // Red
      if (key === '2' || key === 'ц' || key === 'w') answerQuestion(colors[1].id); // Blue
      if (key === '3' || key === 'у' || key === 'e') answerQuestion(colors[2].id); // Green
      if (key === '4' || key === 'к' || key === 'r') answerQuestion(colors[3].id); // Yellow
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, answerQuestion, colors]);

  // Save result on finish
  useEffect(() => {
     if (state.isFinished && token) {
        fetch('/api/game/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({
              gameType: 'STROOP',
              timeMs: 60000 - state.timeLeftMs, 
              metadata: { score: state.score, errors: state.errors, avgReactionTime: state.averageReactionTime }
           })
        }).catch(err => console.error('Failed to save session', err));
     }
  }, [state.isFinished, state.timeLeftMs, token, state.score, state.errors, state.averageReactionTime]);

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
        <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary uppercase mb-4">Тест Струпа</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Оценка когнитивной гибкости и избирательности внимания.
            </p>
            <p className="text-xs text-foreground bg-secondary/50 p-4 rounded-xl border border-border mb-8">
              Правило: Выбирайте <b>цвет</b>, которым написано слово, а не само слово.<br/><br/>
              Вы можете использовать клавиши 1-2-3-4 на клавиатуре для быстрого ответа.
            </p>
            <button onClick={startGame} className="w-full max-w-[250px] px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Начать тест
            </button>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0 relative">
         <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">Тестирование завершено</h2>
            
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

            <div className="text-sm font-mono text-muted-foreground mb-8 bg-background/50 px-4 py-2 rounded-lg border border-border">
               Ср. реакция: {Math.round(state.averageReactionTime)} мс
            </div>
            
            <div className="flex gap-4 w-full max-w-sm border-t border-border pt-6">
               <button onClick={startGame} className="flex-1 px-4 py-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
                 Пройти снова
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
      
      {/* Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Осталось времени</p>
            <p className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${state.timeLeftMs < 10000 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {(state.timeLeftMs / 1000).toFixed(1)}<span className="text-lg text-muted-foreground pl-1">s</span>
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

      {/* Center Word Display */}
      <div className="lg:col-span-9 bg-card/20 border border-border rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[400px] lg:h-full">
         {state.question && (
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div 
                className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 sm:mb-16 px-4 py-6 sm:py-8 bg-background/50 border border-border rounded-3xl shadow-sm text-center w-full max-w-2xl"
                style={{ color: state.question.textColor }}
              >
                 {state.question.word}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl">
                 {colors.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => answerQuestion(c.id)}
                      className="group flex flex-col items-center justify-center gap-1 sm:gap-2 bg-card hover:bg-secondary border border-border rounded-2xl py-4 sm:py-6 transition-all"
                    >
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-4 border-background shadow-md mb-1 sm:mb-2" style={{ backgroundColor: c.color }}></div>
                      <span className="text-[10px] sm:text-sm font-bold uppercase tracking-wider">{c.text}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase">[{i + 1}]</span>
                    </button>
                 ))}
              </div>
            </div>
         )}
      </div>

    </div>
  );
}
