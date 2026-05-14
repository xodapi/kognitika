/**
 * Module: Редукция шума (Inhibitory Control)
 * Тренирует тормозной контроль — подавление импульсивных реакций на яркие раздражители.
 * Пользователь должен реагировать ТОЛЬКО на целевой паттерн в центре,
 * игнорируя провоцирующие вспышки по краям.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';

// ──────────────────────────────────────────────
// Типы
// ──────────────────────────────────────────────

export type TargetPatternType = 'pulse' | 'color_shift' | 'shape_change' | 'symbol_flip';

export interface Distractor {
  id: string;
  x: number;         // % от ширины экрана
  y: number;         // % от высоты экрана
  intensity: 'subtle' | 'moderate' | 'aggressive';
  color: string;
  size: number;      // rem
  duration: number;  // мс до исчезновения
  isActive: boolean;
}

export interface NoiseReductionState {
  phase: 'ready' | 'training' | 'result';
  targetSignal: boolean;           // true = целевой паттерн активен (нужно нажать)
  targetPatternType: TargetPatternType;
  distractors: Distractor[];
  hits: number;                    // правильные нажатия на сигнал
  misses: number;                  // пропущенные сигналы
  falseAlarms: number;             // нажатия на дистракторы или фон
  score: number;
  timeMs: number;
  level: number;
  signalStrength: number;          // 0-100, насколько заметен целевой сигнал
  signalDurationMs: number;        // как долго сигнал остаётся активным
  distractorFrequency: number;     // дистракторов в секунду
  isFinished: boolean;
  sessionDurationMs: number;
}

interface LevelConfig {
  signalStrength: number;
  signalIntervalMs: [number, number]; // [min, max] случайный интервал
  signalDurationMs: number;
  distractorFrequency: number;
  distractorIntensity: Distractor['intensity'];
  sessionDurationMs: number;
  penaltyPerFalseAlarm: number;
}

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: { signalStrength: 90, signalIntervalMs: [3000, 5000], signalDurationMs: 1500, distractorFrequency: 0.5, distractorIntensity: 'subtle',     sessionDurationMs: 60000, penaltyPerFalseAlarm: 5  },
  2: { signalStrength: 65, signalIntervalMs: [2500, 4000], signalDurationMs: 1200, distractorFrequency: 1.0, distractorIntensity: 'moderate',    sessionDurationMs: 60000, penaltyPerFalseAlarm: 10 },
  3: { signalStrength: 35, signalIntervalMs: [2000, 3500], signalDurationMs: 900,  distractorFrequency: 1.8, distractorIntensity: 'aggressive',   sessionDurationMs: 90000, penaltyPerFalseAlarm: 20 },
  4: { signalStrength: 15, signalIntervalMs: [1500, 3000], signalDurationMs: 600,  distractorFrequency: 2.5, distractorIntensity: 'aggressive',   sessionDurationMs: 90000, penaltyPerFalseAlarm: 50 },
};

const DISTRACTOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6',
];

const QUADRANT_POSITIONS = [
  // Углы — основные зоны дистракторов (механика периферийного зрения)
  { x: 8,  y: 12 }, { x: 85, y: 12 },
  { x: 8,  y: 78 }, { x: 85, y: 78 },
  // Края
  { x: 45, y: 8  }, { x: 45, y: 82 },
  { x: 5,  y: 45 }, { x: 90, y: 45 },
  // Второй слой
  { x: 20, y: 25 }, { x: 72, y: 25 },
  { x: 20, y: 65 }, { x: 72, y: 65 },
];

function createDistractor(intensity: Distractor['intensity']): Distractor {
  const pos = QUADRANT_POSITIONS[Math.floor(Math.random() * QUADRANT_POSITIONS.length)];
  const sizes = { subtle: 1.5, moderate: 2.5, aggressive: 4 };
  const durations = { subtle: 600, moderate: 800, aggressive: 1200 };

  return {
    id: Math.random().toString(36).slice(2),
    x: pos.x + (Math.random() - 0.5) * 10,
    y: pos.y + (Math.random() - 0.5) * 8,
    intensity,
    color: DISTRACTOR_COLORS[Math.floor(Math.random() * DISTRACTOR_COLORS.length)],
    size: sizes[intensity],
    duration: durations[intensity] + Math.random() * 400,
    isActive: true,
  };
}

// ──────────────────────────────────────────────
// Хук
// ──────────────────────────────────────────────

export function useNoiseReductionEngine() {
  const [state, setState] = useState<NoiseReductionState>({
    phase: 'ready',
    targetSignal: false,
    targetPatternType: 'pulse',
    distractors: [],
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    score: 0,
    timeMs: 0,
    level: 1,
    signalStrength: 90,
    signalDurationMs: 1500,
    distractorFrequency: 0.5,
    isFinished: false,
    sessionDurationMs: 60000,
  });

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const distractorRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef    = useRef<number>(0);
  const signalActiveRef = useRef(false); // сигнал активен — избегаем closure stale state
  const hitsRef         = useRef(0);
  const missesRef       = useRef(0);
  const falseAlarmsRef  = useRef(0);
  const configRef       = useRef<LevelConfig>(LEVEL_CONFIGS[1]);

  const cleanup = useCallback(() => {
    [timerRef, signalRef, distractorRef, sessionRef].forEach(r => {
      if (r.current) { clearInterval(r.current as any); clearTimeout(r.current as any); }
      r.current = null;
    });
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Запланировать следующий сигнал
  const scheduleSignal = useCallback(() => {
    const cfg = configRef.current;
    const [min, max] = cfg.signalIntervalMs;
    const delay = min + Math.random() * (max - min);

    signalRef.current = setTimeout(() => {
      // Активировать сигнал
      signalActiveRef.current = true;
      setState(prev => ({ ...prev, targetSignal: true }));

      // Автоматически убрать сигнал через signalDurationMs
      setTimeout(() => {
        if (signalActiveRef.current) {
          // Игрок пропустил
          missesRef.current += 1;
          signalActiveRef.current = false;
          setState(prev => ({
            ...prev,
            targetSignal: false,
            misses: missesRef.current,
            score: Math.max(0, hitsRef.current * 10 - falseAlarmsRef.current * cfg.penaltyPerFalseAlarm),
          }));
        }
        scheduleSignal();
      }, cfg.signalDurationMs);
    }, delay);
  }, []);

  const startGame = useCallback((level: number = 1) => {
    cleanup();
    hitsRef.current = 0;
    missesRef.current = 0;
    falseAlarmsRef.current = 0;
    signalActiveRef.current = false;

    const cfg = LEVEL_CONFIGS[Math.min(level, 4)] ?? LEVEL_CONFIGS[4];
    configRef.current = cfg;

    setState({
      phase: 'training',
      targetSignal: false,
      targetPatternType: 'pulse',
      distractors: [],
      hits: 0,
      misses: 0,
      falseAlarms: 0,
      score: 0,
      timeMs: 0,
      level,
      signalStrength: cfg.signalStrength,
      signalDurationMs: cfg.signalDurationMs,
      distractorFrequency: cfg.distractorFrequency,
      isFinished: false,
      sessionDurationMs: cfg.sessionDurationMs,
    });

    startTimeRef.current = Date.now();

    // Таймер сессии
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, timeMs: Date.now() - startTimeRef.current }));
    }, 100);

    // Генератор дистракторов
    const distractorInterval = Math.floor(1000 / cfg.distractorFrequency);
    distractorRef.current = setInterval(() => {
      const d = createDistractor(cfg.distractorIntensity);
      setState(prev => ({ ...prev, distractors: [...prev.distractors.slice(-8), d] }));
      // Убрать дистрактор после его duration
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          distractors: prev.distractors.filter(x => x.id !== d.id),
        }));
      }, d.duration);
    }, distractorInterval);

    // Конец сессии
    sessionRef.current = setTimeout(() => {
      cleanup();
      setState(prev => {
        const finalScore = Math.max(0,
          hitsRef.current * 10 - falseAlarmsRef.current * cfg.penaltyPerFalseAlarm
        );
        emitEvent('TRAINING_COMPLETE', {
          type: 'SCHULTE',
          timeMs: cfg.sessionDurationMs,
          score: finalScore,
          level,
          metadata: {
            module: 'noise_reduction',
            hits: hitsRef.current,
            misses: missesRef.current,
            falseAlarms: falseAlarmsRef.current,
            inhibitoryControlIndex: hitsRef.current / Math.max(1, hitsRef.current + falseAlarmsRef.current),
          },
        });
        return {
          ...prev,
          phase: 'result',
          isFinished: true,
          score: finalScore,
          hits: hitsRef.current,
          misses: missesRef.current,
          falseAlarms: falseAlarmsRef.current,
          timeMs: cfg.sessionDurationMs,
        };
      });
    }, cfg.sessionDurationMs);

    // Запустить первый сигнал
    scheduleSignal();
  }, [cleanup, scheduleSignal]);

  /**
   * Вызывается когда пользователь нажимает на ЦЕНТРАЛЬНУЮ зону (целевой паттерн)
   */
  const reactToSignal = useCallback(() => {
    if (signalActiveRef.current) {
      // Правильная реакция
      hitsRef.current += 1;
      signalActiveRef.current = false;
      if (signalRef.current) clearTimeout(signalRef.current);
      setState(prev => ({
        ...prev,
        targetSignal: false,
        hits: hitsRef.current,
        score: Math.max(0,
          hitsRef.current * 10 - falseAlarmsRef.current * configRef.current.penaltyPerFalseAlarm
        ),
      }));
      scheduleSignal();
    } else {
      // Ложная тревога — нажал когда сигнала не было
      falseAlarmsRef.current += 1;
      setState(prev => ({
        ...prev,
        falseAlarms: falseAlarmsRef.current,
        score: Math.max(0,
          hitsRef.current * 10 - falseAlarmsRef.current * configRef.current.penaltyPerFalseAlarm
        ),
      }));
    }
  }, [scheduleSignal]);

  /**
   * Вызывается когда пользователь нажал на дистрактор (штраф)
   */
  const reactToDistractor = useCallback(() => {
    falseAlarmsRef.current += 1;
    setState(prev => ({
      ...prev,
      falseAlarms: falseAlarmsRef.current,
      score: Math.max(0,
        hitsRef.current * 10 - falseAlarmsRef.current * configRef.current.penaltyPerFalseAlarm
      ),
    }));
  }, []);

  const stopGame = useCallback(() => {
    cleanup();
    setState(prev => ({ ...prev, phase: 'result', isFinished: true }));
  }, [cleanup]);

  return { state, startGame, stopGame, reactToSignal, reactToDistractor };
}
