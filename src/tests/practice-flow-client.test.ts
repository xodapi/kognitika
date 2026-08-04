// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadClient(telemetryEnabled: string | undefined) {
  vi.resetModules();
  vi.stubEnv('VITE_PRACTICE_FLOW_TELEMETRY_ENABLED', telemetryEnabled ?? '');
  return import('../lib/practice-flow-client');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('practice flow client privacy default-deny', () => {
  it('does not create a session identifier or send a network event by default', async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = await loadClient(undefined);

    expect(client.startPracticeFlow('/typing')).toBeNull();
    expect(window.sessionStorage.getItem('kognitika:session:practiceFlow')).toBeNull();
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts and transmits only after explicit public opt-in', async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });
    const client = await loadClient('true');

    expect(client.startPracticeFlow('/typing')).toMatchObject({
      moduleId: 'typing',
      route: '/typing',
    });
    expect(window.sessionStorage.getItem('kognitika:session:practiceFlow')).toMatch(/^anon-/);
    expect(beacon).toHaveBeenCalledOnce();
  });
});
