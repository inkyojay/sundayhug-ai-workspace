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

  constructor(config: OrderCollectorConfig, collectionConfig?: OrderCollectionConfig) {
    super(config);

    this.collectionConfig = collectionConfig || {
      channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
      syncInterval: 5,
      batchSize: 100,
      lookbackHours: 24,
    };
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('OrderCollectorSubAgent initializing...');
    // 채널 API 연결 확인 등 초기화 작업
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('OrderCollectorSubAgent cleanup...');
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
      switch (channel) {
        case SalesChannel.COUPANG:
          return await this.collectFromCoupang();
        case SalesChannel.NAVER:
          return await this.collectFromNaver();
        case SalesChannel.CAFE24:
          return await this.collectFromCafe24();
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
   * 쿠팡 주문 수집
   */
  private async collectFromCoupang(): Promise<OrderCollectionResult> {
    // TODO: 실제 쿠팡 API 연동 구현
    // 현재는 시뮬레이션 데이터 반환

    this.logger.info('Connecting to Coupang API...');

    // 시뮬레이션: API 호출 시간
    await this.sleep(500);

    const lookbackTime = new Date(Date.now() - this.collectionConfig.lookbackHours * 60 * 60 * 1000);

    // DB에서 기존 주문 확인 (실제 구현 시)
    const db = this.getDatabase('orders');

    // 시뮬레이션 결과
    const newOrderCount = Math.floor(Math.random() * 10);
    const updatedOrderCount = Math.floor(Math.random() * 5);

    this.logger.info(`Coupang collection completed`, {
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
    });

    return {
      channel: SalesChannel.COUPANG,
      success: true,
      ordersCollected: newOrderCount + updatedOrderCount,
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
      failedOrders: 0,
      collectedAt: new Date(),
    };
  }

  /**
   * 네이버 스마트스토어 주문 수집
   */
  private async collectFromNaver(): Promise<OrderCollectionResult> {
    // TODO: 실제 네이버 커머스 API 연동 구현

    this.logger.info('Connecting to Naver Commerce API...');
    await this.sleep(500);

    const newOrderCount = Math.floor(Math.random() * 15);
    const updatedOrderCount = Math.floor(Math.random() * 8);

    this.logger.info(`Naver collection completed`, {
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
    });

    return {
      channel: SalesChannel.NAVER,
      success: true,
      ordersCollected: newOrderCount + updatedOrderCount,
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
      failedOrders: 0,
      collectedAt: new Date(),
    };
  }

  /**
   * Cafe24 주문 수집
   */
  private async collectFromCafe24(): Promise<OrderCollectionResult> {
    // TODO: 실제 Cafe24 API 연동 구현

    this.logger.info('Connecting to Cafe24 API...');
    await this.sleep(500);

    const newOrderCount = Math.floor(Math.random() * 8);
    const updatedOrderCount = Math.floor(Math.random() * 3);

    this.logger.info(`Cafe24 collection completed`, {
      newOrders: newOrderCount,
      updatedOrders: updatedOrderCount,
    });

    return {
      channel: SalesChannel.CAFE24,
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
   * 주문 데이터 정규화
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
