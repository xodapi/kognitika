# Архитектура и Состояние Проекта Kognitika (v2.2)

Этот документ содержит подробное описание проделанной работы по рефакторингу ядра платформы Kognitika, описание архитектурных паттернов и дорожную карту для дальнейшего развития.

Актуальный долгосрочный план развития вынесен в
[`docs/KOGNITIKA_LONGTERM_ROADMAP.md`](docs/KOGNITIKA_LONGTERM_ROADMAP.md):
он связывает текущие issues #46–#50 с фазами когнитивной безопасности,
мультисенсорного расширения, соматико-созерцательных практик, Rust/WASM
границ и научной валидации.

## 0. История Разработки (Changelog)

*   **2026-06-13**: **v2.2 Runtime Simplification** — Удалён неиспользуемый Firebase слой, зафиксирован Brain ID + Prisma/PostgreSQL runtime, оставлена WASM-ready аналитическая граница без отсутствующего Rust-пакета.
*   **2026-05-13**: **v2.1 Hardening & PWA** — Boot/storage hardening, группировка тренировок (Base/Engineering/Guard) и новый визуальный стиль Obsidian/Neon.
*   **2026-05-13**: **v2.0 Stabilization** — Финализация Фазы 6 (Mind-Guard), JS analytics worker и очистка технического долга.
*   **2026-05-12**: **v1.5 Neuro-Engineering** — Запуск модулей Topology Memory, Collision Detector и Async Dispatcher. 100% покрытие Headless-тестами.
*   **2026-05-11**: **v1.0 Core Evolution** — Переход на Event-Driven Architecture (EDA) и аналитическую границу для будущих hot-path оптимизаций.

## 1. Архитектурная Революция: Event-Driven Core

Мы перешли от монолитных React-компонентов к **Event-Driven Architecture (EDA)**. Теперь логика тренажера полностью отделена от визуального представления.

### Ключевые принципы:
- **Core-as-a-Hook**: Вся бизнес-логика (генерация сеток, проверка ответов, расчет времени) вынесена в специализированные хуки `use...Engine.ts`.
- **EventBus**: Коммуникация между ядром, аналитикой и UI происходит через шину событий. Это позволяет тестировать логику без рендеринга DOM.
- **Seeded Determinism**: Генераторы (например, в Schulte и Spatial) поддерживают передачу `seed`. Это гарантирует, что тесты всегда воспроизводимы и детерминированы.

## 2. Статус Модулей (Refactoring Progress)

| Модуль | Core Hook | EventBus | Автотесты | Analytics | Статус |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Schulte Tables** | ✅ | ✅ | ✅ (7/7) | JS / WASM-ready | **Production Ready** |
| **Speed Typing** | ✅ | ✅ | ✅ (2/2) | JS / WASM-ready | **Production Ready** |
| **Spatial Concealment** | ✅ | ✅ | ✅ (3/3) | JS / WASM-ready | **Production Ready** |
| **N-Back Test** | ✅ | ✅ | ✅ (4/4) | JS | **Production Ready** |
| **Stroop Test** | ✅ | ✅ | ✅ (4/4) | JS | **Production Ready** |
| **Logical Matrix** | ✅ | ✅ | ✅ (3/3) | JS | **Production Ready** |
| **Numerical Analysis** | ✅ | ✅ | ✅ (3/3) | JS | **Production Ready** |
| **Topology Memory** | ✅ | ✅ | ✅ | JS | **Production Ready** |
| **Collision Detector** | ✅ | ✅ | ✅ | JS | **Production Ready** |
| **Async Dispatcher** | ✅ | ✅ | ✅ | JS | **Production Ready** |
| **Semantic Scanner** | ✅ | ✅ | — | JS | **Production Ready** |
| **Decryptor** | ✅ | ✅ | — | JS | **Production Ready** |
| **Reality Check** | ✅ | ✅ | — | JS | **Production Ready** |
| **Noise Reduction** | ✅ | ✅ | ✅ | JS | **Production Ready** |
| **Concentration Curve**| ⚠️ | ✅ | ❌ | UI | UI Only (Visualization) |

## 3. Система «Вратарь» (Gatekeeper)

Для защиты от регрессий внедрена система автоматической валидации. 
**Команда:** `pnpm validate`

Она запускает набор Headless-тестов, которые имитируют прохождение тренажеров «роботом» за доли секунды. Если любое изменение в коде ломает логику (например, неверный порядок чисел или сбой таймера), «Вратарь» заблокирует сборку.

## 4. Analytics Worker And WASM Boundary

Текущая реализация использует JS metrics за worker-границей:
- `src/lib/cognitive-metrics.ts` — текущий контракт и расчёты.
- `src/workers/analytics.worker.ts` — изоляция аналитики от UI thread.
- `src/tests/analytics-contract.test.ts` — защита от возврата отсутствующего `packages/analytics-kernel`.

WASM/Rust может быть добавлен позже только как hot-path boundary. Он должен сохранить публичные event contracts и иметь deterministic JS fallback.

## 5. Дорожная Карта (Phase 7: Social & Community)

1. **Cognitive Duels**: Реализация режима соревнований в реальном времени через Socket.io + Redis-ready adapter.
2. **Global Leaderboards**: Интеграция глобального рейтинга с фильтрацией по городам и ролям (Машинист, Диспетчер и т.д.).
3. **WASM Multi-analysis**: Исследование hot-path модуля для сравнения динамики нескольких сессий без переписывания основного стека.
4. **Mobile Optimization**: Адаптация EDA-ядра для бесшовной работы в приложении Expo.

---

> [!IMPORTANT]
> При продолжении работы всегда запускайте `pnpm validate` перед коммитом; для production-risk изменений также `pnpm lint`, `pnpm test`, `pnpm build`.
