/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PATHS, RECOMMENDED_GAME_ROUTES, isAppRoute, routeForRecommendedGame } from '../lib/routes';

function readRepoFile(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

function uniqueMatches(source: string, regex: RegExp) {
  return [...new Set(Array.from(source.matchAll(regex), (match) => match[1]))].sort();
}

describe('navigation contract', () => {
  it('keeps every recommendation target mapped to a real app route', () => {
    for (const [game, route] of Object.entries(RECOMMENDED_GAME_ROUTES)) {
      expect(isAppRoute(route), `${game} should point to a real route`).toBe(true);
      expect(routeForRecommendedGame(game)).toBe(route);
    }

    expect(routeForRecommendedGame('unknown-module')).toBe('/schulte');
  });

  it('keeps static App navigation targets aligned with declared routes', () => {
    const appSource = readRepoFile('src/App.tsx');
    const declaredRoutes = new Set(
      uniqueMatches(appSource, /<Route\s+path="([^"]+)"/g).filter((path) => path !== '*'),
    );

    for (const route of APP_ROUTE_PATHS) {
      expect(declaredRoutes.has(route), `${route} should be declared in App routes`).toBe(true);
    }

    const staticNavigateTargets = uniqueMatches(appSource, /navigate\('([^']+)'\)/g)
      .filter((target) => target.startsWith('/'));

    for (const target of staticNavigateTargets) {
      expect(declaredRoutes.has(target), `navigate('${target}') should have a matching <Route>`).toBe(true);
    }

    const drawerRouteIds = uniqueMatches(appSource, /\{\s*id:\s*'([^']+)'/g);
    for (const id of drawerRouteIds) {
      const route = id === 'dashboard' ? '/' : `/${id}`;
      expect(declaredRoutes.has(route), `drawer route id '${id}' should resolve to a matching <Route>`).toBe(true);
    }

    const hrefTargets = uniqueMatches(appSource, /href="([^"]+)"/g);
    for (const href of hrefTargets) {
      const isExternal = /^https:\/\//.test(href);
      const isInternalRoute = href.startsWith('/') && declaredRoutes.has(href);
      expect(isExternal || isInternalRoute, `href '${href}' should be https or an app route`).toBe(true);
    }
  });

  it('keeps every TrainingGallery module id routable from Dashboard', () => {
    const appSource = readRepoFile('src/App.tsx');
    const declaredRoutes = new Set(
      uniqueMatches(appSource, /<Route\s+path="([^"]+)"/g).filter((path) => path !== '*'),
    );

    const gallerySource = readRepoFile('src/components/TrainingGallery.tsx');
    const modulesSource = gallerySource.slice(
      gallerySource.indexOf('const MODULES'),
      gallerySource.indexOf('export function TrainingGallery'),
    );
    const moduleIds = uniqueMatches(modulesSource, /\{\s*id:\s*'([^']+)'/g);

    expect(moduleIds.length).toBeGreaterThan(0);
    for (const id of moduleIds) {
      expect(declaredRoutes.has(`/${id}`), `TrainingGallery module '${id}' should have a matching route`).toBe(true);
    }
  });
});
