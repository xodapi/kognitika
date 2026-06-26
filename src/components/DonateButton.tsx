import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Copy, Check, Coffee } from 'lucide-react';

interface DonateButtonProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonateButton: React.FC<DonateButtonProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  // Bot-protected data assembly
  const getWallet = () => ['41001', '18345', '467491'].join('');

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-sm bg-card border border-border rounded-[2rem] p-8 shadow-2xl overflow-hidden"
          >
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

            <button onClick={onClose} aria-label="Закрыть" className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Поддержать</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">Ваша поддержка помогает нам развивать проект и оплачивать вычислительные мощности.</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-secondary/30 rounded-2xl border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">ЮMoney</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-bold tracking-wider">{getWallet()}</code>
                  <button onClick={() => copyToClipboard(getWallet(), 'wallet')} aria-label="Копировать кошелёк" className="p-2 hover:bg-background rounded-lg transition-colors">
                    {copied === 'wallet' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-center text-muted-foreground mt-8 uppercase font-black tracking-tighter italic">
              Спасибо за ваш вклад в когнитивную безопасность
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
