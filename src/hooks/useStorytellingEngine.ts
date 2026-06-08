import { useState, useCallback } from 'react';

export interface StorytellingScenario {
  id: string;
  conceptA: string;
  conceptB: string;
  options: {
    id: string;
    text: string;
    type: 'compelling' | 'absurd' | 'complex';
    feedback: string;
  }[];
}

const STORYTELLING_DATABASE: StorytellingScenario[] = [
  {
    id: 'st1',
    conceptA: 'Блокчейн',
    conceptB: 'Выращивание помидоров',
    options: [
      {
        id: 'o1',
        text: 'Блокчейн — это сложная система баз данных, а помидоры растут в земле, поэтому между ними нет никакой связи, кроме того, что фермер может купить биткоин.',
        type: 'absurd',
        feedback: 'Слишком буквально и отрицает связь. Сторителлинг требует фантазии.'
      },
      {
        id: 'o2',
        text: 'Представьте систему, где история каждого помидора — от семечка до полки супермаркета — записана в неизменяемый реестр. Вы сканируете QR-код на салате и точно знаете, кто, где и без каких пестицидов его вырастил.',
        type: 'compelling',
        feedback: 'Отлично! Яркая, понятная история, соединяющая технологии и повседневность.'
      },
      {
        id: 'o3',
        text: 'Агрономическая консенсус-модель на базе Proof-of-Stake позволяет токенизировать урожайность пасленовых, создавая децентрализованный смарт-контракт для дистрибуции.',
        type: 'complex',
        feedback: 'Перегружено терминами. История должна быть понятна всем.'
      }
    ]
  },
  {
    id: 'st2',
    conceptA: 'Космические путешествия',
    conceptB: 'Заваривание чая',
    options: [
      {
        id: 'o1',
        text: 'Так же, как чайному листу нужно время, чтобы раскрыть свой вкус в горячей воде, человечеству нужно время и колоссальная энергия, чтобы раскрыть свой потенциал за пределами Земли.',
        type: 'compelling',
        feedback: 'Прекрасная метафора! Глубоко и поэтично.'
      },
      {
        id: 'o2',
        text: 'Астронавты пьют чай из специальных пакетиков в невесомости, потому что вода может разлететься по кораблю и замкнуть приборы.',
        type: 'absurd',
        feedback: 'Это просто факт, а не метафора или смысловая связь.'
      },
      {
        id: 'o3',
        text: 'Термодинамика экстракции катехинов при 90°C подобна теплообмену в соплах ракетных двигателей при выходе на орбиту.',
        type: 'complex',
        feedback: 'Слишком технично. Вы потеряли слушателя на слове "экстракция".'
      }
    ]
  },
  {
    id: 'st3',
    conceptA: 'Ошибки в коде (баги)',
    conceptB: 'Джазовая импровизация',
    options: [
      {
        id: 'o1',
        text: 'Баги нужно фиксить, а джаз — это музыка. Они не связаны.',
        type: 'absurd',
        feedback: 'Отказ от поиска связей — враг креативности.'
      },
      {
        id: 'o2',
        text: 'Полиморфные аномалии в рантайме создают стохастический паттерн, подобный синкопированным ритмам в бибопе.',
        type: 'complex',
        feedback: 'Слишком заумно. История должна упрощать понимание, а не усложнять.'
      },
      {
        id: 'o3',
        text: 'В джазе говорят: "Нет неправильных нот, есть неправильные продолжения". Точно так же неожиданное поведение системы может стать основой для новой, гениальной фичи, если разработчик "подыграет" ей.',
        type: 'compelling',
        feedback: 'Блестяще! Вы нашли объединяющий философский принцип.'
      }
    ]
  }
];

export function useStorytellingEngine(seed: number, level: number) {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0); 
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [scenarios, setScenarios] = useState<StorytellingScenario[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ type: string, text: string } | null>(null);

  const startSession = useCallback(() => {
    const shuffled = [...STORYTELLING_DATABASE].sort(() => Math.random() - 0.5);
    setScenarios(shuffled.slice(0, 3));
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setLastFeedback(null);
  }, []);

  const submitAnswer = useCallback((optionId: string) => {
    if (!isActive || isFinished) return;

    const currentScenario = scenarios[currentIndex];
    const selectedOption = currentScenario.options.find(o => o.id === optionId);
    
    if (!selectedOption) return;

    setLastFeedback({
      type: selectedOption.type,
      text: selectedOption.feedback
    });

    if (selectedOption.type === 'compelling') {
      setScore(prev => prev + 100);
    } else if (selectedOption.type === 'complex') {
      setScore(prev => prev + 20);
    }

    setTimeout(() => {
      setLastFeedback(null);
      if (currentIndex + 1 >= scenarios.length) {
        setIsFinished(true);
        setIsActive(false);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 3500);
  }, [isActive, isFinished, currentIndex, scenarios]);

  return {
    currentScenario: scenarios[currentIndex],
    progress: (currentIndex / (scenarios.length || 1)) * 100,
    isActive,
    isFinished,
    score,
    startSession,
    submitAnswer,
    lastFeedback
  };
}
