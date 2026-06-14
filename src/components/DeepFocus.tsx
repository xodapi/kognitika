import React, { useState } from 'react';
import { useDeepFocusEngine } from '../hooks/useDeepFocusEngine';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Target, Play, Square, MessageCircle, Lightbulb, BellRing, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompletionRecommendation } from './CompletionRecommendation';

export function DeepFocus({ onFinish }: { onFinish?: () => void }) {
  const [minutes, setMinutes] = useState(25);
  const {
    isActive,
    isFinished,
    formattedTime,
    progress,
    distractions,
    score,
    startSession,
    stopSession,
    finishSession,
    logDistraction
  } = useDeepFocusEngine(minutes);

  if (isFinished) {
    return (
      <Card className="max-w-2xl mx-auto shadow-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="text-purple-500" />
            Итоги сессии Глубокого Фокуса
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-xl text-center">
              <h3 className="text-sm font-medium mb-2 text-zinc-500">Фокус-очки</h3>
              <p className="text-4xl font-black text-purple-600 dark:text-purple-400">
                {score} XP
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl text-center border border-purple-200 dark:border-purple-800">
              <h3 className="text-sm font-medium mb-2 text-purple-600 dark:text-purple-400">Отвлечения</h3>
              <p className="text-4xl font-black text-purple-600 dark:text-purple-400">
                {distractions.length}
              </p>
            </div>
          </div>
          
          {distractions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">Аналитика отвлечений:</h4>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>Внутренние (мысли о другом): {distractions.filter(d => d.type === 'internal').length}</li>
                <li>Внешние (звуки, телефон): {distractions.filter(d => d.type === 'external').length}</li>
                <li>Эмоции (тревога, скука): {distractions.filter(d => d.type === 'emotion').length}</li>
                <li>Идеи (новые проекты): {distractions.filter(d => d.type === 'idea').length}</li>
              </ul>
            </div>
          )}

          <CompletionRecommendation
            sourceModuleId="focus"
            score={score}
            errors={distractions.length}
            onRepeat={startSession}
            onMenu={onFinish}
            menuLabel="Завершить"
          />
        </CardContent>
      </Card>
    );
  }

  if (!isActive) {
    return (
      <Card className="max-w-2xl mx-auto shadow-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="text-purple-500" />
            Глубокий Фокус (Deep Focus)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-300 text-lg">
            Это не просто таймер. Это тренажер метакогнитивного контроля.
            Каждый раз, когда вы отвлекаетесь от задачи, не ругайте себя. 
            Просто отметьте тип отвлечения и немедленно вернитесь к работе.
          </p>
          
          <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <label className="font-medium">Время сессии:</label>
            <select 
              value={minutes} 
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2"
            >
              <option value={10}>10 минут</option>
              <option value={25}>25 минут</option>
              <option value={45}>45 минут</option>
              <option value={90}>90 минут</option>
            </select>
          </div>

          <Button 
            onClick={startSession} 
            className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Play className="mr-2" />
            Начать погружение
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Target className="text-purple-500" />
          <span className="font-bold">Фокус</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={stopSession} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Square className="w-4 h-4 mr-2" /> Прервать
          </Button>
          <Button variant="default" size="sm" onClick={finishSession} className="bg-purple-600 hover:bg-purple-700">
            Завершить сейчас
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 p-12 text-center relative">
        {/* Progress Ring Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `conic-gradient(from 0deg, #a855f7 ${progress}%, transparent ${progress}%)` }} />
        
        <h2 className="text-[8rem] font-black tracking-tighter text-zinc-900 dark:text-white tabular-nums leading-none">
          {formattedTime}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-4 font-medium uppercase tracking-widest">
          Осталось
        </p>

        <div className="mt-12 pt-12 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-6">
            Я отвлекся на...
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => logDistraction('external')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <BellRing className="w-6 h-6 text-zinc-400 group-hover:text-blue-500" />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Внешнее</span>
            </button>
            <button
              onClick={() => logDistraction('internal')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group"
            >
              <Brain className="w-6 h-6 text-zinc-400 group-hover:text-amber-500" />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Мысли</span>
            </button>
            <button
              onClick={() => logDistraction('emotion')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
            >
              <MessageCircle className="w-6 h-6 text-zinc-400 group-hover:text-red-500" />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Эмоции</span>
            </button>
            <button
              onClick={() => logDistraction('idea')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
            >
              <Lightbulb className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500" />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Идея</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-4 italic">Нажмите, чтобы зафиксировать отвлечение и вернуться к задаче</p>
        </div>
      </div>
    </div>
  );
}
