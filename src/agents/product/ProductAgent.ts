/**
 * Product Agent - 제품 기획 메인 에이전트
 * LANE 4: Analytics & Growth
 *
 * 역할: 시장조사, 제품기획, 피드백 분석을 총괄합니다.
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
  NotificationPriority,
} from '../../types';
import {
  ProductCategory,
  ProductStage,
  ResearchType,
  MarketResearch,
  CompetitorAnalysis,
  TrendReport,
  ProductConcept,
  ProductSpec,
  ProductRoadmap,
  ProductFeedback,
  FeedbackAggregation,
  ImprovementAnalysis,
  ResearchTaskPayload,
  PlanningTaskPayload,
  FeedbackAnalysisTaskPayload,
  FeedbackSource,
} from './types';

// =============================================================================
// Product Agent 설정
// =============================================================================

const PRODUCT_AGENT_CONFIG: AgentConfig = {
  id: 'product-agent',
  name: 'Product Agent',
  description: '제품 기획, 시장조사, 피드백 분석을 담당하는 에이전트',
  enabled: true,
  schedule: '0 0 9 * * 1', // 매주 월요일 오전 9시
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 600000, // 10분
  approvalLevel: ApprovalLevel.MEDIUM,
  metadata: {
    version: '1.0.0',
    domain: 'product',
    layer: 'growth',
  },
};

// =============================================================================
// Product Agent 클래스
// =============================================================================

export class ProductAgent extends BaseAgent {
  /** 리서치 서브에이전트 */
  private researchSubAgent: ResearchSubAgent | null = null;

  /** 기획 서브에이전트 */
  private planningSubAgent: PlanningSubAgent | null = null;

  /** 피드백 분석 서브에이전트 */
  private feedbackSubAgent: FeedbackAnalysisSubAgent | null = null;

  constructor(config: AgentConfig = PRODUCT_AGENT_CONFIG) {
    super(config);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Product Agent and sub-agents...');

    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: async (progress) => {
        this.logger.debug('Sub-agent progress', progress);
      },
      onError: async (error, context) => {
        this.logger.error('Sub-agent error', error, context);
      },
    };

    // 서브에이전트 생성
    this.researchSubAgent = new ResearchSubAgent({
      id: 'product-research-subagent',
      name: 'Research SubAgent',
      description: '시장조사, 경쟁사 분석 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.NONE,
      parentRef,
    });

    this.planningSubAgent = new PlanningSubAgent({
      id: 'product-planning-subagent',
      name: 'Planning SubAgent',
      description: '신제품 컨셉, 스펙 정의 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.MEDIUM,
      parentRef,
    });

    this.feedbackSubAgent = new FeedbackAnalysisSubAgent({
      id: 'product-feedback-subagent',
      name: 'Feedback Analysis SubAgent',
      description: '리뷰 분석, 개선점 도출 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.NONE,
      parentRef,
    });

    // AgentRegistry에 등록
    agentRegistry.register(this.researchSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['product', 'research', 'market'],
    });

    agentRegistry.register(this.planningSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['product', 'planning', 'concept'],
    });

    agentRegistry.register(this.feedbackSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['product', 'feedback', 'analysis'],
    });

    this.logger.info('Product Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Product Agent...');

    if (this.researchSubAgent) {
      await agentRegistry.unregister(this.researchSubAgent.getId());
    }
    if (this.planningSubAgent) {
      await agentRegistry.unregister(this.planningSubAgent.getId());
    }
    if (this.feedbackSubAgent) {
      await agentRegistry.unregister(this.feedbackSubAgent.getId());
    }

    this.logger.info('Product Agent cleanup completed');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this.logger.info('Product Agent running...', { executionId: context.executionId });

    try {
      const data = context.data || {};
      const action = data.action as string;

      switch (action) {
        case 'market_research':
          return await this.handleMarketResearch(data, startTime);

        case 'competitor_analysis':
          return await this.handleCompetitorAnalysis(data, startTime);

        case 'create_concept':
          return await this.handleCreateConcept(data, startTime);

        case 'define_spec':
          return await this.handleDefineSpec(data, startTime);

        case 'analyze_feedback':
          return await this.handleAnalyzeFeedback(data, startTime);

        case 'identify_improvements':
          return await this.handleIdentifyImprovements(data, startTime);

        case 'full_product_review':
          return await this.handleFullProductReview(data, startTime);

        default:
          return await this.handlePeriodicReview(startTime);
      }
    } catch (error) {
      this.logger.error('Product Agent execution failed', error as Error);
      return this.createErrorResult(
        'PRODUCT_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 시장 조사
   */
  private async handleMarketResearch(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.researchSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Research SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<ResearchTaskPayload> = {
      taskId: `market-research-${Date.now()}`,
      type: 'market_research',
      priority: 6,
      data: {
        action: 'market_research',
        category: data.category as ProductCategory,
        keywords: data.keywords as string[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.researchSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'market_research' },
      startTime
    );
  }

  /**
   * 경쟁사 분석
   */
  private async handleCompetitorAnalysis(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.researchSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Research SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<ResearchTaskPayload> = {
      taskId: `competitor-${Date.now()}`,
      type: 'competitor_analysis',
      priority: 6,
      data: {
        action: 'competitor_analysis',
        competitors: data.competitors as string[],
        category: data.category as ProductCategory,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.researchSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'competitor_analysis' },
      startTime
    );
  }

  /**
   * 제품 컨셉 생성
   */
  private async handleCreateConcept(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.planningSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Planning SubAgent not initialized', startTime, false);
    }

    // 컨셉 생성은 승인 필요
    if (this.needsApproval(ApprovalLevel.MEDIUM)) {
      const approval = await this.requestApproval(
        '신제품 컨셉 생성 승인',
        `카테고리: ${data.category}, 제품명: ${data.workingName}`,
        data
      );

      if (!approval.approved) {
        return this.createErrorResult('APPROVAL_REJECTED', 'Concept creation was not approved', startTime, false);
      }
    }

    const task: TaskPayload<PlanningTaskPayload> = {
      taskId: `concept-${Date.now()}`,
      type: 'create_concept',
      priority: 7,
      data: {
        action: 'create_concept',
        data: data.conceptData as Partial<ProductConcept>,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.planningSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'create_concept' },
      startTime
    );
  }

  /**
   * 제품 스펙 정의
   */
  private async handleDefineSpec(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.planningSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Planning SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<PlanningTaskPayload> = {
      taskId: `spec-${Date.now()}`,
      type: 'define_spec',
      priority: 7,
      data: {
        action: 'define_spec',
        conceptId: data.conceptId as string,
        data: data.specData as Partial<ProductSpec>,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.planningSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'define_spec' },
      startTime
    );
  }

  /**
   * 피드백 분석
   */
  private async handleAnalyzeFeedback(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.feedbackSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Feedback SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<FeedbackAnalysisTaskPayload> = {
      taskId: `feedback-${Date.now()}`,
      type: 'analyze_sentiment',
      priority: 5,
      data: {
        action: 'analyze_sentiment',
        productId: data.productId as string,
        sources: data.sources as FeedbackSource[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.feedbackSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'analyze_feedback' },
      startTime
    );
  }

  /**
   * 개선점 도출
   */
  private async handleIdentifyImprovements(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.feedbackSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Feedback SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<FeedbackAnalysisTaskPayload> = {
      taskId: `improvements-${Date.now()}`,
      type: 'identify_improvements',
      priority: 6,
      data: {
        action: 'identify_improvements',
        productId: data.productId as string,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.feedbackSubAgent.executeTask(task);

    // 중요 개선점이 있으면 알림
    if (result.data && (result.data as any).analysis?.improvementItems?.length > 5) {
      await this.sendNotification(
        NotificationPriority.MEDIUM,
        'product-team',
        '제품 개선점 다수 발견',
        `${(result.data as any).analysis.improvementItems.length}건의 개선점이 도출되었습니다.`
      );
    }

    return this.createSuccessResult(
      { taskResult: result, type: 'identify_improvements' },
      startTime
    );
  }

  /**
   * 전체 제품 리뷰
   */
  private async handleFullProductReview(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    const productId = data.productId as string;
    const results: Record<string, TaskResult | undefined> = {};

    // 1. 피드백 수집
    results.feedback = await this.feedbackSubAgent?.executeTask({
      taskId: `full-feedback-${Date.now()}`,
      type: 'collect_feedback',
      priority: 5,
      data: { action: 'collect_feedback', productId },
      createdAt: new Date(),
      retryCount: 0,
    });

    // 2. 피드백 분석
    results.analysis = await this.feedbackSubAgent?.executeTask({
      taskId: `full-analysis-${Date.now()}`,
      type: 'analyze_sentiment',
      priority: 5,
      data: { action: 'analyze_sentiment', productId },
      createdAt: new Date(),
      retryCount: 0,
    });

    // 3. 개선점 도출
    results.improvements = await this.feedbackSubAgent?.executeTask({
      taskId: `full-improvements-${Date.now()}`,
      type: 'identify_improvements',
      priority: 5,
      data: { action: 'identify_improvements', productId },
      createdAt: new Date(),
      retryCount: 0,
    });

    return this.createSuccessResult(
      { results, productId, type: 'full_product_review' },
      startTime,
      { processed: 3 }
    );
  }

  /**
   * 주기적 리뷰 (스케줄)
   */
  private async handlePeriodicReview(startTime: number): Promise<AgentResult> {
    this.logger.info('Running periodic product review...');

    // 트렌드 분석
    const trendResult = await this.researchSubAgent?.executeTask({
      taskId: `periodic-trend-${Date.now()}`,
      type: 'trend_analysis',
      priority: 4,
      data: { action: 'trend_analysis' },
      createdAt: new Date(),
      retryCount: 0,
    });

    // 전체 피드백 집계
    const feedbackResult = await this.feedbackSubAgent?.executeTask({
      taskId: `periodic-feedback-${Date.now()}`,
      type: 'aggregate_feedback',
      priority: 4,
      data: { action: 'aggregate_feedback', productId: 'all' },
      createdAt: new Date(),
      retryCount: 0,
    });

    return this.createSuccessResult(
      { trendResult, feedbackResult, type: 'periodic_review' },
      startTime,
      { processed: 2 }
    );
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.logger.info('Received sub-agent result', {
      taskId: result.taskId,
      status: result.status,
    });
  }
}

// =============================================================================
// Research SubAgent - 시장조사/경쟁사분석
// =============================================================================

export class ResearchSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Research SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as ResearchTaskPayload;

    this.logger.info('Research SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'market_research':
        return await this.marketResearch(data, startTime);

      case 'competitor_analysis':
        return await this.competitorAnalysis(data, startTime);

      case 'trend_analysis':
        return await this.trendAnalysis(data, startTime);

      case 'consumer_research':
        return await this.consumerResearch(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 시장 조사
   */
  private async marketResearch(data: ResearchTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Conducting market research...', { category: data.category });

    const research: MarketResearch = {
      id: `research-${Date.now()}`,
      type: ResearchType.MARKET_ANALYSIS,
      title: `${data.category || '전체'} 카테고리 시장 분석`,
      summary: '유아용품 시장은 연 15% 성장세를 보이며, 프리미엄 제품 수요가 증가하고 있습니다.',
      targetCategory: data.category || ProductCategory.DIAPER,
      marketSize: {
        totalValue: 2500000000000,
        growthRate: 15.2,
        unit: 'KRW',
        year: 2024,
      },
      keyFindings: [
        '친환경 제품 선호도 급증 (전년 대비 +25%)',
        '온라인 구매 비중 65% 돌파',
        '구독 서비스 이용률 증가',
      ],
      opportunities: [
        '친환경 라인업 확대',
        '구독 서비스 강화',
        '프리미엄 세그먼트 진입',
      ],
      threats: [
        '대기업 시장 진입',
        '원자재 가격 상승',
        '규제 강화',
      ],
      dataSources: ['통계청', '시장조사 리포트', '소비자 설문'],
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };

    return this.createSuccessResult(
      { research },
      startTime
    );
  }

  /**
   * 경쟁사 분석
   */
  private async competitorAnalysis(data: ResearchTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Analyzing competitors...', { competitors: data.competitors });

    const analysis: CompetitorAnalysis = {
      id: `competitor-${Date.now()}`,
      competitorName: data.competitors?.[0] || '경쟁사 A',
      category: data.category || ProductCategory.DIAPER,
      products: [
        {
          name: '경쟁사 프리미엄 기저귀',
          price: 35000,
          features: ['유기농 소재', '피부 저자극', '흡수력 강화'],
          rating: 4.5,
          reviewCount: 1200,
          channels: ['쿠팡', '네이버', '자사몰'],
        },
      ],
      strengths: ['브랜드 인지도', '유통망', '마케팅 투자'],
      weaknesses: ['가격 경쟁력', '고객 서비스', '제품 다양성'],
      priceRange: {
        min: 25000,
        max: 45000,
        average: 32000,
      },
      marketShare: 15.5,
      marketingStrategies: ['인플루언서 마케팅', 'SNS 광고', '체험단 운영'],
      analyzedAt: new Date(),
    };

    return this.createSuccessResult(
      { analysis },
      startTime
    );
  }

  /**
   * 트렌드 분석
   */
  private async trendAnalysis(data: ResearchTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Analyzing trends...');

    const report: TrendReport = {
      id: `trend-${Date.now()}`,
      category: data.category || ProductCategory.DIAPER,
      period: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      risingTrends: [
        {
          name: '친환경 소재',
          description: '생분해성, 유기농 소재 선호 증가',
          growthRate: 35,
          confidence: 0.9,
          relatedKeywords: ['에코', '유기농', '생분해'],
        },
        {
          name: '구독 경제',
          description: '정기 배송 서비스 이용 증가',
          growthRate: 28,
          confidence: 0.85,
          relatedKeywords: ['정기배송', '구독', '자동주문'],
        },
      ],
      decliningTrends: [
        {
          name: '단품 구매',
          description: '단품 구매 비중 감소',
          growthRate: -15,
          confidence: 0.75,
          relatedKeywords: ['단품', '낱개'],
        },
      ],
      stableTrends: [
        {
          name: '프리미엄 제품',
          description: '프리미엄 세그먼트 안정적 유지',
          growthRate: 5,
          confidence: 0.8,
          relatedKeywords: ['프리미엄', '고급'],
        },
      ],
      emergingKeywords: ['무향', '저자극', '민감성', '피부장벽'],
      consumerPreferenceChanges: [
        '가격보다 품질 중시 경향 강화',
        '브랜드 스토리 및 가치 중요시',
        '리뷰 및 추천 의존도 증가',
      ],
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { report },
      startTime
    );
  }

  /**
   * 소비자 조사
   */
  private async consumerResearch(data: ResearchTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Conducting consumer research...');

    const research = {
      id: `consumer-${Date.now()}`,
      type: ResearchType.CONSUMER_RESEARCH,
      sampleSize: 500,
      demographics: {
        ageGroups: {
          '20-29': 15,
          '30-39': 55,
          '40-49': 25,
          '50+': 5,
        },
        regions: {
          서울: 35,
          경기: 30,
          기타수도권: 15,
          지방: 20,
        },
      },
      purchaseFactors: [
        { factor: '제품 안전성', importance: 9.2 },
        { factor: '피부 저자극', importance: 8.8 },
        { factor: '가격', importance: 7.5 },
        { factor: '브랜드 신뢰도', importance: 7.3 },
      ],
      brandAwareness: {
        sundayhug: 45,
        competitorA: 78,
        competitorB: 65,
      },
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { research },
      startTime
    );
  }
}

// =============================================================================
// Planning SubAgent - 제품 기획
// =============================================================================

export class PlanningSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Planning SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as PlanningTaskPayload;

    this.logger.info('Planning SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'create_concept':
        return await this.createConcept(data, startTime);

      case 'define_spec':
        return await this.defineSpec(data, startTime);

      case 'create_roadmap':
        return await this.createRoadmap(data, startTime);

      case 'update_milestone':
        return await this.updateMilestone(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 제품 컨셉 생성
   */
  private async createConcept(data: PlanningTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating product concept...');

    const concept: ProductConcept = {
      id: `concept-${Date.now()}`,
      workingName: (data.data as any)?.workingName || '신제품 컨셉',
      category: (data.data as any)?.category || ProductCategory.DIAPER,
      stage: ProductStage.CONCEPT,
      targetCustomer: {
        ageGroup: '30-40대 부모',
        characteristics: ['친환경 관심', '프리미엄 선호', '온라인 구매 선호'],
        painPoints: ['피부 트러블 우려', '환경 문제 인식', '가격 부담'],
      },
      valueProposition: '아이의 피부와 지구를 동시에 생각하는 프리미엄 유기농 기저귀',
      keyFeatures: [
        '100% 유기농 면 사용',
        '생분해성 외피',
        '저자극 인증',
        '구독 서비스 연동',
      ],
      differentiators: [
        '국내 유일 완전 생분해 기저귀',
        '피부과 공동 개발',
        '탄소 중립 인증',
      ],
      estimatedPrice: {
        min: 35000,
        max: 45000,
        target: 39900,
      },
      targetLaunchDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.createSuccessResult(
      { concept },
      startTime
    );
  }

  /**
   * 제품 스펙 정의
   */
  private async defineSpec(data: PlanningTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Defining product spec...', { conceptId: data.conceptId });

    const spec: Partial<ProductSpec> = {
      id: `spec-${Date.now()}`,
      conceptId: data.conceptId,
      productName: '에코허그 프리미엄',
      basic: {
        sku: 'EH-DIAPER-001',
        weight: 200,
        dimensions: {
          width: 400,
          height: 150,
          depth: 120,
        },
      },
      ingredients: [
        {
          name: '유기농 면',
          percentage: 45,
          purpose: '내피',
          origin: '국내산',
        },
        {
          name: '대나무 섬유',
          percentage: 30,
          purpose: '흡수층',
          origin: '국내산',
        },
      ],
      certifications: [
        {
          name: '유기농 인증',
          issuedBy: 'GOTS',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          name: '피부 저자극 테스트',
          issuedBy: '피부과학연구소',
        },
      ],
      packageOptions: [
        {
          optionName: '소형 (1팩)',
          quantity: 30,
          price: 39900,
          sku: 'EH-DIAPER-001-S',
        },
        {
          optionName: '대형 (3팩)',
          quantity: 90,
          price: 109900,
          sku: 'EH-DIAPER-001-L',
        },
      ],
      version: '1.0',
      status: 'draft',
    };

    return this.createSuccessResult(
      { spec },
      startTime
    );
  }

  /**
   * 로드맵 생성
   */
  private async createRoadmap(data: PlanningTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating product roadmap...');

    const roadmap: ProductRoadmap = {
      id: `roadmap-${Date.now()}`,
      productId: data.conceptId || 'unknown',
      milestones: [
        {
          id: 'ms-1',
          name: '컨셉 확정',
          description: '최종 제품 컨셉 및 타겟 고객 확정',
          stage: ProductStage.CONCEPT,
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'pending',
          owner: 'product-team',
          dependencies: [],
          deliverables: ['컨셉 문서', '타겟 고객 분석'],
        },
        {
          id: 'ms-2',
          name: '스펙 확정',
          description: '제품 스펙 및 원가 분석 완료',
          stage: ProductStage.DEVELOPMENT,
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          status: 'pending',
          owner: 'product-team',
          dependencies: ['ms-1'],
          deliverables: ['제품 스펙 문서', '원가 분석표'],
        },
        {
          id: 'ms-3',
          name: '샘플 제작',
          description: '초도 샘플 제작 및 테스트',
          stage: ProductStage.TESTING,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'pending',
          owner: 'manufacturing-team',
          dependencies: ['ms-2'],
          deliverables: ['샘플 제품', '테스트 결과'],
        },
        {
          id: 'ms-4',
          name: '출시',
          description: '제품 출시',
          stage: ProductStage.LAUNCHED,
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          status: 'pending',
          owner: 'marketing-team',
          dependencies: ['ms-3'],
          deliverables: ['출시 제품', '마케팅 자료'],
        },
      ],
      startDate: new Date(),
      targetLaunchDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: 'planning',
      updatedAt: new Date(),
    };

    return this.createSuccessResult(
      { roadmap },
      startTime
    );
  }

  /**
   * 마일스톤 업데이트
   */
  private async updateMilestone(data: PlanningTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Updating milestone...', { milestoneId: data.milestoneId });

    return this.createSuccessResult(
      {
        milestoneId: data.milestoneId,
        updated: true,
        updatedAt: new Date(),
      },
      startTime
    );
  }
}

// =============================================================================
// Feedback Analysis SubAgent - 피드백 분석
// =============================================================================

export class FeedbackAnalysisSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Feedback Analysis SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as FeedbackAnalysisTaskPayload;

    this.logger.info('Feedback Analysis SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'collect_feedback':
        return await this.collectFeedback(data, startTime);

      case 'analyze_sentiment':
        return await this.analyzeSentiment(data, startTime);

      case 'aggregate_feedback':
        return await this.aggregateFeedback(data, startTime);

      case 'identify_improvements':
        return await this.identifyImprovements(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 피드백 수집
   */
  private async collectFeedback(data: FeedbackAnalysisTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Collecting feedback...', { productId: data.productId });

    const feedbacks: ProductFeedback[] = [
      {
        id: `feedback-${Date.now()}-1`,
        productId: data.productId,
        source: FeedbackSource.REVIEW,
        category: 'quality' as any,
        sentiment: 'positive',
        score: 5,
        originalContent: '아이 피부에 트러블 없이 너무 좋아요! 재구매 의사 100%',
        summary: '피부 트러블 없음, 재구매 의사 높음',
        extractedKeywords: ['피부', '트러블없음', '재구매'],
        mentionedFeatures: ['피부 저자극'],
        collectedAt: new Date(),
        processed: false,
      },
      {
        id: `feedback-${Date.now()}-2`,
        productId: data.productId,
        source: FeedbackSource.REVIEW,
        category: 'price' as any,
        sentiment: 'neutral',
        score: 4,
        originalContent: '품질은 좋은데 가격이 조금 비싼 편이에요',
        summary: '품질 만족, 가격 아쉬움',
        extractedKeywords: ['품질', '가격', '비쌈'],
        mentionedFeatures: ['품질'],
        improvementSuggestions: ['가격 인하 또는 대용량 옵션'],
        collectedAt: new Date(),
        processed: false,
      },
    ];

    return this.createSuccessResult(
      { feedbacks, count: feedbacks.length, collectedAt: new Date() },
      startTime,
      { processed: feedbacks.length }
    );
  }

  /**
   * 감성 분석
   */
  private async analyzeSentiment(data: FeedbackAnalysisTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Analyzing sentiment...', { productId: data.productId });

    const aggregation: FeedbackAggregation = {
      productId: data.productId,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      totalCount: 150,
      sentimentDistribution: {
        positive: 120,
        neutral: 20,
        negative: 10,
      },
      averageScore: 4.5,
      categoryDistribution: [
        { category: 'quality' as any, count: 80, avgScore: 4.7 },
        { category: 'price' as any, count: 40, avgScore: 3.8 },
        { category: 'design' as any, count: 30, avgScore: 4.5 },
      ],
      topPositiveKeywords: [
        { keyword: '피부', count: 45 },
        { keyword: '저자극', count: 38 },
        { keyword: '흡수력', count: 32 },
      ],
      topNegativeKeywords: [
        { keyword: '가격', count: 15 },
        { keyword: '배송', count: 8 },
      ],
      trend: 'improving',
      generatedAt: new Date(),
    };

    return this.createSuccessResult(
      { aggregation },
      startTime
    );
  }

  /**
   * 피드백 집계
   */
  private async aggregateFeedback(data: FeedbackAnalysisTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Aggregating feedback...', { productId: data.productId });

    const summary = {
      productId: data.productId === 'all' ? '전체 제품' : data.productId,
      totalFeedbacks: 500,
      averageRating: 4.3,
      nps: 72,
      topIssues: [
        '가격 관련 의견 증가',
        '배송 속도 개선 요청',
        '다양한 사이즈 옵션 요청',
      ],
      highlights: [
        '피부 저자극 만족도 높음',
        '제품 품질 전반적 호평',
        '재구매율 78%',
      ],
      aggregatedAt: new Date(),
    };

    return this.createSuccessResult(
      { summary },
      startTime
    );
  }

  /**
   * 개선점 도출
   */
  private async identifyImprovements(data: FeedbackAnalysisTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Identifying improvements...', { productId: data.productId });

    const analysis: ImprovementAnalysis = {
      id: `improvement-${Date.now()}`,
      productId: data.productId,
      improvementItems: [
        {
          id: 'imp-1',
          category: 'price' as any,
          description: '대용량 패키지 옵션 추가',
          mentionCount: 45,
          impactScore: 8,
          difficultyScore: 3,
          estimatedCost: 5000000,
          evidenceFeedbackIds: ['fb-1', 'fb-2', 'fb-3'],
          status: 'identified',
        },
        {
          id: 'imp-2',
          category: 'packaging' as any,
          description: '개봉 편의성 개선',
          mentionCount: 28,
          impactScore: 6,
          difficultyScore: 4,
          estimatedCost: 3000000,
          evidenceFeedbackIds: ['fb-4', 'fb-5'],
          status: 'identified',
        },
        {
          id: 'imp-3',
          category: 'functionality' as any,
          description: '밴드 탄력 조절 기능',
          mentionCount: 22,
          impactScore: 7,
          difficultyScore: 7,
          estimatedCost: 15000000,
          evidenceFeedbackIds: ['fb-6', 'fb-7'],
          status: 'analyzing',
        },
      ],
      priorityMatrix: {
        highImpactEasy: [],
        highImpactHard: [],
        lowImpactEasy: [],
        lowImpactHard: [],
      },
      recommendations: [
        '대용량 패키지 우선 개발 권장 (ROI 높음)',
        '포장 개선은 다음 생산 배치부터 적용 가능',
        '밴드 기능 개선은 장기 과제로 검토',
      ],
      expectedOutcomes: [
        {
          metric: '고객 만족도',
          currentValue: 4.3,
          expectedValue: 4.6,
          improvement: '+7%',
        },
        {
          metric: 'NPS',
          currentValue: 72,
          expectedValue: 78,
          improvement: '+6pts',
        },
      ],
      generatedAt: new Date(),
    };

    // 우선순위 매트릭스 채우기
    for (const item of analysis.improvementItems) {
      if (item.impactScore >= 7 && item.difficultyScore <= 5) {
        analysis.priorityMatrix.highImpactEasy.push(item);
      } else if (item.impactScore >= 7 && item.difficultyScore > 5) {
        analysis.priorityMatrix.highImpactHard.push(item);
      } else if (item.impactScore < 7 && item.difficultyScore <= 5) {
        analysis.priorityMatrix.lowImpactEasy.push(item);
      } else {
        analysis.priorityMatrix.lowImpactHard.push(item);
      }
    }

    return this.createSuccessResult(
      { analysis },
      startTime
    );
  }
}

// =============================================================================
// Export
// =============================================================================

export default ProductAgent;
