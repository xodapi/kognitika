import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Brain, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';

interface Statement {
  id: number;
  text: string;
  isFact: boolean;
  explanation?: string;
}

const STATEMENTS: Statement[] = [
  { id: 1, text: "Температура кипения воды при нормальном давлении 100°C", isFact: true },
  { id: 2, text: "Этот отчет выглядит крайне непрофессионально", isFact: false },
  { id: 3, text: "Поезд задерживается на 15 минут согласно табло", isFact: true },
  { id: 4, text: "Коллега специально игнорирует мои сообщения", isFact: false },
  { id: 5, text: "ВВП страны вырос на 2% за прошлый квартал", isFact: true },
  { id: 6, text: "Клиент был в ярости во время звонка", isFact: false },
  { id: 7, text: "На складе осталось 50 единиц товара", isFact: true },
  { id: 8, text: "Проект обречен на провал с таким подходом", isFact: false },
  { id: 9, text: "Скорость поезда сейчас 80 км/ч", isFact: true },
  { id: 10, text: "Руководитель недоволен моей работой", isFact: false },
  { id: 11, text: "Встреча назначена на 14:00 в кабинете 302", isFact: true },
  { id: 12, text: "Он говорит это только чтобы меня разозлить", isFact: false },
];

export function ObjectiveFilter() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeMs, setTimeMs] = useState(0);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();


  const currentStatement = STATEMENTS[currentIndex % STATEMENTS.length];

  const startGame = () => {
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setStartTime(Date.now());
    setTimeMs(0);
    setLastResult(null);
  };

  const finishGame = useCallback(() => {
    setGameState('finished');
    const finalTime = Date.now() - startTime;
    setTimeMs(finalTime);

    if (token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'OBJECTIVE_FILTER',
          timeMs: finalTime,
          isCompleted: true,
          metadata: { totalQuestions: 10, correctAnswers: score }
        })
      })
      .then(res => res.json())
      .then(() => refreshUser())
      .catch(err => console.error(err));
    }
  }, [startTime, score, token, refreshUser]);

  const handleAnswer = (isFact: boolean) => {
    if (gameState !== 'playing') return;

    if (isFact === currentStatement.isFact) {
      setScore(s => s + 1);
      setLastResult('correct');
    } else {
      setLastResult('wrong');
    }

    setTimeout(() => {
      setLastResult(null);
      if (currentIndex + 1 >= 10) {
        finishGame();
      } else {
        setCurrentIndex(i => i + 1);
      }
    }, 300);
  };

  if (gameState === 'idle') {
    return (
      <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] gap-8 p-8">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Объективный фильтр</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Ваша задача — максимально быстро отделить <b>Факты</b> (объективную реальность) от <b>Домыслов</b> (субъективных суждений и эмоций).
          </p>
          <button 
            onClick={startGame}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Начать тренировку
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="col-span-12">
        <PostGameInsight
          gameType="OBJECTIVE_FILTER"
          score={score}
          timeMs={timeMs}
          errors={10 - score}
          onPlayAgain={startGame}
          onBackToMenu={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="col-span-12 h-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl relative">
        {/* Progress bar */}
        <div className="w-full h-1 bg-border rounded-full mb-8 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / 10) * 100}%` }}
            className="h-full bg-primary"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStatement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-card/40 border border-border rounded-3xl p-12 text-center relative overflow-hidden ${
              lastResult === 'correct' ? 'ring-4 ring-green-500/30' : 
              lastResult === 'wrong' ? 'ring-4 ring-destructive/30' : ''
            }`}
          >
            <div className="absolute top-4 left-4">
               <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Анализ {currentIndex + 1}/10</span>
            </div>

            <p className="text-xl sm:text-2xl font-bold leading-tight mb-8 text-balance">
              «{currentStatement.text}»
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleAnswer(true)}
                className="group relative py-6 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Это Факт</span>
                </div>
              </button>

              <button 
                onClick={() => handleAnswer(false)}
                className="group relative py-6 bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 rounded-2xl transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-destructive/5 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <Brain className="w-6 h-6 text-destructive" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Это Домысел</span>
                </div>
              </button>
            </div>

            {lastResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-20"
              >
                {lastResult === 'correct' ? (
                  <div className="flex flex-col items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-16 h-16" />
                    <span className="text-xs font-black uppercase">Верно</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-destructive">
                    <XCircle className="w-16 h-16" />
                    <span className="text-xs font-black uppercase">Ошибка</span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-between items-center px-4">
          <div className="text-[10px] text-muted-foreground uppercase">
             Счет: <span className="text-primary font-black">{score}</span>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase italic">
             Реагируйте быстрее для повышения XP
          </div>
        </div>
      </div>
    </div>
  );
}
