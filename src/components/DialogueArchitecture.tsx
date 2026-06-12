import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Headset, Mic2, Brain, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface DialogueNode {
  id: number;
  speaker: 'interlocutor' | 'system';
  text: string;
  options?: DialogueOption[];
}

interface DialogueOption {
  text: string;
  impact: number; // 0 to 10
  type: 'LISTENING' | 'AGGRESSIVE' | 'EMPATHETIC';
  feedback: string;
}

const DIALOGUE_FLOW: DialogueNode[] = [
  {
    id: 1,
    speaker: 'interlocutor',
    text: "Слушай, я вообще не понимаю, почему мы выбрали этот путь. Это выглядит как полная катастрофа и трата времени.",
  },
  {
    id: 2,
    speaker: 'system',
    text: "Объект проявляет открытое сопротивление и скептицизм. Примените архитектуру 2:1 (сначала услышать, потом уточнить, потом предложить).",
    options: [
      { 
        text: "Я слышу, что вы обеспокоены эффективностью. Что именно в этом подходе вызывает у вас наибольшие сомнения?", 
        impact: 10, 
        type: 'LISTENING',
        feedback: "Отлично. Вы подтвердили, что слышите собеседника, и задали уточняющий вопрос. Это снижает градус напряжения."
      },
      { 
        text: "Это не катастрофа, а проверенная методология. Нам нужно просто придерживаться плана.", 
        impact: 2, 
        type: 'AGGRESSIVE',
        feedback: "Ошибка. Прямое отрицание чувств собеседника усиливает сопротивление."
      },
      { 
        text: "Мне тоже не нравится, но руководство настояло. Давайте просто сделаем это.", 
        impact: 4, 
        type: 'EMPATHETIC',
        feedback: "Слабая позиция. Вы теряете авторитет, хотя и проявляете эмпатию."
      }
    ]
  }
];

export function DialogueArchitecture() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [currentNodeIdx, setCurrentNodeIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { token, refreshUser } = useAuth();

  const currentNode = DIALOGUE_FLOW[currentNodeIdx];

  const handleOptionSelect = (option: DialogueOption) => {
    setScore(s => s + option.impact);
    setFeedback(option.feedback);
  };

  const nextNode = () => {
    setFeedback(null);
    if (currentNodeIdx + 1 >= DIALOGUE_FLOW.length) {
      finishGame();
    } else {
      setCurrentNodeIdx(i => i + 1);
    }
  };

  const finishGame = useCallback(() => {
    setGameState('finished');
    if (token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'DIALOGUE_2_1',
          timeMs: 1000,
          isCompleted: true,
          metadata: { score, dialogueNodesCompleted: currentNodeIdx + 1 }
        })
      })
      .then(() => refreshUser())
      .catch(err => console.error(err));
    }
  }, [score, currentNodeIdx, token, refreshUser]);

  if (gameState === 'idle') {
    return (
      <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] gap-8 p-8">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Диалоговая архитектура 2:1</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Отработка навыка активного слушания. На две части «слушания» должна приходиться одна часть «говорения». Умение перенаправлять энергию собеседника.
          </p>
          <button onClick={() => setGameState('playing')} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
            Начать диалог
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="col-span-12 flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
        <h2 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">Диалог завершен</h2>
        <div className="text-4xl font-black mb-8 text-primary">Уровень эмпатии: {score > 8 ? 'Высокий' : 'Средний'}</div>
        <button onClick={() => setGameState('idle')} className="px-8 py-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider rounded-lg font-bold">
           В штаб
        </button>
      </div>
    );
  }

  return (
    <div className="col-span-12 h-full flex flex-col items-center justify-start p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        {/* Dialogue History Placeholder or Indicator */}
        <div className="flex justify-between items-center px-4">
           <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-1"><Headset className="w-3 h-3" /> Слушание</div>
              <div className="w-8 h-[1px] bg-border" />
              <div className="flex items-center gap-1"><Mic2 className="w-3 h-3 opacity-30" /> Речь</div>
           </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentNode.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-8 rounded-[2rem] border relative ${
              currentNode.speaker === 'interlocutor' 
                ? 'bg-card border-border self-start rounded-bl-none ml-0 mr-12' 
                : 'bg-primary/5 border-primary/20 self-center max-w-lg italic text-center'
            }`}
          >
            <div className="text-[8px] uppercase font-black tracking-widest mb-2 opacity-50">
               {currentNode.speaker === 'interlocutor' ? 'Собеседник' : 'Аналитическая вставка'}
            </div>
            <p className="text-lg font-medium leading-relaxed">
               {currentNode.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {currentNode.options && !feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 mt-8"
          >
            {currentNode.options.map((option, idx) => (
              <button 
                key={idx}
                onClick={() => handleOptionSelect(option)}
                className="group p-5 rounded-2xl border border-border bg-background/50 hover:border-primary hover:bg-primary/5 transition-all text-sm text-left flex items-start gap-4"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                   <ChevronRight className="w-4 h-4" />
                </div>
                {option.text}
              </button>
            ))}
          </motion.div>
        )}

        {feedback && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-8 rounded-3xl bg-secondary/50 border border-border flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 text-primary">
               <Brain className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-widest">Разбор маневра</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
               {feedback}
            </p>
            <button 
              onClick={nextNode}
              className="mt-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest"
            >
               Продолжить
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
