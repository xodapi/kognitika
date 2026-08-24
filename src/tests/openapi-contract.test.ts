import { describe, expect, it } from 'vitest';
import { createOpenApiDocument, openApiDocsHtml } from '../server/openapi';

describe('OpenAPI contract', () => {
  it('exposes a valid dependency-free OpenAPI 3 document for core routes', () => {
    const document = createOpenApiDocument('https://kognitika.ru');

    expect(document.openapi).toBe('3.0.3');
    expect(document.servers).toEqual([{ url: 'https://kognitika.ru' }]);
    expect(document.paths['/api/health']?.get?.responses['200']).toBeDefined();
    expect(document.paths['/api/game/save']?.post?.security).toEqual([{ bearerAuth: [] }]);
    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('does not depend on external scripts for the docs page', () => {
    const html = openApiDocsHtml();

    expect(html).toContain('/api/docs.json');
    expect(html).not.toMatch(/<script|cdn|unpkg|jsdelivr/i);
  });
});
