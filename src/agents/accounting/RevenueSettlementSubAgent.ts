/**
 * 매출정산 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 채널별 정산수집, 대사확인을 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  SalesChannel,
  DateRange,
} from '../../types';
import {
  ChannelSettlement,
  SettlementStatus,
  SettlementDetail,
  ReconciliationResult,
  ReconciliationDiscrepancy,
  RevenueSettlementTaskPayload,
  RevenueSettlementResult,
} from './types';

/**
 * 매출정산 서브에이전트 클래스
 */
export class RevenueSettlementSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Revenue Settlement SubAgent...');
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<RevenueSettlementResult>> {
    const startTime = Date.now();
    const payload = context.data as RevenueSettlementTaskPayload;

    this.logger.info('Running Revenue Settlement SubAgent', {
      action: payload.action,
      period: payload.period,
    });

    try {
      let result: RevenueSettlementResult;

      switch (payload.action) {
        case 'collect':
          result = await this.collectSettlements(payload.period, payload.channels);
          break;

        case 'reconcile':
          result = await this.reconcileSettlements(payload.period, payload.options);
          break;

        case 'confirm':
          result = await this.confirmSettlements(payload.period);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Revenue Settlement failed', error as Error);
      throw error;
    }
  }

  /**
   * 정산 데이터 수집
   */
  private async collectSettlements(
    period: DateRange,
    channels?: SalesChannel[]
  ): Promise<RevenueSettlementResult> {
    const targetChannels = channels || [
      SalesChannel.COUPANG,
      SalesChannel.NAVER,
      SalesChannel.CAFE24,
    ];

    this.logger.info('Collecting settlements from channels', { channels: targetChannels });

    const settlements: ChannelSettlement[] = [];

    for (const channel of targetChannels) {
      try {
        const settlement = await this.collectChannelSettlement(channel, period);
        settlements.push(settlement);
        this.logger.info(`Collected settlement from ${channel}`, {
          orderCount: settlement.orderCount,
          netSettlement: settlement.netSettlement,
        });
      } catch (error) {
        this.logger.warn(`Failed to collect settlement from ${channel}`, {
          error: (error as Error).message,
        });
      }
    }

    // 대사 처리
    const reconciliationResults = await this.performReconciliation(settlements);

    return {
      settlements,
      reconciliationResults,
      summary: {
        totalChannels: settlements.length,
        totalSettlementAmount: settlements.reduce((sum, s) => sum + s.netSettlement, 0),
        totalDiscrepancies: reconciliationResults.reduce(
          (sum, r) => sum + r.discrepancyCount,
          0
        ),
      },
    };
  }

  /**
   * 채널별 정산 수집
   */
  private async collectChannelSettlement(
    channel: SalesChannel,
    period: DateRange
  ): Promise<ChannelSettlement> {
    // 실제 구현에서는 채널 API를 호출하여 정산 데이터를 가져옵니다
    // 여기서는 시뮬레이션 데이터를 반환합니다

    const now = new Date();
    const mockOrderCount = Math.floor(Math.random() * 100) + 50;
    const mockTotalSales = mockOrderCount * (Math.random() * 50000 + 30000);
    const commissionRate = this.getChannelCommissionRate(channel);
    const commissionFee = mockTotalSales * commissionRate;

    return {
      id: `settlement-${channel}-${now.getTime()}`,
      channel,
      period,
      status: SettlementStatus.COLLECTED,
      totalSales: Math.round(mockTotalSales),
      commissionFee: Math.round(commissionFee),
      advertisingFee: Math.round(mockTotalSales * 0.05),
      shippingSettlement: Math.round(mockOrderCount * 3000),
      refundAmount: Math.round(mockTotalSales * 0.02),
      otherDeductions: 0,
      netSettlement: Math.round(
        mockTotalSales - commissionFee - (mockTotalSales * 0.05) -
        (mockOrderCount * 3000) - (mockTotalSales * 0.02)
      ),
      orderCount: mockOrderCount,
      expectedPaymentDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 채널별 수수료율
   */
  private getChannelCommissionRate(channel: SalesChannel): number {
    const rates: Record<SalesChannel, number> = {
      [SalesChannel.COUPANG]: 0.108,
      [SalesChannel.NAVER]: 0.055,
      [SalesChannel.CAFE24]: 0.03,
      [SalesChannel.GMARKET]: 0.12,
      [SalesChannel.ELEVEN_ST]: 0.12,
      [SalesChannel.AUCTION]: 0.12,
      [SalesChannel.INTERPARK]: 0.10,
      [SalesChannel.TMON]: 0.12,
      [SalesChannel.WEMAKEPRICE]: 0.12,
      [SalesChannel.SSG]: 0.10,
      [SalesChannel.LOTTE_ON]: 0.10,
      [SalesChannel.MANUAL]: 0,
    };

    return rates[channel] || 0.10;
  }

  /**
   * 대사 처리
   */
  private async performReconciliation(
    settlements: ChannelSettlement[]
  ): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];

    for (const settlement of settlements) {
      const result = await this.reconcileSettlement(settlement);
      results.push(result);

      if (!result.reconciled) {
        this.logger.warn(`Reconciliation discrepancy found for ${settlement.channel}`, {
          discrepancyCount: result.discrepancyCount,
          discrepancyAmount: result.discrepancyAmount,
        });
      }
    }

    return results;
  }

  /**
   * 개별 정산 대사
   */
  private async reconcileSettlement(
    settlement: ChannelSettlement
  ): Promise<ReconciliationResult> {
    // 실제 구현에서는 내부 주문 데이터와 비교합니다
    // 여기서는 시뮬레이션으로 대부분 일치하는 결과를 반환합니다

    const discrepancies: ReconciliationDiscrepancy[] = [];
    const discrepancyRate = Math.random();

    if (discrepancyRate < 0.1) {
      // 10% 확률로 불일치 발생
      discrepancies.push({
        orderId: `order-${Date.now()}`,
        type: 'amount_mismatch',
        expected: settlement.totalSales,
        actual: settlement.totalSales - Math.floor(Math.random() * 10000),
        difference: Math.floor(Math.random() * 10000),
      });
    }

    return {
      settlementId: settlement.id,
      reconciled: discrepancies.length === 0,
      discrepancyCount: discrepancies.length,
      discrepancyAmount: discrepancies.reduce((sum, d) => sum + (d.difference || 0), 0),
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
      reconciledAt: new Date(),
    };
  }

  /**
   * 정산 대사 처리
   */
  private async reconcileSettlements(
    period: DateRange,
    options?: RevenueSettlementTaskPayload['options']
  ): Promise<RevenueSettlementResult> {
    // 기존 수집된 정산 조회 및 대사 처리
    const db = this.getDatabase('channel_settlements');
    const settlementsResult = await db.findByCondition<ChannelSettlement>({
      period_start: period.start,
      period_end: period.end,
    });

    const settlements = settlementsResult.data || [];
    const reconciliationResults = await this.performReconciliation(settlements);

    return {
      settlements,
      reconciliationResults,
      summary: {
        totalChannels: settlements.length,
        totalSettlementAmount: settlements.reduce((sum, s) => sum + s.netSettlement, 0),
        totalDiscrepancies: reconciliationResults.reduce(
          (sum, r) => sum + r.discrepancyCount,
          0
        ),
      },
    };
  }

  /**
   * 정산 확정
   */
  private async confirmSettlements(period: DateRange): Promise<RevenueSettlementResult> {
    const db = this.getDatabase('channel_settlements');
    const settlementsResult = await db.findByCondition<ChannelSettlement>({
      period_start: period.start,
      period_end: period.end,
      status: SettlementStatus.RECONCILED,
    });

    const settlements = settlementsResult.data || [];

    // 확정 처리
    for (const settlement of settlements) {
      settlement.status = SettlementStatus.CONFIRMED;
      settlement.updatedAt = new Date();
      await db.update(settlement.id, settlement);
    }

    this.logger.info(`Confirmed ${settlements.length} settlements`);

    return {
      settlements,
      summary: {
        totalChannels: settlements.length,
        totalSettlementAmount: settlements.reduce((sum, s) => sum + s.netSettlement, 0),
        totalDiscrepancies: 0,
      },
    };
  }
}

export default RevenueSettlementSubAgent;
