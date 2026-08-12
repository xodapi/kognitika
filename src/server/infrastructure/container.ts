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
import { PrismaLeaderboardQueryRepository } from './prisma/prisma-leaderboard-query-repository.ts';
import { PrismaDashboardRepository } from './prisma/prisma-dashboard-repository.ts';
import { PrismaNeurotrainerHistoryRepository } from './prisma/prisma-neurotrainer-history-repository.ts';
import { PrismaChatRepository } from './prisma/prisma-chat-repository.ts';
import { PrismaAuthRepository } from './prisma/prisma-auth-repository.ts';
import { PrismaAnalyticsSessionOwnershipRepository } from './prisma/prisma-analytics-session-ownership-repository.ts';
import { PrismaAdminRepository } from './prisma/prisma-admin-repository.ts';
import { PrismaAdminAuthorizationRepository } from './prisma/prisma-admin-authorization-repository.ts';
import type { GameAttemptRepository } from '../repositories/game-attempt-repository.ts';
import type { GameSessionRepository } from '../repositories/game-session-repository.ts';
import type { UserRepository } from '../repositories/user-repository.ts';
import type { AnalyticsSessionRepository } from '../repositories/analytics-session-repository.ts';
import type { AnalyticsSummaryRepository } from '../repositories/analytics-summary-repository.ts';
import type { DailyTrajectoryRepository } from '../repositories/daily-trajectory-repository.ts';
import type { FeedbackRepository } from '../repositories/feedback-repository.ts';
import type { IdeaRepository } from '../repositories/idea-repository.ts';
import type { LeaderboardQueryRepository } from '../repositories/leaderboard-query-repository.ts';
import type { DashboardRepository } from '../repositories/dashboard-repository.ts';
import type { NeurotrainerHistoryRepository } from '../repositories/neurotrainer-history-repository.ts';
import type { ChatRepository } from '../repositories/chat-repository.ts';
import type { AuthRepository } from '../repositories/auth-repository.ts';
import type { AnalyticsSessionOwnershipRepository } from '../repositories/analytics-session-ownership-repository.ts';
import type { AdminRepository } from '../repositories/admin-repository.ts';
import type { AdminAuthorizationRepository } from '../repositories/admin-authorization-repository.ts';
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
let _leaderboardQueryRepository: LeaderboardQueryRepository | null = null;
let _dashboardRepository: DashboardRepository | null = null;
let _neurotrainerHistoryRepository: NeurotrainerHistoryRepository | null = null;
let _chatRepository: ChatRepository | null = null;
let _authRepository: AuthRepository | null = null;
let _analyticsSessionOwnershipRepository: AnalyticsSessionOwnershipRepository | null = null;
let _adminRepository: AdminRepository | null = null;
let _adminAuthorizationRepository: AdminAuthorizationRepository | null = null;

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

export function getLeaderboardQueryRepository(): LeaderboardQueryRepository {
  if (!_leaderboardQueryRepository) {
    _leaderboardQueryRepository = new PrismaLeaderboardQueryRepository(prisma);
  }
  return _leaderboardQueryRepository;
}

export function getDashboardRepository(): DashboardRepository {
  if (!_dashboardRepository) {
    _dashboardRepository = new PrismaDashboardRepository(prisma);
  }
  return _dashboardRepository;
}

export function getNeurotrainerHistoryRepository(): NeurotrainerHistoryRepository {
  if (!_neurotrainerHistoryRepository) {
    _neurotrainerHistoryRepository = new PrismaNeurotrainerHistoryRepository(prisma);
  }
  return _neurotrainerHistoryRepository;
}

export function getChatRepository(): ChatRepository {
  if (!_chatRepository) {
    _chatRepository = new PrismaChatRepository(prisma);
  }
  return _chatRepository;
}

export function getAuthRepository(): AuthRepository {
  if (!_authRepository) {
    _authRepository = new PrismaAuthRepository(prisma);
  }
  return _authRepository;
}

export function getAnalyticsSessionOwnershipRepository(): AnalyticsSessionOwnershipRepository {
  if (!_analyticsSessionOwnershipRepository) {
    _analyticsSessionOwnershipRepository = new PrismaAnalyticsSessionOwnershipRepository(prisma);
  }
  return _analyticsSessionOwnershipRepository;
}

export function getAdminRepository(): AdminRepository {
  if (!_adminRepository) {
    _adminRepository = new PrismaAdminRepository(prisma);
  }
  return _adminRepository;
}

export function getAdminAuthorizationRepository(): AdminAuthorizationRepository {
  if (!_adminAuthorizationRepository) {
    _adminAuthorizationRepository = new PrismaAdminAuthorizationRepository(prisma);
  }
  return _adminAuthorizationRepository;
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

/** Override leaderboard query persistence for focused route tests. */
export function setLeaderboardQueryRepository(repository: LeaderboardQueryRepository): void {
  _leaderboardQueryRepository = repository;
}

/** Override dashboard persistence for focused route tests. */
export function setDashboardRepository(repository: DashboardRepository): void {
  _dashboardRepository = repository;
}

/** Override neurotrainer history persistence for focused route tests. */
export function setNeurotrainerHistoryRepository(repository: NeurotrainerHistoryRepository): void {
  _neurotrainerHistoryRepository = repository;
}

/** Override chat persistence for focused route tests. */
export function setChatRepository(repository: ChatRepository): void {
  _chatRepository = repository;
}

/** Override auth persistence for focused route tests. */
export function setAuthRepository(repository: AuthRepository): void {
  _authRepository = repository;
}

/** Override analytics session ownership checks for focused route tests. */
export function setAnalyticsSessionOwnershipRepository(repository: AnalyticsSessionOwnershipRepository): void {
  _analyticsSessionOwnershipRepository = repository;
}

/** Override admin persistence for focused route tests. */
export function setAdminRepository(repository: AdminRepository): void {
  _adminRepository = repository;
}

/** Override server-side admin-role checks for focused middleware tests. */
export function setAdminAuthorizationRepository(repository: AdminAuthorizationRepository): void {
  _adminAuthorizationRepository = repository;
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
  _leaderboardQueryRepository = null;
  _dashboardRepository = null;
  _neurotrainerHistoryRepository = null;
  _chatRepository = null;
  _authRepository = null;
  _analyticsSessionOwnershipRepository = null;
  _adminRepository = null;
  _adminAuthorizationRepository = null;
}
