use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeSet;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnalyzeSessionCategory {
    Cognitive,
    Somatic,
    Safety,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnalyzeSessionEventKind {
    Click,
    Answer,
    Mistake,
    Checkpoint,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationSignal {
    WeakArea,
    StreakMaintenance,
    Variety,
    Recovery,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AnalyzeSessionEvent {
    pub t_ms: u32,
    pub kind: AnalyzeSessionEventKind,
    pub reaction_time_ms: Option<u32>,
    pub is_correct: Option<bool>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub checkpoint: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AnalyzeSessionInput {
    pub schema_version: u8,
    pub session_id: String,
    pub module_id: String,
    pub category: AnalyzeSessionCategory,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub events: Vec<AnalyzeSessionEvent>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AnalyzeSessionOutput {
    pub schema_version: u8,
    pub duration_ms: u32,
    pub click_count: u32,
    pub p50_reaction_ms: u32,
    pub p95_reaction_ms: u32,
    pub speed_slope: f64,
    pub accuracy: f64,
    pub fatigue_index: f64,
    pub engagement_index: f64,
    pub suspicious_pattern_score: f64,
    pub recommendation_signals: Vec<RecommendationSignal>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnalyzeSessionError {
    SensitiveField,
    InvalidSchema(String),
}

const SENSITIVE_KEYS: [&str; 14] = [
    "authorization",
    "auth",
    "bearer",
    "brainid",
    "cookie",
    "email",
    "jwt",
    "localstorage",
    "password",
    "rawstorage",
    "refresh",
    "screenshot",
    "secret",
    "token",
];

pub fn parse_analyze_session_input(
    value: Value,
) -> Result<AnalyzeSessionInput, AnalyzeSessionError> {
    if has_sensitive_key(&value) {
        return Err(AnalyzeSessionError::SensitiveField);
    }

    let input = serde_json::from_value::<AnalyzeSessionInput>(value)
        .map_err(|error| AnalyzeSessionError::InvalidSchema(error.to_string()))?;

    validate_input(&input)?;
    Ok(input)
}

pub fn analyze_session(input: &AnalyzeSessionInput) -> AnalyzeSessionOutput {
    let reaction_times: Vec<u32> = input
        .events
        .iter()
        .filter_map(|event| event.reaction_time_ms)
        .collect();
    let correctness: Vec<bool> = input
        .events
        .iter()
        .filter_map(|event| event.is_correct)
        .collect();
    let correct_count = correctness.iter().filter(|is_correct| **is_correct).count();
    let accuracy = if correctness.is_empty() {
        0.0
    } else {
        correct_count as f64 / correctness.len() as f64
    };
    let duration_ms = calculate_duration_ms(input);
    let click_count = input
        .events
        .iter()
        .filter(|event| event.kind == AnalyzeSessionEventKind::Click)
        .count() as u32;
    let fatigue_index = calculate_fatigue_index(&input.events);
    let engagement_index = calculate_engagement_index(input, duration_ms, click_count);

    AnalyzeSessionOutput {
        schema_version: 1,
        duration_ms,
        click_count,
        p50_reaction_ms: percentile_nearest_rank(&reaction_times, 50.0),
        p95_reaction_ms: percentile_nearest_rank(&reaction_times, 95.0),
        speed_slope: calculate_speed_slope(&input.events),
        accuracy: round(accuracy, 3),
        fatigue_index,
        engagement_index,
        suspicious_pattern_score: calculate_suspicious_pattern_score(&reaction_times, accuracy),
        recommendation_signals: infer_recommendation_signals(
            round(accuracy, 3),
            fatigue_index,
            engagement_index,
        ),
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(js_name = analyzeSessionJson)]
pub fn analyze_session_json(input_json: &str) -> Result<String, JsValue> {
    let value = serde_json::from_str::<Value>(input_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid JSON: {error}")))?;
    let input = parse_analyze_session_input(value)
        .map_err(|error| JsValue::from_str(&format!("Invalid AnalyzeSession input: {error:?}")))?;
    let output = analyze_session(&input);

    serde_json::to_string(&output)
        .map_err(|error| JsValue::from_str(&format!("Failed to serialize output: {error}")))
}

fn validate_input(input: &AnalyzeSessionInput) -> Result<(), AnalyzeSessionError> {
    if input.schema_version != 1 {
        return Err(AnalyzeSessionError::InvalidSchema(
            "schemaVersion must be 1".to_string(),
        ));
    }

    if input.session_id.is_empty() || input.module_id.is_empty() {
        return Err(AnalyzeSessionError::InvalidSchema(
            "sessionId and moduleId are required".to_string(),
        ));
    }

    if input.events.len() > 10_000 {
        return Err(AnalyzeSessionError::InvalidSchema(
            "events must contain at most 10000 items".to_string(),
        ));
    }

    Ok(())
}

fn has_sensitive_key(value: &Value) -> bool {
    match value {
        Value::Array(items) => items.iter().any(has_sensitive_key),
        Value::Object(map) => map.iter().any(|(key, item)| {
            let normalized = key.to_ascii_lowercase();
            SENSITIVE_KEYS
                .iter()
                .any(|sensitive| normalized.contains(sensitive))
                || normalized == "user"
                || has_sensitive_key(item)
        }),
        _ => false,
    }
}

fn calculate_duration_ms(input: &AnalyzeSessionInput) -> u32 {
    if let Some(completed_at) = &input.completed_at {
        if let (Ok(started), Ok(completed)) = (
            DateTime::parse_from_rfc3339(&input.started_at),
            DateTime::parse_from_rfc3339(completed_at),
        ) {
            let started = started.with_timezone(&Utc);
            let completed = completed.with_timezone(&Utc);

            if completed >= started {
                return (completed - started).num_milliseconds().max(0) as u32;
            }
        }
    }

    input
        .events
        .iter()
        .map(|event| event.t_ms)
        .max()
        .unwrap_or(0)
}

fn percentile_nearest_rank(values: &[u32], percentile: f64) -> u32 {
    if values.is_empty() {
        return 0;
    }

    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    let raw_index = ((percentile / 100.0) * sorted.len() as f64).ceil() as isize - 1;
    let index = raw_index.clamp(0, sorted.len() as isize - 1) as usize;
    sorted[index]
}

fn median(values: &[u32]) -> u32 {
    percentile_nearest_rank(values, 50.0)
}

fn calculate_speed_slope(events: &[AnalyzeSessionEvent]) -> f64 {
    let samples: Vec<(f64, f64)> = events
        .iter()
        .filter_map(|event| {
            event
                .reaction_time_ms
                .map(|reaction| (event.t_ms as f64 / 1000.0, reaction as f64))
        })
        .collect();

    if samples.len() < 2 {
        return 0.0;
    }

    let x_mean = samples.iter().map(|(x, _)| x).sum::<f64>() / samples.len() as f64;
    let y_mean = samples.iter().map(|(_, y)| y).sum::<f64>() / samples.len() as f64;
    let denominator = samples
        .iter()
        .map(|(x, _)| (x - x_mean).powi(2))
        .sum::<f64>();

    if denominator == 0.0 {
        return 0.0;
    }

    let numerator = samples
        .iter()
        .map(|(x, y)| (x - x_mean) * (y - y_mean))
        .sum::<f64>();

    round(numerator / denominator, 4)
}

fn calculate_fatigue_index(events: &[AnalyzeSessionEvent]) -> f64 {
    let samples: Vec<u32> = events
        .iter()
        .filter_map(|event| event.reaction_time_ms)
        .collect();

    if samples.len() < 4 {
        return 0.0;
    }

    let split = samples.len().div_ceil(2);
    let early_median = median(&samples[..split]);
    let late_median = median(&samples[split..]);

    if early_median == 0 {
        return 0.0;
    }

    round(
        ((late_median as f64 - early_median as f64) / early_median as f64).clamp(-1.0, 1.0),
        3,
    )
}

fn calculate_engagement_index(
    input: &AnalyzeSessionInput,
    duration_ms: u32,
    click_count: u32,
) -> f64 {
    let checkpoint_count = input
        .events
        .iter()
        .filter(|event| event.kind == AnalyzeSessionEventKind::Checkpoint)
        .count() as f64;
    let completed_bonus = if input.completed_at.is_some() {
        0.4
    } else {
        0.0
    };
    let interaction_score = (click_count as f64 / 8.0).min(1.0) * 0.3;
    let checkpoint_score = (checkpoint_count / 2.0).min(1.0) * 0.2;
    let duration_score = (duration_ms as f64 / 30_000.0).min(1.0) * 0.1;

    round(
        (completed_bonus + interaction_score + checkpoint_score + duration_score).clamp(0.0, 1.0),
        3,
    )
}

fn standard_deviation(values: &[u32]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }

    let mean = values.iter().map(|value| *value as f64).sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|value| (*value as f64 - mean).powi(2))
        .sum::<f64>()
        / values.len() as f64;

    variance.sqrt()
}

fn calculate_suspicious_pattern_score(reaction_times: &[u32], accuracy: f64) -> f64 {
    if reaction_times.is_empty() {
        return 0.0;
    }

    let impossibly_fast_ratio = reaction_times.iter().filter(|value| **value < 80).count() as f64
        / reaction_times.len() as f64;
    let uniform_pattern_score =
        if reaction_times.len() >= 4 && standard_deviation(reaction_times) < 4.0 {
            0.25
        } else {
            0.0
        };
    let perfect_fast_score =
        if accuracy >= 0.95 && percentile_nearest_rank(reaction_times, 50.0) < 120 {
            0.15
        } else {
            0.0
        };

    round(
        ((impossibly_fast_ratio * 0.6) + uniform_pattern_score + perfect_fast_score)
            .clamp(0.0, 1.0),
        3,
    )
}

fn infer_recommendation_signals(
    accuracy: f64,
    fatigue_index: f64,
    engagement_index: f64,
) -> Vec<RecommendationSignal> {
    let mut signals = BTreeSet::new();

    if accuracy < 0.75 {
        signals.insert(RecommendationSignal::WeakArea);
    }
    if fatigue_index >= 0.2 || engagement_index < 0.35 {
        signals.insert(RecommendationSignal::Recovery);
    }
    if accuracy >= 0.9 && fatigue_index <= 0.1 {
        signals.insert(RecommendationSignal::StreakMaintenance);
    }
    if signals.is_empty() {
        signals.insert(RecommendationSignal::Variety);
    }

    let preferred_order = [
        RecommendationSignal::WeakArea,
        RecommendationSignal::Recovery,
        RecommendationSignal::StreakMaintenance,
        RecommendationSignal::Variety,
    ];

    preferred_order
        .into_iter()
        .filter(|signal| signals.contains(signal))
        .collect()
}

fn round(value: f64, digits: i32) -> f64 {
    let multiplier = 10_f64.powi(digits);
    (value * multiplier).round() / multiplier
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn synthetic_cell_click_session() -> AnalyzeSessionInput {
        serde_json::from_value(json!({
            "schemaVersion": 1,
            "sessionId": "synthetic-schulte-session",
            "moduleId": "schulte",
            "category": "cognitive",
            "startedAt": "2026-01-01T00:00:00.000Z",
            "completedAt": "2026-01-01T00:00:06.000Z",
            "events": [
                { "tMs": 0, "kind": "checkpoint", "checkpoint": "route_loaded" },
                { "tMs": 1000, "kind": "click", "reactionTimeMs": 100, "isCorrect": true, "x": 0.1, "y": 0.1 },
                { "tMs": 2000, "kind": "click", "reactionTimeMs": 120, "isCorrect": true, "x": 0.2, "y": 0.2 },
                { "tMs": 3000, "kind": "click", "reactionTimeMs": 140, "isCorrect": true, "x": 0.3, "y": 0.3 },
                { "tMs": 4000, "kind": "click", "reactionTimeMs": 160, "isCorrect": true, "x": 0.4, "y": 0.4 },
                { "tMs": 5000, "kind": "click", "reactionTimeMs": 180, "isCorrect": false, "x": 0.5, "y": 0.5 },
                { "tMs": 6000, "kind": "click", "reactionTimeMs": 220, "isCorrect": true, "x": 0.6, "y": 0.6 }
            ]
        }))
        .expect("synthetic fixture is valid")
    }

    fn synthetic_practice_flow_session() -> AnalyzeSessionInput {
        serde_json::from_value(json!({
            "schemaVersion": 1,
            "sessionId": "synthetic-flow-session",
            "moduleId": "stroop",
            "category": "cognitive",
            "startedAt": "2026-01-01T00:00:00.000Z",
            "completedAt": "2026-01-01T00:00:24.000Z",
            "events": [
                { "tMs": 0, "kind": "checkpoint", "checkpoint": "route_loaded" },
                { "tMs": 8000, "kind": "checkpoint", "checkpoint": "engaged_8s" },
                { "tMs": 9000, "kind": "answer", "reactionTimeMs": 720, "isCorrect": true },
                { "tMs": 12000, "kind": "answer", "reactionTimeMs": 680, "isCorrect": true },
                { "tMs": 15000, "kind": "answer", "reactionTimeMs": 650, "isCorrect": true },
                { "tMs": 18000, "kind": "answer", "reactionTimeMs": 640, "isCorrect": true },
                { "tMs": 21000, "kind": "answer", "reactionTimeMs": 610, "isCorrect": true },
                { "tMs": 24000, "kind": "checkpoint", "checkpoint": "completed" }
            ]
        }))
        .expect("synthetic fixture is valid")
    }

    fn synthetic_suspicious_fast_session() -> AnalyzeSessionInput {
        serde_json::from_value(json!({
            "schemaVersion": 1,
            "sessionId": "synthetic-fast-session",
            "moduleId": "schulte",
            "category": "cognitive",
            "startedAt": "2026-01-01T00:00:00.000Z",
            "completedAt": "2026-01-01T00:00:02.000Z",
            "events": [
                { "tMs": 100, "kind": "click", "reactionTimeMs": 48, "isCorrect": true, "x": 0.1, "y": 0.1 },
                { "tMs": 300, "kind": "click", "reactionTimeMs": 49, "isCorrect": true, "x": 0.2, "y": 0.2 },
                { "tMs": 500, "kind": "click", "reactionTimeMs": 49, "isCorrect": true, "x": 0.3, "y": 0.3 },
                { "tMs": 700, "kind": "click", "reactionTimeMs": 50, "isCorrect": true, "x": 0.4, "y": 0.4 },
                { "tMs": 900, "kind": "click", "reactionTimeMs": 50, "isCorrect": true, "x": 0.5, "y": 0.5 },
                { "tMs": 1100, "kind": "click", "reactionTimeMs": 49, "isCorrect": true, "x": 0.6, "y": 0.6 }
            ]
        }))
        .expect("synthetic fixture is valid")
    }

    fn reaction_event(
        index: u32,
        t_ms: u32,
        kind: AnalyzeSessionEventKind,
        reaction_time_ms: u32,
        is_correct: bool,
    ) -> AnalyzeSessionEvent {
        let normalized = (index % 100) as f64 / 99.0;
        AnalyzeSessionEvent {
            t_ms,
            kind,
            reaction_time_ms: Some(reaction_time_ms),
            is_correct: Some(is_correct),
            x: Some((normalized * 1000.0).round() / 1000.0),
            y: Some(((1.0 - normalized) * 1000.0).round() / 1000.0),
            checkpoint: None,
        }
    }

    fn checkpoint(t_ms: u32, name: &str) -> AnalyzeSessionEvent {
        AnalyzeSessionEvent {
            t_ms,
            kind: AnalyzeSessionEventKind::Checkpoint,
            reaction_time_ms: None,
            is_correct: None,
            x: None,
            y: None,
            checkpoint: Some(name.to_string()),
        }
    }

    fn v2_session(
        session_id: &str,
        module_id: &str,
        completed_at: Option<&str>,
        events: Vec<AnalyzeSessionEvent>,
    ) -> AnalyzeSessionInput {
        AnalyzeSessionInput {
            schema_version: 1,
            session_id: session_id.to_string(),
            module_id: module_id.to_string(),
            category: AnalyzeSessionCategory::Cognitive,
            started_at: "2026-01-02T00:00:00.000Z".to_string(),
            completed_at: completed_at.map(str::to_string),
            events,
        }
    }

    fn v2_thousand_click_session() -> AnalyzeSessionInput {
        let mut events = vec![checkpoint(0, "route_loaded")];

        for index in 0..1_000 {
            let jitter = ((index * 17) % 36) as i32 - 18;
            let reaction = (210_i32 + jitter).clamp(120, 420) as u32;
            events.push(reaction_event(
                index,
                180 + (index * 180),
                AnalyzeSessionEventKind::Click,
                reaction,
                index % 37 != 0,
            ));
        }

        events.push(checkpoint(181_000, "completed"));
        v2_session(
            "synthetic-v2-thousand-clicks",
            "schulte",
            Some("2026-01-02T00:03:01.000Z"),
            events,
        )
    }

    fn v2_ten_thousand_mixed_session() -> AnalyzeSessionInput {
        let mut events = Vec::with_capacity(10_000);

        for index in 0..10_000 {
            let t_ms = index * 60;
            if index % 500 == 0 {
                events.push(checkpoint(t_ms, &format!("batch:{index}")));
                continue;
            }

            let drift = ((index % 97) as i32) - 48;
            let reaction = (260_i32 + drift).clamp(90, 720) as u32;
            let kind = if index % 3 == 0 {
                AnalyzeSessionEventKind::Answer
            } else {
                AnalyzeSessionEventKind::Click
            };
            events.push(reaction_event(index, t_ms, kind, reaction, index % 29 != 0));
        }

        v2_session(
            "synthetic-v2-ten-thousand-mixed",
            "dispatcher",
            Some("2026-01-02T00:09:59.940Z"),
            events,
        )
    }

    fn v2_fatigue_curve_session() -> AnalyzeSessionInput {
        let mut events = vec![checkpoint(0, "route_loaded"), checkpoint(120_000, "midpoint")];

        for index in 0..800 {
            let reaction = 180 + ((index * 230) / 799);
            events.push(reaction_event(
                index,
                400 + (index * 420),
                AnalyzeSessionEventKind::Click,
                reaction,
                index % 23 != 0,
            ));
        }

        v2_session(
            "synthetic-v2-fatigue-curve",
            "nback",
            Some("2026-01-02T00:05:36.000Z"),
            events,
        )
    }

    fn v2_suspicious_burst_session() -> AnalyzeSessionInput {
        let events = (0..300)
            .map(|index| {
                reaction_event(
                    index,
                    80 + (index * 90),
                    AnalyzeSessionEventKind::Click,
                    48 + (index % 3),
                    true,
                )
            })
            .collect();

        v2_session(
            "synthetic-v2-suspicious-burst",
            "schulte",
            Some("2026-01-02T00:00:27.000Z"),
            events,
        )
    }

    fn v2_abandoned_session() -> AnalyzeSessionInput {
        v2_session(
            "synthetic-v2-abandoned-checkpoints",
            "numerical",
            None,
            vec![
                checkpoint(0, "route_loaded"),
                checkpoint(2_000, "instructions_viewed"),
                reaction_event(0, 3_000, AnalyzeSessionEventKind::Click, 920, false),
                reaction_event(1, 4_500, AnalyzeSessionEventKind::Click, 1_100, false),
                checkpoint(5_000, "abandoned:route_change"),
            ],
        )
    }

    #[test]
    fn matches_cell_click_golden_output() {
        let result = analyze_session(&synthetic_cell_click_session());

        assert_eq!(result.schema_version, 1);
        assert_eq!(result.duration_ms, 6_000);
        assert_eq!(result.click_count, 6);
        assert_eq!(result.p50_reaction_ms, 140);
        assert_eq!(result.p95_reaction_ms, 220);
        assert_eq!(result.speed_slope, 22.8571);
        assert_eq!(result.accuracy, 0.833);
        assert_eq!(result.fatigue_index, 0.5);
        assert_eq!(result.engagement_index, 0.745);
        assert_eq!(result.suspicious_pattern_score, 0.0);
        assert_eq!(
            result.recommendation_signals,
            vec![RecommendationSignal::Recovery]
        );
    }

    #[test]
    fn matches_practice_flow_golden_output() {
        let result = analyze_session(&synthetic_practice_flow_session());

        assert_eq!(result.duration_ms, 24_000);
        assert_eq!(result.click_count, 0);
        assert_eq!(result.p50_reaction_ms, 650);
        assert_eq!(result.p95_reaction_ms, 720);
        assert_eq!(result.speed_slope, -8.6667);
        assert_eq!(result.accuracy, 1.0);
        assert_eq!(result.fatigue_index, -0.103);
        assert_eq!(result.engagement_index, 0.68);
        assert_eq!(
            result.recommendation_signals,
            vec![RecommendationSignal::StreakMaintenance]
        );
    }

    #[test]
    fn flags_suspicious_fast_uniform_session() {
        let result = analyze_session(&synthetic_suspicious_fast_session());

        assert_eq!(result.suspicious_pattern_score, 1.0);
        assert_eq!(result.p50_reaction_ms, 49);
        assert_eq!(result.p95_reaction_ms, 50);
        assert_eq!(
            result.recommendation_signals,
            vec![RecommendationSignal::StreakMaintenance]
        );
    }

    #[test]
    fn rejects_identity_material_before_deserialization() {
        let payloads = [
            json!({ "brainId": "synthetic-brain-id" }),
            json!({
                "schemaVersion": 1,
                "sessionId": "synthetic",
                "moduleId": "schulte",
                "category": "cognitive",
                "startedAt": "2026-01-01T00:00:00.000Z",
                "events": [{ "tMs": 1, "kind": "checkpoint", "checkpoint": "completed", "token": "synthetic-token" }]
            }),
            json!({ "metadata": { "localStorage": "{}" } }),
        ];

        for payload in payloads {
            assert_eq!(
                parse_analyze_session_input(payload),
                Err(AnalyzeSessionError::SensitiveField)
            );
        }
    }

    #[test]
    fn handles_golden_v2_thousand_clicks() {
        let result = analyze_session(&v2_thousand_click_session());

        assert_eq!(result.click_count, 1_000);
        assert_eq!(result.suspicious_pattern_score, 0.0);
        assert!(result.p50_reaction_ms >= 190);
        assert!(result.p95_reaction_ms <= 230);
    }

    #[test]
    fn handles_golden_v2_ten_thousand_mixed_boundary() {
        let session = v2_ten_thousand_mixed_session();
        let result = analyze_session(&session);

        assert_eq!(session.events.len(), 10_000);
        assert_eq!(result.duration_ms, 599_940);
        assert!(result.click_count > 6_000);
        assert!(result.accuracy > 0.9);
    }

    #[test]
    fn handles_golden_v2_fatigue_suspicious_and_abandoned_cases() {
        let fatigue = analyze_session(&v2_fatigue_curve_session());
        assert!(fatigue.fatigue_index > 0.45);
        assert!(fatigue
            .recommendation_signals
            .contains(&RecommendationSignal::Recovery));

        let suspicious = analyze_session(&v2_suspicious_burst_session());
        assert_eq!(suspicious.suspicious_pattern_score, 1.0);

        let abandoned = analyze_session(&v2_abandoned_session());
        assert!(abandoned.engagement_index < 0.35);
        assert!(abandoned
            .recommendation_signals
            .contains(&RecommendationSignal::WeakArea));
    }
}
