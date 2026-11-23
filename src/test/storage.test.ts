import { beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyStorage, STORAGE_KEY } from '../store/useWorldStore';

const LEGACY_KEY = 'moss-and-ember-v1';

describe('storage migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('moves a legacy save to the Evergrow key', () => {
    window.localStorage.setItem(LEGACY_KEY, '{"state":{"coins":42}}');
    migrateLegacyStorage(window.localStorage);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{"state":{"coins":42}}');
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('keeps the current save when both keys exist', () => {
    window.localStorage.setItem(LEGACY_KEY, 'old');
    window.localStorage.setItem(STORAGE_KEY, 'current');
    migrateLegacyStorage(window.localStorage);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('current');
    expect(window.localStorage.getItem(LEGACY_KEY)).toBe('old');
  });
});
