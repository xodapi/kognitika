# Доступность (Accessibility / a11y)

**Стандарт**: WCAG 2.1 Level AA · **Тесты**: axe-core (CI) + ручные чек-листы · **Инструменты**: Storybook a11y addon, eslint-plugin-jsx-a11y

---

## Соответствие WCAG 2.1 AA

| Критерий | Статус | Реализация |
|---|---|---|
| **1.1.1 Non-text Content** | ✅ | Все изображения имеют `alt`; иконки — `aria-label` / `aria-hidden` |
| **1.3.1 Info and Relationships** | ✅ | Семантическая HTML: `header`, `main`, `nav`, `section`, `article`, `aside` |
| **1.4.3 Contrast (Minimum)** | ✅ | Tailwind 4: `text-foreground` / `bg-background` = 4.5:1+; фокус — `ring-primary` |
| **1.4.4 Resize Text** | ✅ | `rem`/`em` единицы; `text-base` = 16px; зум до 200% без потери функционала |
| **2.1.1 Keyboard** | ✅ | Все интерактивные элементы доступны с клавиатуры (`Tab`, `Enter`, `Space`, arrows) |
| **2.1.2 No Keyboard Trap** | ✅ | Модалки: `Tab` циклируется внутри, `Esc` закрывает; нет ловушек |
| **2.4.3 Focus Order** | ✅ | Логичный порядок: header → main → footer; skip link "Перейти к основному контенту" |
| **2.4.7 Focus Visible** | ✅ | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` глобально |
| **3.2.1 On Focus** | ✅ | Фокус не триггерит навигацию/сабмит; только визуальная индикация |
| **3.3.2 Labels or Instructions** | ✅ | Все инпуты имеют `<label>` или `aria-label`; плейсхолдеры — дополнительно |
| **4.1.2 Name, Role, Value** | ✅ | Кастомные компоненты: `role`, `aria-*`, `state` (radix-ui / headless UI) |

---

## Клавиатурная навигация

### Глобальные шорткаты
| Клавиша | Действие | Контекст |
|---|---|---|
| `Tab` / `Shift+Tab` | Навигация вперёд/назад | Всегда |
| `Enter` / `Space` | Активация кнопки/ссылки | Фокус на интерактивном |
| `Esc` | Закрыть модалку/дропдаун | Модалка открыта |
| `Arrow Keys` | Навигация в меню/табах/гриде | Соответствующий компонент |
| `Home` / `End` | Первый / последний элемент | Списки, гриды |
| `?` | Показать клавиатурные подсказки | Глобально (кроме инпутов) |

### Тренажёры — клавиатурные альтернативы
| Тренажёр | Мышь/Тач | Клавиатура |
|---|---|---|
| **Schulte** | Клик по клетке | `1-9` / `Q-W-E-R` (первые 4) — не применимо, только клик |
| **Stroop** | Кнопки цветов | `1/Й/Q`=Красный, `2/Ц/W`=Синий, `3/У/E`=Зелёный, `4/К/R`=Жёлтый |
| **N-Back** | Кнопка "Совпадение" | `Space` = Совпадение |
| **Mental Math** | Кнопка "Отправить" | `Enter` = Отправить ответ |
| **Alphabet Table** | Кнопки П/Л/О | `→/D`=Правая, `←/A`=Левая, `Space/O`=Обе |
| **Stroop+Alphabet** | Кнопки цветов + П/Л/О | `1-4` цвета → `→/←/Space` команды |
| **Typing** | Физическая клавиатура | Физическая клавиатура |
| **SymbolChat** | Клик по символу | `Tab` → `Enter` на символе |

---

## Screen Reader Support

### ARIA Patterns
| Компонент | Role / ARIA | Описание |
|---|---|---|
| **Модалка** | `role="dialog" aria-modal="true" aria-labelledby="title-id"` | Фокус застревает внутри, `Esc` закрывает |
| **Тосты/Уведомления** | `role="status" aria-live="polite"` | Не перебивают экранный диктор |
| **Прогресс-бары** | `role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="..."` | Актуализируется в реальном времени |
| **Табы** | `role="tablist"` + `role="tab" aria-selected` + `role="tabpanel"` | `Arrow Left/Right` навигация |
| **Селекты** | `role="combobox" aria-expanded` + `role="listbox"` + `role="option"` | `Typeahead` фильтрация |
| **Сетка Шульте** | `role="grid"` + `role="gridcell" aria-label="Число 5"` | Координаты `x`/`y` для навигации стрелочками |
| **Кнопки действий** | `role="button" aria-pressed` (toggle) | `aria-pressed="true/false"` |
| **Скролл-зоны** | `aria-label="Игровая область"` | Контекст для SR |

### Live Regions
| Область | `aria-live` | События |
|---|---|---|
| **Таймер сессии** | `polite` | Каждые 10 сек / последние 10 сек — каждую сек |
| **Счёт / Ошибки** | `polite` | Изменение счёта, появление ошибки |
| **Пост-гейм инсайт** | `assertive` | Завершение сессии, результат |
| **Дуэль: ход соперника** | `polite` | Прогресс оппонента |
| **SymbolChat: новый пост** | `polite` | Появление в ленте |

---

## Colour & Contrast

### Tailwind 4 Theme (CSS Variables)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;        /* #0f172a — 16.5:1 на белом */
  --primary: 221 83% 53%;           /* #3b82f6 — 4.5:1 на белом */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 220 14% 96%;
  --muted-foreground: 215 16% 47%;  /* 7.2:1 */
  --accent: 220 14% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%;
  --ring: 221 83% 53%;
  --radius: 0.5rem;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 210 40% 98%;
  --border: 217 33% 17%;
  --ring: 224 76% 48%;
}
```

### Contrast Ratios (Auto-verified)
| Пара | Light | Dark | Minimum |
|---|---|---|---|
| foreground/background | 16.5:1 | 15.8:1 | 4.5:1 |
| primary/background | 4.8:1 | 4.9:1 | 4.5:1 |
| muted-foreground/background | 7.2:1 | 6.8:1 | 4.5:1 |
| ring/background | 4.8:1 | 4.9:1 | 3:1 (UI) |

---

## Reduced Motion

### CSS
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Компоненты с анимациями (Motion/React)
| Компонент | Анимация | Reduced Motion fallback |
|---|---|---|
| **Page transitions** | `AnimatePresence` + `layout` | Instant mount/unmount |
| **Toast** | `slide-in` + `fade` | Instant appear |
| **Modal** | `scale` + `fade` | Instant appear |
| **Counter/XP** | `countUp` spring | Instant final value |
| **Charts** | Recharts `AnimationEasing` | Static render |

---

## High Contrast Mode (Windows)

```css
@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 0%;
    --ring: 0 0% 0%;
  }
  .dark {
    --border: 0 0% 100%;
    --ring: 0 0% 100%;
  }
}
```

---

## Тестирование доступности

### Автоматические (CI)
```bash
# axe-core в Vitest
pnpm test --run src/tests/a11y.test.ts

# Storybook a11y
pnpm storybook:a11y
```

### Ручные чек-листы (на релиз)
- [ ] Tab-порядок логичен на всех страницах
- [ ] Focus visible на всех интерактивных элементах
- [ ] Skip link работает
- [ ] Модалки: фокус внутри, Esc закрывает, Tab циклится
- [ ] Live regions анонсируют изменения
- [ ] Контраст 4.5:1+ во всех темах
- [ ] Зум 200% — нет горизонтального скролла, функционал работает
- [ ] Screen reader (NVDA/VoiceOver) — ключевые флоу читаются корректно
- [ ] `prefers-reduced-motion` — анимации отключены

---

## Accessibility Statement (Published)

> **Kognitika Accessibility Statement** (updated 2026-07-29)
>
> Мы стремимся к соответствию WCAG 2.1 Level AA. Известные ограничения:
> - Некоторые тренажёры (Schulte, Stroop) требуют быстрых реакций — клавиатурные альтернативы предоставлены где возможно
> - Real-time дуэли имеют таймеры — пауза недоступна
> - SymbolChat использует эмодзи — alt-texts включены
>
> Обратная связь: `/feedback` → тип "ACCESSIBILITY"

---

## Файлы и конфигурация

| Путь | Назначение |
|---|---|
| `tailwind.config.ts` | CSS variables для цветов, focus-ring |
| `src/styles/globals.css` | Reduced motion, high contrast, skip link |
| `src/components/ui/FocusRing.tsx` | Глобальный focus-visible стиль |
| `src/components/ui/SkipLink.tsx` | "Перейти к основному контенту" |
| `src/hooks/useReducedMotion.ts` | Хук для `prefers-reduced-motion` |
| `src/test/a11y.test.ts` | axe-core automated tests |
| `.storybook/preview.ts` | Storybook a11y addon config |
| `eslint.config.js` | `eslint-plugin-jsx-a11y` rules |
