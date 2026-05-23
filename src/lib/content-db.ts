export enum RuleCategory {
  TECHNICAL = 'TECHNICAL',
  SEMANTIC = 'SEMANTIC'
}

export interface RuleSet { 
  id: string; 
  rules: {id:number;text:string}[]; 
  domain: string; 
  category: RuleCategory;
}

export interface ContentCard { id?: number; text: string; isViolation: boolean; ruleRef?: number; subtlety: 'obvious'|'moderate'|'expert'; metadata?: any; }

export const RULE_SETS: RuleSet[] = [
  { id:'sys_deps', category: RuleCategory.TECHNICAL, domain:'Зависимости систем', rules:[{id:1,text:'Модуль B зависит от A — A грузится первым'},{id:2,text:'Кэш очищается только при CRITICAL ошибке'},{id:3,text:'Логи хранятся не менее 30 дней'}] },
  { id:'transactions', category: RuleCategory.TECHNICAL, domain:'Транзакции', rules:[{id:1,text:'Все транзакции подтверждаются получателем'},{id:2,text:'Статус «завершено» — только после проверки'},{id:3,text:'Уведомление до закрытия задачи'}] },
  { id:'seq_control', category: RuleCategory.TECHNICAL, domain:'Управление последовательностью', rules:[{id:1,text:'Объект А всегда больше объекта Б'},{id:2,text:'Процесс X запускается только после Y'}] },
  { id:'api_contract', category: RuleCategory.TECHNICAL, domain:'API контракты', rules:[{id:1,text:'GET-запросы не изменяют состояние'},{id:2,text:'Все поля обязательны, если не помечены optional'},{id:3,text:'Версия API указывается в заголовке'}] },
  { id:'access_ctrl', category: RuleCategory.TECHNICAL, domain:'Контроль доступа', rules:[{id:1,text:'Чтение доступно всем аутентифицированным'},{id:2,text:'Запись только для роли EDITOR и выше'},{id:3,text:'Удаление — исключительно роль ADMIN'}] },
  { id:'deploy_rules', category: RuleCategory.TECHNICAL, domain:'Деплой', rules:[{id:1,text:'Деплой только из ветки main'},{id:2,text:'Тесты должны пройти до деплоя'},{id:3,text:'Rollback выполняется за < 5 минут'}] },
  { id:'data_quality', category: RuleCategory.TECHNICAL, domain:'Качество данных', rules:[{id:1,text:'Дата не может быть в будущем для исторических записей'},{id:2,text:'Email должен содержать символ @'},{id:3,text:'Сумма не может быть отрицательной'}] },
  { id:'security', category: RuleCategory.TECHNICAL, domain:'Безопасность', rules:[{id:1,text:'Пароли хранятся только в хешированном виде'},{id:2,text:'Токены истекают через 24 часа'},{id:3,text:'HTTPS обязателен для всех эндпоинтов'}] },
  { id:'manipulations', category: RuleCategory.SEMANTIC, domain:'Страж Разума: Манипуляции', rules:[{id:1,text:'Газлайтинг: Отрицание реальности и фактов'},{id:2,text:'Подмена тезиса: Подмена аргумента оппонента'},{id:3,text:'Переход на личности: Переход на личности вместо обсуждения темы'},{id:4,text:'Ложная дилемма: Навязывание только двух вариантов выбора'}] },
  { id:'distortions', category: RuleCategory.SEMANTIC, domain:'Страж Разума: Искажения', rules:[{id:1,text:'Эмоциональная нагрузка: Использование гипербол и эмоционально окрашенных слов.'},{id:2,text:'Моральное превосходство: Апелляция к морали для дискредитации оппонента.'},{id:3,text:'Размытость: Использование размытых понятий без конкретики.'},{id:4,text:'Предвзятость подтверждения: Подача фактов исключительно в пользу своей позиции.'}] },
  { id:'hallucinations', category: RuleCategory.SEMANTIC, domain:'Страж Разума: Галлюцинации', rules:[{id:1,text:'Противоречие: Утверждение прямо противоположного исходному факту.'},{id:2,text:'Фабрикация: Добавление деталей, которых нет в контексте.'},{id:3,text:'Логический дрейф: Вывод ложных следствий из верных посылок.'}] }
];

export const CARDS_BY_RULESET: Record<string, ContentCard[]> = {
  sys_deps: [
    {text:'B загружен раньше A — инициализация продолжена',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'A загружен, B инициализирован успешно',isViolation:false,subtlety:'obvious'},
    {text:'ERROR уровень → кэш очищен принудительно',isViolation:true,ruleRef:2,subtlety:'obvious'},
    {text:'CRITICAL → кэш очищен → перезапуск сервиса',isViolation:false,subtlety:'obvious'},
    {text:'Логи за 15 дней удалены для экономии места',isViolation:true,ruleRef:3,subtlety:'obvious'},
    {text:'Логи 45 дней → ротация выполнена',isViolation:false,subtlety:'obvious'},
    {text:'B ждёт загрузки A → OK',isViolation:false,subtlety:'obvious'},
    {text:'WARNING → кэш очищен',isViolation:true,ruleRef:2,subtlety:'moderate'},
    {text:'Логи удалены спустя 31 день после архивации',isViolation:false,subtlety:'moderate'},
    {text:'B инициализирован параллельно с A',isViolation:true,ruleRef:1,subtlety:'moderate'},
    {text:'Кэш сброшен при INFO-событии для производительности',isViolation:true,ruleRef:2,subtlety:'expert'},
    {text:'Логи перенесены на холодное хранилище на 28-й день',isViolation:true,ruleRef:3,subtlety:'expert'},
  ],
  transactions: [
    {text:'Статус «завершено» без подписи получателя',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'Получатель подтвердил → статус обновлён',isViolation:false,subtlety:'obvious'},
    {text:'Ошибка БД → транзакция откатана',isViolation:false,subtlety:'obvious'},
    {text:'Задача закрыта без финального уведомления',isViolation:true,ruleRef:3,subtlety:'obvious'},
  ],
  api_contract: [
    {text:'POST-запрос вернул 201 Created',isViolation:false,subtlety:'obvious'},
    {text:'GET-запрос удалил запись из БД',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'Версия API передана в URL вместо заголовка',isViolation:true,ruleRef:3,subtlety:'moderate'},
  ],
  seq_control: [
    {text:'A = 10, B = 5. Проверка A > B пройдена.',isViolation:false,subtlety:'obvious'},
    {text:'A = 5, B = 10. Ошибка: A должно быть больше Б.',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'Запуск X до завершения Y.',isViolation:true,ruleRef:2,subtlety:'moderate'},
  ],
  access_ctrl: [
    {text:'Пользователь вошел в систему и прочитал данные.',isViolation:false,subtlety:'obvious'},
    {text:'Гость пытается изменить статью (роль EDITOR не найдена).',isViolation:true,ruleRef:2,subtlety:'obvious'},
    {text:'EDITOR удалил системный лог (доступ запрещен).',isViolation:true,ruleRef:3,subtlety:'moderate'},
  ],
  deploy_rules: [
    {text:'Деплой из ветки main в продакшн.',isViolation:false,subtlety:'obvious'},
    {text:'Деплой из feature-ветки напрямую.',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'Откат системы занял 15 минут.',isViolation:true,ruleRef:3,subtlety:'moderate'},
  ],
  data_quality: [
    {text:'Дата рождения: 1990-01-01.',isViolation:false,subtlety:'obvious'},
    {text:'Дата транзакции: 2099-12-31 (будущее).',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'Сумма перевода: -500.00.',isViolation:true,ruleRef:3,subtlety:'obvious'},
  ],
  security: [
    {text:'Пароль сохранен как bcrypt хеш.',isViolation:false,subtlety:'obvious'},
    {text:'Пароль хранится в открытом виде.',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'HTTP соединение для передачи токена.',isViolation:true,ruleRef:3,subtlety:'obvious'},
  ],
  manipulations: [
    {text:'Ты просто слишком чувствительный, я этого никогда не говорил.',isViolation:true,ruleRef:1,subtlety:'obvious'},
    {text:'Раз ты не поддерживаешь эту реформу, значит ты против прогресса вообще.',isViolation:true,ruleRef:3,subtlety:'obvious'},
    {text:'Ваше мнение не имеет значения, потому что вы даже не закончили университет.',isViolation:true,ruleRef:3,subtlety:'obvious'},
    {text:'Либо мы закрываем границы сейчас, либо страна погибнет.',isViolation:true,ruleRef:4,subtlety:'obvious'},
    {text:'Я помню, что ты обещал это сделать, а теперь говоришь, что нет. Это странно.',isViolation:false,subtlety:'obvious'},
    {text:'Этот отчет содержит ошибки в расчетах, давайте перепроверим данные.',isViolation:false,subtlety:'obvious'},
    {text:'Ты просто не в себе сегодня, поэтому всё воспринимаешь в штыки.',isViolation:true,ruleRef:1,subtlety:'moderate'},
    {text:'Мой оппонент хочет, чтобы мы раздали все деньги бедным и стали банкротами.',isViolation:true,ruleRef:2,subtlety:'moderate'},
    {text:'Конечно, он за сохранение парка, он же там живет рядом, ему выгодно.',isViolation:true,ruleRef:3,subtlety:'moderate'},
    {text:'У нас есть два пути: или этот кандидат, или полный хаос и разруха.',isViolation:true,ruleRef:4,subtlety:'moderate'},
    {text:'Вы говорите, что это безопасно, но в прошлый раз вы ошиблись. Где гарантии?',isViolation:false,subtlety:'moderate'},
    {text:'Я уважаю ваше право на мнение, но давайте вернемся к фактам.',isViolation:false,subtlety:'moderate'},
    {text:'Мне жаль, что твоя память тебя подводит, но этого события не было.',isViolation:true,ruleRef:1,subtlety:'expert'},
    {text:'Критики программы просто ненавидят нашу страну и хотят ей зла.',isViolation:true,ruleRef:2,subtlety:'expert'},
    {text:'Он не может рассуждать о семейных ценностях, так как сам в разводе.',isViolation:true,ruleRef:3,subtlety:'expert'},
  ],
  distortions: [
    { id: 1, text: "Ужасающий провал команды привел к абсолютному хаосу на проекте.", isViolation: true, ruleRef: 1, subtlety: 'obvious', metadata: { fact: "Проект не завершен в срок", distortion: "Эмоциональная нагрузка" } },
    { id: 2, text: "Только безответственный человек может игнорировать этот блестящий план.", isViolation: true, ruleRef: 2, subtlety: 'obvious', metadata: { fact: "Предложен новый план", distortion: "Моральное превосходство" } },
    { id: 3, text: "Все эксперты знают, что эта технология — вчерашний день.", isViolation: true, ruleRef: 3, subtlety: 'obvious', metadata: { fact: "Существуют другие технологии", distortion: "Размытость" } },
    { id: 4, text: "Наш лидер совершил героический поступок, просто выполнив свою работу.", isViolation: true, ruleRef: 4, subtlety: 'obvious', metadata: { fact: "Работа выполнена", distortion: "Предвзятость подтверждения" } },
    { id: 5, text: "Их жалкая попытка оправдаться выглядит просто смехотворно.", isViolation: true, ruleRef: 1, subtlety: 'obvious', metadata: { fact: "Предоставлены объяснения", distortion: "Эмоциональная нагрузка" } },
    { id: 6, text: "Очевидно, что любой здравомыслящий человек согласится с моими словами.", isViolation: true, ruleRef: 2, subtlety: 'moderate', metadata: { fact: "Высказано мнение", distortion: "Моральное превосходство" } },
    { id: 7, text: "Компания тонет в долгах, хотя отчет показывает лишь небольшую задолженность.", isViolation: true, ruleRef: 1, subtlety: 'moderate', metadata: { fact: "Есть задолженность", distortion: "Эмоциональная нагрузка" } },
    { id: 8, text: "Эта инновация — настоящий прорыв, который перевернет мир навсегда.", isViolation: true, ruleRef: 3, subtlety: 'moderate', metadata: { fact: "Создан новый продукт", distortion: "Размытость" } },
    { id: 9, text: "Мы должны защитить наши ценности от их деструктивного влияния.", isViolation: true, ruleRef: 2, subtlety: 'moderate', metadata: { fact: "Предложены перемены", distortion: "Моральное превосходство" } },
    { id: 10, text: "Статистика ясно говорит о катастрофе, если мы не увеличим бюджет вдвое.", isViolation: true, ruleRef: 1, subtlety: 'moderate', metadata: { fact: "Предложено увеличить бюджет", distortion: "Эмоциональная нагрузка" } },
    { id: 11, text: "Его критика — это просто зависть к нашему небывалому успеху.", isViolation: true, ruleRef: 4, subtlety: 'expert', metadata: { fact: "Получена критика", distortion: "Предвзятость подтверждения" } },
    { id: 12, text: "Абсолютно все недовольны качеством этого сомнительного сервиса.", isViolation: true, ruleRef: 3, subtlety: 'expert', metadata: { fact: "Есть жалобы на сервис", distortion: "Размытость" } },
    { id: 13, text: "Эта никчемная реформа разрушит жизни миллионов людей.", isViolation: true, ruleRef: 1, subtlety: 'expert', metadata: { fact: "Запущена реформа", distortion: "Эмоциональная нагрузка" } },
    { id: 14, text: "Мы единственные, кто говорит правду в этом океане лжи.", isViolation: true, ruleRef: 2, subtlety: 'expert', metadata: { fact: "Опубликована информация", distortion: "Моральное превосходство" } },
    { id: 15, text: "Их стратегия настолько примитивна, что даже не стоит обсуждения.", isViolation: true, ruleRef: 1, subtlety: 'expert', metadata: { fact: "Представлена стратегия", distortion: "Эмоциональная нагрузка" } }
  ],
  hallucinations: [
    { id: 1, text: "Выручка выросла на 40%, хотя в исходном тексте указано 14%.", isViolation: true, ruleRef: 1, subtlety: 'obvious', metadata: { fact: "Рост 14%", error: "Противоречие" } },
    { id: 2, text: "Проект завершен в марте, что соответствует данным из отчета.", isViolation: false, subtlety: 'obvious', metadata: { fact: "Завершено в марте" } },
    { id: 3, text: "Система использует квантовые вычисления (в контексте об этом ни слова).", isViolation: true, ruleRef: 2, subtlety: 'obvious', metadata: { fact: "Обычная облачная БД", error: "Фабрикация" } },
    { id: 4, text: "Пользователь удалил аккаунт, поэтому он больше не может войти.", isViolation: false, subtlety: 'obvious', metadata: { fact: "Аккаунт удален" } },
    { id: 5, text: "Клиент доволен, так как он оставил жалобу на 3 страницы.", isViolation: true, ruleRef: 3, subtlety: 'obvious', metadata: { fact: "Клиент оставил жалобу", error: "Логический дрейф" } },
    { id: 6, text: "Сервер упал из-за перегрузки, что привело к росту FPS в 2 раза.", isViolation: true, ruleRef: 3, subtlety: 'moderate', metadata: { fact: "Сервер упал", error: "Логический дрейф" } },
    { id: 7, text: "Встреча назначена на 15:00 в Лондоне (в контексте: Париж).", isViolation: true, ruleRef: 1, subtlety: 'moderate', metadata: { fact: "Встреча в Париже", error: "Противоречие" } },
    { id: 8, text: "Бюджет сокращен на 5 млн для найма 10 новых сотрудников.", isViolation: true, ruleRef: 3, subtlety: 'moderate', metadata: { fact: "Бюджет сокращен", error: "Логический дрейф" } },
    { id: 9, text: "Обновление ПО исправило баг, но добавило поддержку AI-моделей.", isViolation: false, subtlety: 'moderate', metadata: { fact: "Обновление исправило баг" } },
    { id: 10, text: "Код написан на Rust, поэтому он потребляет больше памяти, чем Python.", isViolation: true, ruleRef: 3, subtlety: 'expert', metadata: { fact: "Код на Rust", error: "Логический дрейф" } },
    { id: 11, text: "Инфляция 2%, цены упали в три раза.", isViolation: true, ruleRef: 3, subtlety: 'expert', metadata: { fact: "Инфляция 2%", error: "Логический дрейф" } },
    { id: 12, text: "Запуск состоялся в 2024 году, хотя в контексте указан 2026.", isViolation: true, ruleRef: 1, subtlety: 'expert', metadata: { fact: "Запуск в 2026", error: "Противоречие" } }
  ]
};

export function getUniqueSession(ruleSetId: string, seed: number) {
  const ruleSet = RULE_SETS.find(rs => rs.id === ruleSetId);
  if (!ruleSet) throw new Error(`RuleSet ${ruleSetId} not found`);

  const allCards = CARDS_BY_RULESET[ruleSetId] || [];
  
  // Deterministic shuffle using seed
  const shuffle = (array: any[], s: number) => {
    let m = array.length, t, i;
    while (m) {
      const r = Math.sin(s++) * 10000;
      i = Math.floor((r - Math.floor(r)) * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  };

  const shuffled = shuffle([...allCards], seed);

  return {
    ruleSetId,
    rules: ruleSet.rules,
    cards: shuffled.slice(0, 12)
  };
}

export function getScannerSessionForLevel(level: number, userId: number) {
  const semanticSets = ['manipulations', 'distortions', 'hallucinations'];
  const rsId = semanticSets[(level - 1) % semanticSets.length];
  return getUniqueSession(rsId, userId + level);
}

export function getSessionForLevel(level: number, userId: number) {
  const rsIndex = (level - 1) % RULE_SETS.length;
  const ruleSetId = RULE_SETS[rsIndex].id;
  return getUniqueSession(ruleSetId, userId + level);
}
