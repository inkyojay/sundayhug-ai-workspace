/**
 * 썬데이허그 AI 에이전트 시스템 - 에이전트 라우터
 *
 * IntentClassifier의 분류 결과를 바탕으로 실제 에이전트 라우팅을 수행합니다.
 * 워크플로우 실행, 사용자 확인, 병렬/순차 실행을 관리합니다.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IntentResult,
  RoutingDecision,
  RoutingType,
  ConfirmationOption,
  UserRequest,
  IntentCategory,
  EntityType,
  PriorityLevel,
} from './types';
import { AGENT_REGISTRY, getAgentInfo, getWorkflowByTrigger, PREDEFINED_WORKFLOWS } from './KeywordMapping';
import { IntentClassifier, getIntentClassifier } from './IntentClassifier';
import { agentRegistry } from '../base/AgentRegistry';
import { systemLogger } from '../../utils/logger';
import { TaskResult, TaskStatus } from '../../types';

// =============================================================================
// AgentRouter 클래스
// =============================================================================

/**
 * 에이전트 라우터
 * 의도 분류 결과를 바탕으로 에이전트 라우팅 결정을 수행합니다.
 */
export class AgentRouter {
  /** 의도 분류기 */
  private classifier: IntentClassifier;

  /** 라우팅 히스토리 (세션별) */
  private routingHistory: Map<string, RoutingDecision[]> = new Map();

  /** 사용자 선택 대기 목록 */
  private pendingSelections: Map<string, {
    requestId: string;
    options: ConfirmationOption[];
    expiresAt: Date;
    onSelect: (selectedAgentId: string) => void;
  }> = new Map();

  constructor() {
    this.classifier = getIntentClassifier();
    systemLogger.info('AgentRouter initialized');
  }

  // ===========================================================================
  // 라우팅 메인 메서드
  // ===========================================================================

  /**
   * 사용자 요청 라우팅
   * @param request - 사용자 요청
   * @returns 라우팅 결정
   */
  async route(request: UserRequest): Promise<RoutingDecision> {
    systemLogger.info('Routing request', { requestId: request.requestId });

    // 1. 의도 분류
    const intentResult = await this.classifier.classify(
      request.normalizedInput,
      request.context as any
    );

    // 2. 라우팅 결정 생성
    const decision = this.createRoutingDecision(request, intentResult);

    // 3. 히스토리 저장
    this.saveToHistory(request.sessionId || 'default', decision);

    systemLogger.info('Routing decision made', {
      requestId: request.requestId,
      targetAgent: decision.targetAgentId,
      routingType: decision.routingType,
      confidence: decision.confidence,
    });

    return decision;
  }

  /**
   * 라우팅 결정 생성
   */
  private createRoutingDecision(
    request: UserRequest,
    intentResult: IntentResult
  ): RoutingDecision {
    // 워크플로우 매칭 확인
    if (intentResult.suggestedWorkflowId) {
      return this.createWorkflowRouting(request, intentResult);
    }

    // 애매한 요청인 경우 사용자 선택 요청
    if (intentResult.isAmbiguous && intentResult.alternativeAgents.length > 1) {
      return this.createUserChoiceRouting(request, intentResult);
    }

    // 추가 정보가 필요한 경우
    if (intentResult.requiredContext.length > 0) {
      return this.createInfoRequestRouting(request, intentResult);
    }

    // 일반 직접 라우팅
    return this.createDirectRouting(request, intentResult);
  }

  // ===========================================================================
  // 라우팅 유형별 생성 메서드
  // ===========================================================================

  /**
   * 직접 라우팅 결정 생성
   */
  private createDirectRouting(
    request: UserRequest,
    intentResult: IntentResult
  ): RoutingDecision {
    const agentInfo = getAgentInfo(intentResult.primaryAgentId);

    return {
      targetAgentId: intentResult.primaryAgentId,
      routingType: RoutingType.DIRECT,
      confidence: intentResult.confidence,
      reason: `직접 라우팅: ${agentInfo?.name || intentResult.primaryAgentId}`,
      needsConfirmation: false,
      executeWorkflow: false,
      payload: this.buildPayload(request, intentResult),
    };
  }

  /**
   * 워크플로우 라우팅 결정 생성
   */
  private createWorkflowRouting(
    request: UserRequest,
    intentResult: IntentResult
  ): RoutingDecision {
    const workflow = PREDEFINED_WORKFLOWS.find(
      (w) => w.id === intentResult.suggestedWorkflowId
    );

    return {
      targetAgentId: workflow?.steps[0]?.agentId || intentResult.primaryAgentId,
      routingType: RoutingType.WORKFLOW,
      confidence: intentResult.confidence,
      reason: `워크플로우 실행: ${workflow?.name || intentResult.suggestedWorkflowId}`,
      needsConfirmation: true, // 워크플로우는 확인 필요
      confirmationOptions: [{
        id: 'confirm-workflow',
        label: `${workflow?.name} 실행`,
        description: workflow?.description || '',
        agentId: workflow?.steps[0]?.agentId || '',
      }],
      executeWorkflow: true,
      workflowId: intentResult.suggestedWorkflowId,
      payload: this.buildPayload(request, intentResult),
    };
  }

  /**
   * 사용자 선택 라우팅 결정 생성
   */
  private createUserChoiceRouting(
    request: UserRequest,
    intentResult: IntentResult
  ): RoutingDecision {
    const options: ConfirmationOption[] = [
      // 주요 에이전트
      {
        id: `option-primary`,
        label: getAgentInfo(intentResult.primaryAgentId)?.name || intentResult.primaryAgentId,
        description: getAgentInfo(intentResult.primaryAgentId)?.scope || '',
        agentId: intentResult.primaryAgentId,
        icon: '1️⃣',
      },
      // 대안 에이전트
      ...intentResult.alternativeAgents.slice(0, 3).map((alt, idx) => ({
        id: `option-alt-${idx}`,
        label: getAgentInfo(alt.agentId)?.name || alt.agentId,
        description: getAgentInfo(alt.agentId)?.scope || alt.reason,
        agentId: alt.agentId,
        icon: ['2️⃣', '3️⃣', '4️⃣'][idx],
      })),
    ];

    // 대기 목록에 추가
    this.pendingSelections.set(request.requestId, {
      requestId: request.requestId,
      options,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5분 만료
      onSelect: () => {},
    });

    return {
      targetAgentId: intentResult.primaryAgentId,
      routingType: RoutingType.USER_CHOICE,
      confidence: intentResult.confidence,
      reason: intentResult.clarificationQuestion || '어떤 작업을 원하시나요?',
      needsConfirmation: true,
      confirmationOptions: options,
      executeWorkflow: false,
      payload: this.buildPayload(request, intentResult),
    };
  }

  /**
   * 추가 정보 요청 라우팅 결정 생성
   */
  private createInfoRequestRouting(
    request: UserRequest,
    intentResult: IntentResult
  ): RoutingDecision {
    const missingInfo = intentResult.requiredContext.join(', ');

    return {
      targetAgentId: intentResult.primaryAgentId,
      routingType: RoutingType.CONDITIONAL,
      confidence: intentResult.confidence * 0.8, // 신뢰도 감소
      reason: `추가 정보 필요: ${missingInfo}`,
      needsConfirmation: true,
      confirmationOptions: [{
        id: 'provide-info',
        label: `${missingInfo}를 입력해주세요`,
        description: `작업을 진행하려면 ${missingInfo}가 필요합니다.`,
        agentId: intentResult.primaryAgentId,
      }],
      executeWorkflow: false,
      payload: {
        ...this.buildPayload(request, intentResult),
        missingContext: intentResult.requiredContext,
      },
    };
  }

  // ===========================================================================
  // 페이로드 빌드
  // ===========================================================================

  /**
   * 페이로드 빌드
   */
  private buildPayload(
    request: UserRequest,
    intentResult: IntentResult
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      requestId: request.requestId,
      rawInput: request.rawInput,
      normalizedInput: request.normalizedInput,
      timestamp: request.timestamp,
      userId: request.userId,
      sessionId: request.sessionId,
      intent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
    };

    // 엔티티 추가
    for (const entity of intentResult.entities) {
      const key = this.entityTypeToKey(entity.type);
      payload[key] = entity.value;
    }

    return payload;
  }

  /**
   * 엔티티 타입을 페이로드 키로 변환
   */
  private entityTypeToKey(type: EntityType): string {
    const mapping: Record<EntityType, string> = {
      [EntityType.ORDER_ID]: 'orderId',
      [EntityType.CUSTOMER_ID]: 'customerId',
      [EntityType.PRODUCT_ID]: 'productId',
      [EntityType.PRODUCT_NAME]: 'productName',
      [EntityType.PHONE_NUMBER]: 'phoneNumber',
      [EntityType.DATE]: 'date',
      [EntityType.AMOUNT]: 'amount',
      [EntityType.QUANTITY]: 'quantity',
      [EntityType.CHANNEL]: 'channel',
      [EntityType.TRACKING_NUMBER]: 'trackingNumber',
      [EntityType.ACTION]: 'action',
      [EntityType.STATUS]: 'status',
    };
    return mapping[type] || type;
  }

  // ===========================================================================
  // 사용자 선택 처리
  // ===========================================================================

  /**
   * 사용자 선택 처리
   * @param requestId - 요청 ID
   * @param selectedOptionId - 선택된 옵션 ID
   * @returns 업데이트된 라우팅 결정
   */
  handleUserSelection(
    requestId: string,
    selectedOptionId: string
  ): RoutingDecision | null {
    const pending = this.pendingSelections.get(requestId);
    if (!pending) {
      systemLogger.warn('No pending selection found', { requestId });
      return null;
    }

    // 만료 확인
    if (pending.expiresAt < new Date()) {
      this.pendingSelections.delete(requestId);
      systemLogger.warn('Selection expired', { requestId });
      return null;
    }

    // 선택된 옵션 찾기
    const selectedOption = pending.options.find((o) => o.id === selectedOptionId);
    if (!selectedOption) {
      systemLogger.warn('Invalid option selected', { requestId, selectedOptionId });
      return null;
    }

    // 대기 목록에서 제거
    this.pendingSelections.delete(requestId);

    // 새 라우팅 결정 생성
    const decision: RoutingDecision = {
      targetAgentId: selectedOption.agentId,
      routingType: RoutingType.DIRECT,
      confidence: 1.0, // 사용자 선택은 신뢰도 100%
      reason: `사용자 선택: ${selectedOption.label}`,
      needsConfirmation: false,
      executeWorkflow: false,
      payload: { requestId },
    };

    systemLogger.info('User selection processed', {
      requestId,
      selectedAgent: selectedOption.agentId,
    });

    return decision;
  }

  /**
   * 숫자로 선택 처리 (1, 2, 3 등)
   */
  handleNumericSelection(
    requestId: string,
    number: number
  ): RoutingDecision | null {
    const pending = this.pendingSelections.get(requestId);
    if (!pending || number < 1 || number > pending.options.length) {
      return null;
    }

    const optionId = pending.options[number - 1].id;
    return this.handleUserSelection(requestId, optionId);
  }

  // ===========================================================================
  // 라우팅 실행
  // ===========================================================================

  /**
   * 라우팅 결정 실행
   * @param decision - 라우팅 결정
   * @returns 실행 결과
   */
  async executeRouting(decision: RoutingDecision): Promise<TaskResult> {
    systemLogger.info('Executing routing', {
      targetAgent: decision.targetAgentId,
      routingType: decision.routingType,
    });

    // 확인이 필요한 경우
    if (decision.needsConfirmation) {
      return {
        taskId: uuidv4(),
        status: TaskStatus.REQUIRES_APPROVAL,
        data: {
          message: decision.reason,
          options: decision.confirmationOptions,
        },
        executionTime: 0,
      };
    }

    // 에이전트 실행
    const agent = agentRegistry.getAgent(decision.targetAgentId);
    if (!agent) {
      systemLogger.error('Agent not found', { agentId: decision.targetAgentId });
      return {
        taskId: uuidv4(),
        status: TaskStatus.FAILED,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `에이전트를 찾을 수 없습니다: ${decision.targetAgentId}`,
          recoverable: false,
        },
        executionTime: 0,
      };
    }

    try {
      const startTime = Date.now();
      const result = await agent.execute(decision.payload);

      return {
        taskId: uuidv4(),
        status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      systemLogger.error('Routing execution failed', error as Error);
      return {
        taskId: uuidv4(),
        status: TaskStatus.FAILED,
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
          recoverable: false,
        },
        executionTime: 0,
      };
    }
  }

  // ===========================================================================
  // 병렬/순차 실행
  // ===========================================================================

  /**
   * 여러 에이전트 병렬 실행
   */
  async executeParallel(
    agentIds: string[],
    payload: Record<string, unknown>
  ): Promise<Map<string, TaskResult>> {
    systemLogger.info('Executing parallel routing', { agents: agentIds });

    const results = new Map<string, TaskResult>();
    const startTime = Date.now();

    const executions = agentIds.map(async (agentId) => {
      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        results.set(agentId, {
          taskId: uuidv4(),
          status: TaskStatus.FAILED,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent not found: ${agentId}`,
            recoverable: false,
          },
          executionTime: 0,
        });
        return;
      }

      try {
        const result = await agent.execute(payload);
        results.set(agentId, {
          taskId: uuidv4(),
          status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
          data: result.data,
          error: result.error,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        results.set(agentId, {
          taskId: uuidv4(),
          status: TaskStatus.FAILED,
          error: {
            code: 'EXECUTION_ERROR',
            message: (error as Error).message,
            recoverable: false,
          },
          executionTime: Date.now() - startTime,
        });
      }
    });

    await Promise.all(executions);
    return results;
  }

  /**
   * 여러 에이전트 순차 실행
   */
  async executeSequential(
    agentIds: string[],
    payload: Record<string, unknown>,
    stopOnError: boolean = true
  ): Promise<Map<string, TaskResult>> {
    systemLogger.info('Executing sequential routing', { agents: agentIds });

    const results = new Map<string, TaskResult>();
    let currentPayload = { ...payload };

    for (const agentId of agentIds) {
      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        results.set(agentId, {
          taskId: uuidv4(),
          status: TaskStatus.FAILED,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent not found: ${agentId}`,
            recoverable: false,
          },
          executionTime: 0,
        });

        if (stopOnError) break;
        continue;
      }

      try {
        const startTime = Date.now();
        const result = await agent.execute(currentPayload);

        results.set(agentId, {
          taskId: uuidv4(),
          status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
          data: result.data,
          error: result.error,
          executionTime: Date.now() - startTime,
        });

        if (!result.success && stopOnError) break;

        // 다음 에이전트로 데이터 전달
        if (result.data && typeof result.data === 'object') {
          currentPayload = { ...currentPayload, ...result.data };
        }
      } catch (error) {
        results.set(agentId, {
          taskId: uuidv4(),
          status: TaskStatus.FAILED,
          error: {
            code: 'EXECUTION_ERROR',
            message: (error as Error).message,
            recoverable: false,
          },
          executionTime: 0,
        });

        if (stopOnError) break;
      }
    }

    return results;
  }

  // ===========================================================================
  // 히스토리 관리
  // ===========================================================================

  /**
   * 히스토리에 저장
   */
  private saveToHistory(sessionId: string, decision: RoutingDecision): void {
    const history = this.routingHistory.get(sessionId) || [];
    history.push(decision);

    // 최대 50개까지만 유지
    if (history.length > 50) {
      history.shift();
    }

    this.routingHistory.set(sessionId, history);
  }

  /**
   * 히스토리 조회
   */
  getHistory(sessionId: string): RoutingDecision[] {
    return this.routingHistory.get(sessionId) || [];
  }

  /**
   * 히스토리 초기화
   */
  clearHistory(sessionId: string): void {
    this.routingHistory.delete(sessionId);
    systemLogger.debug('History cleared', { sessionId });
  }

  // ===========================================================================
  // 유틸리티
  // ===========================================================================

  /**
   * 등록된 에이전트 목록 조회
   */
  getAvailableAgents(): { id: string; name: string; description: string }[] {
    return AGENT_REGISTRY.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.scope,
    }));
  }

  /**
   * 대기 중인 선택 요청 조회
   */
  getPendingSelections(): string[] {
    return Array.from(this.pendingSelections.keys());
  }

  /**
   * 만료된 선택 요청 정리
   */
  cleanupExpiredSelections(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [requestId, pending] of this.pendingSelections) {
      if (pending.expiresAt < now) {
        this.pendingSelections.delete(requestId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      systemLogger.debug('Cleaned expired selections', { count: cleaned });
    }

    return cleaned;
  }
}

// 싱글톤 인스턴스
let agentRouterInstance: AgentRouter | null = null;

/**
 * AgentRouter 싱글톤 인스턴스 가져오기
 */
export function getAgentRouter(): AgentRouter {
  if (!agentRouterInstance) {
    agentRouterInstance = new AgentRouter();
  }
  return agentRouterInstance;
}

export default AgentRouter;
