import { expect, type Page } from '@playwright/test';

const syntheticLeaderboard = [
  {
    id: 'synthetic-user-1',
    name: 'Brain Alpha',
    pseudonym: 'Brain Alpha',
    experience: 1200,
    level: 4,
    rating: 860,
    _count: { sessions: 12 },
  },
  {
    id: 'synthetic-user-2',
    name: 'Brain Beta',
    pseudonym: 'Brain Beta',
    experience: 980,
    level: 3,
    rating: 740,
    _count: { sessions: 8 },
  },
  {
    id: 'synthetic-user-3',
    name: 'Brain Gamma',
    pseudonym: 'Brain Gamma',
    experience: 760,
    level: 2,
    rating: 620,
    _count: { sessions: 6 },
  },
  {
    id: 'synthetic-user-4',
    name: 'Brain Delta',
    pseudonym: 'Brain Delta',
    experience: 500,
    level: 2,
    rating: 500,
    _count: { sessions: 4 },
  },
];

const syntheticUser = {
  id: 'synthetic-user',
  name: 'Brain Tester',
  pseudonym: 'Brain Tester',
  brainId: 'BR-SYNTHETIC-0001',
  email: null,
  level: 2,
  experience: 250,
  rating: 500,
  role: 'USER',
  streakDays: 1,
  _count: { sessions: 3 },
};

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

export async function installSyntheticApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === '/api/client-error') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (url.pathname === '/api/leaderboard') {
      await route.fulfill(jsonResponse(syntheticLeaderboard));
      return;
    }

    if (url.pathname === '/api/dashboard/status') {
      await route.fulfill(
        jsonResponse({
          dailyTasks: [
            { id: 'daily-schulte', title: 'Шульте', completed: false, reward: 25 },
            { id: 'daily-numerical', title: 'Числа', completed: true, reward: 25 },
          ],
          levelProgress: 35,
          role: 'USER',
          streak: { current: 1, longest: 3 },
        }),
      );
      return;
    }

    if (url.pathname === '/api/progress' || url.pathname === '/api/game/progress') {
      await route.fulfill(jsonResponse([]));
      return;
    }

    if (url.pathname === '/api/me') {
      await route.fulfill(jsonResponse({ user: syntheticUser }));
      return;
    }

    if (url.pathname === '/api/ideas') {
      await route.fulfill(
        jsonResponse(
          method === 'GET'
            ? [
                {
                  id: 'synthetic-idea',
                  title: 'Синтетическая идея',
                  description: 'Тестовая идея без пользовательских данных',
                  status: 'PENDING',
                  author: { name: 'Brain Tester' },
                  _count: { votes: 1 },
                  userHasVoted: false,
                },
              ]
            : { id: 'synthetic-idea', success: true },
        ),
      );
      return;
    }

    if (url.pathname.startsWith('/api/ideas/')) {
      await route.fulfill(jsonResponse({ success: true }));
      return;
    }

    if (url.pathname === '/api/analytics/compare') {
      await route.fulfill(
        jsonResponse({
          deltaPercentage: 0,
          trend: 'stable',
          percentile: 75,
          verdict: 'Синтетический анализ завершен. Данные пользователей не используются.',
          recommendedGame: 'logical',
          recommendedGameTitle: 'Логические матрицы',
        }),
      );
      return;
    }

    if (url.pathname === '/api/analytics/profile') {
      await route.fulfill(jsonResponse({ profile: null, message: 'synthetic-profile-empty' }));
      return;
    }

    if (url.pathname === '/api/analytics/export') {
      await route.fulfill(jsonResponse({ version: 'synthetic', sessions: [] }));
      return;
    }

    if (url.pathname.startsWith('/api/game')) {
      await route.fulfill(jsonResponse({ success: true, sessionId: 'synthetic-session' }));
      return;
    }

    if (url.pathname === '/api/auth/brain') {
      await route.fulfill(jsonResponse({ token: 'synthetic-token', brainId: syntheticUser.brainId, pseudonym: syntheticUser.pseudonym, user: syntheticUser }));
      return;
    }

    if (url.pathname === '/api/auth/restore') {
      await route.fulfill(jsonResponse({ token: 'synthetic-token', brainId: syntheticUser.brainId, pseudonym: syntheticUser.pseudonym, user: syntheticUser }));
      return;
    }

    if (url.pathname === '/api/feedback') {
      await route.fulfill(jsonResponse({ success: true, trackingNum: 'FB-SYNTH' }));
      return;
    }

    await route.fulfill(jsonResponse({}));
  });
}

export function collectUnexpectedBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const text = message.text();
    if (text.includes('Failed to load resource: the server responded with a status of 404')) return;

    errors.push(text);
  });

  return errors;
}

export async function expectAppReady(page: Page) {
  await page.waitForFunction(() => {
    const recovery = document.getElementById('kognitika-boot-recovery');
    const text = document.body.innerText || '';
    return !recovery && text.trim().length > 20;
  });

  const bodyText = (await page.locator('body').innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(20);
  expect(bodyText).not.toContain('Не удалось запустить Когнитику');
  expect(bodyText).not.toContain('Интерфейс не загрузился');
}
