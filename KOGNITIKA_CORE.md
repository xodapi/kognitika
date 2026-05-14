# Архитектура и Состояние Проекта Kognitika (v2.1)

Этот документ содержит подробное описание проделанной работы по рефакторингу ядра платформы Kognitika, описание архитектурных паттернов и дорожную карту для дальнейшего развития.

## 0. История Разработки (Changelog)

*   **2026-05-13**: **v2.1 Hardening & PWA** — Внедрен локальный Анти-чит, поддержка PWA (offline), группировка тренировок (Base/Engineering/Guard) и новый визуальный стиль Obsidian/Neon.
*   **2026-05-13**: **v2.0 Stabilization** — Финализация Фазы 6 (Mind-Guard), интеграция WASM-аналитики семантики и очистка технического долга.
*   **2026-05-12**: **v1.5 Neuro-Engineering** — Запуск модулей Topology Memory, Collision Detector и Async Dispatcher. 100% покрытие Headless-тестами.
*   **2026-05-11**: **v1.0 Core Evolution** — Переход на Event-Driven Architecture (EDA) и Rust-аналитическое ядро.

## 1. Архитектурная Революция: Event-Driven Core

Мы перешли от монолитных React-компонентов к **Event-Driven Architecture (EDA)**. Теперь логика тренажера полностью отделена от визуального представления.

### Ключевые принципы:
- **Core-as-a-Hook**: Вся бизнес-логика (генерация сеток, проверка ответов, расчет времени) вынесена в специализированные хуки `use...Engine.ts`.
- **EventBus**: Коммуникация между ядром, аналитикой и UI происходит через шину событий. Это позволяет тестировать логику без рендеринга DOM.
- **Seeded Determinism**: Генераторы (например, в Schulte и Spatial) поддерживают передачу `seed`. Это гарантирует, что тесты всегда воспроизводимы и детерминированы.

## 2. Статус Модулей (Refactoring Progress)

| Модуль | Core Hook | EventBus | Автотесты | Rust/WASM | Статус |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Schulte Tables** | ✅ | ✅ | ✅ (7/7) | ✅ | **Production Ready** |
| **Speed Typing** | ✅ | ✅ | ✅ (2/2) | ✅ | **Production Ready** |
| **Spatial Concealment** | ✅ | ✅ | ✅ (3/3) | ✅ | **Production Ready** |
| **N-Back Test** | ✅ | ✅ | ✅ (4/4) | ❌ | **Production Ready** |
| **Stroop Test** | ✅ | ✅ | ✅ (4/4) | ❌ | **Production Ready** |
| **Logical Matrix** | ✅ | ✅ | ✅ (3/3) | ❌ | **Production Ready** |
| **Numerical Analysis** | ✅ | ✅ | ✅ (3/3) | ❌ | **Production Ready** |
| **Topology Memory** | ✅ | ✅ | ✅ | ❌ | **Production Ready** |
| **Collision Detector** | ✅ | ✅ | ✅ | ❌ | **Production Ready** |
| **Async Dispatcher** | ✅ | ✅ | ✅ | ❌ | **Production Ready** |
| **Semantic Scanner** | ✅ | ✅ | — | ❌ | **Production Ready** |
| **Decryptor** | ✅ | ✅ | — | ❌ | **Production Ready** |
| **Reality Check** | ✅ | ✅ | — | ❌ | **Production Ready** |
| **Noise Reduction** | ✅ | ✅ | ✅ | ❌ | **Production Ready** |
| **Concentration Curve**| ⚠️ | ✅ | ❌ | ❌ | UI Only (Visualization) |

## 3. Система «Вратарь» (Gatekeeper)

Для защиты от регрессий внедрена система автоматической валидации. 
**Команда:** `npm run validate`

Она запускает набор Headless-тестов, которые имитируют прохождение тренажеров «роботом» за доли секунды. Если любое изменение в коде ломает логику (например, неверный порядок чисел или сбой таймера), «Вратарь» заблокирует сборку.

## 4. Интеграция с Rust (Analytics Kernel)

Аналитическое ядро (`packages/analytics-kernel`) написано на Rust и компилируется в WASM. 
- **Функция `suggest_next_difficulty`**: Принимает среднее время и стабильность, возвращает параметры следующего уровня (размер сетки, уровень шума).
- **Функция `analyze_session_data`**: Проводит глубокий анализ сессии, вычисляя индекс утомляемости (fatigability) через линейную регрессию.

### Как добавить новый тренажер в Rust:
1. Добавьте новую структуру события в `lib.rs`.
2. Реализуйте функцию анализа (например, `analyze_nback_data`).
3. Экспортируйте её через `#[wasm_bindgen]`.

## 5. Дорожная Карта (Phase 7: Social & Community)

1. **Cognitive Duels**: Реализация режима соревнований в реальном времени через SSE (Server-Sent Events) + Redis.
2. **Global Leaderboards**: Интеграция глобального рейтинга с фильтрацией по городам и ролям (Машинист, Диспетчер и т.д.).
3. **Rust Multi-analysis**: Расширение Rust-ядра для одновременного анализа нескольких сессий (сравнение динамики).
4. **Mobile Optimization**: Адаптация EDA-ядра для бесшовной работы в приложении Expo.

---

> [!IMPORTANT]
> При продолжении работы всегда запускайте `npm run validate` перед коммитом. Это гарантирует целостность математического ядра системы.
