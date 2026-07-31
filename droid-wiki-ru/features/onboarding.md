# Онбординг (Onboarding)

**Маршрут**: `/onboarding` (модалка при первом входе) · **Компонент**: `OnboardingModal` · **Домен**: Адаптация · Персонализация · Снижение барьера входа

---

## Назначение

**Онбординг** — процесс знакомства нового пользователя с платформой: от получения Brain ID до первой завершённой тренировки. Цель — **активация** (First Completed Session) за < 5 минут.

---

## Этапы (Flow)

### 1. Приветствие (Welcome Screen)
```
┌─────────────────────────────────────┐
│  🧠 Добро пожаловать в Когнитику    │
│                                     │
│  Твоя личная когнитивная платформа: │
│  ▸ 28 тренажёров внимания, памяти,  │
│    логики и критического мышления   │
│  ▸ Анонимно: только Brain ID        │
│  ▸ Экспорт данных для LLM-анализа   │
│                                     │
│  [ Продолжить → ]                   │
└─────────────────────────────────────┘
```
- **Данные**: Brain ID уже создан (POST /auth/brain), показывается псевдоним
- **Действие**: Кнопка «Продолжить» → сохраняет `onboardingStep: 1` в localStorage

### 2. Выбор цели (Goal Selection) — опционально
```
┌─────────────────────────────────────┐
│  Что хочешь улучшить? (до 3х)       │
│                                     │
│  ☐ Внимание и фокус                 │
│  ☐ Рабочая память                   │
│  ☐ Скорость мышления                │
│  ☐ Критическое мышление             │
│  ☐ Стрессоустойчивость              │
│  ☐ Социальные навыки                │
│                                     │
│  [ Пропустить ]   [ Далее → ]       │
└─────────────────────────────────────┘
```
- **Данные**: сохраняются в `User.preferences.goals` (JSON массив)
- **Использование**: влияет на `DailyPracticePlan` (domain weights)

### 3. Демо-тренировка (Interactive Demo)
```
┌─────────────────────────────────────┐
│  Давай попробуем: Таблицы Шульте    │
│                                     │
│  [Интерактивная 3x3 сетка]          │
│  Найди 1 → 2 → 3...                 │
│                                     │
│  ⏱ 12.3s   ✅ 3/9                   │
│                                     │
│  [ Завершить демо ]                 │
└─────────────────────────────────────┘
```
- **Модуль**: `SCHULTE` (упрощённый 3×3, 9 чисел)
- **Цель**: дать мгновенный успех (completion rate > 95%)
- **Награда**: +50 XP (дополнительно к Welcome 100 XP)
- **Данные**: `GameSession` с `metadata.demo: true`

### 4. Профиль и экспорт (Profile & Export)
```
┌─────────────────────────────────────┐
│  Твой профиль готов!                │
│                                     │
│  🆔 Brain ID: 550e8400-e29b-...     │
│  👤 Псевдоним: Swift-Falcon-7421    │
│  ⭐ Уровень: 1  |  XP: 250          │
│                                     │
│  ⚠️  ВАЖНО: Сохрани Brain ID!       │
│  Без него доступ не восстановить.   │
│                                     │
│  [ Скопировать Brain ID ]           │
│  [ QR-код для телефона ]            │
│  [ В профиль → ]                    │
└─────────────────────────────────────┘
```
- **Действия**: Copy to clipboard, Save as QR (PNG), Download backup.txt
- **Флаг**: `onboardingCompleted: true` → больше не показывать модалку

---

## Состояние (State Machine)

| Состояние | Условие перехода | Данные |
|---|---|---|
| `not_started` | первый вход (нет `onboardingCompleted` в localStorage) | — |
| `welcome` | click "Продолжить" | — |
| `goals` | click "Далее" / "Пропустить" | `goals[]` |
| `demo` | click "Начать демо" | `demoModule: "SCHULTE"` |
| `demo_playing` | игра активна | `sessionId` |
| `demo_done` | сессия завершена | `demoXp: 50` |
| `profile` | click "В профиль" | — |
| `completed` | click "В профиль" на экране профиля | `onboardingCompleted: true` |

**Восстановление**: если пользователь закрыл модалку на шаге `demo_playing` → при следующем входе продолжает с `demo` (localStorage `onboardingStep: 3`).

---

## API

```typescript
// GET /api/onboarding/state (auth)
// Response
{
  "step": "welcome",  // или goals, demo, profile, completed
  "goals": [],
  "demoModule": "SCHULTE",
  "completed": false
}

// PATCH /api/onboarding/step (auth)
// Body: { step: "goals", data: { goals: ["attention", "memory"] } }
// Response: { step: "demo", data: { demoModule: "SCHULTE" } }

// POST /api/onboarding/complete (auth)
// Body: { brainIdSaved: true }
// Response: { onboardingCompleted: true, xpAwarded: 50 }
```

---

## Персонализация после онбординга

| Источник | Влияет на |
|---|---|
| `goals[]` | `DailyPracticePlan` domain weights (выбранные цели → +30% приоритет) |
| `demoModule` completion | Первый `DailyTrajectoryPanel` включает этот модуль |
| `brainIdSaved: true` | Не показывать баннер «Сохрани Brain ID» |

---

## Метрики онбординга (для админки)

| Метрика | Целевое значение |
|---|---|
| **Completion Rate** (started → completed) | > 70% |
| **Time to First Session** | < 5 мин |
| **Demo Completion Rate** | > 90% |
| **Brain ID Saved Rate** | > 85% |
| **Day 1 Retention** (completed onboarding → session day 1) | > 40% |
| **Day 7 Retention** | > 20% |

---

## Страница на сайте

| Страница | URL | Компонент | Auth |
|---|---|---|---|
| **Онбординг** | https://kognitika.ru/onboarding (модалка) | `OnboardingModal` | Required (Brain ID) |

---

## Компоненты и файлы

| Путь | Назначение |
|---|---|
| `src/components/OnboardingModal.tsx` | Основной компонент (stepper, state machine) |
| `src/components/onboarding/*` | Шаги: Welcome, Goals, Demo, Profile |
| `src/hooks/useOnboarding.ts` | Состояние, localStorage sync, API calls |
| `src/server/routes/onboarding.ts` | REST: state, step, complete |
| `src/lib/onboarding-config.ts` | Конфиг: цели, демо-модули, XP награды |
