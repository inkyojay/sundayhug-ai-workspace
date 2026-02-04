/**
 * HttpClient 테스트
 * TDD RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../../../src/infrastructure/api/core/HttpClient';
import { ApiError } from '../../../../src/infrastructure/api/core/types';

/**
 * Mock Headers 생성 헬퍼
 */
function createMockHeaders(
  init?: Record<string, string>
): { get: (key: string) => string | null; forEach: (cb: (value: string, key: string) => void) => void } {
  const headers = new Map(Object.entries(init || {}));
  return {
    get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    forEach: (cb: (value: string, key: string) => void) => headers.forEach((v, k) => cb(v, k)),
  };
}

/**
 * Mock Response 생성 헬퍼
 */
function createMockResponse(options: {
  ok: boolean;
  status: number;
  statusText: string;
  data?: unknown;
  headers?: Record<string, string>;
}) {
  return {
    ok: options.ok,
    status: options.status,
    statusText: options.statusText,
    json: () => Promise.resolve(options.data ?? {}),
    text: () => Promise.resolve(JSON.stringify(options.data ?? {})),
    headers: createMockHeaders({ 'content-type': 'application/json', ...options.headers }),
  };
}

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    httpClient = new HttpClient({
      timeout: 5000,
      maxRetries: 3,
      retryDelay: 10, // 테스트에서 빠르게 재시도
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: mockResponse,
        })
      );

      const response = await httpClient.get<typeof mockResponse>('https://api.example.com/data');

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
        })
      );

      await httpClient.get('https://api.example.com/data', {
        query: { page: 1, limit: 10, active: true },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data?page=1&limit=10&active=true',
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request with JSON body', async () => {
      const requestBody = { name: 'New Item', price: 100 };
      const mockResponse = { id: 123, ...requestBody };

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 201,
          statusText: 'Created',
          data: mockResponse,
        })
      );

      const response = await httpClient.post<typeof mockResponse>(
        'https://api.example.com/items',
        { body: requestBody }
      );

      expect(response.status).toBe(201);
      expect(response.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError on 4xx response', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid input' },
        })
      );

      try {
        await httpClient.get('https://api.example.com/data');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(400);
        expect(apiError.recoverable).toBe(false);
      }

      // 400 is non-recoverable, so should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should mark 429 errors as recoverable', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '60' },
        })
      );

      try {
        await httpClient.get('https://api.example.com/data', { retries: 0 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(429);
        expect(apiError.recoverable).toBe(true);
      }
    });

    it('should mark 503 errors as recoverable', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          data: { error: 'Service temporarily unavailable' },
        })
      );

      try {
        await httpClient.get('https://api.example.com/data', { retries: 0 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(503);
        expect(apiError.recoverable).toBe(true);
      }
    });
  });

  describe('Timeout handling', () => {
    it('should throw on timeout', async () => {
      vi.useRealTimers();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 10000);
          })
      );

      const shortTimeoutClient = new HttpClient({ timeout: 50, maxRetries: 0 });

      await expect(shortTimeoutClient.get('https://api.example.com/slow')).rejects.toThrow();
    });
  });

  describe('Retry logic', () => {
    it('should retry on recoverable errors', async () => {
      vi.useRealTimers();

      const fastHttpClient = new HttpClient({
        timeout: 5000,
        maxRetries: 3,
        retryDelay: 1,
      });

      // First two calls fail with 503, third succeeds
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            data: { error: 'Temporary error' },
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            data: { error: 'Temporary error' },
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            status: 200,
            statusText: 'OK',
            data: { success: true },
          })
        );

      const response = await fastHttpClient.get('https://api.example.com/data', {
        retries: 3,
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-recoverable errors', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Invalid credentials' },
        })
      );

      await expect(httpClient.get('https://api.example.com/data', { retries: 3 })).rejects.toThrow(
        ApiError
      );

      // Should not retry 401 errors
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      vi.useRealTimers();

      const fastHttpClient = new HttpClient({
        timeout: 5000,
        maxRetries: 2,
        retryDelay: 1,
      });

      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          data: { error: 'Temporary error' },
        })
      );

      await expect(
        fastHttpClient.get('https://api.example.com/data', { retries: 2 })
      ).rejects.toThrow(ApiError);

      // Initial call + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Headers', () => {
    it('should merge custom headers with defaults', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
        })
      );

      await httpClient.get('https://api.example.com/data', {
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });

  describe('Response time tracking', () => {
    it('should include response time in the response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: { data: 'test' },
        })
      );

      const response = await httpClient.get('https://api.example.com/data');

      expect(response.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof response.responseTime).toBe('number');
    });
  });
});
