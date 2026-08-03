import { ArrowLeft, ArrowRight, BookOpen, Brain, Eye, Focus, Grid3X3, ListChecks, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import './science.css';

const PRODUCT_URL = 'https://kognitika.ru';

const trainers = [
  { icon: Grid3X3, name: 'Таблицы Шульте', skill: 'Зрительный поиск и концентрация', task: 'Найти числа в правильном порядке в таблице.', metric: 'Время, ошибки и стабильность темпа.', basis: 'Задача на зрительное сканирование и распределение внимания.', route: '/schulte' },
  { icon: Eye, name: 'Эффект Струпа', skill: 'Контроль автоматических реакций', task: 'Назвать цвет текста, а не прочитать слово.', metric: 'Точность, время реакции и разница в конфликтных стимулах.', basis: 'Классическая задача на разрешение конфликта между чтением и цветом.', route: '/stroop' },
  { icon: Brain, name: 'N-назад', skill: 'Рабочая память', task: 'Сопоставить текущий символ с тем, что было несколько шагов назад.', metric: 'Точность, пропуски и ложные совпадения.', basis: 'Задача нагружает удержание, обновление и отбор информации.', route: '/nback' },
  { icon: Focus, name: 'Глубокий фокус', skill: 'Устойчивое внимание', task: 'Работать над своей задачей и отмечать отвлечения, затем возвращаться к ней.', metric: 'Частота отвлечений и время возврата.', basis: 'Практика замечания ухода внимания и мягкого возвращения к цели.', route: '/focus' },
  { icon: Sparkles, name: 'Смысловой сканер', skill: 'Критическое чтение', task: 'Найти в тексте манипулятивные приёмы и скрытые допущения.', metric: 'Доля найденных паттернов и точность классификации.', basis: 'Учебные сценарии на проверку аргументов, фрейминга и эмоционального давления.', route: '/scanner' },
  { icon: ListChecks, name: 'Архитектура контекста', skill: 'Структурная память', task: 'Запомнить связи между объектами и восстановить схему.', metric: 'Точность узлов, связей и время восстановления.', basis: 'Задача на удержание отношений между элементами, а не простого списка.', route: '/topology' },
];

const terms = [
  ['Внимание', 'Способность удерживать фокус на задаче и замечать то, что сейчас важно.'],
  ['Рабочая память', 'Кратковременное удержание и обновление информации, пока человек решает задачу.'],
  ['Исполнительный контроль', 'Способность остановить привычную реакцию, выбрать правило и следовать ему.'],
  ['Критическое чтение', 'Проверка утверждений, источников, аргументов и скрытых допущений в тексте.'],
  ['Метрика занятия', 'Показатель конкретной сессии, например время, точность или число ошибок. Это не диагноз и не оценка интеллекта.'],
  ['Регулярная практика', 'Небольшие повторяющиеся занятия, где человек видит свой результат и выбирает следующий шаг.'],
];

export default function SciencePage() {
  useEffect(() => {
    document.title = 'Научная основа тренажёров Kognitika';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Научная основа тренажёров Kognitika: задачи, показатели, ограничения и понятный словарь терминов.');
  }, []);

  return <div className="science-page" id="top">
    <a className="science-skip" href="#science-main">К основному содержанию</a>
    <header className="science-nav"><div className="science-container science-nav-inner"><a className="science-brand" href="/"><span>K</span>KOGNITIKA</a><nav aria-label="Навигация научной страницы"><a href="#trainers">Тренажёры</a><a href="#method">Как читать результаты</a><a href="#terms">Термины</a></nav><a className="science-back" href="/"><ArrowLeft size={16} aria-hidden="true" /> Для инвесторов</a></div></header>
    <main id="science-main">
      <section className="science-hero"><div className="science-container"><p className="science-kicker">Открытая методология продукта</p><h1>Научная основа<br /><em>тренажёров Kognitika</em></h1><p className="science-lead">Коротко и понятным языком: какие задачи используются в продукте, что они тренируют, какие показатели показывают и чего по ним нельзя заключать.</p><div className="science-actions"><a href="#trainers">Посмотреть тренажёры <ArrowRight size={17} /></a><a href={PRODUCT_URL} target="_blank" rel="noreferrer">Открыть продукт <ArrowRight size={17} /></a></div></div></section>
      <section className="science-principles"><div className="science-container science-principles-grid"><article><BookOpen /><h2>Из известных задач</h2><p>В продукте используются распространённые учебные и исследовательские парадигмы, например Струп и N-назад.</p></article><article><ListChecks /><h2>Измеряем сессию</h2><p>Время, точность и ошибки описывают конкретное занятие, а не человека целиком.</p></article><article><Brain /><h2>Без медицинских заявлений</h2><p>Тренажёры не диагностируют заболевания, не заменяют специалиста и не обещают перенос результата на все жизненные задачи.</p></article></div></section>
      <section className="science-section science-container" id="trainers"><header className="science-intro"><p>Ключевые тренажёры</p><h2>Каждая задача тренирует конкретное действие</h2><span>Описание основано на versioned product wiki. Мы публикуем только понятную пользователю часть методологии, без внутренних данных и приватного GitHub.</span></header><div className="trainer-grid">{trainers.map(({ icon: Icon, name, skill, task, metric, basis, route }) => <article className="trainer-card" key={name}><Icon aria-hidden="true" /><p className="trainer-skill">{skill}</p><h3>{name}</h3><dl><div><dt>Что делает человек</dt><dd>{task}</dd></div><div><dt>Что видно после занятия</dt><dd>{metric}</dd></div><div><dt>Почему эта задача выбрана</dt><dd>{basis}</dd></div></dl><a href={`${PRODUCT_URL}${route}`} target="_blank" rel="noreferrer">Открыть тренажёр <ArrowRight size={15} aria-hidden="true" /></a></article>)}</div></section>
      <section className="science-section science-method" id="method"><div className="science-container science-method-grid"><div><p className="science-kicker">Как читать результаты</p><h2>Результат — это обратная связь, не ярлык</h2><p>Одна сессия зависит от сна, усталости, условий и сложности задания. Полезнее смотреть на собственную динамику в сопоставимых условиях, чем сравнивать себя с чужими цифрами.</p></div><ol><li><span>01</span><div><strong>Сначала точность</strong><p>Скорость без контроля ошибок редко даёт полезный навык.</p></div></li><li><span>02</span><div><strong>Затем устойчивость</strong><p>Повторяемость результата важнее разового рекорда.</p></div></li><li><span>03</span><div><strong>Потом следующий шаг</strong><p>Сложность растёт постепенно, без занятия «через силу».</p></div></li></ol></div></section>
      <section className="science-section science-container" id="terms"><header className="science-intro"><p>Без жаргона</p><h2>Словарь страницы</h2><span>Незнакомые слова должны объяснять продукт, а не усложнять его.</span></header><dl className="science-terms">{terms.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl></section>
      <section className="science-safety"><div className="science-container"><p className="science-kicker">Важное ограничение</p><h2>Это практика, не медицинская диагностика</h2><p>Kognitika не ставит диагнозы, не лечит и не гарантирует улучшения здоровья, памяти или интеллекта. При стойких трудностях с вниманием, памятью или самочувствием стоит обратиться к квалифицированному специалисту.</p></div></section>
    </main>
    <footer className="science-footer"><div className="science-container"><a className="science-brand" href="/"><span>K</span>KOGNITIKA</a><p>Научная основа тренажёров, открытая для пользователей и партнёров.</p><a href="#top">Наверх</a></div></footer>
  </div>;
}
