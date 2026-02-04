/**
 * Accounting Agent - 회계 에이전트
 * LANE 3 - Management & Compliance
 *
 * 매출정산, 비용관리, 세무, 손익분석을 총괄하는 메인 에이전트입니다.
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
  TaskStatus,
  SalesChannel,
  DateRange,
} from '../../types';
import {
  ChannelSettlement,
  ExpenseItem,
  TaxInvoice,
  IncomeStatement,
  RevenueSettlementTaskPayload,
  ExpenseManagementTaskPayload,
  TaxTaskPayload,
  ProfitAnalysisTaskPayload,
  RevenueSettlementResult,
  ExpenseManagementResult,
  TaxResult,
  ProfitAnalysisResult,
} from './types';

// 서브 에이전트 import
import { RevenueSettlementSubAgent } from './RevenueSettlementSubAgent';
import { ExpenseManagementSubAgent } from './ExpenseManagementSubAgent';
import { TaxSubAgent } from './TaxSubAgent';
import { ProfitAnalysisSubAgent } from './ProfitAnalysisSubAgent';

/**
 * Accounting Agent 설정
 */
const ACCOUNTING_AGENT_CONFIG: AgentConfig = {
  id: 'accounting-agent',
  name: 'Accounting Agent',
  description: '매출정산, 비용관리, 세무, 손익분석을 총괄하는 회계 에이전트',
  enabled: true,
  schedule: '0 9 * * *', // 매일 오전 9시
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 600000, // 10분
  approvalLevel: ApprovalLevel.MEDIUM,
};

/**
 * 회계 작업 유형
 */
export type AccountingTaskType =
  | 'revenue_settlement'
  | 'expense_management'
  | 'tax_management'
  | 'profit_analysis'
  | 'daily_summary'
  | 'monthly_close';

/**
 * 회계 태스크 페이로드
 */
export interface AccountingTaskPayload {
  taskType: AccountingTaskType;
  period?: DateRange;
  channels?: SalesChannel[];
  options?: Record<string, unknown>;
}

/**
 * 회계 에이전트 결과
 */
export interface AccountingAgentResultData {
  taskType: AccountingTaskType;
  revenueSettlement?: RevenueSettlementResult;
  expenseManagement?: ExpenseManagementResult;
  tax?: TaxResult;
  profitAnalysis?: ProfitAnalysisResult;
  summary?: {
    totalRevenue?: number;
    totalExpense?: number;
    netProfit?: number;
    pendingSettlements?: number;
    pendingTaxInvoices?: number;
  };
}

/**
 * Accounting Agent 클래스
 */
export class AccountingAgent extends BaseAgent {
  /** 매출정산 서브에이전트 */
  private revenueSettlementSubAgent!: RevenueSettlementSubAgent;

  /** 비용관리 서브에이전트 */
  private expenseManagementSubAgent!: ExpenseManagementSubAgent;

  /** 세무 서브에이전트 */
  private taxSubAgent!: TaxSubAgent;

  /** 손익분석 서브에이전트 */
  private profitAnalysisSubAgent!: ProfitAnalysisSubAgent;

  constructor() {
    super(ACCOUNTING_AGENT_CONFIG);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Accounting Agent...');

    // 부모 참조 생성
    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentTaskComplete.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
    };

    // 서브에이전트 설정 기본값
    const baseSubAgentConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 300000, // 5분
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    };

    // 매출정산 서브에이전트 생성
    this.revenueSettlementSubAgent = new RevenueSettlementSubAgent({
      ...baseSubAgentConfig,
      id: 'revenue-settlement-subagent',
      name: '매출정산 서브에이전트',
      description: '채널별 정산수집, 대사확인 담당',
    });

    // 비용관리 서브에이전트 생성
    this.expenseManagementSubAgent = new ExpenseManagementSubAgent({
      ...baseSubAgentConfig,
      id: 'expense-management-subagent',
      name: '비용관리 서브에이전트',
      description: '지출분류, 카드내역정리 담당',
    });

    // 세무 서브에이전트 생성
    this.taxSubAgent = new TaxSubAgent({
      ...baseSubAgentConfig,
      id: 'tax-subagent',
      name: '세무 서브에이전트',
      description: '세금계산서관리, 부가세자료, 기장데이터 담당',
      approvalLevel: ApprovalLevel.MEDIUM,
    });

    // 손익분석 서브에이전트 생성
    this.profitAnalysisSubAgent = new ProfitAnalysisSubAgent({
      ...baseSubAgentConfig,
      id: 'profit-analysis-subagent',
      name: '손익분석 서브에이전트',
      description: '손익계산, 리포트생성 담당',
    });

    // 에이전트 레지스트리에 등록
    agentRegistry.register(this, { type: 'base', tags: ['accounting', 'lane3'] });
    agentRegistry.register(this.revenueSettlementSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['accounting', 'settlement'],
    });
    agentRegistry.register(this.expenseManagementSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['accounting', 'expense'],
    });
    agentRegistry.register(this.taxSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['accounting', 'tax'],
    });
    agentRegistry.register(this.profitAnalysisSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['accounting', 'profit'],
    });

    this.logger.info('Accounting Agent initialized with 4 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Accounting Agent...');
    // 서브에이전트 정리는 AgentRegistry에서 처리
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<AccountingAgentResultData>> {
    const startTime = Date.now();
    const taskPayload = context.data as AccountingTaskPayload | undefined;

    // 기본값: 일일 요약
    const taskType: AccountingTaskType = taskPayload?.taskType || 'daily_summary';
    const period = taskPayload?.period || this.getDefaultPeriod();

    this.logger.info(`Running Accounting Agent - Task: ${taskType}`, { period });

    try {
      let result: AccountingAgentResultData;

      switch (taskType) {
        case 'revenue_settlement':
          result = await this.runRevenueSettlement(period, taskPayload?.channels);
          break;

        case 'expense_management':
          result = await this.runExpenseManagement(period, taskPayload?.options);
          break;

        case 'tax_management':
          result = await this.runTaxManagement(period, taskPayload?.options);
          break;

        case 'profit_analysis':
          result = await this.runProfitAnalysis(period, taskPayload?.options);
          break;

        case 'monthly_close':
          result = await this.runMonthlyClose(period);
          break;

        case 'daily_summary':
        default:
          result = await this.runDailySummary(period);
          break;
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Accounting Agent execution failed', error as Error);
      throw error;
    }
  }

  /**
   * 매출정산 실행
   */
  private async runRevenueSettlement(
    period: DateRange,
    channels?: SalesChannel[]
  ): Promise<AccountingAgentResultData> {
    const payload: RevenueSettlementTaskPayload = {
      action: 'collect',
      period,
      channels,
      options: { autoReconcile: true },
    };

    const taskResult = await this.revenueSettlementSubAgent.executeTask<
      RevenueSettlementTaskPayload,
      RevenueSettlementResult
    >({
      taskId: `revenue-${Date.now()}`,
      type: 'revenue_settlement',
      priority: 7,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'revenue_settlement',
      revenueSettlement: taskResult.data,
      summary: {
        totalRevenue: taskResult.data?.summary.totalSettlementAmount,
        pendingSettlements: taskResult.data?.settlements.filter(
          s => s.status !== 'completed'
        ).length,
      },
    };
  }

  /**
   * 비용관리 실행
   */
  private async runExpenseManagement(
    period: DateRange,
    options?: Record<string, unknown>
  ): Promise<AccountingAgentResultData> {
    const payload: ExpenseManagementTaskPayload = {
      action: 'generate_summary',
      period,
      options: {
        autoClassify: true,
        ...options,
      },
    };

    const taskResult = await this.expenseManagementSubAgent.executeTask<
      ExpenseManagementTaskPayload,
      ExpenseManagementResult
    >({
      taskId: `expense-${Date.now()}`,
      type: 'expense_management',
      priority: 6,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'expense_management',
      expenseManagement: taskResult.data,
      summary: {
        totalExpense: taskResult.data?.summary?.totalExpense,
      },
    };
  }

  /**
   * 세무관리 실행
   */
  private async runTaxManagement(
    period: DateRange,
    options?: Record<string, unknown>
  ): Promise<AccountingAgentResultData> {
    const payload: TaxTaskPayload = {
      action: 'prepare_bookkeeping',
      period,
      options: {
        autoSubmit: false,
        ...options,
      },
    };

    const taskResult = await this.taxSubAgent.executeTask<
      TaxTaskPayload,
      TaxResult
    >({
      taskId: `tax-${Date.now()}`,
      type: 'tax_management',
      priority: 8,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'tax_management',
      tax: taskResult.data,
      summary: {
        pendingTaxInvoices: taskResult.data?.processedInvoices?.filter(
          inv => inv.status !== 'reported'
        ).length,
      },
    };
  }

  /**
   * 손익분석 실행
   */
  private async runProfitAnalysis(
    period: DateRange,
    options?: Record<string, unknown>
  ): Promise<AccountingAgentResultData> {
    const payload: ProfitAnalysisTaskPayload = {
      action: 'generate_report',
      period,
      options: {
        includeDetails: true,
        generateInsights: true,
        includeComparison: true,
        ...options,
      },
    };

    const taskResult = await this.profitAnalysisSubAgent.executeTask<
      ProfitAnalysisTaskPayload,
      ProfitAnalysisResult
    >({
      taskId: `profit-${Date.now()}`,
      type: 'profit_analysis',
      priority: 5,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    const incomeStatement = taskResult.data?.incomeStatement;

    return {
      taskType: 'profit_analysis',
      profitAnalysis: taskResult.data,
      summary: {
        totalRevenue: incomeStatement?.revenue.totalSales,
        totalExpense: incomeStatement?.costOfGoodsSold.total,
        netProfit: incomeStatement?.netIncome,
      },
    };
  }

  /**
   * 일일 요약 실행
   */
  private async runDailySummary(period: DateRange): Promise<AccountingAgentResultData> {
    this.logger.info('Running daily summary...');

    // 병렬로 서브에이전트 실행
    const [revenueResult, expenseResult] = await Promise.all([
      this.runRevenueSettlement(period),
      this.runExpenseManagement(period),
    ]);

    return {
      taskType: 'daily_summary',
      revenueSettlement: revenueResult.revenueSettlement,
      expenseManagement: expenseResult.expenseManagement,
      summary: {
        totalRevenue: revenueResult.summary?.totalRevenue,
        totalExpense: expenseResult.summary?.totalExpense,
        netProfit: (revenueResult.summary?.totalRevenue || 0) -
                   (expenseResult.summary?.totalExpense || 0),
        pendingSettlements: revenueResult.summary?.pendingSettlements,
      },
    };
  }

  /**
   * 월마감 실행
   */
  private async runMonthlyClose(period: DateRange): Promise<AccountingAgentResultData> {
    this.logger.info('Running monthly close...');

    // 승인 요청 (월마감은 중요한 작업)
    if (this.needsApproval(ApprovalLevel.MEDIUM)) {
      const approval = await this.requestApproval(
        '월마감 처리 승인 요청',
        `${period.start.toISOString().slice(0, 7)} 월마감을 진행합니다.`,
        { period }
      );

      if (!approval.approved) {
        throw new Error('Monthly close approval was rejected');
      }
    }

    // 순차적으로 모든 작업 실행
    const revenueResult = await this.runRevenueSettlement(period);
    const expenseResult = await this.runExpenseManagement(period);
    const taxResult = await this.runTaxManagement(period);
    const profitResult = await this.runProfitAnalysis(period);

    // 결과 알림
    await this.sendNotification(
      'medium',
      'accounting',
      '월마감 완료',
      `${period.start.toISOString().slice(0, 7)} 월마감이 완료되었습니다.\n` +
      `총 매출: ${profitResult.summary?.totalRevenue?.toLocaleString()}원\n` +
      `순이익: ${profitResult.summary?.netProfit?.toLocaleString()}원`
    );

    return {
      taskType: 'monthly_close',
      revenueSettlement: revenueResult.revenueSettlement,
      expenseManagement: expenseResult.expenseManagement,
      tax: taxResult.tax,
      profitAnalysis: profitResult.profitAnalysis,
      summary: {
        totalRevenue: profitResult.summary?.totalRevenue,
        totalExpense: expenseResult.summary?.totalExpense,
        netProfit: profitResult.summary?.netProfit,
        pendingSettlements: revenueResult.summary?.pendingSettlements,
        pendingTaxInvoices: taxResult.summary?.pendingTaxInvoices,
      },
    };
  }

  /**
   * 기본 기간 (오늘)
   */
  private getDefaultPeriod(): DateRange {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      start: today,
      end: tomorrow,
    };
  }

  /**
   * 서브에이전트 태스크 완료 핸들러
   */
  private async handleSubAgentTaskComplete(result: TaskResult): Promise<void> {
    this.logger.debug('Sub-agent task completed', {
      taskId: result.taskId,
      status: result.status,
    });
  }

  /**
   * 서브에이전트 진행 상황 핸들러
   */
  private async handleSubAgentProgress(progress: { percentage: number; message?: string }): Promise<void> {
    this.logger.debug('Sub-agent progress', progress);
  }

  /**
   * 서브에이전트 에러 핸들러
   */
  private async handleSubAgentError(error: Error, context?: Record<string, unknown>): Promise<void> {
    this.logger.error('Sub-agent error', error, context);
  }
}

export default AccountingAgent;
