# Профилирование RICE (Profiling RICE)

**Маршрут**: `/profiling` · **Компонент**: `ProfilingRICE` · **Домен**: Системное мышление + Приоритизация + Децентрализованная оценка

---

## Теория

**RICE Scoring** (Reach, Impact, Confidence, Effort) — фреймворк приоритизации продуктовых гипотез (Intercom, Sean McBride). В Когнитике — **тренажёр калибровки оценок**: обучение давать реалистичные оценки каждому параметру и выявлять систематические смещения.

**Параметры**:

| Параметр | Шкала | Что измеряет | Типичные смещения |
|---|---|---|---|
| **Reach** | Люди/мес | Сколько пользователей затронет | Overestimation (optimism bias) |
| **Impact** | 0.25–3 | Величина изменения поведения | Overconfidence (planning fallacy) |
| **Confidence** | % | Уверенность в Reach & Impact | Overconfidence (Dunning-Kruger) |
| **Effort** | Чел-недели | Трудозатраты команды | Underestimation (optimism bias) |

**Формула**: `RICE = (Reach × Impact × Confidence) / Effort`

---

## Как проходить

1. **Гипотеза**: описание фичи / эксперимента (150–300 слов)
2. **Оценка**: введите R, I, C, E (слайдеры / числовые инпуты)
3. **Калибровка**: сразу после ввода — «Экспертная оценка» (скрытая до ввода) + разбор разницы
4. **Фидбек по смещениям**:
   - «Ваш Reach в 2.3× выше экспертного → optimism bias»
   - «Confidence 95% при отсутствии данных → overconfidence»
   - «Effort в 0.4× ниже → planning fallacy»
5. **Переоценка** (опционально): скорректируйте с учётом фидбека
6. **Сессия**: 6–8 гипотез разного типа (новинка, улучшение, техдолг, эксперимент)

---

## Метрики

| Метрика | Что показывает | Норматив |
|---|---|---|
| **Calibration Error (R)** | |Your R − Expert R| / Expert R | < 30% |
| **Calibration Error (I)** | |Your I − Expert I| / Expert I | < 40% |
| **Confidence Accuracy** | Brier score (Confidence vs Outcome) | < 0.20 |
| **Effort Bias** | Systematic under/over | −20% < bias < +20% |
| **RICE Rank Correlation** | Spearman ρ вашего ранжирования vs экспертного | > 0.7 |

---

## Система оценки

- Параметр в ±20% от эксперта: +50
- Confidence Brier < 0.15: +100
- Полное ранжирование совпало: +300
- Систематическое смещение (3+ параметра в одну сторону): −150
- Игнорирование переоценки: −100

---

## Код

- Компонент: `src/components/ProfilingRICE.tsx`
- Хук: `src/hooks/useProfilingEngine.ts`
- Генератор: `src/lib/rice-generator.ts` (6 типов гипотез)
- Тесты: `src/tests/profiling-rice.test.ts` (7 тестов)
- Wiki: `src/lib/knowledge-base.ts` → `profiling`

---

## Экспорт

```json
{
  "moduleId": "profiling",
  "displayName": "Профилирование RICE",
  "sessions": 8,
  "bestScore": 2100,
  "medianScore": 1750,
  "calibrationErrorR": 0.22,
  "calibrationErrorI": 0.31,
  "confidenceBrier": 0.16,
  "effortBias": 0.08,
  "rankCorrelation": 0.81,
  "trend": "improving"
}
```
