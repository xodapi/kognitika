import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  Fingerprint,
  Lightbulb,
  Mail,
  Route,
  ShieldCheck,
  Sun,
  Moon,
  Target,
  TimerReset,
  Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

const PRODUCT_URL = 'https://kognitika.ru';
const CONTACT_URL = 'https://t.me/serg_borisovich';
const INVESTOR_LEAD_API_URL = '/api/investor-leads';

type InvestorInterest = 'meeting' | 'materials' | 'pilot';

type InvestorLeadForm = {
  name: string;
  organization: string;
  contact: string;
  interest: InvestorInterest;
  message: string;
  website: string;
};

const initialInvestorLead: InvestorLeadForm = {
  name: '',
  organization: '',
  contact: '',
  interest: 'meeting',
  message: '',
  website: '',
};

const proofItems = [
  'Когнитивные тренажёры и история занятий',
  'Прогресс, достижения, XP и лидерборды',
  'Сохранение результатов на сервере и продуктовая аналитика',
  'Веб-версия и мобильные направления: React Native / Expo и Capacitor',
];

const horizons = [
  { number: '01', label: 'Сейчас', title: 'Доказать привычку', text: 'Проверить, возвращаются ли люди к короткой практике, когда после занятия видят результат и понимают следующий шаг.', measure: 'Первое занятие, возврат на 1 / 7 / 30 день, завершение занятий' },
  { number: '02', label: 'После подтверждения', title: 'Сделать путь личным', text: 'Развивать понятные отчёты и рекомендации. AI может помогать объяснять результат и выбирать следующий шаг, но не думать вместо человека.', measure: 'Понимание рекомендаций, доверие и повторное использование' },
  { number: '03', label: 'Позже, если это полезно', title: 'Добавить контекст', text: 'Проверить один добровольный источник дополнительного контекста, например совместимое устройство, только если он заметно улучшает опыт.', measure: 'Польза и возврат без ущерба для приватности' },
];

const competitors = [
  { name: 'Muse', entry: 'EEG-повязка', focus: 'Медитация, сон и mental fitness', position: 'Сенсорное устройство и обратная связь о состоянии', url: 'https://choosemuse.com/' },
  { name: 'Neurable', entry: 'EEG-наушники', focus: 'Паттерны фокуса и подсказки для пауз', position: 'Hardware-first опыт для продуктивности', url: 'https://www.neurable.com/products/mw75neuro' },
  { name: 'IDUN', entry: 'In-ear EEG-платформа', focus: 'Когнитивная нагрузка и SDK', position: 'Сенсорная инфраструктура для профессиональных сценариев', url: 'https://iduntechnologies.com/use-case/cognitive-workload' },
  { name: 'Sens.ai', entry: 'Домашняя система', focus: 'Оценка и нейрофидбэк', position: 'Премиальный hardware-подход к тренировке', url: 'https://sens.ai/' },
  { name: 'Pison', entry: 'Носимое устройство', focus: 'Показатели умственной готовности', position: 'Нейросенсоры и физический продукт', url: 'https://pison.com/' },
];

const glossary = [
  ['AI / LLM', 'AI — искусственный интеллект. LLM — языковая модель: система, которая умеет работать с текстом, искать связи и готовить черновики. На этой странице это будущий инструмент поддержки, а не текущая функция Kognitika.'],
  ['Когнитивные навыки', 'Навыки, которые помогают воспринимать, удерживать и обрабатывать информацию: внимание, память, скорость реакции и критическая оценка.'],
  ['Персональная практика', 'Регулярные короткие занятия, выбранные с учётом предыдущих результатов человека.'],
  ['Траектория', 'Понятная последовательность: занятие, результат, следующий рекомендуемый шаг и возвращение к практике.'],
  ['Удержание', 'Доля людей, которые возвращаются к продукту через определённое время. Это один из способов проверить, стала ли практика привычкой.'],
  ['B2C / B2B', 'B2C — продукт для частных пользователей. B2B — продукт для организаций.'],
  ['Opt-in', 'Добровольное согласие пользователя включить дополнительную функцию или передачу данных.'],
  ['Privacy-first', 'Подход, при котором сначала ограничивают сбор и использование данных, а затем добавляют только необходимое.'],
];

function Logo() {
  return <a className="brand" href="#top" aria-label="Kognitika — наверх"><span className="brand-mark" aria-hidden="true">K</span><span>KOGNITIKA</span></a>;
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <header className="section-intro reveal"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</header>;
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lead, setLead] = useState<InvestorLeadForm>(initialInvestorLead);
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLeadStatus('sending');

    try {
      const response = await fetch(INVESTOR_LEAD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });

      if (!response.ok) throw new Error('Lead submission failed');
      setLeadStatus('success');
      setLead(initialInvestorLead);
    } catch {
      setLeadStatus('error');
    }
  };

  return (
    <div className="site-shell" id="top">
      <a className="skip-link" href="#main">К основному содержанию</a>
      <header className="nav-wrap"><nav className="nav container" aria-label="Основная навигация">
        <Logo />
        <div className="nav-links"><a href="#product">Продукт</a><a href="/science">Научная основа</a><a href="#market">Рынок</a><a href="#capital">Инвестиции</a><a href="#glossary">Термины</a></div>
        <div className="nav-actions"><button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>{theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button><a className="nav-cta" href="#contact">Связаться <ChevronRight size={15} aria-hidden="true" /></a></div>
      </nav></header>

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title"><div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span className="status-dot" /> Работающий продукт · pre-seed</p>
          <h1 id="hero-title">От когнитивных упражнений<em>к регулярной персональной практике</em></h1>
          <p className="hero-lead">Kognitika — регулярная практика внимания, памяти и решений с измеримым прогрессом.</p>
          <p className="hero-context">В эпоху, когда AI берёт на себя всё больше рутинных операций, мы хотим, чтобы внимание, память и способность принимать решения оставались тренируемым навыком человека — а не тем, что незаметно теряется в фоне.</p>
          <p className="hero-context">Мы опираемся на проверенные практики когнитивных тренировок и объективные данные о прогрессе внутри платформы. Дополнительный контекст от совместимых устройств — направление, которое мы будем проверять только добровольно и только после того, как докажем пользу базовой практики.</p>
          <div className="hero-actions"><a className="button button-primary" href={PRODUCT_URL} target="_blank" rel="noreferrer">Открыть продукт <ExternalLink size={17} aria-hidden="true" /></a><a className="button button-ghost" href="#market">Посмотреть рынок <ArrowRight size={17} aria-hidden="true" /></a></div>
          <p className="hero-note">Не медицинский продукт. AI, устройства и расширенная персонализация ниже отмечены как направления развития, а не как функции текущей версии.</p>
        </div><div className="hero-product" aria-label="Стилизованный интерфейс продукта Kognitika"><div className="product-window"><div className="window-bar"><i /><i /><i /><span>Kognitika / Практика</span></div><div className="product-content"><div className="product-topline"><span>Сегодня</span><strong>Мой следующий шаг</strong></div><p className="product-title">Практика на внимание<span>Короткое занятие с понятным результатом</span></p><div className="product-grid" aria-hidden="true"><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></div><div className="product-progress"><p><span>История практики</span><span>занятие → шаг</span></p><div className="progress-line"><b /></div></div></div></div><p className="product-caption">Визуальная модель: занятие, результат и следующий шаг.</p></div></section>

        <section className="thesis-band" aria-label="Инвестиционный тезис"><div className="container thesis-grid"><p>Короткое занятие</p><ArrowRight aria-hidden="true" /><p>Понятный результат</p><ArrowRight aria-hidden="true" /><p>Следующий шаг</p><ArrowRight aria-hidden="true" /><p>Возвращение к практике</p></div></section>

        <section className="section container problem" id="product"><SectionIntro eyebrow="Почему сейчас" title="Когда AI снимает рутину, самостоятельное мышление становится заметнее" text="AI подготовит черновик, найдёт информацию, структурирует текст. Но человеку всё ещё нужно поставить задачу, удержать контекст, заметить ошибку, проверить вывод и принять решение. Это не медицинское утверждение, а продуктовая гипотеза Kognitika." /><div className="problem-grid"><article className="feature-card dark-card reveal delay-1"><Brain size={26} aria-hidden="true" /><h3>Практика навыков</h3><p>Короткие упражнения на внимание, память и скорость реакции — это конкретное действие, а не абстрактный совет «думать лучше».</p></article><article className="feature-card reveal delay-2"><Route size={26} aria-hidden="true" /><h3>Понятный путь</h3><p>После занятия человек видит результат и понимает следующий шаг. Так отдельные упражнения превращаются в привычку.</p></article><article className="feature-card accent-card reveal delay-3"><TimerReset size={26} aria-hidden="true" /><h3>Проверяемая ставка</h3><p>Сейчас задача команды — измерить, увеличивает ли этот путь возврат к практике и готовность платить.</p></article></div></section>

        <section className="section loop-section"><div className="container split-layout"><SectionIntro eyebrow="Как работает продукт" title="Одно занятие должно делать следующий выбор проще" text="Без медицинских интерпретаций и без обещаний «прокачать мозг». Только ясная практика, обратная связь и следующий шаг." /><ol className="loop-list"><li className="reveal"><span>01</span><div><h3>Короткое занятие</h3><p>Интерактивное упражнение с ясными правилами и завершением.</p></div></li><li className="reveal delay-1"><span>02</span><div><h3>Результат</h3><p>Обратная связь по конкретному занятию и история собственных результатов.</p></div></li><li className="reveal delay-2"><span>03</span><div><h3>Следующий шаг</h3><p>Следующее рекомендуемое занятие, которое помогает сохранить регулярность.</p></div></li></ol></div></section>

        <section className="section container proof-section"><div className="proof-panel"><div className="proof-copy"><p className="eyebrow">Что существует сегодня</p><h2>Работающий продукт, готовый к проверке спроса</h2><p>Текущая версия уже даёт основу, на которой можно проверить главную продуктовую гипотезу: формируется ли регулярная практика.</p><a className="text-link" href={PRODUCT_URL} target="_blank" rel="noreferrer">Посмотреть живой продукт <ExternalLink size={16} aria-hidden="true" /></a><a className="text-link" href="/science">Научная основа тренажёров <ArrowRight size={16} aria-hidden="true" /></a></div><ul className="proof-list">{proofItems.map((item) => <li key={item}><span><Check size={15} aria-hidden="true" /></span>{item}</li>)}</ul></div></section>

        <section className="section differentiation container"><SectionIntro eyebrow="Наша ставка" title="Не заменять устройство. Построить ежедневный слой практики" text="Kognitika не заявляет собственный нейроинтерфейс, нейрофидбэк или полную локальную обработку данных. Наша текущая точка входа — доступная software-first практика без обязательной покупки специального устройства." /><div className="differentiation-grid"><article><Route aria-hidden="true" /><span>01</span><h3>Практика, а не каталог</h3><p>Занятие, результат и следующий шаг объединены в один повторяемый путь.</p></article><article><Fingerprint aria-hidden="true" /><span>02</span><h3>Данные под контролем</h3><p>Псевдонимная учётная запись, минимизация данных и контролируемый экспорт.</p></article><article><Lightbulb aria-hidden="true" /><span>03</span><h3>AI как поддержка</h3><p>Будущая задача AI — объяснять и помогать выбирать следующий шаг, а не делать когнитивную работу вместо пользователя.</p></article><article><ShieldCheck aria-hidden="true" /><span>04</span><h3>Расширение после доказательств</h3><p>Носимые устройства и B2B проверяются только после подтверждения пользы и регулярного использования.</p></article></div></section>

        <section className="section market-section" id="market"><div className="container"><SectionIntro eyebrow="Конкурентная карта" title="Рынок подтверждает спрос. Наша точка входа другая" text="Это не рейтинг «кто лучше». Это карта существующих подходов: большинство заметных игроков начинает с сенсора или устройства. Kognitika начинает с ежедневной практики и может подключать дополнительный контекст позднее, только с добровольного согласия пользователя." /><div className="competitor-table" role="region" aria-label="Сравнение подходов на рынке"><div className="competitor-head"><span>Компания</span><span>Точка входа</span><span>Что предлагает</span><span>Подход</span></div>{competitors.map((competitor) => <a className="competitor-row reveal" key={competitor.name} href={competitor.url} target="_blank" rel="noreferrer"><strong>{competitor.name}<ExternalLink size={14} aria-label={`Официальный сайт ${competitor.name}`} /></strong><span>{competitor.entry}</span><span>{competitor.focus}</span><span>{competitor.position}</span></a>)}</div><div className="market-position"><p className="eyebrow">Позиция Kognitika</p><h3>Сначала привычный software layer. Затем — только полезный контекст</h3><p>В отличие от hardware-first моделей, Kognitika не требует специального устройства для начала практики. Инвестиции нужны, чтобы доказать ценность цикла и возврат пользователей, улучшить персональную аналитику, а затем проверить один добровольный источник дополнительного контекста.</p></div><p className="source-note">Описания конкурентов основаны на их публичных продуктовых страницах, ссылки ведут на первоисточники. Мы не делаем утверждений об их архитектуре, облачной обработке или регуляторном статусе без отдельной проверки.</p></div></section>

        <section className="section container team-section" id="team"><SectionIntro eyebrow="Команда" title="Продукт делает один человек, координирующий команду AI-агентов." /><div className="market-position"><p>Богорад Сергей Борисович, 54 года, 15 лет инженер в крупной компании. Архитектура и аудит — через ИИ агентов, реализация распределена между несколькими независимыми AI-агентами (Codex, Droid, Gemini) — каждое изменение проходит через объективные технические проверки (тесты, компиляция, CI) прежде чем считается готовым.</p><p>Это не замена команде инженеров, а способ проверить продуктовую гипотезу с минимальным бюджетом до найма. Найм технического сооснователя — часть плана на следующем этапе, после подтверждения спроса.</p></div></section>

        <section className="section strategy-section" id="strategy"><div className="container"><SectionIntro eyebrow="Стратегия развития" title="Три этапа. Каждый следующий — после результата предыдущего" /><div className="horizon-list">{horizons.map((horizon, index) => <article className="horizon reveal" key={horizon.number}><div className="horizon-number">{horizon.number}</div><div className="horizon-content"><p>{horizon.label}</p><h3>{horizon.title}</h3><span>{horizon.text}</span></div><div className="horizon-measure"><Target size={18} aria-hidden="true" /><div><small>Как проверим</small>{horizon.measure}</div></div>{index < horizons.length - 1 && <ChevronRight className="horizon-arrow" aria-hidden="true" />}</article>)}</div></div></section>

        <section className="section container business-section" id="capital"><SectionIntro eyebrow="На что направляются инвестиции" title="Сначала снять ключевые риски, затем масштабировать" text="Капитал не нужен для громких обещаний. Он нужен, чтобы последовательно проверить продуктовую ценность, спрос и устойчивую модель роста." /><div className="business-grid"><article className="business-card primary-business reveal"><div className="card-top"><span>Первый фокус</span><Users aria-hidden="true" /></div><h3>Привычка и спрос</h3><ul><li>Улучшить ежедневный путь и мобильный опыт</li><li>Проверить возврат пользователей и готовность платить</li><li>Провести интервью и первые тесты каналов привлечения</li></ul><p>Риск, который снимаем: люди действительно возвращаются и видят ценность регулярной практики.</p></article><article className="business-card reveal delay-1"><div className="card-top"><span>Следующий этап</span><BarChart3 aria-hidden="true" /></div><h3>Персональный слой</h3><ul><li>Сделать результаты и рекомендации понятнее</li><li>Проверить безопасные AI-подсказки</li><li>Исследовать добровольный контекст от совместимых устройств</li></ul><p>Риск, который снимаем: персонализация усиливает пользу, не усложняя продукт и не нарушая доверие.</p></article></div></section>

        <section className="section trust-section" id="glossary"><div className="container glossary-layout"><SectionIntro eyebrow="Без жаргона" title="Словарь страницы" text="Нажмите на термин, если встретили незнакомое слово. Все будущие возможности на странице отделены от того, что уже работает." /><dl className="glossary-list">{glossary.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></div></section>

        <section className="section container ask-section" id="ask"><div className="proof-panel ask-panel"><div className="proof-copy"><p className="eyebrow">Инвестиционное предложение</p><h2>Ищем pre-seed:<br /><em>5–10 млн ₽</em></h2><p>На условиях конвертируемого займа с капом оценки 100 млн ₽.</p><a className="button button-primary" href="#contact">Запросить материалы <Mail size={17} aria-hidden="true" /></a></div><div className="ask-copy"><p>Средства идут на цели из раздела «Первый фокус»: ежедневный путь пользователя, мобильный опыт, проверка возврата и готовности платить.</p><p>Следующий раунд — после того как эти данные появятся и станут проверяемыми.</p></div></div></section>

        <section className="section evidence-section container"><div className="evidence-heading"><p className="eyebrow">Готовность к инвестициям</p><h2>Не прячем пробелы.<br /><em>Закрываем их данными.</em></h2><p>До привлечения капитала публичными должны стать только проверяемые показатели, с источником, датой и владельцем.</p></div><div className="evidence-checklist">{['Активные пользователи и завершённые занятия', 'Возврат на 1 / 7 / 30 день', 'Повторное использование ежедневного пути', 'Переход на платную версию и готовность платить', 'Стоимость привлечения и срок окупаемости', 'Интервью и конкретные примеры ценности'].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p><CircleDashed aria-label="Требует подтверждения" /></div>)}</div></section>

        <section className="section container limitations"><div className="limitations-panel"><div><p className="eyebrow">Прозрачные ограничения</p><h2>Планы развития — не текущая реализация</h2></div><div className="limitations-copy"><p>Kognitika не заявляет медицинскую диагностику, терапию или нейрофидбэк. Мы не обещаем полную обработку данных на устройстве и не гарантируем соответствие конкретным регуляторным режимам без отдельной проверки.</p><p>Интеграции с носимыми устройствами, расширенная персонализация, AI-подсказки и B2B-сценарии — направления будущей работы, а не функции текущего продукта.</p></div></div></section>

        <section className="contact-section" id="contact"><div className="contact-glow" /><div className="container contact-content"><p className="eyebrow">Следующий разговор</p><h2>Запросить материалы<br /><em>или назначить разговор</em></h2><p>Оставьте только удобный способ связи. Мы используем заявку, чтобы ответить по вашему запросу, и не добавляем контакты в публичные рассылки.</p><form className="investor-lead-form" onSubmit={submitLead} aria-describedby="lead-privacy-note">
            <div className="lead-form-grid"><label>Имя<input name="name" value={lead.name} onChange={(event) => setLead({ ...lead, name: event.target.value })} maxLength={120} autoComplete="name" required /></label><label>Организация / фонд <span>необязательно</span><input name="organization" value={lead.organization} onChange={(event) => setLead({ ...lead, organization: event.target.value })} maxLength={160} autoComplete="organization" /></label></div>
            <label>Telegram или email<input name="contact" value={lead.contact} onChange={(event) => setLead({ ...lead, contact: event.target.value })} maxLength={200} autoComplete="email" required /></label>
            <label>Сообщение <span>необязательно</span><textarea name="message" value={lead.message} onChange={(event) => setLead({ ...lead, message: event.target.value })} maxLength={1200} rows={4} placeholder="Например, кратко опишите интерес или удобное время для разговора" /></label>
            <fieldset><legend>Что интересно</legend><div className="interest-options"><label><input type="radio" name="interest" checked={lead.interest === 'meeting'} onChange={() => setLead({ ...lead, interest: 'meeting' })} />Назначить разговор</label><label><input type="radio" name="interest" checked={lead.interest === 'materials'} onChange={() => setLead({ ...lead, interest: 'materials' })} />Получить материалы</label><label><input type="radio" name="interest" checked={lead.interest === 'pilot'} onChange={() => setLead({ ...lead, interest: 'pilot' })} />Обсудить пилот</label></div></fieldset>
            <label className="honeypot" aria-hidden="true">Сайт<input name="website" tabIndex={-1} autoComplete="off" value={lead.website} onChange={(event) => setLead({ ...lead, website: event.target.value })} /></label>
            <button className="button button-primary" type="submit" disabled={leadStatus === 'sending'}>{leadStatus === 'sending' ? 'Отправляем…' : 'Отправить запрос'} <ArrowRight size={17} aria-hidden="true" /></button>
            <p className="lead-privacy-note" id="lead-privacy-note">Минимальные данные, ограничение частоты заявок и защита от автоматических отправок.</p>
            <div className="lead-status" role="status" aria-live="polite">{leadStatus === 'success' && 'Спасибо. Заявка отправлена, мы свяжемся с вами по указанному контакту.'}{leadStatus === 'error' && <>Не удалось отправить заявку. <a href={CONTACT_URL} target="_blank" rel="noreferrer">Напишите в Telegram</a>.</>}</div>
          </form><a className="direct-telegram" href={CONTACT_URL} target="_blank" rel="noreferrer">Или напишите напрямую в Telegram <Mail size={16} aria-hidden="true" /></a></div></section>
      </main>
      <footer className="footer"><div className="container footer-inner"><Logo /><p>Регулярная когнитивная практика с понятным следующим шагом.</p><span>© {new Date().getFullYear()} Kognitika</span></div></footer>
    </div>
  );
}

export default App;
