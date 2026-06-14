# Practice Completion Audit

Issue: #46

Every public trainer should finish with the same learning-loop contract:

1. what went well;
2. what to improve;
3. recommended next trainer with actions: `Начать рекомендованное`, `Повторить`, `В меню`.

The recommendation event is `PRACTICE_RECOMMENDED` and carries only synthetic/product metadata:

```ts
{
  category: 'cognitive' | 'somatic' | 'safety',
  moduleId: string,
  reason: 'weak_area' | 'streak_maintenance' | 'variety' | 'recovery',
  sourceSessionId: string
}
```

No email, token, raw Brain ID, localStorage dump, or private telemetry is included.

## Coverage

Implemented through `PostGameInsight`:

- Schulte
- Numerical Analysis
- Logical Matrix
- Stroop
- N-Back
- Objective Filter
- Mental Filter
- Hype Filter

Implemented through `CompletionRecommendation`:

- Speed Typing
- Spatial Concealment
- Situational Judgment
- Profiling RICE
- Topology Memory
- Collision Detector
- Async Dispatcher
- Noise Reduction
- Language Scanner
- Decryptor
- Reality Check
- Neuro Silence
- Dialogue / Social EQ
- Reframing
- Rejection Immunity
- Storytelling
- Deep Focus

## Regression Gates

- `src/tests/completion-recommendation-contract.test.ts`
- `src/tests/post-game-navigation.test.tsx`
- `tests/screenshot.spec.ts` covers Numerical Analysis and Speed Typing recommendation navigation.
