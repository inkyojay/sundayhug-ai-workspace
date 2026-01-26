/**
 * 썬데이허그 AI 에이전트 시스템 - Supervisor 에이전트
 *
 * LANE 5: Integration & Orchestration
 * 모든 요청의 라우팅과 에이전트 간 협업을 조율하는 중앙 오케스트레이터
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../base/BaseAgent';
import { agentRegistry } from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentStatus,
  TaskPayload,
  TaskResult,
  TaskStatus,
  ApprovalLevel,
  NotificationPriority,
} from '../../types';
import { systemLogger } from '../../utils/logger';
import {
  RoutingDecision,
  RoutingReason,
  RoutingRules,
  KeywordRoutingRule,
  EntityRoutingRule,
  PriorityLevel,
  PriorityAdjustment,
  PriorityFactors,
  OrchestrationPattern,
  OrchestrationTask,
  OrchestrationStatus,
  CEONotificationChannel,
  CEOAlertType,
  ApprovalRequest,
  ApprovalStatus,
  EscalationRequest,
  EscalationReason,
  EscalationStatus,
  AgentHealthStatus,
  SystemStatusReport,
  QueueStatus,
  SystemMetrics,
  SupervisorConfig,
} from './types';
import { JobQueue, createPriorityQueue } from '../../scheduler';
import { metricsCollector } from '../../monitoring';

/**
 * 기본 라우팅 규칙
 */
const defaultRoutingRules: RoutingRules = {
  keywordRouting: [
    { agentId: '12-crisis', keywords: ['위험', '사고', '안전', '긴급', 'emergency', 'recall'], priority: 0 },
    { agentId: '01-order', keywords: ['주문', '결제', '구매', '취소', 'order', 'purchase'], priority: 2 },
    { agentId: '02-cs', keywords: ['문의', '질문', '도움', 'help', 'support', '문제'], priority: 1 },
    { agentId: '13-logistics', keywords: ['배송', '택배', '운송', 'delivery', 'shipping'], priority: 2 },
    { agentId: '05-inventory', keywords: ['재고', '입고', '품절', 'stock', 'inventory'], priority: 3 },
    { agentId: '03-marketing', keywords: ['마케팅', '광고', '프로모션', 'campaign', 'marketing'], priority: 3 },
    { agentId: '06-accounting', keywords: ['매출', '비용', '정산', '세금', 'revenue', 'expense'], priority: 3 },
  ],
  entityRouting: [
    { entityType: 'order_id', pattern: '^ORD-\\d{8}-\\d{4}$', targetAgent: '01-order' },
    { entityType: 'customer_id', pattern: '^CUS-\\d{6}$', targetAgent: '02-cs' },
    { entityType: 'product_id', pattern: '^PRD-\\d{5}$', targetAgent: '04-product' },
  ],
  sourceRouting: [
    { source: 'naver_smartstore', primary: '01-order', fallback: '02-cs' },
    { source: 'coupang', primary: '01-order', fallback: '02-cs' },
    { source: 'instagram', primary: '03-marketing', fallback: '07-media' },
    { source: 'email', primary: '02-cs', fallback: '00-supervisor' },
  ],
  defaultAgent: '02-cs',
  safetyKeywords: ['위험', '사고', '안전', '긴급', 'emergency', 'recall', '리콜', '부상'],
  safetyAgent: '12-crisis',
};

/**
 * 기본 Supervisor 설정
 */
const defaultSupervisorConfig: Partial<SupervisorConfig> = {
  routingRules: defaultRoutingRules,
  healthCheckInterval: 30000,
  rebalancingInterval: 300000,
  maxConcurrentTasks: 100,
};

/**
 * Supervisor 에이전트 클래스
 */
export class SupervisorAgent extends BaseAgent {
  private supervisorConfig: SupervisorConfig;
  private taskQueue: JobQueue<TaskPayload, TaskResult>;
  private orchestrationTasks: Map<string, OrchestrationTask> = new Map();
  private escalationQueue: EscalationRequest[] = [];
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private agentStatuses: Map<string, AgentHealthStatus> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private rebalancingTimer?: NodeJS.Timeout;

  /**
   * SupervisorAgent 생성자
   */
  constructor(config?: Partial<AgentConfig>, supervisorConfig?: Partial<SupervisorConfig>) {
    const baseConfig: AgentConfig = {
      id: '00-supervisor',
      name: 'Supervisor',
      description: '중앙 오케스트레이터 - 모든 요청의 라우팅과 에이전트 간 협업을 조율',
      approvalLevel: ApprovalLevel.LOW,
      enabled: true,
      timeout: 300000, // 5분
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    super(baseConfig);

    this.supervisorConfig = {
      ...defaultSupervisorConfig,
      ...supervisorConfig,
    } as SupervisorConfig;

    // 작업 큐 생성
    this.taskQueue = createPriorityQueue<TaskPayload, TaskResult>(
      'supervisor-task-queue',
      this.supervisorConfig.maxConcurrentTasks
    );

    // 작업 큐 이벤트 핸들러
    this.taskQueue.on('job:completed', (event) => {
      metricsCollector.incCounter('supervisor_tasks_completed');
    });

    this.taskQueue.on('job:failed', (event) => {
      metricsCollector.incCounter('supervisor_tasks_failed');
    });

    systemLogger.info('SupervisorAgent initialized', {
      maxConcurrentTasks: this.supervisorConfig.maxConcurrentTasks,
    });
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing SupervisorAgent...');

    // 헬스체크 시작
    this.startHealthChecks();

    // 리밸런싱 시작
    this.startRebalancing();

    // 작업 큐 시작
    this.taskQueue.start();

    // AgentRegistry에 등록
    agentRegistry.register(this, { type: 'orchestrator', tags: ['core', 'supervisor'] });

    this.logger.info('SupervisorAgent initialized successfully');
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up SupervisorAgent...');

    // 타이머 정리
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.rebalancingTimer) {
      clearInterval(this.rebalancingTimer);
    }

    // 작업 큐 정지
    this.taskQueue.stop();

    this.logger.info('SupervisorAgent cleanup completed');
  }

  /**
   * 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const data = context.data || {};
      const action = data.action as string;

      switch (action) {
        case 'route':
          return await this.handleRouteRequest(data, startTime);

        case 'orchestrate':
          return await this.handleOrchestrationRequest(data, startTime);

        case 'escalate':
          return await this.handleEscalationRequest(data, startTime);

        case 'approve':
          return await this.handleApprovalRequest(data, startTime);

        case 'status':
          return await this.handleStatusRequest(startTime);

        default:
          // 기본: 라우팅 요청으로 처리
          return await this.handleRouteRequest(data, startTime);
      }
    } catch (error) {
      return this.createErrorResult(
        'SUPERVISOR_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  // ===========================================================================
  // 라우팅 관련 메서드
  // ===========================================================================

  /**
   * 라우팅 요청 처리
   */
  private async handleRouteRequest(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    const request = data.request as TaskPayload;
    if (!request) {
      return this.createErrorResult('INVALID_REQUEST', 'No request provided', startTime, false);
    }

    // 라우팅 결정
    const decision = this.decideRouting(request);
    this.logger.info('Routing decision made', {
      targetAgent: decision.targetAgent,
      confidence: decision.confidence,
      reason: decision.reason,
    });

    // 메트릭 기록
    metricsCollector.incCounter('supervisor_routing_decisions', 1, {
      targetAgent: decision.targetAgent,
      reason: decision.reason,
    });

    // 멀티 에이전트 협업이 필요한 경우
    if (decision.requiresMultiAgent && decision.involvedAgents) {
      return await this.executeMultiAgentTask(request, decision, startTime);
    }

    // 단일 에이전트 라우팅
    return await this.executeAgentTask(request, decision.targetAgent, startTime);
  }

  /**
   * 라우팅 결정
   */
  decideRouting(request: TaskPayload): RoutingDecision {
    const content = this.extractContent(request);
    const source = request.data?.source as string | undefined;

    // 1. 안전 이슈 최우선 체크
    if (this.containsSafetyKeywords(content)) {
      return {
        targetAgent: this.supervisorConfig.routingRules.safetyAgent,
        confidence: 1.0,
        alternativeAgents: [],
        requiresMultiAgent: false,
        reason: RoutingReason.SAFETY_ISSUE,
      };
    }

    // 2. 명시적 엔티티 확인
    const entityMatch = this.matchEntity(content);
    if (entityMatch) {
      return {
        targetAgent: entityMatch.targetAgent,
        confidence: 0.95,
        alternativeAgents: [],
        requiresMultiAgent: false,
        reason: RoutingReason.ENTITY_BASED,
        metadata: { entityType: entityMatch.entityType },
      };
    }

    // 3. 키워드 매칭
    const keywordMatches = this.matchKeywords(content);
    if (keywordMatches.length > 0) {
      const sorted = keywordMatches.sort((a, b) => a.priority - b.priority);

      // 멀티 에이전트 필요 여부 판단
      if (sorted.length > 1 && this.isComplexRequest(request)) {
        return {
          targetAgent: sorted[0].agentId,
          confidence: 0.8,
          alternativeAgents: sorted.slice(1).map((m) => m.agentId),
          requiresMultiAgent: true,
          involvedAgents: sorted.map((m) => m.agentId),
          reason: RoutingReason.KEYWORD_MATCH,
        };
      }

      return {
        targetAgent: sorted[0].agentId,
        confidence: 0.85,
        alternativeAgents: sorted.slice(1).map((m) => m.agentId),
        requiresMultiAgent: false,
        reason: RoutingReason.KEYWORD_MATCH,
      };
    }

    // 4. 소스 기반 라우팅
    if (source) {
      const sourceRule = this.supervisorConfig.routingRules.sourceRouting.find(
        (r) => r.source === source
      );
      if (sourceRule) {
        return {
          targetAgent: sourceRule.primary,
          confidence: 0.7,
          alternativeAgents: [sourceRule.fallback],
          requiresMultiAgent: false,
          reason: RoutingReason.SOURCE_BASED,
        };
      }
    }

    // 5. 기본 라우팅
    return {
      targetAgent: this.supervisorConfig.routingRules.defaultAgent,
      confidence: 0.5,
      alternativeAgents: ['00-supervisor'],
      requiresMultiAgent: false,
      reason: RoutingReason.DEFAULT,
    };
  }

  /**
   * 요청에서 콘텐츠 추출
   */
  private extractContent(request: TaskPayload): string {
    const data = request.data as Record<string, unknown> | undefined;
    if (!data) return '';

    const parts: string[] = [];
    if (typeof data.content === 'string') parts.push(data.content);
    if (typeof data.message === 'string') parts.push(data.message);
    if (typeof data.text === 'string') parts.push(data.text);
    if (typeof data.query === 'string') parts.push(data.query);

    return parts.join(' ').toLowerCase();
  }

  /**
   * 안전 키워드 포함 여부
   */
  private containsSafetyKeywords(content: string): boolean {
    return this.supervisorConfig.routingRules.safetyKeywords.some((keyword) =>
      content.includes(keyword.toLowerCase())
    );
  }

  /**
   * 엔티티 매칭
   */
  private matchEntity(content: string): EntityRoutingRule | null {
    for (const rule of this.supervisorConfig.routingRules.entityRouting) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(content)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * 키워드 매칭
   */
  private matchKeywords(content: string): KeywordRoutingRule[] {
    const matches: KeywordRoutingRule[] = [];

    for (const rule of this.supervisorConfig.routingRules.keywordRouting) {
      const hasMatch = rule.keywords.some((keyword) =>
        content.includes(keyword.toLowerCase())
      );
      if (hasMatch) {
        matches.push(rule);
      }
    }

    return matches;
  }

  /**
   * 복잡한 요청인지 판단
   */
  private isComplexRequest(request: TaskPayload): boolean {
    const content = this.extractContent(request);
    const wordCount = content.split(/\s+/).length;

    // 단어 수가 많거나 여러 주제를 포함하면 복잡한 요청으로 판단
    return wordCount > 50;
  }

  // ===========================================================================
  // 에이전트 실행 메서드
  // ===========================================================================

  /**
   * 단일 에이전트 작업 실행
   */
  private async executeAgentTask(
    request: TaskPayload,
    agentId: string,
    startTime: number
  ): Promise<AgentResult> {
    const agent = agentRegistry.getAgent(agentId);

    if (!agent) {
      // 폴백 에이전트 시도
      this.logger.warn(`Agent not found: ${agentId}, trying fallback`);
      return this.createErrorResult(
        'AGENT_NOT_FOUND',
        `Agent ${agentId} not found`,
        startTime,
        true
      );
    }

    try {
      const result = await agentRegistry.executeAgent(agentId, request.data as Record<string, unknown>);

      if (result) {
        return this.createSuccessResult(
          {
            taskId: request.taskId,
            agentId,
            result: result.data,
            status: result.status,
          },
          startTime
        );
      }

      return this.createErrorResult('EXECUTION_FAILED', 'Agent execution returned null', startTime, true);
    } catch (error) {
      return this.createErrorResult('EXECUTION_ERROR', (error as Error).message, startTime, true);
    }
  }

  /**
   * 멀티 에이전트 작업 실행
   */
  private async executeMultiAgentTask(
    request: TaskPayload,
    decision: RoutingDecision,
    startTime: number
  ): Promise<AgentResult> {
    const orchestrationId = uuidv4();

    const orchestrationTask: OrchestrationTask = {
      id: orchestrationId,
      pattern: OrchestrationPattern.PARALLEL,
      agents: decision.involvedAgents || [],
      input: request.data as Record<string, unknown>,
      status: OrchestrationStatus.RUNNING,
      startedAt: new Date(),
      results: new Map(),
    };

    this.orchestrationTasks.set(orchestrationId, orchestrationTask);

    try {
      // 병렬 실행
      const executionPromises = orchestrationTask.agents.map(async (agentId) => {
        try {
          const result = await agentRegistry.executeAgent(agentId, request.data as Record<string, unknown>);
          orchestrationTask.results.set(agentId, result?.data);
          return { agentId, success: true, data: result?.data };
        } catch (error) {
          orchestrationTask.errors = orchestrationTask.errors || new Map();
          orchestrationTask.errors.set(agentId, error as Error);
          return { agentId, success: false, error };
        }
      });

      const results = await Promise.all(executionPromises);

      // 결과 통합
      const successCount = results.filter((r) => r.success).length;
      orchestrationTask.status =
        successCount === results.length
          ? OrchestrationStatus.COMPLETED
          : successCount > 0
            ? OrchestrationStatus.PARTIAL
            : OrchestrationStatus.FAILED;
      orchestrationTask.completedAt = new Date();

      return this.createSuccessResult(
        {
          orchestrationId,
          pattern: orchestrationTask.pattern,
          agents: orchestrationTask.agents,
          results: Object.fromEntries(orchestrationTask.results),
          status: orchestrationTask.status,
        },
        startTime
      );
    } catch (error) {
      orchestrationTask.status = OrchestrationStatus.FAILED;
      return this.createErrorResult('ORCHESTRATION_ERROR', (error as Error).message, startTime, true);
    }
  }

  // ===========================================================================
  // 우선순위 관리 메서드
  // ===========================================================================

  /**
   * 우선순위 결정
   */
  determinePriority(request: TaskPayload, factors: PriorityFactors): PriorityLevel {
    // 안전 관련 - P0
    const content = this.extractContent(request);
    if (this.containsSafetyKeywords(content)) {
      return PriorityLevel.P0_CRITICAL;
    }

    // VIP 고객 - P1
    if (factors.isVip) {
      return PriorityLevel.P1_URGENT;
    }

    // 재무 영향 기반
    if (factors.financialImpact) {
      if (factors.financialImpact >= 500000) return PriorityLevel.P1_URGENT;
      if (factors.financialImpact >= 100000) return PriorityLevel.P2_HIGH;
    }

    // 반복 불만
    if (factors.isRepeatComplaint) {
      return PriorityLevel.P2_HIGH;
    }

    // 부정적 감정
    if (factors.sentimentScore < -0.7) {
      return PriorityLevel.P2_HIGH;
    }

    // 기본 우선순위
    return PriorityLevel.P3_NORMAL;
  }

  /**
   * 우선순위 동적 조정
   */
  adjustPriority(
    requestId: string,
    currentPriority: PriorityLevel,
    factors: PriorityFactors
  ): PriorityAdjustment | null {
    let newPriority = currentPriority;
    let reason = '';

    // 대기 시간 기반 상향
    const maxWaitTime = this.getMaxWaitTime(currentPriority);
    if (factors.waitTime > maxWaitTime * 0.8) {
      newPriority = Math.max(0, currentPriority - 1) as PriorityLevel;
      reason = 'wait_time_threshold';
    }

    // VIP 고객 상향
    if (factors.customerValue > 500000 && currentPriority > PriorityLevel.P1_URGENT) {
      newPriority = PriorityLevel.P1_URGENT;
      reason = 'vip_customer';
    }

    // 반복 불만 상향
    if (factors.isRepeatComplaint && currentPriority > PriorityLevel.P2_HIGH) {
      newPriority = PriorityLevel.P2_HIGH;
      reason = 'repeat_complaint';
    }

    // 부정적 감정 상향
    if (factors.sentimentScore < -0.7 && currentPriority > PriorityLevel.P2_HIGH) {
      newPriority = PriorityLevel.P2_HIGH;
      reason = 'negative_sentiment';
    }

    if (newPriority !== currentPriority) {
      return {
        requestId,
        originalPriority: currentPriority,
        adjustedPriority: newPriority,
        reason,
        adjustedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * 우선순위별 최대 대기 시간 (밀리초)
   */
  private getMaxWaitTime(priority: PriorityLevel): number {
    const waitTimes: Record<PriorityLevel, number> = {
      [PriorityLevel.P0_CRITICAL]: 5 * 60 * 1000, // 5분
      [PriorityLevel.P1_URGENT]: 30 * 60 * 1000, // 30분
      [PriorityLevel.P2_HIGH]: 2 * 60 * 60 * 1000, // 2시간
      [PriorityLevel.P3_NORMAL]: 24 * 60 * 60 * 1000, // 24시간
      [PriorityLevel.P4_LOW]: 48 * 60 * 60 * 1000, // 48시간
      [PriorityLevel.P5_BATCH]: 7 * 24 * 60 * 60 * 1000, // 1주
    };

    return waitTimes[priority];
  }

  // ===========================================================================
  // 에스컬레이션 관리 메서드
  // ===========================================================================

  /**
   * 에스컬레이션 요청 처리
   */
  private async handleEscalationRequest(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    const escalation = data.escalation as EscalationRequest;
    if (!escalation) {
      return this.createErrorResult('INVALID_ESCALATION', 'No escalation provided', startTime, false);
    }

    // 에스컬레이션 등록
    this.escalationQueue.push(escalation);

    // CEO 알림 결정
    const channel = this.determineNotificationChannel(escalation);
    await this.notifyCEO(channel, escalation);

    metricsCollector.incCounter('supervisor_escalations', 1, {
      reason: escalation.reason,
    });

    return this.createSuccessResult(
      {
        escalationId: escalation.id,
        status: EscalationStatus.PENDING,
        notificationChannel: channel,
      },
      startTime
    );
  }

  /**
   * 알림 채널 결정
   */
  private determineNotificationChannel(escalation: EscalationRequest): CEONotificationChannel {
    switch (escalation.priority) {
      case PriorityLevel.P0_CRITICAL:
        return CEONotificationChannel.PHONE;
      case PriorityLevel.P1_URGENT:
        return CEONotificationChannel.KAKAO;
      case PriorityLevel.P2_HIGH:
        return CEONotificationChannel.SLACK;
      default:
        return CEONotificationChannel.EMAIL;
    }
  }

  /**
   * CEO 알림 발송
   */
  private async notifyCEO(channel: CEONotificationChannel, escalation: EscalationRequest): Promise<void> {
    const priority = this.channelToPriority(channel);

    await this.sendNotification(
      priority,
      'ceo',
      `[에스컬레이션] ${escalation.reason}`,
      this.formatEscalationMessage(escalation)
    );

    this.logger.info('CEO notification sent', {
      channel,
      escalationId: escalation.id,
    });
  }

  /**
   * 채널을 알림 우선순위로 변환
   */
  private channelToPriority(channel: CEONotificationChannel): NotificationPriority {
    switch (channel) {
      case CEONotificationChannel.PHONE:
        return NotificationPriority.URGENT;
      case CEONotificationChannel.KAKAO:
        return NotificationPriority.HIGH;
      case CEONotificationChannel.SLACK:
        return NotificationPriority.MEDIUM;
      default:
        return NotificationPriority.LOW;
    }
  }

  /**
   * 에스컬레이션 메시지 포맷
   */
  private formatEscalationMessage(escalation: EscalationRequest): string {
    return `
## 에스컬레이션 알림

**ID**: ${escalation.id}
**요청 에이전트**: ${escalation.fromAgent}
**사유**: ${escalation.reason}
**우선순위**: P${escalation.priority}
**요청 시간**: ${escalation.requestedAt.toISOString()}

### 원본 요청
${JSON.stringify(escalation.originalRequest, null, 2)}

### 컨텍스트
${JSON.stringify(escalation.context, null, 2)}
    `.trim();
  }

  // ===========================================================================
  // 승인 관리 메서드
  // ===========================================================================

  /**
   * 승인 요청 처리
   */
  private async handleApprovalRequest(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    const approval = data.approval as ApprovalRequest;
    if (!approval) {
      return this.createErrorResult('INVALID_APPROVAL', 'No approval request provided', startTime, false);
    }

    // 승인 요청 등록
    this.approvalRequests.set(approval.id, approval);

    // CEO 알림
    const channel = this.determineApprovalChannel(approval);
    await this.notifyApprovalRequest(channel, approval);

    return this.createSuccessResult(
      {
        approvalId: approval.id,
        status: ApprovalStatus.PENDING,
        channel,
      },
      startTime
    );
  }

  /**
   * 승인 채널 결정
   */
  private determineApprovalChannel(approval: ApprovalRequest): CEONotificationChannel {
    switch (approval.urgency) {
      case PriorityLevel.P0_CRITICAL:
      case PriorityLevel.P1_URGENT:
        return CEONotificationChannel.KAKAO;
      case PriorityLevel.P2_HIGH:
        return CEONotificationChannel.SLACK;
      default:
        return CEONotificationChannel.EMAIL;
    }
  }

  /**
   * 승인 요청 알림
   */
  private async notifyApprovalRequest(
    channel: CEONotificationChannel,
    approval: ApprovalRequest
  ): Promise<void> {
    const priority = this.channelToPriority(channel);

    await this.sendNotification(
      priority,
      'ceo',
      `[승인 요청] ${approval.title}`,
      this.formatApprovalMessage(approval)
    );
  }

  /**
   * 승인 메시지 포맷
   */
  private formatApprovalMessage(approval: ApprovalRequest): string {
    const optionsList = approval.options
      .map((opt, idx) => `${idx + 1}. ${opt.label}\n   장점: ${opt.pros.join(', ')}\n   단점: ${opt.cons.join(', ')}`)
      .join('\n');

    return `
## 승인 요청

**제목**: ${approval.title}
**요청자**: ${approval.requestedBy}
**긴급도**: P${approval.urgency}
${approval.deadline ? `**기한**: ${approval.deadline.toISOString()}` : ''}

### 설명
${approval.description}

### 옵션
${optionsList}

${approval.aiRecommendation ? `### AI 추천\n**${approval.aiRecommendation.option}** - ${approval.aiRecommendation.reason}` : ''}
    `.trim();
  }

  // ===========================================================================
  // 시스템 모니터링 메서드
  // ===========================================================================

  /**
   * 시스템 상태 요청 처리
   */
  private async handleStatusRequest(startTime: number): Promise<AgentResult> {
    const report = this.generateStatusReport();

    return this.createSuccessResult(report, startTime);
  }

  /**
   * 시스템 상태 리포트 생성
   */
  generateStatusReport(): SystemStatusReport {
    const registryStats = agentRegistry.getStatistics();
    const registryHealth = agentRegistry.healthCheck();

    // 에이전트 상태 수집
    const agentStatuses = Array.from(agentRegistry.getAllMetadata().entries()).map(([id, meta]) => ({
      agentId: id,
      name: meta.name,
      status: this.agentStatuses.get(id) || AgentHealthStatus.UNKNOWN,
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorRate: meta.failureCount / (meta.executionCount || 1),
      queueDepth: 0,
      activeJobs: meta.status === AgentStatus.RUNNING ? 1 : 0,
    }));

    // 큐 상태
    const queues: QueueStatus[] = [
      { priority: PriorityLevel.P0_CRITICAL, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P1_URGENT, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P2_HIGH, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P3_NORMAL, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P4_LOW, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P5_BATCH, pending: 0, processing: 0, avgWaitTime: 0 },
    ];

    // 시스템 메트릭
    const metrics: SystemMetrics = {
      requestsPerHour: metricsCollector.getCounter('supervisor_routing_decisions') || 0,
      avgResponseTime: metricsCollector.getGauge('avg_response_time') || 0,
      errorRate: registryStats.totalFailures / (registryStats.totalExecutions || 1),
      escalationsToday: this.escalationQueue.length,
    };

    // 전체 상태 결정
    let overallStatus = AgentHealthStatus.HEALTHY;
    if (registryHealth.unhealthyAgents.length > 0) {
      overallStatus =
        registryHealth.unhealthyAgents.length > registryStats.totalAgents / 2
          ? AgentHealthStatus.UNHEALTHY
          : AgentHealthStatus.DEGRADED;
    }

    return {
      timestamp: new Date(),
      status: overallStatus,
      agents: agentStatuses,
      queues,
      metrics,
      alerts: [],
    };
  }

  /**
   * 헬스체크 시작
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.supervisorConfig.healthCheckInterval);

    // 즉시 첫 체크
    this.performHealthChecks();
  }

  /**
   * 헬스체크 수행
   */
  private async performHealthChecks(): Promise<void> {
    for (const [agentId, agent] of agentRegistry.getAllAgents()) {
      try {
        const status = agent.getStatus();
        const healthStatus =
          status === AgentStatus.ERROR
            ? AgentHealthStatus.UNHEALTHY
            : status === AgentStatus.RUNNING
              ? AgentHealthStatus.HEALTHY
              : AgentHealthStatus.DEGRADED;

        this.agentStatuses.set(agentId, healthStatus);
      } catch (error) {
        this.agentStatuses.set(agentId, AgentHealthStatus.UNKNOWN);
      }
    }

    metricsCollector.setGauge('healthy_agents_count',
      Array.from(this.agentStatuses.values()).filter(s => s === AgentHealthStatus.HEALTHY).length
    );
  }

  /**
   * 리밸런싱 시작
   */
  private startRebalancing(): void {
    this.rebalancingTimer = setInterval(() => {
      this.rebalanceQueues();
    }, this.supervisorConfig.rebalancingInterval);
  }

  /**
   * 큐 리밸런싱
   */
  private rebalanceQueues(): void {
    // 대기 시간이 긴 작업의 우선순위 상향
    this.logger.debug('Queue rebalancing performed');
  }

  // ===========================================================================
  // 유틸리티 메서드
  // ===========================================================================

  /**
   * 에스컬레이션 큐 조회
   */
  getEscalationQueue(): EscalationRequest[] {
    return [...this.escalationQueue];
  }

  /**
   * 승인 요청 조회
   */
  getApprovalRequest(id: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(id);
  }

  /**
   * 대기 중인 승인 요청 목록
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      (req) => req.status === ApprovalStatus.PENDING
    );
  }

  /**
   * 오케스트레이션 작업 조회
   */
  getOrchestrationTask(id: string): OrchestrationTask | undefined {
    return this.orchestrationTasks.get(id);
  }
}

// 싱글톤 인스턴스 export
export const supervisorAgent = new SupervisorAgent();
export default SupervisorAgent;
