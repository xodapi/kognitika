const ADJECTIVES = [
  'Silent', 'Swift', 'Bright', 'Deep', 'Cold', 'Warm', 'Quick', 'Calm',
  'Bold', 'Sharp', 'Wise', 'Grand', 'Noble', 'Epic', 'Agile', 'Smart',
  'Clear', 'Hardy', 'Keen', 'Steady', 'Loyal', 'Fearless', 'Radiant', 'Stark',
  'Lunar', 'Solar', 'Aero', 'Aqua', 'Terra', 'Cyber', 'Neon', 'Vast'
];

const NOUNS = [
  'Falcon', 'Phoenix', 'Wolf', 'Hawk', 'Lion', 'Eagle', 'Tiger', 'Bear',
  'Owl', 'Raven', 'Fox', 'Lynx', 'Drake', 'Titan', 'Ghost', 'Shadow',
  'Spark', 'Core', 'Mind', 'Logic', 'Zenith', 'Apex', 'Vortex', 'Nexus',
  'Pilot', 'Sentry', 'Guard', 'Seeker', 'Walker', 'Runner', 'Blade', 'Soul'
];

/**
 * Генерирует детерминированный псевдоним вида "Adjective-Noun-1234" на основе brainId
 */
export function generatePseudonym(brainId?: string): string {
  // Простая хеш-функция для получения seed из строки
  let hash = 0;
  const seed = brainId || Math.random().toString();
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  const absHash = Math.abs(hash);
  const adj = ADJECTIVES[absHash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(absHash / ADJECTIVES.length) % NOUNS.length];
  const num = 1000 + (absHash % 9000);
  
  return `${adj}-${noun}-${num}`;
}

/**
 * Генерирует секретный токен (UUID v4)
 */
export function generateBrainId(): string {
  return crypto.randomUUID();
}
