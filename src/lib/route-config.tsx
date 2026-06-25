import { lazy, type ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Play, Calculator, Grid3x3, Palette, BrainCircuit,
  Users, Trophy, Lightbulb, Shield, GitBranch, Filter, Cpu, VolumeX,
  Search, Network, Target, MessageSquare, Lock,
} from 'lucide-react';

export function lazyNamed<TProps extends object = Record<string, never>>(
  loader: () => Promise<unknown>,
  exportName: string,
) {
  return lazy(async () => {
    const module = await loader() as Record<string, ComponentType<TProps>>;
    return { default: module[exportName] };
  });
}

export const Dashboard = lazyNamed<{ onStartGame: (game: string) => void }>(
  () => import('../components/Dashboard'),
  'Dashboard',
);
export const LeaderboardView = lazyNamed(() => import('../components/LeaderboardView'), 'LeaderboardView');
export const SchulteGrid = lazyNamed(() => import('../components/SchulteGrid'), 'SchulteGrid');
export const NumericalAnalysis = lazyNamed(() => import('../components/NumericalAnalysis'), 'NumericalAnalysis');
export const LogicalMatrix = lazyNamed(() => import('../components/LogicalMatrix'), 'LogicalMatrix');
export const StroopTest = lazyNamed(() => import('../components/StroopTest'), 'StroopTest');
export const NBackTest = lazyNamed(() => import('../components/NBackTest'), 'NBackTest');
export const SituationalJudgmentTest = lazyNamed(() => import('../components/SituationalJudgmentTest'), 'SituationalJudgmentTest');
export const SpeedTyping = lazyNamed(() => import('../components/SpeedTyping'), 'SpeedTyping');
export const SpatialConcealment = lazyNamed(() => import('../components/SpatialConcealment'), 'SpatialConcealment');
export const ObjectiveFilter = lazyNamed(() => import('../components/ObjectiveFilter'), 'ObjectiveFilter');
export const ProfilingRICE = lazyNamed(() => import('../components/ProfilingRICE'), 'ProfilingRICE');
export const AnomalyDetector = lazyNamed(() => import('../components/AnomalyDetector'), 'AnomalyDetector');
export const SocialEQ = lazyNamed<{ onFinish?: () => void }>(() => import('../components/SocialEQ'), 'SocialEQ');
export const AdminPanel = lazyNamed<{ token: string | null }>(() => import('../components/AdminPanel'), 'AdminPanel');
export const IdeasWall = lazyNamed<{ token: string | null }>(() => import('../components/IdeasWall'), 'IdeasWall');
export const TopologyMemory = lazyNamed(() => import('../components/TopologyMemory'), 'TopologyMemory');
export const CollisionDetector = lazyNamed(() => import('../components/CollisionDetector'), 'CollisionDetector');
export const AsyncDispatcher = lazyNamed(() => import('../components/AsyncDispatcher'), 'AsyncDispatcher');
export const NoiseReduction = lazyNamed<{ level?: number }>(() => import('../components/NoiseReduction'), 'NoiseReduction');
export const LanguageScanner = lazyNamed(() => import('../components/LanguageScanner'), 'LanguageScanner');
export const Decryptor = lazyNamed(() => import('../components/Decryptor'), 'Decryptor');
export const RealityCheck = lazyNamed<{ onFinish: (results?: unknown) => void }>(
  () => import('../components/RealityCheck'),
  'RealityCheck',
);
export const NeuroSilence = lazyNamed(() => import('../components/NeuroSilence'), 'NeuroSilence');
export const CognitiveTrashFilter = lazyNamed(() => import('../components/CognitiveTrashFilter'), 'CognitiveTrashFilter');
export const HypeFilter = lazyNamed<{ onFinish: (results?: unknown) => void }>(() => import('../components/HypeFilter'), 'HypeFilter');
export const Reframing = lazyNamed<{ onFinish?: () => void }>(() => import('../components/Reframing'), 'Reframing');
export const RejectionImmunity = lazyNamed<{ onFinish?: () => void }>(
  () => import('../components/RejectionImmunity'),
  'RejectionImmunity',
);
export const Storytelling = lazyNamed<{ onFinish?: () => void }>(() => import('../components/Storytelling'), 'Storytelling');
export const DeepFocus = lazyNamed<{ onFinish?: () => void }>(() => import('../components/DeepFocus'), 'DeepFocus');
export const SymbolChat = lazyNamed(() => import('../components/SymbolChat'), 'SymbolChat');
export const Wiki = lazyNamed(() => import('../components/Wiki'), 'Wiki');

export interface RouteEntry {
  path: string;
  title: string;
  icon: LucideIcon;
  navGroup: 'cognitive' | 'system' | 'wiki';
  /** Route uses special rendering logic in App.tsx rather than a simple component */
  customRender?: true;
}

export const ROUTE_DEFINITIONS: RouteEntry[] = [
  { path: '/', title: 'Обзор', icon: LayoutDashboard, navGroup: 'cognitive' },
  { path: '/dashboard', title: 'Обзор', icon: LayoutDashboard, navGroup: 'cognitive' },
  { path: '/leaderboard', title: 'Рейтинг лидеров', icon: Trophy, navGroup: 'system' },
  { path: '/schulte', title: 'Таблицы Шульте', icon: Play, navGroup: 'cognitive' },
  { path: '/numerical', title: 'Числовой анализ', icon: Calculator, navGroup: 'cognitive' },
  { path: '/logical', title: 'Системная логика', icon: Grid3x3, navGroup: 'cognitive' },
  { path: '/stroop', title: 'Эффект Струпа', icon: Palette, navGroup: 'cognitive' },
  { path: '/nback', title: 'N-назад (Память)', icon: BrainCircuit, navGroup: 'cognitive' },
  { path: '/situational', title: 'Ситуационный тест', icon: Users, navGroup: 'cognitive' },
  { path: '/typing', title: 'Скоростная печать', icon: Play, navGroup: 'cognitive' },
  { path: '/spatial', title: 'Пространство', icon: Grid3x3, navGroup: 'cognitive' },
  { path: '/topology', title: 'Архитектура контекста', icon: GitBranch, navGroup: 'cognitive' },
  { path: '/collision', title: 'Детектор коллизий', icon: Filter, navGroup: 'cognitive' },
  { path: '/dispatcher', title: 'Асинхронный диспетчер', icon: Cpu, navGroup: 'cognitive' },
  { path: '/noise', title: 'Редукция шума', icon: VolumeX, navGroup: 'cognitive' },
  { path: '/scanner', title: 'Смысловой сканер', icon: Search, navGroup: 'cognitive' },
  { path: '/decryptor', title: 'Декриптор', icon: Shield, navGroup: 'cognitive' },
  { path: '/reality', title: 'Верификация реальности', icon: Shield, navGroup: 'cognitive', customRender: true },
  { path: '/silence', title: 'Нейрорегуляция: «Тишина»', icon: VolumeX, navGroup: 'cognitive' },
  { path: '/filter', title: 'Когнитивный фильтр', icon: Filter, navGroup: 'cognitive' },
  { path: '/hype', title: 'Фактчек или Хайп', icon: Shield, navGroup: 'cognitive', customRender: true },
  { path: '/reframing', title: 'Фича, а не баг', icon: Lightbulb, navGroup: 'cognitive', customRender: true },
  { path: '/rejection', title: 'Иммунитет к отказам', icon: Shield, navGroup: 'cognitive', customRender: true },
  { path: '/storytelling', title: 'Смысловые связи', icon: Network, navGroup: 'cognitive', customRender: true },
  { path: '/focus', title: 'Глубокий Фокус', icon: Target, navGroup: 'cognitive', customRender: true },
  { path: '/objective', title: 'Объективный фильтр', icon: Filter, navGroup: 'cognitive' },
  { path: '/profiling', title: 'Профилирование RICE', icon: Shield, navGroup: 'cognitive' },
  { path: '/anomaly', title: 'Детектор аномалий', icon: Shield, navGroup: 'cognitive' },
  { path: '/dialogue', title: 'Архитектура диалога', icon: MessageSquare, navGroup: 'cognitive', customRender: true },
  { path: '/ideas', title: 'Предложения', icon: Lightbulb, navGroup: 'system' },
  { path: '/admin', title: 'Админ-панель', icon: Lock, navGroup: 'system', customRender: true },
  { path: '/wiki', title: 'База знаний', icon: Shield, navGroup: 'wiki', customRender: true },
];

const routeTitleMap = new Map<string, string>();
const routeIconMap = new Map<string, LucideIcon>();
for (const r of ROUTE_DEFINITIONS) {
  routeTitleMap.set(r.path, r.title);
  routeIconMap.set(r.path, r.icon);
}

export function getRouteTitle(path: string): string {
  return routeTitleMap.get(path) || 'Когнитика';
}

export function getRouteIcon(path: string): LucideIcon | undefined {
  return routeIconMap.get(path);
}

export const NAV_ITEMS = ROUTE_DEFINITIONS
  .filter((r) => r.path !== '/' && r.path !== '/dashboard')
  .map((r) => ({
    id: r.path.replace('/', ''),
    icon: r.icon,
    label: r.title,
  }));

export const HEADER_NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Обзор', path: '/' },
  { id: 'leaderboard', icon: Trophy, label: 'Рейтинг', path: '/leaderboard' },
  { id: 'schulte', icon: Play, label: 'Шульте', path: '/schulte' },
  { id: 'numerical', icon: Calculator, label: 'Числа', path: '/numerical' },
  { id: 'logical', icon: Grid3x3, label: 'Логика', path: '/logical' },
  { id: 'stroop', icon: Palette, label: 'Струп', path: '/stroop' },
  { id: 'nback', icon: BrainCircuit, label: 'Память', path: '/nback' },
  { id: 'typing', icon: Play, label: 'Печать', path: '/typing' },
  { id: 'spatial', icon: Grid3x3, label: 'Пространство', path: '/spatial' },
];

export const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Рабочий стол' },
  { id: 'leaderboard', icon: Trophy, label: 'Рейтинг лидеров' },
  { id: 'schulte', icon: Play, label: 'Таблицы Шульте' },
  { id: 'numerical', icon: Calculator, label: 'Анализ чисел' },
  { id: 'logical', icon: Grid3x3, label: 'Системная логика' },
  { id: 'stroop', icon: Palette, label: 'Эффект Струпа' },
  { id: 'nback', icon: BrainCircuit, label: 'N-назад (Память)' },
  { id: 'situational', icon: Users, label: 'Ситуации' },
  { id: 'typing', icon: Play, label: 'Скоростная печать' },
  { id: 'spatial', icon: Grid3x3, label: 'Пространство' },
  { id: 'topology', icon: GitBranch, label: 'Архитектура контекста' },
  { id: 'collision', icon: Filter, label: 'Детектор коллизий' },
  { id: 'dispatcher', icon: Cpu, label: 'Асинхр. диспетчер' },
  { id: 'noise', icon: VolumeX, label: 'Редукция шума' },
  { id: 'scanner', icon: Search, label: 'Смысловой сканер' },
  { id: 'hype', icon: Shield, label: 'Фактчек или Хайп' },
  { id: 'reframing', icon: Lightbulb, label: 'Фича, а не баг' },
  { id: 'rejection', icon: Shield, label: 'Иммунитет к отказам' },
  { id: 'storytelling', icon: Network, label: 'Смысловые связи' },
  { id: 'focus', icon: Target, label: 'Глубокий Фокус' },
  { id: 'ideas', icon: Lightbulb, label: 'Предложения' },
];

export const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'schulte', icon: Play },
  { id: 'logical', icon: Grid3x3 },
  { id: 'nback', icon: BrainCircuit },
  { id: 'situational', icon: Users },
];

export const CUSTOM_RENDER_ROUTES = new Set(
  ROUTE_DEFINITIONS.filter((r) => r.customRender).map((r) => r.path),
);
