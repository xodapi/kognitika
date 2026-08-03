# Cognitive safety educational contract

This is the typed foundation for issue #51. It extends the existing safety-oriented trainers without adding a new identity, telemetry, persistence, clinical, or emergency-response architecture.

## Scope

A versioned `SafetyScenario` contains a bounded manipulation/information pattern, neutral educational copy, and two to four response options. Each response is scored separately for:

1. recognizing the pattern; and
2. choosing a healthy, bounded response.

The resulting `cognitiveImmunityScore` is an educational session metric from 0 to 100. A `strong_response` requires both full pattern recognition and a healthy response, even when a partial combination reaches a high numerical score. It is not an assessment of a person or a real relationship, and it does not establish whether a situation is safe.

## Supported initial patterns

- false dichotomy;
- emotional pressure;
- authority pressure;
- propaganda framing;
- misinformation;
- cognitive shortcut.

All public fixtures are synthetic. Scenario and result contracts are strict and include no user ID, Brain ID, email, token, raw answers, free text, telemetry, metadata, or personal case material.

## Safety and product boundary

The copy must stay neutral, non-diagnostic, and non-alarmist. The contract makes no medical, mental-health, legal, emergency, or relationship-safety claim. It does not automatically alter a user's daily plan, difficulty, account status, or recommendations.

A later UI integration can present these scenarios through the existing situational/safety trainer surfaces. Any persistence or trend aggregation requires a separate privacy-reviewed product decision and must remain based on minimized aggregate results.

## Verification

`src/tests/cognitive-safety-contract.test.ts` checks strict scenario parsing, privacy-safe synthetic fixtures, recognition-plus-response scoring, and malformed/unknown response rejection.
