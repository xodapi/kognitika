import { useEffect, useState } from 'react';
import { useStroopEngine } from '../hooks/useStroopEngine';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';
import { LuscherTest } from './LuscherTest';
import { StressOverlay } from './StressOverlay';

export function StroopTest() {
  const { state, startGame, answerQuestion, colors } = useStroopEngine();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [useLuscher, setUseLuscher] = useState(false);
  const [useStress, setUseStress] = useState(false);
  const [showPreLuscher, setShowPreLuscher] = useState(false);
  const [preSequence, setPreSequence] = useState<number[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleStartClick = () => {
    setSessionId(null);
    setPreSequence(null);
    if (useLuscher) {
      setShowPreLuscher(true);
    } else {
      startGame();
    }
  };

  const handlePlayAgain = () => {
    setSessionId(null);
    setPreSequence(null);
    if (useLuscher) {
      setShowPreLuscher(true);
    } else {
      startGame();
    }
  };

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
              metadata: { 
                score: state.score, 
                errors: state.errors, 
                avgReactionTime: state.averageReactionTime,
                preSequence: preSequence || undefined,
                stressMode: useStress
              }
           })
        })
        .then(res => {
          if (!res.ok) throw new Error('Failed to save session');
          return res.json();
        })
        .then(data => {
          if (data.session && data.session.id) {
            setSessionId(data.session.id);
          }
        })
        .catch(err => console.error('Failed to save session', err));
     }
  }, [state.isFinished, state.timeLeftMs, token, state.score, state.errors, state.averageReactionTime, preSequence, useStress]);

  if (showPreLuscher) {
    return (
      <div className="col-span-12">
        <LuscherTest 
          title="Цветовой тест Люшера ДО игры" 
          onFinish={(seq) => { 
            setPreSequence(seq); 
            setShowPreLuscher(false); 
            startGame(); 
          }} 
        />
      </div>
    );
  }

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
        <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary uppercase mb-4">Тест Струпа</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Оценка когнитивной гибкости и избирательности внимания.
            </p>
            <p className="text-xs text-foreground bg-secondary/50 p-4 rounded-xl border border-border mb-6">
              Правило: Выбирайте <b>цвет</b>, которым написано слово, а не само слово.<br/><br/>
              Вы можете использовать клавиши 1-2-3-4 на клавиатуре для быстрого ответа.
            </p>
            
            {/* Settings Selectors */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-md mx-auto">
              <div className="flex-1 flex items-center gap-3 bg-primary/5 border border-primary/10 px-4 py-3 rounded-xl cursor-pointer select-none" onClick={() => setUseLuscher(!useLuscher)}>
                <input 
                  type="checkbox" 
                  checked={useLuscher} 
                  onChange={() => {}} 
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-[10px] font-black uppercase text-foreground">Барометр Люшера</span>
              </div>
              <div className="flex-1 flex items-center gap-3 bg-destructive/5 border border-destructive/10 px-4 py-3 rounded-xl cursor-pointer select-none" onClick={() => setUseStress(!useStress)}>
                <input 
                  type="checkbox" 
                  checked={useStress} 
                  onChange={() => {}} 
                  className="w-4 h-4 rounded border-border text-destructive focus:ring-destructive"
                />
                <span className="text-[10px] font-black uppercase text-foreground">Стресс-тест ЦРУ</span>
              </div>
            </div>

            <button onClick={handleStartClick} className="w-full max-w-[250px] px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Начать тест
            </button>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12">
        <PostGameInsight
          gameType="STROOP"
          score={state.score}
          timeMs={60000 - state.timeLeftMs}
          errors={state.errors}
          preSequence={preSequence}
          sessionId={sessionId}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={() => navigate('/')}
        />
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
      <div className="lg:col-span-9 bg-card/20 border border-border rounded-3xl overflow-hidden relative min-h-[400px] lg:h-full">
         <StressOverlay isActive={state.isActive} intensity={useStress ? (state.errors > 3 ? 'high' : state.errors > 1 ? 'medium' : 'low') : 'none'}>
           {state.question ? (
              <div className="w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center">
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
              </div>
           ) : null}
         </StressOverlay>
      </div>

    </div>
  );
}
