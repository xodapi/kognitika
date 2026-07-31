# Смысловой сканер (Language Scanner)

**Маршрут**: `/scanner` · **Компонент**: `LanguageScanner` · **Домен**: Критическое чтение + Распознавание паттернов манипуляций

---

## Теория

**Смысловой сканер** — детекция **риторических уловок, фрейминга, эмоционального давления** в текстах. Обучение **иммунитету к манипуляциям** через распознавание паттернов.

**Таксономия паттернов (24 типа)**:

| Категория | Паттерны | Пример |
|---|---|---|
| **Логические ошибки** | Ad hominem, Strawman, False dilemma, Slippery slope, Circular reasoning | «Ты против реформы? Значит, ты за хаос!» |
| **Эмоциональная манипуляция** | Fear appeal, Guilt trip, Bandwagon, Appeal to pity | «Если не купите — дети пропадут!» |
| **Фрейминг** | Positive/negative framing, Contrast effect, Anchoring | «90% безработица» vs «10% занятость» |
| **Авторитет/Социальное доказательство** | False authority, Fake consensus, Testimonial | «9 из 10 врачей рекомендуют» |
| **Скрытые допущения** | Loaded question, Presupposition, Equivocation | «Перестал ли ты воровствовать?» |

**Научная база**:
- Cialdini (1984) — Influence: Psychology of Persuasion
- Kahneman (2011) — Thinking, Fast and Slow (System 1/2)
- Stanovich (2009) — What Intelligence Tests Miss (dysrationalia)

---

## Как проходить

1. **Текст**: 150–400 слов (новость, пост, реклама, письмо)
2. **Задача**: выделите **все** фрагменты с манипуляциями (клик/свайп)
3. **Классификация**: для каждого выделенного — выберите тип паттерна из списка
4. **Уровни**:
   - L1: 1–2 явные манипуляции
   - L2: 3–4, включая вложенные
   - L3: тонкое фрейминг, dog whistles
   - L4: адверсариальные тексты (намеренно замаскированные)

---

## Метрики

| Метрика | Что показывает | Норматив |
|---|---|---|
| **Hit Rate (Recall)** | % найденных манипуляций | > 80% |
| **Precision** | % верных среди найденных | > 75% |
| **F1-score** | Гармоническое среднее | > 0.77 |
| **Classification Acc** | % верных типов паттернов | > 70% |
| **Time/pattern** | Скорость детекции | < 15 сек/паттерн |

---

## Система оценки

- Найденная манипуляция: +100
- Верный тип: +50
- Ложное срабатывание: -80
- Пропуск (miss): -120
- Бонус за идеальную сессию (F1=1.0): +500

---

## Код

- Компонент: `src/components/LanguageScanner.tsx`
- Хук: `src/hooks/useLanguageScannerEngine.ts`
- База паттернов: `src/lib/manipulation-patterns.ts` (24 типа)
- Тесты: `src/tests/language-scanner-core.test.ts` (9 тестов)
- Wiki статья: `src/lib/knowledge-base.ts` → `scanner`

---

## Экспорт данных

```json
{
  "moduleId": "scanner",
  "displayName": "Смысловой сканер",
  "sessions": 9,
  "bestScore": 3200,
  "medianScore": 2450,
  "hitRate": 85,
  "precision": 78,
  "f1Score": 0.81,
  "classificationAccuracy": 74,
  "avgTimePerPattern": 11,
  "trend": "improving"
}
```
