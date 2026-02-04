/**
 * 쿠팡 API 클라이언트
 * 쿠팡 파트너스 API 연동
 */

import { ApiClient } from '../../core/ApiClient';
import { ChannelOrdersResponse } from '../../core/types';
import { SalesChannel } from '../../../../types';
import { CoupangAuthStrategy } from './CoupangAuthStrategy';
import {
  CoupangCredentials,
  CoupangRawOrder,
  CoupangOrderStatus,
  CoupangApiResponse,
  CoupangOrderListResponse,
} from './types';

const COUPANG_API_BASE_URL = 'https://api-gateway.coupang.com';
const COUPANG_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 분당 60회
  maxWaitMs: 5000,
};

export interface CoupangOrdersOptions {
  status?: CoupangOrderStatus;
  maxPerPage?: number;
  nextToken?: string;
}

/**
 * 쿠팡 API 클라이언트
 */
export class CoupangApiClient extends ApiClient {
  private readonly vendorId: string;

  constructor(credentials: CoupangCredentials) {
    const authStrategy = new CoupangAuthStrategy(credentials);

    super({
      baseUrl: COUPANG_API_BASE_URL,
      channel: SalesChannel.COUPANG,
      timeout: 30000,
      maxRetries: 3,
      rateLimiter: COUPANG_RATE_LIMIT,
      authStrategy,
    });

    this.vendorId = credentials.vendorId;
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(
    fromDate: Date,
    toDate: Date,
    options?: CoupangOrdersOptions
  ): Promise<ChannelOrdersResponse<CoupangRawOrder>> {
    const fromDateStr = this.formatDate(fromDate);
    const toDateStr = this.formatDate(toDate);

    const queryParams: Record<string, string | number> = {
      createdAtFrom: fromDateStr,
      createdAtTo: toDateStr,
    };

    if (options?.status) {
      queryParams.status = options.status;
    }

    if (options?.maxPerPage) {
      queryParams.maxPerPage = options.maxPerPage;
    }

    if (options?.nextToken) {
      queryParams.nextToken = options.nextToken;
    }

    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/ordersheets`;

    const response = await this.get<CoupangApiResponse<CoupangRawOrder[]> & { nextToken?: string }>(
      path,
      { query: queryParams }
    );

    const data = response.data;
    const orders = data.data || [];
    const nextToken = data.nextToken;

    return {
      orders,
      pagination: {
        nextToken,
        hasMore: !!nextToken,
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
    options?: Omit<CoupangOrdersOptions, 'nextToken'>
  ): Promise<CoupangRawOrder[]> {
    const allOrders: CoupangRawOrder[] = [];
    let nextToken: string | undefined;

    do {
      const result = await this.getOrders(fromDate, toDate, {
        ...options,
        nextToken,
        maxPerPage: options?.maxPerPage || 50,
      });

      allOrders.push(...result.orders);
      nextToken = result.pagination?.nextToken;
    } while (nextToken);

    return allOrders;
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(shipmentBoxId: number): Promise<CoupangRawOrder> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/ordersheets/${shipmentBoxId}`;

    const response = await this.get<CoupangApiResponse<CoupangRawOrder>>(path);
    return response.data.data;
  }

  /**
   * 배송 상태 업데이트
   */
  async updateShipment(
    shipmentBoxId: number,
    invoiceNumber: string,
    deliveryCompanyCode: string
  ): Promise<boolean> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/ordersheets/${shipmentBoxId}/invoices`;

    const body = {
      vendorId: this.vendorId,
      invoiceNumber,
      deliveryCompanyCode,
    };

    try {
      await this.put<CoupangApiResponse<unknown>>(path, { body });
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
      // 오늘 날짜로 주문 조회 시도
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      await this.getOrders(yesterday, today, { maxPerPage: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 날짜 포맷 (yyyy-MM-dd)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default CoupangApiClient;
