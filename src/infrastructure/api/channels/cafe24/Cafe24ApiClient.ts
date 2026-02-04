/**
 * Cafe24 API 클라이언트
 * Cafe24 쇼핑몰 API 연동
 */

import { ApiClient } from '../../core/ApiClient';
import { ChannelOrdersResponse } from '../../core/types';
import { SalesChannel } from '../../../../types';
import { Cafe24AuthStrategy } from './Cafe24AuthStrategy';
import {
  Cafe24Credentials,
  Cafe24RawOrder,
  Cafe24OrderStatus,
  Cafe24ApiResponse,
} from './types';

const CAFE24_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 분당 100회
  maxWaitMs: 5000,
};

export interface Cafe24OrdersOptions {
  orderStatus?: Cafe24OrderStatus[];
  limit?: number;
  offset?: number;
}

/**
 * Cafe24 API 클라이언트
 */
export class Cafe24ApiClient extends ApiClient {
  private readonly mallId: string;

  constructor(credentials: Cafe24Credentials) {
    const authStrategy = new Cafe24AuthStrategy(credentials);

    super({
      baseUrl: authStrategy.getApiBaseUrl(),
      channel: SalesChannel.CAFE24,
      timeout: 30000,
      maxRetries: 3,
      rateLimiter: CAFE24_RATE_LIMIT,
      authStrategy,
    });

    this.mallId = credentials.mallId;
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(
    fromDate: Date,
    toDate: Date,
    options?: Cafe24OrdersOptions
  ): Promise<ChannelOrdersResponse<Cafe24RawOrder>> {
    const fromDateStr = this.formatDate(fromDate);
    const toDateStr = this.formatDate(toDate);

    const queryParams: Record<string, string | number> = {
      start_date: fromDateStr,
      end_date: toDateStr,
      embed: 'items,buyer,receiver,shipping',
    };

    if (options?.orderStatus && options.orderStatus.length > 0) {
      queryParams.order_status = options.orderStatus.join(',');
    }

    if (options?.limit) {
      queryParams.limit = options.limit;
    }

    if (options?.offset !== undefined) {
      queryParams.offset = options.offset;
    }

    const path = '/api/v2/admin/orders';

    const response = await this.get<Cafe24ApiResponse<Cafe24RawOrder>>(path, {
      query: queryParams,
    });

    const data = response.data;
    const orders = data.orders || [];
    const hasNextPage = data.links?.some((link) => link.rel === 'next') || false;

    return {
      orders,
      pagination: {
        hasMore: hasNextPage,
        totalCount: orders.length,
      },
    };
  }

  /**
   * 전체 주문 조회 (페이지네이션 자동 처리)
   */
  async getAllOrders(
    fromDate: Date,
    toDate: Date,
    options?: Omit<Cafe24OrdersOptions, 'offset'>
  ): Promise<Cafe24RawOrder[]> {
    const allOrders: Cafe24RawOrder[] = [];
    let offset = 0;
    let hasMore = true;
    const limit = options?.limit || 100;

    while (hasMore) {
      const result = await this.getOrders(fromDate, toDate, {
        ...options,
        offset,
        limit,
      });

      allOrders.push(...result.orders);
      hasMore = result.pagination?.hasMore || false;
      offset += limit;
    }

    return allOrders;
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(orderId: string): Promise<Cafe24RawOrder> {
    const path = `/api/v2/admin/orders/${orderId}`;

    const response = await this.get<Cafe24ApiResponse<Cafe24RawOrder>>(path, {
      query: { embed: 'items,buyer,receiver,shipping' },
    });

    if (!response.data.order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return response.data.order;
  }

  /**
   * 배송 상태 업데이트 (발송 처리)
   */
  async updateShipment(
    orderId: string,
    trackingNumber: string,
    shippingCompanyCode: string
  ): Promise<boolean> {
    const path = `/api/v2/admin/orders/${orderId}/shipments`;

    const body = {
      request: {
        shipping_company_code: shippingCompanyCode,
        tracking_no: trackingNumber,
        status: 'T', // T: 발송처리
      },
    };

    try {
      await this.post<Cafe24ApiResponse<unknown>>(path, { body });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      await this.getOrders(yesterday, today, { limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mall ID 조회
   */
  getMallId(): string {
    return this.mallId;
  }

  /**
   * 날짜 포맷 (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default Cafe24ApiClient;
