import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Share2, Download, Trophy, Target, 
  Zap, Brain, Award, Shield, CheckCircle2,
  ExternalLink, QrCode
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LeagueBadge } from './LeagueBadge';

interface ShareCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCard({ isOpen, onClose }: ShareCardProps) {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const stats = [
    { label: 'Уровень', value: user.level || 1, icon: Award, color: 'text-primary' },
    { label: 'Опыт', value: `${user.experience || 0} XP`, icon: Zap, color: 'text-yellow-500' },
    { label: 'Рейтинг', value: user.rating || 0, icon: Trophy, color: 'text-orange-500' },
    { label: 'Сессии', value: user._count?.sessions || 0, icon: Target, color: 'text-blue-500' },
  ];

  const handleShare = async () => {
    const shareData = {
      title: 'Мой когнитивный профиль в Kognitika',
      text: `Я достиг ${user.level} уровня в системе Когнитика! Мой опыт: ${user.experience} XP. Присоединяйся к тренировкам!`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Ссылка скопирована в буфер обмена!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Card Content (The ID Card) */}
            <div className="p-8 pb-10 space-y-8" ref={cardRef}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tighter">Kognitika Identity</h3>
                    <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Cognitive-Protocol v2.1</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Profile Section */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-4xl font-black text-primary uppercase shadow-inner">
                    {(user.pseudonym || user.name || 'A')[0]}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-background border border-border p-1.5 rounded-xl shadow-lg">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-tight">{user.pseudonym || user.name || 'Машинист'}</h2>
                  <div className="mt-2">
                    <LeagueBadge rating={user.rating || 0} size="md" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mt-2">
                    Certified Intelligence Agent
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-secondary/30 border border-border/50 rounded-2xl p-4 flex flex-col gap-1 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">{stat.label}</span>
                    </div>
                    <div className="text-lg font-black text-foreground">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Footer / QR Area */}
              <div className="flex items-center justify-between pt-6 border-t border-border/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">ID Verified by System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                      Registered: {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-border shadow-sm">
                  <QrCode className="w-10 h-10 text-black" />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-secondary/50 border-t border-border p-4 flex gap-3">
              <button 
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Share2 className="w-4 h-4" /> Поделиться
              </button>
              <button 
                className="w-14 flex items-center justify-center bg-card border border-border text-muted-foreground rounded-2xl hover:text-foreground transition-colors"
                title="Скачать (в разработке)"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
