# Верификация реальности (Reality Check)

**Маршрут**: `/reality` · **Компонент**: `RealityCheck` · **Домен**: Детекция галлюцинаций AI + Cross-верификация

---

## Теория

**Reality Check** — тренировка **эпистемической бдительности**: способность выявлять сфабрикованные, неточные или вводящие в заблуждение утверждения в контенте, генерируемом LLM и в интернет-источниках.

**Когнитивные механизмы**:
- **Signal detection** — различие сигнал (факт) / шум (галлюцинация)
- **Cross-referencing** — перепроверка по независимым источникам
- **Internal consistency** — логическая непротиворечивость набора утверждений
- **Domain knowledge activation** — приведение экспертизы к задаче

**Научная база**:
- Ji et al. (2023) — Survey of Hallucination in NLP
- Min et al. (2023) — FActScore: Fine-grained Atomic Evaluation
- Эпистемология: Goldman (1999) — Knowledge in a Social World

---

## Как проходить

1. **Фрагмент**: 3–5 утверждений (смесь фактов, галлюцинаций, искажений)
2. **Задача**: для каждого утверждения:
   - **Вердикт**: `Факт` / `Галлюцинация` / `Искажение` / `Не верифицируемо`
   - **Уверенность**: 0–100%
   - **Обоснование** (опционально): почему так решил
3. **Инструменты** (в интерфейсе):
   - Кнопка «Поиск» — открывает поиск по выделенному
   - Кнопка «Источник» — показывает Claimed Source (может быть фейковым)
4. **Фидбек**: Ground Truth + разбор каждого пункта

---

## Типы галлюцинаций (таксономия)

| Тип | Пример | Детекция |
|---|---|---|
| **Entity fabrication** | «Книга "ИИ и этика" авторства Иван Петрова (2023)» — книги нет | Поиск в каталогах |
| **Citation fabrication** | «См. Smith et al., Nature 2022, doi:10.1038/xyz» — несуществующий DOI | Crossref/Google Scholar |
| **Numeric hallucination** | «Население Москвы 15.7 млн (2023)» — реально 13.1 млн | Официальная статистика |
| **Logical inconsistency** | «A > B, B > C, поэтому C > A» | Внутренняя логика |
| **Attribution error** | «Эйнштейн сказал: "Квантовая механика полна"» — афоризм, не цитата | Первоисточники |

---

## Метрики

| Метрика | Что показывает | Норматив |
|---|---|---|
| **Detection Rate (Recall)** | % найденных галлюцинаций | > 80% |
| **False Alarm Rate** | % фактов, помеченных как галлюцинации | < 10% |
| **Precision** | TP / (TP + FP) | > 75% |
| **Calibration** | |Conf - Acc| | < 0.15 |

---

## Код

- Компонент: `src/components/RealityCheck.tsx`
- Хук: `src/hooks/useRealityCheckEngine.ts`
- Валидатор: `src/lib/claim-validator.ts`
- Тесты: `src/tests/reality-check-core.test.ts` (7 тестов)
- Wiki статья: `src/lib/knowledge-base.ts` → `reality`

---

## Экспорт данных

```json
{
  "moduleId": "reality",
  "displayName": "Верификация реальности",
  "sessions": 11,
  "bestScore": 1850,
  "medianScore": 1520,
  "detectionRate": 84,
  "falseAlarmRate": 8,
  "precision": 79,
  "calibrationError": 0.12,
  "trend": "improving"
}
```
