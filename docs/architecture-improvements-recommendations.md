# Architecture Improvements: Analysis and Recommendations

> Created: 2026-08-11  
> Based on: agent-rules-books analysis (Clean Architecture, Clean Code, DDD, Refactoring, Working with Legacy Code, A Philosophy of Software Design)

## Executive Summary

После завершения SOLID-рефакторинга (#255-#259) кодовая база Kognitika достигла высокого уровня архитектурной чистоты:
- ✅ Repository Pattern внедрён (DIP compliance)
- ✅ Services Layer выделен (SRP compliance)
- ✅ Analytics Module Registry расширяем (OCP compliance)
- ✅ 67/67 тестов проходят

Однако анализ открытых репозиториев навыков (ciembor/agent-rules-books) выявил несколько областей для дальнейшего улучшения.

---

## 1. Analytics Services: Direct Prisma Dependencies

### Текущее состояние

Analytics services ранее напрямую импортировали `prisma`; Phase 6 устранила эту зависимость:

```typescript
// src/server/services/analytics/comparison.ts
import prisma from '../../../lib/prisma.ts';

export class ComparisonService {
  async compare(input: ComparisonInput): Promise<ComparisonResult> {
    const history = await prisma.gameSession.findMany({...});
    const totalSessionsCount = await prisma.gameSession.count({...});
    // ...
  }
}
```

Прямые Prisma-зависимости удалены из `comparison.ts`, `profile.ts` и `export.ts`.

### Нарушенные принципы

**Clean Architecture (DIP violation):**
> "Source dependencies must point inward toward higher-level policy. Domain and use cases must not import frameworks, databases, web handlers, queues, external service clients, UI types, or other details."

**A Philosophy of Software Design (Information Hiding):**
> "Hide volatile decisions, internal representations, storage shape, protocols, file formats, performance hacks, bookkeeping, normalization, and messy edge handling inside the module that owns the knowledge."

### ✅ Реализовано: [P2] Analytics Repository Layer

**Реализация:**
1. Создан `AnalyticsSessionRepository` интерфейс
2. Добавлен `PrismaAnalyticsSessionRepository`
3. Репозиторий подключён через DI container к analytics services
4. Добавлены focused tests с in-memory implementation

**Benefit:**
- Тестируемость: analytics services можно тестировать с in-memory репозиториями
- Независимость от Prisma: замена ORM не затронет business logic
- Consistency: унификация с Game repositories pattern

**Статус:** завершено и проверено в Phase 6.

---

## 2. Domain Language and Ubiquitous Language

### Текущее состояние

В кодовой базе смешиваются технические и предметные термины:

```typescript
// Техническое имя
class GameCompletionService { }

// vs предметная терминология
// "Cognitive Session", "Training Completion", "Performance Recording"
```

**Domain-Driven Design (Ubiquitous Language violation):**
> "Use a Ubiquitous Language per Bounded Context across names, tests, documents, diagrams, planning, and feature discussion; keep explanatory models separate from the implementation model."

### Наблюдения

1. **Mixed terminology:**
   - `GameSession` vs `CognitiveSession`
   - `score` vs `performance index`
   - `gameType` vs `moduleId` vs `trainer type`

2. **Context boundaries unclear:**
   - Gaming terminology (`game`, `attempts`, `leaderboard`) может не отражать cognitive training domain
   - Analytics domain смешан с game-save domain

### Рекомендация: [P3] Domain Language Audit

**Решение:**
1. Провести session с domain experts (психологи, когнитивные специалисты)
2. Документировать Ubiquitous Language в `docs/domain-language.md`
3. Постепенно выравнивать названия классов/переменных с domain language
4. Выявить Bounded Contexts и создать Context Map

**Benefit:**
- Код становится самодокументирующимся для предметных специалистов
- Снижение когнитивной нагрузки при чтении кода
- Явные границы между subdomains

**Estimation:** 4-6 hours (audit + documentation)
**Priority:** P3 (low) — не блокирует development, но улучшает long-term maintainability

---

## 3. Deep Module Design

### Текущее состояние

Некоторые services остаются thin wrappers без скрытия сложности:

```typescript
// src/server/services/game-progress.ts
export class GameProgressService {
  constructor(private readonly gameSessionRepository: GameSessionRepository) {}

  async getUserProgress(userId: string) {
    return this.gameSessionRepository.findCompletedByUser(userId);
  }
}
```

**A Philosophy of Software Design (Shallow Module warning):**
> "Prefer deep modules: small, semantic interfaces that hide meaningful internal complexity. Reject pass-through services, thin library wrappers, helper modules, and tiny split-outs that add names without reducing reader burden."

### Анализ

**GameProgressService** — это pass-through wrapper без добавленной value:
- Не скрывает сложность
- Не добавляет domain logic
- Не упрощает caller burden

### Рекомендация: [P3] Evaluate Shallow Services

**Два варианта:**

**Вариант A: Inline thin services**
- Удалить pass-through wrappers
- Вызывать repositories напрямую из routes там, где нет business logic

**Вариант B: Enrich services with domain logic**
- Добавить domain-level operations (filtering, sorting, aggregation)
- Скрыть Prisma query complexity за semantic interfaces

**Recommendation:** Вариант B для будущих фич, Вариант A для existing thin wrappers

**Benefit:**
- Снижение когнитивной нагрузки (меньше уровней абстракции)
- Код следует принципу "добавляй сложность только когда она скрывает ещё большую сложность"

**Estimation:** 1-2 hours
**Priority:** P3 (cosmetic) — не влияет на correctness

---

## 4. Test Characterization for Legacy Code

### Текущее состояние

В проекте присутствует `game-save-legacy.ts` — preserved original implementation.

**Working Effectively with Legacy Code:**
> "Before editing, state the requested behavior change and the current behavior that must remain; characterize uncertain or suspicious behavior instead of silently fixing it."

### Рекомендация: [P2] Characterization Tests for Legacy Path

**Решение:**
1. Создать `game-save-legacy.test.ts` с characterization tests
2. Зафиксировать текущее поведение legacy implementation
3. Добавить explicit verification что новая реализация behaviorally equivalent

**Benefit:**
- Safety net при удалении legacy code
- Документирует ожидаемое поведение
- Предотвращает regression при cleanup

**Estimation:** 2-3 hours
**Priority:** P2 — legacy code без тестов это technical debt

---

## 5. Explicit Error Handling Strategy

### Текущее состояние

Error handling смешивает разные стратегии:

```typescript
// Domain errors
export class SessionNotFoundError extends Error { }
export class SessionForbiddenError extends Error { }

// vs GameAttemptError with status codes
export class GameAttemptError extends Error {
  constructor(message: string, public status: number, public code: string) { }
}

// vs generic try-catch в routes
catch (error) {
  logger.error('Analytics compare failed', { error: safeError(error) });
  res.status(500).json({ error: 'Ошибка сравнения результатов' });
}
```

**Clean Code (Error Handling):**
> "Keep the happy path readable. Isolate error handling, invalid-state handling, and cleanup; prefer explicit optionality or typed results over null-like sentinel flow when the language supports it."

### Рекомендация: [P2] Unified Error Hierarchy

**Решение:**
1. Создать базовый `DomainError` с categorization (Validation, NotFound, Forbidden, Conflict, Internal)
2. Определить mapping domain errors → HTTP status codes в одном месте
3. Добавить middleware для domain error → HTTP response translation

**Example:**
```typescript
// src/server/domain/errors.ts
export abstract class DomainError extends Error {
  abstract readonly category: 'validation' | 'notFound' | 'forbidden' | 'conflict' | 'internal';
  abstract readonly httpStatus: number;
}

export class SessionNotFoundError extends DomainError {
  readonly category = 'notFound' as const;
  readonly httpStatus = 404;
}
```

**Benefit:**
- Consistency: единообразная обработка ошибок
- Testability: можно проверять domain errors независимо от HTTP
- Separation of Concerns: routes не знают про HTTP status mapping

**Estimation:** 3-4 hours
**Priority:** P2

---

## 6. Aggregate Boundaries and Transaction Consistency

### Текущее состояние

`PrismaCompletedGameRepository.complete()` выполняет large transaction с множественными обновлениями:
- Create GameSession
- Update User (XP, streak, level)
- Create XP event
- Create/update analytics outbox
- Reserve game attempt

**Domain-Driven Design (Aggregate boundaries):**
> "Design domain objects for the model first and persistence second; preserve identity, Aggregate boundaries, Value Object semantics, and domain query criteria instead of exposing database structure."

### Анализ

**Потенциальный Aggregate:**
- Root: `GameSession`
- Children: analytics job, attempt reservation
- External reference: `User` (отдельный aggregate)

**Вопросы consistency:**
- User XP update — это часть session aggregate или separate?
- Streak calculation — domain logic или persistence detail?

### Рекомендация: [P3] Aggregate Design Review

**Решение:**
1. Документировать aggregate boundaries в `docs/domain-model.md`
2. Определить transactional boundaries явно
3. Рассмотреть eventual consistency для analytics (уже есть outbox pattern)

**Benefit:**
- Чёткое понимание consistency guarantees
- Упрощение transaction management
- Масштабируемость (eventual consistency где возможно)

**Estimation:** Planning session 2-3 hours + potential refactoring
**Priority:** P3 — current implementation works, это architectural debt

---

## 7. Code Comments and Documentation

### Текущее состояние

Код содержит minimal comments:

```typescript
/**
 * Orchestrates the game completion flow.
 * 
 * Responsibilities:
 * - Validates input completeness and analytics job
 * - Computes server-side score
 * - Validates attempt contract and window (if present)
 * - Delegates transactional persistence to CompletedGameRepository
 * ...
 */
```

**Clean Code vs A Philosophy of Software Design (Comment tension):**

Clean Code:
> "Use comments only for rationale, constraints, warnings, or external contracts. Do not narrate code instead of improving it."

APoSD:
> "Use comments to reduce complexity: document interface contracts, invariants, hidden design decisions, rationale, and tricky implementation facts callers should not need to know."

### Рекомендация: [P3] Strategic Comments

**Where to add comments:**
1. **Interface contracts** — что ожидается от callers, гарантии, preconditions
2. **Hidden invariants** — streak calculation rules, XP formulas, score computation
3. **Non-obvious decisions** — почему attempt validation inside transaction
4. **External constraints** — Brain ID format, analytics job schema version

**What NOT to comment:**
- Self-evident code (`// Create user`)
- Implementation details that should be refactored into better names
- Temporary TODOs (use issue tracker)

**Benefit:**
- New developers understand system faster
- Domain rules explicit and auditable
- Reduced cognitive load

**Estimation:** Ongoing (add during feature work)
**Priority:** P3

---

## Implementation Roadmap

### Phase 6: High-Priority Improvements

**Priority order:**
1. [P2] **Analytics Repository Layer** — устраняет DIP violation, consistency с Game repositories
2. [P2] **Unified Error Hierarchy** — улучшает testability и separation of concerns
3. [P2] **Legacy Characterization Tests** — safety net перед удалением legacy code

**Estimated effort:** 7-10 hours total

### Phase 7: Medium-Priority Refinements

1. [P3] **Domain Language Audit** — long-term maintainability
2. [P3] **Aggregate Design Review** — architectural documentation
3. [P3] **Shallow Services Evaluation** — code simplification

**Estimated effort:** 7-11 hours total

### Future Considerations

- **Event Sourcing** — если потребуется audit trail для cognitive sessions
- **CQRS** — если read/write patterns разойдутся
- **Microservices boundaries** — если analytics станет отдельным сервисом

---

## Verification Strategy

Каждое изменение должно проходить:
1. **Typecheck** — `pnpm typecheck`
2. **Unit tests** — `pnpm test <relevant-suite>`
3. **Integration tests** — full game-save flow
4. **Manual verification** — smoke test через UI

---

## References

**Applied patterns from agent-rules-books:**
- Clean Architecture (DIP, dependency direction)
- Clean Code (error handling, naming)
- Domain-Driven Design (Ubiquitous Language, Aggregates)
- A Philosophy of Software Design (Deep Modules, Information Hiding)
- Working Effectively with Legacy Code (Characterization Tests)
- Refactoring (behavior-preserving transformations)

**Repository sources:**
- `ciembor/agent-rules-books` — distilled software engineering books
- `tonynguyennvt/cursor-rules-awesome` — corporate standards
- `PatrickJS/awesome-cursorrules` — stack-specific patterns

---

## Conclusion

Kognitika архитектура находится в **excellent state** после SOLID cleanup. Рекомендуемые улучшения — это **refinements**, а не fixes критических проблем.

**Next steps:**
1. Review этот документ с командой
2. Prioritize Phase 6 improvements
3. Create issues для tracked work
4. Execute incrementally

Все предложения следуют принципу **continuous incremental improvement** без big-bang rewrites.
