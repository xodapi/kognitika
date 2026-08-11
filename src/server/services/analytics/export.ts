import prisma from '../../../lib/prisma.ts';
import {
  KNOWLEDGE_ARTICLE_BY_ID,
  TRAINING_KNOWLEDGE_ROUTE_IDS,
} from '../../../lib/knowledge-base.ts';
import { resolvePracticeModuleId } from '../../../lib/practice-recommendations.ts';

const MAX_EXPORT_SESSIONS = 1000;

type GameSession = {
  gameType: string;
  score: number;
  timeMs: number;
  createdAt: Date;
};

type ExportFormat = {
  format: string;
  version: string;
  privacy: {
    personal_identifiers_included: boolean;
    raw_session_data_included: boolean;
    exact_activity_timestamps_included: boolean;
    safe_for_external_llm: boolean;
  };
  dataset: {
    completed_sessions_analyzed: number;
    modules_with_data: number;
    history_truncated: boolean;
    maximum_sessions_analyzed: number;
  };
  modules: Array<{
    module_id: string;
    trainer: string;
    trains: string;
    metrics_interpretation: string;
    completed_sessions: number;
    score: {
      average: number | null;
      best: number | null;
      change_percent_early_vs_recent: number | null;
    };
    duration_ms: {
      average: number | null;
      best: number | null;
    };
  }>;
  instructions_for_llm: string[];
  limitations: string[];
};

export class ExportService {
  async exportUserData(userId: string): Promise<ExportFormat> {
    const allSessions = await prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      select: { gameType: true, score: true, timeMs: true, createdAt: true },
    });

    const historyTruncated = allSessions.length > MAX_EXPORT_SESSIONS;
    const sessions = historyTruncated ? allSessions.slice(0, MAX_EXPORT_SESSIONS) : allSessions;

    return this.createPrivacySafeExport(sessions, historyTruncated);
  }

  private createPrivacySafeExport(sessions: GameSession[], historyTruncated: boolean): ExportFormat {
    const grouped = new Map<string, GameSession[]>();
    let includedSessions = 0;

    for (const session of sessions) {
      const moduleId = resolvePracticeModuleId(String(session.gameType));
      if (!moduleId) continue;
      const current = grouped.get(moduleId) || [];
      current.push(session);
      grouped.set(moduleId, current);
      includedSessions += 1;
    }

    const modules = TRAINING_KNOWLEDGE_ROUTE_IDS.map((moduleId) => {
      const moduleSessions = (grouped.get(moduleId) || []).slice().reverse();
      const scores = moduleSessions.map((session) => session.score);
      const durations = moduleSessions.map((session) => session.timeMs).filter((value) => value > 0);
      const article = KNOWLEDGE_ARTICLE_BY_ID.get(moduleId);

      return {
        module_id: moduleId,
        trainer: article?.title || moduleId,
        trains: article?.trains || '',
        metrics_interpretation: article?.metrics || '',
        completed_sessions: moduleSessions.length,
        score: {
          average: this.roundedAverage(scores),
          best: scores.length > 0 ? Math.max(...scores) : null,
          change_percent_early_vs_recent: this.scoreTrendPercent(scores),
        },
        duration_ms: {
          average: this.roundedAverage(durations),
          best: durations.length > 0 ? Math.min(...durations) : null,
        },
      };
    });

    return {
      format: 'Kognitika Privacy-Safe Cognitive Analytics',
      version: '2.0',
      privacy: {
        personal_identifiers_included: false,
        raw_session_data_included: false,
        exact_activity_timestamps_included: false,
        safe_for_external_llm: true,
      },
      dataset: {
        completed_sessions_analyzed: includedSessions,
        modules_with_data: modules.filter((module) => module.completed_sessions > 0).length,
        history_truncated: historyTruncated,
        maximum_sessions_analyzed: MAX_EXPORT_SESSIONS,
      },
      modules,
      instructions_for_llm: [
        'Analyze only training dynamics and do not infer identity, diagnosis, IQ, or medical condition.',
        'Compare modules with at least two completed sessions and treat small samples as uncertain.',
        'Look for stable strengths and growth areas using score and duration trends supported by the aggregates.',
        'Return a calm seven-day practice plan with rest periods and explain the evidence for each suggestion.',
      ],
      limitations: [
        'Training results depend on sleep, stress, device, environment, and familiarity with the task.',
        'This dataset supports wellness reflection and is not medical or psychological diagnosis.',
      ],
    };
  }

  private roundedAverage(values: number[]): number | null {
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private scoreTrendPercent(scores: number[]): number | null {
    if (scores.length < 2) return null;

    const splitAt = Math.ceil(scores.length / 2);
    const earlier = this.roundedAverage(scores.slice(0, splitAt));
    const recent = this.roundedAverage(scores.slice(splitAt));
    if (earlier === null || recent === null || earlier === 0) return null;

    return Math.round(((recent - earlier) / Math.abs(earlier)) * 100);
  }
}
