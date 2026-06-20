# Feedback Operations

This document describes where public feedback goes, how operators can verify delivery, and which environment variables control notifications.

## Runtime Flow

1. Public UI: `FeedbackModal` sends `POST /api/feedback` with `{ type, content }` and a Brain ID auth token.
2. API validation: `feedbackSubmitSchema` accepts `idea`, `bug`, `improvement`, or `other` and trims bounded text content.
3. Persistence: `src/server/routes/feedback.ts` writes a Prisma `Feedback` row with `userId`, `type`, sanitized `content`, generated `trackingNum`, and default status.
4. Response: the API returns `{ success: true, trackingNum }`; the UI shows the tracking number to the user.
5. Event: only after durable persistence, the route emits `feedback:submitted`.
6. Notifications: `src/lib/subscribers.ts` builds privacy-safe admin notifications and sends Telegram when configured. Legacy admin email is optional.
7. Admin view: `/api/admin/feedback` and `AdminPanel` show feedback to admin users with privacy-safe identity labels.
8. Admin response: `/api/admin/feedback/:id/response` stores `adminResponse` and moves the item to `replied`.

## Notification Channels

Telegram is the preferred operator notification channel.

Required env vars:

```env
TELEGRAM_BOT_TOKEN="replace-me"
TELEGRAM_ADMIN_CHAT_ID="replace-me"
```

If either value is missing, empty, `replace-me`, `undefined`, or `null`, Telegram delivery is treated as disabled and no network call is made.

Optional legacy/admin email vars:

```env
ADMIN_NOTIFICATION_EMAIL="admin@example.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="user@example.com"
SMTP_PASS="replace-me"
LEGACY_EMAIL_NOTIFICATIONS_ENABLED="false"
```

Public Brain ID users are not emailed unless the legacy opt-in flag is explicitly enabled and the legacy user has email.

## Privacy Rules

- Do not include email, raw Brain ID, auth tokens, raw localStorage, screenshots, or private telemetry in feedback test content.
- Telegram messages are redacted through `safe-logger` helpers before delivery.
- Admin feedback responses should show pseudonym or short Brain label, not raw identity material.
- GitHub issues, logs, fixtures, and screenshots must use synthetic feedback only.

## Operator Verification

Use synthetic text only.

1. Sign in with a test Brain ID.
2. Open `Отправить отзыв`.
3. Submit a short synthetic message such as `Synthetic feedback smoke test, no user data.`
4. Confirm the UI shows `Номер обращения` with a value like `FB-XXXXXXXX`.
5. Confirm Telegram receives a `Kognitika: новая обратная связь` message when Telegram env vars are configured.
6. Open `/admin` as an admin user.
7. Confirm the feedback appears in the feedback tab with a privacy-safe profile label.
8. Send an admin response and confirm the item status becomes `replied`.

## Failure Expectations

- Unauthenticated feedback is rejected by auth middleware.
- Invalid payloads return `400` and do not write to the database.
- Database failure returns `500` and does not emit `feedback:submitted`.
- Telegram failure is logged as a warning and does not delete or roll back persisted feedback.
- Missing Telegram configuration is logged as disabled, not as a product error.

## Regression Tests

Useful focused tests:

```bash
pnpm test src/tests/feedback-route.test.ts src/tests/feedback-ui.test.tsx src/tests/telegram-notifier.test.ts src/tests/admin-route-privacy.test.ts
```

Full handoff checks:

```bash
pnpm lint
pnpm test
pnpm build
pnpm check:bundle
```
