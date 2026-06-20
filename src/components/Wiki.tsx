import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Brain, ChevronRight, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { KNOWLEDGE_ARTICLE_BY_ID, KNOWLEDGE_ARTICLES, TAG_GLOSSARY } from '../lib/knowledge-base';

export function Wiki() {
  const navigate = useNavigate();
  const { articleId } = useParams();
  const selected = articleId ? KNOWLEDGE_ARTICLE_BY_ID.get(articleId) || null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar */}
      <div className="lg:col-span-4 space-y-4">
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl mb-6">
          <div className="flex items-center gap-3 mb-2 text-primary font-black uppercase text-xs tracking-widest">
            <BookOpen className="w-4 h-4" /> Библиотека Знаний
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Теоретическая база когнитивных тренировок Kognitika. Понимая механизмы работы мозга, вы тренируетесь эффективнее.
          </p>
        </div>

        <div className="space-y-2">
          {KNOWLEDGE_ARTICLES.map(article => (
            <button
              key={article.id}
              onClick={() => navigate(article.route)}
              className={`w-full p-4 text-left rounded-2xl border transition-all flex items-center justify-between group ${
                selected?.id === article.id 
                  ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'bg-card/40 border-border text-foreground hover:border-primary/40'
              }`}
            >
              <div>
                <div className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selected?.id === article.id ? 'text-primary-foreground/70' : 'text-primary'}`}>
                  {article.category}
                </div>
                <div className="font-bold text-sm">{article.title}</div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${selected?.id === article.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card/30 border border-border rounded-3xl p-8 min-h-[400px]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black tracking-tight">{selected.title}</h2>
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="grid gap-4">
                  {[
                    ['Что тренирует', selected.trains],
                    ['Как проходить', selected.howTo],
                    ['Что означают метрики', selected.metrics],
                    ['Почему это важно', selected.science],
                    ['Ограничения', selected.safety],
                  ].map(([label, body]) => (
                    <section key={label} className="rounded-2xl border border-border bg-background/40 p-4">
                      <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary">
                        {label}
                      </h3>
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {body}
                      </p>
                    </section>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-auto pt-8 border-t border-border/30">
                {selected.tags.map(tag => (
                  <span
                    key={tag}
                    title={TAG_GLOSSARY[tag] || tag}
                    className="px-3 py-1 bg-secondary/50 border border-border rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="bg-card/20 border border-border border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-muted-foreground opacity-20" />
              </div>
              <h3 className="text-xl font-black mb-2">Выберите тему</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Выберите статью из списка слева или откройте прямую ссылку вида /wiki/stroop.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
