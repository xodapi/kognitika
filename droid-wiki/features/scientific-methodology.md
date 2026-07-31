# Scientific methodology

Every trainer module in Kognitika targets a specific cognitive function. The table below describes what each test trains, the scientific principle behind it, the metrics it produces, and which test file validates the engine logic.

## Cognitive functions glossary

| Function | Definition |
|---|---|
| Attention | Sustained focus and distribution of visual or semantic control. Trained by Schulte tables, Stroop test, Alphabet table. |
| Working memory | Short-term retention and updating of information during a task. Trained by N-Back, Mental math, Topology memory. |
| Inhibitory control | Ability to suppress an automatic response and choose a more accurate action. Trained by Stroop test (color-word conflict). |
| Cognitive flexibility | Rapid switching between rules, contexts, and solution strategies. Trained by Stroop-Alphabet, Gorbov rules. |
| Metacognition | Noticing one's own thinking errors and adjusting strategy. Trained by Reframing, Hype filter, Reality check. |
| Stress regulation | Reducing physiological and information load without losing clarity. Trained by NeuroSilence, Noise reduction, Deep focus. |
| Critical thinking | Verifying claims, sources, causal links, and hidden assumptions before concluding. Trained by Scanner, Decryptor, Filter. |
| Logic | Working with rules, quantitative relations, inferences, and stable solution methods. Trained by Numerical analysis, Logical matrix, Situational judgment. |
| Sensorimotor coordination | Coordinating visual signal recognition with fast controlled motor response selection. Trained by Alphabet table, Stroop-Alphabet. |
| Spatial thinking | Holding shape, position, route, and object relationships in a mental map. Trained by Spatial concealment, Topology memory. |

## Trainer modules

| Module | What it trains | Scientific basis | Key metrics | Engine test |
|---|---|---|---|---|
| Schulte tables | Concentration, visual search, peripheral vision | Visual scanning and distributed attention: the user learns to see more elements without unnecessary eye movements. | Total time, click stability, error count | `src/tests/schulte-core.test.ts` |
| Stroop test | Selective attention, inhibitory control | Classic executive control test: the brain must resolve conflict between automatic reading and controlled color recognition. | Accuracy, reaction time, conflict cost (difference between congruent and incongruent trials) | `src/tests/stroop-core.test.ts` |
| N-Back | Working memory, updating, distractor resistance | Continuous performance paradigm: the subject must hold and update a sequence in working memory, matching the current stimulus to the one N steps back. | Hit rate, false alarm rate, d-prime (sensitivity index) | `src/tests/nback-core.test.ts` |
| Mental math | Mental arithmetic speed, working memory, attention | Loads working memory and executive control: the brain must hold operands, execute operations, and record results repeatedly under time pressure. | Accuracy, time per problem, error distribution by operation type | `src/tests/mental-math-engine.test.ts` |
| Alphabet table | Sustained attention, letter recognition speed, sensorimotor switching | Combines visual recognition, response selection, and motor program switching — engages selective attention and sensorimotor coordination. | Total time, accuracy, average reaction time, error count | `src/tests/alphabet-table-engine.test.ts` |
| Stroop-Alphabet | Inhibitory control, cognitive flexibility, sensorimotor coordination | Two-step paradigm: first resolve color-word conflict (Stroop), then execute a motor rule (P/L/O) — adds controlled motor switching on top of automatic response inhibition. | Color errors, command errors, total accuracy, time, two-step average reaction | `src/tests/stroop-alphabet-engine.test.ts` |
| Schulte 90 (Gorbov) | Extended concentration, peripheral vision, visual search on 9x10 grid | Expanded Schulte protocol: 90 cells require wider visual field retention and sustained attention under color-switching rules. | Total time, accuracy, error count, rule comparison | `src/tests/schulte90-core.test.ts` |
| Spatial concealment | Spatial working memory, mental rotation, position tracking | The user must remember the locations of concealed objects and detect changes — engages spatial sketchpad in Baddeley's working memory model. | Accuracy, reaction time, location error distance | `src/tests/spatial-core.test.ts` |
| Topology memory | Graph memory, relational encoding | The user memorizes a graph structure (nodes and edges) and reproduces it — tests relational memory binding, distinct from item memory. | Node accuracy, edge accuracy, completion time | `src/tests/topology-core.test.ts` |
| Collision detector | Semantic filtering, conflict detection | The user identifies semantic conflicts in statements — trains the ability to detect logical inconsistencies and competing claims. | Accuracy, reaction time, false alarm rate | `src/tests/collision-core.test.ts` |
| Async dispatcher | Task orchestration, interruption management | The user manages multiple concurrent task streams, prioritizing and resuming after interruptions — models executive function in multitasking environments. | Throughput, accuracy under interruption, recovery time | `src/tests/dispatcher-core.test.ts` |
| Numerical analysis | Numerical reasoning, data interpretation, working memory | The user extracts quantitative information from charts/tables and performs calculations — trains numerical literacy and data-to-decision pipelines. | Accuracy, time per question, error type distribution | `src/tests/numerical-core.test.ts` |
| Logical matrix | Rule deduction, pattern completion | Matrix reasoning task (similar to Raven's Progressive Matrices): the user identifies the rule that governs a 3x3 grid and selects the missing element. | Accuracy, time per matrix, difficulty progression | `src/tests/logical-core.test.ts` |
| Situational judgment | Social cognition, context analysis | The user evaluates interpersonal scenarios and selects the most appropriate response — tests social reasoning and perspective-taking. | Response appropriateness score, reaction time | `src/tests/situational-core.test.ts` |
| Speed typing | Motor speed, visual-motor integration | Rapid transcription task: the user reproduces displayed text as quickly and accurately as possible — measures motor speed and visual-motor integration under time pressure. | Characters per minute, error rate, backspace count | `src/tests/typing-core.test.ts` |
| Language scanner | Pattern recognition, manipulation detection | The user identifies linguistic manipulation patterns in text — trains critical reading and rhetorical device recognition. | Accuracy, hit rate, false positive rate | `src/tests/language-scanner-core.test.ts` |
| Decryptor | Fact-emotion separation, source evaluation | The user distinguishes factual statements from emotionally charged claims — trains critical analysis and source verification. | Accuracy, reaction time, bias pattern | `src/tests/decryptor-core.test.ts` |
| Reality check | AI hallucination detection, verification skill | The user identifies fabricated data in AI-generated content — trains epistemic vigilance and cross-verification habits. | Detection rate, false alarm rate, confidence calibration | `src/tests/reality-check-core.test.ts` |
| Noise reduction | Cognitive noise filtering, signal detection | The user extracts target information from progressively noisy visual displays — trains selective attention and signal-noise discrimination. | Accuracy by noise level, reaction time, sensitivity (d-prime) | `src/tests/noise-reduction.test.ts` |
| NeuroSilence | Mental quieting, intrusion suppression | The user practices suppressing internal mental intrusions and maintaining focus — trains metacognitive control over inner speech and distracting thoughts. | Intrusion frequency, recovery time, subjective focus rating | Engine logic in `src/hooks/useNeuroSilenceEngine.ts` |
| Cognitive Trash Filter | Information quality assessment | The user evaluates information sources for credibility, bias, and relevance — trains information literacy and epistemic vigilance. | Classification accuracy, reaction time, calibration | Engine logic in `src/hooks/useCognitiveTrashFilterEngine.ts` |
| Hype filter | Signal-noise discrimination in persuasive text | The user identifies exaggerated or misleading claims in promotional content — trains resistance to persuasive manipulation. | Detection accuracy, false alarm rate | `src/tests/praise-engine.test.ts` |
| Reframing | Cognitive reappraisal, perspective shifting | The user finds constructive reinterpretations of negative events without denying the problem — trains cognitive flexibility and reappraisal skill. | Reappraisal quality score, realism assessment | Engine logic in `src/hooks/useReframingEngine.ts` |
| Rejection immunity | Social rejection resilience, recovery | The user practices responding to social rejection with constructive next steps instead of avoidance — trains emotion regulation and adaptive coping. | Response quality, recovery speed | Engine logic in `src/hooks/useRejectionImmunityEngine.ts` |
| Storytelling | Narrative structure, causal coherence | The user organizes information into a clear narrative with cause-effect relationships — trains structured thinking and explanatory communication. | Story coherence score, causal link density | Engine logic in `src/hooks/useStorytellingEngine.ts` |
| Deep focus | Sustained attention, distraction management | The user maintains focus on a single object while noticing distractions and calmly returning — trains sustained attention and metacognitive distraction awareness. | Focus stability, distraction recovery time | Engine logic in `src/hooks/useDeepFocusEngine.ts` |
| Luscher color test | Emotional state assessment, color psychology | Based on Max Luscher's color psychology: sequential color preference reveals current emotional state, stress level, and compensatory behaviors. | Color preference order, stress coefficient, autonomy score | `src/tests/luscher-core.test.ts` |
| Express knowledge hub | Combined mental arithmetic + Schulte 90 | Cross-mode progress comparison: trains switching between arithmetic and visual search tasks within one practice session. | Best time, score, accuracy, session count per mode | `src/tests/mental-math-engine.test.ts` + `src/tests/schulte90-core.test.ts` |

## Data export and analysis

All session data can be exported in privacy-safe JSON format via `api/analytics/export` (see [Data export](data-export.md)). The export includes per-module metrics, trends, and normative comparisons — structured for direct ingestion by LLMs or statistical tools for personal cognitive analysis.
