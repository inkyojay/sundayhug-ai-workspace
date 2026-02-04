/**
 * 주문수집 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 쿠팡/스마트스토어/자사몰에서 주문 데이터를 수집합니다.
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  SalesChannel,
  BaseOrder,
  OrderStatus,
} from '../../../types';
import {
  OrderCollectionResult,
  OrderCollectionError,
  OrderCollectionConfig,
} from '../types';
import {
  ApiClientFactory,
  loadCredentialsFromEnv,
  CoupangApiClient,
  NaverApiClient,
  Cafe24ApiClient,
  CoupangOrderAdapter,
  NaverOrderAdapter,
  Cafe24OrderAdapter,
} from '../../../infrastructure/api';
import { featureFlags, FeatureFlag } from '../../../infrastructure/config/FeatureFlags';

/**
 * 수집 설정을 포함한 SubAgent 설정
 */
interface OrderCollectorConfig extends SubAgentConfig {
  collectionConfig?: OrderCollectionConfig;
}

/**
 * OrderCollectorSubAgent 클래스
 * 채널별 주문 수집을 담당하는 서브에이전트
 */
export class OrderCollectorSubAgent extends SubAgent {
  private collectionConfig: OrderCollectionConfig;
  private apiClientFactory: ApiClientFactory;
  private adapters: {
    coupang: CoupangOrderAdapter;
    naver: NaverOrderAdapter;
    cafe24: Cafe24OrderAdapter;
  };

  constructor(config: OrderCollectorConfig, collectionConfig?: OrderCollectionConfig) {
    super(config);

    this.collectionConfig = collectionConfig || {
      channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
      syncInterval: 5,
      batchSize: 100,
      lookbackHours: 24,
    };

    this.apiClientFactory = new ApiClientFactory();
    this.adapters = {
      coupang: new CoupangOrderAdapter(),
      naver: new NaverOrderAdapter(),
      cafe24: new Cafe24OrderAdapter(),
    };
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('OrderCollectorSubAgent initializing...');

    // 활성화된 채널에 대해 API 클라이언트 초기화
    for (const channel of this.collectionConfig.channels) {
      if (featureFlags.isRealApiEnabled(channel)) {
        const creds = loadCredentialsFromEnv(channel);
        if (creds) {
          try {
            this.apiClientFactory.createClient(creds);
            this.logger.info(`API client initialized for ${channel}`);
          } catch (error) {
            this.logger.warn(`Failed to initialize API client for ${channel}`, { error });
          }
        } else {
          this.logger.warn(`No credentials found for ${channel}`);
        }
      }
    }
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('OrderCollectorSubAgent cleanup...');
    this.apiClientFactory.clearAll();
    await this.cleanupSubAgent();
  }

  /**
   * 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<OrderCollectionResult>> {
    const startTime = Date.now();
    const data = context.data as { channel?: SalesChannel } | undefined;
    const channel = data?.channel;

    if (channel) {
      // 특정 채널 수집
      const result = await this.collectFromChannel(channel);
      return this.createSuccessResult(result, startTime);
    }

    // 모든 채널 수집
    const results: OrderCollectionResult[] = [];
    for (const ch of this.collectionConfig.channels) {
      const result = await this.collectFromChannel(ch);
      results.push(result);
    }

    // 합산 결과 생성
    const aggregatedResult: OrderCollectionResult = {
      channel: SalesChannel.MANUAL, // 복합 결과 표시
      success: results.every((r) => r.success),
      ordersCollected: results.reduce((sum, r) => sum + r.ordersCollected, 0),
      newOrders: results.reduce((sum, r) => sum + r.newOrders, 0),
      updatedOrders: results.reduce((sum, r) => sum + r.updatedOrders, 0),
      failedOrders: results.reduce((sum, r) => sum + r.failedOrders, 0),
      errors: results.flatMap((r) => r.errors || []),
      collectedAt: new Date(),
    };

    return this.createSuccessResult(aggregatedResult, startTime, {
      processed: aggregatedResult.ordersCollected,
      failed: aggregatedResult.failedOrders,
    });
  }

  /**
   * 채널별 주문 수집
   */
  private async collectFromChannel(channel: SalesChannel): Promise<OrderCollectionResult> {
    this.logger.info(`Collecting orders from ${channel}...`);

    try {
      // Feature Flag 확인
      if (!featureFlags.isRealApiEnabled(channel)) {
        this.logger.info(`Real API disabled for ${channel}, using simulation`);
        return await this.collectFromChannelSimulation(channel);
      }

      switch (channel) {
        case SalesChannel.COUPANG:
          return await this.collectFromCoupangReal();
        case SalesChannel.NAVER:
          return await this.collectFromNaverReal();
        case SalesChannel.CAFE24:
          return await this.collectFromCafe24Real();
        default:
          return await this.collectFromGenericChannel(channel);
      }
    } catch (error) {
      this.logger.error(`Failed to collect from ${channel}`, error as Error);
      return {
        channel,
        success: false,
        ordersCollected: 0,
        newOrders: 0,
        updatedOrders: 0,
        failedOrders: 0,
        errors: [
          {
            channelOrderId: 'N/A',
            errorCode: 'COLLECTION_ERROR',
            errorMessage: (error as Error).message,
            retryable: true,
          },
        ],
        collectedAt: new Date(),
      };
    }
  }

  /**
   * 쿠팡 실제 API 주문 수집
   */
  private async collectFromCoupangReal(): Promise<OrderCollectionResult> {
    this.logger.info('Connecting to Coupang API (Real)...');

    const client = this.apiClientFactory.getClient(SalesChannel.COUPANG) as CoupangApiClient;
    if (!client) {
      throw new Error('Coupang API client not initialized');
    }

    const lookbackTime = new Date(Date.now() - this.collectionConfig.lookbackHours * 60 * 60 * 1000);
    const now = new Date();

    // API에서 주문 조회
    const rawOrders = await client.getAllOrders(lookbackTime, now);

    // 표준 형식으로 변환
    const orders = this.adapters.coupang.toBaseOrders(rawOrders);

    // DB에 저장 및 신규/업데이트 분류
    const { newOrders, updatedOrders, failedOrders, errors } = await this.saveOrdersToDatabase(orders);

    this.logger.info(`Coupang collection completed`, {
      total: orders.length,
      newOrders,
      updatedOrders,
      failedOrders,
    });

    return {
      channel: SalesChannel.COUPANG,
      success: errors.length === 0,
      ordersCollected: orders.length,
      newOrders,
      updatedOrders,
      failedOrders,
      errors: errors.length > 0 ? errors : undefined,
      collectedAt: new Date(),
    };
  }

  /**
   * 네이버 실제 API 주문 수집
   */
  private async collectFromNaverReal(): Promise<OrderCollectionResult> {
    this.logger.info('Connecting to Naver Commerce API (Real)...');

    const client = this.apiClientFactory.getClient(SalesChannel.NAVER) as NaverApiClient;
    if (!client) {
      throw new Error('Naver API client not initialized');
    }

    const lookbackTime = new Date(Date.now() - this.collectionConfig.lookbackHours * 60 * 60 * 1000);
    const now = new Date();

    // API에서 주문 조회
    const rawOrders = await client.getAllOrders(lookbackTime, now);

    // 표준 형식으로 변환
    const orders = this.adapters.naver.toBaseOrders(rawOrders);

    // DB에 저장 및 신규/업데이트 분류
    const { newOrders, updatedOrders, failedOrders, errors } = await this.saveOrdersToDatabase(orders);

    this.logger.info(`Naver collection completed`, {
      total: orders.length,
      newOrders,
      updatedOrders,
      failedOrders,
    });

    return {
      channel: SalesChannel.NAVER,
      success: errors.length === 0,
      ordersCollected: orders.length,
      newOrders,
      updatedOrders,
      failedOrders,
      errors: errors.length > 0 ? errors : undefined,
      collectedAt: new Date(),
    };
  }

  /**
   * Cafe24 실제 API 주문 수집
   */
  private async collectFromCafe24Real(): Promise<OrderCollectionResult> {
    this.logger.info('Connecting to Cafe24 API (Real)...');

    const client = this.apiClientFactory.getClient(SalesChannel.CAFE24) as Cafe24ApiClient;
    if (!client) {
      throw new Error('Cafe24 API client not initialized');
    }

    const lookbackTime = new Date(Date.now() - this.collectionConfig.lookbackHours * 60 * 60 * 1000);
    const now = new Date();

    // API에서 주문 조회
    const rawOrders = await client.getAllOrders(lookbackTime, now);

    // 표준 형식으로 변환
    const orders = this.adapters.cafe24.toBaseOrders(rawOrders);

    // DB에 저장 및 신규/업데이트 분류
    const { newOrders, updatedOrders, failedOrders, errors } = await this.saveOrdersToDatabase(orders);

    this.logger.info(`Cafe24 collection completed`, {
      total: orders.length,
      newOrders,
      updatedOrders,
      failedOrders,
    });

    return {
      channel: SalesChannel.CAFE24,
      success: errors.length === 0,
      ordersCollected: orders.length,
      newOrders,
      updatedOrders,
      failedOrders,
      errors: errors.length > 0 ? errors : undefined,
      collectedAt: new Date(),
    };
  }

  /**
   * 시뮬레이션 모드 주문 수집 (Feature Flag가 꺼져있을 때)
   */
  private async collectFromChannelSimulation(channel: SalesChannel): Promise<OrderCollectionResult> {
    this.logger.info(`Simulating collection from ${channel}...`);
    await this.sleep(500);

    const newOrderCount = Math.floor(Math.random() * 10);
    const updatedOrderCount = Math.floor(Math.random() * 5);

    this.logger.info(`${channel} simulation completed`, {
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
    });

    return {
      channel,
      success: true,
      ordersCollected: newOrderCount + updatedOrderCount,
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
      failedOrders: 0,
      collectedAt: new Date(),
    };
  }

  /**
   * 일반 채널 주문 수집
   */
  private async collectFromGenericChannel(channel: SalesChannel): Promise<OrderCollectionResult> {
    this.logger.info(`Collecting from generic channel: ${channel}`);
    await this.sleep(300);

    return {
      channel,
      success: true,
      ordersCollected: 0,
      newOrders: 0,
      updatedOrders: 0,
      failedOrders: 0,
      collectedAt: new Date(),
    };
  }

  /**
   * 주문을 DB에 저장하고 결과 반환
   */
  private async saveOrdersToDatabase(
    orders: BaseOrder[]
  ): Promise<{
    newOrders: number;
    updatedOrders: number;
    failedOrders: number;
    errors: OrderCollectionError[];
  }> {
    let newOrders = 0;
    let updatedOrders = 0;
    let failedOrders = 0;
    const errors: OrderCollectionError[] = [];

    const db = this.getDatabase('orders');

    for (const order of orders) {
      try {
        // 기존 주문 확인
        const { data: existing } = await db
          .from('orders')
          .select('id, status')
          .eq('channel_order_id', order.channelOrderId)
          .eq('channel', order.channel)
          .single();

        if (existing) {
          // 업데이트
          const { error } = await db
            .from('orders')
            .update({
              status: order.status,
              updated_at: new Date().toISOString(),
              metadata: order.metadata,
            })
            .eq('id', existing.id);

          if (error) {
            throw error;
          }
          updatedOrders++;
        } else {
          // 신규 삽입
          const { error } = await db.from('orders').insert({
            id: order.id,
            channel_order_id: order.channelOrderId,
            channel: order.channel,
            status: order.status,
            ordered_at: order.orderedAt.toISOString(),
            customer_name: order.customer.name,
            customer_phone: order.customer.phone,
            customer_email: order.customer.email,
            shipping_receiver_name: order.shipping.receiverName,
            shipping_receiver_phone: order.shipping.receiverPhone,
            shipping_zip_code: order.shipping.zipCode,
            shipping_address: order.shipping.address,
            shipping_address_detail: order.shipping.addressDetail,
            shipping_memo: order.shipping.memo,
            total_amount: order.payment.totalAmount,
            shipping_fee: order.payment.shippingFee,
            discount_amount: order.payment.discountAmount,
            paid_at: order.payment.paidAt?.toISOString(),
            items: order.items,
            metadata: order.metadata,
            created_at: new Date().toISOString(),
          });

          if (error) {
            throw error;
          }
          newOrders++;
        }
      } catch (error) {
        failedOrders++;
        errors.push({
          channelOrderId: order.channelOrderId,
          errorCode: 'DB_SAVE_ERROR',
          errorMessage: (error as Error).message,
          retryable: true,
        });
        this.logger.error(`Failed to save order ${order.channelOrderId}`, error as Error);
      }
    }

    return { newOrders, updatedOrders, failedOrders, errors };
  }

  /**
   * 주문 데이터 정규화 (레거시 지원)
   */
  private normalizeOrder(channelOrder: Record<string, unknown>, channel: SalesChannel): Partial<BaseOrder> {
    // 채널별 주문 데이터를 통합 형식으로 변환
    const normalized: Partial<BaseOrder> = {
      channel,
      status: OrderStatus.PENDING,
      orderedAt: new Date(),
      metadata: {
        originalData: channelOrder,
      },
    };

    return normalized;
  }

  /**
   * 현재 진행 상황 조회
   */
  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'collecting',
      message: `채널별 주문 수집 중...`,
    };
  }
}

export default OrderCollectorSubAgent;
