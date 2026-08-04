import { useEffect, useState } from 'react';
import { useGameAttempt } from '../lib/game-attempt-client';
import { useNBackEngine } from '../hooks/useNBackEngine';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';
import { LuscherTest } from './LuscherTest';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { haptic } from '../lib/haptic';
import {
  isLuscherWellbeingEnabled,
  setLuscherWellbeingEnabled,
} from '../lib/luscher-wellbeing-preference';

const logger = createSafeLogger('n-back-test');

export function NBackTest() {
  const { state, startGame, answerMatch, getCompletedAnalyticsJob } = useNBackEngine();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [useLuscher, setUseLuscher] = useState(isLuscherWellbeingEnabled);
  const [showPreLuscher, setShowPreLuscher] = useState(false);

  const handleLuscherChange = (enabled: boolean) => {
    setUseLuscher(enabled);
    setLuscherWellbeingEnabled(enabled);
  };
  const [preSequence, setPreSequence] = useState<number[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { beginAttempt, saveAttempt } = useGameAttempt(token);

  const prepareGame = async () => {
    setSessionId(null);
    setPreSequence(null);
    if (useLuscher) {
      setShowPreLuscher(true);
      return;
    }
    try {
      await beginAttempt('N_BACK');
      startGame();
    } catch (err) {
      logger.error('Session start failed', { error: safeError(err), gameType: 'N_BACK' });
    }
  };

  const handleStartClick = () => { void prepareGame(); };
  const handlePlayAgain = () => { void prepareGame(); };
  
  // Track keyboard shortcut
  useEffect(() => {
    if (!state.isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          e.preventDefault();
          haptic.medium();
          answerMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, answerMatch]);

  // Save result on finish
  useEffect(() => {
     if (state.isFinished && token) {
        saveAttempt({
          timeMs: 2500 * state.round,
          metadata: {
            score: state.score,
            errors: state.errors,
            preSequence: preSequence || undefined,
          },
          analyticsJob: getCompletedAnalyticsJob() ?? undefined,
        })
        .then(data => {
          if (data?.session?.id) setSessionId(data.session.id);
        })
        .catch(err => logger.error('Session save failed', { error: safeError(err), gameType: 'N_BACK' }));
     }
  }, [state.isFinished, state.round, token, state.score, state.errors, preSequence, saveAttempt, getCompletedAnalyticsJob]);

  if (showPreLuscher) {
    return (
      <div className="col-span-12">
        <LuscherTest 
          title="Цветовой тест Люшера ДО игры" 
          onFinish={(seq) => {
            void (async () => {
              try {
                await beginAttempt('N_BACK');
                setPreSequence(seq);
                setShowPreLuscher(false);
                startGame();
              } catch (err) {
                logger.error('Session start failed', { error: safeError(err), gameType: 'N_BACK' });
              }
            })();
          }} 
        />
      </div>
    );
  }

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 gap-4 py-2 md:grid-cols-12 md:py-0 h-full min-h-0">
        <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-black tracking-tight text-primary uppercase mb-3 sm:text-2xl sm:mb-4">Задача N-назад</h2>
            <p className="text-sm leading-relaxed text-muted-foreground mb-4">
              Оценка рабочей памяти. Вы увидите последовательность букв.
            </p>
            <p className="text-xs leading-relaxed text-foreground bg-secondary/50 p-4 rounded-xl border border-border mb-5 sm:mb-6">
              Правило (2-назад): нажимайте <b>Совпадение</b>, если текущая буква совпадает с буквой, показанной <span className="text-primary font-bold">2 шага назад</span>. На компьютере можно использовать Пробел.
            </p>

            <div className="mb-6 w-full rounded-xl border border-primary/10 bg-primary/5 p-4 text-left sm:mb-8">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={useLuscher}
                  onChange={(event) => handleLuscherChange(event.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-black uppercase text-foreground">Эмоциональный барометр до и после тренировки</span>
              </label>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Необязательное самонаблюдение по выбору цветов. Это не психологическая диагностика.
              </p>
              {useLuscher && (
                <button
                  type="button"
                  onClick={() => handleLuscherChange(false)}
                  className="mt-3 min-h-11 text-[11px] font-bold text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-foreground"
                >
                  Больше не предлагать
                </button>
              )}
            </div>

            <button onClick={handleStartClick} className="w-full max-w-sm min-h-12 px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-xl font-bold hover:bg-primary/90 transition-colors sm:max-w-[250px]">
              Активировать
            </button>
        </div>
      </div>
    );
  }

  if (state.isFinished) {
    return (
      <div className="col-span-12">
        <PostGameInsight
          gameType="N_BACK"
          score={state.score}
          timeMs={2500 * state.round}
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
              onClick={() => { haptic.medium(); answerMatch(); }} 
              className="w-full max-w-[280px] sm:max-w-sm min-h-11 px-4 py-6 sm:py-8 bg-primary/10 hover:bg-primary/20 border-2 border-primary text-xl sm:text-2xl uppercase tracking-widest rounded-2xl font-black transition-all active:scale-95 text-primary"
            >
              СОВПАДЕНИЕ
            </button>
            <p className="text-[10px] text-muted-foreground mt-4 tracking-widest uppercase">Или нажмите пробел</p>
         </div>
      </div>

    </div>
  );
}
