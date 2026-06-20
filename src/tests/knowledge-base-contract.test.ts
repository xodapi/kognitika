import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PATHS } from '../lib/routes';
import {
  KNOWLEDGE_ARTICLE_BY_ID,
  KNOWLEDGE_ARTICLES,
  TRAINING_KNOWLEDGE_ROUTE_IDS,
} from '../lib/knowledge-base';

const NON_TRAINING_ROUTES = new Set([
  '/',
  '/dashboard',
  '/leaderboard',
  '/admin',
  '/ideas',
  '/wiki',
]);

describe('knowledge-base contract', () => {
  it('covers every public training route with a stable article URL', () => {
    const routeTrainingIds = APP_ROUTE_PATHS
      .filter(route => !NON_TRAINING_ROUTES.has(route))
      .map(route => route.slice(1));

    expect(routeTrainingIds.sort()).toEqual([...TRAINING_KNOWLEDGE_ROUTE_IDS].sort());

    for (const id of routeTrainingIds) {
      const article = KNOWLEDGE_ARTICLE_BY_ID.get(id);
      expect(article, `${id} must have a knowledge-base article`).toBeDefined();
      expect(article?.route).toBe(`/wiki/${id}`);
    }
  });

  it('keeps every article useful for onboarding and manual QA', () => {
    for (const article of KNOWLEDGE_ARTICLES) {
      expect(article.title.trim().length, `${article.id} title`).toBeGreaterThan(0);
      expect(article.trains.trim().length, `${article.id} trains`).toBeGreaterThan(20);
      expect(article.howTo.trim().length, `${article.id} howTo`).toBeGreaterThan(20);
      expect(article.metrics.trim().length, `${article.id} metrics`).toBeGreaterThan(20);
      expect(article.science.trim().length, `${article.id} science`).toBeGreaterThan(20);
      expect(article.safety.trim().length, `${article.id} safety`).toBeGreaterThan(20);
      expect(article.tags.length, `${article.id} tags`).toBeGreaterThan(0);
    }
  });
});
