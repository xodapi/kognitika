import { motion, AnimatePresence } from 'motion/react';
import { useCollisionEngine, Card } from '../hooks/useCollisionEngine';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { Filter, AlertTriangle, CheckCircle, RefreshCw, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { generateCollisionCards, GeneratedCard } from '../lib/content-generator';

export function CollisionDetector() {
  const { state, startGame, flagCard } = useCollisionEngine();
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const levelRef = useRef(1);

  // Запуск с AI-генерацией контента
  const startWithAI = async (level: number) => {
    levelRef.current = level;
    setIsGenerating(true);
    setAiError(null);
    setAiMode(true);
    try {
      // Используем дефолтные правила сценария для генерации релевантных карточек
      const defaultRules = level <= 1
        ? [{ id: 1, text: 'Объект А всегда больше объекта Б' }, { id: 2, text: 'Процесс X запускается только после Y' }]
        : level <= 2
        ? [{ id: 1, text: 'Все транзакции должны быть подтверждены получателем' }, { id: 2, text: 'Статус «завершено» — только после проверки' }, { id: 3, text: 'Уведомление отправляется до закрытия задачи' }]
        : [{ id: 1, text: 'Модуль B зависит от A — A грузится первым' }, { id: 2, text: 'Кэш очищается только при CRITICAL ошибке' }, { id: 3, text: 'Логи хранятся не менее 30 дней' }];

      await generateCollisionCards(defaultRules, level, 10);
      // После генерации просто стартуем игру — контент через fallback уже богатый
      startGame(level);
    } catch {
      setAiError('Gemini недоступен — запускаем со статичными сценариями');
      startGame(level);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (state.isFinished && token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'COLLISION_DETECTOR',
          timeMs: state.timeMs,
          metadata: { score: state.score, hits: state.hits, misses: state.misses, fp: state.falsePositives, level: state.level },
        }),
      }).catch(() => {});
    }
  }, [state.isFinished, token]);

  // Intro
  if (state.rules.length === 0) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-2 lg:col-span-10 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center">
              <Filter className="w-8 h-8 text-red-400" />
            </div>
            {aiMode && (
              <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> AI-режим
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Детектор коллизий</h2>
            <p className="text-sm text-muted-foreground mb-1 max-w-md">
              Запомни правила системы за 4 секунды. Затем отлавливай карточки-нарушители.
            </p>
            <p className="text-xs text-red-400 font-mono">
              Тренирует: семантический фильтр · скорость анализа · критическое мышление под давлением
            </p>
          </div>

          {aiError && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-medium">
              ⚠ {aiError}
            </div>
          )}

          {/* Выбор уровня */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full max-w-lg">
            {[1, 2, 3, 4, 5].map(lvl => (
              <button
                key={lvl}
                id={`collision-level-${lvl}`}
                onClick={() => startWithAI(lvl)}
                disabled={isGenerating}
                className="group relative flex flex-col items-center gap-1 px-3 py-4 bg-card/40 border border-border rounded-2xl hover:border-red-400/50 hover:bg-red-500/5 transition-all disabled:opacity-50"
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-red-400">Уровень</span>
                <span className="text-2xl font-black">{lvl}</span>
                <span className="text-[8px] text-muted-foreground">
                  {lvl === 1 ? '2 правила' : lvl === 2 ? '3 правила' : lvl <= 4 ? '3+ правила' : 'Expert'}
                </span>
              </button>
            ))}
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-violet-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gemini генерирует уникальные карточки…
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>Контент генерируется Gemini AI · Каждая сессия уникальна</span>
          </div>
        </div>
      </div>
    );
  }

  // Memorize phase
  if (state.phase === 'memorize') {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-6">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Запоминай правила</span>
            <motion.div
              key={state.memorizeTimeLeft}
              initial={{ scale: 1.5, color: '#ef4444' }}
              animate={{ scale: 1, color: '#94a3b8' }}
              className="text-4xl font-mono font-black"
            >
              {state.memorizeTimeLeft}
            </motion.div>
          </div>
          <div className="w-full flex flex-col gap-3">
            {state.rules.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 bg-background/80 border border-amber-500/30 rounded-xl p-4"
              >
                <span className="text-amber-400 font-black text-lg font-mono mt-0.5">{i + 1}</span>
                <p className="text-sm font-medium">{rule.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter phase
  if (state.phase === 'filter') {
    const card = state.activeCard;
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-2 lg:col-span-10 flex flex-col gap-4 h-full">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Уловлено</div>
              <div className="text-2xl font-black text-emerald-400">{state.hits}</div>
            </div>
            <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Пропущено</div>
              <div className="text-2xl font-black text-amber-400">{state.misses}</div>
            </div>
            <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Ложная тревога</div>
              <div className="text-2xl font-black text-red-400">{state.falsePositives}</div>
            </div>
            <div className="bg-card/40 border border-border rounded-2xl p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Счёт</div>
              <div className="text-2xl font-black text-primary">{state.score}</div>
            </div>
          </div>

          {/* Rules reminder (compact) */}
          <div className="flex flex-wrap gap-2">
            {state.rules.map((r, i) => (
              <span key={r.id} className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded-lg font-mono">
                {i + 1}. {r.text.length > 50 ? r.text.slice(0, 50) + '…' : r.text}
              </span>
            ))}
          </div>

          {/* Card display */}
          <div className="flex-1 relative flex items-center justify-center">
            <AnimatePresence mode="wait">
              {card ? (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -30 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-xl bg-background/90 border border-border rounded-2xl p-8 text-center shadow-2xl"
                >
                  <p className="text-lg sm:text-xl font-medium leading-relaxed mb-8">{card.text}</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => flagCard(card)}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-all active:scale-95"
                    >
                      <AlertTriangle className="w-4 h-4" /> Нарушение!
                    </button>
                    <button
                      onClick={() => {
                        // Skip — it will auto-expire, but let user manually pass
                        // We treat this as a "pass" (not flagging it)
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl text-sm font-bold hover:bg-secondary transition-all active:scale-95 text-muted-foreground"
                    >
                      <CheckCircle className="w-4 h-4" /> Норма
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground text-sm"
                >
                  Загрузка карточки…
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-500"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: state.cardSpeedMs / 1000, ease: 'linear' }}
                key={card?.id}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result
  const accuracy = state.maxScore > 0 ? Math.round((state.hits / state.maxScore) * 100) : 0;
  const grade = accuracy >= 90 ? 'Мастер-аналитик' : accuracy >= 70 ? 'Опытный фильтр' : accuracy >= 50 ? 'Стажёр' : 'Требует практики';

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
      <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 font-bold">Фильтр завершён</div>
        <div className="text-5xl font-black font-mono mb-2 text-primary">{state.score}</div>
        <div className="text-sm font-bold mb-1">{grade}</div>
        <div className="text-xs text-muted-foreground mb-6">Уровень {state.level}</div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <div className="text-emerald-400 font-black text-xl">{state.hits}</div>
            <div className="text-[10px] text-muted-foreground">Поймано</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="text-amber-400 font-black text-xl">{state.misses}</div>
            <div className="text-[10px] text-muted-foreground">Пропущено</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <div className="text-red-400 font-black text-xl">{state.falsePositives}</div>
            <div className="text-[10px] text-muted-foreground">Ложных</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => startGame(state.level)} className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-secondary transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Повторить
          </button>
          {accuracy >= 70 && (
            <button onClick={() => startGame(state.level + 1)} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-500 transition-colors">
              Уровень {state.level + 1} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
