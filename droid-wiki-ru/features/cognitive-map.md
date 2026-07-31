# Когнитивная карта (Cognitive Map)

**Маршрут**: `/cognitive-map` · **Компонент**: `CognitiveMap` · **Домен**: Визуализация связей навыков · Метакогнитивная ориентация · Персональная навигация

---

## Назначение

**Cognitive Map** — интерактивная карта когнитивного ландшафта пользователя. Показывает **связи между навыками**, **текущее положение** и **рекомендуемые маршруты** развития. Аналог GPS для когнитивных тренировок.

---

## Визуализация

### Граф (Network Graph)
- **Узлы** = модули/навыки (28 тренажёров)
- **Рёбра** = эмпирические связи (корреляция производительности, общие когнитивные требования)
- **Размер узла** = уровень мастерства (XP / сессий / точности)
- **Цвет узла** = домен (Внимание=синий, Память=зелёный, Логика=фиолетовый, Критическое мышление=красный, Регуляция=бирюзовый)
- **Пульсация** = текущая рекомендация (Daily Practice)

### Слои (Layer Toggles)
| Слой | Описание |
|---|---|
| **Мастерство** | Размер = уровень (1–50), цвет = домен |
| **Динамика** | Стрелки: 🟢 улучшается, 🔴 ухудшается, ⚪ стабильно |
| **Рекомендации** | Подсветка 3-х целевых узлов (Daily Practice) |
| **Связи** | Толщина ребра = сила корреляции (0.3–0.9) |
| **История** | Слайдер времени: как менялась карта за 30/90/365 дней |

---

## Как строятся связи (Edges)

### 1. Эмпирические корреляции (пользовательские)
```
edgeWeight(user) = PearsonCorr(moduleA.scores, moduleB.scores) 
  WHERE sessions > 5 for both
```
- Обновляется ночным кроном
- Минимум 5 сессий по каждому модулю

### 2. Теоретические (когнитивная архитектура)
Предопределённые веса на основе когнитивной науки:

| Пара модулей | Вес | Основание |
|---|---|---|
| Schulte ↔ Stroop | 0.82 | Селективное внимание + тормозной контроль |
| N-Back ↔ Spatial | 0.78 | Пространственная рабочая память |
| Numerical ↔ Logical | 0.75 | Исполнительный контроль + ВП |
| Decryptor ↔ Scanner | 0.80 | Критическое чтение + детекция манипуляций |
| Reframing ↔ Rejection | 0.70 | Эмоциональная регуляция + когнитивный переаппрайзал |
| Silence ↔ Focus | 0.85 | Стресс-регуляция + устойчивое внимание |
| Dispatcher ↔ Collision | 0.73 | Мультизадачность + детекция конфликтов |

**Итоговый вес** = `0.6 * empirical + 0.4 * theoretical` (если empirical есть)

---

## Интерактивность

### Клик по узлу → Side Panel
| Панель | Содержимое |
|---|---|
| **Статистика** | Сессий, лучшее время, точность, тренд, ранг |
| **Когнитивный профиль** | Radar chart доменов для этого навыка |
| **История** | Sparkline за 30 дней (score, accuracy, time) |
| **Рекомендация** | «Следующий шаг: Level 3, 20 вопросов, фокус на точность» |
| **Действия** | «Начать тренировку», «Добавить в план», «Сравнить с лидербордом» |

### Ховер по ребру
```
Tooltip: "Schulte ↔ Stroop: r = 0.82
Общие требования: селективное внимание, тормозной контроль, скорость обработки
Ваши результаты: Schulte (84%ile) → прогноз Stroop: 78%ile"
```

### Поиск и фильтры
- **Поиск**: по названию, тегу, домену
- **Фильтр домена**: чекбоксы 5 доменов
- **Фильтр статуса**: Не начат / В процессе / Мастерен / Рекомендуется
- **Фильтр «Мостовые навыки»**: узлы с высокой betweenness centrality (ключевые для переноса)

---

## Научная база

| Концепция | Применение |
|---|---|
| **Cognitive Atlas** (Poldrack et al.) | Онтология когнитивных концепций → узлы графа |
| **Transfer of Learning** (Barnett & Ceci) | Рёбра = предсказатели переноса (near/far transfer) |
| **Network Analysis of Cognitive Abilities** | Betweenness centrality → «мостовые навыки» для максимального переноса |
| **Knowledge Tracing** (Corbett & Anderson) | Размер узла = posterior mastery probability |
| **Metacognitive Navigation** | Карта = внешний метакогнитивный монитор |

---

## Алгоритм рекомендаций на карте

### Daily Practice Highlight (3 узла)
```
1. SELECT module FROM dailyPlan WHERE date = today
2. HIGHLIGHT nodes[moduleId] WITH pulse animation
3. SHOW path: currentNode → targetNode (Dijkstra по весам ребер)
```

### «Что учить следующим» (Skill Gap Analysis)
```
1. FIND weakly connected components in user's mastery graph
2. IDENTIFY bridge nodes (high betweenness, low mastery)
4. RECOMMEND: "Освоить {bridgeNode} откроет доступ к {cluster}"
```

Пример: *«Таблица Алфавит» — мост между «Скоростной печатью» и «Струп+Алфавит». Освоение откроет доступ к домену «Сенсомоторная координация».»*

---

## Экспорт / LLM

В JSON-экспорте (`/api/analytics/export`):
```json
{
  "moduleId": "cognitive-map",
  "displayName": "Когнитивная карта",
  "nodes": [
    {"id":"schulte","domain":"attention","mastery":0.84,"trend":"improving","sessions":25},
    {"id":"nback","domain":"memory","mastery":0.71,"trend":"stable","sessions":18}
  ],
  "edges": [
    {"source":"schulte","target":"stroop","weight":0.82,"type":"empirical+theoretical"},
    {"source":"nback","target":"spatial","weight":0.78,"type":"theoretical"}
  ],
  "bridgeNodes": ["alphabet-table", "dispatcher"],
  "recommendedPath": ["nback", "spatial", "topology"]
}
```

---

## Страница на сайте

| Страница | URL | Компонент |
|---|---|---|
| **Когнитивная карта** | https://kognitika.ru/cognitive-map | `CognitiveMap` |

---

## Компоненты и файлы

| Путь | Назначение |
|---|---|
| `src/components/CognitiveMap.tsx` | Основной компонент (React Flow / Cytoscape / D3) |
| `src/components/CognitiveModuleGraph.tsx` | Radar chart доменов (используется в профиле) |
| `src/lib/cognitive-graph.ts` | Генерация графа: узлы, ребра, веса, алгоритмы |
| `src/lib/cognitive-atlas.ts` | Онтология: 28 модулей, 5 доменов, теоретические веса |
| `src/hooks/useCognitiveMap.ts` | Состояние: выбранный узел, слои, история |
| `src/server/routes/cognitive-map.ts` | REST: граф пользователя, глобальная онтология |
| `src/workers/graph-update.worker.ts` | Ночной пересчёт эмпирических корреляций |
