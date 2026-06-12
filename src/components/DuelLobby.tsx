import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Users, Loader2, X, Sword, Shield, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, socket } from '../lib/socket';
import { LeagueBadge } from './LeagueBadge';

interface Opponent {
  id: string;
  name: string;
  rating: number;
}

interface DuelLobbyProps {
  onMatchFound: (roomId: string, opponent: Opponent) => void;
  onClose: () => void;
}

export const DuelLobby: React.FC<DuelLobbyProps> = ({ onMatchFound, onClose }) => {
  const { user, token } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  useEffect(() => {
    socket.on('duel:matched', (data: { roomId: string; opponent: Opponent }) => {
      setIsSearching(false);
      onMatchFound(data.roomId, data.opponent);
    });

    return () => {
      socket.off('duel:matched');
    };
  }, [onMatchFound]);

  const toggleSearch = () => {
    if (!user || !token) return;

    connectSocket(token);

    if (isSearching) {
      socket.emit('duel:leave-queue');
      setIsSearching(false);
    } else {
      socket.emit('duel:matchmake');
      setIsSearching(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/90 backdrop-blur-2xl"
        onClick={!isSearching ? onClose : undefined}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <Sword className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter">Когнитивная Дуэль</h3>
              <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Battle Protocol v1.0</p>
            </div>
          </div>
          {!isSearching && (
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-[2rem] bg-primary/5 border-2 border-primary/20 flex items-center justify-center transition-all ${isSearching ? 'animate-pulse scale-105 border-primary/40' : ''}`}>
              {isSearching ? (
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
              ) : (
                <Users className="w-16 h-16 text-muted-foreground opacity-50" />
              )}
            </div>
            {isSearching && (
              <div className="absolute -bottom-2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">
              {isSearching ? 'Поиск противника...' : 'Готов к дуэли?'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSearching 
                ? 'Система подбирает атлета с похожим рейтингом для честного когнитивного сражения.' 
                : 'Сразись с другими участниками в реальном времени. Победа приносит больше опыта и рейтинга!'}
            </p>
          </div>

          {!isSearching && user && (
            <div className="bg-secondary/30 p-4 rounded-2xl border border-border w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-black text-primary border border-border">
                  {user.pseudonym?.[0] || user.name?.[0] || 'A'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black">{user.pseudonym || user.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Твой Рейтинг: {user.rating || 1000}</p>
                </div>
              </div>
              <LeagueBadge rating={user.rating || 0} size="sm" showLabel={false} />
            </div>
          )}

          <button
            onClick={toggleSearch}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${
              isSearching 
                ? 'bg-secondary text-foreground border border-border hover:bg-destructive hover:text-white hover:border-destructive' 
                : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSearching ? 'Отменить поиск' : 'Найти противника'}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-secondary/20 p-3 rounded-xl border border-border/50 text-center">
            <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">+25 XP за победу</p>
          </div>
          <div className="bg-secondary/20 p-3 rounded-xl border border-border/50 text-center">
            <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Matchmaking x2.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
