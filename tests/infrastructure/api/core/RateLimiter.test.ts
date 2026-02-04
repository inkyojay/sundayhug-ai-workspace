/**
 * RateLimiter 테스트
 * TDD RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../../../src/infrastructure/api/core/RateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Token bucket algorithm', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000, // 1 second
      });

      // Should allow 5 immediate requests
      for (let i = 0; i < 5; i++) {
        const allowed = await limiter.tryAcquire();
        expect(allowed).toBe(true);
      }
    });

    it('should reject requests over limit', async () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 1000,
        maxWaitMs: 0, // No waiting
      });

      // First 3 should pass
      await limiter.tryAcquire();
      await limiter.tryAcquire();
      await limiter.tryAcquire();

      // 4th should fail
      const allowed = await limiter.tryAcquire();
      expect(allowed).toBe(false);
    });

    it('should refill tokens after window passes', async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      // Use all tokens
      await limiter.tryAcquire();
      await limiter.tryAcquire();

      // Should be empty
      expect(await limiter.tryAcquire()).toBe(false);

      // Advance time by window size
      vi.advanceTimersByTime(1000);

      // Should have tokens again
      expect(await limiter.tryAcquire()).toBe(true);
    });
  });

  describe('Waiting for tokens', () => {
    it('should wait for tokens when maxWaitMs is set', async () => {
      const limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 100,
        maxWaitMs: 200,
      });

      // Use the token
      await limiter.tryAcquire();

      // Start waiting for next token
      const waitPromise = limiter.acquire();

      // Advance time to refill
      vi.advanceTimersByTime(100);

      // Should resolve
      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('should throw when wait time exceeds maxWaitMs', async () => {
      const limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 1000, // 1 second refill
        maxWaitMs: 100, // Only wait 100ms
      });

      // Use the token
      await limiter.tryAcquire();

      // Try to acquire but timeout before refill
      await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Status reporting', () => {
    it('should report remaining tokens', async () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000,
      });

      expect(limiter.getStatus().remaining).toBe(5);

      await limiter.tryAcquire();
      expect(limiter.getStatus().remaining).toBe(4);

      await limiter.tryAcquire();
      await limiter.tryAcquire();
      expect(limiter.getStatus().remaining).toBe(2);
    });

    it('should report time until refill', async () => {
      const limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 1000,
      });

      // Use the token
      await limiter.tryAcquire();

      const status = limiter.getStatus();
      expect(status.remaining).toBe(0);
      expect(status.resetMs).toBeGreaterThan(0);
      expect(status.resetMs).toBeLessThanOrEqual(1000);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle concurrent requests correctly', async () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 1000,
        maxWaitMs: 0,
      });

      // Make 5 concurrent requests
      const results = await Promise.all([
        limiter.tryAcquire(),
        limiter.tryAcquire(),
        limiter.tryAcquire(),
        limiter.tryAcquire(),
        limiter.tryAcquire(),
      ]);

      // Only 3 should succeed
      const successCount = results.filter(Boolean).length;
      expect(successCount).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero maxRequests', () => {
      expect(() => new RateLimiter({
        maxRequests: 0,
        windowMs: 1000,
      })).toThrow('maxRequests must be greater than 0');
    });

    it('should handle negative windowMs', () => {
      expect(() => new RateLimiter({
        maxRequests: 10,
        windowMs: -1000,
      })).toThrow('windowMs must be greater than 0');
    });

    it('should reset correctly', async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      await limiter.tryAcquire();
      await limiter.tryAcquire();
      expect(limiter.getStatus().remaining).toBe(0);

      limiter.reset();
      expect(limiter.getStatus().remaining).toBe(2);
    });
  });
});
