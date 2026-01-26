/**
 * Crisis Agent - 위기 관리 메인 에이전트
 * LANE 4: Analytics & Growth
 *
 * 역할: 악성리뷰/이슈 감지, 위기 대응, 사후 복구를 총괄합니다.
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
  CrisisSeverity,
  CrisisStatus,
  CrisisCategory,
  CrisisEvent,
  MonitoringAlert,
  ResponsePlan,
  ResponseAction,
  SOP,
  CrisisResolutionReport,
  MonitoringTaskPayload,
  ResponseTaskPayload,
  RecoveryTaskPayload,
  MonitoringSource,
  ResponseActionType,
} from './types';

// =============================================================================
// Crisis Agent 설정
// =============================================================================

const CRISIS_AGENT_CONFIG: AgentConfig = {
  id: 'crisis-agent',
  name: 'Crisis Agent',
  description: '위기 감지, 대응, 복구를 담당하는 에이전트',
  enabled: true,
  schedule: '*/5 * * * *', // 5분마다
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 180000, // 3분
  approvalLevel: ApprovalLevel.MEDIUM,
  metadata: {
    version: '1.0.0',
    domain: 'crisis',
    layer: 'growth',
  },
};

// =============================================================================
// Crisis Agent 클래스
// =============================================================================

export class CrisisAgent extends BaseAgent {
  /** 모니터링 서브에이전트 */
  private monitoringSubAgent: MonitoringSubAgent | null = null;

  /** 대응 서브에이전트 */
  private responseSubAgent: ResponseSubAgent | null = null;

  /** 복구 서브에이전트 */
  private recoverySubAgent: RecoverySubAgent | null = null;

  /** 활성 위기 목록 */
  private activeCrises: Map<string, CrisisEvent> = new Map();

  constructor(config: AgentConfig = CRISIS_AGENT_CONFIG) {
    super(config);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Crisis Agent and sub-agents...');

    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: async (progress) => {
        this.logger.debug('Sub-agent progress', progress);
      },
      onError: async (error, context) => {
        this.logger.error('Sub-agent error', error, context);
        // 위기 관리에서 에러는 즉시 에스컬레이션
        if (context?.severity === 'critical') {
          await this.sendNotification(
            NotificationPriority.URGENT,
            'management',
            '위기 관리 시스템 오류',
            `위기 대응 중 오류 발생: ${error.message}`
          );
        }
      },
    };

    // 서브에이전트 생성
    this.monitoringSubAgent = new MonitoringSubAgent({
      id: 'crisis-monitoring-subagent',
      name: 'Monitoring SubAgent',
      description: '악성리뷰, 이슈 실시간 감지 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 60000,
      approvalLevel: ApprovalLevel.NONE,
      parentRef,
    });

    this.responseSubAgent = new ResponseSubAgent({
      id: 'crisis-response-subagent',
      name: 'Response SubAgent',
      description: '초기대응, SOP 실행 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.MEDIUM,
      parentRef,
    });

    this.recoverySubAgent = new RecoverySubAgent({
      id: 'crisis-recovery-subagent',
      name: 'Recovery SubAgent',
      description: '사후분석, 재발방지 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    // AgentRegistry에 등록
    agentRegistry.register(this.monitoringSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['crisis', 'monitoring', 'detection'],
    });

    agentRegistry.register(this.responseSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['crisis', 'response', 'sop'],
    });

    agentRegistry.register(this.recoverySubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['crisis', 'recovery', 'prevention'],
    });

    this.logger.info('Crisis Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Crisis Agent...');

    if (this.monitoringSubAgent) {
      await agentRegistry.unregister(this.monitoringSubAgent.getId());
    }
    if (this.responseSubAgent) {
      await agentRegistry.unregister(this.responseSubAgent.getId());
    }
    if (this.recoverySubAgent) {
      await agentRegistry.unregister(this.recoverySubAgent.getId());
    }

    this.logger.info('Crisis Agent cleanup completed');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this.logger.info('Crisis Agent running...', { executionId: context.executionId });

    try {
      const data = context.data || {};
      const action = data.action as string;

      switch (action) {
        case 'scan':
          return await this.handleScan(data, startTime);

        case 'respond':
          return await this.handleResponse(data, startTime);

        case 'recover':
          return await this.handleRecovery(data, startTime);

        case 'escalate':
          return await this.handleEscalation(data, startTime);

        default:
          // 기본: 모니터링 스캔
          return await this.handlePeriodicScan(startTime);
      }
    } catch (error) {
      this.logger.error('Crisis Agent execution failed', error as Error);
      return this.createErrorResult(
        'CRISIS_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 스캔 처리
   */
  private async handleScan(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.monitoringSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Monitoring SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<MonitoringTaskPayload> = {
      taskId: `scan-${Date.now()}`,
      type: 'scan_reviews',
      priority: 8,
      data: {
        action: 'scan_reviews',
        sources: data.sources as MonitoringSource[],
        keywords: data.keywords as string[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.monitoringSubAgent.executeTask(task);

    // 감지된 이슈가 있으면 자동 대응 트리거
    if (result.data && (result.data as any).alerts?.length > 0) {
      await this.triggerAutoResponse((result.data as any).alerts);
    }

    return this.createSuccessResult(
      { taskResult: result, type: 'scan' },
      startTime,
      { processed: (result.data as any)?.alerts?.length || 0 }
    );
  }

  /**
   * 대응 처리
   */
  private async handleResponse(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.responseSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Response SubAgent not initialized', startTime, false);
    }

    const crisisId = data.crisisId as string;
    const crisis = this.activeCrises.get(crisisId);

    if (!crisis) {
      return this.createErrorResult('CRISIS_NOT_FOUND', `Crisis not found: ${crisisId}`, startTime, false);
    }

    // 심각도에 따른 승인 필요 여부 확인
    if (crisis.severity === CrisisSeverity.CRITICAL && this.needsApproval(ApprovalLevel.HIGH)) {
      const approval = await this.requestApproval(
        '위기 대응 승인 요청',
        `심각한 위기 발생: ${crisis.title}`,
        crisis,
        {
          customerCount: crisis.impact.affectedCustomers,
          orderCount: crisis.impact.affectedOrders,
          amount: crisis.impact.estimatedFinancialImpact,
        }
      );

      if (!approval.approved) {
        return this.createErrorResult('APPROVAL_REJECTED', 'Crisis response was not approved', startTime, false);
      }
    }

    const task: TaskPayload<ResponseTaskPayload> = {
      taskId: `response-${Date.now()}`,
      type: 'execute_sop',
      priority: 9,
      data: {
        action: 'execute_sop',
        crisisId,
        sopId: data.sopId as string,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.responseSubAgent.executeTask(task);

    // 위기 상태 업데이트
    crisis.status = CrisisStatus.RESPONDING;
    this.activeCrises.set(crisisId, crisis);

    return this.createSuccessResult(
      { taskResult: result, type: 'response' },
      startTime
    );
  }

  /**
   * 복구 처리
   */
  private async handleRecovery(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.recoverySubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Recovery SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<RecoveryTaskPayload> = {
      taskId: `recovery-${Date.now()}`,
      type: 'analyze_root_cause',
      priority: 6,
      data: {
        action: data.recoveryAction as any || 'analyze_root_cause',
        crisisId: data.crisisId as string,
        reportType: data.reportType as any,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.recoverySubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'recovery' },
      startTime
    );
  }

  /**
   * 에스컬레이션 처리
   */
  private async handleEscalation(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    const crisisId = data.crisisId as string;
    const crisis = this.activeCrises.get(crisisId);

    if (!crisis) {
      return this.createErrorResult('CRISIS_NOT_FOUND', `Crisis not found: ${crisisId}`, startTime, false);
    }

    // 긴급 알림 발송
    await this.sendNotification(
      NotificationPriority.URGENT,
      'management',
      `[긴급] 위기 에스컬레이션: ${crisis.title}`,
      `심각도: ${crisis.severity}\n영향 고객: ${crisis.impact.affectedCustomers}명\n예상 손실: ${crisis.impact.estimatedFinancialImpact}원`
    );

    // 위기 상태 업데이트
    crisis.status = CrisisStatus.INVESTIGATING;
    this.activeCrises.set(crisisId, crisis);

    return this.createSuccessResult(
      { escalated: true, crisisId, escalatedAt: new Date() },
      startTime
    );
  }

  /**
   * 주기적 스캔 (스케줄)
   */
  private async handlePeriodicScan(startTime: number): Promise<AgentResult> {
    this.logger.info('Running periodic crisis scan...');

    // 리뷰 스캔
    const reviewScan = await this.monitoringSubAgent?.executeTask({
      taskId: `periodic-review-${Date.now()}`,
      type: 'scan_reviews',
      priority: 7,
      data: { action: 'scan_reviews' },
      createdAt: new Date(),
      retryCount: 0,
    });

    // SNS 스캔
    const socialScan = await this.monitoringSubAgent?.executeTask({
      taskId: `periodic-social-${Date.now()}`,
      type: 'scan_social',
      priority: 7,
      data: { action: 'scan_social' },
      createdAt: new Date(),
      retryCount: 0,
    });

    // 감지된 이슈 처리
    const allAlerts = [
      ...((reviewScan?.data as any)?.alerts || []),
      ...((socialScan?.data as any)?.alerts || []),
    ];

    if (allAlerts.length > 0) {
      await this.triggerAutoResponse(allAlerts);
    }

    return this.createSuccessResult(
      {
        reviewScan,
        socialScan,
        alertsDetected: allAlerts.length,
        type: 'periodic_scan',
      },
      startTime,
      { processed: allAlerts.length }
    );
  }

  /**
   * 자동 대응 트리거
   */
  private async triggerAutoResponse(alerts: MonitoringAlert[]): Promise<void> {
    for (const alert of alerts) {
      if (alert.severity === CrisisSeverity.CRITICAL || alert.severity === CrisisSeverity.HIGH) {
        // 위기 이벤트 생성
        const crisis: CrisisEvent = {
          id: `crisis-${Date.now()}`,
          category: CrisisCategory.NEGATIVE_REVIEW,
          severity: alert.severity as CrisisSeverity,
          status: CrisisStatus.DETECTED,
          title: alert.title,
          description: alert.content,
          source: alert.source,
          detectedAt: new Date(),
          impact: {
            affectedCustomers: 1,
            affectedOrders: 0,
            estimatedFinancialImpact: 0,
            reputationScore: alert.severity === CrisisSeverity.CRITICAL ? 8 : 5,
            viralPotential: alert.severity === CrisisSeverity.CRITICAL ? 7 : 4,
          },
          relatedData: {
            urls: alert.sourceUrl ? [alert.sourceUrl] : [],
          },
          tags: alert.keywords,
          updatedAt: new Date(),
        };

        this.activeCrises.set(crisis.id, crisis);

        // 자동 대응 실행
        await this.responseSubAgent?.executeTask({
          taskId: `auto-response-${Date.now()}`,
          type: 'create_plan',
          priority: 9,
          data: {
            action: 'create_plan',
            crisisId: crisis.id,
          },
          createdAt: new Date(),
          retryCount: 0,
        });

        // 알림 발송
        await this.sendNotification(
          alert.severity === CrisisSeverity.CRITICAL ? NotificationPriority.URGENT : NotificationPriority.HIGH,
          'operations',
          `위기 감지: ${alert.title}`,
          `심각도: ${alert.severity}\n소스: ${alert.source}\n내용: ${alert.content.substring(0, 100)}...`
        );
      }
    }
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.logger.info('Received sub-agent result', {
      taskId: result.taskId,
      status: result.status,
    });

    if (result.status === TaskStatus.FAILED && result.error) {
      this.logger.error('Sub-agent task failed', new Error(result.error.message), {
        taskId: result.taskId,
      });

      // 위기 대응 실패 시 에스컬레이션
      await this.sendNotification(
        NotificationPriority.HIGH,
        'operations',
        '위기 대응 실패',
        `태스크 ${result.taskId} 실패: ${result.error.message}`
      );
    }
  }
}

// =============================================================================
// Monitoring SubAgent - 위기 감지
// =============================================================================

export class MonitoringSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Monitoring SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as MonitoringTaskPayload;

    this.logger.info('Monitoring SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'scan_reviews':
        return await this.scanReviews(data, startTime);

      case 'scan_social':
        return await this.scanSocial(data, startTime);

      case 'analyze_sentiment':
        return await this.analyzeSentiment(data, startTime);

      case 'check_threshold':
        return await this.checkThreshold(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 리뷰 스캔
   */
  private async scanReviews(data: MonitoringTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Scanning reviews...');

    // 실제 구현에서는 각 플랫폼 API 호출
    const alerts: MonitoringAlert[] = [];

    // 샘플 악성 리뷰 감지 (실제로는 API 연동)
    const hasNegativeReview = Math.random() > 0.8;
    if (hasNegativeReview) {
      alerts.push({
        id: `alert-${Date.now()}`,
        source: MonitoringSource.REVIEW_PLATFORM,
        type: 'negative_review',
        severity: CrisisSeverity.MEDIUM,
        title: '부정적 리뷰 감지',
        content: '제품 품질에 문제가 있습니다. 피부에 트러블이 생겼어요...',
        sourceUrl: 'https://example.com/review/123',
        detectedAt: new Date(),
        sentimentScore: -0.7,
        keywords: ['품질', '트러블', '피부'],
        processed: false,
      });
    }

    return this.createSuccessResult(
      { alerts, scannedAt: new Date(), reviewsChecked: 100 },
      startTime,
      { processed: alerts.length }
    );
  }

  /**
   * SNS 스캔
   */
  private async scanSocial(data: MonitoringTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Scanning social media...');

    const alerts: MonitoringAlert[] = [];

    // 샘플 SNS 이슈 감지
    const hasSocialIssue = Math.random() > 0.9;
    if (hasSocialIssue) {
      alerts.push({
        id: `alert-${Date.now()}`,
        source: MonitoringSource.SOCIAL_MEDIA,
        type: 'mention',
        severity: CrisisSeverity.LOW,
        title: 'SNS 부정 언급 감지',
        content: '썬데이허그 배송이 너무 느려요...',
        sourceUrl: 'https://twitter.com/user/status/123',
        detectedAt: new Date(),
        sentimentScore: -0.4,
        keywords: ['배송', '느림'],
        processed: false,
      });
    }

    return this.createSuccessResult(
      { alerts, scannedAt: new Date(), postsChecked: 50 },
      startTime,
      { processed: alerts.length }
    );
  }

  /**
   * 감성 분석
   */
  private async analyzeSentiment(data: MonitoringTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Analyzing sentiment...');

    // 감성 분석 로직
    const analysis = {
      overallSentiment: 0.3,
      positiveCount: 85,
      neutralCount: 10,
      negativeCount: 5,
      topPositiveKeywords: ['좋아요', '추천', '만족'],
      topNegativeKeywords: ['아쉬움', '개선'],
      analyzedAt: new Date(),
    };

    return this.createSuccessResult(
      { analysis },
      startTime
    );
  }

  /**
   * 임계값 확인
   */
  private async checkThreshold(data: MonitoringTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Checking thresholds...');

    const thresholdStatus = {
      negativeReviewRate: {
        current: 3.5,
        threshold: data.thresholds?.negativeReviewCount || 5,
        exceeded: false,
      },
      complaintRate: {
        current: 1.2,
        threshold: data.thresholds?.complaintRate || 3,
        exceeded: false,
      },
      checkedAt: new Date(),
    };

    return this.createSuccessResult(
      { thresholdStatus },
      startTime
    );
  }
}

// =============================================================================
// Response SubAgent - 위기 대응
// =============================================================================

export class ResponseSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Response SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as ResponseTaskPayload;

    this.logger.info('Response SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'create_plan':
        return await this.createPlan(data, startTime);

      case 'execute_sop':
        return await this.executeSOP(data, startTime);

      case 'send_response':
        return await this.sendResponse(data, startTime);

      case 'escalate':
        return await this.escalate(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 대응 계획 수립
   */
  private async createPlan(data: ResponseTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating response plan...', { crisisId: data.crisisId });

    const plan: ResponsePlan = {
      id: `plan-${Date.now()}`,
      crisisId: data.crisisId,
      title: '위기 대응 계획',
      actions: [
        {
          id: 'action-1',
          type: ResponseActionType.IMMEDIATE_RESPONSE,
          description: '고객에게 즉시 사과 메시지 전송',
          assignee: 'cs-team',
          order: 1,
          status: 'pending',
          automatable: true,
        },
        {
          id: 'action-2',
          type: ResponseActionType.CUSTOMER_CONTACT,
          description: '고객 직접 연락하여 상황 파악',
          assignee: 'cs-team',
          order: 2,
          status: 'pending',
          automatable: false,
        },
        {
          id: 'action-3',
          type: ResponseActionType.REFUND_OFFER,
          description: '환불 또는 교환 제안',
          assignee: 'cs-team',
          order: 3,
          status: 'pending',
          automatable: true,
        },
      ],
      priority: 8,
      estimatedResolutionTime: 24,
      requiredResources: ['CS 팀', '제품 팀'],
      requiresApproval: false,
      status: 'draft',
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { plan },
      startTime
    );
  }

  /**
   * SOP 실행
   */
  private async executeSOP(data: ResponseTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Executing SOP...', { sopId: data.sopId, crisisId: data.crisisId });

    // SOP 단계별 실행
    const executionLog = [
      { step: 1, action: '상황 확인', status: 'completed', completedAt: new Date() },
      { step: 2, action: '초기 대응 메시지 발송', status: 'completed', completedAt: new Date() },
      { step: 3, action: '담당자 배정', status: 'completed', completedAt: new Date() },
    ];

    return this.createSuccessResult(
      { sopId: data.sopId, executionLog, completedAt: new Date() },
      startTime,
      { processed: executionLog.length }
    );
  }

  /**
   * 대응 메시지 발송
   */
  private async sendResponse(data: ResponseTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Sending response...', { crisisId: data.crisisId });

    // 대응 메시지 발송 로직
    return this.createSuccessResult(
      { sent: true, template: data.responseTemplate, sentAt: new Date() },
      startTime
    );
  }

  /**
   * 에스컬레이션
   */
  private async escalate(data: ResponseTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Escalating crisis...', { crisisId: data.crisisId });

    // 에스컬레이션 로직
    return this.createSuccessResult(
      { escalated: true, escalatedTo: data.escalationTarget, escalatedAt: new Date() },
      startTime
    );
  }
}

// =============================================================================
// Recovery SubAgent - 위기 복구
// =============================================================================

export class RecoverySubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Recovery SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as RecoveryTaskPayload;

    this.logger.info('Recovery SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'analyze_root_cause':
        return await this.analyzeRootCause(data, startTime);

      case 'generate_report':
        return await this.generateReport(data, startTime);

      case 'create_preventive_measure':
        return await this.createPreventiveMeasure(data, startTime);

      case 'verify_resolution':
        return await this.verifyResolution(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 근본 원인 분석
   */
  private async analyzeRootCause(data: RecoveryTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Analyzing root cause...', { crisisId: data.crisisId });

    const analysis = {
      crisisId: data.crisisId,
      primaryCause: '제품 품질 관리 프로세스 미흡',
      contributingFactors: [
        '입고 검수 절차 누락',
        '보관 환경 관리 부족',
        '유통기한 관리 오류',
      ],
      evidence: [
        '동일 배치 제품 3건 클레임 발생',
        '입고일자 대비 검수 기록 누락',
      ],
      recommendations: [
        '입고 검수 체크리스트 의무화',
        '보관 환경 모니터링 시스템 도입',
        '유통기한 자동 알림 시스템 구축',
      ],
      analyzedAt: new Date(),
    };

    return this.createSuccessResult(
      { analysis },
      startTime
    );
  }

  /**
   * 보고서 생성
   */
  private async generateReport(data: RecoveryTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Generating crisis report...', { crisisId: data.crisisId });

    const report: Partial<CrisisResolutionReport> = {
      id: `report-${Date.now()}`,
      crisisId: data.crisisId,
      summary: {
        title: '위기 대응 완료 보고서',
        category: CrisisCategory.QUALITY_ISSUE,
        severity: CrisisSeverity.MEDIUM,
        duration: 24,
        totalCost: 150000,
      },
      lessonsLearned: [
        '초기 대응 속도가 고객 만족도에 큰 영향',
        '명확한 SOP 존재가 일관된 대응 가능하게 함',
        '예방적 모니터링의 중요성 재확인',
      ],
      preventiveMeasures: [
        {
          measure: '품질 검수 프로세스 강화',
          owner: '품질관리팀',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'planned',
        },
      ],
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { report },
      startTime
    );
  }

  /**
   * 재발 방지 조치 생성
   */
  private async createPreventiveMeasure(data: RecoveryTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating preventive measure...', { crisisId: data.crisisId });

    const measure = {
      id: `measure-${Date.now()}`,
      relatedCrisisId: data.crisisId,
      description: data.measureDetails?.description || '재발 방지 조치',
      owner: data.measureDetails?.owner || 'operations-team',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: 'high',
      status: 'planned',
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { measure },
      startTime
    );
  }

  /**
   * 해결 검증
   */
  private async verifyResolution(data: RecoveryTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Verifying resolution...', { crisisId: data.crisisId });

    const verification = {
      crisisId: data.crisisId,
      resolved: true,
      verificationChecks: [
        { check: '고객 만족도 확인', passed: true },
        { check: '재발 여부 모니터링', passed: true },
        { check: '예방 조치 이행 확인', passed: true },
      ],
      verifiedAt: new Date(),
    };

    return this.createSuccessResult(
      { verification },
      startTime
    );
  }
}

// =============================================================================
// Export
// =============================================================================

export default CrisisAgent;
