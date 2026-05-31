import { useState, useEffect } from 'react';
import { useNumericalEngine } from '../hooks/useNumericalEngine';
import { Calculator } from './Calculator';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', '#8b5cf6'];

export function NumericalAnalysis() {
  const { state, startGame, stopGame, answerQuestion } = useNumericalEngine();
  const [showCalc, setShowCalc] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  
  // Save result on finish
  useEffect(() => {
     if (state.isFinished && token) {
        fetch('/api/game/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({
              gameType: 'NUMERICAL_ANALYSIS',
              timeMs: 60000 - state.timeLeftMs, // Time spent
              metadata: { score: state.score }
           })
        }).catch(err => console.error('Failed to save session', err));
     }
  }, [state.isFinished, state.timeLeftMs, token, state.score]);

  if (!state.isActive && !state.isFinished) {
    return (
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
        <div className="md:col-start-4 md:col-span-6 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary uppercase mb-4">Числовой анализ</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Оценка способности быстро оперировать данными. У вас будет 60 секунд на ответ серии вопросов (вычисление долей, процентных изменений и средневзвешенных значений).
            </p>
            <button onClick={() => startGame()} className="w-full max-w-[250px] px-4 py-3 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-primary/90 transition-colors">
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
          gameType="NUMERICAL_ANALYSIS"
          score={state.score}
          timeMs={60000 - state.timeLeftMs}
          errors={5 - state.score}
          onPlayAgain={startGame}
          onBackToMenu={() => navigate('/')}
        />
      </div>
    );
  }

  const curQ = state.questions[state.currentIndex];
  
  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 pb-4">
      
      {/* Left Sidebar Info */}
      <div className="lg:col-span-3 flex flex-col gap-4">
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center lg:flex-none">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Осталось времени</p>
            <p className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${state.timeLeftMs < 10000 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {(state.timeLeftMs / 1000).toFixed(1)}<span className="text-lg text-muted-foreground pl-1">s</span>
            </p>
         </div>
         <div className="bg-card/40 border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Прогресс</p>
            <p className="text-base sm:text-lg font-mono font-bold">{state.currentIndex + 1} / 5</p>
         </div>
         
         <button onClick={() => setShowCalc(!showCalc)} className="bg-secondary text-foreground hover:bg-secondary/80 rounded-2xl p-4 text-[10px] uppercase tracking-widest font-bold border border-border transition-colors">
            {showCalc ? 'Скрыть калькулятор' : 'Открыть калькулятор'}
         </button>
         
         <div className="lg:mt-auto hidden lg:block">
            <AnimatePresence>
              {showCalc && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  <Calculator />
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      {/* Center Question Block */}
      <div className="lg:col-span-9 bg-card/20 border border-border rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[400px] lg:h-full">
         <div className="w-full flex-1 flex flex-col justify-center items-center gap-6 sm:gap-8 max-w-3xl">
           
           <h3 className="text-xl lg:text-2xl font-medium tracking-tight text-center leading-relaxed">
             {curQ.title}
           </h3>

           {/* Data Visualization */}
           <div className="w-full h-[200px] lg:h-[250px] bg-background/50 border border-border rounded-xl p-4">
              {curQ.type === 'percentage_change' && (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={[{ name: '2022', value: curQ.data.oldVal }, { name: '2023', value: curQ.data.newVal }]}>
                     <XAxis dataKey="name" tick={{fill: 'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} />
                     <YAxis tick={{fill: 'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} />
                     <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }} />
                     <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
              )}
              {curQ.type === 'share' && (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={curQ.data.parts} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {curQ.data.parts.map((_: any, index: number) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }} />
                   </PieChart>
                 </ResponsiveContainer>
              )}
              {curQ.type === 'weighted_average' && (
                 <div className="overflow-x-auto h-full flex flex-col justify-center">
                   <table className="w-full text-sm text-center">
                     <thead>
                       <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                         <th className="py-2">Проект</th>
                         <th className="py-2">Рентабельность (%)</th>
                         <th className="py-2">Объем инвестиций (Вес)</th>
                       </tr>
                     </thead>
                     <tbody>
                       {curQ.data.items.map((item: any, i: number) => (
                         <tr key={i} className="border-b border-border/50">
                           <td className="py-2 text-primary font-medium">{item.name}</td>
                           <td className="py-2 tabular-nums">{item.value}%</td>
                           <td className="py-2 tabular-nums">{item.weight} млн</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              )}
           </div>

           {/* Answer Options */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {curQ.options.map((opt, i) => (
                 <button 
                  key={i} 
                  onClick={() => answerQuestion(opt)}
                  className="py-4 bg-card hover:bg-secondary border border-border hover:border-primary text-lg font-mono rounded-xl transition-all"
                 >
                   {opt}%
                 </button>
              ))}
           </div>

         </div>
      </div>

    </div>
  );
}
