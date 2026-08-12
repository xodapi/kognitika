import prisma from '../../lib/prisma.ts';
import { PrismaGameAttemptRepository } from './prisma/prisma-game-attempt-repository.ts';
import { PrismaGameSessionRepository } from './prisma/prisma-game-session-repository.ts';
import { PrismaUserRepository } from './prisma/prisma-user-repository.ts';
import { PrismaCompletedGameRepository } from './prisma/prisma-completed-game-repository.ts';
import { PrismaAnalyticsSessionRepository } from './prisma/prisma-analytics-session-repository.ts';
import { PrismaAnalyticsSummaryRepository } from './prisma/prisma-analytics-summary-repository.ts';
import { PrismaDailyTrajectoryRepository } from './prisma/prisma-daily-trajectory-repository.ts';
import { PrismaFeedbackRepository } from './prisma/prisma-feedback-repository.ts';
import { PrismaIdeaRepository } from './prisma/prisma-idea-repository.ts';
import type { GameAttemptRepository } from '../repositories/game-attempt-repository.ts';
import type { GameSessionRepository } from '../repositories/game-session-repository.ts';
import type { UserRepository } from '../repositories/user-repository.ts';
import type { AnalyticsSessionRepository } from '../repositories/analytics-session-repository.ts';
import type { AnalyticsSummaryRepository } from '../repositories/analytics-summary-repository.ts';
import type { DailyTrajectoryRepository } from '../repositories/daily-trajectory-repository.ts';
import type { FeedbackRepository } from '../repositories/feedback-repository.ts';
import type { IdeaRepository } from '../repositories/idea-repository.ts';
import type { CompletedGameRepository } from '../services/game-save/completed-game-repository.ts';
import { GameProgressService } from '../services/game-progress.ts';
import { GameCompletionService } from '../services/game-completion.ts';
import { GameSessionService } from '../services/game-session.ts';
import { LeaderboardService } from '../services/leaderboard.ts';
import { ComparisonService } from '../services/analytics/comparison.ts';
import { ProfileService } from '../services/analytics/profile.ts';
import { ExportService } from '../services/analytics/export.ts';
import { SummaryPersistenceService } from '../services/analytics/summary-persistence.ts';
import { SummaryQueryService } from '../services/analytics/summary-query.ts';
import { CognitiveTrendService } from '../services/analytics/cognitive-trend.ts';

export type GameRepositories = {
  gameAttempts: GameAttemptRepository;
  gameSessions: GameSessionRepository;
  users: UserRepository;
  completedGames: CompletedGameRepository;
};

export type GameServices = {
  progress: GameProgressService;
  completion: GameCompletionService;
  session: GameSessionService;
  leaderboard: LeaderboardService;
};

export type AnalyticsServices = {
  comparison: ComparisonService;
  profile: ProfileService;
  export: ExportService;
  summaryPersistence: SummaryPersistenceService;
  summaryQuery: SummaryQueryService;
  cognitiveTrend: CognitiveTrendService;
};

export type AnalyticsRepositories = {
  sessions: AnalyticsSessionRepository;
  summaries: AnalyticsSummaryRepository;
};

// Singleton-per-process: the Prisma client is already a singleton.
let _repos: GameRepositories | null = null;
let _services: GameServices | null = null;
let _analyticsServices: AnalyticsServices | null = null;
let _analyticsRepositories: AnalyticsRepositories | null = null;
let _dailyTrajectoryRepository: DailyTrajectoryRepository | null = null;
let _feedbackRepository: FeedbackRepository | null = null;
let _ideaRepository: IdeaRepository | null = null;

export function getGameRepositories(): GameRepositories {
  if (!_repos) {
    _repos = {
      gameAttempts: new PrismaGameAttemptRepository(prisma),
      gameSessions: new PrismaGameSessionRepository(prisma),
      users: new PrismaUserRepository(prisma),
      completedGames: new PrismaCompletedGameRepository(prisma),
    };
  }
  return _repos;
}

export function getGameServices(): GameServices {
  if (!_services) {
    const repos = getGameRepositories();
    _services = {
      progress: new GameProgressService(repos.gameSessions),
      completion: new GameCompletionService(),
      session: new GameSessionService(repos.gameSessions),
      leaderboard: new LeaderboardService(repos.users),
    };
  }
  return _services;
}

export function getAnalyticsServices(): AnalyticsServices {
  if (!_analyticsServices) {
    const repos = getAnalyticsRepositories();
    _analyticsServices = {
      comparison: new ComparisonService(repos.sessions),
      profile: new ProfileService(repos.sessions),
      export: new ExportService(repos.sessions),
      summaryPersistence: new SummaryPersistenceService(repos.summaries),
      summaryQuery: new SummaryQueryService(repos.summaries),
      cognitiveTrend: new CognitiveTrendService(repos.summaries),
    };
  }
  return _analyticsServices;
}

export function getAnalyticsRepositories(): AnalyticsRepositories {
  if (!_analyticsRepositories) {
    _analyticsRepositories = {
      sessions: new PrismaAnalyticsSessionRepository(prisma),
      summaries: new PrismaAnalyticsSummaryRepository(prisma),
    };
  }
  return _analyticsRepositories;
}

export function getDailyTrajectoryRepository(): DailyTrajectoryRepository {
  if (!_dailyTrajectoryRepository) {
    _dailyTrajectoryRepository = new PrismaDailyTrajectoryRepository(prisma);
  }
  return _dailyTrajectoryRepository;
}

export function getFeedbackRepository(): FeedbackRepository {
  if (!_feedbackRepository) {
    _feedbackRepository = new PrismaFeedbackRepository(prisma);
  }
  return _feedbackRepository;
}

export function getIdeaRepository(): IdeaRepository {
  if (!_ideaRepository) {
    _ideaRepository = new PrismaIdeaRepository(prisma);
  }
  return _ideaRepository;
}

/** Override the singleton – used in tests to inject in-memory repositories. */
export function setGameRepositories(repos: GameRepositories): void {
  _repos = repos;
  _services = null; // Reset services when repos change
}

/** Override analytics persistence dependencies for focused service tests. */
export function setAnalyticsRepositories(repos: AnalyticsRepositories): void {
  _analyticsRepositories = repos;
  _analyticsServices = null;
}

/** Override feedback persistence for focused route tests. */
export function setFeedbackRepository(repository: FeedbackRepository): void {
  _feedbackRepository = repository;
}

/** Override idea persistence for focused route tests. */
export function setIdeaRepository(repository: IdeaRepository): void {
  _ideaRepository = repository;
}

/** Reset to Prisma-backed defaults (used in test teardown). */
export function resetGameRepositories(): void {
  _repos = null;
  _services = null;
  _analyticsServices = null;
  _analyticsRepositories = null;
  _dailyTrajectoryRepository = null;
  _feedbackRepository = null;
  _ideaRepository = null;
}
