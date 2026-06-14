/**
 * Компонент: Редукция шума (Inhibitory Control Trainer)
 * Тренирует способность игнорировать яркие провоцирующие стимулы
 * и реагировать только на едва заметный целевой паттерн в центре.
 */
import { motion, AnimatePresence } from 'motion/react';
import { useNoiseReductionEngine } from '../hooks/useNoiseReductionEngine';
import { Play, Shield, AlertTriangle, Eye, Zap, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PostGameInsight } from './PostGameInsight';

interface NoiseReductionProps {
  level?: number;
  onComplete?: () => void;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function NoiseReduction({ level = 1, onComplete }: NoiseReductionProps) {
  const { state, startGame, stopGame, reactToSignal, reactToDistractor } = useNoiseReductionEngine();
  const navigate = useNavigate();

  const inhibitoryIndex = state.hits + state.falseAlarms > 0
    ? Math.round((state.hits / Math.max(1, state.hits + state.falseAlarms)) * 100)
    : 100;

  // ─── ЭКРАН ГОТОВНОСТИ ───────────────────────────────────
  if (state.phase === 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <Shield className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">Редукция шума</h1>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
            Яркие вспышки по краям — ловушка. Реагируй только на едва заметный сигнал в центре.
            Каждый ложный клик — штраф. Тренировка тормозного контроля.
          </p>
        </motion.div>

        {/* Правила */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full"
        >
          {[
            { icon: Eye, color: 'text-blue-400', title: 'Soft focus', desc: 'Не фиксируй взгляд. Охватывай весь экран периферией.' },
            { icon: Target, color: 'text-emerald-400', title: 'Только центр', desc: 'Нажимай ТОЛЬКО когда мигает центральный элемент.' },
            { icon: AlertTriangle, color: 'text-amber-400', title: 'Не поддавайся', desc: 'Яркие вспышки по краям — штраф за клик.' },
          ].map((rule, i) => (
            <div key={i} className="bg-card/40 border border-border rounded-2xl p-4">
              <rule.icon className={`w-5 h-5 mb-2 ${rule.color}`} />
              <p className="font-bold text-sm mb-1">{rule.title}</p>
              <p className="text-xs text-muted-foreground">{rule.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Выбор уровня */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(lvl => (
              <button
                key={lvl}
                id={`noise-level-${lvl}`}
                onClick={() => startGame(lvl)}
                className={`px-6 py-3 rounded-2xl font-black text-sm border transition-all
                  ${lvl === level
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-card/40 border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
              >
                <span className="block text-xs font-normal opacity-60 mb-0.5">УРОВЕНЬ</span>
                {lvl}
              </button>
            ))}
          </div>
          <button
            id="noise-start-btn"
            onClick={() => startGame(level)}
            className="flex items-center gap-2 px-10 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            Начать тренировку
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── ЭКРАН РЕЗУЛЬТАТА ────────────────────────────────────
  if (state.phase === 'result') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4"
      >
        <PostGameInsight
          gameType="NOISE_REDUCTION"
          score={inhibitoryIndex}
          timeMs={state.timeMs}
          errors={state.misses + state.falseAlarms}
          onPlayAgain={() => startGame(state.level)}
          onBackToMenu={() => {
            onComplete?.();
            navigate('/');
          }}
        />
        <button
          id="noise-next-level-btn"
          onClick={() => startGame(Math.min(state.level + 1, 4))}
          className="px-8 py-3 bg-card/40 border border-border rounded-2xl font-bold hover:border-primary/50 transition-all"
        >
          Уровень {Math.min(state.level + 1, 4)}
        </button>
      </motion.div>
    );
  }

  // ─── ЭКРАН ТРЕНИРОВКИ ────────────────────────────────────
  const remaining = Math.max(0, state.sessionDurationMs - state.timeMs);

  return (
    <div
      id="noise-training-arena"
      className="relative w-full overflow-hidden rounded-3xl"
      style={{ height: 'calc(100vh - 160px)', minHeight: 480 }}
    >
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="bg-background/80 backdrop-blur-md border border-border rounded-2xl px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-black text-lg">{state.score}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="text-sm font-bold text-emerald-400">{state.hits} ✓</div>
          <div className="text-sm font-bold text-red-400">{state.falseAlarms} ✗</div>
        </div>

        <div className="bg-background/80 backdrop-blur-md border border-border rounded-2xl px-4 py-2">
          <span className="font-mono font-bold text-lg">{formatTime(remaining)}</span>
        </div>
      </div>

      {/* Фон тренировки — тёмная арена */}
      <div className="absolute inset-0 bg-gray-950/95 rounded-3xl" />

      {/* Дистракторы — яркие вспышки по краям */}
      <AnimatePresence>
        {state.distractors.filter(d => d.isActive).map(d => (
          <motion.button
            key={d.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => reactToDistractor()}
            className="absolute rounded-full cursor-pointer z-10 border-2 border-white/20"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: `${d.size}rem`,
              height: `${d.size}rem`,
              background: `radial-gradient(circle, ${d.color}cc, ${d.color}44)`,
              boxShadow: `0 0 ${d.intensity === 'aggressive' ? 30 : 15}px ${d.color}88`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Центральный целевой элемент */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <motion.button
          id="noise-signal-target"
          onClick={() => reactToSignal()}
          className="relative flex items-center justify-center rounded-full transition-all"
          style={{ width: '7rem', height: '7rem' }}
          whileTap={{ scale: 0.92 }}
        >
          {/* Базовый круг */}
          <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />

          {/* Пульсация — целевой сигнал */}
          <AnimatePresence>
            {state.targetSignal && (
              <>
                {/* Кольца пульсации */}
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.8 + i * 0.4, opacity: 0 }}
                    transition={{ duration: 0.9, delay: i * 0.25, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-400"
                  />
                ))}
                {/* Центральная точка */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-4 rounded-full bg-emerald-400/80"
                  style={{ filter: `blur(${(100 - state.signalStrength) * 0.12}px)` }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Иконка подсказки */}
          <Target className="w-6 h-6 text-white/20 relative z-10" />
        </motion.button>
      </div>

      {/* Прогресс-бар сессии */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${(remaining / state.sessionDurationMs) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Кнопка стоп */}
      <button
        id="noise-stop-btn"
        onClick={stopGame}
        className="absolute bottom-8 right-4 z-20 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white/60 transition-all"
      >
        Стоп
      </button>
    </div>
  );
}
