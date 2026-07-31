# Ежедневная практика (Daily Practice)

**Маршрут**: `/` (Dashboard) → Daily Trajectory Panel · **Компоненты**: `Dashboard`, `DailyTrajectoryPanel`, `PracticeFlowEngine` · **Домен**: Адаптивное планирование · Спайсинг · Регуляция нагрузки

---

## Назначение

**Daily Practice** — движок адаптивного планирования: каждый день пользователь видит 3 персональные задачи, оптимизированные под его когнитивный профиль, текущую усталость и цели. Цель — **поддерживать стрик**, **предотвращать выгорание**, **сбалансировать домены**.

---

## Архитектура

### 1. Источники данных (входы)

| Источник | Данные | Вес |
|---|---|---|
| **Cognitive Profile** | domainScores, module trends, accuracy, fatigue | 40% |
| **Rust Analytics** (last session) | `fatigueIndex`, `engagementIndex`, `recommendationSignals` | 30% |
| **History** | `streakDays`, `daysSinceLastPlay`, `recentModules` | 20% |
| **User preferences** | `preferredDomains`, `difficultyPreference` (если заведены) | 10% |

### 2. Генерация плана (`generateDailyPlan`)

```typescript
// Запускается: ночной крон (03:00 UTC) + при открытии Dashboard
async function generateDailyPlan(userId: string): Promise<DailyPracticePlan> {
  const profile = await getCognitiveProfile(userId);
  const lastSession = await getLastSessionAnalytics(userId);
  const history = await getRecentHistory(userId, 30);
  
  const candidates = ALL_MODULES
    .filter(m => isUnlocked(m, profile))           // доступность
    .map(m => ({
      moduleId: m.id,
      priority: calculatePriority(m, profile, lastSession, history),
      reason: generateReason(m, profile, lastSession),
      rewardXp: calculateReward(m, profile),
      estimatedTimeMs: getNormativeTime(m),
      difficulty: getRecommendedDifficulty(m, profile)
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);  // Топ-3
  
  return { userId, date: today(), items: candidates };
}
```

### 3. Формула приоритета (`calculatePriority`)

```
Priority = 
  +40  IF trend === 'declining'                    // Ухудшается — лечить
  +30  IF accuracy < 0.80                          // Низкое качество
  +25  IF recommendationSignals.has('weak_area')   // Rust signal
  +20  IF daysSinceLastPlay(module) > 7            // Давно не тренировал
  +15  IF recommendationSignals.has('streak_maintenance') // В форме
  +15  IF domainScore(domain) < 60                 // Слабый домен
  +10  IF recommendationSignals.has('variety')     // Разнообразие
  -50  IF recommendationSignals.has('recovery')    // Усталость → не рекомендовать
  -30  IF fatigueIndex > 0.25                      // Высокая усталость
  -20  IF engagementIndex < 0.35                   // Низкая вовлечённость
```

**Мин. приоритет для включения в топ-3**: > 0 (иначе слот = «Отдых / Тишина»)

### 4. Reward XP (`calculateReward`)

```
BaseXP = module.baseXP (50–200)
WeaknessBonus = domainScore < 60 ? +50% : 0
StreakBonus = streakDays > 7 ? +25% : 0
VarietyBonus = module not in last 3 days ? +15% : 0
Final = round(BaseXP * (1 + WeaknessBonus + StreakBonus + VarietyBonus))
```

---

## UI: Daily Trajectory Panel

### Компонент `DailyTrajectoryPanel` (на Dashboard)

| Элемент | Описание |
|---|---|
| **Дата / День недели** | Локализованная |
| **Стрик** | 🔥 `streakDays` дней подряд |
| **3 карточки задач** | По одной на рекомендацию |
| **Прогресс-бар дня** | 0/3 → 3/3 completed |
| **Кнопка «Начать»** | Навигация на `/moduleId?from=daily` |

### Карточка задачи (Task Card)

| Поле | Визуализация |
|---|---|
| Иконка модуля | `LucideIcon` из `ROUTE_DEFINITIONS` |
| Название | `KnowledgeArticle.title` |
| Причина | Текст `reason` (например: «Точность 76% — пора укрепить базу») |
| Награда | `+150 XP` (зеленый) |
| Время | `~5 мин` (норматив) |
| Сложность | Бейдж: `Adaptive` / `Level 2` / `Gorbov` |
| Статус | ✅ Выполнено / ⏳ В процессе / ⭕ Не начато |

### Состояния карточки
| Состояние | Визуал | Действие |
|---|---|---|
| `pending` | Серый бордер, кнопка «Начать» | `navigate('/module')` |
| `in_progress` | Пульсирующий синий, кнопка «Продолжить» | `navigate('/module')` |
| `completed` | Зелёный чекмарк, XP анимация | — |
| `rest` | Иконка 🛌, текст «День восстановления» | Навигация на `/silence` или `/focus` |

---

## Спайсинг и регуляция нагрузки

### Принципы
1. **Минимум 1 день отдыха в 7** — если `streakDays % 7 === 0` → одна карточка = `rest`
2. **Recovery signal** — если `fatigueIndex > 0.2` ИЛИ `engagementIndex < 0.35` → принудительно подставляется `/silence` или `/focus` с повышенным XP (+50%)
3. **Hard cap** — не более 2 тренировок из одного домена в день
4. **Progressive overload** — если `trend === 'improving'` 3+ дня → `difficulty++` на следующей сессии

### Пример дня (JSON)
```json
{
  "date": "2026-07-29",
  "streakDays": 12,
  "items": [
    {
      "moduleId": "nback",
      "priority": 87,
      "reason": "Тренд declining 3 день, accuracy 74% → нужно восстановить рабочую память",
      "rewardXp": 180,
      "estimatedTimeMs": 180000,
      "difficulty": "Adaptive (2-back)",
      "status": "pending"
    },
    {
      "moduleId": "schulte",
      "priority": 72,
      "reason": "Стабильно в норме, поддержание стрика",
      "rewardXp": 120,
      "estimatedTimeMs": 45000,
      "difficulty": "Classic 5×5",
      "status": "completed"
    },
    {
      "moduleId": "silence",
      "priority": 65,
      "reason": "Rust signal: fatigueIndex 0.31 → рекомендуется восстановление",
      "rewardXp": 200,
      "estimatedTimeMs": 120000,
      "difficulty": "2 min breathing",
      "status": "pending"
    }
  ],
  "completedCount": 1,
  "totalXpEarned": 120
}
```

---

## API

```typescript
// GET /api/dashboard/status (auth)
// Response включает dailyPlan
{
  "user": { ... },
  "profile": { ... },
  "dailyPlan": {
    "date": "2026-07-29",
    "streakDays": 12,
    "items": [ ... ],  // 3 задачи
    "completedCount": 1,
    "totalXpEarned": 120
  },
  "leaderboard": { "rank": 42, "totalUsers": 1247 }
}
```

```typescript
// POST /api/daily-practice/complete
// Body: { moduleId: "nback", sessionId: "clx...", fromDaily: true }
// Response: { xpAwarded: 180, streakDays: 13, nextPlan: { ... } }
```

---

## Научная база

| Концепция | Применение |
|---|---|
| **Spaced Repetition** (Ebbinghaus) | `daysSinceLastPlay > 7` → приоритет повтора |
| **Variability of Practice** (Schmidt) | `variety` бонус → чередование доменов |
| **Deliberate Practice** (Ericsson) | `declining trend` → фокус на слабом |
| **Recovery / Supercompensation** | `fatigueIndex` → forced rest с бонусом XP |
| **Self-Determination Theory** | `autonomy` (выбор из 3), `competence` (адаптивная сложность), `relatedness` (стрик, лидерборд) |

---

## Страницы на сайте

| Страница | URL | Компонент |
|---|---|---|
| **Dashboard (с Daily Panel)** | https://kognitika.ru/ | `Dashboard` |
| **Когнитивный профиль** | https://kognitika.ru/profile | `CognitiveProfile` (полная история планов) |

---

## Связанные компоненты

| Компонент | Назначение |
|---|---|
| `Dashboard.tsx` | Главная страница с DailyTrajectoryPanel |
| `DailyTrajectoryPanel.tsx` | UI 3 карточек дня |
| `PracticeFlowEngine.ts` | Генерация плана, расчёт приоритетов |
| `CompletionRecommendation.tsx` | После сессии: «Что дальше» с учётом daily plan |
| `PostGameInsight.tsx` | Инсайты + обновление daily plan |
| `CognitiveProfile.tsx` | История планов, аналитика выполнения |
