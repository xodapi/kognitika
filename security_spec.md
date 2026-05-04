# Security Specification - Feedback System

## Data Invariants
1. Feedback must have a valid `userId` matching the authenticated user.
2. `createdAt` must be the server time.
3. Users can only write their own feedback.
4. Only admins can read all feedback (or for now, since it's a simple app, we might allow users to see their own if needed, but the user requested "me as admin could look", so specifically admin access).

## The Dirty Dozen Payloads
1. **Identity Theft**: Write feedback with someone else's `userId`.
2. **Ghost Update**: Try to update a feedback entry (should be forbidden or very restricted).
3. **Shadow Field**: Add a `isFeatured: true` field.
4. **ID Poisoning**: Use a massive string as a document ID.
5. **PII Scraping**: List all feedback entries as an unauthenticated user.
6. **Self-Promotion**: Set `status` to 'resolved' on creation.
7. **Time Travel**: Provide a backdated `createdAt`.
8. **Resource Exhaustion**: Send a 1MB feedback text.
9. **Spam**: Write feedback without being signed in.
10. **Admin Escalation**: Try to read the `/feedback` collection as a normal user.
11. **Type Poisoning**: Send `type: 123` instead of an enum value.
12. **Null Bypass**: Send a payload missing the `content` field.

## The Test Runner (Mock Tests Logic)
- Verify `create` succeeds if `request.auth.uid == data.userId`.
- Verify `create` fails if `data.status` is set (it should default or be set by admin).
- Verify `read` fails for non-admins on the whole collection.
- Verify `update` is denied for normal users.
