/**
 * Module: Асинхронный диспетчер (Оркестрация потоков)
 * Тренирует разделённое внимание: 3-4 независимых процесса, кликать в нужный момент.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';

export interface Stream {
  id: number;
  label: string;
  color: string;
  progress: number;       // 0-100
  speed: number;          // progress units per tick
  targetZoneMin: number;  // 70-85 optimal zone
  targetZoneMax: number;
  status: 'ok' | 'overflow' | 'idle' | 'triggered';
  triggerCount: number;
  overflowCount: number;
  missCount: number;      // passed through target without click
}

export interface DispatcherState {
  streams: Stream[];
  timeMs: number;
  score: number;
  level: number;
  isActive: boolean;
  isFinished: boolean;
  totalTriggers: number;
  totalOverflows: number;
  totalMisses: number;
  sessionDurationMs: number;
  tickMs: number;
}

const STREAM_CONFIGS = [
  { label: 'Поток α', color: '#6366f1', speed: 1.2 },
  { label: 'Поток β', color: '#10b981', speed: 0.8 },
  { label: 'Поток γ', color: '#f59e0b', speed: 1.5 },
  { label: 'Поток δ', color: '#ef4444', speed: 1.0 },
];

function createStreams(count: number, level: number): Stream[] {
  return STREAM_CONFIGS.slice(0, count).map((cfg, i) => ({
    id: i,
    label: cfg.label,
    color: cfg.color,
    progress: Math.random() * 30, // start at random low position
    speed: cfg.speed * (1 + (level - 1) * 0.15),
    targetZoneMin: 70,
    targetZoneMax: 88,
    status: 'idle',
    triggerCount: 0,
    overflowCount: 0,
    missCount: 0,
  }));
}

export function useDispatcherEngine() {
  const [state, setState] = useState<DispatcherState>({
    streams: [],
    timeMs: 0,
    score: 0,
    level: 1,
    isActive: false,
    isFinished: false,
    totalTriggers: 0,
    totalOverflows: 0,
    totalMisses: 0,
    sessionDurationMs: 45000, // 45 sec game
    tickMs: 50,
  });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const triggersRef = useRef(0);
  const overflowsRef = useRef(0);
  const missesRef = useRef(0);
  const levelRef = useRef(1);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const endGame = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    const timeMs = Date.now() - startTimeRef.current;

    setState(prev => {
      emitEvent('TRAINING_COMPLETE', {
        type: 'SCHULTE',
        timeMs,
        score: scoreRef.current,
        level: levelRef.current,
        metadata: {
          module: 'dispatcher',
          triggers: triggersRef.current,
          overflows: overflowsRef.current,
          misses: missesRef.current,
        },
      });
      return {
        ...prev,
        isActive: false,
        isFinished: true,
        timeMs,
        score: scoreRef.current,
        totalTriggers: triggersRef.current,
        totalOverflows: overflowsRef.current,
        totalMisses: missesRef.current,
      };
    });
  }, []);

  const startGame = useCallback((level: number = 1) => {
    if (tickRef.current) clearInterval(tickRef.current);
    scoreRef.current = 0;
    triggersRef.current = 0;
    overflowsRef.current = 0;
    missesRef.current = 0;
    levelRef.current = level;

    const streamCount = Math.min(2 + level, 4);
    const streams = createStreams(streamCount, level);
    const sessionDurationMs = 45000;
    startTimeRef.current = Date.now();

    setState({
      streams,
      timeMs: 0,
      score: 0,
      level,
      isActive: true,
      isFinished: false,
      totalTriggers: 0,
      totalOverflows: 0,
      totalMisses: 0,
      sessionDurationMs,
      tickMs: 50,
    });

    const TICK = 50;
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= sessionDurationMs) {
        endGame();
        return;
      }

      setState(prev => {
        const newStreams = prev.streams.map(s => {
          let p = s.progress + s.speed * (TICK / 1000) * 100;
          let status: Stream['status'] = s.status;
          let triggerCount = s.triggerCount;
          let overflowCount = s.overflowCount;
          let missCount = s.missCount;

          // Detect when stream passes through target zone without trigger
          if (s.progress <= s.targetZoneMax && p > s.targetZoneMax && status !== 'triggered') {
            missCount += 1;
            missesRef.current += 1;
          }

          if (p >= 100) {
            p = 0;
            overflowCount += 1;
            overflowsRef.current += 1;
            status = 'overflow';
          } else if (p >= s.targetZoneMin && p <= s.targetZoneMax) {
            status = 'ok'; // in zone — green
          } else if (s.status === 'triggered') {
            // After trigger, reset to normal tracking
            status = p < s.targetZoneMin ? 'idle' : 'ok';
          } else {
            status = p < s.targetZoneMin ? 'idle' : 'idle';
          }

          return { ...s, progress: p, status, triggerCount, overflowCount, missCount };
        });

        return { ...prev, streams: newStreams, timeMs: elapsed };
      });
    }, TICK);
  }, [endGame]);

  const triggerStream = useCallback((streamId: number) => {
    setState(prev => {
      const stream = prev.streams.find(s => s.id === streamId);
      if (!stream || !prev.isActive) return prev;

      const inZone = stream.progress >= stream.targetZoneMin && stream.progress <= stream.targetZoneMax;

      if (inZone) {
        scoreRef.current += 10;
        triggersRef.current += 1;
      } else {
        // Penalty for early/late trigger
        scoreRef.current = Math.max(0, scoreRef.current - 5);
      }

      const newStreams: Stream[] = prev.streams.map(s =>
        s.id === streamId
          ? { ...s, progress: 0, status: (inZone ? 'triggered' : 'idle') as Stream['status'], triggerCount: s.triggerCount + 1 }
          : s
      );

      return {
        ...prev,
        streams: newStreams,
        score: scoreRef.current,
        totalTriggers: triggersRef.current,
      };
    });
  }, []);

  return { state, startGame, triggerStream };
}
