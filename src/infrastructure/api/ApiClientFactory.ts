/**
 * API 클라이언트 팩토리
 * 채널별 API 클라이언트 생성 및 관리
 */

import { SalesChannel, BaseOrder } from '../../types';
import { ApiClient, ChannelOrdersResponse } from './core';
import { CoupangApiClient, CoupangCredentials, CoupangOrderAdapter } from './channels/coupang';
import { NaverApiClient, NaverCredentials, NaverOrderAdapter } from './channels/naver';
import { Cafe24ApiClient, Cafe24Credentials, Cafe24OrderAdapter } from './channels/cafe24';
import { systemLogger } from '../../utils/logger';

/**
 * 채널 자격 증명 유니온 타입
 */
export type ChannelCredentials =
  | { channel: SalesChannel.COUPANG; credentials: CoupangCredentials }
  | { channel: SalesChannel.NAVER; credentials: NaverCredentials }
  | { channel: SalesChannel.CAFE24; credentials: Cafe24Credentials };

/**
 * 환경 변수에서 자격 증명 로드
 */
export function loadCredentialsFromEnv(channel: SalesChannel): ChannelCredentials | null {
  switch (channel) {
    case SalesChannel.COUPANG:
      if (!process.env.COUPANG_VENDOR_ID || !process.env.COUPANG_ACCESS_KEY || !process.env.COUPANG_SECRET_KEY) {
        return null;
      }
      return {
        channel: SalesChannel.COUPANG,
        credentials: {
          vendorId: process.env.COUPANG_VENDOR_ID,
          accessKey: process.env.COUPANG_ACCESS_KEY,
          secretKey: process.env.COUPANG_SECRET_KEY,
        },
      };

    case SalesChannel.NAVER:
      if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
        return null;
      }
      return {
        channel: SalesChannel.NAVER,
        credentials: {
          clientId: process.env.NAVER_CLIENT_ID,
          clientSecret: process.env.NAVER_CLIENT_SECRET,
          smartStoreId: process.env.NAVER_SMARTSTORE_ID,
        },
      };

    case SalesChannel.CAFE24:
      if (!process.env.CAFE24_MALL_ID || !process.env.CAFE24_CLIENT_ID || !process.env.CAFE24_CLIENT_SECRET) {
        return null;
      }
      return {
        channel: SalesChannel.CAFE24,
        credentials: {
          mallId: process.env.CAFE24_MALL_ID,
          clientId: process.env.CAFE24_CLIENT_ID,
          clientSecret: process.env.CAFE24_CLIENT_SECRET,
          accessToken: process.env.CAFE24_ACCESS_TOKEN,
          refreshToken: process.env.CAFE24_REFRESH_TOKEN,
          tokenExpiresAt: process.env.CAFE24_TOKEN_EXPIRES_AT
            ? new Date(process.env.CAFE24_TOKEN_EXPIRES_AT)
            : undefined,
        },
      };

    default:
      return null;
  }
}

/**
 * API 클라이언트 팩토리
 */
export class ApiClientFactory {
  private clients: Map<SalesChannel, ApiClient> = new Map();
  private adapters: Map<SalesChannel, CoupangOrderAdapter | NaverOrderAdapter | Cafe24OrderAdapter> = new Map();

  /**
   * 채널별 API 클라이언트 생성
   */
  createClient(channelCreds: ChannelCredentials): ApiClient {
    const { channel, credentials } = channelCreds;

    // 이미 생성된 클라이언트가 있으면 반환
    if (this.clients.has(channel)) {
      return this.clients.get(channel)!;
    }

    let client: ApiClient;
    let adapter: CoupangOrderAdapter | NaverOrderAdapter | Cafe24OrderAdapter;

    switch (channel) {
      case SalesChannel.COUPANG:
        client = new CoupangApiClient(credentials as CoupangCredentials);
        adapter = new CoupangOrderAdapter();
        break;

      case SalesChannel.NAVER:
        client = new NaverApiClient(credentials as NaverCredentials);
        adapter = new NaverOrderAdapter();
        break;

      case SalesChannel.CAFE24:
        client = new Cafe24ApiClient(credentials as Cafe24Credentials);
        adapter = new Cafe24OrderAdapter();
        break;

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }

    this.clients.set(channel, client);
    this.adapters.set(channel, adapter);

    systemLogger.info(`API client created for ${channel}`);
    return client;
  }

  /**
   * 채널에서 주문 수집 및 표준 형식으로 변환
   */
  async collectOrders(
    channel: SalesChannel,
    fromDate: Date,
    toDate: Date
  ): Promise<BaseOrder[]> {
    const client = this.clients.get(channel);
    const adapter = this.adapters.get(channel);

    if (!client || !adapter) {
      throw new Error(`Client not initialized for channel: ${channel}`);
    }

    let rawOrders: unknown[] = [];

    switch (channel) {
      case SalesChannel.COUPANG: {
        const coupangClient = client as CoupangApiClient;
        rawOrders = await coupangClient.getAllOrders(fromDate, toDate);
        return (adapter as CoupangOrderAdapter).toBaseOrders(rawOrders as never[]);
      }

      case SalesChannel.NAVER: {
        const naverClient = client as NaverApiClient;
        rawOrders = await naverClient.getAllOrders(fromDate, toDate);
        return (adapter as NaverOrderAdapter).toBaseOrders(rawOrders as never[]);
      }

      case SalesChannel.CAFE24: {
        const cafe24Client = client as Cafe24ApiClient;
        rawOrders = await cafe24Client.getAllOrders(fromDate, toDate);
        return (adapter as Cafe24OrderAdapter).toBaseOrders(rawOrders as never[]);
      }

      default:
        throw new Error(`Unsupported channel for order collection: ${channel}`);
    }
  }

  /**
   * 클라이언트 조회
   */
  getClient(channel: SalesChannel): ApiClient | undefined {
    return this.clients.get(channel);
  }

  /**
   * 연결 테스트
   */
  async testConnection(channel: SalesChannel): Promise<boolean> {
    const client = this.clients.get(channel);
    if (!client) {
      return false;
    }
    return client.testConnection();
  }

  /**
   * 모든 클라이언트 초기화
   */
  clearAll(): void {
    this.clients.clear();
    this.adapters.clear();
  }
}

// 싱글톤 인스턴스
export const apiClientFactory = new ApiClientFactory();

export default ApiClientFactory;
