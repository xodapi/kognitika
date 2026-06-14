import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Users, Sparkles, ShieldAlert, Award, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { CompletionRecommendation } from './CompletionRecommendation';

const logger = createSafeLogger('profiling-rice');

type Motivation = 'REWARD' | 'IDEOLOGY' | 'COERCION' | 'EGO';

interface Scenario {
  id: number;
  profile: string;
  correctMotivation: Motivation;
  effectivePhrase: string;
  distractors: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    profile: "Сотрудник часто задерживается, чтобы его работу заметил руководитель. Гордится грамотами больше, чем премиями. В разговоре часто употребляет 'я лично сделал', 'моя инициатива'.",
    correctMotivation: 'EGO',
    effectivePhrase: "Ваш личный вклад в этот проект неоценим, мы обязательно отметим ваше авторство в итоговом отчете.",
    distractors: ["Если вы не закончите вовремя, придется пересмотреть условия контракта.", "Этот проект важен для развития всей компании."]
  },
  {
    id: 2,
    profile: "Кандидат на собеседовании первым делом спрашивает про KPI, бонусы и возможность индексации. Его прошлый уход был связан с тем, что 'другая компания предложила на 20% больше'.",
    correctMotivation: 'REWARD',
    effectivePhrase: "Мы разработали прозрачную систему бонусов: чем выше результат, тем больше ваш личный доход.",
    distractors: ["Вы станете частью великой идеи по изменению отрасли.", "Мы ценим лояльность и преданность нашему общему делу."]
  },
  {
    id: 3,
    profile: "Активист, который готов работать бесплатно в выходные, если это поможет 'спасти экологию' или 'восстановить справедливость'. Часто спорит о ценностях и миссии.",
    correctMotivation: 'IDEOLOGY',
    effectivePhrase: "Этот проект — наш шанс реально изменить мир к лучшему и доказать, что мы за честный бизнес.",
    distractors: ["За это предусмотрена хорошая доплата в конце месяца.", "Это позволит вам выделиться на фоне остальных коллег."]
  },
  {
    id: 4,
    profile: "Подрядчик выполняет работу только после третьего напоминания и угрозы штрафных санкций. Не проявляет инициативы, делает ровно столько, чтобы его не уволили.",
    correctMotivation: 'COERCION',
    effectivePhrase: "Согласно договору, за каждый день просрочки начисляется штраф. Мы будем вынуждены его применить сегодня в 18:00.",
    distractors: ["Подумайте о том, как этот успех скажется на вашей репутации.", "Мы верим, что вы разделяете наши корпоративные цели."]
  }
];

export function ProfilingRICE() {
  const [gameState, setGameState] = useState<'idle' | 'profiling' | 'closing' | 'finished'>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastError, setLastError] = useState(false);
  const { token, refreshUser } = useAuth();

  const currentScenario = SCENARIOS[currentIndex % SCENARIOS.length];

  const handleMotivationSelect = (m: Motivation) => {
    if (m === currentScenario.correctMotivation) {
      setGameState('closing');
      setLastError(false);
    } else {
      setLastError(true);
      setTimeout(() => setLastError(false), 500);
    }
  };

  const handlePhraseSelect = (phrase: string) => {
    if (phrase === currentScenario.effectivePhrase) {
      setScore(s => s + 1);
      nextStep();
    } else {
      setLastError(true);
      setTimeout(() => setLastError(false), 500);
    }
  };

  const nextStep = () => {
    if (currentIndex + 1 >= SCENARIOS.length) {
      finishGame();
    } else {
      setCurrentIndex(i => i + 1);
      setGameState('profiling');
    }
  };

  const finishGame = useCallback(() => {
    setGameState('finished');
    if (token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'PROFILING_RICE',
          timeMs: 1000,
          isCompleted: true,
          metadata: { score: score * 100, scenariosCompleted: currentIndex + 1 }
        })
      })
      .then(() => refreshUser())
      .catch(err => logger.error('Session save failed', { error: safeError(err), gameType: 'PROFILING_RICE' }));
    }
  }, [score, currentIndex, token, refreshUser]);

  const restartGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setLastError(false);
    setGameState('profiling');
  };

  if (gameState === 'idle') {
    return (
      <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] gap-8 p-8">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Профайлинг R.I.C.E.</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Научитесь определять скрытую мотивацию людей и подбирать ключи к их поведению по системе: 
            <b> Reward, Ideology, Coercion, Ego</b>.
          </p>
          <button onClick={() => setGameState('profiling')} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
            Начать анализ
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
           <Star className="w-8 h-8 text-primary fill-current" />
        </div>
        <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Анализ завершен</h2>
        <div className="text-4xl font-black mb-8 text-primary">Мастер убеждения</div>
        <CompletionRecommendation
          sourceModuleId="profiling"
          score={score}
          maxScore={SCENARIOS.length}
          onRepeat={restartGame}
          className="max-w-3xl"
        />
      </div>
    );
  }

  return (
    <div className="col-span-12 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between items-center mb-8 px-2">
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gameState === 'profiling' ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[10px] text-muted-foreground uppercase font-black">Шаг 1: Профайлинг</span>
           </div>
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gameState === 'closing' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
              <span className="text-[10px] text-muted-foreground uppercase font-black">Шаг 2: Коммуникация</span>
           </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={gameState + currentScenario.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`bg-card/40 border border-border rounded-[2rem] p-8 sm:p-12 relative overflow-hidden ${lastError ? 'shake border-destructive' : ''}`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Target className="w-32 h-32" />
            </div>

            {gameState === 'profiling' ? (
              <>
                <div className="text-[10px] text-primary uppercase font-bold mb-4 tracking-widest flex items-center gap-2">
                   <Sparkles className="w-3 h-3" /> Описание объекта
                </div>
                <p className="text-lg sm:text-xl font-medium leading-relaxed mb-12 text-foreground italic">
                  «{currentScenario.profile}»
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(['REWARD', 'IDEOLOGY', 'COERCION', 'EGO'] as Motivation[]).map(m => (
                    <button 
                      key={m}
                      onClick={() => handleMotivationSelect(m)}
                      className="py-4 rounded-xl border border-border bg-background/50 hover:border-primary hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      {m === 'REWARD' && 'Вознаграждение'}
                      {m === 'IDEOLOGY' && 'Идеология'}
                      {m === 'COERCION' && 'Принуждение'}
                      {m === 'EGO' && 'Эго'}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-green-500 uppercase font-bold mb-4 tracking-widest flex items-center gap-2">
                   <Award className="w-3 h-3" /> Мотивация определена: {currentScenario.correctMotivation}
                </div>
                <p className="text-lg font-medium leading-relaxed mb-12 text-muted-foreground">
                   Выберите наиболее эффективную фразу для взаимодействия:
                </p>
                <div className="flex flex-col gap-4">
                  {[currentScenario.effectivePhrase, ...currentScenario.distractors].sort().map((phrase, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handlePhraseSelect(phrase)}
                      className="p-6 rounded-2xl border border-border bg-background/50 hover:bg-primary/5 hover:border-primary transition-all text-sm text-left font-medium leading-snug group"
                    >
                      <span className="text-primary font-black mr-4 opacity-30">0{idx+1}</span>
                      {phrase}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {lastError && (
          <div className="mt-4 flex items-center justify-center gap-2 text-destructive animate-bounce">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Аналитическая ошибка</span>
          </div>
        )}
      </div>
    </div>
  );
}
