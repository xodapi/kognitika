import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Check, X, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { PostGameInsight } from './PostGameInsight';

interface Statement {
  id: number;
  text: string;
  isFact: boolean; // true = Fact, false = Cognitive Distortion (Trash)
  explanation: string;
}

const STATEMENTS_POOL: Statement[] = [
  {
    id: 1,
    text: "Я прошел тест Шульте за 42 секунды.",
    isFact: true,
    explanation: "Это объективный факт, поддающийся точному измерению."
  },
  {
    id: 2,
    text: "Я никогда не научусь концентрироваться.",
    isFact: false,
    explanation: "Это сверхузагальнение (когнитивное искажение). В будущем все может измениться."
  },
  {
    id: 3,
    text: "Коллега указал на 2 опечатки в моем отчете.",
    isFact: true,
    explanation: "Это конкретное происшествие без эмоциональной оценки."
  },
  {
    id: 4,
    text: "Жена сказала, что я забыл купить хлеб.",
    isFact: true,
    explanation: "Это вербальное действие, зафиксированное в реальности."
  },
  {
    id: 5,
    text: "Если я ошибаюсь, значит, я ленивый и глупый.",
    isFact: false,
    explanation: "Это навешивание ярлыков и сверхобобщение. Ошибки делают все люди."
  },
  {
    id: 6,
    text: "В моем списке задач на сегодня осталось 3 пункта.",
    isFact: true,
    explanation: "Это точный факт текущего состояния ваших дел."
  },
  {
    id: 7,
    text: "Все увидят, что я плохой разработчик, и меня уволят.",
    isFact: false,
    explanation: "Это чтение мыслей и катастрофизация. Вы не можете знать мысли других."
  },
  {
    id: 8,
    text: "Я чувствую тревогу перед презентацией.",
    isFact: true,
    explanation: "Ваше текущее эмоциональное состояние — это факт, вы действительно его испытываете."
  },
  {
    id: 9,
    text: "Эта тревога доказывает, что я провалю презентацию.",
    isFact: false,
    explanation: "Это эмоциональное обоснование. Чувства не являются автоматическим предсказанием реальности."
  },
  {
    id: 10,
    text: "Мой стрик тренировок сегодня сбросился.",
    isFact: true,
    explanation: "Это объективный факт состояния системы когнитивного развития."
  },
  {
    id: 11,
    text: "Я полностью бесполезен, раз не могу держать стрик.",
    isFact: false,
    explanation: "Это черно-белое мышление и самообесценивание. Сброс стрика не определяет вашу ценность."
  },
  {
    id: 12,
    text: "Я не успел выполнить проект в дедлайн.",
    isFact: true,
    explanation: "Это свершившийся факт, хотя и неприятный."
  }
];

export function CognitiveTrashFilter() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [statements, setStatements] = useState<Statement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [isFinished, setIsFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Shuffle and pick 10 statements
    const shuffled = [...STATEMENTS_POOL].sort(() => Math.random() - 0.5).slice(0, 10);
    setStatements(shuffled);
  }, []);

  const handleAnswer = (userChoice: boolean) => {
    if (feedback !== null) return; // Prevent double clicks
    
    const currentStatement = statements[currentIndex];
    const isCorrect = currentStatement.isFact === userChoice;

    if (isCorrect) {
      setScore(prev => prev + 100);
      setFeedback('correct');
    } else {
      setErrors(prev => prev + 1);
      setFeedback('wrong');
    }
    
    setShowExplanation(true);
  };

  const handleNext = () => {
    setFeedback(null);
    setShowExplanation(false);
    
    if (currentIndex + 1 >= statements.length) {
      const elapsed = Date.now() - startTime;
      setDurationMs(elapsed);
      setIsFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Save session when finished
  useEffect(() => {
    if (isFinished && token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameType: 'REALITY_CHECK',
          timeMs: durationMs,
          metadata: {
            score,
            errors,
            accuracy: Math.round(((statements.length - errors) / statements.length) * 100)
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
      .catch(err => console.error('Failed to save CognitiveTrashFilter session:', err));
    }
  }, [isFinished, token, score, errors, durationMs, statements.length]);

  if (statements.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="col-span-12">
        <PostGameInsight
          gameType="REALITY_CHECK"
          score={score}
          timeMs={durationMs}
          errors={errors}
          onPlayAgain={() => {
            setStatements([...STATEMENTS_POOL].sort(() => Math.random() - 0.5).slice(0, 10));
            setCurrentIndex(0);
            setScore(0);
            setErrors(0);
            setIsFinished(false);
            setSessionId(null);
          }}
          onBackToMenu={() => navigate('/')}
          sessionId={sessionId}
        />
      </div>
    );
  }

  const currentStatement = statements[currentIndex];

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-6 lg:pb-0">
      
      {/* Sidebar Progress */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase mb-1">Прогресс</p>
          <p className="text-3xl font-mono font-bold tabular-nums">
            {currentIndex + 1} <span className="text-xl text-muted-foreground">/ {statements.length}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Очки</p>
            <p className="text-xl font-mono font-bold text-primary">{score}</p>
          </div>
          <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Искажения</p>
            <p className="text-xl font-mono font-bold text-destructive">{errors}</p>
          </div>
        </div>
      </div>

      {/* Main card interface */}
      <div className="lg:col-span-9 bg-card/20 border border-border rounded-3xl p-6 flex flex-col items-center justify-between relative min-h-[450px] lg:h-full overflow-hidden">
        
        {/* Title */}
        <div className="text-center">
          <h2 className="text-[10px] text-primary uppercase tracking-[0.2em] font-black mb-1">Когнитивный фильтр</h2>
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Разделение фактов и когнитивного шума</h3>
        </div>

        {/* Central Card */}
        <div className="w-full max-w-xl my-6 flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full min-h-[160px] bg-background border p-8 rounded-3xl shadow-lg relative flex items-center justify-center text-center transition-all ${
                feedback === 'correct' ? 'border-emerald-500/30 shadow-emerald-500/5' :
                feedback === 'wrong' ? 'border-destructive/30 shadow-destructive/5' : 'border-border'
              }`}
            >
              {/* Decorative background icons */}
              <div className="absolute top-4 left-4 opacity-10">
                <HelpCircle className="w-8 h-8" />
              </div>

              <p className="text-lg font-bold leading-relaxed text-foreground select-text">
                « {currentStatement.text} »
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Feedback / Explanation Block */}
        <div className="w-full max-w-xl min-h-[110px] flex items-center justify-center">
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full bg-card/30 border border-border/80 rounded-2xl p-4 flex gap-3 items-start text-left"
              >
                <div className={`p-2 rounded-xl shrink-0 ${currentStatement.isFact ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {currentStatement.isFact ? <Sparkles className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-foreground">
                    {currentStatement.isFact ? '🟢 Объект / Реальный Факт' : '🔴 Когнитивное Искажение / Мусор'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {currentStatement.explanation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Choice buttons */}
        <div className="w-full max-w-xl flex gap-4 mt-6">
          {feedback === null ? (
            <>
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 py-4 bg-destructive/10 hover:bg-destructive/20 border-2 border-destructive text-destructive font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-destructive/5"
              >
                <X className="w-4 h-4" />
                Искажение
              </button>
              
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
              >
                <Check className="w-4 h-4" />
                Факт
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              Дальше
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
