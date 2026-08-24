type HttpMethod = 'get' | 'post' | 'patch';

type OpenApiOperation = {
  operationId: string;
  summary: string;
  tags: string[];
  security?: Array<Record<string, string[]>>;
  responses: Record<string, { description: string }>;
};
type OpenApiResponses = Record<string, { description: string }>;

const authSecurity = [{ bearerAuth: [] }];
const ok = { '200': { description: 'Successful response' } };
const created = { '200': { description: 'Successful response' }, '400': { description: 'Validation error' } };
const secured = (operationId: string, summary: string, tags: string[], methodResponses: OpenApiResponses = ok): OpenApiOperation => ({
  operationId,
  summary,
  tags,
  security: authSecurity,
  responses: { ...methodResponses, '401': { description: 'Authentication required' } },
});
const publicOperation = (operationId: string, summary: string, tags: string[], methodResponses: OpenApiResponses = ok): OpenApiOperation => ({
  operationId,
  summary,
  tags,
  responses: methodResponses,
});

const operations: Array<[HttpMethod, string, OpenApiOperation]> = [
  ['get', '/api/health', publicOperation('getHealth', 'Read service health and build ID', ['System'])],
  ['post', '/api/auth/brain', publicOperation('createBrainSession', 'Create an anonymous Brain ID session', ['Auth'], created)],
  ['post', '/api/auth/restore', publicOperation('restoreBrainSession', 'Restore an anonymous Brain ID session', ['Auth'], created)],
  ['get', '/api/me', secured('getMe', 'Read safe authenticated profile fields', ['Identity'])],
  ['post', '/api/game/attempts', secured('createGameAttempt', 'Issue server-bound game credentials', ['Game'], created)],
  ['post', '/api/game/save', secured('saveGameSession', 'Persist a completed game session', ['Game'], {
    ...created,
    '500': { description: 'Sanitized persistence failure' },
  })],
  ['get', '/api/game/progress', secured('getGameProgress', 'Read authenticated progress', ['Game'])],
  ['get', '/api/dashboard/status', secured('getDashboardStatus', 'Read dashboard status', ['Dashboard'])],
  ['get', '/api/analytics/profile', secured('getAnalyticsProfile', 'Read privacy-safe analytics profile', ['Analytics'])],
  ['get', '/api/analytics/export', secured('exportAnalytics', 'Export allowed analytics data', ['Analytics'])],
  ['get', '/api/analytics/summaries', secured('getAnalyticsSummaries', 'Read session summaries', ['Analytics'])],
  ['get', '/api/analytics/summaries/trend', secured('getSummaryTrend', 'Read summary trends', ['Analytics'])],
  ['get', '/api/analytics/cognitive-trend', secured('getCognitiveTrend', 'Read cognitive trend data', ['Analytics'])],
  ['post', '/api/analytics/practice-flow', publicOperation('recordPracticeFlow', 'Record explicitly enabled privacy-safe practice flow', ['Analytics'])],
  ['get', '/api/leaderboard', publicOperation('getLeaderboard', 'Read the public leaderboard', ['Leaderboard'])],
  ['post', '/api/feedback', secured('submitFeedback', 'Submit product feedback', ['Feedback'])],
  ['get', '/api/ideas', publicOperation('getIdeas', 'Read public idea summaries', ['Ideas'])],
  ['post', '/api/ideas', secured('createIdea', 'Submit an idea', ['Ideas'])],
  ['post', '/api/ideas/{id}/vote', secured('voteIdea', 'Vote on an idea', ['Ideas'])],
  ['get', '/api/chat/stream', publicOperation('streamChat', 'Open the bounded chat SSE stream', ['Chat'])],
  ['post', '/api/chat/messages', publicOperation('sendChatMessage', 'Send a validated chat message', ['Chat'])],
];

export function createOpenApiDocument(serverUrl = process.env.APP_URL || 'http://localhost:3006') {
  const paths: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>> = {};
  for (const [method, route, operation] of operations) {
    paths[route] ||= {};
    paths[route][method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Kognitika API',
      version: '1.0.0',
      description: 'Privacy-safe HTTP contract for Kognitika. Raw identity, tokens, and private telemetry are never response fields.',
    },
    servers: [{ url: serverUrl }],
    tags: [...new Set(operations.flatMap(([, , operation]) => operation.tags))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  };
}

export function openApiDocsHtml(jsonUrl = '/api/docs.json') {
  const safeJsonUrl = JSON.stringify(jsonUrl);
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kognitika API</title></head>
  <body style="font-family:system-ui,sans-serif;max-width:56rem;margin:3rem auto;padding:0 1rem">
    <h1>Kognitika API</h1>
    <p>OpenAPI 3.0 schema, served without external scripts or third-party runtime dependencies.</p>
    <p><a href=${safeJsonUrl}>Open <code>/api/docs.json</code></a></p>
  </body>
</html>`;
}
