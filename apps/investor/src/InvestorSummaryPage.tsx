import { ArrowLeft, ArrowRight, Check, ExternalLink, Mail } from 'lucide-react';
import { useEffect } from 'react';
import './investor-summary.css';

const PRODUCT_URL = 'https://kognitika.ru';

const milestones = [
  ['Регулярность', 'Первые занятия, завершение сессий и возврат на 1 / 7 / 30 день.'],
  ['Готовность платить', 'Интервью, первые оплаты и причины выбора или отказа.'],
  ['Канал привлечения', 'Стоимость привлечения, конверсия и срок окупаемости канала.'],
];

export default function InvestorSummaryPage() {
  useEffect(() => {
    document.title = 'Kognitika, коротко для инвестора';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Короткий investor one-pager Kognitika: продукт, раунд, ключевые проверки и контакт.');
  }, []);

  return <div className="investor-summary-page" id="top">
    <a className="summary-skip" href="#summary-main">К основному содержанию</a>
    <header className="summary-nav"><div className="summary-container summary-nav-inner"><a className="summary-brand" href="/"><span>K</span>KOGNITIKA</a><a className="summary-back" href="/"><ArrowLeft size={16} aria-hidden="true" /> Полная страница</a></div></header>
    <main id="summary-main">
      <section className="summary-hero"><div className="summary-container"><p className="summary-kicker">Investor brief · pre-seed</p><h1>Kognitika — регулярная практика внимания, памяти и решений с измеримым прогрессом.</h1><p>Когда AI берёт на себя рутину, ценность самостоятельного внимания, памяти и решений становится заметнее.</p><div className="summary-actions"><a href="#contact">Запросить материалы <Mail size={17} aria-hidden="true" /></a><a href={PRODUCT_URL} target="_blank" rel="noreferrer">Открыть продукт <ExternalLink size={17} aria-hidden="true" /></a></div></div></section>
      <section className="summary-section summary-container"><div className="summary-grid"><article><p>Что уже есть</p><h2>Работающий software-first продукт</h2><ul><li><Check />Когнитивные тренажёры и история занятий</li><li><Check />Прогресс, достижения и продуктовая аналитика</li><li><Check />Веб-версия и мобильные направления</li></ul></article><article><p>Что проверяет раунд</p><h2>Станет ли практика привычкой и спросом</h2><span>Сначала доказываем ценность ежедневного цикла, затем расширяем персональный слой и только после этого проверяем дополнительный контекст от устройств.</span></article></div></section>
      <section className="summary-section summary-dark"><div className="summary-container"><p className="summary-kicker">Инвестиционное предложение</p><h2>Pre-seed: 5–10 млн ₽</h2><p>Конвертируемый займ с капом оценки 100 млн ₽.</p><div className="summary-results"><h3>Результат этого раунда</h3>{milestones.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><p>{text}</p></div></article>)}</div></div></section>
      <section className="summary-section summary-container"><p className="summary-kicker">Как смотрим на данные</p><h2>Сегодня публичных продуктовых показателей ещё нет.</h2><p className="summary-copy">Вместо декоративных метрик Kognitika публикует показатели только после появления данных, с источником, датой и владельцем. До следующего раунда ключевыми будут регулярность, готовность платить и воспроизводимый канал привлечения.</p></section>
      <section className="summary-contact" id="contact"><div className="summary-container"><p className="summary-kicker">Следующий шаг</p><h2>Материалы и разговор, по запросу</h2><p>Отвечаем в течение одного рабочего дня. Data room открывается вручную после короткого знакомства, без публичных ссылок.</p><a href="/#contact">Запросить материалы <ArrowRight size={17} aria-hidden="true" /></a></div></section>
    </main>
  </div>;
}
