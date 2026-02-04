/**
 * 네이버 커머스 API 클라이언트
 * 네이버 스마트스토어 API 연동
 */

import { ApiClient } from '../../core/ApiClient';
import { ChannelOrdersResponse } from '../../core/types';
import { SalesChannel } from '../../../../types';
import { NaverAuthStrategy } from './NaverAuthStrategy';
import {
  NaverCredentials,
  NaverRawOrder,
  NaverOrderStatus,
  NaverApiResponse,
  NaverOrderListResponse,
} from './types';

const NAVER_API_BASE_URL = 'https://api.commerce.naver.com';
const NAVER_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 1000, // 초당 10회
  maxWaitMs: 5000,
};

export interface NaverOrdersOptions {
  productOrderStatus?: NaverOrderStatus[];
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * 네이버 커머스 API 클라이언트
 */
export class NaverApiClient extends ApiClient {
  private readonly smartStoreId?: string;

  constructor(credentials: NaverCredentials) {
    const authStrategy = new NaverAuthStrategy(credentials);

    super({
      baseUrl: NAVER_API_BASE_URL,
      channel: SalesChannel.NAVER,
      timeout: 30000,
      maxRetries: 3,
      rateLimiter: NAVER_RATE_LIMIT,
      authStrategy,
    });

    this.smartStoreId = credentials.smartStoreId;
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(
    fromDate: Date,
    toDate: Date,
    options?: NaverOrdersOptions
  ): Promise<ChannelOrdersResponse<NaverRawOrder>> {
    const fromDateStr = this.formatDateTime(fromDate);
    const toDateStr = this.formatDateTime(toDate);

    const queryParams: Record<string, string | number> = {
      orderDateFrom: fromDateStr,
      orderDateTo: toDateStr,
    };

    if (options?.productOrderStatus && options.productOrderStatus.length > 0) {
      queryParams.productOrderStatuses = options.productOrderStatus.join(',');
    }

    if (options?.page !== undefined) {
      queryParams.page = options.page;
    }

    if (options?.size) {
      queryParams.size = options.size;
    }

    if (options?.sort) {
      queryParams.sort = options.sort;
    }

    const path = '/external/v1/pay-order/seller/product-orders/search';

    const response = await this.get<NaverApiResponse<NaverOrderListResponse>>(path, {
      query: queryParams,
    });

    const data = response.data.data;
    const orders = data.contents || [];
    const pageInfo = data.pageInfo;

    return {
      orders,
      pagination: {
        hasMore: pageInfo ? pageInfo.current < pageInfo.totalPages - 1 : false,
        totalCount: pageInfo?.totalElements,
      },
    };
  }

  /**
   * 전체 주문 조회 (페이지네이션 자동 처리)
   */
  async getAllOrders(
    fromDate: Date,
    toDate: Date,
    options?: Omit<NaverOrdersOptions, 'page'>
  ): Promise<NaverRawOrder[]> {
    const allOrders: NaverRawOrder[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getOrders(fromDate, toDate, {
        ...options,
        page,
        size: options?.size || 50,
      });

      allOrders.push(...result.orders);
      hasMore = result.pagination?.hasMore || false;
      page++;
    }

    return allOrders;
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(productOrderId: string): Promise<NaverRawOrder> {
    const path = `/external/v1/pay-order/seller/product-orders/${productOrderId}`;

    const response = await this.get<NaverApiResponse<NaverRawOrder>>(path);
    return response.data.data;
  }

  /**
   * 배송 상태 업데이트 (발송 처리)
   */
  async updateShipment(
    productOrderIds: string[],
    trackingNumber: string,
    deliveryCompanyCode: string
  ): Promise<boolean> {
    const path = '/external/v1/pay-order/seller/product-orders/dispatch';

    const body = {
      dispatchProductOrders: productOrderIds.map((id) => ({
        productOrderId: id,
        deliveryMethod: 'DELIVERY',
        deliveryCompanyCode,
        trackingNumber,
        dispatchDate: new Date().toISOString(),
      })),
    };

    try {
      await this.post<NaverApiResponse<unknown>>(path, { body });
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

      await this.getOrders(yesterday, today, { size: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 날짜/시간 포맷 (ISO 8601)
   */
  private formatDateTime(date: Date): string {
    return date.toISOString();
  }
}

export default NaverApiClient;
