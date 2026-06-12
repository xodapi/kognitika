import React from 'react';
import { useStorytellingEngine } from '../hooks/useStorytellingEngine';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Network, Play, Link as LinkIcon, AlertCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Storytelling({ onFinish }: { onFinish?: () => void }) {
  const {
    currentScenario,
    progress,
    isActive,
    isFinished,
    score,
    startSession,
    submitAnswer,
    lastFeedback
  } = useStorytellingEngine(Math.random(), 1);

  if (isFinished) {
    return (
      <Card className="max-w-2xl mx-auto shadow-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Network className="text-amber-500" />
            Итоги смысловых связей
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-medium mb-2">Навык: Сторителлинг</h3>
            <p className="text-4xl font-black text-amber-600 dark:text-amber-400">
              {score} XP
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-4">
              Умение находить метафоры и связывать несоединимое — признак сильного интеллекта.
            </p>
          </div>
          <Button onClick={onFinish} className="w-full h-12 text-lg" variant="default">
            Завершить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isActive) {
    return (
      <Card className="max-w-2xl mx-auto shadow-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Network className="text-amber-500" />
            Тренажер смысловых связей
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-300 text-lg">
            Перед вами будут появляться два совершенно не связанных на первый взгляд понятия. 
            Вам нужно выбрать самую емкую и красивую метафору, которая объединяет их в историю.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg flex items-start gap-3 border border-amber-100 dark:border-amber-900">
            <BookOpen className="text-amber-600 dark:text-amber-400 mt-1" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Избегайте излишне заумных или сухих буквальных сравнений. Ищите смысл и поэзию.
            </p>
          </div>

          <Button 
            onClick={startSession} 
            className="w-full h-14 text-lg bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Play className="mr-2" />
            Начать поиск связей
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Network className="text-amber-500" />
          <span className="font-bold">Сторителлинг</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-500">Очки: {score}</div>
          <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentScenario.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-8 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1 text-center font-black text-xl text-indigo-600 dark:text-indigo-400">
              {currentScenario.conceptA}
            </div>
            
            <div className="mx-6 text-zinc-300 dark:text-zinc-700">
              <LinkIcon className="w-8 h-8" />
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1 text-center font-black text-xl text-emerald-600 dark:text-emerald-400">
              {currentScenario.conceptB}
            </div>
          </div>

          <div className="p-8 space-y-4">
            <h3 className="text-sm font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-4 text-center">
              Выберите лучшую метафору
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {currentScenario.options.map((option) => (
                <button
                  key={option.id}
                  disabled={!!lastFeedback}
                  onClick={() => submitAnswer(option.id)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    lastFeedback 
                      ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {/* Обратная связь */}
            {lastFeedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-6 p-4 rounded-xl border flex items-start gap-3 ${
                  lastFeedback.type === 'compelling'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200' 
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <AlertCircle className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold mb-1">
                    {lastFeedback.type === 'compelling' ? 'Прекрасно!' : 'Не совсем:'}
                  </div>
                  <div>{lastFeedback.text}</div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
