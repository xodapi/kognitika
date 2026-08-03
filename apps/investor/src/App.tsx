import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDashed,
  Database,
  ExternalLink,
  Fingerprint,
  Layers3,
  LockKeyhole,
  Mail,
  Route,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Target,
  TimerReset,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const PRODUCT_URL = 'https://kognitika.ru';
const CONTACT_EMAIL = 'admin@syntog.ru';

const proofItems = [
  'Когнитивные тренажёры и история занятий',
  'Прогресс, достижения, XP и лидерборды',
  'Продуктовая аналитика и server-authoritative сохранение результатов',
  'Web-клиент и мобильные направления: React Native / Expo и Capacitor',
];

const horizons = [
  {
    number: '01',
    label: 'Сейчас',
    title: 'Доказать core loop',
    text: 'Сделать ежедневную практику полезной привычкой: следующий тренажёр, понятная обратная связь и объяснимая динамика навыков.',
    measure: 'Activation, D1 / D7 / D30 retention, завершение и возврат',
  },
  {
    number: '02',
    label: 'После подтверждения',
    title: 'Усилить персональную аналитику',
    text: 'Развивать отчёты, контроль синхронизации, экспорт и локальные вычисления только там, где их ценность измерима.',
    measure: 'Понимание, доверие и использование рекомендаций',
  },
  {
    number: '03',
    label: 'Опционально',
    title: 'Добавить контекст и партнёрства',
    text: 'Тестировать один opt-in источник данных от совместимых устройств, а затем — B2B и research-интеграции с отдельными privacy-границами.',
    measure: 'Польза и retention без компромисса приватности',
  },
];

const evidence = [
  'MAU / WAU и завершённые тренировки',
  'Activation и D1 / D7 / D30 retention',
  'Повторное использование ежедневной траектории',
  'Premium-конверсия и willingness-to-pay',
  'CAC и payback при платном привлечении',
  'Интервью и конкретные доказательства ценности',
];

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="Kognitika — наверх">
      <span className="brand-mark" aria-hidden="true">K</span>
      <span>KOGNITIKA</span>
    </a>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <header className="section-intro reveal">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </header>
  );
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  return (
    <div className="site-shell" id="top">
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Основная навигация">
          <Logo />
          <div className="nav-links">
            <a href="#product">Продукт</a>
            <a href="#strategy">Стратегия</a>
            <a href="#trust">Архитектура</a>
          </div>
          <div className="nav-actions">
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <a className="nav-cta" href="#contact">Связаться <ChevronRight size={15} aria-hidden="true" /></a>
          </div>
        </nav>
      </header>

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span className="status-dot" /> Работающий продукт · следующий этап роста</p>
            <h1 id="hero-title">Когнитивная практика,<em>которая ведёт дальше.</em></h1>
            <p className="hero-lead">Kognitika соединяет короткие тренировки внимания, памяти и скорости реакции с понятным прогрессом и следующим персональным шагом.</p>
            <div className="hero-actions">
              <a className="button button-primary" href={PRODUCT_URL} target="_blank" rel="noreferrer">Открыть продукт <ExternalLink size={17} aria-hidden="true" /></a>
              <a className="button button-ghost" href="#product">Изучить тезис <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <p className="hero-note">Не медицинский продукт. Не обещание будущих функций. Обзор текущей реализации и проверяемых гипотез.</p>
          </div>

          <div className="hero-product" aria-label="Стилизованный интерфейс продукта Kognitika">
            <div className="product-window">
              <div className="window-bar"><i /><i /><i /><span>Kognitika / Практика</span></div>
              <div className="product-content">
                <div className="product-topline"><span>Сегодня</span><strong>Личная траектория</strong></div>
                <p className="product-title">Следующий шаг<span>Короткая практика для внимания</span></p>
                <div className="product-grid" aria-hidden="true"><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></div>
                <div className="product-progress"><p><span>Динамика практики</span><span>сессия → шаг</span></p><div className="progress-line"><b /></div></div>
              </div>
            </div>
            <p className="product-caption">Визуальная модель продукта: практика, результат и следующий шаг.</p>
          </div>
        </section>

        <section className="thesis-band" aria-label="Инвестиционный тезис">
          <div className="container thesis-grid">
            <p>Короткая практика</p><ArrowRight aria-hidden="true" />
            <p>Измеримый результат</p><ArrowRight aria-hidden="true" />
            <p>Персональный шаг</p><ArrowRight aria-hidden="true" />
            <p>Возврат</p>
          </div>
        </section>

        <section className="section container problem" id="product">
          <SectionIntro eyebrow="Проблема / почему сейчас" title="Каталог игр не создаёт устойчивого прогресса." text="Пользователю нужен не ещё один изолированный тест, а понятный ответ: что делать дальше, что изменилось и зачем возвращаться завтра." />
          <div className="problem-grid">
            <article className="feature-card dark-card reveal delay-1">
              <CircleDashed size={26} aria-hidden="true" />
              <h3>Разрозненный опыт</h3>
              <p>Отдельные упражнения и общая статистика редко складываются в осмысленную ежедневную привычку.</p>
            </article>
            <article className="feature-card reveal delay-2">
              <Route size={26} aria-hidden="true" />
              <h3>Недостающая траектория</h3>
              <p>Kognitika связывает практику, результат и следующий шаг в один повторяемый цикл.</p>
            </article>
            <article className="feature-card accent-card reveal delay-3">
              <TimerReset size={26} aria-hidden="true" />
              <h3>Момент для проверки</h3>
              <p>Продукт уже существует. Теперь фокус — измерить удержание и ценность персональной траектории, а не масштабировать обещания.</p>
            </article>
          </div>
        </section>

        <section className="section loop-section">
          <div className="container split-layout">
            <SectionIntro eyebrow="Практический цикл" title="Один результат открывает следующий шаг." text="Каждая сессия должна делать прогресс понятнее — без магии, давления и недоказанных интерпретаций." />
            <ol className="loop-list">
              <li className="reveal"><span>01</span><div><h3>Короткая практика</h3><p>Интерактивное занятие с ясными правилами и измеримым завершением.</p></div></li>
              <li className="reveal delay-1"><span>02</span><div><h3>Понятный результат</h3><p>Обратная связь по конкретной сессии и динамика относительно себя.</p></div></li>
              <li className="reveal delay-2"><span>03</span><div><h3>Следующая рекомендация</h3><p>Объяснимый выбор практики, который поддерживает регулярность.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="section container proof-section">
          <div className="proof-panel">
            <div className="proof-copy">
              <p className="eyebrow">Что существует сегодня</p>
              <h2>Не концепт. Production-продукт.</h2>
              <p>Текущая версия уже даёт основу, на которой можно проверять главный продуктовый тезис.</p>
              <a className="text-link" href={PRODUCT_URL} target="_blank" rel="noreferrer">Посмотреть живой продукт <ExternalLink size={16} aria-hidden="true" /></a>
            </div>
            <ul className="proof-list">
              {proofItems.map((item) => <li key={item}><span><Check size={15} aria-hidden="true" /></span>{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="section differentiation container">
          <SectionIntro eyebrow="Дифференциация" title="Система решений, а не громкий claim." />
          <div className="differentiation-grid">
            <article><Route aria-hidden="true" /><span>01</span><h3>Траектория, не каталог</h3><p>Практика формирует следующий план и объяснимую динамику.</p></article>
            <article><Fingerprint aria-hidden="true" /><span>02</span><h3>Privacy-first направление</h3><p>Псевдонимная идентичность, минимизация данных и контролируемый экспорт.</p></article>
            <article><ShieldCheck aria-hidden="true" /><span>03</span><h3>Инженерная надёжность</h3><p>Воспроизводимые сценарии, контролируемые миграции и восстановление.</p></article>
            <article><Layers3 aria-hidden="true" /><span>04</span><h3>Прагматичная производительность</h3><p>Rust — для ограниченных вычислительных контуров после parity и замеров.</p></article>
          </div>
        </section>

        <section className="section strategy-section" id="strategy">
          <div className="container">
            <SectionIntro eyebrow="Стратегия развития" title="Три горизонта. Каждый следующий — после доказательств." />
            <div className="horizon-list">
              {horizons.map((horizon, index) => (
                <article className="horizon reveal" key={horizon.number}>
                  <div className="horizon-number">{horizon.number}</div>
                  <div className="horizon-content"><p>{horizon.label}</p><h3>{horizon.title}</h3><span>{horizon.text}</span></div>
                  <div className="horizon-measure"><Target size={18} aria-hidden="true" /><div><small>Критерий</small>{horizon.measure}</div></div>
                  {index < horizons.length - 1 && <ChevronRight className="horizon-arrow" aria-hidden="true" />}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section container business-section">
          <SectionIntro eyebrow="Бизнес-гипотезы" title="Сначала B2C-сигнал. Затем — расширение." text="Цена, упаковка и unit economics должны появиться из retention и willingness-to-pay экспериментов, а не из заранее выбранных цифр." />
          <div className="business-grid">
            <article className="business-card primary-business reveal">
              <div className="card-top"><span>B2C · первый фокус</span><Users aria-hidden="true" /></div>
              <h3>Free → Premium</h3>
              <ul><li>Базовая практика и ограниченная история</li><li>Персональные планы и расширенная аналитика</li><li>Адаптивная траектория и engagement-функции</li></ul>
              <p>Гипотеза проверяется через удержание и готовность платить.</p>
            </article>
            <article className="business-card reveal delay-1">
              <div className="card-top"><span>B2B · позже</span><BarChart3 aria-hidden="true" /></div>
              <h3>Партнёрские сценарии</h3>
              <ul><li>Корпоративный wellbeing</li><li>Образовательные и white-label форматы</li><li>Лицензирование аналитического слоя</li></ul>
              <p>Только после подтверждения B2C и отдельной проверки спроса.</p>
            </article>
          </div>
        </section>

        <section className="section trust-section" id="trust">
          <div className="container trust-layout">
            <SectionIntro eyebrow="Техническое доверие" title="Источник истины ясен. Эксперименты изолированы." text="Архитектура следует бизнес-риску: transactional data остаются в проверенном контуре, а новые вычислительные ядра вводятся постепенно и обратимо." />
            <div className="architecture" aria-label="Техническая архитектура Kognitika">
              <div className="arch-node arch-entry"><Layers3 aria-hidden="true" /><div><small>Продукт</small><strong>React / Vite</strong><span>Express / Socket.io</span></div></div>
              <div className="arch-line"><span /></div>
              <div className="arch-branches">
                <div className="arch-node"><Database aria-hidden="true" /><div><small>Production authority</small><strong>Prisma + PostgreSQL</strong><span>Пользовательские и transactional data</span></div></div>
                <div className="arch-node"><ServerCog aria-hidden="true" /><div><small>Текущее поведение</small><strong>TypeScript runtime</strong><span>Authoritative product logic</span></div></div>
                <div className="arch-node experimental"><Sparkles aria-hidden="true" /><div><small>Ограниченный эксперимент</small><strong>Rust core / Axum</strong><span>Детерминированные вычисления, без production DB-доступа</span></div></div>
              </div>
            </div>
          </div>
          <div className="container trust-principles">
            <div><LockKeyhole aria-hidden="true" /><p><strong>Псевдонимный Brain ID</strong><span>Без обязательной социальной привязки</span></p></div>
            <div><ShieldCheck aria-hidden="true" /><p><strong>Контролируемые изменения</strong><span>Проверяемые workflow и rollback</span></p></div>
            <div><Database aria-hidden="true" /><p><strong>Минимизация данных</strong><span>Экспорт проектируется с ограниченным составом</span></p></div>
          </div>
        </section>

        <section className="section evidence-section container">
          <div className="evidence-heading">
            <p className="eyebrow">Fundraising readiness</p>
            <h2>Не прячем пробелы.<br /><em>Закрываем их данными.</em></h2>
            <p>До fundraising публичными должны стать только верифицируемые метрики — с источником, датой и владельцем.</p>
          </div>
          <div className="evidence-checklist">
            {evidence.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p><CircleDashed aria-label="Требует подтверждения" /></div>)}
          </div>
        </section>

        <section className="section container limitations">
          <div className="limitations-panel">
            <div><p className="eyebrow">Прозрачные ограничения</p><h2>Roadmap — не текущая реализация.</h2></div>
            <div className="limitations-copy">
              <p>Kognitika не заявляет медицинскую диагностику, терапию или нейрофидбэк. Мы не обещаем 100% on-device обработку и не гарантируем соответствие конкретным регуляторным режимам без отдельной проверки.</p>
              <p>Интеграции с носимыми устройствами, расширенная персонализация и B2B-сценарии — направления для будущих opt-in экспериментов, а не функции текущего продукта.</p>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-glow" />
          <div className="container contact-content">
            <p className="eyebrow">Следующий разговор</p>
            <h2>Проверим тезис<br />на реальных сигналах.</h2>
            <p>Открыты к разговору о продуктовой стратегии, доказательной базе и следующем этапе Kognitika.</p>
            <div className="hero-actions">
              <a className="button button-primary" href={`mailto:${CONTACT_EMAIL}`}>Написать команде <Mail size={17} aria-hidden="true" /></a>
              <a className="button button-ghost light-ghost" href={PRODUCT_URL} target="_blank" rel="noreferrer">Открыть Kognitika <ExternalLink size={17} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner"><Logo /><p>Когнитивная практика с понятной траекторией.</p><span>© {new Date().getFullYear()} Kognitika</span></div>
      </footer>
    </div>
  );
}

export default App;
