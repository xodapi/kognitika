import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, Lightbulb, Bug, Info, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('feedback-modal');

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'idea' | 'bug' | 'improvement' | 'other';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user, token } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedbackType>('idea');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [trackingNum, setTrackingNum] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, content })
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.error || 'Failed to submit');
      }
      
      setTrackingNum(data.trackingNum);
      setIsSuccess(true);
      
      // Clear content but stay on success screen long enough
      setContent('');
    } catch (error) {
      logger.error('Feedback submit failed', { error: safeError(error), type });
      alert('Ошибка при отправке: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10"
          >
            <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                     <MessageSquare className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Обратная связь</h2>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="p-6">
              {isSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                   <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                   </div>
                    <h3 className="text-xl font-bold mb-2">Получено!</h3>
                    <p className="text-sm text-muted-foreground mb-4">Спасибо за ваш вклад в развитие проекта.</p>
                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 mb-8">
                       <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Номер обращения</p>
                       <p className="text-lg font-mono font-bold text-foreground">{trackingNum}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => { setIsSuccess(false); onClose(); }}
                      className="px-8 py-3 bg-secondary text-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-secondary/80 transition-all w-full"
                    >
                      Закрыть
                    </button>
                 </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 block">Тип обращения</label>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { id: 'idea', icon: Lightbulb, label: 'Идея' },
                         { id: 'bug', icon: Bug, label: 'Ошибка' },
                         { id: 'improvement', icon: Zap, label: 'Улучшение' },
                         { id: 'other', icon: Info, label: 'Другое' },
                       ].map((item) => (
                         <button 
                            key={item.id}
                            type="button"
                            onClick={() => setType(item.id as FeedbackType)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all ${type === item.id ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'}`}
                         >
                            <item.icon className="w-4 h-4" /> {item.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 block">Ваше сообщение</label>
                     <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Опишите вашу идею или проблему..."
                        rows={5}
                        className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50 resize-none"
                     />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || !content.trim() || !user}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Отправка...' : <><Send className="w-4 h-4" /> Отправить предложение</>}
                  </button>
                  
                  {!user && (
                    <p className="text-[10px] text-center text-destructive font-bold uppercase">Требуется авторизация</p>
                  )}
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
