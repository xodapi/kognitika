/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PATHS, RECOMMENDED_GAME_ROUTES, isAppRoute, routeForRecommendedGame } from '../lib/routes';
import { ROUTE_DEFINITIONS, CUSTOM_RENDER_ROUTES, HEADER_NAV_ITEMS } from '../lib/route-config';

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
    const declaredRoutes = new Set(ROUTE_DEFINITIONS.map((r) => r.path));

    for (const route of APP_ROUTE_PATHS) {
      expect(declaredRoutes.has(route), `${route} should be declared in route config`).toBe(true);
    }

    const staticNavigateTargets = uniqueMatches(appSource, /navigate\('([^']+)'\)/g)
      .filter((target) => target.startsWith('/'));

    for (const target of staticNavigateTargets) {
      expect(declaredRoutes.has(target), `navigate('${target}') should have a matching route`).toBe(true);
    }

    const drawerRouteIds = uniqueMatches(appSource, /\{\s*id:\s*'([^']+)'/g);
    for (const id of drawerRouteIds) {
      const route = id === 'dashboard' ? '/' : `/${id}`;
      expect(declaredRoutes.has(route), `drawer route id '${id}' should resolve to a matching route`).toBe(true);
    }

    const hrefTargets = uniqueMatches(appSource, /href="([^"]+)"/g);
    for (const href of hrefTargets) {
      const isExternal = /^https:\/\//.test(href);
      const isInternalRoute = href.startsWith('/') && declaredRoutes.has(href);
      expect(isExternal || isInternalRoute, `href '${href}' should be https or an app route`).toBe(true);
    }
  });

  it('keeps every TrainingGallery module id routable from Dashboard', () => {
    const declaredRoutes = new Set(ROUTE_DEFINITIONS.map((r) => r.path));

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

  it('keeps ROUTE_DEFINITIONS and APP_ROUTE_PATHS in sync', () => {
    const definitionPaths = new Set(ROUTE_DEFINITIONS.map((r) => r.path));
    const appRouteSet = new Set(APP_ROUTE_PATHS);

    for (const path of APP_ROUTE_PATHS) {
      expect(definitionPaths.has(path), `${path} should exist in ROUTE_DEFINITIONS`).toBe(true);
    }

    for (const def of ROUTE_DEFINITIONS) {
      expect(appRouteSet.has(def.path), `${def.path} should exist in APP_ROUTE_PATHS`).toBe(true);
    }
  });

  it('keeps CUSTOM_RENDER_ROUTES matching route definitions with customRender flag', () => {
    const expected = new Set(
      ROUTE_DEFINITIONS.filter((r) => r.customRender).map((r) => r.path),
    );
    expect(CUSTOM_RENDER_ROUTES.size).toBe(expected.size);
    for (const path of CUSTOM_RENDER_ROUTES) {
      expect(expected.has(path), `${path} should have customRender: true in ROUTE_DEFINITIONS`).toBe(true);
    }
  });

  it('keeps HEADER_NAV_ITEMS matching defined routes', () => {
    const definitionPaths = new Set(ROUTE_DEFINITIONS.map((r) => r.path));
    for (const item of HEADER_NAV_ITEMS) {
      expect(definitionPaths.has(item.path), `HEADER_NAV_ITEMS path '${item.path}' should exist in ROUTE_DEFINITIONS`).toBe(true);
    }
  });

  it('exposes the deployed build id for manual QA', () => {
    const appSource = readRepoFile('src/App.tsx');

    expect(appSource).toContain('import.meta.env.VITE_BUILD_ID');
    expect(appSource).toContain('aria-label="Версия сборки"');
    expect(appSource).toContain('build {appBuildId}');
  });

  it('keeps the full header navigation behind a wide breakpoint', () => {
    const appSource = readRepoFile('src/App.tsx');

    expect(appSource).toContain('className="hidden 2xl:flex items-center gap-1');
    expect(appSource).toContain('className="2xl:hidden p-2');
    expect(appSource).not.toContain('className="hidden lg:flex items-center gap-1');
  });
});
