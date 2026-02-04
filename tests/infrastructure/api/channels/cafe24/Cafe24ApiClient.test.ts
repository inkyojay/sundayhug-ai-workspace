/**
 * Cafe24ApiClient 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cafe24ApiClient } from '../../../../../src/infrastructure/api/channels/cafe24/Cafe24ApiClient';
import { Cafe24RawOrder } from '../../../../../src/infrastructure/api/channels/cafe24/types';
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
  statusText?: string;
  data?: unknown;
}) {
  return {
    ok: options.ok,
    status: options.status,
    statusText: options.statusText || (options.ok ? 'OK' : 'Error'),
    json: () => Promise.resolve(options.data ?? {}),
    text: () => Promise.resolve(JSON.stringify(options.data ?? {})),
    headers: createMockHeaders({ 'content-type': 'application/json' }),
  };
}

describe('Cafe24ApiClient', () => {
  let client: Cafe24ApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockCredentials = {
    mallId: 'test-mall',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
  };

  const mockOrder: Cafe24RawOrder = {
    order_id: 'C2024011512345',
    order_date: '2024-01-15T10:30:00+09:00',
    payment_date: '2024-01-15T10:35:00+09:00',
    order_status: 'N10',
    buyer: {
      name: '홍길동',
      email: 'hong@test.com',
      phone: '02-1234-5678',
      cellphone: '010-1234-5678',
      member_id: 'member123',
    },
    receiver: {
      name: '김철수',
      cellphone: '010-9876-5432',
      zipcode: '06234',
      address1: '서울시 강남구 테헤란로 123',
      address2: '101동 1001호',
      shipping_message: '문 앞에 놓아주세요',
    },
    items: [
      {
        order_item_code: 'ITEM001',
        product_no: 12345,
        product_code: 'P001',
        product_name: '테스트 상품',
        option_value: '색상: 블랙, 사이즈: L',
        quantity: 2,
        product_price: 15000,
        discount_price: 1000,
        additional_discount_price: 500,
        actual_payment_amount: 27000,
      },
    ],
    payment_amount: 30000,
    shipping_fee: 2500,
    discount_amount: 1500,
    mileage_used: 500,
    actual_payment_amount: 30500,
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Default: return success response
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('oauth/token')) {
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {
              access_token: 'new-token',
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              refresh_token: 'new-refresh',
              refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            },
          })
        );
      }
      return Promise.resolve(
        createMockResponse({
          ok: true,
          status: 200,
          data: { orders: [] },
        })
      );
    });

    client = new Cafe24ApiClient(mockCredentials);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct channel', () => {
      expect(client.getChannel()).toBe(SalesChannel.CAFE24);
    });

    it('should use mall-specific base URL', () => {
      expect(client['baseUrl']).toBe('https://test-mall.cafe24api.com');
    });
  });

  describe('getOrders', () => {
    it('should fetch orders successfully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/v2/admin/orders')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: {
                orders: [mockOrder],
              },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {},
          })
        );
      });

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      const result = await client.getOrders(fromDate, toDate);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].order_id).toBe('C2024011512345');
    });

    it('should handle pagination with links', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/v2/admin/orders')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: {
                orders: [mockOrder],
                links: [
                  { rel: 'next', href: '/api/v2/admin/orders?offset=100' },
                ],
              },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {},
          })
        );
      });

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      const result = await client.getOrders(fromDate, toDate);

      expect(result.pagination?.hasMore).toBe(true);
    });

    it('should filter by status', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/v2/admin/orders')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: { orders: [] },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {},
          })
        );
      });

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      await client.getOrders(fromDate, toDate, { orderStatus: ['N10', 'N20'] });

      const orderCall = mockFetch.mock.calls.find(([url]) =>
        url.includes('/api/v2/admin/orders')
      );
      expect(orderCall).toBeTruthy();
      expect(orderCall![0]).toContain('order_status=N10');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: { orders: [] },
          })
        )
      );

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on failed connection', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });
});
