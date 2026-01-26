/**
 * 썬데이허그 AI 에이전트 시스템 - DetailPage Agent
 *
 * 상세페이지 제작 및 최적화를 총괄하는 메인 에이전트입니다.
 * 3개의 서브 에이전트를 관리하며 상세페이지 전환율을 최적화합니다.
 *
 * 서브 에이전트:
 * - PlanningSubAgent: 상세페이지 구성안 작성, 경쟁사 벤치마킹
 * - ProductionSubAgent: 카피 작성, 레이아웃 생성, 이미지 배치
 * - OptimizationSubAgent: A/B 테스트, 전환율 분석, 개선 제안
 */

import { BaseAgent } from '../base/BaseAgent';
import { SubAgent, ParentAgentRef, SubAgentConfig } from '../base/SubAgent';
import agentRegistry from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  ApprovalLevel,
  SalesChannel,
  NotificationPriority,
} from '../../types';
import {
  DetailPage,
  DetailPageStatus,
  DetailPageType,
  DetailPagePlan,
  DetailPageAgentData,
  DetailPageAgentConfig,
  ABTest,
  ImprovementSuggestion,
  DetailPageMetrics,
} from './types';

// 서브 에이전트 imports
import { PlanningSubAgent } from './sub-agents/PlanningSubAgent';
import { ProductionSubAgent } from './sub-agents/ProductionSubAgent';
import { OptimizationSubAgent } from './sub-agents/OptimizationSubAgent';

/**
 * DetailPage Agent 기본 설정
 */
const DEFAULT_CONFIG: AgentConfig = {
  id: 'detail-page-agent',
  name: 'DetailPage Agent',
  description: '상세페이지 제작 및 최적화를 총괄하는 메인 에이전트',
  enabled: true,
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 300000,
  approvalLevel: ApprovalLevel.MEDIUM,
  metadata: {
    version: '1.0.0',
    category: 'detail-page',
  },
};

/**
 * DetailPage Agent 기본 상세페이지 설정
 */
const DEFAULT_DETAIL_PAGE_CONFIG: DetailPageAgentConfig = {
  defaultTemplateId: 'standard-template',
  autoSeoOptimization: true,
  autoABTestAnalysis: true,
  notifications: {
    lowConversionThreshold: 2.0, // 2% 이하 전환율
    highBounceRateThreshold: 70.0, // 70% 이상 이탈률
  },
};

/**
 * DetailPage Agent 클래스
 */
export class DetailPageAgent extends BaseAgent {
  /** 상세페이지 설정 */
  private detailPageConfig: DetailPageAgentConfig;

  /** 서브 에이전트들 */
  private planningAgent!: PlanningSubAgent;
  private productionAgent!: ProductionSubAgent;
  private optimizationAgent!: OptimizationSubAgent;

  /** 부모 참조 (서브 에이전트용) */
  private parentRef: ParentAgentRef;

  constructor(
    config?: Partial<AgentConfig>,
    detailPageConfig?: Partial<DetailPageAgentConfig>
  ) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.detailPageConfig = { ...DEFAULT_DETAIL_PAGE_CONFIG, ...detailPageConfig };

    this.parentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
      requestApprovalFromParent: this.handleApprovalRequest.bind(this),
    };
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    this.logger.info('Initializing DetailPage Agent...');
    await this.initializeSubAgents();
    this.registerSubAgents();
    this.logger.info('DetailPage Agent initialized with 3 sub-agents');
  }

  protected async run(context: AgentContext): Promise<AgentResult<DetailPageAgentData>> {
    const startTime = Date.now();
    this.logger.info('Running DetailPage Agent...', { data: context.data });

    try {
      const taskType = (context.data?.taskType as string) || 'status_report';
      let result: DetailPageAgentData = {};

      switch (taskType) {
        case 'create_page':
          result = await this.createDetailPage(context.data);
          break;

        case 'plan_page':
          result = await this.planDetailPage(context.data);
          break;

        case 'optimize_page':
          result = await this.optimizePage(context.data);
          break;

        case 'run_ab_test':
          result = await this.runABTest(context.data);
          break;

        case 'analyze_performance':
          result = await this.analyzePerformance(context.data);
          break;

        case 'status_report':
          result = await this.generateStatusReport();
          break;

        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('DetailPage Agent execution failed', error as Error);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up DetailPage Agent...');
  }

  // ===========================================================================
  // 서브 에이전트 관리
  // ===========================================================================

  private async initializeSubAgents(): Promise<void> {
    const baseSubConfig = {
      parentRef: this.parentRef,
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
    };

    this.planningAgent = new PlanningSubAgent({
      ...baseSubConfig,
      id: 'detail-page-planning-agent',
      name: 'Planning SubAgent',
      description: '상세페이지 구성안 작성, 경쟁사 벤치마킹',
    });

    this.productionAgent = new ProductionSubAgent({
      ...baseSubConfig,
      id: 'detail-page-production-agent',
      name: 'Production SubAgent',
      description: '카피 작성, 레이아웃 생성, 이미지 배치',
    });

    this.optimizationAgent = new OptimizationSubAgent({
      ...baseSubConfig,
      id: 'detail-page-optimization-agent',
      name: 'Optimization SubAgent',
      description: 'A/B 테스트, 전환율 분석, 개선 제안',
    });
  }

  private registerSubAgents(): void {
    const subAgents = [
      this.planningAgent,
      this.productionAgent,
      this.optimizationAgent,
    ];

    for (const agent of subAgents) {
      agentRegistry.register(agent, {
        type: 'sub',
        parentId: this.config.id,
        tags: ['detail-page', 'lane2'],
      });
    }
  }

  // ===========================================================================
  // 서브 에이전트 콜백 핸들러
  // ===========================================================================

  private async handleSubAgentResult(result: unknown): Promise<void> {
    this.logger.info('Sub-agent task completed', { result });
  }

  private async handleSubAgentProgress(progress: {
    percentage: number;
    currentStep?: string;
  }): Promise<void> {
    this.logger.debug('Sub-agent progress', progress);
  }

  private async handleSubAgentError(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    this.logger.error('Sub-agent error', error, context);
  }

  private async handleApprovalRequest(
    title: string,
    description: string,
    data: unknown
  ): Promise<boolean> {
    const response = await this.requestApproval(title, description, data);
    return response.approved;
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 상세페이지 생성 전체 프로세스
   */
  private async createDetailPage(
    data?: Record<string, unknown>
  ): Promise<DetailPageAgentData> {
    const productId = data?.productId as string;
    const productName = data?.productName as string;
    const channels = data?.channels as SalesChannel[] || [SalesChannel.NAVER, SalesChannel.COUPANG];

    this.logger.info('Creating detail page...', { productId, productName });

    // 1. 기획안 작성
    const plan = await this.planningAgent.createPlan({
      productId,
      productName,
      channels,
    });

    // 2. 상세페이지 제작
    const page = await this.productionAgent.createPage({
      productId,
      productName,
      plan,
      channels,
    });

    // 3. SEO 최적화
    if (this.detailPageConfig.autoSeoOptimization) {
      await this.productionAgent.optimizeSEO(page.id);
    }

    return {
      pages: [page],
      plans: [plan],
    };
  }

  /**
   * 상세페이지 기획
   */
  private async planDetailPage(
    data?: Record<string, unknown>
  ): Promise<DetailPageAgentData> {
    const productId = data?.productId as string;
    const productName = data?.productName as string;
    const includeCompetitorAnalysis = data?.includeCompetitorAnalysis !== false;

    this.logger.info('Planning detail page...', { productId });

    // 기획안 작성
    const plan = await this.planningAgent.createPlan({
      productId,
      productName,
      includeCompetitorAnalysis,
    });

    return {
      plans: [plan],
    };
  }

  /**
   * 상세페이지 최적화
   */
  private async optimizePage(
    data?: Record<string, unknown>
  ): Promise<DetailPageAgentData> {
    const pageId = data?.pageId as string;

    this.logger.info('Optimizing page...', { pageId });

    // 성과 분석
    const metrics = await this.optimizationAgent.analyzeMetrics(pageId);

    // 개선 제안 생성
    const suggestions = await this.optimizationAgent.generateSuggestions(pageId, metrics);

    // 전환율이 낮으면 알림
    if (metrics.conversionRate < this.detailPageConfig.notifications.lowConversionThreshold) {
      await this.sendNotification(
        NotificationPriority.HIGH,
        'marketing',
        '상세페이지 전환율 저조',
        `페이지 ${pageId}의 전환율이 ${metrics.conversionRate.toFixed(2)}%로 기준(${this.detailPageConfig.notifications.lowConversionThreshold}%) 이하입니다.`,
        `${process.env.DASHBOARD_URL}/detail-pages/${pageId}`
      );
    }

    return {
      suggestions,
      performanceSummary: {
        totalPages: 1,
        avgConversionRate: metrics.conversionRate,
        topPerformingPages: [],
        pagesNeedingImprovement: [pageId],
      },
    };
  }

  /**
   * A/B 테스트 실행
   */
  private async runABTest(
    data?: Record<string, unknown>
  ): Promise<DetailPageAgentData> {
    const pageId = data?.pageId as string;
    const testElement = data?.testElement as ABTest['testElement'];
    const variantBContent = data?.variantBContent;

    this.logger.info('Running A/B test...', { pageId, testElement });

    // A/B 테스트 생성 및 시작
    const abTest = await this.optimizationAgent.createABTest({
      pageId,
      testElement,
      variantBContent,
    });

    return {
      abTests: [abTest],
    };
  }

  /**
   * 성과 분석
   */
  private async analyzePerformance(
    data?: Record<string, unknown>
  ): Promise<DetailPageAgentData> {
    const pageIds = data?.pageIds as string[] | undefined;
    const period = data?.period as { start: Date; end: Date } | undefined;

    this.logger.info('Analyzing performance...', { pageIds, period });

    const results = await this.optimizationAgent.analyzeMultiplePages({
      pageIds,
      period,
    });

    return results;
  }

  /**
   * 상태 리포트 생성
   */
  private async generateStatusReport(): Promise<DetailPageAgentData> {
    this.logger.info('Generating status report...');

    const db = this.getDatabase('detail_pages');
    const { data: pages } = await db.findAll<DetailPage>({});

    const allPages = pages || [];
    const publishedPages = allPages.filter(p => p.status === DetailPageStatus.PUBLISHED);

    // 성과 집계
    let totalConversionRate = 0;
    const pagesWithMetrics = publishedPages.filter(p => p.metrics);

    for (const page of pagesWithMetrics) {
      totalConversionRate += page.metrics!.conversionRate;
    }

    const avgConversionRate = pagesWithMetrics.length > 0
      ? totalConversionRate / pagesWithMetrics.length
      : 0;

    // 상위/하위 성과 페이지 분류
    const sortedByConversion = pagesWithMetrics
      .sort((a, b) => (b.metrics?.conversionRate || 0) - (a.metrics?.conversionRate || 0));

    const topPerformingPages = sortedByConversion.slice(0, 5).map(p => p.id);
    const pagesNeedingImprovement = sortedByConversion
      .filter(p => (p.metrics?.conversionRate || 0) < this.detailPageConfig.notifications.lowConversionThreshold)
      .map(p => p.id);

    return {
      pages: allPages,
      performanceSummary: {
        totalPages: allPages.length,
        avgConversionRate,
        topPerformingPages,
        pagesNeedingImprovement,
      },
    };
  }

  // ===========================================================================
  // 설정 관리
  // ===========================================================================

  updateConfig(config: Partial<DetailPageAgentConfig>): void {
    this.detailPageConfig = { ...this.detailPageConfig, ...config };
    this.logger.info('DetailPage config updated', { config: this.detailPageConfig });
  }

  getConfig(): DetailPageAgentConfig {
    return { ...this.detailPageConfig };
  }
}

export default DetailPageAgent;
