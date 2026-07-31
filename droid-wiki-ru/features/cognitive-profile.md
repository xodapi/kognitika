# Когнитивный профиль (Cognitive Profile)

**Маршрут**: `/profile` · **Компонент**: `CognitiveProfile` · **Домен**: Адаптивная аналитика · Персональные рекомендации · Экспорт данных

---

## Назначение

**Cognitive Profile** — центральная страница пользователя: агрегированная аналитика всех завершённых тренировок, визуализация сильных/слабых зон, адаптивные рекомендации на следующую неделю и кнопка **Privacy-safe экспорта** для LLM-анализа.

---

## Структура страницы

### 1. Header профиля
| Элемент | Источник |
|---|---|
| Псевдоним | `User.pseudonym` (Brain ID детерминированный) |
| Уровень / XP | `User.level` / `User.experience` |
| Рейтинг | `User.rating` (Elo-like) |
| Стрик дней | `User.streakDays` |
| Аватар | `BrainIdBadge` (цвет по уровню) |

### 2. Сводка по модулям (Module Cards)
Сетка карточек — по одной на каждый тренажёр, где есть хотя бы 1 завершённая сессия.

| Поле карточки | Формула / Источник |
|---|---|
| **Название** | `KnowledgeArticle.title` |
| **Сессий** | `COUNT(GameSession WHERE gameType = module AND isCompleted)` |
| **Лучшее время / Счёт** | `MIN/MAX(score/timeMs)` |
| **Медиана** | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score)` |
| **Точность** | `AVG(accuracy)` из метаданных |
| **Тренд** | `improving / stable / declining` (compare last 10 vs prev 10) |
| **Норматив** | зелёная/жёлтая/красная полоска относительно `normative.targetMs` |

**Цвет тренда**:
- 🟢 `improving` — медиана улучшилась > 5%
- 🟡 `stable` — ±5%
- 🔴 `declining` — ухудшилась > 5%

### 3. Когнитивная карта (Radar Chart)
`CognitiveModuleGraph` — радиальная диаграмма по 5 доменам:

| Домен | Модули-источники |
|---|---|
| **Внимание** | Schulte, Stroop, Noise, Typing |
| **Память** | N-Back, Spatial, Topology |
| **Логика** | Numerical, Logical, Collision, Dispatcher |
| **Критическое мышление** | Scanner, Decryptor, Reality, Hype, Objective, Profiling |
| **Регуляция** | Silence, Focus, Reframing, Rejection, Luscher |

**Формула домена**: средневзвешенная нормализованная метрика (score/норматив × accuracy) по модулям домена.

### 4. Адаптивные рекомендации (Daily Practice Plan)
Алгоритм `generateDailyPlan()` (запускается ночным кроном + при открытии профиля):

```typescript
// Упрощённая логика
const recommendations = modules
  .filter(m => m.sessions > 0)
  .map(m => ({
    moduleId: m.id,
    priority: calculatePriority(m),  // см. ниже
    reason: generateReason(m),
    rewardXp: baseXp * (1 + weaknessBonus)
  }))
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 3);
```

**Приоритет** = взвешенная сумма:
| Фактор | Вес | Логика |
|---|---|---|
| `trend === 'declining'` | +40 | Ухудшается — нужно тренировать |
| `accuracy < 80%` | +30 | Низкая точность → упростить / повторить |
| `daysSinceLastPlay > 7` | +20 | Давно не тренировал |
| `streakMaintenance` | +15 | Rust-analytics signal |
| `variety` | +10 | Не тренировал этот домен > 3 дня |
| `recovery` | -50 | Rust signal: fatigueIndex > 0.2 → не рекомендовать |

### 5. Кнопка экспорта (Privacy-Safe)
**URL**: `GET /api/analytics/export`  
**Файл**: `kognitika_export_YYYY-MM-DD.json`  
**Формат**: см. [Data Export](data-export.md) — `safe_for_external_llm: true`

---

## API

```typescript
// GET /api/dashboard/status  (авторизованный)
// Response
{
  "user": { "pseudonym", "level", "experience", "rating", "streakDays", "bonuses" },
  "profile": {                     // CognitiveProfile data
    "modules": [
      { "moduleId": "schulte", "sessions": 25, "bestScore": 12400, "medianScore": 8450,
        "accuracy": 98.5, "trend": "improving", "lastPlayedAt": "2026-07-28T..." }
    ],
    "domainScores": { "attention": 78, "memory": 65, "logic": 71, "critical": 62, "regulation": 58 },
    "recommendations": [
      { "moduleId": "nback", "priority": 87, "reason": "declining trend, accuracy 78%", "rewardXp": 150 },
      { "moduleId": "silence", "priority": 72, "reason": "recovery signal (fatigueIndex 0.31)", "rewardXp": 100 }
    ],
    "dailyTasks": [
      { "id": "mental-math", "title": "Быстрые вычисления", "completed": false, "reward": 100 },
      { "id": "schulte-90", "title": "Таблица 1-90", "completed": true, "reward": 150 }
    ]
  },
  "leaderboard": { "rank": 42, "totalUsers": 1247 }
}
```

---

## Научная база

| Концепция | Применение |
|---|---|
| **Metacognitive awareness** (Flavell, 1979) | Пользователь видит свои паттерны → улучшает самоконтроль |
| **Growth mindset feedback** (Dweck) | Тренды формулируются как «область роста», а не «неудача» |
| **Spaced repetition / Variability** | Рекомендации чередуют домены (variety bonus) |
| **Self-regulation** (Zimmerman) | План на день = цель + мониторинг + рефлексия |

---

## Пример использования (LLM-анализ профиля)

1. Открыть профиль → нажать **«Экспорт»**
2. Загрузить `kognitika_export_2026-07-29.json` в ChatGPT / Claude
3. Промпт:
   > «Это мои когнитивные данные за 3 месяца. Проанализируй доменные баллы (attention, memory, logic, critical, regulation), тренды модулей, рекомендации. Дай конкретный 7-дневный план с обоснованием каждого модуля. Верни JSON.»
4. LLM вернёт структурированный план (см. [Data Export](data-export.md#llm-анализ-динамики-навыков))

---

## Страница на сайте

| Страница | URL | Компонент |
|---|---|---|
| **Когнитивный профиль** | https://kognitika.ru/profile | `CognitiveProfile` |
| **Dashboard (обзор)** | https://kognitika.ru/ | `Dashboard` |
| **Когнитивная карта** | https://kognitika.ru/cognitive-map | `CognitiveMap` |

---

## Связанные компоненты

| Компонент | Назначение |
|---|---|
| `CognitiveProfile.tsx` | Основная страница профиля |
| `CognitiveModuleGraph.tsx` | Radar chart доменов |
| `CognitiveMap.tsx` | Визуализация связей навыков |
| `DailyTrajectoryPanel.tsx` | Панель дневной траектории |
| `PostGameInsight.tsx` | Инсайты после каждой сессии |
| `CompletionRecommendation.tsx` | Рекомендация что делать дальше |
| `BrainIdBadge.tsx` | Аватар/бейдж уровня |
