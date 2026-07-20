import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  Download,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { KNOWLEDGE_ARTICLES } from '../lib/knowledge-base';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onStartTraining: () => void;
  onOpenProfile: () => void;
}

const steps = [
  { title: 'Зачем нужна Когнитика', icon: BrainCircuit },
  { title: 'Как начать поэтапно', icon: Sparkles },
  { title: 'Что покажет каждый тренажёр', icon: BarChart3 },
  { title: 'Аналитика для LLM', icon: Download },
  { title: 'Приватность и первый шаг', icon: ShieldCheck },
];

export function OnboardingModal({
  isOpen,
  onComplete,
  onStartTraining,
  onOpenProfile,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setStep(0);
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onComplete();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const current = steps[step];
  const StepIcon = current.icon;
  const isLastStep = step === steps.length - 1;

  const finishAndStart = () => {
    onComplete();
    onStartTraining();
  };

  const finishAndOpenProfile = () => {
    onComplete();
    onOpenProfile();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-3 backdrop-blur-md sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Шаг {step + 1} из {steps.length}
            </p>
            <h2 id="onboarding-title" className="mt-1 truncate text-lg font-black tracking-tight sm:text-2xl">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onComplete}
            aria-label="Закрыть онбординг"
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <StepIcon className="h-6 w-6" />
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Когнитика помогает регулярно тренировать внимание, рабочую память, скорость обработки,
                логику, самоконтроль и устойчивость к информационному шуму.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['Тренировка', 'Короткие упражнения дают измеримую нагрузку вместо абстрактных советов.'],
                  ['Наблюдение', 'Сравнивайте себя только с собственной динамикой по завершённым сессиям.'],
                  ['Рекомендации', 'Платформа подсказывает следующую нагрузку и зоны, которым нужен отдых.'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-border bg-background/50 p-5">
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-muted-foreground">
                Это wellness-инструмент для тренировок и самонаблюдения, а не медицинская диагностика
                и не оценка интеллекта.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {[
                ['1. База', 'Начните с Таблиц Шульте, Струпа и N-назад: внимание, контроль реакции и рабочая память.'],
                ['2. Инжиниринг', 'После освоения базы подключайте графы, коллизии, диспетчер и редукцию шума.'],
                ['3. Страж Разума', 'Затем тренируйте распознавание манипуляций, искажений и ошибок ИИ.'],
                ['4. Ритм', 'Проходите 1–3 короткие сессии, следите за точностью и делайте паузу при усталости.'],
                ['5. Профиль', 'После пяти завершённых тренировок откроется более устойчивый когнитивный профиль.'],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-border bg-background/50 p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Для каждого тренажёра сохраняются только показатели выполнения. Карточки ниже объясняют,
                что тренируется и как читать результат.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {KNOWLEDGE_ARTICLES.map((article) => (
                  <article key={article.id} className="rounded-2xl border border-border bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-black">{article.title}</h3>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black uppercase text-primary">
                        {article.category}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      <strong className="text-foreground">Тренирует:</strong> {article.trains}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      <strong className="text-foreground">Аналитика:</strong> {article.metrics}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Во вкладке «Профиль» можно скачать JSON, подготовленный для ChatGPT, Claude или локальной LLM.
                Экспорт группирует результаты по тренажёрам и описывает смысл каждой метрики.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/50 p-5">
                  <h3 className="font-black">Что увидит LLM</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>Количество завершённых сессий по модулю</li>
                    <li>Средние и лучшие баллы</li>
                    <li>Среднее и лучшее время выполнения</li>
                    <li>Изменение результата между ранними и поздними попытками</li>
                    <li>Описание тренируемого навыка и интерпретация метрик</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <h3 className="font-black">Пример запроса к LLM</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    «Проанализируй динамику по каждому тренажёру. Найди устойчивые сильные стороны,
                    зоны роста и признаки усталости. Предложи спокойный план на 7 дней без медицинских выводов».
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <h3 className="flex items-center gap-2 font-black text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                  В экспорт не входят личные данные
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  JSON не содержит имени, псевдонима, Brain ID, user ID, email, токенов, session ID,
                  точного времени активности, IP-адреса и сырых служебных metadata.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['1', 'Пройдите Таблицы Шульте как базовый замер внимания.'],
                  ['2', 'Добавьте Струп и N-назад для контроля и рабочей памяти.'],
                  ['3', 'После пяти сессий откройте Профиль и скачайте обезличенный JSON.'],
                ].map(([number, text]) => (
                  <div key={number} className="rounded-2xl border border-border bg-background/50 p-5">
                    <span className="text-2xl font-black text-primary">{number}</span>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Пропустить
          </button>
          <div className="flex flex-1 gap-3 sm:justify-end">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((value) => value - 1)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-black uppercase tracking-widest sm:flex-none"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </button>
            )}
            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setStep((value) => value + 1)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground sm:flex-none"
              >
                Далее
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={finishAndOpenProfile}
                  className="hidden items-center justify-center gap-2 rounded-xl border border-primary/30 px-5 py-3 text-xs font-black uppercase tracking-widest text-primary sm:inline-flex"
                >
                  Открыть профиль
                </button>
                <button
                  type="button"
                  onClick={finishAndStart}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground sm:flex-none"
                >
                  Начать с Шульте
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
