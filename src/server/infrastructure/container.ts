import prisma from '../../lib/prisma.ts';
import { PrismaGameAttemptRepository } from './prisma/prisma-game-attempt-repository.ts';
import { PrismaGameSessionRepository } from './prisma/prisma-game-session-repository.ts';
import { PrismaUserRepository } from './prisma/prisma-user-repository.ts';
import type { GameAttemptRepository } from '../repositories/game-attempt-repository.ts';
import type { GameSessionRepository } from '../repositories/game-session-repository.ts';
import type { UserRepository } from '../repositories/user-repository.ts';

export type GameRepositories = {
  gameAttempts: GameAttemptRepository;
  gameSessions: GameSessionRepository;
  users: UserRepository;
};

// Singleton-per-process: the Prisma client is already a singleton.
let _repos: GameRepositories | null = null;

export function getGameRepositories(): GameRepositories {
  if (!_repos) {
    _repos = {
      gameAttempts: new PrismaGameAttemptRepository(prisma),
      gameSessions: new PrismaGameSessionRepository(prisma),
      users: new PrismaUserRepository(prisma),
    };
  }
  return _repos;
}

/** Override the singleton – used in tests to inject in-memory repositories. */
export function setGameRepositories(repos: GameRepositories): void {
  _repos = repos;
}

/** Reset to Prisma-backed defaults (used in test teardown). */
export function resetGameRepositories(): void {
  _repos = null;
}
