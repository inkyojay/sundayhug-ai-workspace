/**
 * 썬데이허그 AI 에이전트 시스템 - Supervisor 에이전트
 *
 * 모든 에이전트의 "교통 경찰" 역할을 수행합니다.
 * 사용자 요청을 분류하고 적절한 에이전트로 라우팅합니다.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../base/BaseAgent';
import { agentRegistry } from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  ApprovalLevel,
  TaskResult,
  TaskStatus,
} from '../../types';
import {
  UserRequest,
  SupervisorResponse,
  ResponseType,
  RoutingDecision,
  RoutingType,
  ConversationContext,
  IntentCategory,
  EntityType,
  PriorityLevel,
} from './types';
import { IntentClassifier, getIntentClassifier } from './IntentClassifier';
import { AgentRouter, getAgentRouter } from './AgentRouter';
import { WorkflowOrchestrator, getWorkflowOrchestrator } from './WorkflowOrchestrator';
import { AGENT_REGISTRY, getAgentInfo } from './KeywordMapping';
import { systemLogger } from '../../utils/logger';

// =============================================================================
// Supervisor 설정
// =============================================================================

const SUPERVISOR_CONFIG: AgentConfig = {
  id: 'supervisor-agent',
  name: 'Supervisor 에이전트',
  description: '모든 에이전트의 교통 경찰 역할. 사용자 요청을 분류하고 적절한 에이전트로 라우팅',
  enabled: true,
  maxRetries: 2,
  retryDelay: 1000,
  timeout: 60000, // 1분
  approvalLevel: ApprovalLevel.NONE,
};

// =============================================================================
// SupervisorAgent 클래스
// =============================================================================

/**
 * Supervisor 에이전트
 * 모든 에이전트의 중앙 관제 역할을 수행합니다.
 */
export class SupervisorAgent extends BaseAgent {
  /** 의도 분류기 */
  private classifier: IntentClassifier;

  /** 에이전트 라우터 */
  private router: AgentRouter;

  /** 워크플로우 오케스트레이터 */
  private orchestrator: WorkflowOrchestrator;

  /** 대화 컨텍스트 캐시 */
  private conversationContexts: Map<string, ConversationContext> = new Map();

  /** 최근 요청 기록 */
  private recentRequests: Map<string, UserRequest[]> = new Map();

  constructor() {
    super(SUPERVISOR_CONFIG);

    this.classifier = getIntentClassifier();
    this.router = getAgentRouter();
    this.orchestrator = getWorkflowOrchestrator();

    // 워크플로우 이벤트 리스너 등록
    this.setupWorkflowListeners();

    this.logger.info('SupervisorAgent initialized');
  }

  // ===========================================================================
  // BaseAgent 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    // 에이전트 상태 확인
    const stats = agentRegistry.getStatistics();
    this.logger.info('Supervisor initializing', {
      totalAgents: stats.totalAgents,
      byStatus: stats.byStatus,
    });

    // 만료된 선택 요청 정리
    this.router.cleanupExpiredSelections();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const data = context.data as { input?: string; sessionId?: string; userId?: string };

    if (!data?.input) {
      return this.createErrorResult(
        'MISSING_INPUT',
        '입력이 필요합니다.',
        Date.now(),
        true
      );
    }

    try {
      const response = await this.processRequest({
        requestId: context.executionId,
        rawInput: data.input,
        normalizedInput: this.normalizeInput(data.input),
        timestamp: new Date(),
        userId: data.userId,
        sessionId: data.sessionId || 'default',
      });

      return this.createSuccessResult(response, Date.now());
    } catch (error) {
      return this.createErrorResult(
        'PROCESSING_ERROR',
        (error as Error).message,
        Date.now(),
        false
      );
    }
  }

  protected async cleanup(): Promise<void> {
    // 오래된 컨텍스트 정리
    const now = new Date();
    for (const [sessionId, ctx] of this.conversationContexts) {
      const inactiveTime = now.getTime() - ctx.lastActivityAt.getTime();
      if (inactiveTime > 30 * 60 * 1000) { // 30분 비활성
        this.conversationContexts.delete(sessionId);
      }
    }
  }

  // ===========================================================================
  // 메인 요청 처리
  // ===========================================================================

  /**
   * 사용자 요청 처리 (메인 진입점)
   * @param request - 사용자 요청
   * @returns Supervisor 응답
   */
  async processRequest(request: UserRequest): Promise<SupervisorResponse> {
    const startTime = Date.now();

    this.logger.info('Processing request', {
      requestId: request.requestId,
      input: request.normalizedInput.substring(0, 100),
    });

    // 1. 대화 컨텍스트 조회/생성
    const conversationContext = this.getOrCreateContext(request.sessionId || 'default');

    // 2. 숫자 선택 확인 (이전 선택 대기 중인 경우)
    const numericSelection = this.checkNumericSelection(request);
    if (numericSelection) {
      return this.handleNumericSelection(request, numericSelection, startTime);
    }

    // 3. 라우팅 결정
    const routingDecision = await this.router.route({
      ...request,
      context: conversationContext as unknown as Record<string, unknown>,
    });

    // 4. 라우팅 유형에 따른 처리
    const response = await this.executeRouting(request, routingDecision, conversationContext);

    // 5. 컨텍스트 업데이트
    this.updateContext(conversationContext, routingDecision, response);

    // 6. 요청 기록
    this.recordRequest(request);

    response.executionTime = Date.now() - startTime;

    this.logger.info('Request processed', {
      requestId: request.requestId,
      responseType: response.responseType,
      executionTime: response.executionTime,
    });

    return response;
  }

  /**
   * 라우팅 실행
   */
  private async executeRouting(
    request: UserRequest,
    decision: RoutingDecision,
    context: ConversationContext
  ): Promise<SupervisorResponse> {
    switch (decision.routingType) {
      case RoutingType.DIRECT:
        return this.executeDirect(request, decision);

      case RoutingType.WORKFLOW:
        return this.executeWorkflow(request, decision);

      case RoutingType.USER_CHOICE:
        return this.requestUserChoice(request, decision);

      case RoutingType.PARALLEL:
        return this.executeParallel(request, decision);

      case RoutingType.SEQUENTIAL:
        return this.executeSequential(request, decision);

      case RoutingType.CONDITIONAL:
        return this.requestAdditionalInfo(request, decision);

      default:
        return {
          requestId: request.requestId,
          success: false,
          responseType: ResponseType.ERROR,
          message: '알 수 없는 라우팅 유형입니다.',
          executedAgents: [],
          needsUserInput: false,
          executionTime: 0,
        };
    }
  }

  // ===========================================================================
  // 라우팅 유형별 실행
  // ===========================================================================

  /**
   * 직접 라우팅 실행
   */
  private async executeDirect(
    request: UserRequest,
    decision: RoutingDecision
  ): Promise<SupervisorResponse> {
    const agent = agentRegistry.getAgent(decision.targetAgentId);
    const agentInfo = getAgentInfo(decision.targetAgentId);

    if (!agent) {
      return {
        requestId: request.requestId,
        success: false,
        responseType: ResponseType.ERROR,
        message: `에이전트를 찾을 수 없습니다: ${decision.targetAgentId}`,
        executedAgents: [],
        needsUserInput: false,
        executionTime: 0,
      };
    }

    try {
      const result = await agent.execute(decision.payload);

      return {
        requestId: request.requestId,
        success: result.success,
        responseType: result.success ? ResponseType.COMPLETED : ResponseType.ERROR,
        message: result.success
          ? `${agentInfo?.name || decision.targetAgentId}에서 처리되었습니다.`
          : `처리 중 오류가 발생했습니다: ${result.error?.message}`,
        executedAgents: [{
          agentId: decision.targetAgentId,
          result,
        }],
        needsUserInput: false,
        suggestedNextActions: this.getSuggestedActions(decision.targetAgentId, result),
        executionTime: result.executionTime,
      };
    } catch (error) {
      return {
        requestId: request.requestId,
        success: false,
        responseType: ResponseType.ERROR,
        message: `실행 중 오류: ${(error as Error).message}`,
        executedAgents: [],
        needsUserInput: false,
        executionTime: 0,
      };
    }
  }

  /**
   * 워크플로우 실행
   */
  private async executeWorkflow(
    request: UserRequest,
    decision: RoutingDecision
  ): Promise<SupervisorResponse> {
    if (!decision.workflowId) {
      return {
        requestId: request.requestId,
        success: false,
        responseType: ResponseType.ERROR,
        message: '워크플로우 ID가 없습니다.',
        executedAgents: [],
        needsUserInput: false,
        executionTime: 0,
      };
    }

    try {
      const workflowState = await this.orchestrator.execute(
        decision.workflowId,
        decision.payload
      );

      const executedAgents = Array.from(workflowState.stepResults.entries()).map(
        ([stepId, result]) => ({
          agentId: stepId,
          result: {
            success: result.status === TaskStatus.COMPLETED,
            data: result.data,
            error: result.error,
            executionTime: result.executionTime,
          },
        })
      );

      const workflow = this.orchestrator.getWorkflowDefinition(decision.workflowId);

      return {
        requestId: request.requestId,
        success: workflowState.status === 'completed',
        responseType: workflowState.status === 'completed'
          ? ResponseType.COMPLETED
          : ResponseType.ERROR,
        message: workflowState.status === 'completed'
          ? `${workflow?.name || '워크플로우'}가 완료되었습니다.`
          : `워크플로우 실행 실패: ${workflowState.error?.message}`,
        executedAgents,
        needsUserInput: false,
        executionTime: workflowState.completedAt
          ? workflowState.completedAt.getTime() - workflowState.startedAt.getTime()
          : 0,
      };
    } catch (error) {
      return {
        requestId: request.requestId,
        success: false,
        responseType: ResponseType.ERROR,
        message: `워크플로우 실행 오류: ${(error as Error).message}`,
        executedAgents: [],
        needsUserInput: false,
        executionTime: 0,
      };
    }
  }

  /**
   * 사용자 선택 요청
   */
  private requestUserChoice(
    request: UserRequest,
    decision: RoutingDecision
  ): SupervisorResponse {
    const optionsMessage = decision.confirmationOptions
      ?.map((opt, idx) => `${opt.icon || idx + 1}. ${opt.label}\n   ${opt.description}`)
      .join('\n\n');

    return {
      requestId: request.requestId,
      success: true,
      responseType: ResponseType.NEEDS_SELECTION,
      message: `${decision.reason}\n\n${optionsMessage}\n\n번호를 입력해주세요.`,
      executedAgents: [],
      needsUserInput: true,
      options: decision.confirmationOptions,
      executionTime: 0,
    };
  }

  /**
   * 추가 정보 요청
   */
  private requestAdditionalInfo(
    request: UserRequest,
    decision: RoutingDecision
  ): SupervisorResponse {
    const missingContext = (decision.payload.missingContext as string[]) || [];

    return {
      requestId: request.requestId,
      success: true,
      responseType: ResponseType.NEEDS_INFO,
      message: `다음 정보가 필요합니다:\n\n${missingContext.map((c) => `- ${c}`).join('\n')}\n\n정보를 포함하여 다시 요청해주세요.`,
      executedAgents: [],
      needsUserInput: true,
      executionTime: 0,
    };
  }

  /**
   * 병렬 실행
   */
  private async executeParallel(
    request: UserRequest,
    decision: RoutingDecision
  ): Promise<SupervisorResponse> {
    const agentIds = (decision.payload.agentIds as string[]) || [decision.targetAgentId];
    const results = await this.router.executeParallel(agentIds, decision.payload);

    const executedAgents = Array.from(results.entries()).map(([agentId, result]) => ({
      agentId,
      result: {
        success: result?.status === TaskStatus.COMPLETED,
        data: result?.data,
        error: result?.error,
        executionTime: result?.executionTime || 0,
      },
    }));

    const allSuccess = executedAgents.every((a) => a.result.success);

    return {
      requestId: request.requestId,
      success: allSuccess,
      responseType: allSuccess ? ResponseType.COMPLETED : ResponseType.ERROR,
      message: allSuccess
        ? `${agentIds.length}개 에이전트에서 병렬 처리가 완료되었습니다.`
        : '일부 에이전트에서 오류가 발생했습니다.',
      executedAgents,
      needsUserInput: false,
      executionTime: Math.max(...executedAgents.map((a) => a.result.executionTime)),
    };
  }

  /**
   * 순차 실행
   */
  private async executeSequential(
    request: UserRequest,
    decision: RoutingDecision
  ): Promise<SupervisorResponse> {
    const agentIds = (decision.payload.agentIds as string[]) || [decision.targetAgentId];
    const results = await this.router.executeSequential(agentIds, decision.payload, true);

    const executedAgents = Array.from(results.entries()).map(([agentId, result]) => ({
      agentId,
      result: {
        success: result?.status === TaskStatus.COMPLETED,
        data: result?.data,
        error: result?.error,
        executionTime: result?.executionTime || 0,
      },
    }));

    const allSuccess = executedAgents.every((a) => a.result.success);
    const totalTime = executedAgents.reduce((sum, a) => sum + a.result.executionTime, 0);

    return {
      requestId: request.requestId,
      success: allSuccess,
      responseType: allSuccess ? ResponseType.COMPLETED : ResponseType.ERROR,
      message: allSuccess
        ? `${agentIds.length}개 에이전트에서 순차 처리가 완료되었습니다.`
        : '처리 중 오류가 발생했습니다.',
      executedAgents,
      needsUserInput: false,
      executionTime: totalTime,
    };
  }

  // ===========================================================================
  // 숫자 선택 처리
  // ===========================================================================

  /**
   * 숫자 선택 확인
   */
  private checkNumericSelection(request: UserRequest): number | null {
    const input = request.normalizedInput.trim();

    // 1~9 사이의 숫자인지 확인
    if (/^[1-9]$/.test(input)) {
      return parseInt(input, 10);
    }

    return null;
  }

  /**
   * 숫자 선택 처리
   */
  private async handleNumericSelection(
    request: UserRequest,
    number: number,
    startTime: number
  ): Promise<SupervisorResponse> {
    // 이전 요청에서 선택 대기 중인지 확인
    const recentRequests = this.recentRequests.get(request.sessionId || 'default') || [];
    const lastRequest = recentRequests[recentRequests.length - 1];

    if (!lastRequest) {
      return {
        requestId: request.requestId,
        success: false,
        responseType: ResponseType.ERROR,
        message: '선택할 수 있는 항목이 없습니다.',
        executedAgents: [],
        needsUserInput: false,
        executionTime: Date.now() - startTime,
      };
    }

    const decision = this.router.handleNumericSelection(lastRequest.requestId, number);

    if (!decision) {
      return {
        requestId: request.requestId,
        success: false,
        responseType: ResponseType.ERROR,
        message: '유효하지 않은 선택입니다.',
        executedAgents: [],
        needsUserInput: false,
        executionTime: Date.now() - startTime,
      };
    }

    // 선택된 에이전트 실행
    return this.executeDirect(request, decision);
  }

  // ===========================================================================
  // 컨텍스트 관리
  // ===========================================================================

  /**
   * 대화 컨텍스트 조회 또는 생성
   */
  private getOrCreateContext(sessionId: string): ConversationContext {
    let context = this.conversationContexts.get(sessionId);

    if (!context) {
      context = {
        sessionId,
        recentIntents: [],
        recentAgents: [],
        activeEntities: new Map(),
        startedAt: new Date(),
        lastActivityAt: new Date(),
        data: {},
      };
      this.conversationContexts.set(sessionId, context);
    }

    return context;
  }

  /**
   * 컨텍스트 업데이트
   */
  private updateContext(
    context: ConversationContext,
    decision: RoutingDecision,
    response: SupervisorResponse
  ): void {
    context.lastActivityAt = new Date();

    // 최근 에이전트 기록
    context.recentAgents.push(decision.targetAgentId);
    if (context.recentAgents.length > 10) {
      context.recentAgents.shift();
    }

    // 페이로드에서 엔티티 추출하여 저장
    const payload = decision.payload;
    if (payload.orderId) {
      context.activeEntities.set(EntityType.ORDER_ID, {
        type: EntityType.ORDER_ID,
        value: payload.orderId as string,
        originalText: payload.orderId as string,
        confidence: 1.0,
      });
    }
  }

  /**
   * 요청 기록
   */
  private recordRequest(request: UserRequest): void {
    const sessionId = request.sessionId || 'default';
    const requests = this.recentRequests.get(sessionId) || [];

    requests.push(request);

    // 최대 20개까지만 유지
    if (requests.length > 20) {
      requests.shift();
    }

    this.recentRequests.set(sessionId, requests);
  }

  // ===========================================================================
  // 유틸리티
  // ===========================================================================

  /**
   * 입력 정규화
   */
  private normalizeInput(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * 다음 추천 액션 생성
   */
  private getSuggestedActions(agentId: string, result: AgentResult): string[] {
    const suggestions: string[] = [];

    // 에이전트별 추천 액션
    switch (agentId) {
      case 'order-agent':
        if (result.success) {
          suggestions.push('주문 목록 확인', '배송 조회', '오늘 매출 확인');
        }
        break;

      case 'cs-agent':
        suggestions.push('다른 문의 확인', '답변 템플릿 조회');
        break;

      case 'inventory-agent':
        suggestions.push('재고 현황 전체 보기', '안전재고 알림 설정');
        break;

      default:
        suggestions.push('다른 작업 요청');
    }

    return suggestions;
  }

  /**
   * 워크플로우 이벤트 리스너 설정
   */
  private setupWorkflowListeners(): void {
    this.orchestrator.on('workflow:completed', (event, data) => {
      this.logger.info('Workflow completed', data);
    });

    this.orchestrator.on('workflow:failed', (event, data) => {
      this.logger.error('Workflow failed', new Error(data.error as string), data);
    });

    this.orchestrator.on('workflow:step_failed', (event, data) => {
      this.logger.warn('Workflow step failed', data);
    });
  }

  // ===========================================================================
  // 공개 API
  // ===========================================================================

  /**
   * 에이전트 목록 조회
   */
  getAvailableAgents(): { id: string; name: string; description: string }[] {
    return AGENT_REGISTRY.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.scope,
    }));
  }

  /**
   * 워크플로우 목록 조회
   */
  getAvailableWorkflows(): { id: string; name: string; description: string }[] {
    return this.orchestrator.getAvailableWorkflows();
  }

  /**
   * 시스템 상태 조회
   */
  getSystemStatus(): {
    totalAgents: number;
    runningWorkflows: number;
    activeSessions: number;
    health: ReturnType<typeof agentRegistry.healthCheck>;
  } {
    return {
      totalAgents: agentRegistry.getStatistics().totalAgents,
      runningWorkflows: this.orchestrator.getRunningWorkflows().length,
      activeSessions: this.conversationContexts.size,
      health: agentRegistry.healthCheck(),
    };
  }

  /**
   * 직접 라우팅 (특정 에이전트 지정)
   */
  async routeToAgent(
    agentId: string,
    input: string,
    additionalData?: Record<string, unknown>
  ): Promise<SupervisorResponse> {
    const request: UserRequest = {
      requestId: uuidv4(),
      rawInput: input,
      normalizedInput: this.normalizeInput(input),
      timestamp: new Date(),
    };

    const decision: RoutingDecision = {
      targetAgentId: agentId,
      routingType: RoutingType.DIRECT,
      confidence: 1.0,
      reason: '직접 라우팅',
      needsConfirmation: false,
      executeWorkflow: false,
      payload: {
        ...request,
        ...additionalData,
      },
    };

    return this.executeDirect(request, decision);
  }

  /**
   * 워크플로우 직접 실행
   */
  async executeWorkflowDirect(
    workflowId: string,
    data?: Record<string, unknown>
  ): Promise<SupervisorResponse> {
    const request: UserRequest = {
      requestId: uuidv4(),
      rawInput: `워크플로우 실행: ${workflowId}`,
      normalizedInput: `워크플로우 실행: ${workflowId}`,
      timestamp: new Date(),
    };

    const decision: RoutingDecision = {
      targetAgentId: '',
      routingType: RoutingType.WORKFLOW,
      confidence: 1.0,
      reason: '직접 워크플로우 실행',
      needsConfirmation: false,
      executeWorkflow: true,
      workflowId,
      payload: data || {},
    };

    return this.executeWorkflow(request, decision);
  }
}

// 싱글톤 인스턴스
let supervisorInstance: SupervisorAgent | null = null;

/**
 * SupervisorAgent 싱글톤 인스턴스 가져오기
 */
export function getSupervisorAgent(): SupervisorAgent {
  if (!supervisorInstance) {
    supervisorInstance = new SupervisorAgent();

    // 에이전트 레지스트리에 등록
    agentRegistry.register(supervisorInstance, {
      type: 'orchestrator',
      tags: ['supervisor', 'router', 'orchestrator'],
    });
  }
  return supervisorInstance;
}

export default SupervisorAgent;
