import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Filter, CheckCircle, Clock, Trash2, User, Mail, Tag, ChevronRight } from 'lucide-react';

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  email: string;
  content: string;
  type: 'idea' | 'bug' | 'improvement' | 'other';
  status: 'new' | 'reviewed' | 'resolved';
  createdAt: any;
}

export function AdminPanel() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const isAdmin = user?.email === 'serghow4@gmail.com';

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Feedback[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Feedback);
      });
      setFeedback(items);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'feedback', id), { status });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
         <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8" />
         </div>
         <h2 className="text-xl font-black uppercase">Доступ ограничен</h2>
         <p className="text-sm text-muted-foreground mt-2">Эта зона только для администраторов Cognitika.</p>
      </div>
    );
  }

  const filtered = feedback.filter(f => filter === 'all' || f.status === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-black uppercase tracking-tighter">Центр управления</h2>
           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Входящие предложения и баги</p>
        </div>
        
        <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl border border-border">
           {['all', 'new', 'reviewed', 'resolved'].map((s) => (
             <button 
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === s ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
             >
                {s === 'all' ? 'Все' : s === 'new' ? 'Новые' : s === 'reviewed' ? 'В работе' : 'Решено'}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-card/40 border border-border rounded-2xl p-5 hover:border-primary/30 transition-all ${item.status === 'new' ? 'ring-1 ring-primary/20 bg-primary/5' : ''}`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                           item.type === 'bug' ? 'bg-destructive/20 text-destructive' :
                           item.type === 'idea' ? 'bg-primary/20 text-primary' :
                           'bg-secondary text-muted-foreground'
                         }`}>
                           {item.type}
                         </span>
                         <span className="text-[10px] text-muted-foreground font-mono">
                           {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleString() : 'Just now'}
                         </span>
                      </div>
                      
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{item.content}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
                         <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold">{item.userName}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{item.email}</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex md:flex-col gap-2 shrink-0">
                      <button 
                        onClick={() => updateStatus(item.id, 'reviewed')}
                        className={`flex-1 md:w-32 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all ${item.status === 'reviewed' ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'}`}
                      >
                         <Clock className="w-3 h-3" /> В работу
                      </button>
                      <button 
                        onClick={() => updateStatus(item.id, 'resolved')}
                        className={`flex-1 md:w-32 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all ${item.status === 'resolved' ? 'bg-green-500 text-white border-green-600' : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'}`}
                      >
                         <CheckCircle className="w-3 h-3" /> Решено
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
         </AnimatePresence>
         
         {filtered.length === 0 && (
           <div className="text-center py-24 bg-secondary/20 rounded-3xl border border-dashed border-border">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-[0.2em]">Нет записей по этому фильтру</p>
           </div>
         )}
      </div>
    </div>
  );
}
