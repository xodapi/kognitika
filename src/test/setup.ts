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
