import { useEffect } from 'react';
import { useSituationalEngine } from '../hooks/useSituationalEngine';
import { useAuth } from '../hooks/useAuth';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('situational-judgment-test');

export function SituationalJudgmentTest() {
  const { state, startGame, answerQuestion } = useSituationalEngine();
  const { token } = useAuth();
  
  // Save result on finish
  useEffect(() => {
     if (state.isFinished && token) {
        fetch('/api/game/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({
              gameType: 'SITUATIONAL_JUDGMENT',
              timeMs: state.timeMs,
              metadata: { score: state.score, maxScore: state.maxScore }
           })
        }).catch(err => logger.error('Session save failed', { error: safeError(err), gameType: 'SITUATIONAL_JUDGMENT' }));
     }
  }, [state.isFinished, state.timeMs, token, state.score, state.maxScore]);

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-4 lg:col-span-6 bg-card/20 border border-border rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary uppercase mb-4 text-balance">Ситуационные задачи</h2>
            <p className="text-sm text-muted-foreground mb-8 text-balance">
              Оценка управленческого и эмоционального интеллекта. Вам будут предложены гипотетические рабочие ситуации. Выберите наиболее подходящий вариант действий.
            </p>
            <button onClick={startGame} className="w-full max-w-[250px] px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Начать анализ
            </button>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 relative">
         <div className="lg:col-start-4 lg:col-span-6 bg-card/20 border border-border rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">Анализ завершен</h2>
            
            <div className="text-4xl sm:text-6xl font-mono tabular-nums mb-2 font-bold text-primary">{state.score}<span className="text-xl sm:text-2xl text-muted-foreground">/{state.maxScore}</span></div>
            <div className="text-xs sm:text-sm font-medium mb-4 uppercase tracking-widest">Баллов за решения</div>
            
            <div className="text-sm font-mono text-muted-foreground mb-8">
               Время: {(state.timeMs / 1000).toFixed(1)}s
            </div>
            
            <div className="flex gap-4 w-full max-w-sm border-t border-border pt-6">
               <button onClick={startGame} className="flex-1 px-4 py-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
                 Повторить сценарии
               </button>
            </div>
         </div>
      </div>
    );
  }

  const curQ = state.questions[state.currentIndex];

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-6 lg:pb-0">
      
      {/* Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Сценарий</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold">{state.currentIndex + 1} <span className="text-muted-foreground text-lg">/ {state.questions.length}</span></p>
         </div>
      </div>

      {/* Center Action */}
      <div className="lg:col-span-6 bg-card/20 border border-border rounded-3xl p-4 sm:p-6 flex flex-col min-h-[400px] lg:h-full">
         <div className="flex-1 overflow-y-auto mb-6 pr-1 sm:pr-2">
            <div className="bg-background/80 border border-border rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
              <h3 className="text-base sm:text-lg lg:text-xl font-medium tracking-tight leading-relaxed text-balance">
                {curQ.scenario}
              </h3>
            </div>
            
            <div className="flex flex-col gap-3">
               {curQ.options.map((opt) => (
                  <button 
                    key={opt.id} 
                    onClick={() => answerQuestion(opt.score)}
                    className="text-left bg-card hover:bg-secondary border border-border hover:border-primary p-3 sm:p-4 rounded-xl transition-all"
                  >
                     <p className="text-xs sm:text-sm">{opt.text}</p>
                  </button>
               ))}
            </div>
         </div>
      </div>

    </div>
  )
}
