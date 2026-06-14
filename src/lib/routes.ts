export const APP_ROUTE_PATHS = [
  '/',
  '/dashboard',
  '/leaderboard',
  '/schulte',
  '/numerical',
  '/logical',
  '/stroop',
  '/nback',
  '/situational',
  '/typing',
  '/spatial',
  '/objective',
  '/profiling',
  '/anomaly',
  '/dialogue',
  '/admin',
  '/ideas',
  '/topology',
  '/collision',
  '/dispatcher',
  '/noise',
  '/scanner',
  '/decryptor',
  '/reality',
  '/silence',
  '/filter',
  '/hype',
  '/reframing',
  '/rejection',
  '/storytelling',
  '/focus',
] as const;

export const RECOMMENDED_GAME_ROUTES = {
  schulte: '/schulte',
  stroop: '/stroop',
  nback: '/nback',
  numerical: '/numerical',
  logical: '/logical',
  situational: '/situational',
  typing: '/typing',
  spatial: '/spatial',
  anomaly: '/anomaly',
  dialogue: '/dialogue',
  topology: '/topology',
  collision: '/collision',
  dispatcher: '/dispatcher',
  noise: '/noise',
  scanner: '/scanner',
  decryptor: '/decryptor',
  reality: '/reality',
  objective: '/objective',
  profiling: '/profiling',
  silence: '/silence',
  filter: '/filter',
  hype: '/hype',
  reframing: '/reframing',
  rejection: '/rejection',
  storytelling: '/storytelling',
  focus: '/focus',
} as const satisfies Record<string, (typeof APP_ROUTE_PATHS)[number]>;

const appRouteSet = new Set<string>(APP_ROUTE_PATHS);

export function isAppRoute(path: string) {
  return appRouteSet.has(path);
}

export function routeForRecommendedGame(game: string | null | undefined) {
  const key = String(game || '').trim().toLowerCase();
  return RECOMMENDED_GAME_ROUTES[key as keyof typeof RECOMMENDED_GAME_ROUTES] || '/schulte';
}
