import React from 'react';
import { useSocialEQEngine, DialogueOption } from '../hooks/useSocialEQEngine';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, UserCheck, MessageSquare, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SocialEQ({ onFinish }: { onFinish?: () => void }) {
  const {
    currentScenario,
    progress,
    isActive,
    isFinished,
    score,
    startSession,
    submitAnswer,
    lastFeedback
  } = useSocialEQEngine(Math.random(), 1);

  if (isFinished) {
    return (
      <Card className="max-w-2xl mx-auto shadow-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="text-green-500" />
            Итоги симуляции
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-medium mb-2">Социальный интеллект (EQ)</h3>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
              {score} XP
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-4">
              Вы отлично справляетесь с деэскалацией конфликтов.
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
            <MessageSquare className="text-indigo-500" />
            Симулятор сложных диалогов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-300 text-lg">
            Вместо «удобного» ИИ мы моделируем неудобного собеседника (коллегу или клиента).
            Ваша задача — распознать эмоции и найти win-win решение, не скатываясь в агрессию или чрезмерную уступчивость.
          </p>
          
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-indigo-600 dark:text-indigo-400 mt-1" />
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              Выбирайте ответы, которые признают эмоции собеседника, но не вредят проекту.
            </p>
          </div>

          <Button 
            onClick={startSession} 
            className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Play className="mr-2" />
            Начать симуляцию
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-indigo-500" />
          <span className="font-bold">Social EQ</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-500">Очки: {score}</div>
          <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
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
          {/* Контекст */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Ситуация
            </h3>
            <p className="text-zinc-800 dark:text-zinc-200">
              {currentScenario.context}
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Реплика собеседника */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                {currentScenario.avatar}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-500 mb-1">
                  {currentScenario.interlocutor}
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl rounded-tl-none p-4 text-zinc-800 dark:text-zinc-200">
                  {currentScenario.statements[0].text}
                </div>
              </div>
            </div>

            {/* Обратная связь */}
            {lastFeedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-xl border ${
                  lastFeedback.isOptimal 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200' 
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-200'
                }`}
              >
                <div className="font-bold mb-1">
                  {lastFeedback.isOptimal ? 'Отлично!' : 'Можно лучше:'}
                </div>
                <div>{lastFeedback.text}</div>
              </motion.div>
            )}

            {/* Варианты ответов */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-500 mb-2">Ваш ответ:</div>
              {currentScenario.statements[0].options.map((option) => (
                <button
                  key={option.id}
                  disabled={!!lastFeedback}
                  onClick={() => submitAnswer(option)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    lastFeedback 
                      ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
