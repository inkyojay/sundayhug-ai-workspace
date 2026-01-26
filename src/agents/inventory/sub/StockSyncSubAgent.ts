/**
 * 재고동기화 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 채널별 재고 실시간 동기화
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, SalesChannel } from '../../../types';
import {
  StockInfo,
  StockStatus,
  StockSyncResult,
  StockSyncError,
  ChannelStockInfo,
  StockMovement,
  StockMovementType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 동기화 설정
 */
interface SyncConfig {
  channels: SalesChannel[];
  syncInterval: number;
  batchSize: number;
}

/**
 * StockSyncSubAgent 클래스
 * 재고 동기화를 담당하는 서브에이전트
 */
export class StockSyncSubAgent extends SubAgent {
  private syncConfig: SyncConfig;

  constructor(config: SubAgentConfig, syncConfig?: Partial<SyncConfig>) {
    super(config);
    this.syncConfig = {
      channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
      syncInterval: 10,
      batchSize: 100,
      ...syncConfig,
    };
  }

  protected async initialize(): Promise<void> {
    this.logger.info('StockSyncSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('StockSyncSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'sync_all_channels':
        const allResults = await this.syncAllChannels();
        return this.createSuccessResult(allResults, startTime);

      case 'sync_channel':
        const { channel } = context.data as { channel: SalesChannel };
        const result = await this.syncChannel(channel);
        return this.createSuccessResult(result, startTime);

      case 'check_low_stock':
        const { thresholdPercent } = context.data as { thresholdPercent: number };
        const lowStockItems = await this.checkLowStock(thresholdPercent);
        return this.createSuccessResult(lowStockItems, startTime);

      case 'update_stock':
        const updateData = context.data as {
          productId: string;
          quantity: number;
          reason: string;
        };
        const updateResult = await this.updateStock(updateData);
        return this.createSuccessResult(updateResult, startTime);

      default:
        const defaultResults = await this.syncAllChannels();
        return this.createSuccessResult(defaultResults, startTime);
    }
  }

  /**
   * 모든 채널 재고 동기화
   */
  async syncAllChannels(): Promise<StockSyncResult[]> {
    this.logger.info('Syncing stock across all channels...');

    const results: StockSyncResult[] = [];

    for (const channel of this.syncConfig.channels) {
      const result = await this.syncChannel(channel);
      results.push(result);
    }

    return results;
  }

  /**
   * 특정 채널 재고 동기화
   */
  async syncChannel(channel: SalesChannel): Promise<StockSyncResult> {
    this.logger.info(`Syncing stock for ${channel}...`);

    try {
      // 1. 내부 재고 데이터 조회
      const internalStock = await this.getInternalStock();

      // 2. 채널 API로 재고 업데이트
      const syncResult = await this.updateChannelStock(channel, internalStock);

      // 3. 동기화 결과 저장
      await this.saveChannelSyncStatus(channel, internalStock, syncResult);

      return {
        channel,
        success: syncResult.success,
        syncedCount: syncResult.syncedCount,
        failedCount: syncResult.failedCount,
        errors: syncResult.errors,
        syncedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to sync ${channel}`, error as Error);
      return {
        channel,
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [
          {
            productId: 'N/A',
            errorCode: 'SYNC_ERROR',
            errorMessage: (error as Error).message,
          },
        ],
        syncedAt: new Date(),
      };
    }
  }

  /**
   * 내부 재고 데이터 조회
   */
  private async getInternalStock(): Promise<StockInfo[]> {
    const db = this.getDatabase('products');
    const result = await db.findMany<{
      id: string;
      name: string;
      sku: string;
      stock_quantity: number;
      reserved_quantity: number;
      incoming_quantity: number;
      low_stock_threshold: number;
    }>({});

    if (result.error || !result.data) {
      return [];
    }

    return result.data.map((product) => ({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      totalQuantity: product.stock_quantity,
      availableQuantity: product.stock_quantity - (product.reserved_quantity || 0),
      reservedQuantity: product.reserved_quantity || 0,
      incomingQuantity: product.incoming_quantity || 0,
      status: this.determineStockStatus(
        product.stock_quantity - (product.reserved_quantity || 0),
        product.low_stock_threshold
      ),
      lowStockThreshold: product.low_stock_threshold || 10,
      lastUpdated: new Date(),
    }));
  }

  /**
   * 재고 상태 결정
   */
  private determineStockStatus(availableQuantity: number, threshold: number): StockStatus {
    if (availableQuantity <= 0) return StockStatus.OUT_OF_STOCK;
    if (availableQuantity <= threshold) return StockStatus.LOW_STOCK;
    return StockStatus.IN_STOCK;
  }

  /**
   * 채널 재고 업데이트
   */
  private async updateChannelStock(
    channel: SalesChannel,
    stockData: StockInfo[]
  ): Promise<{ success: boolean; syncedCount: number; failedCount: number; errors: StockSyncError[] }> {
    const errors: StockSyncError[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    // 배치 처리
    const batches = this.chunkArray(stockData, this.syncConfig.batchSize);

    for (const batch of batches) {
      const batchResult = await this.syncBatch(channel, batch);
      syncedCount += batchResult.synced;
      failedCount += batchResult.failed;
      errors.push(...batchResult.errors);

      // API 레이트 리밋 방지
      await this.sleep(200);
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors,
    };
  }

  /**
   * 배치 동기화
   */
  private async syncBatch(
    channel: SalesChannel,
    batch: StockInfo[]
  ): Promise<{ synced: number; failed: number; errors: StockSyncError[] }> {
    // TODO: 실제 채널 API 연동
    switch (channel) {
      case SalesChannel.COUPANG:
        return await this.syncToCoupang(batch);
      case SalesChannel.NAVER:
        return await this.syncToNaver(batch);
      case SalesChannel.CAFE24:
        return await this.syncToCafe24(batch);
      default:
        return { synced: batch.length, failed: 0, errors: [] };
    }
  }

  /**
   * 쿠팡 재고 동기화
   */
  private async syncToCoupang(batch: StockInfo[]): Promise<{ synced: number; failed: number; errors: StockSyncError[] }> {
    // TODO: 실제 쿠팡 API 연동
    this.logger.debug('Syncing to Coupang', { count: batch.length });
    await this.sleep(100);
    return { synced: batch.length, failed: 0, errors: [] };
  }

  /**
   * 네이버 재고 동기화
   */
  private async syncToNaver(batch: StockInfo[]): Promise<{ synced: number; failed: number; errors: StockSyncError[] }> {
    // TODO: 실제 네이버 API 연동
    this.logger.debug('Syncing to Naver', { count: batch.length });
    await this.sleep(100);
    return { synced: batch.length, failed: 0, errors: [] };
  }

  /**
   * Cafe24 재고 동기화
   */
  private async syncToCafe24(batch: StockInfo[]): Promise<{ synced: number; failed: number; errors: StockSyncError[] }> {
    // TODO: 실제 Cafe24 API 연동
    this.logger.debug('Syncing to Cafe24', { count: batch.length });
    await this.sleep(100);
    return { synced: batch.length, failed: 0, errors: [] };
  }

  /**
   * 채널 동기화 상태 저장
   */
  private async saveChannelSyncStatus(
    channel: SalesChannel,
    stockData: StockInfo[],
    syncResult: { success: boolean; syncedCount: number }
  ): Promise<void> {
    const db = this.getDatabase('channel_stock_sync');

    for (const stock of stockData) {
      await db.upsert(
        { product_id: stock.productId, channel },
        {
          product_id: stock.productId,
          channel,
          quantity: stock.availableQuantity,
          synced_at: new Date(),
          sync_status: syncResult.success ? 'synced' : 'failed',
        }
      );
    }
  }

  /**
   * 재고 부족 상품 체크
   */
  async checkLowStock(thresholdPercent?: number): Promise<StockInfo[]> {
    const stockData = await this.getInternalStock();

    return stockData.filter(
      (stock) =>
        stock.status === StockStatus.LOW_STOCK || stock.status === StockStatus.OUT_OF_STOCK
    );
  }

  /**
   * 재고 업데이트
   */
  async updateStock(data: {
    productId: string;
    quantity: number;
    reason: string;
    type?: StockMovementType;
  }): Promise<StockInfo | null> {
    const db = this.getDatabase('products');
    const result = await db.findById<{
      id: string;
      stock_quantity: number;
      reserved_quantity: number;
    }>(data.productId);

    if (result.error || !result.data) {
      return null;
    }

    const previousQuantity = result.data.stock_quantity;
    const newQuantity = data.type === StockMovementType.OUTBOUND
      ? previousQuantity - data.quantity
      : previousQuantity + data.quantity;

    // 재고 업데이트
    await db.update({ id: data.productId }, {
      stock_quantity: newQuantity,
      updated_at: new Date(),
    });

    // 재고 변동 기록
    await this.recordStockMovement({
      id: uuidv4(),
      productId: data.productId,
      type: data.type || StockMovementType.ADJUSTMENT,
      quantity: data.quantity,
      previousQuantity,
      newQuantity,
      reason: data.reason,
      createdAt: new Date(),
      createdBy: this.config.id,
    });

    const updatedStock = await this.getInternalStock();
    return updatedStock.find((s) => s.productId === data.productId) || null;
  }

  /**
   * 재고 변동 기록
   */
  private async recordStockMovement(movement: StockMovement): Promise<void> {
    const db = this.getDatabase('stock_movements');
    await db.create({
      ...movement,
      created_at: movement.createdAt,
    });
  }

  /**
   * 배열 청크 분할
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'syncing',
      message: '재고 동기화 중...',
    };
  }
}

export default StockSyncSubAgent;
