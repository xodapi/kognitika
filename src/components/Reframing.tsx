import React from 'react';
import { useReframingEngine } from '../hooks/useReframingEngine';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Lightbulb, RefreshCw, Play, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompletionRecommendation } from './CompletionRecommendation';

export function Reframing({ onFinish }: { onFinish?: () => void }) {
  const {
    currentScenario,
    progress,
    isActive,
    isFinished,
    score,
    startSession,
    submitAnswer,
    lastFeedback
  } = useReframingEngine(Math.random(), 1);

  if (isFinished) {
    return (
      <Card className="max-w-2xl mx-auto shadow-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="text-emerald-500" />
            Итоги рефрейминга
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-xl text-center">
            <h3 className="text-xl font-medium mb-2">Навык: "Фича, а не баг"</h3>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {score} XP
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-4">
              Умение видеть возможности в неудачах — ключевой навык антихрупкости.
            </p>
          </div>
          <CompletionRecommendation
            sourceModuleId="reframing"
            score={score}
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
            <RefreshCw className="text-emerald-500" />
            Фича, а не баг (Рефрейминг)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-300 text-lg">
            Учитесь превращать негативные ситуации в конструктивный опыт. 
            Ваша задача — выбрать вариант ответа, который не обесценивает проблему, а находит в ней точку роста.
          </p>
          
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg flex items-start gap-3">
            <Lightbulb className="text-emerald-600 dark:text-emerald-400 mt-1" />
            <p className="text-sm text-emerald-900 dark:text-emerald-200">
              Избегайте перекладывания ответственности и катастрофизации. Ищите пользу.
            </p>
          </div>

          <Button 
            onClick={startSession} 
            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="mr-2" />
            Начать тренировку
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <RefreshCw className="text-emerald-500" />
          <span className="font-bold">Рефрейминг</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-500">Очки: {score}</div>
          <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
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
          <div className="bg-red-50 dark:bg-red-900/10 p-8 border-b border-zinc-200 dark:border-zinc-800 text-center">
            <h3 className="text-sm font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-4">
              Негативная ситуация (Баг)
            </h3>
            <p className="text-2xl font-medium text-zinc-800 dark:text-zinc-200">
              «{currentScenario.negativeSituation}»
            </p>
          </div>

          <div className="p-8 space-y-4">
            <h3 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider mb-4 text-center">
              Выберите лучший рефрейминг (Фича)
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
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
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
                  lastFeedback.isOptimal 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-200'
                }`}
              >
                {lastFeedback.isOptimal ? (
                  <CheckCircle2 className="mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold mb-1">
                    {lastFeedback.isOptimal ? 'Отличный выбор!' : 'Не совсем так'}
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
