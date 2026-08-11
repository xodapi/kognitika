import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock performance API for consistent time tracking in tests
const performanceMock = {
  now: vi.fn(() => 0),
};
vi.stubGlobal('performance', performanceMock);

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16));
vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

// jsdom does not implement matchMedia. Keep responsive component tests deterministic.
const matchMediaMock = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

vi.stubGlobal('matchMedia', matchMediaMock);
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMediaMock,
  });
}
