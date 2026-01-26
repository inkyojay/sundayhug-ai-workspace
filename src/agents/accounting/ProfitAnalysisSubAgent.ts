/**
 * 손익분석 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 손익계산, 리포트생성을 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  SalesChannel,
  DateRange,
} from '../../types';
import {
  IncomeStatement,
  ProfitabilityReport,
  ReportType,
  TrendData,
  ChannelSettlement,
  ExpenseSummary,
  ExpenseCategory,
  ProfitAnalysisTaskPayload,
  ProfitAnalysisResult,
} from './types';

/**
 * 손익분석 서브에이전트 클래스
 */
export class ProfitAnalysisSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Profit Analysis SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<ProfitAnalysisResult>> {
    const startTime = Date.now();
    const payload = context.data as ProfitAnalysisTaskPayload;

    this.logger.info('Running Profit Analysis SubAgent', {
      action: payload.action,
      period: payload.period,
    });

    try {
      let result: ProfitAnalysisResult;

      switch (payload.action) {
        case 'calculate':
          result = await this.calculateProfitability(payload.period);
          break;

        case 'generate_report':
          result = await this.generateReport(
            payload.period,
            payload.reportType || ReportType.MONTHLY,
            payload.options
          );
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Profit Analysis failed', error as Error);
      throw error;
    }
  }

  /**
   * 손익 계산
   */
  private async calculateProfitability(period: DateRange): Promise<ProfitAnalysisResult> {
    // 매출 데이터 조회
    const settlementsDb = this.getDatabase('channel_settlements');
    const settlementsResult = await settlementsDb.findByCondition<ChannelSettlement>({});
    const allSettlements = settlementsResult.data || [];

    // 기간 필터링
    const settlements = allSettlements.filter(s => {
      const start = new Date(s.period.start);
      return start >= period.start && start <= period.end;
    });

    // 채널별 매출 계산
    const byChannel: Record<SalesChannel, number> = {} as Record<SalesChannel, number>;
    for (const channel of Object.values(SalesChannel)) {
      byChannel[channel] = settlements
        .filter(s => s.channel === channel)
        .reduce((sum, s) => sum + s.totalSales, 0);
    }

    const totalSales = settlements.reduce((sum, s) => sum + s.totalSales, 0);

    // 비용 데이터 조회 (시뮬레이션)
    const costOfGoodsSold = {
      productCost: Math.round(totalSales * 0.35),
      shippingCost: Math.round(totalSales * 0.08),
      packagingCost: Math.round(totalSales * 0.02),
      platformFee: settlements.reduce((sum, s) => sum + s.commissionFee, 0),
      total: 0,
    };
    costOfGoodsSold.total =
      costOfGoodsSold.productCost +
      costOfGoodsSold.shippingCost +
      costOfGoodsSold.packagingCost +
      costOfGoodsSold.platformFee;

    const grossProfit = totalSales - costOfGoodsSold.total;
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // 판매관리비 (시뮬레이션)
    const operatingExpenses = {
      marketing: Math.round(totalSales * 0.12),
      labor: Math.round(totalSales * 0.08),
      rent: Math.round(totalSales * 0.03),
      other: Math.round(totalSales * 0.02),
      total: 0,
    };
    operatingExpenses.total =
      operatingExpenses.marketing +
      operatingExpenses.labor +
      operatingExpenses.rent +
      operatingExpenses.other;

    const operatingIncome = grossProfit - operatingExpenses.total;
    const operatingIncomeMargin = totalSales > 0 ? (operatingIncome / totalSales) * 100 : 0;

    // 영업외수익/비용
    const nonOperatingIncome = Math.round(totalSales * 0.005);
    const nonOperatingExpense = Math.round(totalSales * 0.01);

    // 법인세 추정 (영업이익의 10%)
    const estimatedTax = Math.max(0, Math.round(operatingIncome * 0.1));

    const netIncome = operatingIncome + nonOperatingIncome - nonOperatingExpense - estimatedTax;
    const netIncomeMargin = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;

    const incomeStatement: IncomeStatement = {
      period,
      revenue: {
        totalSales,
        byChannel,
      },
      costOfGoodsSold,
      grossProfit,
      grossProfitMargin: Math.round(grossProfitMargin * 100) / 100,
      operatingExpenses,
      operatingIncome,
      operatingIncomeMargin: Math.round(operatingIncomeMargin * 100) / 100,
      nonOperatingIncome,
      nonOperatingExpense,
      estimatedTax,
      netIncome,
      netIncomeMargin: Math.round(netIncomeMargin * 100) / 100,
      generatedAt: new Date(),
    };

    this.logger.info('Calculated profitability', {
      totalSales,
      grossProfit,
      grossProfitMargin: `${grossProfitMargin.toFixed(1)}%`,
      netIncome,
      netIncomeMargin: `${netIncomeMargin.toFixed(1)}%`,
    });

    return {
      incomeStatement,
    };
  }

  /**
   * 리포트 생성
   */
  private async generateReport(
    period: DateRange,
    reportType: ReportType,
    options?: ProfitAnalysisTaskPayload['options']
  ): Promise<ProfitAnalysisResult> {
    // 손익 계산
    const { incomeStatement } = await this.calculateProfitability(period);

    if (!incomeStatement) {
      throw new Error('Failed to calculate income statement');
    }

    const report: ProfitabilityReport = {
      id: `report-${Date.now()}`,
      type: reportType,
      period,
      incomeStatement,
      generatedAt: new Date(),
    };

    // 트렌드 분석 (옵션)
    if (options?.includeDetails) {
      report.trends = await this.calculateTrends(period, reportType);
    }

    // 비교 분석 (옵션)
    if (options?.includeComparison) {
      report.comparison = await this.calculateComparison(period, incomeStatement);
    }

    // 인사이트 생성 (옵션)
    if (options?.generateInsights) {
      report.insights = this.generateInsights(incomeStatement);
    }

    this.logger.info('Generated profitability report', {
      reportId: report.id,
      type: reportType,
      hasInsights: !!report.insights,
    });

    return {
      incomeStatement,
      report,
    };
  }

  /**
   * 트렌드 계산
   */
  private async calculateTrends(
    period: DateRange,
    reportType: ReportType
  ): Promise<ProfitabilityReport['trends']> {
    // 시뮬레이션: 지난 6개 기간의 트렌드 데이터
    const revenueTrend: TrendData[] = [];
    const marginTrend: TrendData[] = [];

    const periodCount = 6;
    const baseRevenue = Math.random() * 50000000 + 30000000;
    const baseMargin = 15 + Math.random() * 10;

    for (let i = periodCount - 1; i >= 0; i--) {
      const date = new Date(period.start);
      date.setMonth(date.getMonth() - i);

      const variation = 1 + (Math.random() - 0.5) * 0.2;
      const revenue = Math.round(baseRevenue * variation * (1 + i * 0.05));
      const margin = Math.round((baseMargin + (Math.random() - 0.5) * 5) * 100) / 100;

      revenueTrend.push({
        date,
        value: revenue,
        label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      });

      marginTrend.push({
        date,
        value: margin,
        label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      });
    }

    return {
      revenueTrend,
      marginTrend,
    };
  }

  /**
   * 비교 분석
   */
  private async calculateComparison(
    period: DateRange,
    currentStatement: IncomeStatement
  ): Promise<ProfitabilityReport['comparison']> {
    // 시뮬레이션: 전기 대비 및 전년 동기 대비
    const previousRevenue = currentStatement.revenue.totalSales * (0.9 + Math.random() * 0.15);
    const previousProfit = currentStatement.netIncome * (0.85 + Math.random() * 0.2);

    const yearAgoRevenue = currentStatement.revenue.totalSales * (0.7 + Math.random() * 0.3);
    const yearAgoProfit = currentStatement.netIncome * (0.6 + Math.random() * 0.4);

    return {
      previousPeriod: {
        revenueChange: Math.round(
          ((currentStatement.revenue.totalSales - previousRevenue) / previousRevenue) * 10000
        ) / 100,
        profitChange: Math.round(
          ((currentStatement.netIncome - previousProfit) / Math.abs(previousProfit)) * 10000
        ) / 100,
      },
      yearOverYear: {
        revenueChange: Math.round(
          ((currentStatement.revenue.totalSales - yearAgoRevenue) / yearAgoRevenue) * 10000
        ) / 100,
        profitChange: Math.round(
          ((currentStatement.netIncome - yearAgoProfit) / Math.abs(yearAgoProfit)) * 10000
        ) / 100,
      },
    };
  }

  /**
   * 인사이트 생성
   */
  private generateInsights(incomeStatement: IncomeStatement): string[] {
    const insights: string[] = [];

    // 매출총이익률 분석
    if (incomeStatement.grossProfitMargin >= 40) {
      insights.push(`매출총이익률이 ${incomeStatement.grossProfitMargin}%로 양호합니다.`);
    } else if (incomeStatement.grossProfitMargin < 30) {
      insights.push(
        `매출총이익률이 ${incomeStatement.grossProfitMargin}%로 낮습니다. 원가 절감 방안 검토가 필요합니다.`
      );
    }

    // 영업이익률 분석
    if (incomeStatement.operatingIncomeMargin >= 10) {
      insights.push(`영업이익률이 ${incomeStatement.operatingIncomeMargin}%로 건전합니다.`);
    } else if (incomeStatement.operatingIncomeMargin < 5) {
      insights.push(
        `영업이익률이 ${incomeStatement.operatingIncomeMargin}%로 개선이 필요합니다. 판매관리비 절감을 검토하세요.`
      );
    }

    // 마케팅 비용 비율 분석
    const marketingRatio =
      (incomeStatement.operatingExpenses.marketing / incomeStatement.revenue.totalSales) * 100;
    if (marketingRatio > 15) {
      insights.push(
        `마케팅 비용이 매출의 ${marketingRatio.toFixed(1)}%입니다. 마케팅 효율성 점검이 필요합니다.`
      );
    }

    // 채널별 매출 분석
    const topChannel = Object.entries(incomeStatement.revenue.byChannel)
      .filter(([_, value]) => value > 0)
      .sort(([, a], [, b]) => b - a)[0];

    if (topChannel) {
      const [channel, amount] = topChannel;
      const ratio = (amount / incomeStatement.revenue.totalSales) * 100;
      insights.push(`${channel} 채널이 전체 매출의 ${ratio.toFixed(1)}%를 차지합니다.`);

      if (ratio > 70) {
        insights.push('특정 채널 의존도가 높습니다. 채널 다각화를 검토하세요.');
      }
    }

    // 순이익률 분석
    if (incomeStatement.netIncomeMargin < 0) {
      insights.push('순손실이 발생했습니다. 긴급한 수익성 개선이 필요합니다.');
    } else if (incomeStatement.netIncomeMargin < 3) {
      insights.push(
        `순이익률이 ${incomeStatement.netIncomeMargin}%로 낮습니다. 전반적인 비용 구조 점검이 필요합니다.`
      );
    }

    return insights;
  }
}

export default ProfitAnalysisSubAgent;
