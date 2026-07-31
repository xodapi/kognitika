# Скоростная печать (Speed Typing)

**Маршрут**: `/typing` · **Компонент**: `SpeedTyping` · **Домен**: Моторная скорость + Визуально-моторная интеграция + Контроль ошибок

---

## Теория

**Скоропечатание** — классическая задача на **моторную скорость**, **визуально-моторную интеграцию** и **контроль ошибок** под временным давлением. В Когнитике — не просто WPM, а анализ **keystroke dynamics**.

**Когнитивные механизмы**:
- **Instance theory** (Logan, 1988) — автоматизация через извлечение эпизодов
- **Motor programs** — чанкинг последовательностей (bigram/trigram frequency)
- **Error monitoring** — ACC (передняя поясная) детектирует ошибки до сознания
- **Inter-keystroke intervals (IKI)** — окно в моторное планирование

**Научная база**:
- Salthouse (1986) — Perceptual-motor speed и aging
- Gentner et al. (1983) — Keystroke dynamics
- Logan & Crump (2011) — Hierarchical control of cognitive processes

---

## Как проходить

1. **Текст**: случайная генерация (кириллица/латиница, 200–400 знаков)
2. **Задача**: печатать максимально **быстро и точно**
3. **Ошибки**: подсвечиваются красным, можно исправить Backspace
4. **Метрики в реальном времени**: WPM, Accuracy, Error rate, IKI
5. **Время**: 60 секунд
6. **Клавиатура**: физическая / экранная

---

## Метрики

| Метрика | Формула | Норматив |
|---|---|---|
| **WPM** | (Правильные символы / 5) / Минуты | 200–300 (профи), 150–200 (хорошо) |
| **Accuracy** | Правильные / Всего × 100% | > 97% |
| **Raw WPM** | Все символы / 5 / Минуты | — |
| **Error Rate** | Ошибки / Всего | < 3% |
| **Backspace Rate** | Backspace / Keystrokes | < 5% |
| **Mean IKI** | Ср. интервал между нажатиями | 100–150 мс |
| **IKI Variability (CV)** | SD / Mean IKI | < 0.3 (ритмичность) |
| **Error Correction Latency** | Время от ошибки до Backspace | < 300 мс |

---

## Система оценки

```
Score = WPM × Accuracy × RhythmBonus
RhythmBonus = 1.0 − 0.5 × CV(IKI)  (штраф за неритмичность)
```

---

## Код

- Компонент: `src/components/SpeedTyping.tsx`
- Хук: `src/hooks/useTypingEngine.ts`
- Анализатор: `src/lib/keystroke-analyzer.ts`
- Тесты: `src/tests/typing-core.test.ts` (7 тестов)
- Wiki статья: `src/lib/knowledge-base.ts` → `typing`

---

## Экспорт данных

```json
{
  "moduleId": "typing",
  "displayName": "Скоростная печать",
  "sessions": 45,
  "bestWpm": 287,
  "medianWpm": 234,
  "bestAccuracy": 99.1,
  "medianAccuracy": 98.2,
  "meanIkiMs": 112,
  "ikiCv": 0.22,
  "errorRate": 1.8,
  "backspaceRate": 3.2,
  "trend": "improving"
}
```
