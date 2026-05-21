import React from 'react';
import { motion } from 'motion/react';
import { Shield, Star, Trophy, Zap, Crown } from 'lucide-react';
import { getLeagueFromRating, LeagueType } from '../lib/leagues';

interface LeagueBadgeProps {
  rating: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LeagueBadge: React.FC<LeagueBadgeProps> = ({ rating, showLabel = true, size = 'md' }) => {
  const league = getLeagueFromRating(rating);
  
  const icons = {
    'BRONZE': Shield,
    'SILVER': Star,
    'GOLD': Trophy,
    'PLATINUM': Zap,
    'ELITE': Crown
  };

  const Icon = icons[league.type];

  const sizeClasses = {
    sm: 'p-1 gap-1 text-[8px]',
    md: 'p-1.5 gap-2 text-[10px]',
    lg: 'p-2.5 gap-3 text-xs'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center rounded-xl border ${league.bgColor} ${league.borderColor} ${league.color} ${sizeClasses[size]} font-black uppercase tracking-widest shadow-sm`}
    >
      <div className={`relative ${league.type === 'ELITE' ? 'animate-pulse' : ''}`}>
        <Icon className={iconSizes[size]} />
        {league.type === 'ELITE' && (
          <div className="absolute inset-0 bg-purple-400 blur-lg opacity-40 rounded-full" />
        )}
      </div>
      {showLabel && <span>{league.label}</span>}
    </motion.div>
  );
};
