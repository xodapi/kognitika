import { useEffect } from 'react';
import { useLogicalEngine, MatrixItem } from '../hooks/useLogicalEngine';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';

function RenderShape({ item }: { item: MatrixItem }) {
  const { shape, color, count, rotation } = item;
  
  const draw = () => {
    if (shape === 'circle') return <circle cx="50" cy="50" r="40" fill="currentColor" />;
    if (shape === 'square') return <rect x="10" y="10" width="80" height="80" rx="10" fill="currentColor" />;
    if (shape === 'triangle') return <polygon points="50,10 90,90 10,90" fill="currentColor" />;
    return null;
  };

  const getPos = (i: number, total: number) => {
    if (total === 1) return { x: 0, y: 0, scale: 1 };
    if (total === 2) return { x: i === 0 ? -20 : 20, y: i === 0 ? -20 : 20, scale: 0.6 };
    if (total === 3) return { x: i === 0 ? 0 : (i === 1 ? -25 : 25), y: i === 0 ? -25 : 25, scale: 0.5 };
    if (total === 4) return { x: i % 2 === 0 ? -25 : 25, y: i < 2 ? -25 : 25, scale: 0.5 };
    // fallback 5+
    const angle = (i / total) * Math.PI * 2;
    return { x: Math.cos(angle) * 25, y: Math.sin(angle) * 25, scale: 0.4 };
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <svg viewBox="0 0 100 100" className="w-full h-full max-w-[80px]" style={{ color, transform: `rotate(${rotation}deg)` }}>
         {Array.from({ length: count }).map((_, i) => {
           const p = getPos(i, count);
           return (
             <g key={i} style={{ transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`, transformOrigin: '50px 50px' }}>
                {draw()}
             </g>
           )
         })}
      </svg>
    </div>
  )
}

export function LogicalMatrix() {
  const { state, startGame, answerQuestion } = useLogicalEngine();
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
     if (state.isFinished && token) {
        fetch('/api/game/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({
              gameType: 'LOGICAL_SEQUENCE',
              timeMs: state.timeMs,
              metadata: { score: state.score }
           })
        }).catch(err => console.error('Failed to save session', err));
     }
  }, [state.isFinished, state.timeMs, token, state.score]);

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
        <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary uppercase mb-4">Системная логика</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Выявите скрытую закономерность и дополните матрицу 3х3 правильным элементом. Тест состоит из 3 матриц нарастающей сложности.
            </p>
            <button onClick={() => startGame()} className="w-full max-w-[250px] px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Актвировать матрицы
            </button>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12">
        <PostGameInsight
          gameType="LOGICAL_SEQUENCE"
          score={state.score}
          timeMs={state.timeMs}
          errors={3 - state.score}
          onPlayAgain={startGame}
          onBackToMenu={() => navigate('/')}
        />
      </div>
    );
  }

  const curQ = state.questions[state.currentIndex];

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-4 lg:pb-0">
      
      {/* Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Ступень</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold">{state.currentIndex + 1} <span className="text-muted-foreground text-lg">/ 3</span></p>
         </div>
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Время</p>
            <p className="text-xl sm:text-2xl font-mono tabular-nums text-primary">{(state.timeMs / 1000).toFixed(1)}s</p>
         </div>
      </div>

      {/* Center Action */}
      <div className="lg:col-span-6 bg-card/20 border border-border rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[400px] lg:h-full">
         <div className="grid grid-cols-3 gap-2 p-2 bg-background/50 border border-border rounded-2xl aspect-square w-full max-w-[400px]">
            {curQ.grid.map((item, idx) => (
               <div key={idx} className={`aspect-square rounded-xl border ${item ? 'bg-card border-border' : 'bg-transparent border-dashed border-primary/50'} flex items-center justify-center relative`}>
                  {item ? (
                     <RenderShape item={item} />
                  ) : (
                     <div className="text-3xl sm:text-4xl text-primary/50 font-light">?</div>
                  )}
               </div>
            ))}
         </div>
      </div>

      {/* Right Options Sidebar */}
      <div className="lg:col-span-3 flex flex-col gap-4 lg:h-full">
         <div className="bg-card/40 border border-border rounded-2xl p-4 flex flex-col h-full">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center mb-4">Возможные элементы</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 flex-1">
               {curQ.options.map((opt, i) => (
                  <button 
                    key={opt.id} 
                    onClick={() => answerQuestion(i)}
                    className="bg-card hover:bg-secondary border border-border hover:border-primary rounded-xl transition-all aspect-square lg:aspect-auto lg:h-[100px] flex items-center justify-center p-1 sm:p-2"
                  >
                     <RenderShape item={opt} />
                  </button>
               ))}
            </div>
         </div>
      </div>

    </div>
  )
}
