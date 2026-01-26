/**
 * 썬데이허그 AI 에이전트 시스템 - Marketing Agent
 *
 * 마케팅 전략 수립 및 실행을 총괄하는 메인 에이전트입니다.
 * 7개의 서브 에이전트를 관리하며 통합 마케팅 성과를 최적화합니다.
 *
 * 서브 에이전트:
 * - PerformanceSubAgent: 광고 데이터 수집, ROAS 분석, 예산 최적화
 * - ContentSubAgent: 카드뉴스, 블로그, SNS 콘텐츠 제작
 * - CRMSubAgent: 고객 세그먼트, 알림톡 발송, 재구매 유도
 * - PromotionSubAgent: 프로모션 기획, 쿠폰 관리, 성과 분석
 * - InfluencerSubAgent: 인플루언서 발굴, 컨택, 시딩
 * - SocialListeningSubAgent: 커뮤니티 모니터링, 트렌드 분석
 * - BrandSubAgent: PR, 브랜드 콜라보, 스토리텔링
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
  MarketingAgentData,
  MarketingAgentConfig,
  AdCampaign,
  AdMetrics,
  ROASAnalysis,
  BudgetRecommendation,
  MarketingContent,
  CustomerSegment,
  Promotion,
  Influencer,
  SocialMention,
  TrendAnalysis,
  AdPlatform,
  CampaignStatus,
} from './types';

// 서브 에이전트 imports
import { PerformanceSubAgent } from './sub-agents/PerformanceSubAgent';
import { ContentSubAgent } from './sub-agents/ContentSubAgent';
import { CRMSubAgent } from './sub-agents/CRMSubAgent';
import { PromotionSubAgent } from './sub-agents/PromotionSubAgent';
import { InfluencerSubAgent } from './sub-agents/InfluencerSubAgent';
import { SocialListeningSubAgent } from './sub-agents/SocialListeningSubAgent';
import { BrandSubAgent } from './sub-agents/BrandSubAgent';

/**
 * Marketing Agent 기본 설정
 */
const DEFAULT_CONFIG: AgentConfig = {
  id: 'marketing-agent',
  name: 'Marketing Agent',
  description: '마케팅 전략 수립 및 실행을 총괄하는 메인 에이전트',
  enabled: true,
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 300000, // 5분
  approvalLevel: ApprovalLevel.MEDIUM,
  metadata: {
    version: '1.0.0',
    category: 'marketing',
  },
};

/**
 * Marketing Agent 기본 마케팅 설정
 */
const DEFAULT_MARKETING_CONFIG: MarketingAgentConfig = {
  targetRoas: 3.0,
  dailyBudgetLimit: 500000,
  autoOptimization: true,
  notifications: {
    roasThreshold: 2.0,
    budgetAlertPercent: 80,
    negativeSentimentThreshold: 0.3,
  },
  connectedPlatforms: [AdPlatform.META, AdPlatform.NAVER, AdPlatform.KAKAO],
};

/**
 * Marketing Agent 클래스
 */
export class MarketingAgent extends BaseAgent {
  /** 마케팅 설정 */
  private marketingConfig: MarketingAgentConfig;

  /** 서브 에이전트들 */
  private performanceAgent!: PerformanceSubAgent;
  private contentAgent!: ContentSubAgent;
  private crmAgent!: CRMSubAgent;
  private promotionAgent!: PromotionSubAgent;
  private influencerAgent!: InfluencerSubAgent;
  private socialListeningAgent!: SocialListeningSubAgent;
  private brandAgent!: BrandSubAgent;

  /** 부모 참조 (서브 에이전트용) */
  private parentRef: ParentAgentRef;

  /**
   * Marketing Agent 생성자
   * @param config - 에이전트 설정 (선택)
   * @param marketingConfig - 마케팅 설정 (선택)
   */
  constructor(
    config?: Partial<AgentConfig>,
    marketingConfig?: Partial<MarketingAgentConfig>
  ) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.marketingConfig = { ...DEFAULT_MARKETING_CONFIG, ...marketingConfig };

    // 부모 참조 생성
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

  /**
   * 초기화 로직
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Marketing Agent...');

    // 서브 에이전트 초기화
    await this.initializeSubAgents();

    // AgentRegistry에 등록
    this.registerSubAgents();

    this.logger.info('Marketing Agent initialized with 7 sub-agents');
  }

  /**
   * 메인 실행 로직
   * @param context - 실행 컨텍스트
   * @returns 실행 결과
   */
  protected async run(context: AgentContext): Promise<AgentResult<MarketingAgentData>> {
    const startTime = Date.now();
    this.logger.info('Running Marketing Agent...', { data: context.data });

    try {
      const taskType = (context.data?.taskType as string) || 'daily_report';
      let result: MarketingAgentData = {};

      switch (taskType) {
        case 'daily_report':
          result = await this.generateDailyReport();
          break;

        case 'performance_analysis':
          result = await this.analyzePerformance(context.data);
          break;

        case 'content_creation':
          result = await this.createContent(context.data);
          break;

        case 'campaign_optimization':
          result = await this.optimizeCampaigns(context.data);
          break;

        case 'crm_campaign':
          result = await this.executeCRMCampaign(context.data);
          break;

        case 'trend_analysis':
          result = await this.analyzeTrends(context.data);
          break;

        case 'influencer_outreach':
          result = await this.manageInfluencers(context.data);
          break;

        case 'promotion_management':
          result = await this.managePromotions(context.data);
          break;

        case 'brand_activity':
          result = await this.manageBrandActivities(context.data);
          break;

        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Marketing Agent execution failed', error as Error);
      throw error;
    }
  }

  /**
   * 정리 로직
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Marketing Agent...');
    // 필요한 정리 작업 수행
  }

  // ===========================================================================
  // 서브 에이전트 관리
  // ===========================================================================

  /**
   * 서브 에이전트 초기화
   */
  private async initializeSubAgents(): Promise<void> {
    const baseSubConfig = {
      parentRef: this.parentRef,
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
    };

    this.performanceAgent = new PerformanceSubAgent({
      ...baseSubConfig,
      id: 'marketing-performance-agent',
      name: 'Performance SubAgent',
      description: '광고 데이터 수집, ROAS 분석, 예산 최적화',
    });

    this.contentAgent = new ContentSubAgent({
      ...baseSubConfig,
      id: 'marketing-content-agent',
      name: 'Content SubAgent',
      description: '카드뉴스, 블로그, SNS 콘텐츠 제작',
    });

    this.crmAgent = new CRMSubAgent({
      ...baseSubConfig,
      id: 'marketing-crm-agent',
      name: 'CRM SubAgent',
      description: '고객 세그먼트, 알림톡 발송, 재구매 유도',
    });

    this.promotionAgent = new PromotionSubAgent({
      ...baseSubConfig,
      id: 'marketing-promotion-agent',
      name: 'Promotion SubAgent',
      description: '프로모션 기획, 쿠폰 관리, 성과 분석',
    });

    this.influencerAgent = new InfluencerSubAgent({
      ...baseSubConfig,
      id: 'marketing-influencer-agent',
      name: 'Influencer SubAgent',
      description: '인플루언서 발굴, 컨택, 시딩',
    });

    this.socialListeningAgent = new SocialListeningSubAgent({
      ...baseSubConfig,
      id: 'marketing-social-listening-agent',
      name: 'Social Listening SubAgent',
      description: '커뮤니티 모니터링, 트렌드 분석',
    });

    this.brandAgent = new BrandSubAgent({
      ...baseSubConfig,
      id: 'marketing-brand-agent',
      name: 'Brand SubAgent',
      description: 'PR, 브랜드 콜라보, 스토리텔링',
    });
  }

  /**
   * 서브 에이전트 레지스트리 등록
   */
  private registerSubAgents(): void {
    const subAgents = [
      this.performanceAgent,
      this.contentAgent,
      this.crmAgent,
      this.promotionAgent,
      this.influencerAgent,
      this.socialListeningAgent,
      this.brandAgent,
    ];

    for (const agent of subAgents) {
      agentRegistry.register(agent, {
        type: 'sub',
        parentId: this.config.id,
        tags: ['marketing', 'lane2'],
      });
    }
  }

  // ===========================================================================
  // 서브 에이전트 콜백 핸들러
  // ===========================================================================

  /**
   * 서브 에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.logger.info('Sub-agent task completed', {
      taskId: result.taskId,
      status: result.status,
    });
  }

  /**
   * 서브 에이전트 진행 상황 처리
   */
  private async handleSubAgentProgress(progress: {
    percentage: number;
    currentStep?: string;
    message?: string;
  }): Promise<void> {
    this.logger.debug('Sub-agent progress', progress);
  }

  /**
   * 서브 에이전트 에러 처리
   */
  private async handleSubAgentError(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    this.logger.error('Sub-agent error', error, context);
  }

  /**
   * 승인 요청 처리
   */
  private async handleApprovalRequest(
    title: string,
    description: string,
    data: unknown
  ): Promise<boolean> {
    // 서브 에이전트의 승인 요청을 상위로 전달
    const response = await this.requestApproval(title, description, data);
    return response.approved;
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 일일 마케팅 리포트 생성
   */
  private async generateDailyReport(): Promise<MarketingAgentData> {
    this.logger.info('Generating daily marketing report...');

    // 병렬로 각 서브 에이전트에서 데이터 수집
    const [
      performanceData,
      contentData,
      socialData,
    ] = await Promise.all([
      this.performanceAgent.collectDailyMetrics(),
      this.contentAgent.getPublishedContent(),
      this.socialListeningAgent.getDailyMentions(),
    ]);

    // 성과 요약 생성
    const performanceSummary = await this.generatePerformanceSummary(performanceData);

    // ROAS가 목표 이하인 경우 알림
    if (performanceSummary.overallRoas < this.marketingConfig.targetRoas) {
      await this.sendNotification(
        NotificationPriority.HIGH,
        'marketing',
        'ROAS 목표 미달 알림',
        `현재 ROAS ${performanceSummary.overallRoas.toFixed(2)}가 목표 ${this.marketingConfig.targetRoas}에 미달합니다.`,
        `${process.env.DASHBOARD_URL}/marketing/performance`
      );
    }

    return {
      campaigns: performanceData.campaigns,
      contents: contentData.contents,
      mentions: socialData.mentions,
      trendAnalysis: socialData.trendAnalysis,
      performanceSummary,
    };
  }

  /**
   * 성과 분석
   */
  private async analyzePerformance(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const dateRange = data?.dateRange as { start: Date; end: Date } | undefined;
    const platformFilter = data?.platform as AdPlatform | undefined;

    const analysis = await this.performanceAgent.analyzePerformance({
      dateRange,
      platform: platformFilter,
    });

    return {
      campaigns: analysis.campaigns,
      performanceSummary: analysis.summary,
    };
  }

  /**
   * 콘텐츠 생성
   */
  private async createContent(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const contentType = data?.contentType as string;
    const topic = data?.topic as string;
    const productId = data?.productId as string;

    const content = await this.contentAgent.createContent({
      type: contentType,
      topic,
      productId,
    });

    return {
      contents: [content],
    };
  }

  /**
   * 캠페인 최적화
   */
  private async optimizeCampaigns(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    // ROAS 분석
    const roasAnalysis = await this.performanceAgent.analyzeROAS();

    // 예산 최적화 권장사항 생성
    const recommendations = await this.performanceAgent.generateBudgetRecommendations(
      roasAnalysis
    );

    // 자동 최적화가 활성화된 경우 실행
    if (this.marketingConfig.autoOptimization) {
      // 높은 우선순위 권장사항 중 승인 불필요한 것 자동 실행
      for (const rec of recommendations.filter(r => r.priority === 'high')) {
        if (rec.action === 'pause') {
          // 캠페인 일시 중지는 승인 필요
          const approved = await this.requestApproval(
            '캠페인 일시 중지 요청',
            `${rec.campaignId} 캠페인의 ROAS가 낮아 일시 중지를 권장합니다. 사유: ${rec.reason}`,
            rec
          );
          if (approved.approved) {
            await this.performanceAgent.pauseCampaign(rec.campaignId);
          }
        } else if (rec.action === 'decrease' && (rec.budgetChangePercent || 0) > 30) {
          // 30% 이상 감소는 승인 필요
          const approved = await this.requestApproval(
            '예산 대폭 감소 요청',
            `${rec.campaignId} 캠페인의 예산을 ${rec.budgetChangePercent}% 감소시킬 것을 권장합니다.`,
            rec
          );
          if (approved.approved) {
            await this.performanceAgent.adjustBudget(rec.campaignId, rec.budgetChangePercent!);
          }
        } else {
          // 기타 조정은 자동 실행
          await this.performanceAgent.adjustBudget(rec.campaignId, rec.budgetChangePercent || 0);
        }
      }
    }

    return {
      performanceSummary: {
        totalSpend: roasAnalysis.reduce((sum, r) => sum + (r.currentRoas || 0), 0),
        totalRevenue: 0,
        overallRoas: roasAnalysis.reduce((sum, r) => sum + r.currentRoas, 0) / roasAnalysis.length,
        topCampaigns: roasAnalysis
          .filter(r => r.currentRoas > this.marketingConfig.targetRoas)
          .map(r => r.campaignId),
        recommendations: recommendations.map(r => r.reason),
      },
    };
  }

  /**
   * CRM 캠페인 실행
   */
  private async executeCRMCampaign(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const campaignType = data?.campaignType as string;
    const segmentId = data?.segmentId as string;

    // 세그먼트 조회
    const segment = await this.crmAgent.getSegment(segmentId);

    // 캠페인 실행
    const result = await this.crmAgent.executeCampaign({
      type: campaignType,
      segment,
      ...data,
    });

    return {
      segments: [segment],
    };
  }

  /**
   * 트렌드 분석
   */
  private async analyzeTrends(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const keywords = data?.keywords as string[] | undefined;
    const includeBrandMentions = data?.includeBrandMentions !== false;

    const trendAnalysis = await this.socialListeningAgent.analyzeTrends({
      keywords,
      includeBrandMentions,
    });

    // 부정적 감성 비율이 높으면 알림
    if (
      trendAnalysis.sentimentDistribution.negative >
      this.marketingConfig.notifications.negativeSentimentThreshold
    ) {
      await this.sendNotification(
        NotificationPriority.HIGH,
        'marketing',
        '부정적 감성 급증 알림',
        `부정적 감성 비율이 ${(trendAnalysis.sentimentDistribution.negative * 100).toFixed(1)}%로 임계치를 초과했습니다.`,
        `${process.env.DASHBOARD_URL}/marketing/social-listening`
      );
    }

    return {
      trendAnalysis,
    };
  }

  /**
   * 인플루언서 관리
   */
  private async manageInfluencers(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const action = data?.action as string;

    switch (action) {
      case 'discover':
        const influencers = await this.influencerAgent.discoverInfluencers(data);
        return { influencers };

      case 'contact':
        await this.influencerAgent.contactInfluencer(data?.influencerId as string);
        break;

      case 'seeding':
        await this.influencerAgent.createSeedingCampaign(data);
        break;
    }

    return {};
  }

  /**
   * 프로모션 관리
   */
  private async managePromotions(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const action = data?.action as string;

    switch (action) {
      case 'create':
        const promotion = await this.promotionAgent.createPromotion(data);
        return { promotions: [promotion] };

      case 'analyze':
        const analysis = await this.promotionAgent.analyzePerformance(
          data?.promotionId as string
        );
        return { promotions: [analysis] };

      case 'manage_coupons':
        await this.promotionAgent.manageCoupons(data);
        break;
    }

    return {};
  }

  /**
   * 브랜드 활동 관리
   */
  private async manageBrandActivities(
    data?: Record<string, unknown>
  ): Promise<MarketingAgentData> {
    const activityType = data?.activityType as string;

    switch (activityType) {
      case 'pr':
        await this.brandAgent.managePR(data);
        break;

      case 'collaboration':
        await this.brandAgent.manageCollaboration(data);
        break;

      case 'storytelling':
        const content = await this.brandAgent.createBrandStory(data);
        return { contents: [content] };
    }

    return {};
  }

  // ===========================================================================
  // 헬퍼 메서드
  // ===========================================================================

  /**
   * 성과 요약 생성
   */
  private async generatePerformanceSummary(
    performanceData: { campaigns: AdCampaign[] }
  ): Promise<{
    totalSpend: number;
    totalRevenue: number;
    overallRoas: number;
    topCampaigns: string[];
    recommendations: string[];
  }> {
    const activeCampaigns = performanceData.campaigns.filter(
      c => c.status === CampaignStatus.ACTIVE
    );

    const totalSpend = activeCampaigns.reduce(
      (sum, c) => sum + (c.metrics?.spend || 0),
      0
    );
    const totalRevenue = activeCampaigns.reduce(
      (sum, c) => sum + (c.metrics?.revenue || 0),
      0
    );
    const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // 상위 성과 캠페인
    const topCampaigns = activeCampaigns
      .filter(c => (c.metrics?.roas || 0) > this.marketingConfig.targetRoas)
      .sort((a, b) => (b.metrics?.roas || 0) - (a.metrics?.roas || 0))
      .slice(0, 5)
      .map(c => c.id);

    // 권장사항 생성
    const recommendations: string[] = [];
    if (overallRoas < this.marketingConfig.targetRoas) {
      recommendations.push(`전체 ROAS가 목표(${this.marketingConfig.targetRoas})에 미달합니다. 저성과 캠페인 점검이 필요합니다.`);
    }

    const lowPerformers = activeCampaigns.filter(
      c => (c.metrics?.roas || 0) < this.marketingConfig.notifications.roasThreshold
    );
    if (lowPerformers.length > 0) {
      recommendations.push(`${lowPerformers.length}개 캠페인의 ROAS가 ${this.marketingConfig.notifications.roasThreshold} 미만입니다.`);
    }

    return {
      totalSpend,
      totalRevenue,
      overallRoas,
      topCampaigns,
      recommendations,
    };
  }

  /**
   * 마케팅 설정 업데이트
   */
  updateMarketingConfig(config: Partial<MarketingAgentConfig>): void {
    this.marketingConfig = { ...this.marketingConfig, ...config };
    this.logger.info('Marketing config updated', { config: this.marketingConfig });
  }

  /**
   * 현재 마케팅 설정 조회
   */
  getMarketingConfig(): MarketingAgentConfig {
    return { ...this.marketingConfig };
  }
}

export default MarketingAgent;
