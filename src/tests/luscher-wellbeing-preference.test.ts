import { beforeEach, describe, expect, it } from 'vitest';
import {
  isLuscherWellbeingEnabled,
  LUSCHER_WELLBEING_PREFERENCE_KEY,
  setLuscherWellbeingEnabled,
} from '../lib/luscher-wellbeing-preference';

describe('Luscher wellbeing preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('is enabled by default when no preference is stored', () => {
    expect(isLuscherWellbeingEnabled()).toBe(true);
  });

  it('persists an explicit opt-out as a versioned boolean only', () => {
    setLuscherWellbeingEnabled(false);

    expect(isLuscherWellbeingEnabled()).toBe(false);
    expect(window.localStorage.getItem(LUSCHER_WELLBEING_PREFERENCE_KEY)).toBe(
      JSON.stringify({ version: 1, enabled: false }),
    );
    expect(window.localStorage.getItem(LUSCHER_WELLBEING_PREFERENCE_KEY)).not.toMatch(
      /brainId|userId|email|token|password|sequence|score|timestamp/i,
    );
  });

  it('falls back to enabled when stored data is malformed', () => {
    window.localStorage.setItem(LUSCHER_WELLBEING_PREFERENCE_KEY, '{bad-json');

    expect(isLuscherWellbeingEnabled()).toBe(true);
  });

  it('allows the setting to be enabled again', () => {
    setLuscherWellbeingEnabled(false);
    setLuscherWellbeingEnabled(true);

    expect(isLuscherWellbeingEnabled()).toBe(true);
  });
});
