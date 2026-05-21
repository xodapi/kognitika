import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Brain, Shield, Cpu, Zap, ChevronRight, Info } from 'lucide-react';

interface WikiArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
}

const ARTICLES: WikiArticle[] = [
  {
    id: 'stroop',
    title: 'Эффект Струпа',
    category: 'База',
    content: 'Задержка реакции при прочтении слов, когда цвет слов не совпадает с написанными словами. Это классический тест на селективное внимание и когнитивную гибкость. Тренировка позволяет мозгу быстрее разрешать конфликты между автоматическими процессами (чтение) и контролируемыми (определение цвета).',
    tags: ['Внимание', 'Тормозный контроль']
  },
  {
    id: 'schulte',
    title: 'Таблицы Шульте',
    category: 'База',
    content: 'Инструмент для тренировки периферического зрения и концентрации. Регулярные занятия расширяют поле зрения, позволяя считывать информацию быстрее и эффективнее, что критично при работе с большими массивами данных или кодом.',
    tags: ['Зрение', 'Скорость']
  },
  {
    id: 'nback',
    title: 'Задача N-назад',
    category: 'База',
    content: 'Упражнение для развития рабочей памяти. Участнику необходимо определить, совпадал ли текущий стимул с тем, что был N шагов назад. Это одно из немногих упражнений с доказанным эффектом переноса на общий интеллект (Fluid Intelligence).',
    tags: ['Память', 'Интеллект']
  },
  {
    id: 'mindguard',
    title: 'Страж Разума (Mind Guard)',
    category: 'Безопасность',
    content: 'Система подготовки к работе в условиях информационной перегрузки и манипуляций. Включает детекцию логических ошибок, эмоциональных триггеров и семантического дрейфа. Цель — сохранить объективность анализа в условиях давления.',
    tags: ['Критическое мышление', 'Безопасность']
  }
];

export function Wiki() {
  const [selected, setSelected] = useState<WikiArticle | null>(null);

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
          {ARTICLES.map(article => (
            <button
              key={article.id}
              onClick={() => setSelected(article)}
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
                <p className="text-lg text-foreground/80 leading-relaxed mb-8">
                  {selected.content}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mt-auto pt-8 border-t border-border/30">
                {selected.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-secondary/50 border border-border rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
                Выберите статью из списка слева, чтобы изучить научную базу упражнения.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
