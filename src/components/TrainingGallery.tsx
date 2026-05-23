import { motion } from 'motion/react';
import { 
  Play, Calculator, Grid3x3, Palette, BrainCircuit, 
  Users, Shield, Activity, MessageSquare, Zap, Target,
  GitBranch, Filter, Cpu, VolumeX
} from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  category: 'Внимание' | 'Логика' | 'Память' | 'Soft Skills' | 'Когнитивный инжиниринг' | 'Страж Разума';
  domain: 'base' | 'engineering' | 'guard';
  level: number;
}

const MODULES: TrainingModule[] = [
  // BASE DOMAIN
  { id: 'schulte', title: 'Таблицы Шульте', description: 'Развитие периферического зрения и концентрации.', icon: Play, color: 'text-blue-500', category: 'Внимание', domain: 'base', level: 1 },
  { id: 'numerical', title: 'Числовой анализ', description: 'Скорость обработки числовой информации.', icon: Calculator, color: 'text-emerald-500', category: 'Логика', domain: 'base', level: 1 },
  { id: 'logical', title: 'Логические матрицы', description: 'Поиск закономерностей в сложных системах.', icon: Grid3x3, color: 'text-purple-500', category: 'Логика', domain: 'base', level: 3 },
  { id: 'stroop', title: 'Эффект Струпа', description: 'Тренировка когнитивного контроля и гибкости.', icon: Palette, color: 'text-amber-500', category: 'Внимание', domain: 'base', level: 2 },
  { id: 'nback', title: 'N-назад', description: 'Развитие рабочей памяти и фокуса.', icon: BrainCircuit, color: 'text-rose-500', category: 'Память', domain: 'base', level: 5 },
  { id: 'typing', title: 'Скоростная печать', description: 'Тренировка моторной реакции и грамотности.', icon: Play, color: 'text-blue-600', category: 'Внимание', domain: 'base', level: 2 },
  { id: 'spatial', title: 'Пространство', description: 'Запоминание паттернов в динамических сетках.', icon: Grid3x3, color: 'text-indigo-600', category: 'Память', domain: 'base', level: 3 },
  
  // ENGINEERING DOMAIN
  { id: 'topology', title: 'Архитектура контекста', description: 'Удержание в памяти многомерных граф-структур и состояний.', icon: GitBranch, color: 'text-violet-400', category: 'Когнитивный инжиниринг', domain: 'engineering', level: 7 },
  { id: 'collision', title: 'Детектор коллизий', description: 'Скоростная семантическая фильтрация нарушений правил.', icon: Filter, color: 'text-red-400', category: 'Когнитивный инжиниринг', domain: 'engineering', level: 7 },
  { id: 'dispatcher', title: 'Асинх. диспетчер', description: 'Оркестрация 3-4 потоков с разделённым вниманием.', icon: Cpu, color: 'text-amber-400', category: 'Когнитивный инжиниринг', domain: 'engineering', level: 8 },
  { id: 'noise', title: 'Редукция шума', description: 'Тормозной контроль: реагируй на сигнал, игнорируй ловушки.', icon: VolumeX, color: 'text-emerald-400', category: 'Когнитивный инжиниринг', domain: 'engineering', level: 8 },
  
  // GUARD DOMAIN
  { id: 'scanner', title: 'Смысловой Сканер', description: 'Обнаружение скрытых манипуляций и логических уловок.', icon: Shield, color: 'text-blue-400', category: 'Страж Разума', domain: 'guard', level: 9 },
  { id: 'decryptor', title: 'Декриптор', description: 'Разделение фактов и эмоциональных искажений в тексте.', icon: Zap, color: 'text-purple-400', category: 'Страж Разума', domain: 'guard', level: 9 },
  { id: 'reality', title: 'Проверка Реальности', description: 'Обнаружение галлюцинаций ИИ и семантического дрейфа.', icon: Target, color: 'text-emerald-400', category: 'Страж Разума', domain: 'guard', level: 10 },
  { id: 'silence', title: 'Техника «Тишина»', description: 'Двухминутная дыхательная сессия ЦРУ для снижения уровня стресса и кортизола.', icon: VolumeX, color: 'text-neutral-400', category: 'Страж Разума', domain: 'guard', level: 1 },
  { id: 'filter', title: 'Ментальный фильтр', description: 'Разделение объективных фактов и субъективных когнитивных искажений.', icon: Shield, color: 'text-indigo-400', category: 'Страж Разума', domain: 'guard', level: 4 },

  // SOFT SKILLS
  { id: 'objective', title: 'Объективный фильтр', description: 'Отделение фактов от субъективных домыслов.', icon: Shield, color: 'text-indigo-500', category: 'Soft Skills', domain: 'base', level: 4 },
  { id: 'profiling', title: 'Профайлинг RICE', description: 'Анализ скрытой мотивации собеседника.', icon: Target, color: 'text-cyan-500', category: 'Soft Skills', domain: 'base', level: 6 },
];

export function TrainingGallery({ onStart }: { onStart: (id: string) => void }) {
  const [activeDomain, setActiveDomain] = useState<'base' | 'engineering' | 'guard'>('base');

  const filteredModules = MODULES.filter(m => m.domain === activeDomain);

  const domains = [
    { id: 'base', label: 'База', icon: BrainCircuit, description: 'Фундаментальные когнитивные функции: память, внимание, скорость.' },
    { id: 'engineering', label: 'Инжиниринг', icon: Cpu, description: 'Системное мышление, работа с многомерными структурами и асинхронностью.' },
    { id: 'guard', label: 'Страж Разума', icon: Shield, description: 'Защита от манипуляций, детекция когнитивных искажений и галлюцинаций.' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 p-1 bg-card/30 border border-border rounded-2xl w-fit">
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveDomain(d.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeDomain === d.id 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <d.icon className="w-4 h-4" />
            {d.label}
          </button>
        ))}
      </div>

      <motion.div 
        key={activeDomain}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-primary/5 border border-primary/10 rounded-3xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/20 rounded-lg">
            {(() => {
              const Icon = domains.find(d => d.id === activeDomain)?.icon || BrainCircuit;
              return <Icon className="w-5 h-5 text-primary" />;
            })()}
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {domains.find(d => d.id === activeDomain)?.label}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          {domains.find(d => d.id === activeDomain)?.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredModules.map((m, i) => (
            <motion.button
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => onStart(m.id)}
              className="group relative bg-card/40 border border-border rounded-3xl p-5 text-left hover:border-primary/50 transition-all overflow-hidden flex flex-col h-full min-h-[220px]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-background/80 border border-border group-hover:scale-110 group-hover:bg-primary/10 transition-all ${m.color}`}>
                  <m.icon className="w-6 h-6 shrink-0" />
                </div>
                <div className="bg-secondary/50 text-muted-foreground px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-border whitespace-nowrap">
                  {m.category}
                </div>
              </div>
              
              <h3 className="text-lg font-black tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-1">{m.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-grow">
                {m.description}
              </p>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                <div className="flex items-center gap-1">
                   <Zap className="w-3 h-3 text-primary" />
                   <span className="text-[10px] font-bold text-muted-foreground">LVL {m.level}</span>
                </div>
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                   Старт <Play className="w-3 h-3 fill-current" />
                </div>
              </div>

              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
