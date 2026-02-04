/**
 * NaverApiClient 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NaverApiClient } from '../../../../../src/infrastructure/api/channels/naver/NaverApiClient';
import { NaverRawOrder } from '../../../../../src/infrastructure/api/channels/naver/types';
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

describe('NaverApiClient', () => {
  let client: NaverApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    smartStoreId: 'test-smartstore',
  };

  // Mock order for tests
  const mockOrder: NaverRawOrder = {
    orderId: 'N2024011512345',
    productOrderId: 'PO2024011512345',
    orderDate: '2024-01-15T10:30:00+09:00',
    paymentDate: '2024-01-15T10:35:00+09:00',
    ordererName: '홍길동',
    ordererTel: '010-1234-5678',
    productOrder: {
      productName: '테스트 상품',
      productOption: '옵션A',
      quantity: 2,
      unitPrice: 15000,
      totalPaymentAmount: 30000,
      productDiscountAmount: 2000,
      sellerProductCode: 'SKU-001',
    },
    shippingAddress: {
      name: '김철수',
      tel1: '010-9876-5432',
      zipCode: '06234',
      baseAddress: '서울시 강남구 테헤란로 123',
      detailAddress: '101동 1001호',
    },
    shippingMemo: '문 앞에 놓아주세요',
    deliveryFee: 2500,
    orderStatus: 'PAYED',
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Token request mock (always first)
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('oauth2.0/token')) {
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {
              access_token: 'test-token',
              expires_in: 3600,
              token_type: 'Bearer',
            },
          })
        );
      }
      // Default: return empty success
      return Promise.resolve(
        createMockResponse({
          ok: true,
          status: 200,
          data: { data: { contents: [], pageInfo: { totalElements: 0, totalPages: 0 } } },
        })
      );
    });

    client = new NaverApiClient(mockCredentials);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct channel', () => {
      expect(client.getChannel()).toBe(SalesChannel.NAVER);
    });

    it('should use correct base URL', () => {
      expect(client['baseUrl']).toBe('https://api.commerce.naver.com');
    });
  });

  describe('getOrders', () => {
    it('should fetch orders successfully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('oauth2.0/token')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: {
                access_token: 'test-token',
                expires_in: 3600,
                token_type: 'Bearer',
              },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {
              timestamp: '2024-01-15T10:00:00Z',
              traceId: 'trace-123',
              data: {
                contents: [mockOrder],
                pageInfo: {
                  totalPages: 1,
                  totalElements: 1,
                  size: 50,
                  current: 0,
                },
              },
            },
          })
        );
      });

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      const result = await client.getOrders(fromDate, toDate);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderId).toBe('N2024011512345');
    });

    it('should handle pagination', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('oauth2.0/token')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: {
                access_token: 'test-token',
                expires_in: 3600,
                token_type: 'Bearer',
              },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: {
              data: {
                contents: [mockOrder],
                pageInfo: {
                  totalPages: 3,
                  totalElements: 150,
                  size: 50,
                  current: 0,
                },
              },
            },
          })
        );
      });

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      const result = await client.getOrders(fromDate, toDate, { page: 0 });

      expect(result.pagination?.hasMore).toBe(true);
      expect(result.pagination?.totalCount).toBe(150);
    });

    it('should filter by status', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('oauth2.0/token')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: {
                access_token: 'test-token',
                expires_in: 3600,
                token_type: 'Bearer',
              },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: { data: { contents: [], pageInfo: {} } },
          })
        );
      });

      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-16');
      await client.getOrders(fromDate, toDate, { productOrderStatus: ['PAYED'] });

      // Check that the orders endpoint was called (not just token endpoint)
      const orderCall = mockFetch.mock.calls.find(
        ([url]) => url.includes('/product-orders/search')
      );
      expect(orderCall).toBeTruthy();
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('oauth2.0/token')) {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              status: 200,
              data: {
                access_token: 'test-token',
                expires_in: 3600,
                token_type: 'Bearer',
              },
            })
          );
        }
        return Promise.resolve(
          createMockResponse({
            ok: true,
            status: 200,
            data: { data: { contents: [], pageInfo: {} } },
          })
        );
      });

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
