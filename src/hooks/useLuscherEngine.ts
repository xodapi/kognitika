import { useState, useCallback } from 'react';

export interface LuscherColor {
  id: number;
  hex: string;
  name: string;
}

export const LUSCHER_COLORS: LuscherColor[] = [
  { id: 0, hex: '#004983', name: 'Синий' },
  { id: 1, hex: '#1D9772', name: 'Зеленый' },
  { id: 2, hex: '#F12F23', name: 'Красный' },
  { id: 3, hex: '#F2DD00', name: 'Желтый' },
  { id: 4, hex: '#D42481', name: 'Фиолетовый' },
  { id: 5, hex: '#C55223', name: 'Коричневый' },
  { id: 6, hex: '#231F20', name: 'Черный' },
  { id: 7, hex: '#98938D', name: 'Серый' },
];

export interface LuscherResult {
  scoreChange: number;
  comparison: 'higher' | 'lower' | 'unchanged';
  preScore: number;
  postScore: number;
}

export function calculateLuscherShift(pre: number[], post: number[]): LuscherResult {
  if (pre.length !== 8 || post.length !== 8) {
    return { scoreChange: 0, comparison: 'unchanged', preScore: 50, postScore: 50 };
  }

  // This is a deterministic comparison of two color orderings, not a measure of wellbeing.
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

  let comparison: 'higher' | 'lower' | 'unchanged' = 'unchanged';
  if (scoreChange > 3) {
    comparison = 'higher';
  } else if (scoreChange < -3) {
    comparison = 'lower';
  }

  return {
    scoreChange,
    comparison,
    preScore: prePercent,
    postScore: postPercent,
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
