/**
 * NaverAuthStrategy 테스트
 * OAuth 2.0 Client Credentials 인증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NaverAuthStrategy } from '../../../../../src/infrastructure/api/channels/naver/NaverAuthStrategy';

/**
 * Mock Headers 헬퍼
 */
function createMockHeaders(init?: Record<string, string>) {
  const headers = new Map(Object.entries(init || {}));
  return {
    get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    forEach: (cb: (value: string, key: string) => void) => headers.forEach((v, k) => cb(v, k)),
  };
}

/**
 * Mock Response 헬퍼
 */
function createMockResponse(options: {
  ok: boolean;
  status: number;
  data?: unknown;
}) {
  return {
    ok: options.ok,
    status: options.status,
    statusText: options.ok ? 'OK' : 'Error',
    json: () => Promise.resolve(options.data ?? {}),
    text: () => Promise.resolve(JSON.stringify(options.data ?? {})),
    headers: createMockHeaders({ 'content-type': 'application/json' }),
  };
}

describe('NaverAuthStrategy', () => {
  let authStrategy: NaverAuthStrategy;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    smartStoreId: 'test-smartstore',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    authStrategy = new NaverAuthStrategy(mockCredentials);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('OAuth Type', () => {
    it('should have type "oauth2"', () => {
      expect(authStrategy.type).toBe('oauth2');
    });
  });

  describe('Token Management', () => {
    it('should fetch new token when none exists', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'new-access-token-123',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        })
      );

      const headers = await authStrategy.authenticate('https://api.commerce.naver.com/test', {
        method: 'GET',
      });

      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toBe('Bearer new-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing valid token', async () => {
      // First call - fetch token
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'access-token-123',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        })
      );

      await authStrategy.authenticate('https://api.commerce.naver.com/test', {});

      // Second call - should reuse token
      const headers = await authStrategy.authenticate('https://api.commerce.naver.com/test', {});

      expect(headers.Authorization).toBe('Bearer access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one token fetch
    });

    it('should refresh token when expired', async () => {
      // Initial token
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'old-token',
            expires_in: 60, // 1 minute
            token_type: 'Bearer',
          },
        })
      );

      await authStrategy.authenticate('https://api.commerce.naver.com/test', {});

      // Advance time past expiry (2 minutes)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // New token request
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'new-token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        })
      );

      const headers = await authStrategy.authenticate('https://api.commerce.naver.com/test', {});

      expect(headers.Authorization).toBe('Bearer new-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Request', () => {
    it('should send correct token request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        })
      );

      await authStrategy.authenticate('https://api.commerce.naver.com/test', {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('oauth2.0/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );

      // Body should include client credentials
      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toContain('client_id=test-client-id');
      expect(options.body).toContain('client_secret=test-client-secret');
      expect(options.body).toContain('grant_type=client_credentials');
    });
  });

  describe('Validity Check', () => {
    it('should be invalid without token', () => {
      expect(authStrategy.isValid()).toBe(false);
    });

    it('should be valid with fresh token', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        })
      );

      await authStrategy.authenticate('https://api.commerce.naver.com/test', {});
      expect(authStrategy.isValid()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw on token fetch failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 401,
          data: { error: 'invalid_client' },
        })
      );

      await expect(
        authStrategy.authenticate('https://api.commerce.naver.com/test', {})
      ).rejects.toThrow();
    });
  });
});
