/**
 * FeatureFlags 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureFlags, FeatureFlag } from '../../../src/infrastructure/config/FeatureFlags';
import { SalesChannel } from '../../../src/types';

describe('FeatureFlags', () => {
  let featureFlags: FeatureFlags;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    featureFlags = new FeatureFlags();
  });

  afterEach(() => {
    process.env = originalEnv;
    featureFlags.clearAllOverrides();
  });

  describe('isEnabled', () => {
    it('should return default value when env not set', () => {
      delete process.env[FeatureFlag.REAL_COUPANG_API];

      expect(featureFlags.isEnabled(FeatureFlag.REAL_COUPANG_API)).toBe(false);
    });

    it('should return true when env is "true"', () => {
      process.env[FeatureFlag.REAL_COUPANG_API] = 'true';

      // Need new instance to pick up env changes
      featureFlags = new FeatureFlags();

      expect(featureFlags.isEnabled(FeatureFlag.REAL_COUPANG_API)).toBe(true);
    });

    it('should return true when env is "1"', () => {
      process.env[FeatureFlag.REAL_NAVER_API] = '1';
      featureFlags = new FeatureFlags();

      expect(featureFlags.isEnabled(FeatureFlag.REAL_NAVER_API)).toBe(true);
    });

    it('should return false when env is "false"', () => {
      process.env[FeatureFlag.REAL_CAFE24_API] = 'false';
      featureFlags = new FeatureFlags();

      expect(featureFlags.isEnabled(FeatureFlag.REAL_CAFE24_API)).toBe(false);
    });

    it('should respect override over env', () => {
      process.env[FeatureFlag.REAL_COUPANG_API] = 'true';
      featureFlags = new FeatureFlags();
      featureFlags.setOverride(FeatureFlag.REAL_COUPANG_API, false);

      expect(featureFlags.isEnabled(FeatureFlag.REAL_COUPANG_API)).toBe(false);
    });
  });

  describe('isRealApiEnabled', () => {
    it('should return false for Coupang by default', () => {
      expect(featureFlags.isRealApiEnabled(SalesChannel.COUPANG)).toBe(false);
    });

    it('should return false for Naver by default', () => {
      expect(featureFlags.isRealApiEnabled(SalesChannel.NAVER)).toBe(false);
    });

    it('should return false for Cafe24 by default', () => {
      expect(featureFlags.isRealApiEnabled(SalesChannel.CAFE24)).toBe(false);
    });

    it('should return false for unsupported channel', () => {
      expect(featureFlags.isRealApiEnabled(SalesChannel.GMARKET)).toBe(false);
    });

    it('should return true when Coupang flag is enabled', () => {
      featureFlags.setOverride(FeatureFlag.REAL_COUPANG_API, true);

      expect(featureFlags.isRealApiEnabled(SalesChannel.COUPANG)).toBe(true);
    });
  });

  describe('setOverride', () => {
    it('should override default value', () => {
      featureFlags.setOverride(FeatureFlag.REAL_COUPANG_API, true);

      expect(featureFlags.isEnabled(FeatureFlag.REAL_COUPANG_API)).toBe(true);
    });
  });

  describe('clearOverride', () => {
    it('should restore default/env value', () => {
      featureFlags.setOverride(FeatureFlag.REAL_COUPANG_API, true);
      featureFlags.clearOverride(FeatureFlag.REAL_COUPANG_API);

      expect(featureFlags.isEnabled(FeatureFlag.REAL_COUPANG_API)).toBe(false);
    });
  });

  describe('clearAllOverrides', () => {
    it('should clear all overrides', () => {
      featureFlags.setOverride(FeatureFlag.REAL_COUPANG_API, true);
      featureFlags.setOverride(FeatureFlag.REAL_NAVER_API, true);
      featureFlags.setOverride(FeatureFlag.REAL_CAFE24_API, true);

      featureFlags.clearAllOverrides();

      expect(featureFlags.isEnabled(FeatureFlag.REAL_COUPANG_API)).toBe(false);
      expect(featureFlags.isEnabled(FeatureFlag.REAL_NAVER_API)).toBe(false);
      expect(featureFlags.isEnabled(FeatureFlag.REAL_CAFE24_API)).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flag values', () => {
      featureFlags.setOverride(FeatureFlag.REAL_COUPANG_API, true);

      const allFlags = featureFlags.getAllFlags();

      expect(allFlags[FeatureFlag.REAL_COUPANG_API]).toBe(true);
      expect(allFlags[FeatureFlag.REAL_NAVER_API]).toBe(false);
      expect(allFlags[FeatureFlag.ORDER_SYNC_ENABLED]).toBe(true); // default
    });
  });
});
