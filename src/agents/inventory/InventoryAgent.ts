/**
 * 썬데이허그 AI 에이전트 시스템 - Inventory Agent (재고 에이전트)
 * LANE 1 - Core Operations
 *
 * 역할: 재고 동기화, 발주 관리, 원가 분석을 총괄하는 메인 에이전트
 */

import { BaseAgent } from '../base/BaseAgent';
import { SubAgent, ParentAgentRef, SubAgentConfig } from '../base/SubAgent';
import agentRegistry from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  ApprovalLevel,
  TaskPayload,
  TaskResult,
  SalesChannel,
  NotificationPriority,
} from '../../types';
import {
  InventoryAgentConfig,
  StockSyncResult,
  PurchaseOrderSuggestion,
  PurchaseOrder,
  MarginAnalysis,
  StockInfo,
  StockStatus,
} from './types';

// 서브에이전트 imports
import { StockSyncSubAgent } from './sub/StockSyncSubAgent';
import { PurchaseOrderSubAgent } from './sub/PurchaseOrderSubAgent';
import { CostAnalyzerSubAgent } from './sub/CostAnalyzerSubAgent';

/**
 * Inventory Agent 실행 결과
 */
interface InventoryAgentResult {
  stockSyncResults?: StockSyncResult[];
  lowStockAlerts?: StockInfo[];
  purchaseOrderSuggestions?: PurchaseOrderSuggestion[];
  marginAnalysis?: MarginAnalysis[];
}

/**
 * InventoryAgent 클래스
 * 재고 관련 모든 작업을 조율하는 메인 에이전트
 */
export class InventoryAgent extends BaseAgent {
  private inventoryConfig: InventoryAgentConfig;

  // 서브에이전트
  private stockSync!: StockSyncSubAgent;
  private purchaseOrder!: PurchaseOrderSubAgent;
  private costAnalyzer!: CostAnalyzerSubAgent;

  constructor(config?: Partial<AgentConfig>, inventoryConfig?: Partial<InventoryAgentConfig>) {
    const defaultConfig: AgentConfig = {
      id: 'inventory-agent',
      name: '재고 에이전트',
      description: '채널별 재고 동기화, 발주 관리, 원가 분석을 담당합니다.',
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 300000,
      approvalLevel: ApprovalLevel.MEDIUM,
      schedule: '*/10 * * * *', // 10분마다 실행
      ...config,
    };

    super(defaultConfig);

    this.inventoryConfig = {
      syncConfig: {
        channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
        syncInterval: 10,
        batchSize: 100,
      },
      alertConfig: {
        lowStockThresholdPercent: 20,
        notifyOnLowStock: true,
        notifyOnOutOfStock: true,
        notifyOnOverstock: false,
      },
      reorderConfig: {
        autoSuggestEnabled: true,
        defaultLeadTimeDays: 7,
        safetyStockDays: 3,
        minReorderQuantity: 10,
      },
      marginConfig: {
        targetGrossMarginPercent: 40,
        minNetMarginPercent: 15,
        priceAdjustmentEnabled: false,
      },
      ...inventoryConfig,
    };
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing InventoryAgent and sub-agents...');

    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
    };

    // 재고동기화 서브에이전트
    this.stockSync = new StockSyncSubAgent(
      {
        id: 'stock-sync-sub',
        name: '재고동기화 서브에이전트',
        description: '채널별 재고 실시간 동기화',
        enabled: true,
        maxRetries: 3,
        retryDelay: 3000,
        timeout: 120000,
        approvalLevel: ApprovalLevel.NONE,
        parentRef,
      },
      this.inventoryConfig.syncConfig
    );

    // 발주관리 서브에이전트
    this.purchaseOrder = new PurchaseOrderSubAgent({
      id: 'purchase-order-sub',
      name: '발주관리 서브에이전트',
      description: '발주제안, 발주서생성, 입고추적',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.HIGH,
      parentRef,
    });

    // 원가분석 서브에이전트
    this.costAnalyzer = new CostAnalyzerSubAgent({
      id: 'cost-analyzer-sub',
      name: '원가분석 서브에이전트',
      description: '원가계산, 마진분석, 가격제안',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    // AgentRegistry에 서브에이전트 등록
    const subAgents = [
      { agent: this.stockSync, tags: ['inventory', 'stock', 'sync', 'lane1'] },
      { agent: this.purchaseOrder, tags: ['inventory', 'purchase', 'order', 'lane1'] },
      { agent: this.costAnalyzer, tags: ['inventory', 'cost', 'margin', 'lane1'] },
    ];

    for (const { agent, tags } of subAgents) {
      agentRegistry.register(agent, {
        type: 'sub',
        parentId: this.config.id,
        tags,
      });
    }

    this.logger.info('InventoryAgent initialization completed');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up InventoryAgent...');

    const subAgentIds = [
      this.stockSync?.getId(),
      this.purchaseOrder?.getId(),
      this.costAnalyzer?.getId(),
    ];

    for (const id of subAgentIds) {
      if (id) await agentRegistry.unregister(id);
    }

    this.logger.info('InventoryAgent cleanup completed');
  }

  /**
   * 에이전트 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<InventoryAgentResult>> {
    const startTime = Date.now();
    const result: InventoryAgentResult = {};

    try {
      // 1. 채널별 재고 동기화
      this.logger.info('Syncing stock across channels...');
      const syncResults = await this.syncStock(context);
      result.stockSyncResults = syncResults;

      // 2. 재고 부족 체크 및 알림
      this.logger.info('Checking low stock items...');
      const lowStockItems = await this.checkLowStock();
      result.lowStockAlerts = lowStockItems;

      if (lowStockItems.length > 0 && this.inventoryConfig.alertConfig.notifyOnLowStock) {
        await this.sendLowStockAlert(lowStockItems);
      }

      // 3. 발주 제안 생성
      if (this.inventoryConfig.reorderConfig.autoSuggestEnabled) {
        this.logger.info('Generating purchase order suggestions...');
        const suggestions = await this.generatePurchaseOrderSuggestions();
        result.purchaseOrderSuggestions = suggestions;
      }

      // 4. 원가/마진 분석 (매시간 실행)
      if (this.shouldRunCostAnalysis()) {
        this.logger.info('Running cost/margin analysis...');
        const marginAnalysis = await this.runMarginAnalysis();
        result.marginAnalysis = marginAnalysis;
      }

      return this.createSuccessResult(result, startTime, {
        processed: syncResults.reduce((sum, r) => sum + r.syncedCount, 0),
      });
    } catch (error) {
      this.logger.error('InventoryAgent execution failed', error as Error);
      return this.createErrorResult(
        'INVENTORY_AGENT_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 재고 동기화 실행
   */
  private async syncStock(context: AgentContext): Promise<StockSyncResult[]> {
    const task: TaskPayload = {
      taskId: `sync-stock-${Date.now()}`,
      type: 'sync_all_channels',
      priority: 8,
      data: { channels: this.inventoryConfig.syncConfig.channels },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.stockSync.executeTask<unknown, StockSyncResult[]>(task);
    return result.data || [];
  }

  /**
   * 재고 부족 체크
   */
  private async checkLowStock(): Promise<StockInfo[]> {
    const task: TaskPayload = {
      taskId: `check-low-stock-${Date.now()}`,
      type: 'check_low_stock',
      priority: 7,
      data: { thresholdPercent: this.inventoryConfig.alertConfig.lowStockThresholdPercent },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.stockSync.executeTask<unknown, StockInfo[]>(task);
    return result.data || [];
  }

  /**
   * 재고 부족 알림 발송
   */
  private async sendLowStockAlert(items: StockInfo[]): Promise<void> {
    const outOfStock = items.filter((i) => i.status === StockStatus.OUT_OF_STOCK);
    const lowStock = items.filter((i) => i.status === StockStatus.LOW_STOCK);

    let message = '';
    if (outOfStock.length > 0) {
      message += `품절 상품: ${outOfStock.length}개\n`;
      message += outOfStock.slice(0, 5).map((i) => `- ${i.productName}`).join('\n');
      if (outOfStock.length > 5) message += `\n외 ${outOfStock.length - 5}개`;
    }

    if (lowStock.length > 0) {
      if (message) message += '\n\n';
      message += `재고 부족 상품: ${lowStock.length}개\n`;
      message += lowStock.slice(0, 5).map((i) => `- ${i.productName} (${i.availableQuantity}개)`).join('\n');
      if (lowStock.length > 5) message += `\n외 ${lowStock.length - 5}개`;
    }

    await this.sendNotification(
      outOfStock.length > 0 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      'operations',
      '재고 알림',
      message
    );
  }

  /**
   * 발주 제안 생성
   */
  private async generatePurchaseOrderSuggestions(): Promise<PurchaseOrderSuggestion[]> {
    const task: TaskPayload = {
      taskId: `purchase-suggestions-${Date.now()}`,
      type: 'generate_suggestions',
      priority: 5,
      data: this.inventoryConfig.reorderConfig,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.purchaseOrder.executeTask<unknown, PurchaseOrderSuggestion[]>(task);
    return result.data || [];
  }

  /**
   * 마진 분석 실행
   */
  private async runMarginAnalysis(): Promise<MarginAnalysis[]> {
    const task: TaskPayload = {
      taskId: `margin-analysis-${Date.now()}`,
      type: 'analyze_margins',
      priority: 4,
      data: this.inventoryConfig.marginConfig,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.costAnalyzer.executeTask<unknown, MarginAnalysis[]>(task);
    return result.data || [];
  }

  /**
   * 원가 분석 실행 여부 판단
   */
  private shouldRunCostAnalysis(): boolean {
    const now = new Date();
    return now.getMinutes() < 10; // 매시간 정각~10분 사이
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
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
    await this.sendNotification(
      NotificationPriority.HIGH,
      'operations',
      '재고 에이전트 오류',
      `에러: ${error.message}`
    );
  }

  // ===========================================================================
  // 공개 API 메서드
  // ===========================================================================

  /**
   * 특정 채널 재고 동기화
   */
  async syncChannelStock(channel: SalesChannel): Promise<StockSyncResult> {
    const task: TaskPayload = {
      taskId: `sync-${channel}-${Date.now()}`,
      type: 'sync_channel',
      priority: 8,
      data: { channel },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.stockSync.executeTask<{ channel: SalesChannel }, StockSyncResult>(task);
    return result.data || {
      channel,
      success: false,
      syncedCount: 0,
      failedCount: 0,
      syncedAt: new Date(),
    };
  }

  /**
   * 발주서 생성
   */
  async createPurchaseOrder(suggestion: PurchaseOrderSuggestion): Promise<PurchaseOrder | null> {
    const task: TaskPayload = {
      taskId: `create-po-${Date.now()}`,
      type: 'create_purchase_order',
      priority: 6,
      data: suggestion,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.purchaseOrder.executeTask<PurchaseOrderSuggestion, PurchaseOrder>(task);
    return result.data || null;
  }

  /**
   * 상품 원가 조회
   */
  async getProductCost(productId: string): Promise<MarginAnalysis | null> {
    const task: TaskPayload = {
      taskId: `get-cost-${productId}-${Date.now()}`,
      type: 'get_product_cost',
      priority: 5,
      data: { productId },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.costAnalyzer.executeTask<{ productId: string }, MarginAnalysis>(task);
    return result.data || null;
  }

  /**
   * Inventory Agent 설정 조회
   */
  getInventoryConfig(): InventoryAgentConfig {
    return { ...this.inventoryConfig };
  }

  /**
   * Inventory Agent 설정 업데이트
   */
  updateInventoryConfig(updates: Partial<InventoryAgentConfig>): void {
    this.inventoryConfig = { ...this.inventoryConfig, ...updates };
    this.logger.info('InventoryAgent config updated', updates);
  }
}

export default InventoryAgent;
