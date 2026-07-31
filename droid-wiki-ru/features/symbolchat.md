# Символьный чат / Cognitive Flow (SymbolChat)

**Маршрут**: `/chat` · **Компонент**: `SymbolChat` · **Real-time**: Socket.io · **Домен**: Метакогнитивная рефлексия · Эмоциональная регуляция · Социальная когниция

---

## Назначение

**SymbolChat** — это «мышление символами» (thinking in symbols). Вместо слов — **эмодзи/символы**, представляющие когнитивные и эмоциональные состояния. Позволяет:

- **Экспрессивно зафиксировать** состояние за 1 клик
- **Визуализировать динамику** за день/неделю
- **Найти сходные** состояния у других (анонимно)
- **Триггерить рефлексию**: «Почему я выбрал 🌪️?»

> «Символы обходят вербальные фильтры и добираются до метакогнитивного слоя быстрее слов.» — основанно на *Dual Coding Theory* (Paivio) + *Affect Labeling* (Lieberman et al.)

---

## Как работает

### 1. Ввод (Composer)
- **Коллекция**: 48 символов в 6 категориях (по 8)
- **Категории** (табы):
  - 🧠 **Когнитивные** — фокус, путаница, инсайт, перегрузка...
  - 💓 **Эмоциональные** — тревога, спокойствие, фрустрация, радость...
  - ⚡ **Энергетические** — заряд, истощение, флоу, застой...
  - 🎯 **Целевые** — цель достигнута, заблудился, пересмотр...
  - 🌊 **Состояния потока** — глубокий фокус, прерывистость, ритм...
  - 🔮 **Мета** — метакогниция, осознанность, автоматический пилот...

### 2. Публикация
```typescript
// Client → Server (Socket.io)
socket.emit('symbol:post', {
  symbol: '🌪️',
  category: 'cognitive',
  intensity: 0.7,        // 0.1–1.0 (слайдер)
  note?: string,         // опционально, до 140 симв.
  sessionId?: string     // привязка к тренировке
});
```

### 3. Лента (Feed)
- **Хронологическая** (последние 100)
- **Фильтры**: мои / все / категория / интенсивность > 0.5
- **Реакции**: 🔁 «Похоже», 💡 «Инсайт», 🤝 «Поддержка» (анонимно)

### 3. Привязка к тренировке
- После завершения модуля → модалка «Как ощущается?» → SymbolChat composer
- `sessionId` сохраняется → в экспорте аналитики корреляция: символ → модуль → метрики

---

## Socket.io события

| Событие | Направление | Payload |
|---|---|---|
| `symbol:post` | Client → Server | `{symbol, category, intensity, note?, sessionId?}` |
| `symbol:feed` | Server → Client | `{items: SymbolPost[], cursor}` |
| `symbol:react` | Client → Server | `{postId, reaction: 'relate'|'insight'|'support'}` |
| `symbol:stats` | Server → Client | `{dailyCounts, categoryDistribution, intensityTrend}` |

---

## Приватность и безопасность

| Мера | Детали |
|---|---|
| **Псевдонимизация** | В ленте только `pseudonym` (Brain ID-based) |
| **Нет прямых сообщений** | Только broadcast + реакции |
| **Rate limit** | 10 постов/час, 50 реакций/час на Brain ID |
| **Content filter** | `note` проходит profanity filter + PII scanner |
| **Export** | В JSON-экспорте только агрегаты: `symbolCountsByCategory`, `avgIntensityByDay` |
| **Moderation** | ADMIN может скрыть пост (soft delete) |

---

## Аналитика (в Cognitive Profile)

### Виджеты на `/profile`
| Виджет | Метрика |
|---|---|
| **Эмоциональная погода** | Стеклянный бар за 7 дней: 🔴🟠🟡🟢🔵 по категориям |
| **Интенсивность** | Линейный график `avgIntensity` по дням |
| **Топ-символы** | 5 самых частых символов за месяц |
| **Корреляция с тренировками** | Heatmap: символ × модуль (например: 🌪️ → N-Back 0.68) |

### Экспорт (`/api/analytics/export`)
```json
{
  "moduleId": "symbolchat",
  "displayName": "Cognitive Flow",
  "symbolCountsByCategory": {
    "cognitive": 142,
    "emotional": 98,
    "energetic": 67,
    "goal": 34,
    "flow": 51,
    "meta": 23
  },
  "avgIntensity": 0.62,
  "intensityTrend": "stable",
  "topSymbols": [{"symbol":"🧠","count":34},{"symbol":"🌪️","count":28}],
  "sessionCorrelations": {
    "nback": {"🌪️": 0.68, "🧠": 0.45},
    "schulte": {"🎯": 0.52, "💡": 0.38}
  }
}
```

---

## Научная база

| Теория | Применение |
|---|---|
| **Affect Labeling** (Lieberman et al., 2007) | Называние/символизация эмоции снижает активность миндалины |
| **Dual Coding Theory** (Paivio, 1971) | Символ = образ + смысл → лучшая память и доступ |
| **Metacognitive Monitoring** (Nelson & Narens, 1990) | Символ как «мета-тег» к когнитивному состоянию |
| **Experience Sampling Method** | Micro-self-reports в реальном времени → экологическая валидность |
| **Social Baseline Theory** (Beckes & Coan) | Анонимное «Похоже» → снижение изоляции без соц. давления |

---

## Страницы на сайте

| Страница | URL | Компонент | Auth |
|---|---|---|---|
| **Cognitive Flow** | https://kognitika.ru/chat | `SymbolChat` | Required |
| **Профиль: Flow аналитика** | https://kognitika.ru/profile?tab=flow | `CognitiveProfile` (tab) | Required |

---

## Компоненты и файлы

| Путь | Назначение |
|---|---|
| `src/components/SymbolChat.tsx` | Основной компонент (composer + feed + stats) |
| `src/components/SymbolPicker.tsx` | Категоризированный пикер 48 символов |
| `src/components/SymbolPost.tsx` | Карточка поста в ленте |
| `src/hooks/useSymbolChat.ts` | Socket.io логика, состояние ленты |
| `src/server/socket/symbolchat.ts` | Socket.io handlers |
| `src/server/routes/symbolchat.ts` | REST: history, stats, export |
| `src/lib/symbols.ts` | Определение 48 символов + категории + метаданные |
