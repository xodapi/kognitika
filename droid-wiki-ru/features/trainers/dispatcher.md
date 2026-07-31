# Асинхронный диспетчер (Async Dispatcher)

**Маршрут**: `/dispatcher` · **Компонент**: `AsyncDispatcher` · **Домен**: Исполнительная функция + Оркестрация потоков + Управление прерываниями

---

## Теория

**Асинхронный диспетчер** — моделирование **исполнительной функции** в условиях мультизадачности: приоритизация, переключение контекста, возобновление после прерываний, управление очередью задач с разной срочностью/важностью.

**Когнитивные механизмы**:
- **Task switching** (Monsell, 2003) — switch cost = RT switch − RT repeat
- **Prospective memory** — удержание намерения выполнить отложенную задачу (Einstein & McDaniel, 1990)
- **Interruption management** — восстановление контекста (Altmann & Trafton, 2002 — memory for goals)
- **Priority queue** — динамическая переоценка Eisenhower matrix (Urgent/Important)

---

## Как проходить

1. **Поток задач**: карточки появляются сверху с параметрами:
   - **Тип**: `Urgent` (красный, таймер 30с) / `Important` (синий, дедлайн 3 мин) / `Routine` (серый) / `Background` (прозрачный)
   - **Оценка времени**: 10–60 сек
   - **Ценность**: очки за выполнение
2. **Действия** (клик по карточке):
   - ▶ **Запустить** — задача в активном слоте (только 1 одновременно)
   - ⏸ **В очередь** — с приоритетом (drag в слот очереди)
   - ❌ **Отклонить** — низкая ценность / нерелевантно
   - 🔄 **Прервать текущую** — переключиться на Urgent
3. **Прерывания**: случайные Urgent задачи требуют реакции < 5 сек
4. **Цель**: максимизировать **пропускную способность ценности** (value throughput)

---

## Метрики

| Метрика | Что показывает | Норматив |
|---|---|---|
| **Value Throughput** | Очков ценности / минуту | > 200 |
| **Urgent Hit Rate** | % Urgent обработано до таймаута | 100% |
| **Recovery Time** | Время возврата к прерванной задаче | < 8 сек |
| **Priority Accuracy** | % задач в правильном порядке ценности | > 90% |
| **Queue Health** | Нет просроченных Important | 0 |
| **Switch Cost** | Замедление после прерывания | < 30% |

---

## Система оценки

```
Value = Σ(task_value × urgency_multiplier) − penalties

Multipliers:
- Urgent вовремя: ×3.0
- Important вовремя: ×2.0
- Routine: ×1.0
- Background: ×0.5

Penalties:
- Urgent timeout: −200
- Important просрочка: −100
- Recovery > 15 сек: −20 за сек
- Неправильный приоритет: −50
```

---

## Код

- Компонент: `src/components/AsyncDispatcher.tsx`
- Хук: `src/hooks/useDispatcherEngine.ts`
- Генератор: `src/lib/dispatcher-generator.ts`
- Тесты: `src/tests/dispatcher-core.test.ts` (8 тестов)
- Wiki статья: `src/lib/knowledge-base.ts` → `dispatcher`

---

## Экспорт данных

```json
{
  "moduleId": "dispatcher",
  "displayName": "Асинхронный диспетчер",
  "sessions": 7,
  "bestScore": 1840,
  "medianScore": 1560,
  "valueThroughput": 245,
  "urgentHitRate": 98,
  "avgRecoverySec": 6.4,
  "priorityAccuracy": 93,
  "switchCostPct": 18,
  "trend": "stable"
}
```
