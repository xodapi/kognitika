# Data export

Users can download their cognitive training data in a privacy-safe, LLM-friendly JSON format. This lets them feed their results into any large language model for personal analysis, trend spotting, and training optimization.

## How it works

1. The user navigates to the Cognitive Profile page (`CognitiveProfile.tsx`) and clicks the "Export" button (labeled "Экспорт" in the UI).
2. The button sends a GET request to `/api/analytics/export` with a Bearer JWT token in the `Authorization` header.
3. The server endpoint at `src/server/routes/analytics.ts` (line 288) queries the user's completed `GameSession` records, ordered by most recent first.
4. The function `createPrivacySafeAnalyticsExport()` at `src/server/routes/analytics.ts` processes the sessions into an aggregated, anonymized format.
5. The server returns a JSON file that the browser downloads as `kognitika_export_YYYY-MM-DD.json`.

## Privacy contract

The export endpoint is verified by `src/tests/analytics-export-privacy.test.ts`. The test confirms:

- No raw Brain ID values appear in the response (not even nested in metadata).
- No email addresses, tokens, or password hashes are included.
- No raw session database IDs (UUIDs) are exposed.
- No exact activity timestamps are included.
- The `privacy` object in the response confirms:
  - `personal_identifiers_included: false`
  - `raw_session_data_included: false`
  - `exact_activity_timestamps_included: false`
  - `safe_for_external_llm: true`

The server privacy guard middleware at `src/server/middleware/privacy.ts` runs on all API responses as an additional safety layer.

## Export format

The JSON response has this structure:

```json
{
  "format": "Kognitika Privacy-Safe Cognitive Analytics",
  "version": "2.0",
  "privacy": {
    "personal_identifiers_included": false,
    "raw_session_data_included": false,
    "exact_activity_timestamps_included": false,
    "safe_for_external_llm": true
  },
  "dataset": {
    "completed_sessions_analyzed": 150,
    "modules_with_data": 12,
    "history_truncated": false,
    "maximum_sessions_analyzed": 1000
  },
  "modules": [
    {
      "module_id": "schulte",
      "trainer": "Schulte tables",
      "trains": "Visual search, peripheral vision, attention span",
      "completed_sessions": 45,
      "score": {
        "average": 85,
        "best": 98,
        "change_percent_early_vs_recent": 12
      },
      "duration_ms": {
        "average": 18000,
        "best": 12000
      }
    }
  ],
  "instructions_for_llm": [
    "Analyze only training dynamics and do not infer identity, diagnosis, IQ, or medical condition.",
    "Compare modules with at least two completed sessions and treat small samples as uncertain.",
    "Look for stable strengths and growth areas using score and duration trends supported by the aggregates.",
    "Return a calm seven-day practice plan with rest periods and explain the evidence for each suggestion."
  ],
  "limitations": [
    "Training results depend on sleep, stress, device, environment, and familiarity with the task.",
    "This dataset supports wellness reflection and is not medical or psychological diagnosis."
  ]
}
```

Each module object contains its identifier, display name, what it trains, aggregated scores (average, best, trend), and aggregated durations (average, best). Raw session data is never included.

## LLM-friendly design

The export format is designed to be passed directly to any LLM. The `instructions_for_llm` array tells the model what to do with the data and what to avoid. The `limitations` array helps the model stay within appropriate boundaries. Users can copy the JSON from the downloaded file and paste it into a chat with an LLM of their choice.

## Maximum export size

The constant `MAX_EXPORT_SESSIONS` at `src/server/routes/analytics.ts` (line 7) is set to **1000**. If the user has more than 1000 completed sessions, only the 1000 most recent are included and `dataset.history_truncated` is set to `true`.

## Onboarding explanation

New users are informed about the data export capability through the OnboardingModal. The modal explains that all their training data belongs to them and can be exported at any time for personal analysis using any LLM.

## API reference

```
GET /api/analytics/export
Authorization: Bearer <jwt-token>
```

Returns: `application/json` download with `Content-Disposition: attachment; filename=kognitika_export_YYYY-MM-DD.json`
