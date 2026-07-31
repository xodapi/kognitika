# Безопасность

## Security Boundaries

Ключевые границы доверия, принуждаемые тестами (см. [Тестирование](features/testing.md#безопасность-и-приватность)):

| Граница | Тест | Описание |
|---|---|---|
| **Brain ID auth** | `app-identity-privacy` | Публичная аутентификация только через Brain ID. Email/password — legacy, явно отгейтованы. |
| **JWT verification** | `admin-route-privacy` | ADMIN роль проверяется серверно; не доверяется полю в JWT. |
| **CORS allowlist** | `cors-config` | `CORS_ORIGIN` — comma-separated allowlist. Wildcard требует `CORS_ALLOW_DEV_WILDCARD=true`, только dev. Продакшн без allowlist = fail-closed. |
| **Analytics export privacy** | `analytics-export-privacy` | `/api/analytics/export`: нет сырого Brain ID, email, токенов, хэшей, UUID сессий, точных таймстемпов. `privacy.safe_for_external_llm: true`. |
| **Socket.io trust** | `socket-duels` | Аутентификация сокетов, серверная проверка членства в матче, клетки на основе evidence. |
| **Privacy guard middleware** | `privacy-sanitizers` | `privacyGuard` middleware + сериализаторы в `src/server/middleware/privacy.ts` вырезают PII из всех API-ответов. |
| **Logging privacy** | `logging-privacy` | `safeError` / `createSafeLogger` в `src/lib/safe-logger.ts` маскируют Brain ID, email, токены, хэши в логах. |
| **Legacy email audit** | `legacy-email-audit` | Публичный UI Brain ID-only; email/password контролы не рендерятся. |

## Vulnerability Reporting

Это приватный проект. Если вы обнаружили уязвимость безопасности, **не открывайте публичный issue**. Сообщите приватно владельцу репозитория.

При отчёте укажите:
- Описание уязвимости
- Шаги воспроизведения (PoC предпочтительно)
- Затронутые компоненты (API, auth, storage, etc.)
- Потенциальное влияние

## Security Documentation

- `SECURITY.md` — политика ответственного раскрытия и security boundaries
- `docs/brain-id-identity.md` — границы хранения/восстановления Brain ID
- `docs/feedback-operations.md` — операторская верификация feedback

## Runtime Security Notes

- **Firebase полностью выведен** из runtime архитектуры (историческая причина: Brain ID + Prisma + PostgreSQL — активный путь).
- **PWA/offline** отключено до acceptance gates в `docs/pwa-offline-strategy.md`.
- **Rust/WASM hot-path** не начинается без frame-budget gate в `docs/frame-budget-benchmark.md`.
- **Legacy email функции** остаются отгейтованными явно.
- **Прямые правки на продакшн** запрещены вне задокументированного hotfix-протокола (см. [Деплой](deployment.md#emergency-hotfix-protocol)).

## Secrets & Environment

Никогда не коммитьте реальные секреты, токены, сырой Brain ID, продакшн телеметрию или пользовательские данные. См. `.env.example` для полного списка env vars.
