# Rust Analytics Engine (kognitika-core)

**Крейт**: `crates/kognitika-core` · **WASM**: `analyzeSessionJson` · **Схема**: `AnalyzeSession v1` · **Категории**: `cognitive` / `somatic` / `safety`

---

## Назначение

**Rust-аналитика** — исследовательский/feature-core для детерминированного офлайн-анализа когнитивных сессий. Крейт содержит `AnalyzeSession`, но не является production runtime authority: текущая production аналитика работает через JS/TypeScript workers и server services. Описанные ниже WASM/native пути не следует считать подключёнными production runtime surfaces.

**Целевые свойства Rust core (требуют отдельного benchmark/integration evidence):**
- Производительность и browser/native parity являются целевыми свойствами, а не текущими production SLO.
- Zod (TS) + Serde (Rust) задают схему `schemaVersion: 1` для core contract.
- Входные данные core проверяются на отсутствие PII до десериализации.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      analyze_session                        │
│  (WASM: analyzeSessionJson | Native: analyze_session)       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        parse_input      validate_input   analyze_session
        (PII check)      (schema v1)      (metrics)
              │               │               │
              ▼               ▼               ▼
         AnalyzeSessionInput          AnalyzeSessionOutput
         (strict, deny_unknown_fields) (strict, deny_unknown_fields)
```

---

## Входная схема (`AnalyzeSessionInput`)

```json
{
  "schemaVersion": 1,
  "sessionId": "schulte-2026-07-29-abc123",
  "moduleId": "schulte",
  "category": "cognitive",
  "startedAt": "2026-07-29T10:00:00.000Z",
  "completedAt": "2026-07-29T10:00:24.000Z",
  "events": [
    { "tMs": 0, "kind": "checkpoint", "checkpoint": "route_loaded" },
    { "tMs": 1200, "kind": "click", "reactionTimeMs": 180, "isCorrect": true, "x": 0.12, "y": 0.34 },
    { "tMs": 2100, "kind": "click", "reactionTimeMs": 210, "isCorrect": true, "x": 0.56, "y": 0.78 },
    { "tMs": 24000, "kind": "checkpoint", "checkpoint": "completed" }
  ]
}
```

### Поля событий (`AnalyzeSessionEvent`)

| Поле | Тип | Обязательно | Описание |
|---|---|---|---|
| `tMs` | `u32` | ✓ | Время от старта сессии (мс), max 24ч |
| `kind` | enum | ✓ | `click` \| `answer` \| `mistake` \| `checkpoint` |
| `reactionTimeMs` | `u32?` | — | Время реакции на стимул (1–60 000 мс) |
| `isCorrect` | `bool?` | — | Верность ответа (для `answer`/`click`) |
| `x`, `y` | `f64?` | — | Нормализованные координаты клика (0–1) |
| `checkpoint` | `string?` | — | Маркер этапа (`route_loaded`, `engaged_8s`, `completed`...) |

---

## Выходная схема (`AnalyzeSessionOutput`)

```json
{
  "schemaVersion": 1,
  "durationMs": 24000,
  "clickCount": 2,
  "p50ReactionMs": 195,
  "p95ReactionMs": 210,
  "speedSlope": -8.6667,
  "accuracy": 1.0,
  "fatigueIndex": -0.103,
  "engagementIndex": 0.68,
  "suspiciousPatternScore": 0.0,
  "recommendationSignals": ["streak_maintenance"]
}
```

### Метрики

| Метрика | Формула | Интерпретация |
|---|---|---|
| `durationMs` | `completedAt - startedAt` или `max(tMs)` | Длительность сессии |
| `clickCount` | `count(kind == click)` | Активность (клики/тапы) |
| `p50ReactionMs` | Медиана `reactionTimeMs` | Типовое время реакции |
| `p95ReactionMs` | 95-й перцентиль | Хвост распределения (медленные) |
| `speedSlope` | Линейная регрессия `reactionTimeMs ~ tMs/1000` | **> 0** = замедление (усталость), **< 0** = разогрев/ускорение |
| `accuracy` | `correct / (correct + incorrect)` | Точность (0–1) |
| `fatigueIndex` | `(median(late) - median(early)) / median(early)` | **> 0.2** = выраженная утомляемость |
| `engagementIndex` | Взвешенная сумма: completion(0.4) + clicks(0.3) + checkpoints(0.2) + duration(0.1) | Уровень вовлечённости (0–1) |
| `suspiciousPatternScore` | `impossiblyFast*0.6 + uniformPattern*0.25 + perfectFast*0.15` | **≈ 1.0** = бот/чит/автокликер |
| `recommendationSignals` | Эвристики (см. ниже) | Рекомендации для следующей тренировки |

---

## Рекомендательные сигналы (`recommendationSignals`)

| Сигнал | Условие | Действие |
|---|---|---|
| `weak_area` | `accuracy < 0.75` | Повторить модуль, упростить уровень |
| `recovery` | `fatigueIndex >= 0.2` ИЛИ `engagementIndex < 0.35` | Пауза, модуль «Тишина», сон |
| `streak_maintenance` | `accuracy >= 0.9` И `fatigueIndex <= 0.1` | Продолжать, увеличить сложность |
| `variety` | (ни одно из выше) | Сменить модуль на соседний домен |

---

## Проверка PII (Privacy Guard)

**До десериализации** входной JSON сканируется на чувствительные ключи:

```rust
const SENSITIVE_KEYS: [&str; 14] = [
    "authorization", "auth", "bearer", "brainid", "cookie",
    "email", "jwt", "localstorage", "password", "rawstorage",
    "refresh", "screenshot", "secret", "token"
];
```

Если найден ключ, содержащий любую из подстрок (case-insensitive) — **ошибка `SensitiveField`**, данные не обрабатываются.

**Проверяется рекурсивно** во всех вложенных объектах и массивах.

---

## Проектируемое использование в браузере (WASM)

Этот пример описывает целевую интеграцию, а не текущий production runtime. Любое browser WASM включение остаётся заблокированным до прохождения frame-budget gate.

```typescript
// src/workers/analytics.worker.ts
import init, { analyze_session_json } from 'kognitika-core';

await init(); // загрузка .wasm

export function analyzeSession(input: AnalyzeSessionInput): AnalyzeSessionOutput {
  const json = JSON.stringify(input);
  const resultJson = analyze_session_json(json); // WASM call
  return JSON.parse(resultJson);
}
```

**Размер WASM**: ~180 KB (gzipped ~55 KB)
**Время инициализации**: ~3–5 мс
**Пропускная способность**: 10k событий за ~2–4 мс

---

## Проектируемое использование на сервере (Node.js / Rust)

Этот пример не описывает текущую production analytics authority.

```rust
// Native Rust (server-side persistence)
use kognitika_core::{parse_analyze_session_input, analyze_session, AnalyzeSessionOutput};

let value = serde_json::from_str(&request_body)?;
let input = parse_analyze_session_input(value)?;
let output = analyze_session(&input);
// Сохранить в БД (SessionAnalyticsSummary)
```

---

## Локальный анализ динамики навыков (без LLM)

Rust Engine позволяет **глубокий анализ** сырых событий *на клиенте* — идеально для приватного построения дашбордов динамики навыков без отправки данных на сервер/в LLM.

### Пример: построение графика fatigueIndex за последние 30 дней

```typescript
// 1. Получить сырые события из IndexedDB / localStorage (GameSession.metadata.events)
// 2. Запустить analyzeSession для каждой сессии
// 3. Агрегировать по дням

import { analyzeSession } from 'kognitika-core/wasm';

async function buildFatigueTrend(last30DaysSessions: RawSession[]) {
  const daily = new Map<string, { sum: number; count: number }>();
  
  for (const session of last30DaysSessions) {
    const input = convertToAnalyzeSessionInput(session); // ваш маппинг
    const output = analyzeSession(input);
    
    const day = session.createdAt.split('T')[0];
    const prev = daily.get(day) || { sum: 0, count: 0 };
    daily.set(day, { 
      sum: prev.sum + output.fatigueIndex, 
      count: prev.count + 1 
    });
  }
  
  // Результат: [{date: "2026-07-01", avgFatigueIndex: 0.12}, ...]
  return Array.from(daily.entries())
    .map(([date, { sum, count }]) => ({ date, avgFatigueIndex: sum / count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
```

### Метрики для дашборда динамики (рекомендуемые)

| Виджет | Метрика Rust Engine | Период | Интерпретация |
|---|---|---|---|
| **Тренд усталости** | `fatigueIndex` (avg по дню) | 30 дней | > 0.2 = риск выгорания |
| **Тренд вовлечённости** | `engagementIndex` (avg) | 30 дней | < 0.35 = снижение мотивации |
| **Скорость реакции** | `p50ReactionMs` (медиана) | 7/30 дней | Снижение = улучшение |
| **Стабильность** | `speedSlope` (avg) | Сессия | > 0 = замедление в процессе |
| **Подозрительные паттерны** | `suspiciousPatternScore` | Все сессии | ≈ 1.0 = бот/чит |
| **Рекомендации** | `recommendationSignals` | Последняя сессия | Что делать следующим |

---

## Целевая интеграция с Practice Flow

Следующая последовательность описывает проектируемую интеграцию Rust core, а не текущий production pipeline:

1. UI мог бы собирать минимизированные события в `AnalyzeSessionInput`.
2. Rust/WASM core мог бы возвращать `AnalyzeSessionOutput`.
3. Runtime persistence, trend routes и рекомендации должны оставаться отдельными JS/TypeScript contract surfaces до отдельного принятого изменения.

## Целевая сборка WASM

Сборка и публикация WASM-артефакта не являются текущим runtime workflow. До включения необходимо пройти frame-budget gate, privacy review и отдельную integration/deployment проверку. Не используйте приведённые ранее команды или предполагаемые output paths как доступный production interface.

## Фактические точки проверки

- `crates/kognitika-core/` содержит Rust core и его тесты.
- `src/core/analyze-session/` и server analytics services остаются текущими JS/TypeScript contract surfaces.
- `src/tests/analyze-session-core.test.ts` и `src/tests/analytics-export-privacy.test.ts` дают targeted evidence, но итоговый suite status подтверждает CI.
