import { useState, useCallback } from 'react';

export type ResponseType = 'aggressive' | 'passive' | 'empathetic' | 'logical';

export interface DialogueOption {
  id: string;
  text: string;
  type: ResponseType;
  feedback: string;
}

export interface DialogueScenario {
  id: string;
  context: string;
  interlocutor: string;
  avatar: string; // Emoji
  statements: {
    text: string;
    options: DialogueOption[];
  }[];
}

const DIALOGUE_DATABASE: DialogueScenario[] = [
  {
    id: 's1',
    context: 'Коллега недоволен изменениями в проекте, которые вы внедрили без его ведома.',
    interlocutor: 'Алексей, Senior Developer',
    avatar: '😠',
    statements: [
      {
        text: 'Ты вообще понимаешь, что твой последний коммит сломал мне всю архитектуру? Почему ты не посоветовался со мной перед тем, как мержить?',
        options: [
          {
            id: 'o1',
            text: 'Мой код прошел все тесты. Если у тебя что-то сломалось, проблема на твоей стороне.',
            type: 'aggressive',
            feedback: 'Защитная агрессия. Эскалирует конфликт и не решает проблему.'
          },
          {
            id: 'o2',
            text: 'Извини, я не думал, что это повлияет на твою часть. Давай я всё откачу обратно.',
            type: 'passive',
            feedback: 'Чрезмерная уступчивость. Снимает напряжение, но вредит проекту.'
          },
          {
            id: 'o3',
            text: 'Я вижу, что это вызвало проблемы. Давай посмотрим вместе, где именно возник конфликт, чтобы быстро его решить.',
            type: 'empathetic',
            feedback: 'Отличный выбор! Признание проблемы без потери конструктива (Win-Win).'
          },
          {
            id: 'o4',
            text: 'Я действовал строго по ТЗ. Изменения архитектуры были согласованы с менеджером.',
            type: 'logical',
            feedback: 'Формально верно, но игнорирует эмоции коллеги, что может оставить скрытое напряжение.'
          }
        ]
      }
    ]
  },
  {
    id: 's2',
    context: 'Заказчик звонит в панике в пятницу вечером и требует переделать часть работы до понедельника.',
    interlocutor: 'Елена, Клиент',
    avatar: '😰',
    statements: [
      {
        text: 'Это катастрофа! Инвесторы не приняли дизайн. Нам нужно полностью перерисовать главную страницу к утру понедельника!',
        options: [
          {
            id: 'o1',
            text: 'Елена, выходные — не рабочее время. Мы сможем заняться этим только в понедельник утром.',
            type: 'logical',
            feedback: 'Защита границ, но в слишком жесткой форме, которая пугает клиента.'
          },
          {
            id: 'o2',
            text: 'Я понимаю, что ситуация стрессовая. Давайте сейчас зафиксируем 2-3 самых критичных замечания инвесторов, и я посмотрю, что мы успеем сделать.',
            type: 'empathetic',
            feedback: 'Идеально! Вы присоединились к эмоции (успокоили) и сузили задачу до реалистичных масштабов.'
          },
          {
            id: 'o3',
            text: 'Да, конечно, я всё сделаю, не волнуйтесь. В понедельник всё будет готово.',
            type: 'passive',
            feedback: 'Вы взяли на себя нереалистичные обязательства из-за страха перед конфликтом.'
          },
          {
            id: 'o4',
            text: 'Вы сами утвердили этот дизайн в среду. Если нужно переделывать, это будет стоить вдвое дороже.',
            type: 'aggressive',
            feedback: 'Обвинение клиента в момент его уязвимости убьет доверие навсегда.'
          }
        ]
      }
    ]
  }
];

export function useSocialEQEngine(seed: number, level: number) {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [scenarios, setScenarios] = useState<DialogueScenario[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ isOptimal: boolean, text: string } | null>(null);

  const startSession = useCallback(() => {
    const shuffled = [...DIALOGUE_DATABASE].sort(() => Math.random() - 0.5);
    setScenarios(shuffled.slice(0, 2)); // 2 scenarios per session
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setLastFeedback(null);
  }, []);

  const submitAnswer = useCallback((option: DialogueOption) => {
    if (!isActive || isFinished) return;

    const isOptimal = option.type === 'empathetic';

    setLastFeedback({
      isOptimal,
      text: option.feedback
    });

    if (isOptimal) {
      setScore(prev => prev + 50);
    } else if (option.type === 'logical') {
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
    }, 3500); // Wait 3.5s to read feedback
  }, [isActive, isFinished, currentIndex, scenarios]);

  return {
    currentScenario: scenarios[currentIndex],
    progress: (currentIndex / (scenarios.length || 1)) * 100,
    isActive,
    isFinished,
    score,
    startSession,
    submitAnswer,
    itemsRemaining: scenarios.length - currentIndex,
    lastFeedback
  };
}
