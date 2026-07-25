export const STROOP_COLORS = [
  { text: 'КРАСНЫЙ', color: 'hsl(var(--destructive))', id: 'red', textColor: '#ef4444' },
  { text: 'СИНИЙ', color: 'hsl(var(--primary))', id: 'blue', textColor: '#3b82f6' },
  { text: 'ЗЕЛЕНЫЙ', color: 'hsl(142, 71%, 45%)', id: 'green', textColor: '#22c55e' },
  { text: 'ЖЕЛТЫЙ', color: 'hsl(47, 95%, 52%)', id: 'yellow', textColor: '#eab308' },
] as const;

export type StroopColorId = (typeof STROOP_COLORS)[number]['id'];
