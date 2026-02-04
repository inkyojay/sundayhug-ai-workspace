/**
 * 썬데이허그 AI 에이전트 시스템 - Order Agent (주문 에이전트)
 * LANE 1 - Core Operations
 *
 * 역할: 주문 수집, 배송 관리, 반품/교환 처리를 총괄하는 메인 에이전트
 */

import { BaseAgent } from '../base/BaseAgent';
import { SubAgent, ParentAgentRef, SubAgentConfig } from '../base/SubAgent';
import agentRegistry from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentStatus,
  ApprovalLevel,
  TaskPayload,
  TaskResult,
  TaskStatus,
  SalesChannel,
  NotificationPriority,
} from '../../types';
import {
  OrderAgentTaskType,
  OrderAgentConfig,
  OrderCollectionResult,
  TrackingNumberRequest,
  TrackingNumberResult,
  ReturnExchangeRequest,
  ChannelApiStatus,
} from './types';

// 서브에이전트 imports
import { OrderCollectorSubAgent } from './sub/OrderCollectorSubAgent';
import { ShippingManagerSubAgent } from './sub/ShippingManagerSubAgent';
import { ReturnExchangeSubAgent } from './sub/ReturnExchangeSubAgent';

/**
 * Order Agent 실행 결과
 */
interface OrderAgentResult {
  collectionsCompleted?: OrderCollectionResult[];
  trackingRegistered?: TrackingNumberResult[];
  returnsProcessed?: ReturnExchangeRequest[];
  channelStatuses?: ChannelApiStatus[];
}

/**
 * OrderAgent 클래스
 * 주문 관련 모든 작업을 조율하는 메인 에이전트
 */
export class OrderAgent extends BaseAgent {
  private orderConfig: OrderAgentConfig;

  // 서브에이전트
  private orderCollector!: OrderCollectorSubAgent;
  private shippingManager!: ShippingManagerSubAgent;
  private returnExchange!: ReturnExchangeSubAgent;

  // 작업 결과 저장
  private pendingResults: TaskResult[] = [];

  constructor(config?: Partial<AgentConfig>, orderConfig?: Partial<OrderAgentConfig>) {
    const defaultConfig: AgentConfig = {
      id: 'order-agent',
      name: '주문 에이전트',
      description: '쿠팡/스마트스토어/자사몰 주문 수집, 배송 관리, 반품/교환 처리를 담당합니다.',
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 300000, // 5분
      approvalLevel: ApprovalLevel.LOW,
      schedule: '*/5 * * * *', // 5분마다 실행
      ...config,
    };

    super(defaultConfig);

    this.orderConfig = {
      collectionConfig: {
        channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
        syncInterval: 5,
        batchSize: 100,
        lookbackHours: 24,
      },
      enabledChannels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
      autoRegisterTracking: true,
      autoApproveReturn: {
        enabled: true,
        maxAmount: 50000,
        allowedReasons: [],
      },
      notificationSettings: {
        notifyOnNewOrder: true,
        notifyOnShippingUpdate: false,
        notifyOnReturnRequest: true,
      },
      ...orderConfig,
    };
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing OrderAgent and sub-agents...');

    // 부모 참조 생성
    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
    };

    // 서브에이전트 초기화
    this.orderCollector = new OrderCollectorSubAgent(
      {
        id: 'order-collector-sub',
        name: '주문수집 서브에이전트',
        description: '채널별 주문 데이터 수집',
        enabled: true,
        maxRetries: 3,
        retryDelay: 3000,
        timeout: 120000,
        approvalLevel: ApprovalLevel.NONE,
        parentRef,
      },
      this.orderConfig.collectionConfig
    );

    this.shippingManager = new ShippingManagerSubAgent({
      id: 'shipping-manager-sub',
      name: '배송관리 서브에이전트',
      description: '송장등록, 배송추적, 배송완료 처리',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.NONE,
      parentRef,
    });

    this.returnExchange = new ReturnExchangeSubAgent({
      id: 'return-exchange-sub',
      name: '반품교환 서브에이전트',
      description: '반품접수, 수거요청, 환불처리',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.MEDIUM,
      parentRef,
    });

    // AgentRegistry에 서브에이전트 등록
    agentRegistry.register(this.orderCollector, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['order', 'collection', 'lane1'],
    });

    agentRegistry.register(this.shippingManager, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['order', 'shipping', 'lane1'],
    });

    agentRegistry.register(this.returnExchange, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['order', 'return', 'exchange', 'lane1'],
    });

    this.logger.info('OrderAgent initialization completed');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up OrderAgent...');

    // 서브에이전트 정리
    await agentRegistry.unregister(this.orderCollector?.getId());
    await agentRegistry.unregister(this.shippingManager?.getId());
    await agentRegistry.unregister(this.returnExchange?.getId());

    this.pendingResults = [];
    this.logger.info('OrderAgent cleanup completed');
  }

  /**
   * 에이전트 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<OrderAgentResult>> {
    const startTime = Date.now();
    const result: OrderAgentResult = {};

    try {
      // 1. 주문 수집
      this.logger.info('Starting order collection...');
      const collectionResults = await this.collectOrders(context);
      result.collectionsCompleted = collectionResults;

      // 새 주문이 있으면 알림
      const totalNewOrders = collectionResults.reduce((sum, r) => sum + r.newOrders, 0);
      if (totalNewOrders > 0 && this.orderConfig.notificationSettings.notifyOnNewOrder) {
        await this.sendNotification(
          NotificationPriority.MEDIUM,
          'operations',
          '새 주문 알림',
          `${totalNewOrders}건의 새 주문이 수집되었습니다.`
        );
      }

      // 2. 배송 상태 업데이트
      this.logger.info('Updating shipping statuses...');
      await this.updateShippingStatuses(context);

      // 3. 반품/교환 요청 처리
      this.logger.info('Processing return/exchange requests...');
      const returnResults = await this.processReturnRequests(context);
      result.returnsProcessed = returnResults;

      // 4. 채널 API 상태 확인
      result.channelStatuses = await this.checkChannelStatuses();

      return this.createSuccessResult(result, startTime, {
        processed: totalNewOrders,
      });
    } catch (error) {
      this.logger.error('OrderAgent execution failed', error as Error);
      return this.createErrorResult(
        'ORDER_AGENT_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 주문 수집 실행
   */
  private async collectOrders(context: AgentContext): Promise<OrderCollectionResult[]> {
    const results: OrderCollectionResult[] = [];

    for (const channel of this.orderConfig.enabledChannels) {
      const task: TaskPayload = {
        taskId: `collect-${channel}-${Date.now()}`,
        type: 'collect_orders',
        priority: 7,
        data: { channel },
        createdAt: new Date(),
        retryCount: 0,
      };

      const taskResult = await this.orderCollector.executeTask<{ channel: SalesChannel }, OrderCollectionResult>(task);

      if (taskResult.data) {
        results.push(taskResult.data);
      }
    }

    return results;
  }

  /**
   * 배송 상태 업데이트
   */
  private async updateShippingStatuses(context: AgentContext): Promise<void> {
    const task: TaskPayload = {
      taskId: `update-shipping-${Date.now()}`,
      type: 'update_shipping_status',
      priority: 5,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    await this.shippingManager.executeTask(task);
  }

  /**
   * 반품/교환 요청 처리
   */
  private async processReturnRequests(context: AgentContext): Promise<ReturnExchangeRequest[]> {
    const task: TaskPayload = {
      taskId: `process-returns-${Date.now()}`,
      type: 'process_pending_returns',
      priority: 6,
      data: { autoApproveConfig: this.orderConfig.autoApproveReturn },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.returnExchange.executeTask<unknown, ReturnExchangeRequest[]>(task);
    return result.data || [];
  }

  /**
   * 채널 API 상태 확인
   */
  private async checkChannelStatuses(): Promise<ChannelApiStatus[]> {
    const statuses: ChannelApiStatus[] = [];

    for (const channel of this.orderConfig.enabledChannels) {
      statuses.push({
        channel,
        connected: true, // 실제로는 API 연결 테스트 수행
        lastSync: new Date(),
        errorCount: 0,
      });
    }

    return statuses;
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.pendingResults.push(result);
    this.logger.debug('Sub-agent result received', {
      taskId: result.taskId,
      status: result.status,
    });
  }

  /**
   * 서브에이전트 진행 상황 처리
   */
  private async handleSubAgentProgress(progress: { percentage: number; message?: string }): Promise<void> {
    this.logger.debug('Sub-agent progress', progress);
  }

  /**
   * 서브에이전트 에러 처리
   */
  private async handleSubAgentError(error: Error, context?: Record<string, unknown>): Promise<void> {
    this.logger.error('Sub-agent error', error, context);

    // 중요한 에러는 알림 발송
    await this.sendNotification(
      NotificationPriority.HIGH,
      'operations',
      '서브에이전트 오류',
      `에러: ${error.message}`
    );
  }

  // ===========================================================================
  // 공개 API 메서드
  // ===========================================================================

  /**
   * 특정 채널의 주문 수집
   */
  async collectOrdersFromChannel(channel: SalesChannel): Promise<OrderCollectionResult> {
    const task: TaskPayload = {
      taskId: `manual-collect-${channel}-${Date.now()}`,
      type: 'collect_orders',
      priority: 8,
      data: { channel },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.orderCollector.executeTask<{ channel: SalesChannel }, OrderCollectionResult>(task);
    return result.data || {
      channel,
      success: false,
      ordersCollected: 0,
      newOrders: 0,
      updatedOrders: 0,
      failedOrders: 0,
      collectedAt: new Date(),
    };
  }

  /**
   * 송장 등록
   */
  async registerTrackingNumber(request: TrackingNumberRequest): Promise<TrackingNumberResult> {
    const task: TaskPayload = {
      taskId: `register-tracking-${request.orderId}-${Date.now()}`,
      type: 'register_tracking',
      priority: 7,
      data: request,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.shippingManager.executeTask<TrackingNumberRequest, TrackingNumberResult>(task);
    return result.data || {
      orderId: request.orderId,
      success: false,
      error: 'Failed to register tracking number',
    };
  }

  /**
   * 반품/교환 요청 처리
   */
  async processReturnExchange(request: ReturnExchangeRequest): Promise<ReturnExchangeRequest> {
    const task: TaskPayload = {
      taskId: `process-return-${request.id}-${Date.now()}`,
      type: 'process_return_request',
      priority: 6,
      data: request,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.returnExchange.executeTask<ReturnExchangeRequest, ReturnExchangeRequest>(task);
    return result.data || request;
  }

  /**
   * Order Agent 설정 조회
   */
  getOrderConfig(): OrderAgentConfig {
    return { ...this.orderConfig };
  }

  /**
   * Order Agent 설정 업데이트
   */
  updateOrderConfig(updates: Partial<OrderAgentConfig>): void {
    this.orderConfig = { ...this.orderConfig, ...updates };
    this.logger.info('OrderAgent config updated', updates);
  }
}

export default OrderAgent;
