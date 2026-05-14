import { useState, useCallback, useEffect, useRef } from 'react';
import { emitEvent } from './useEventBus';

export type SpatialPhase = 'idle' | 'memorize' | 'recall' | 'result';

export interface SpatialCell {
  id: number;
  isActive: boolean;
  isRevealed: boolean;
  isCorrect: boolean;
}

export interface SpatialState {
  level: number;
  gridSize: number;
  activeCount: number;
  grid: SpatialCell[];
  phase: SpatialPhase;
  score: number;
  errors: number;
}

export function useSpatialEngine() {
  const [state, setState] = useState<SpatialState>({
    level: 1,
    gridSize: 4,
    activeCount: 3,
    grid: [],
    phase: 'idle',
    score: 0,
    errors: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateLevel = useCallback((level: number, seed?: number) => {
    const size = Math.min(6, 3 + Math.floor(level / 3));
    const count = 3 + Math.floor(level / 2);
    const total = size * size;

    // Deterministic random if seed provided
    const random = () => {
      if (seed !== undefined) {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }
      return Math.random();
    };

    const newGrid: SpatialCell[] = Array.from({ length: total }, (_, i) => ({
      id: i,
      isActive: false,
      isRevealed: false,
      isCorrect: false
    }));

    const activeIndices = new Set<number>();
    while (activeIndices.size < count) {
      activeIndices.add(Math.floor(random() * total));
    }

    activeIndices.forEach(idx => {
      newGrid[idx].isActive = true;
    });

    setState(prev => ({
      ...prev,
      level,
      gridSize: size,
      activeCount: count,
      grid: newGrid,
      phase: 'memorize'
    }));

    const memoTime = (2 + Math.max(0, 3 - level * 0.2)) * 1000;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState(s => ({ ...s, phase: 'recall' }));
    }, memoTime);
  }, []);

  const handleCellClick = useCallback((id: number) => {
    setState(s => {
      if (s.phase !== 'recall') return s;
      
      const newGrid = [...s.grid];
      const cell = { ...newGrid[id] };
      if (cell.isRevealed) return s;

      cell.isRevealed = true;
      newGrid[id] = cell;

      if (cell.isActive) {
        cell.isCorrect = true;
        const revealedActive = newGrid.filter(c => c.isActive && c.isRevealed).length;
        
        if (revealedActive === s.activeCount) {
          // Success! Next level
          setTimeout(() => generateLevel(s.level + 1), 300);
          return { ...s, grid: newGrid, score: s.score + s.level * 10 };
        }
        return { ...s, grid: newGrid };
      } else {
        // Mistake! Game over
        cell.isCorrect = false;
        
        emitEvent('MISTAKE_MADE', {
          expected: 'active_cell',
          actual: 'empty_cell',
          cellId: id
        });

        emitEvent('TRAINING_COMPLETE', {
          type: 'SPATIAL',
          level: s.level,
          score: s.score,
          errors: s.errors + 1,
          timeMs: 0
        });

        return { ...s, grid: newGrid, phase: 'result', errors: s.errors + 1 };
      }
    });
  }, [generateLevel]);

  const startTraining = useCallback(() => {
    setState(s => ({ ...s, score: 0, errors: 0, level: 1 }));
    generateLevel(1);
  }, [generateLevel]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, startTraining, handleCellClick };
}
