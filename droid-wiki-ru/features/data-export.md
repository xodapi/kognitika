# Экспорт данных

Пользователи могут скачать свои когнитивные тренировочные данные в privacy-safe, LLM-friendly JSON-формате. Это позволяет загрузить результаты в любую большую языковую модель для персонального анализа, поиска трендов и оптимизации тренировок.

---

## Как это работает

1. Пользователь открывает страницу **Cognitive Profile** (`CognitiveProfile.tsx`) и нажимает кнопку **«Экспорт»** (в UI подписана как «Экспорт»).
2. Кнопка отправляет `GET` запрос на `/api/analytics/export` с Bearer JWT токеном в заголовке `Authorization`.
3. Серверный эндпоинт в `src/server/routes/analytics.ts` (строка 288) запрашивает завершённые `GameSession` пользователя, отсортированные по убыванию даты.
4. Функция `createPrivacySafeAnalyticsExport()` в том же файле обрабатывает сессии в агрегированный, анонимизированный формат.
5. Сервер возвращает JSON-файл, который браузер скачивает как `kognitika_export_YYYY-MM-DD.json`.

---

## Privacy-контракт

Экспорт-эндпоинт верифицирован тестом `src/tests/analytics-export-privacy.test.ts`. Тест подтверждает:

- **Нет сырого Brain ID** в ответе (ни в каком месте, включая вложенные метаданные)
- **Нет email-адресов**, токенов или хэшей паролей
- **Нет сырой session database ID** (UUID)
- **Нет точных таймстемпов** активности
- Объект `privacy` в ответе подтверждает:
  - `personal_identifiers_included: false`
  - `raw_session_data_included: false`
  - `exact_activity_timestamps_included: false`
  - `safe_for_external_llm: true`

Серверный middleware `privacyGuard` в `src/server/middleware/privacy.ts` работает на всех API-ответах как дополнительный слой защиты.

---

## Формат экспорта

JSON-ответ имеет следующую структуру:

```json
{
  "format": "Kognitika Privacy-Safe Cognitive Analytics",
  "version": "2.0",
  "privacy": {
    "personal_identifiers_included": false,
    "raw_session_data_included": false,
    "exact_activity_timestamps_included": false,
    "safe_for_external_llm": true
  },
  "dataset": {
    "completed_sessions_analyzed": 150,
    "modules_with_data": 12,
    "history_truncated": false,
    "maximum_sessions_analyzed": 1000
  },
  "modules": [
    {
      "moduleId": "schulte",
      "displayName": "Таблицы Шульте",
      "sessions": 25,
      "bestTimeMs": 18400,
      "medianTimeMs": 24100,
      "accuracy": 98.5,
      "trend": "improving",
      "normative": {
        "targetMs": 15000,
        "source": "Literature: Schulte tables normative data"
      }
    },
    { "...": "другие модули" }
  ],
  "aggregate": {
    "totalSessions": 150,
    "totalTimeMs": 3600000,
    "overallAccuracy": 94.2,
    "strongestModules": ["schulte", "nback"],
    "weakestModules": ["stroop-alphabet", "dispatcher"]
  }
}
```

---

## Ключевые константы

| Константа | Значение | Где определена |
|---|---|---|
| `MAX_EXPORT_SESSIONS` | 1000 | `src/server/routes/analytics.ts` |

Экспорт обрезает историю до последних 1000 завершённых сессий (флаг `history_truncated` в ответе указывает, было ли обрезание).

---

## Анализ динамики навыков через LLM (продвинутое использование)

Экспорт JSON пригоден не только для разового чтения, но и для **системного отслеживания динамики навыков** через LLM. Пример workflow:

### 1. Регулярный экспорт (например, еженедельно)
```bash
# Сохранять файлы с датами: kognitika_export_2026-07-01.json, kognitika_export_2026-07-08.json, ...
```

### 2. Промпт для LLM (шаблон для еженедельного ревью)
```
У меня есть последовательность еженедельных экспортов когнитивных данных:
- kognitika_export_2026-07-01.json (базовая линия)
- kognitika_export_2026-07-08.json (неделя 1)
- kognitika_export_2026-07-15.json (неделя 2)

Задачи:
1. Рассчитай **week-over-week дельты** по ключевым метрикам (medianTimeMs, accuracy, trend) для каждого модуля.
2. Выдели модули с **устойчивым улучшением** (improving ≥2 недели подряд) и **регрессом** (declining).
3. Найди корреляции: например, рост accuracy в N-Back + улучшение medianTime в Schulte = улучшение внимания/рабочей памяти.
4. Оцени **fatigueIndex** и **engagementIndex** (если есть в export) — есть признаки выгорания?
5. Дай **конкретный 7-дневный план**: какие модули приоритетны, какие — на восстановление, где поднять сложность.
6. Верни результат в структурированном JSON для парсинга:
{
  "weekly_deltas": { "schulte": {"medianTimeMs": -1200, "accuracy": +1.2}, ... },
  "improving": ["nback", "logical"],
  "declining": ["stroop-alphabet"],
  "fatigue_risk": "low",
  "plan": [{"module": "schulte", "priority": "high", "reason": "stable improvement", "target": "median < 22s"}, ...]
}
```

### 3. Автоматизация (опционально)
Можно написать скрипт, который:
- Хранит историю экспортов локально
- Запускает LLM (через API или локально) с шаблоном промпта
- Сохраняет LLM-ответ как `weekly_review_YYYY-MM-DD.json`
- Строит дашборд динамики навыков (графики трендов, heatmap модулей)

### Какие поля экспорта наиболее информативны для динамики

| Поле | Зачем нужно |
|---|---|
| `modules[].medianTimeMs` | Основной тренд скорости (устойчивее bestTimeMs) |
| `modules[].accuracy` | Точность — ведущий индикатор качества |
| `modules[].trend` | improving/stable/declining — агрегированная оценка |
| `modules[].sessions` | Объём практики (контекст для тренда) |
| `aggregate.strongestModules` / `weakestModules` | Быстрый фокус внимания |
| `dataset.modules_with_data` | Покрытие доменов |

> **Важно**: экспорт не содержит сырой истории сессий (`raw_session_data_included: false`). Для глубокого анализа (распределение reactionTime, fatigueIndex по сессиям) используйте **Rust Analytics Engine** (`crates/kognitika-core`) локально — он обрабатывает сырые события без ухода из браузера.
