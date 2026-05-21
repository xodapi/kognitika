export type LeagueType = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'ELITE';

export interface LeagueInfo {
  type: LeagueType;
  label: string;
  minRating: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const LEAGUES: LeagueInfo[] = [
  { 
    type: 'ELITE', 
    label: 'Элита', 
    minRating: 2101, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50', 
    borderColor: 'border-purple-200' 
  },
  { 
    type: 'PLATINUM', 
    label: 'Платина', 
    minRating: 1801, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50', 
    borderColor: 'border-cyan-200' 
  },
  { 
    type: 'GOLD', 
    label: 'Золото', 
    minRating: 1501, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50', 
    borderColor: 'border-amber-200' 
  },
  { 
    type: 'SILVER', 
    label: 'Серебро', 
    minRating: 1201, 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-50', 
    borderColor: 'border-slate-200' 
  },
  { 
    type: 'BRONZE', 
    label: 'Бронза', 
    minRating: 0, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200' 
  },
];

export function getLeagueFromRating(rating: number): LeagueInfo {
  return LEAGUES.find(l => rating >= l.minRating) || LEAGUES[LEAGUES.length - 1];
}
