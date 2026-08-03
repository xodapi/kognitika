import { motion } from 'motion/react';
import { 
  Play, Calculator, Grid3x3, Palette, BrainCircuit, 
  Users, Shield, Activity, MessageSquare, Zap, Target,
  GitBranch, Filter, Cpu, VolumeX, Languages
} from 'lucide-react';
import { MODULE_TITLES } from '../lib/practice-recommendations';

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
  { id: 'schulte-90', title: MODULE_TITLES['schulte-90'], description: 'Расширенный поиск на поле 9x10 для периферического внимания.', icon: Grid3x3, color: 'text-sky-500', category: 'Внимание', domain: 'base', level: 4 },
  { id: 'mental-math', title: MODULE_TITLES['mental-math'], description: 'Скоростной счёт, рабочая память и устойчивость внимания.', icon: Calculator, color: 'text-emerald-500', category: 'Логика', domain: 'base', level: 3 },
  { id: 'alphabet-table', title: MODULE_TITLES['alphabet-table'], description: 'Русский алфавит и переключение между командами П, Л и О.', icon: Languages, color: 'text-violet-500', category: 'Внимание', domain: 'base', level: 2 },
  { id: 'numerical', title: 'Числовой анализ', description: 'Скорость обработки числовой информации.', icon: Calculator, color: 'text-emerald-500', category: 'Логика', domain: 'base', level: 1 },
  { id: 'logical', title: 'Логические матрицы', description: 'Поиск закономерностей в сложных системах.', icon: Grid3x3, color: 'text-purple-500', category: 'Логика', domain: 'base', level: 3 },
  { id: 'stroop', title: 'Эффект Струпа', description: 'Тренировка когнитивного контроля и гибкости.', icon: Palette, color: 'text-amber-500', category: 'Внимание', domain: 'base', level: 2 },
  { id: 'stroop-alphabet', title: 'Струп + Алфавит', description: 'Подавление чтения слова и переключение между командами П, Л и О.', icon: Palette, color: 'text-orange-500', category: 'Внимание', domain: 'base', level: 4 },
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
  { id: 'silence', title: 'Техника «Тишина»', description: 'Двухминутная нейрофизиологическая дыхательная сессия для снижения уровня стресса и кортизола.', icon: VolumeX, color: 'text-neutral-400', category: 'Страж Разума', domain: 'guard', level: 1 },
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
      <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-card/30 p-1 sm:flex sm:w-fit sm:gap-2">
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveDomain(d.id as any)}
            aria-pressed={activeDomain === d.id}
            className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wide transition-all sm:flex-row sm:gap-2 sm:px-6 sm:py-3 sm:text-xs sm:tracking-widest ${
              activeDomain === d.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <d.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{d.label}</span>
          </button>
        ))}
      </div>

      <motion.div 
        key={activeDomain}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-primary/10 bg-primary/5 p-4 sm:p-6"
      >
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2">
            {(() => {
              const Icon = domains.find(d => d.id === activeDomain)?.icon || BrainCircuit;
              return <Icon className="w-5 h-5 text-primary" />;
            })()}
          </div>
          <h2 className="text-lg font-black tracking-tight sm:text-xl">
            {domains.find(d => d.id === activeDomain)?.label}
          </h2>
        </div>
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {domains.find(d => d.id === activeDomain)?.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredModules.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => onStart(m.id)}
              className="group relative flex min-h-[164px] h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/40 p-4 text-left transition-all hover:border-primary/50 active:scale-[0.985] sm:min-h-[220px] sm:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
                <div className={`rounded-2xl border border-border bg-background/80 p-2.5 transition-all group-hover:scale-110 group-hover:bg-primary/10 sm:p-3 ${m.color}`}>
                  <m.icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                </div>
                <div className="max-w-[58%] truncate rounded-lg border border-border bg-secondary/50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
                  {m.category}
                </div>
              </div>
              
              <h3 className="mb-1 text-base font-black tracking-tight transition-colors group-hover:text-primary sm:mb-2 sm:text-lg">{m.title}</h3>
              <p className="mb-3 line-clamp-2 flex-grow text-xs leading-relaxed text-muted-foreground sm:mb-4 sm:line-clamp-3">
                {m.description}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-border/30 pt-2">
                <div className="flex items-center gap-1">
                   <Zap className="h-3 w-3 text-primary" />
                   <span className="text-xs font-bold text-muted-foreground">LVL {m.level}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary sm:opacity-0 sm:-translate-x-2 sm:transition-all sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
                   Старт <Play className="h-3 w-3 fill-current" />
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
