/**
 * Cafe24AuthStrategy 테스트
 * OAuth 2.0 인증 (토큰 관리)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cafe24AuthStrategy } from '../../../../../src/infrastructure/api/channels/cafe24/Cafe24AuthStrategy';

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

describe('Cafe24AuthStrategy', () => {
  let authStrategy: Cafe24AuthStrategy;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockCredentials = {
    mallId: 'test-mall',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    authStrategy = new Cafe24AuthStrategy(mockCredentials);
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

  describe('Mall-specific URL', () => {
    it('should return correct mall ID', () => {
      expect(authStrategy.getMallId()).toBe('test-mall');
    });

    it('should generate correct API base URL', () => {
      expect(authStrategy.getApiBaseUrl()).toBe('https://test-mall.cafe24api.com');
    });
  });

  describe('Token Management', () => {
    it('should use provided access token if valid', async () => {
      const authWithToken = new Cafe24AuthStrategy({
        ...mockCredentials,
        accessToken: 'existing-token',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      });

      const headers = await authWithToken.authenticate('https://test.cafe24api.com/test', {});

      expect(headers.Authorization).toBe('Bearer existing-token');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should refresh token when access token is expired', async () => {
      const expiredAuth = new Cafe24AuthStrategy({
        ...mockCredentials,
        accessToken: 'expired-token',
        tokenExpiresAt: new Date(Date.now() - 1000), // Expired
      });

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'new-access-token',
            expires_at: '2024-01-15T11:00:00Z',
            refresh_token: 'new-refresh-token',
            refresh_token_expires_at: '2024-02-15T10:00:00Z',
          },
        })
      );

      const headers = await expiredAuth.authenticate('https://test.cafe24api.com/test', {});

      expect(headers.Authorization).toBe('Bearer new-access-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should send correct refresh token request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          data: {
            access_token: 'new-token',
            expires_at: '2024-01-15T11:00:00Z',
            refresh_token: 'new-refresh',
            refresh_token_expires_at: '2024-02-15T10:00:00Z',
          },
        })
      );

      await authStrategy.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-mall.cafe24api.com/api/v2/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toContain('grant_type=refresh_token');
      expect(options.body).toContain('refresh_token=test-refresh-token');
    });
  });

  describe('Validity Check', () => {
    it('should be invalid without token', () => {
      expect(authStrategy.isValid()).toBe(false);
    });

    it('should be valid with fresh token', async () => {
      const validAuth = new Cafe24AuthStrategy({
        ...mockCredentials,
        accessToken: 'valid-token',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      });

      expect(validAuth.isValid()).toBe(true);
    });

    it('should be invalid with expired token', () => {
      const expiredAuth = new Cafe24AuthStrategy({
        ...mockCredentials,
        accessToken: 'expired-token',
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      expect(expiredAuth.isValid()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 401,
          data: { error: { code: 401, message: 'Invalid refresh token' } },
        })
      );

      await expect(authStrategy.refreshToken()).rejects.toThrow();
    });
  });
});
