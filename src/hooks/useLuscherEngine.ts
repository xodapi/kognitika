import { useState, useCallback } from 'react';

export interface LuscherColor {
  id: number;
  hex: string;
  name: string;
  meaning: string;
}

export const LUSCHER_COLORS: LuscherColor[] = [
  { id: 0, hex: '#004983', name: 'Синий', meaning: 'Покой, удовлетворенность, гармония и привязанность' },
  { id: 1, hex: '#1D9772', name: 'Зеленый', meaning: 'Настойчивость, самоутверждение, воля и упорство' },
  { id: 2, hex: '#F12F23', name: 'Красный', meaning: 'Возбуждение, воля к действию, активность и успех' },
  { id: 3, hex: '#F2DD00', name: 'Желтый', meaning: 'Оптимизм, надежда, ожидание лучшего и активность' },
  { id: 4, hex: '#D42481', name: 'Фиолетовый', meaning: 'Чувствительность, интуиция, эмоциональность' },
  { id: 5, hex: '#C55223', name: 'Коричневый', meaning: 'Физический стресс, потребность в покое и уюте' },
  { id: 6, hex: '#231F20', name: 'Черный', meaning: 'Протест, отрицание, агрессия и защита' },
  { id: 7, hex: '#98938D', name: 'Серый', meaning: 'Усталость, отгороженность, пассивность' }
];

export interface LuscherResult {
  scoreChange: number;
  emotionalState: 'improvement' | 'fatigue' | 'stable';
  preScore: number;
  postScore: number;
}

export function calculateLuscherShift(pre: number[], post: number[]): LuscherResult {
  if (pre.length !== 8 || post.length !== 8) {
    return { scoreChange: 0, emotionalState: 'stable', preScore: 50, postScore: 50 };
  }

  // Calculate score for a sequence:
  // We award points if basic colors (0, 1, 2, 3) are in the first 4 slots (index 0, 1, 2, 3)
  // and auxiliary colors (4, 5, 6, 7) are in the last 4 slots (index 4, 5, 6, 7).
  const getSequenceScore = (seq: number[]) => {
    let score = 0;
    seq.forEach((colorId, index) => {
      // Basic colors should be at the front
      if (colorId >= 0 && colorId <= 3) {
        score += (7 - index) * 2; // more points if closer to front (index 0 gets 14 pts, index 7 gets 0 pts)
      } else {
        score += index * 2; // auxiliary colors closer to back (index 7 gets 14 pts, index 0 gets 0)
      }
    });
    return score; // Max possible score is around 112
  };

  const preScore = getSequenceScore(pre);
  const postScore = getSequenceScore(post);
  const diff = postScore - preScore;

  // Map scores to percentages out of 100
  const maxPossible = 112;
  const prePercent = Math.round((preScore / maxPossible) * 100);
  const postPercent = Math.round((postScore / maxPossible) * 100);
  const scoreChange = postPercent - prePercent;

  let emotionalState: 'improvement' | 'fatigue' | 'stable' = 'stable';
  if (scoreChange > 3) {
    emotionalState = 'improvement';
  } else if (scoreChange < -3) {
    emotionalState = 'fatigue';
  }

  return {
    scoreChange,
    emotionalState,
    preScore: prePercent,
    postScore: postPercent
  };
}

export function useLuscherEngine() {
  const [selections, setSelections] = useState<number[]>([]);
  const [availableColors, setAvailableColors] = useState<LuscherColor[]>(LUSCHER_COLORS);

  const resetTest = useCallback(() => {
    setSelections([]);
    setAvailableColors(LUSCHER_COLORS);
  }, []);

  const selectColor = useCallback((colorId: number) => {
    setSelections(prev => {
      const next = [...prev, colorId];
      return next;
    });
    setAvailableColors(prev => prev.filter(c => c.id !== colorId));
  }, []);

  return {
    selections,
    availableColors,
    selectColor,
    resetTest,
    isFinished: selections.length === 8
  };
}
