import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MessageSquare, Lightbulb, CheckCircle, Clock, Send, ChevronRight, User } from 'lucide-react';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('admin-panel');

interface Feedback {
  id: string;
  type: string;
  text: string;
  adminResponse: string | null;
  createdAt: string;
  user: { name: string | null; brainLabel?: string; pseudonym?: string | null };
}

interface Idea {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  author: { name: string | null; brainLabel?: string; pseudonym?: string | null };
  _count: { votes: number };
}

export const AdminPanel: React.FC<{ token: string | null }> = ({ token }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeTab, setActiveTab] = useState<'feedback' | 'ideas'>('feedback');
  const [loading, setLoading] = useState(true);
  const [responseMap, setResponseMap] = useState<Record<string, string>>({});
  const [isAuthorized, setIsAuthorized] = useState(false);

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [fRes, iRes] = await Promise.all([
        fetch('/api/admin/feedback', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/ideas', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (fRes.status === 403) {
        setIsAuthorized(false);
        return;
      }

      const fData = await fRes.json();
      const iData = await iRes.json();
      
      setFeedbacks(fData);
      setIdeas(iData);
      setIsAuthorized(true);
    } catch (err) {
      logger.error('Admin fetch failed', { error: safeError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleFeedbackResponse = async (id: string) => {
    const response = responseMap[id];
    if (!response || !token) return;

    try {
      const res = await fetch(`/api/admin/feedback/${id}/response`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });
      if (res.ok) {
        fetchAdminData();
        setResponseMap(prev => ({ ...prev, [id]: '' }));
      }
    } catch (err) {
       logger.error('Feedback response failed', { error: safeError(err), feedbackLabel: `Feedback ${id.slice(0, 8)}` });
    }
  };

  const handleIdeaStatus = async (id: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/ideas/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
       logger.error('Idea status update failed', { error: safeError(err), ideaLabel: `Idea ${id.slice(0, 8)}`, status });
    }
  };

  if (!isAuthorized && !loading) {
     return (
       <div className="col-span-12 py-20 text-center flex flex-col items-center">
          <Shield className="w-16 h-16 text-destructive mb-4 opacity-50" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-destructive">Доступ запрещен</h2>
          <p className="text-muted-foreground mt-2">У вас нет прав администратора для просмотра этого раздела.</p>
       </div>
     );
  }

  return (
    <div className="col-span-12 flex flex-col gap-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Панель управления</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">Мини-CRM для работы с сообществом</p>
        </div>

        <div className="flex bg-card/40 p-1 border border-border rounded-xl">
           <button 
             onClick={() => setActiveTab('feedback')}
             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'feedback' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
           >
             Обратная связь
           </button>
           <button 
             onClick={() => setActiveTab('ideas')}
             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ideas' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
           >
             Идеи ({ideas.length})
           </button>
        </div>
      </div>

      <div className="space-y-6">
         {activeTab === 'feedback' ? (
           feedbacks.length === 0 ? (
             <div className="py-20 text-center bg-card/20 border border-border rounded-3xl">
                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Сообщений пока нет</p>
             </div>
           ) : (
             feedbacks.map((f) => (
               <motion.div 
                 key={f.id}
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="bg-card/40 border border-border rounded-3xl overflow-hidden group hover:border-primary/30 transition-all shadow-sm"
               >
                 <div className="flex flex-col lg:flex-row">
                    <div className="p-6 lg:w-1/3 bg-background/40 border-b lg:border-b-0 lg:border-r border-border">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                             <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-foreground">{f.user.name || 'Пользователь'}</p>
                             <p className="text-[10px] text-muted-foreground font-medium">{f.user.brainLabel || f.user.pseudonym || 'Brain ID'}</p>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                             <span>Тип:</span>
                             <span className="text-primary">{f.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                             <span>Дата:</span>
                             <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                             <span>Статус:</span>
                             <span className={f.adminResponse ? 'text-green-500' : 'text-orange-500'}>
                                {f.adminResponse ? 'ОТВЕЧЕНО' : 'ОЖИДАЕТ'}
                             </span>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-6">
                       <div className="bg-background/60 p-4 rounded-2xl border border-border italic text-sm text-foreground/80">
                          "{f.text}"
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Ваш ответ</label>
                          {f.adminResponse ? (
                             <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-sm text-foreground relative">
                                <div className="absolute -left-2 top-4 w-4 h-4 bg-primary/5 border-l border-t border-primary/20 rotate-[-45deg]" />
                                {f.adminResponse}
                             </div>
                          ) : (
                             <div className="flex gap-2">
                                <textarea 
                                  value={responseMap[f.id] || ''}
                                  onChange={e => setResponseMap(p => ({ ...p, [f.id]: e.target.value }))}
                                  placeholder="Напишите ответ пользователю..."
                                  className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all resize-none"
                                  rows={2}
                                />
                                <button 
                                  onClick={() => handleFeedbackResponse(f.id)}
                                  className="px-6 bg-primary text-primary-foreground rounded-xl font-bold uppercase text-[10px] hover:bg-primary/90 transition-all flex items-center justify-center shadow-lg shadow-primary/20"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
               </motion.div>
             ))
           )
         ) : (
           ideas.map((idea) => (
             <motion.div 
               key={idea.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-card/40 border border-border rounded-3xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-primary/30 transition-all"
             >
               <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                     <Lightbulb className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-foreground">{idea.title}</h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-[9px] font-black text-primary uppercase">
                           <Shield className="w-3 h-3" /> {idea._count.votes} голосов
                        </div>
                     </div>
                     <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{idea.description}</p>
                     <p className="text-[10px] text-muted-foreground uppercase font-bold mt-2">
                       Автор: {idea.author.name || idea.author.pseudonym || idea.author.brainLabel || 'Brain ID'}
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-3 w-full lg:w-auto">
                  <select 
                    value={idea.status}
                    onChange={(e) => handleIdeaStatus(idea.id, e.target.value)}
                    className="flex-1 lg:flex-none p-2 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                  >
                     <option value="PENDING">Ожидание</option>
                     <option value="IN_PROGRESS">В разработке</option>
                     <option value="DONE">Готово</option>
                  </select>
                  <button className="p-3 bg-secondary rounded-xl hover:bg-border transition-colors">
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
             </motion.div>
           ))
         )}
      </div>
    </div>
  );
};
