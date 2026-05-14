import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ThumbsUp, Plus, Send, X } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  description: string;
  status: string;
  author: { name: string | null };
  _count: { votes: number };
  userHasVoted: boolean;
}

export const IdeasWall: React.FC<{ token: string | null }> = ({ token }) => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/ideas', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setIdeas(data);
    } catch (err) {
      console.error('Failed to fetch ideas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, [token]);

  const handleVote = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/ideas/${id}/vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchIdeas();
      }
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTitle || !newDesc) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, description: newDesc })
      });
      if (res.ok) {
        setNewTitle('');
        setNewDesc('');
        setShowAddModal(false);
        fetchIdeas();
      }
    } catch (err) {
      console.error('Failed to submit idea', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="col-span-12 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Голосование за идеи</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Влияйте на развитие платформы</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs uppercase tracking-wider rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Предложить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-card/40 border border-border rounded-2xl p-6 h-48 animate-pulse" />
            ))
          ) : ideas.length === 0 ? (
             <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
                <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Идей пока нет. Станьте первым!</p>
             </div>
          ) : (
            ideas.map((idea) => (
              <motion.div
                layout
                key={idea.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card/40 border border-border rounded-2xl p-6 flex flex-col hover:border-primary/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Lightbulb className="w-12 h-12 text-primary" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      idea.status === 'DONE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      idea.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {idea.status === 'PENDING' ? 'В очереди' : idea.status === 'IN_PROGRESS' ? 'В разработке' : 'Готово'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{idea.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">{idea.description}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                       {idea.author.name?.[0] || '?'}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{idea.author.name || 'Аноним'}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleVote(idea.id)}
                    disabled={!token || idea.userHasVoted}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      idea.userHasVoted 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card border border-border hover:border-primary text-muted-foreground hover:text-primary'
                    }`}
                  >
                    <ThumbsUp className={`w-3 h-3 ${idea.userHasVoted ? 'fill-current' : ''}`} />
                    <span>{idea._count.votes}</span>
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Idea Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground uppercase tracking-widest">Предложить идею</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Заголовок</label>
                  <input 
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Например: Добавить звуки природы"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Описание</label>
                  <textarea 
                    required
                    rows={4}
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Опишите, как это поможет пользователям..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all resize-none"
                  />
                </div>

                <button 
                  disabled={submitting}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                  {submitting ? 'Отправка...' : (
                    <>
                      <Send className="w-4 h-4" />
                      Опубликовать
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
