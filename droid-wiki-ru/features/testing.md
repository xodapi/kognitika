# Стратегия тестирования (Testing Strategy)

**Фреймворк**: Vitest (unit/integration) + Playwright (E2E) · **Тестов**: 357 (84 файла) · **Покрытие**: > 85%

---

## Пирамида тестов

```
                    ┌─────────────┐
                    │   E2E (12)  │  Playwright - критичные пользовательские сценарии
               ┌────┴─────────────┴────┐
               │  Integration (45)     │  Vitest - API, hooks, services, Socket.io
         ┌─────┴───────────────────────┴─────┐
         │        Unit (300)                 │  Vitest - pure functions, generators, utils
         └───────────────────────────────────┘
```

---

## Unit Tests (Vitest)

### Категории
| Категория | Файлов | Тестов | Примеры |
|---|---|---|---|
| **Generators** | 12 | 78 | `schulte-generator`, `nback-generator`, `stroop-generator` |
| **Engines/Hooks** | 15 | 92 | `useSchulteEngine`, `useNBackEngine`, `useStroopEngine` |
| **Utils/Helpers** | 18 | 65 | `safe-logger`, `haptic`, `keystroke-analyzer` |
| **Rust/TS Parity** | 4 | 28 | `session-analysis` (7 golden vectors × 2 impl) |
| **Privacy/Security** | 6 | 37 | `privacy-sanitizers`, `analytics-export-privacy` |

### Запуск
```bash
# Все тесты
pnpm test --run

# С покрытием
pnpm test --run --coverage

# Конкретный файл
pnpm test --run src/tests/schulte-core.test.ts

# Watch mode
pnpm test

# UI mode
pnpm test:ui
```

### Golden Vectors (Rust ↔ TS Parity)
Критично для `analyzeSession` — одинаковые результаты на TS (браузер) и Rust (WASM/Server):

| Вектор | Описание | Ожидаемый вывод |
|---|---|---|
| `cell_click` | Schulte 5×5, 6 кликов | duration=6000, p50=140, accuracy=0.833 |
| `practice_flow` | Stroop, чекпоинты + ответы | duration=24000, p50=650, slope=-8.6667 |
| `suspicious_fast` | 6 кликов < 50мс, 100% accuracy | suspiciousPatternScore=1.0 |
| `thousand_clicks` | 1000 кликов, реалистичные RT | clickCount=1000, p50≈210 |
| `ten_thousand_mixed` | 10k событий, смешанные типы | duration=599940, accuracy>0.9 |
| `fatigue_curve` | 800 кликов с дрифтом RT | fatigueIndex>0.45 |
| `abandoned` | Нет completedAt, ранние чекпоинты | engagementIndex<0.35 |

**Файлы**:
- TS: `src/tests/analyze-session-core.test.ts`
- Rust: `crates/kognitika-core/src/lib.rs` (mod tests)

---

## Integration Tests (Vitest)

### API Routes
| Файл | Эндпоинты | Тестов |
|---|---|---|
| `api-validation.test.ts` | `/api/auth/*`, `/api/game/save`, `/api/analytics/*` | 28 |
| `analytics-route.test.ts` | `/export`, `/profile`, `/compare`, `/summaries` | 19 |
| `duels-route.test.ts` | `/create`, `/join`, `/history`, `/leaderboard` | 14 |
| `auth-modal.test.tsx` | Brain ID create/restore, UI flow | 12 |

### Services
| Файл | Сервис | Тестов |
|---|---|---|
| `analytics-persistence.test.ts` | `persistSessionAnalyticsSummary`, `getModuleTrendData` | 11 |
| `duel-engine.test.ts` | seed generation, move validation, elo calc | 16 |
| `onboarding.test.tsx` | State machine, API calls | 9 |

### Socket.io
| Файл | События | Тестов |
|---|---|---|
| `duels-socket.test.ts` | create, join, action, finish, rematch | 22 |
| `symbolchat-socket.test.ts` | post, feed, react, stats | 14 |

---

## E2E Tests (Playwright)

### Критичные сценарии (12 тестов)
| Сценарий | Файл | Описание |
|---|---|---|
| **Full Onboarding** | `onboarding.spec.ts` | Welcome → Goals → Demo (Schulte 3×3) → Profile → Save Brain ID |
| **Schulte Session** | `schulte-session.spec.ts` | Settings → Start → Play 25 cells → Results → Export |
| **Stroop + Luscher** | `stroop-luscher.spec.ts` | Pre-Luscher → Stroop 60s → Post-Luscher → Compare |
| **N-Back Session** | `nback-session.spec.ts` | 2-back 20 rounds → d-prime calculation → Save |
| **Duel Create + Join** | `duel-create-join.spec.ts` | User A creates → User B joins → Play → Finish → Rating |
| **Duel Rematch** | `duel-rematch.spec.ts` | Finish → Rematch → New seed → Play again |
| **Daily Practice** | `daily-practice.spec.ts` | Dashboard → 3 tasks → Complete 2 → XP + Streak update |
| **Export + LLM** | `export-llm.spec.ts` | Profile → Export → Validate JSON structure + privacy |
| **Feedback Flow** | `feedback-flow.spec.ts` | Submit BUG → Get trackingNum → Check status → Admin reply |
| **Ideas Wall** | `ideas-wall.spec.ts` | Create idea → Vote → Admin changes status → Notification |
| **SymbolChat** | `symbolchat.spec.ts` | Post symbol → React → Filter by category → Stats |
| **Admin Panel** | `admin-panel.spec.ts` | Login → Users table → Ban → Config change → Audit log |

### Запуск
```bash
# Установка браузеров
pnpm playwright install

# Все E2E
pnpm test:e2e

# Конкретный тест
pnpm test:e2e --grep "Schulte Session"

# Headed mode (видимый браузер)
pnpm test:e2e --headed

# Debug mode
pnpm test:e2e --debug

# UI mode
pnpm test:e2e --ui
```

### CI конфигурация
```yaml
# .github/workflows/ci.yml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - run: pnpm playwright install --with-deps
    - run: pnpm test:e2e
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

---

## Privacy & Security Tests (обязательные к прохождению)

| Тест | Проверяет | Fail = Block Merge |
|---|---|---|
| `analytics-export-privacy.test.ts` | Нет brainId, email, token, password, localStorage, точных таймстемпов, raw session data. `safe_for_external_llm: true` | ✅ |
| `privacy-sanitizers.test.ts` | `privacyGuard` middleware вырезает PII из всех API ответов | ✅ |
| `logging-privacy.test.ts` | `safeError` / `createSafeLogger` маскируют Brain ID, email, tokens, hashes | ✅ |
| `app-identity-privacy.test.ts` | Публичная аутентификация только Brain ID; email/password = 410 Gone | ✅ |
| `legacy-email-audit.test.ts` | Email/password контролы не рендерятся в публичном UI | ✅ |
| `admin-route-privacy.test.ts` | ADMIN роль проверяется серверно, не доверяется JWT.claims.role | ✅ |
| `cors-config.test.ts` | `CORS_ORIGIN` allowlist; wildcard только с `CORS_ALLOW_DEV_WILDCARD=true` | ✅ |
| `socket-duels.test.ts` | Аутентификация сокетов, серверная валидация membership, evidence-based cells | ✅ |

---

## Тестовые утилиты и фикстуры

### `src/test/utils.tsx`
```typescript
// Рендер с провайдерами
export function renderWithProviders(ui, { user, router } = {}) {
  return render(
    <AuthProvider user={user}>
      <Router>{ui}</Router>
    </AuthProvider>
  );
}

// Мок пользователя
export const mockUser = {
  id: 'clx123',
  brainId: '550e8400-e29b-41d4-a716-446655440000',
  pseudonym: 'Swift-Falcon-7421',
  level: 5,
  experience: 12500,
  rating: 1450,
  role: 'USER'
};
```

### `src/test/fixtures/`
| Файл | Содержимое |
|---|---|
| `sessions.json` | 50 реалистичных GameSession для разных модулей |
| `users.json` | 20 пользователей с разными профилями |
| `daily-plans.json` | 30 дней DailyPracticePlan |
| `analytics-exports.json` | 5 примеров экспорта для LLM тестов |

---

## Команды и скрипты

```bash
# package.json scripts
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:debug": "playwright test --debug",
"test:ui": "vitest --ui"
```

### Coverage Thresholds
```json
// vitest.config.ts
test: {
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 85,
      functions: 80,
      branches: 75,
      statements: 85
    }
  }
}
```

---

## Flaky Test Management

| Правило | Действие |
|---|---|
| Flaky в CI > 2 раза за неделю | Создаётся Issue с label `flaky` |
| 3+ провала подряд | Тест временно отключается (`test.skip`) + Issue |
| E2E flaky | Анализ trace.zip + screenshots → фикс селекторов / waits |

---

## Файлы конфигурации

| Путь | Назначение |
|---|---|
| `vitest.config.ts` | Vitest config (globals, environment, coverage) |
| `playwright.config.ts` | Playwright config (projects, retries, trace) |
| `.github/workflows/ci.yml` | CI pipeline |
| `src/test/setup.ts` | Global test setup (mocks, polyfills) |
| `src/test/utils.tsx` | Render helpers, mocks |
| `src/test/fixtures/` | Test data fixtures |
