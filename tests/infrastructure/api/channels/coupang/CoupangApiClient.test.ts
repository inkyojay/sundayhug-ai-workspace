/**
 * CoupangApiClient 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoupangApiClient } from '../../../../../src/infrastructure/api/channels/coupang/CoupangApiClient';
import { CoupangRawOrder } from '../../../../../src/infrastructure/api/channels/coupang/types';
import { SalesChannel } from '../../../../../src/types';

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
  statusText: string;
  data?: unknown;
}) {
  return {
    ok: options.ok,
    status: options.status,
    statusText: options.statusText,
    json: () => Promise.resolve(options.data ?? {}),
    text: () => Promise.resolve(JSON.stringify(options.data ?? {})),
    headers: createMockHeaders({ 'content-type': 'application/json' }),
  };
}

describe('CoupangApiClient', () => {
  let client: CoupangApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockCredentials = {
    vendorId: 'A00012345',
    accessKey: 'test-access-key',
    secretKey: 'test-secret-key',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    client = new CoupangApiClient(mockCredentials);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct channel', () => {
      expect(client.getChannel()).toBe(SalesChannel.COUPANG);
    });

    it('should use correct base URL', () => {
      expect(client['baseUrl']).toBe('https://api-gateway.coupang.com');
    });
  });

  describe('getOrders', () => {
    const mockOrders: CoupangRawOrder[] = [
      {
        orderId: 12345678,
        orderedAt: '2024-01-15T10:00:00',
        orderer: {
          name: '홍길동',
          email: 'hong@test.com',
          safeNumber: '050-1234-5678',
        },
        receiver: {
          name: '김철수',
          safeNumber: '050-9876-5432',
          addr1: '서울시 강남구',
          addr2: '테헤란로 123',
          postCode: '06234',
        },
        orderItems: [
          {
            vendorItemId: 111111,
            vendorItemName: '테스트 상품',
            vendorItemPackageId: 222222,
            shippingCount: 1,
            salesPrice: 10000,
            discountPrice: 1000,
            orderPrice: 9000,
          },
        ],
        shippingPrice: 2500,
        remotePrice: 0,
        status: 'ACCEPT',
      },
    ];

    it('should fetch orders successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: {
            code: 'SUCCESS',
            message: 'OK',
            data: mockOrders,
          },
        })
      );

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      const result = await client.getOrders(fromDate, toDate);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderId).toBe(12345678);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle pagination with nextToken', async () => {
      // First page
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            status: 200,
            statusText: 'OK',
            data: {
              code: 'SUCCESS',
              message: 'OK',
              data: mockOrders,
              nextToken: 'token123',
            },
          })
        )
        // Second page
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            status: 200,
            statusText: 'OK',
            data: {
              code: 'SUCCESS',
              message: 'OK',
              data: [],
            },
          })
        );

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');

      // First call
      const result1 = await client.getOrders(fromDate, toDate);
      expect(result1.orders).toHaveLength(1);
      expect(result1.pagination?.nextToken).toBe('token123');
      expect(result1.pagination?.hasMore).toBe(true);

      // Second call with nextToken
      const result2 = await client.getOrders(fromDate, toDate, { nextToken: 'token123' });
      expect(result2.orders).toHaveLength(0);
      expect(result2.pagination?.hasMore).toBe(false);
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: {
            code: 'SUCCESS',
            message: 'OK',
            data: [],
          },
        })
      );

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      const result = await client.getOrders(fromDate, toDate);

      expect(result.orders).toHaveLength(0);
    });

    it('should filter by status', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: {
            code: 'SUCCESS',
            message: 'OK',
            data: mockOrders,
          },
        })
      );

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      await client.getOrders(fromDate, toDate, { status: 'ACCEPT' });

      // URL에 status 파라미터 포함 확인
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=ACCEPT'),
        expect.any(Object)
      );
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: { code: 'SUCCESS' },
        })
      );

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on failed connection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw on API error response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          data: {
            code: 'ERROR',
            message: 'Invalid credentials',
          },
        })
      );

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');

      await expect(client.getOrders(fromDate, toDate)).rejects.toThrow();
    });
  });
});
