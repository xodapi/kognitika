# Testing reference

Kognitika uses Vitest for unit and integration contracts plus Playwright for E2E coverage. Tests are grouped by category and enforce key contracts around security, route behavior, UI components, engine logic, knowledge domain rules, infrastructure, and end-to-end flows. Exact current suite results must be confirmed by CI or another completed compatible run; local Windows bind-mount runs can time out during module loading.

## Security and privacy

These tests enforce the security boundaries documented in SECURITY.md. They verify that no sensitive data leaks through APIs, logs, or storage.

| Test file (from repo root) | Purpose |
|---|---|
| `src/tests/analytics-export-privacy.test.ts` | Verifies the `/api/analytics/export` endpoint returns data with no raw Brain ID, email, token, or password hashes. The `privacy` object in the response confirms `personal_identifiers_included: false` and `safe_for_external_llm: true`. |
| `src/tests/admin-route-privacy.test.ts` | Verifies that admin-only API routes reject requests from non-admin users. The `role` field from JWT is not trusted alone; the server queries the database for the actual role. |
| `src/tests/app-identity-privacy.test.tsx` | Verifies the React app does not display raw Brain IDs, email addresses, or tokens in the UI. Tests all public-facing components for privacy-safe rendering. |
| `src/tests/legacy-email-audit.test.ts` | Verifies that legacy email fields (email, password) on the User model are not exposed through any public API endpoint and remain gated behind explicit configuration flags. |
| `src/tests/socket-duels.test.ts` | Verifies that Socket.io duel connections enforce authentication and that users can only join or observe duels they are authorized for. Uses synthetic JWT tokens and socket lifecycles. |
| `src/tests/cors-config.test.ts` | Verifies the CORS configuration logic at `src/server/config/cors.ts` rejects wildcard origins in production, applies the explicit allowlist, and handles the development wildcard flag correctly. |
| `src/tests/logging-privacy.test.ts` | Verifies that server-side logs do not contain raw Brain IDs, email addresses, tokens, or password hashes. The `safeError` and `createSafeLogger` utilities at `src/lib/safe-logger.ts` are tested for proper redaction. |
| `src/tests/privacy-sanitizers.test.ts` | Unit tests for the `privacyGuard` middleware and serialization helpers that strip personally identifiable information from API responses. |

## Route contracts

These tests verify that API routes accept, validate, and respond with the correct data shapes and status codes.

| Test file (from repo root) | Purpose |
|---|---|
| `src/tests/feedback-route.test.ts` | Verifies the `/api/feedback` route persists feedback submissions and returns the expected tracking number. Tests validation of required fields and error responses. |
| `src/tests/ideas-route.test.ts` | Verifies the `/api/ideas` route creates ideas, lists them by user, and enforces vote uniqueness (one vote per user per idea). Tests the notification contract for new ideas. |
| `src/tests/game-route.test.ts` | Verifies the `/api/game` route creates game sessions, calculates XP, and returns the correct progress data. Tests the XP event contract that ensures each completed session produces the right number of XP events. |
| `src/tests/neurotrainer-route.test.ts` | Verifies the `/api/neurotrainer` route generates training content, accepts answers, and returns feedback. Tests both enabled and disabled LLM modes. |
| `src/tests/practice-flow-route.test.ts` | Verifies the `/api/analytics/practice-flow` route generates practice recommendations based on session history. Tests the recommendation contract structure. |
| `src/tests/leaderboard-route.test.ts` | Verifies the `/api/leaderboard` route returns ranked user data, syncs weekly XP accurately, and enforces authorization for leaderboard sync operations. |
| `src/tests/navigation-contract.test.ts` | Verifies that the navigation structure (menu items, routes, labels) matches the expected contract. Tests that all trainer routes are properly registered and accessible. |

## UI components

These tests verify React component rendering, user interaction flows, and UI behavior across different states.

| Test file (from repo root) | Purpose |
|---|---|
| `src/tests/dashboard-ui.test.tsx` | Verifies the Dashboard page renders user stats, recent activity, and training recommendations. Tests loading and empty states. |
| `src/tests/admin-access-ui.test.tsx` | Verifies the `/admin` page renders correctly for admin users and shows access-denied for non-admin users. Tests all access states. |
| `src/tests/gallery-ui.test.tsx` | Verifies the TrainingGallery component renders the list of trainer modules with correct icons, descriptions, and navigation links. |
| `src/tests/analytics-ui.test.tsx` | Verifies the CognitiveProfile and Wiki UI pages render analytics data correctly. Tests the profile graph and knowledge article display. |
| `src/tests/feedback-ui.test.tsx` | Verifies the feedback modal opens, accepts input, displays delivery status, and handles network failures gracefully. |
| `src/tests/luscher-ui.test.tsx` | Verifies the Luscher color test UI renders color selection panels and handles user clicks. Tests the complete flow from selection to result display. |
| `src/tests/onboarding.test.tsx` | Verifies the onboarding flow (OnboardingModal) displays the correct steps, progresses through them, and completes correctly. |
| `src/tests/auth-modal.test.tsx` | Verifies the AuthModal displays Brain ID login and registration forms, validates input, and handles authentication responses. Tests the public identity contract (no email/password fields in public mode). |
| `src/tests/app-error-boundary.test.tsx` | Verifies the AppErrorBoundary catches React rendering errors and displays a fallback UI without crashing the whole app. |
| `src/tests/app-identity-privacy.test.tsx` | Also listed under Security/Privacy. Verifies the React app does not display raw identifiers in any component. |
| `src/tests/safe-responsive-container.test.tsx` | Verifies the SafeResponsiveContainer component renders Recharts charts without the known zero-size container warning. |
| `src/tests/ui-smoke.test.tsx` | Smoke tests that render all Mind-Guard trainer components to verify they mount without errors. |
| `src/tests/post-game-navigation.test.tsx` | Verifies the post-game recommendation system navigates to the correct next module based on completion data. |
| `src/tests/cognitive-trend-curve.test.tsx` | Verifies the CognitiveTrendCurve chart component renders trend data correctly across multiple data points. |

## Engine and trainer cores

These tests verify the game logic, event emission, and scoring of individual trainer modules. Every engine hook is tested in isolation from the UI.

| Test file (from repo root) | Purpose |
|---|---|
| `src/tests/schulte-core.test.ts` | Verifies Schulte table grid generation, click handling, completion detection, and reaction time metrics. Tests that `generateGrid(5, 'classic', 42)` is deterministic. |
| `src/tests/nback-core.test.ts` | Verifies N-Back sequence generation, match detection, and scoring. Tests different N levels and stimulus types. |
| `src/tests/stroop-core.test.ts` | Verifies Stroop test word-color generation, response validation, and reaction time tracking. Tests incongruent and congruent trials. |
| `src/tests/spatial-core.test.ts` | Verifies spatial concealment grid generation, reveal timing, and position memory scoring. Tests the event-driven state machine. |
| `src/tests/mental-math-engine.test.ts` | Verifies mental math problem generation, answer validation, and completion outcomes. Tests addition, subtraction, multiplication, and division modes. |
| `src/tests/alphabet-table-engine.test.ts` | Verifies alphabet table grid generation and game logic. Tests the engine lifecycle from start to completion. |
| `src/tests/stroop-alphabet-engine.test.ts` | Verifies the Stroop alphabet variant: colored letter generation, response validation, and scoring. |
| `src/tests/schulte90-core.test.ts` | Verifies Schulte 1-90 grid generation and the extended game engine. Tests both the generator and engine modules separately. |
| `src/tests/typing-core.test.ts` | Verifies speed typing text generation, input matching, and WPM/accuracy calculation. Tests the event-driven state transitions. |
| `src/tests/logical-core.test.ts` | Verifies logical matrix puzzle generation, rule validation, and solution checking. Tests the event-driven pattern. |
| `src/tests/numerical-core.test.ts` | Verifies numerical analysis problem generation and scoring. Tests number sequence pattern matching. |
| `src/tests/situational-core.test.ts` | Verifies situational judgment test scenario selection and response evaluation. Tests the decision engine. |
| `src/tests/topology-core.test.ts` | Verifies topology memory graph generation, node traversal tracking, and recall scoring. Tests memory pattern recognition. |
| `src/tests/collision-core.test.ts` | Verifies collision detector stream generation and collision detection logic. Tests the timing-based scoring. |
| `src/tests/dispatcher-core.test.ts` | Verifies async dispatcher task orchestration and multitasking scoring. Tests the stream physics of concurrent tasks. |
| `src/tests/language-scanner-core.test.ts` | Verifies language scanner manipulation pattern detection. Tests the engine with various text samples. |
| `src/tests/decryptor-core.test.ts` | Verifies decryptor fact-vs-emotion separation and encoding detection. Tests the core analysis engine. |
| `src/tests/reality-check-core.test.ts` | Verifies reality check AI substitution detection and source verification. Tests the evidence evaluation engine. |
| `src/tests/noise-reduction.test.ts` | Verifies noise reduction cognitive filtering. Tests the engine with noisy and clear signal inputs. |
| `src/tests/luscher-core.test.ts` | Verifies Luscher color test color ranking, psychological interpretation, and result calculation. |
| `src/tests/puzzle-logic.test.ts` | Verifies Schulte puzzle logic (Tomb Raider style) grid interactions, puzzle constraints, and completion detection. |
| `src/tests/mental-math-generator.test.ts` | Tests the mental math problem generator in isolation from the engine. Verifies problem diversity and difficulty ranges. |
| `src/tests/stroop-alphabet-generator.test.ts` | Tests the Stroop alphabet generator in isolation from the engine. Verifies colored letter combinations. |
| `src/tests/alphabet-table-generator.test.ts` | Tests the alphabet table generator in isolation. Verifies letter placement and grid structure. |

## Knowledge and domain logic

These tests verify the content database, knowledge base structure, cognitive graph, and recommendation algorithms.

| Test file (from repo root) | Purpose |
|---|---|
| `src/tests/knowledge-base-contract.test.ts` | Verifies the knowledge base at `src/lib/knowledge-base.ts` has a valid `KnowledgeArticle` for every route in `APP_ROUTE_PATHS` and `RECOMMENDED_GAME_ROUTES`. Checks that every tag has a glossary entry. |
| `src/tests/content-db.test.ts` | Verifies the static content database (Mind-Guard training cards) has 500+ entries with valid structure, seed determinism, and no duplicate IDs. |
| `src/tests/cognitive-module-graph.test.ts` | Verifies the cognitive module graph layout produces valid edges and nodes for all trainer modules. Tests the graph connectivity. |
| `src/tests/cognitive-map.test.ts` | Verifies the cognitive map rendering and node positioning logic. |
| `src/tests/cognitive-trend.test.ts` | Verifies cognitive trend computation from session history data. Tests the trend direction and magnitude algorithms. |
| `src/tests/daily-trajectory.test.ts` | Verifies the daily trajectory service at `src/server/services/daily-trajectory.ts` computes the correct trajectory structure from session data. |
| `src/tests/daily-tasks.test.ts` | Verifies the daily task generation algorithm selects the weakest cognitive zones and creates appropriate practice plans. |
| `src/tests/leagues.test.ts` | Verifies the league rating system (`getLeagueFromRating`) assigns users to the correct league tiers based on their rating. |
| `src/tests/completion-recommendation-contract.test.ts` | Verifies that post-completion recommendations return valid next modules based on the training graph. Tests the recommendation contract shape. |

## Infrastructure

These tests verify configuration, storage, runtime platform behavior, validation schemas, and build constraints.

| Test file (from repo root) | Purpose |
|---|---|
| `src/tests/cors-config.test.ts` | Also listed under Security/Privacy. Tests CORS configuration resolution logic for development, test, and production modes. |
| `src/tests/storage-gateway.test.ts` | Verifies the BrowserStorageGateway provides audited access to localStorage with size limits and error handling. |
| `src/tests/runtime-platform.test.ts` | Verifies runtime platform URL resolution (API base URL, frontend URL) works correctly across environments. |
| `src/tests/api-validation.test.ts` | Verifies Zod validation schemas for auth and game API inputs. Tests that invalid data is rejected with the correct error shapes. |
| `src/tests/frame-budget.test.ts` | Verifies the 60 FPS frame budget contract. Tests that analytics processing completes within the allocated time window. |
| `src/tests/pwa-strategy.test.ts` | Verifies the PWA offline-first strategy remains disabled until the documented acceptance gates are met. Tests the guardrail that prevents premature offline activation. |
| `src/tests/session-batch-analytics-contract.test.ts` | Verifies the server-side session batch analytics contract: input validation, output shape, and business logic for the session analytics pipeline. |
| `src/tests/analyze-session-core.test.ts` | Verifies the AnalyzeSession core contract at `src/core/analyze-session/index.ts`. Tests that the analysis produces correct metrics shapes from synthetic click events. |
| `src/tests/analyze-session-v2-fixtures.test.ts` | Verifies the AnalyzeSession pipeline against golden fixture datasets. Tests that analysis results match expected values across known input patterns. |
| `src/tests/zod-csp.test.ts` | Verifies that Zod schemas are compatible with the Content Security Policy environment. Tests that schema validation does not rely on `eval()` or dynamic code generation. |
| `src/tests/ui-smoke.test.tsx` | Also listed under UI Components. Smoke tests for all Mind-Guard trainer components. |
| `src/tests/safe-responsive-container.test.tsx` | Also listed under UI Components. Tests the Recharts container sizing contract. |
| `src/tests/event-boundary.test.ts` | Verifies that EventBus imports are isolated and do not create circular dependencies. Tests that the EventBus can be instantiated server-side. |
| `src/tests/neurotrainer-service.test.ts` | Verifies the neurotrainer service at `src/server/services/neurotrainer.ts` generates questions and evaluates answers. Tests both LLM-enabled and disabled modes. |
| `src/tests/neurotrainer-ui-contract.test.ts` | Verifies that new trainer modules match the required UI contract: presence of `title`, `description`, `category`, and route. |
| `src/tests/practice-flow-analytics.test.ts` | Verifies the practice flow analytics contract: recommendation structure, module scoring, and category breakdown. |
| `src/tests/analytics-contract.test.ts` | Verifies the analytics `ClickEvent` contract at the type level. Tests that events have the required `cellId` and `reactionTimeMs` fields. |
| `src/tests/analytics-persistence.test.ts` | Verifies that analytics summaries are persisted and retrieved correctly through the `SessionAnalyticsSummary` model. |
| `src/tests/reproducibility.test.ts` | Verifies analytical reproducibility with seeded data. Tests that the same seed produces identical analysis results across runs. |
| `src/tests/praise-engine.test.ts` | Verifies the praise engine generates encouraging messages based on user performance. Tests message variety and appropriateness. |
| `src/tests/identity-vault.test.ts` | Verifies the identity vault (Brain ID secure storage) at `src/lib/identity-vault.ts` correctly stores and retrieves credentials without leaking to logs. |
| `src/tests/telegram-notifier.test.ts` | Verifies the Telegram admin notifier sends messages correctly when configured. Tests the notification formatting and error handling. |
| `src/tests/logic-verification.test.ts` | Verifies EDA logic verification in headless mode. Tests the EventBus integration across multiple engine types. |

## End-to-end (Playwright)

These tests run the full application stack through a browser.

| Test file (from repo root) | Purpose |
|---|---|
| `tests/basic.spec.ts` | Verifies the application loads, renders the landing page, and navigates between major sections. |
| `tests/screenshot.spec.ts` | Takes screenshots of key pages for visual regression testing. |
| `tests/frame-budget.spec.ts` | Measures frame render times during gameplay to verify the 60 FPS budget is not exceeded. |
