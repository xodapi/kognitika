import React from 'react';
import { useRejectionImmunityEngine } from '../hooks/useRejectionImmunityEngine';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ShieldAlert, ThumbsDown, ThumbsUp, Frown, Play, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostGameInsight } from './PostGameInsight';

export function RejectionImmunity({ onFinish }: { onFinish?: () => void }) {
  const {
    currentScenario,
    progress,
    isActive,
    isFinished,
    score,
    immunityPoints,
    startSession,
    submitAnswer,
    lastFeedback
  } = useRejectionImmunityEngine(Math.random(), 1);

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto">
        <PostGameInsight
          gameType="REJECTION_IMMUNITY"
          score={score + immunityPoints}
          timeMs={1000}
          errors={Math.max(0, Math.ceil((300 - score - immunityPoints) / 100))}
          onPlayAgain={startSession}
          onBackToMenu={() => onFinish?.()}
        />
      </div>
    );
  }

  if (!isActive) {
    return (
      <Card className="max-w-2xl mx-auto shadow-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-red-500" />
            Иммунитет к отказам
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-300 text-lg">
            В этой игре "Нет" — это ваша цель. Страх отказа сковывает большинство людей. 
            Единственный способ избавиться от него — намеренно получать отказы и убеждаться, что вы все еще живы.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-start gap-3 border border-red-100 dark:border-red-900">
            <AlertOctagon className="text-red-600 dark:text-red-400 mt-1" />
            <p className="text-sm text-red-900 dark:text-red-200">
              Ваша задача — выбрать самое безумное, дерзкое действие, которое почти гарантированно приведет к отказу.
            </p>
          </div>

          <Button 
            onClick={startSession} 
            className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
          >
            <Play className="mr-2" />
            Начать терапию отказами
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-red-500" />
          <span className="font-bold">Иммунитет к отказам</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm text-blue-500 font-medium">Safe: {score}</div>
          <div className="text-sm text-red-500 font-bold">Immunity: {immunityPoints}</div>
          <div className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
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
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-8 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Ситуация
            </h3>
            <p className="text-xl text-zinc-800 dark:text-zinc-200">
              {currentScenario.context}
            </p>
          </div>

          <div className="p-8 space-y-4">
            <h3 className="text-sm font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-4 text-center">
              Выберите действие
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
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
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
                className={`mt-6 p-6 rounded-xl border flex flex-col items-center text-center gap-3 ${
                  lastFeedback.result === 'no'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200' 
                    : lastFeedback.result === 'yes'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-200'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {lastFeedback.result === 'no' ? (
                  <ThumbsDown className="w-12 h-12 text-red-500" />
                ) : lastFeedback.result === 'yes' ? (
                  <ThumbsUp className="w-12 h-12 text-blue-500" />
                ) : (
                  <Frown className="w-12 h-12 text-zinc-400" />
                )}
                <div>
                  <div className="font-black text-xl mb-2">
                    {lastFeedback.result === 'no' ? 'Вам отказали!' : lastFeedback.result === 'yes' ? 'Согласие' : 'Избегание'}
                  </div>
                  <div className="text-lg">{lastFeedback.text}</div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
