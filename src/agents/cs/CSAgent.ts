/**
 * 썬데이허그 AI 에이전트 시스템 - CS Agent (고객서비스 에이전트)
 * LANE 1 - Core Operations
 *
 * 역할: 고객 문의 응대, 리뷰 관리, AS 처리, VOC 분석, 클레임 처리를 총괄하는 메인 에이전트
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
  NotificationPriority,
} from '../../types';
import {
  CSAgentConfig,
  Inquiry,
  InquiryStatus,
  Review,
  ASRequest,
  VOCAnalysisReport,
  Claim,
  ClaimStatus,
} from './types';

// 서브에이전트 imports
import { InquiryResponderSubAgent } from './sub/InquiryResponderSubAgent';
import { ReviewManagerSubAgent } from './sub/ReviewManagerSubAgent';
import { ASHandlerSubAgent } from './sub/ASHandlerSubAgent';
import { VOCAnalyzerSubAgent } from './sub/VOCAnalyzerSubAgent';
import { ClaimProcessorSubAgent } from './sub/ClaimProcessorSubAgent';

/**
 * CS Agent 실행 결과
 */
interface CSAgentResult {
  inquiriesHandled?: number;
  reviewsProcessed?: number;
  asRequestsUpdated?: number;
  vocItemsAnalyzed?: number;
  claimsProcessed?: number;
  escalatedItems?: number;
}

/**
 * CSAgent 클래스
 * 고객서비스 관련 모든 작업을 조율하는 메인 에이전트
 */
export class CSAgent extends BaseAgent {
  private csConfig: CSAgentConfig;

  // 서브에이전트
  private inquiryResponder!: InquiryResponderSubAgent;
  private reviewManager!: ReviewManagerSubAgent;
  private asHandler!: ASHandlerSubAgent;
  private vocAnalyzer!: VOCAnalyzerSubAgent;
  private claimProcessor!: ClaimProcessorSubAgent;

  constructor(config?: Partial<AgentConfig>, csConfig?: Partial<CSAgentConfig>) {
    const defaultConfig: AgentConfig = {
      id: 'cs-agent',
      name: 'CS 에이전트',
      description: '고객 문의 응대, 리뷰 관리, AS 처리, VOC 분석, 클레임 처리를 담당합니다.',
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 300000,
      approvalLevel: ApprovalLevel.MEDIUM,
      schedule: '*/3 * * * *', // 3분마다 실행
      ...config,
    };

    super(defaultConfig);

    this.csConfig = {
      autoResponseEnabled: true,
      autoResponseConfidenceThreshold: 0.85,
      reviewAutoReplyEnabled: true,
      reviewAutoReplyMinRating: 4,
      claimAutoEscalateAmount: 100000,
      vipCustomerPriority: true,
      workingHours: {
        start: 9,
        end: 18,
        timezone: 'Asia/Seoul',
      },
      escalationRules: {
        waitTimeMinutes: 60,
        negativeSentimentThreshold: 0.3,
        repeatInquiryCount: 3,
      },
      ...csConfig,
    };
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing CSAgent and sub-agents...');

    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
    };

    // 문의응대 서브에이전트
    this.inquiryResponder = new InquiryResponderSubAgent(
      {
        id: 'inquiry-responder-sub',
        name: '문의응대 서브에이전트',
        description: '카톡/게시판/이메일 문의 자동응답',
        enabled: true,
        maxRetries: 3,
        retryDelay: 3000,
        timeout: 60000,
        approvalLevel: ApprovalLevel.LOW,
        parentRef,
      },
      {
        autoResponseEnabled: this.csConfig.autoResponseEnabled,
        confidenceThreshold: this.csConfig.autoResponseConfidenceThreshold,
      }
    );

    // 리뷰관리 서브에이전트
    this.reviewManager = new ReviewManagerSubAgent({
      id: 'review-manager-sub',
      name: '리뷰관리 서브에이전트',
      description: '리뷰수집, 감정분석, 답변생성',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    // AS처리 서브에이전트
    this.asHandler = new ASHandlerSubAgent({
      id: 'as-handler-sub',
      name: 'AS처리 서브에이전트',
      description: 'AS접수, 진행추적, 완료안내',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.MEDIUM,
      parentRef,
    });

    // VOC분석 서브에이전트
    this.vocAnalyzer = new VOCAnalyzerSubAgent({
      id: 'voc-analyzer-sub',
      name: 'VOC분석 서브에이전트',
      description: '클레임분류, 패턴분석, 인사이트 도출',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.NONE,
      parentRef,
    });

    // 클레임처리 서브에이전트
    this.claimProcessor = new ClaimProcessorSubAgent({
      id: 'claim-processor-sub',
      name: '클레임처리 서브에이전트',
      description: '클레임 접수 및 해결',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.HIGH,
      parentRef,
    });

    // AgentRegistry에 서브에이전트 등록
    const subAgents = [
      { agent: this.inquiryResponder, tags: ['cs', 'inquiry', 'lane1'] },
      { agent: this.reviewManager, tags: ['cs', 'review', 'lane1'] },
      { agent: this.asHandler, tags: ['cs', 'as', 'lane1'] },
      { agent: this.vocAnalyzer, tags: ['cs', 'voc', 'analysis', 'lane1'] },
      { agent: this.claimProcessor, tags: ['cs', 'claim', 'lane1'] },
    ];

    for (const { agent, tags } of subAgents) {
      agentRegistry.register(agent, {
        type: 'sub',
        parentId: this.config.id,
        tags,
      });
    }

    this.logger.info('CSAgent initialization completed');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up CSAgent...');

    const subAgentIds = [
      this.inquiryResponder?.getId(),
      this.reviewManager?.getId(),
      this.asHandler?.getId(),
      this.vocAnalyzer?.getId(),
      this.claimProcessor?.getId(),
    ];

    for (const id of subAgentIds) {
      if (id) await agentRegistry.unregister(id);
    }

    this.logger.info('CSAgent cleanup completed');
  }

  /**
   * 에이전트 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<CSAgentResult>> {
    const startTime = Date.now();
    const result: CSAgentResult = {
      inquiriesHandled: 0,
      reviewsProcessed: 0,
      asRequestsUpdated: 0,
      vocItemsAnalyzed: 0,
      claimsProcessed: 0,
      escalatedItems: 0,
    };

    try {
      // 1. 신규 문의 처리
      this.logger.info('Processing new inquiries...');
      const inquiryResult = await this.processInquiries(context);
      result.inquiriesHandled = inquiryResult.handled;
      result.escalatedItems = (result.escalatedItems || 0) + inquiryResult.escalated;

      // 2. 리뷰 수집 및 처리
      this.logger.info('Processing reviews...');
      const reviewResult = await this.processReviews(context);
      result.reviewsProcessed = reviewResult.processed;

      // 3. AS 요청 업데이트
      this.logger.info('Updating AS requests...');
      const asResult = await this.updateASRequests(context);
      result.asRequestsUpdated = asResult.updated;

      // 4. 클레임 처리
      this.logger.info('Processing claims...');
      const claimResult = await this.processClaims(context);
      result.claimsProcessed = claimResult.processed;
      result.escalatedItems = (result.escalatedItems || 0) + claimResult.escalated;

      // 5. VOC 분석 (시간이 되면)
      if (this.shouldRunVOCAnalysis()) {
        this.logger.info('Running VOC analysis...');
        const vocResult = await this.runVOCAnalysis(context);
        result.vocItemsAnalyzed = vocResult.analyzed;
      }

      // 긴급 문의 알림
      if (result.escalatedItems && result.escalatedItems > 0) {
        await this.sendNotification(
          NotificationPriority.HIGH,
          'cs-team',
          '에스컬레이션 알림',
          `${result.escalatedItems}건의 문의/클레임이 에스컬레이션되었습니다.`
        );
      }

      return this.createSuccessResult(result, startTime, {
        processed: (result.inquiriesHandled || 0) + (result.reviewsProcessed || 0),
      });
    } catch (error) {
      this.logger.error('CSAgent execution failed', error as Error);
      return this.createErrorResult(
        'CS_AGENT_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 문의 처리
   */
  private async processInquiries(context: AgentContext): Promise<{ handled: number; escalated: number }> {
    const task: TaskPayload = {
      taskId: `process-inquiries-${Date.now()}`,
      type: 'process_new_inquiries',
      priority: 8,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.inquiryResponder.executeTask<unknown, { handled: number; escalated: number }>(task);
    return result.data || { handled: 0, escalated: 0 };
  }

  /**
   * 리뷰 처리
   */
  private async processReviews(context: AgentContext): Promise<{ processed: number }> {
    const task: TaskPayload = {
      taskId: `process-reviews-${Date.now()}`,
      type: 'collect_and_process_reviews',
      priority: 5,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.reviewManager.executeTask<unknown, { processed: number }>(task);
    return result.data || { processed: 0 };
  }

  /**
   * AS 요청 업데이트
   */
  private async updateASRequests(context: AgentContext): Promise<{ updated: number }> {
    const task: TaskPayload = {
      taskId: `update-as-${Date.now()}`,
      type: 'update_as_status',
      priority: 6,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.asHandler.executeTask<unknown, { updated: number }>(task);
    return result.data || { updated: 0 };
  }

  /**
   * 클레임 처리
   */
  private async processClaims(context: AgentContext): Promise<{ processed: number; escalated: number }> {
    const task: TaskPayload = {
      taskId: `process-claims-${Date.now()}`,
      type: 'process_pending_claims',
      priority: 7,
      data: { autoEscalateAmount: this.csConfig.claimAutoEscalateAmount },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.claimProcessor.executeTask<unknown, { processed: number; escalated: number }>(task);
    return result.data || { processed: 0, escalated: 0 };
  }

  /**
   * VOC 분석
   */
  private async runVOCAnalysis(context: AgentContext): Promise<{ analyzed: number }> {
    const task: TaskPayload = {
      taskId: `voc-analysis-${Date.now()}`,
      type: 'analyze_voc',
      priority: 3,
      data: { period: 'daily' },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.vocAnalyzer.executeTask<unknown, { analyzed: number }>(task);
    return result.data || { analyzed: 0 };
  }

  /**
   * VOC 분석 실행 여부 판단
   */
  private shouldRunVOCAnalysis(): boolean {
    const now = new Date();
    // 매시간 정각에 실행
    return now.getMinutes() < 5;
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
      'cs-team',
      'CS 서브에이전트 오류',
      `에러: ${error.message}`
    );
  }

  // ===========================================================================
  // 공개 API 메서드
  // ===========================================================================

  /**
   * 특정 문의에 대한 AI 응답 생성
   */
  async generateInquiryResponse(inquiryId: string): Promise<{ response: string; confidence: number }> {
    const task: TaskPayload = {
      taskId: `generate-response-${inquiryId}`,
      type: 'generate_response',
      priority: 8,
      data: { inquiryId },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.inquiryResponder.executeTask<{ inquiryId: string }, { response: string; confidence: number }>(task);
    return result.data || { response: '', confidence: 0 };
  }

  /**
   * 리뷰에 대한 자동 답변 생성
   */
  async generateReviewReply(reviewId: string): Promise<{ reply: string }> {
    const task: TaskPayload = {
      taskId: `generate-reply-${reviewId}`,
      type: 'generate_review_reply',
      priority: 5,
      data: { reviewId },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.reviewManager.executeTask<{ reviewId: string }, { reply: string }>(task);
    return result.data || { reply: '' };
  }

  /**
   * AS 요청 접수
   */
  async createASRequest(request: Partial<ASRequest>): Promise<ASRequest | null> {
    const task: TaskPayload = {
      taskId: `create-as-${Date.now()}`,
      type: 'create_as_request',
      priority: 7,
      data: request,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.asHandler.executeTask<Partial<ASRequest>, ASRequest>(task);
    return result.data || null;
  }

  /**
   * VOC 리포트 생성
   */
  async generateVOCReport(period: 'daily' | 'weekly' | 'monthly'): Promise<VOCAnalysisReport | null> {
    const task: TaskPayload = {
      taskId: `voc-report-${period}-${Date.now()}`,
      type: 'generate_voc_report',
      priority: 4,
      data: { period },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.vocAnalyzer.executeTask<{ period: string }, VOCAnalysisReport>(task);
    return result.data || null;
  }

  /**
   * 클레임 접수
   */
  async submitClaim(claim: Partial<Claim>): Promise<Claim | null> {
    const task: TaskPayload = {
      taskId: `submit-claim-${Date.now()}`,
      type: 'submit_claim',
      priority: 8,
      data: claim,
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.claimProcessor.executeTask<Partial<Claim>, Claim>(task);
    return result.data || null;
  }

  /**
   * CS Agent 설정 조회
   */
  getCSConfig(): CSAgentConfig {
    return { ...this.csConfig };
  }

  /**
   * CS Agent 설정 업데이트
   */
  updateCSConfig(updates: Partial<CSAgentConfig>): void {
    this.csConfig = { ...this.csConfig, ...updates };
    this.logger.info('CSAgent config updated', updates);
  }
}

export default CSAgent;
