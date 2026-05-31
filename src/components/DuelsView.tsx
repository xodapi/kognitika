import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Trophy, Users, Shield, Zap, Target } from 'lucide-react';
import { DuelLobby } from './DuelLobby';
import { DuelArena } from './DuelArena';
import { socket } from '../lib/socket';
import { useAuth } from '../hooks/useAuth';

export const DuelsView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [viewState, setViewState] = useState<'idle' | 'lobby' | 'playing'>('idle');
  const [currentMatch, setCurrentMatch] = useState<{
    roomId: string;
    opponent: { id: string; name: string; rating: number };
  } | null>(null);

  useEffect(() => {
    socket.on('duel:matched', (data: { roomId: string; opponent: { id: string; name: string; rating: number } }) => {
      setCurrentMatch(data);
      setViewState('playing');
    });

    return () => {
      socket.off('duel:matched');
    };
  }, []);

  const handleFinish = (result: 'win' | 'loss' | 'draw') => {
    // In a real app, the server would calculate rating changes
    // For MVP, we just refresh the user to see any updates if they happened
    refreshUser();
    setViewState('idle');
    setCurrentMatch(null);
  };

  return (
    <div className="space-y-8 min-h-[600px]">
      <AnimatePresence mode="wait">
        {viewState === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 border border-primary/20">
              <Sword className="w-12 h-12 text-primary" />
            </div>
            
            <h2 className="text-4xl font-black mb-2 text-center uppercase tracking-tight">Режим Дуэлей</h2>
            <p className="text-muted-foreground text-center max-w-md mb-10">
              Сразись с другими пользователями в реальном времени. Побеждай, чтобы повышать свой рейтинг и продвигаться по лигам.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-12">
               <div className="bg-card/40 border border-border p-6 rounded-3xl text-center">
                  <Users className="w-6 h-6 text-primary mx-auto mb-3" />
                  <div className="text-sm font-black uppercase tracking-widest mb-1">Матчмейкинг</div>
                  <div className="text-[10px] text-muted-foreground">Подбор равных соперников</div>
               </div>
               <div className="bg-card/40 border border-border p-6 rounded-3xl text-center">
                  <Shield className="w-6 h-6 text-yellow-500 mx-auto mb-3" />
                  <div className="text-sm font-black uppercase tracking-widest mb-1">Лиги</div>
                  <div className="text-[10px] text-muted-foreground">Путь от Бронзы до Элиты</div>
               </div>
               <div className="bg-card/40 border border-border p-6 rounded-3xl text-center">
                  <Zap className="w-6 h-6 text-blue-500 mx-auto mb-3" />
                  <div className="text-sm font-black uppercase tracking-widest mb-1">XP Бонусы</div>
                  <div className="text-[10px] text-muted-foreground">Удвоенный опыт за победы</div>
               </div>
            </div>

            <button 
              onClick={() => setViewState('lobby')}
              className="px-12 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4"
            >
              <Target className="w-5 h-5" />
              Найти оппонента
            </button>
          </motion.div>
        )}

        {viewState === 'lobby' && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <DuelLobby
              onMatchFound={(roomId, opponent) => {
                setCurrentMatch({ roomId, opponent });
                setViewState('playing');
              }}
              onClose={() => setViewState('idle')}
            />
          </motion.div>
        )}

        {viewState === 'playing' && currentMatch && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150]"
          >
            <DuelArena 
              roomId={currentMatch.roomId} 
              opponent={currentMatch.opponent}
              onFinish={handleFinish}
              onClose={() => {
                setViewState('idle');
                setCurrentMatch(null);
                refreshUser();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
