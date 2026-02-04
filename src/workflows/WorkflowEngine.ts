/**
 * 썬데이허그 AI 에이전트 시스템 - 워크플로우 엔진
 *
 * LANE 5: Integration & Orchestration
 * 워크플로우 정의를 로드하고 실행하는 핵심 엔진입니다.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowContext,
  StepDefinition,
  StepResult,
  StepStatus,
  StepError,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowEventHandler,
  WorkflowExecutionOptions,
  WorkflowSummary,
  TriggerInfo,
} from './types';
import { StateMachine, createWorkflowStateMachine } from './StateMachine';
import { ErrorRecoveryManager, errorRecoveryManager } from './ErrorRecovery';
import { systemLogger } from '../utils/logger';
import agentRegistry from '../agents/base/AgentRegistry';

/**
 * 워크플로우 엔진 설정
 */
interface WorkflowEngineConfig {
  /** 최대 동시 실행 워크플로우 수 */
  maxConcurrentWorkflows: number;
  /** 기본 타임아웃 (밀리초) */
  defaultTimeout: number;
  /** 기본 재시도 횟수 */
  defaultMaxRetries: number;
  /** 기본 재시도 지연 (밀리초) */
  defaultRetryDelay: number;
}

/**
 * 기본 설정
 */
const defaultConfig: WorkflowEngineConfig = {
  maxConcurrentWorkflows: 10,
  defaultTimeout: 300000, // 5분
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
};

/**
 * 워크플로우 엔진
 * 워크플로우의 전체 라이프사이클을 관리합니다.
 */
export class WorkflowEngine extends EventEmitter {
  private config: WorkflowEngineConfig;
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private stateMachines: Map<string, StateMachine> = new Map();
  private eventHandlers: Map<WorkflowEventType, WorkflowEventHandler[]> = new Map();
  private recoveryManager: ErrorRecoveryManager;

  /**
   * WorkflowEngine 생성자
   * @param config - 엔진 설정
   */
  constructor(config?: Partial<WorkflowEngineConfig>) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.recoveryManager = errorRecoveryManager;
    this.setupRecoveryListeners();

    systemLogger.info('WorkflowEngine initialized', {
      maxConcurrent: this.config.maxConcurrentWorkflows,
      defaultTimeout: this.config.defaultTimeout,
    });
  }

  /**
   * 복구 이벤트 리스너 설정
   */
  private setupRecoveryListeners(): void {
    this.recoveryManager.on('recovery:escalate', ({ step, instance }) => {
      systemLogger.warn('Step escalated', {
        stepId: step.id,
        instanceId: instance.instanceId,
      });
      this.emitEvent('step:failed', instance.instanceId, step.id, {
        escalated: true,
      });
    });
  }

  // ===========================================================================
  // 워크플로우 정의 관리
  // ===========================================================================

  /**
   * 워크플로우 정의 등록
   * @param definition - 워크플로우 정의
   */
  registerWorkflow(definition: WorkflowDefinition): void {
    const key = `${definition.id}:${definition.version}`;
    this.definitions.set(key, definition);

    systemLogger.info('Workflow registered', {
      id: definition.id,
      version: definition.version,
      stepsCount: definition.steps.length,
    });
  }

  /**
   * 워크플로우 정의 조회
   * @param workflowId - 워크플로우 ID
   * @param version - 버전 (없으면 최신)
   * @returns 워크플로우 정의
   */
  getWorkflowDefinition(
    workflowId: string,
    version?: string
  ): WorkflowDefinition | undefined {
    if (version) {
      return this.definitions.get(`${workflowId}:${version}`);
    }

    // 최신 버전 찾기
    let latest: WorkflowDefinition | undefined;
    for (const [key, def] of this.definitions) {
      if (key.startsWith(`${workflowId}:`)) {
        if (!latest || def.version > latest.version) {
          latest = def;
        }
      }
    }
    return latest;
  }

  /**
   * 등록된 모든 워크플로우 목록 조회
   * @returns 워크플로우 정의 배열
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.definitions.values());
  }

  // ===========================================================================
  // 워크플로우 실행
  // ===========================================================================

  /**
   * 워크플로우 시작
   * @param workflowId - 워크플로우 ID
   * @param input - 입력 데이터
   * @param options - 실행 옵션
   * @returns 워크플로우 인스턴스
   */
  async startWorkflow(
    workflowId: string,
    input: Record<string, unknown>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowInstance> {
    // 워크플로우 정의 확인
    const definition = this.getWorkflowDefinition(workflowId);
    if (!definition) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!definition.enabled) {
      throw new Error(`Workflow is disabled: ${workflowId}`);
    }

    // 동시 실행 제한 확인
    const runningCount = this.getRunningWorkflowCount();
    if (runningCount >= this.config.maxConcurrentWorkflows) {
      throw new Error(
        `Max concurrent workflows reached: ${this.config.maxConcurrentWorkflows}`
      );
    }

    // 인스턴스 생성
    const instanceId = uuidv4();
    const context: WorkflowContext = {
      variables: {},
      results: {},
      environment:
        (process.env.NODE_ENV as 'development' | 'staging' | 'production') ||
        'development',
      userId: options?.userId,
    };

    const instance: WorkflowInstance = {
      instanceId,
      workflowId: definition.id,
      version: definition.version,
      status: WorkflowStatus.PENDING,
      startedAt: new Date(),
      input,
      context,
      stepResults: new Map(),
      retryCount: 0,
      triggeredBy: {
        type: 'manual',
        source: 'WorkflowEngine',
        triggeredAt: new Date(),
      },
      metadata: options?.metadata,
    };

    // 상태 머신 생성
    const stateMachine = createWorkflowStateMachine(context);
    this.stateMachines.set(instanceId, stateMachine);

    // 인스턴스 저장
    this.instances.set(instanceId, instance);

    // 이벤트 발생
    this.emitEvent('workflow:started', instanceId, undefined, { input });

    systemLogger.info('Workflow started', {
      instanceId,
      workflowId: definition.id,
      version: definition.version,
    });

    // 동기 실행 옵션이면 완료까지 대기
    if (options?.sync) {
      await this.executeWorkflow(instance, definition);
    } else {
      // 비동기 실행
      this.executeWorkflow(instance, definition).catch((error) => {
        systemLogger.error('Workflow execution failed', error);
      });
    }

    return instance;
  }

  /**
   * 워크플로우 실행
   * @param instance - 워크플로우 인스턴스
   * @param definition - 워크플로우 정의
   */
  private async executeWorkflow(
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<void> {
    const stateMachine = this.stateMachines.get(instance.instanceId);
    if (!stateMachine) return;

    try {
      // 상태 전이: RUNNING
      await stateMachine.transition('start');
      instance.status = WorkflowStatus.RUNNING;

      // 시작 스텝부터 실행
      let currentStepId: string | undefined = definition.startStepId;

      while (currentStepId) {
        // 일시 정지 상태 확인
        if (instance.status === WorkflowStatus.PAUSED) {
          systemLogger.info('Workflow paused', {
            instanceId: instance.instanceId,
            currentStep: currentStepId,
          });
          return;
        }

        // 취소 상태 확인
        if (instance.status === WorkflowStatus.CANCELLED) {
          return;
        }

        const step = definition.steps.find((s) => s.id === currentStepId);
        if (!step) {
          throw new Error(`Step not found: ${currentStepId}`);
        }

        instance.currentStepId = currentStepId;

        // 스텝 실행
        const result = await this.executeStep(step, instance, definition);

        // 결과 저장
        instance.stepResults.set(step.id, result);
        instance.context.results[step.id] = result.output;

        // 다음 스텝 결정
        if (result.status === StepStatus.COMPLETED) {
          currentStepId = this.determineNextStep(step, result, instance.context);
        } else if (result.status === StepStatus.SKIPPED) {
          currentStepId = this.determineNextStep(step, result, instance.context);
        } else if (result.status === StepStatus.FAILED) {
          // 에러 전략에 따른 처리
          const action = this.recoveryManager.getActionFromStrategy(
            definition.errorStrategy,
            result.error!,
            step
          );

          if (action.type === 'abort' || action.type === 'escalate') {
            throw new Error(result.error?.message || 'Step failed');
          } else if (action.type === 'skip') {
            currentStepId = this.determineNextStep(step, result, instance.context);
          }
        }
      }

      // 완료 처리
      await stateMachine.transition('complete');
      instance.status = WorkflowStatus.COMPLETED;
      instance.completedAt = new Date();

      this.emitEvent('workflow:completed', instance.instanceId, undefined, {
        duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
      });

      systemLogger.info('Workflow completed', {
        instanceId: instance.instanceId,
        duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
      });
    } catch (error) {
      await stateMachine.transition('fail');
      instance.status = WorkflowStatus.FAILED;
      instance.completedAt = new Date();
      instance.error = {
        code: 'WORKFLOW_FAILED',
        message: (error as Error).message,
        failedStepId: instance.currentStepId,
        recoverable: false,
      };

      this.emitEvent('workflow:failed', instance.instanceId, undefined, {
        error: (error as Error).message,
        failedStep: instance.currentStepId,
      });

      systemLogger.error('Workflow failed', error as Error, {
        instanceId: instance.instanceId,
        failedStep: instance.currentStepId,
      });
    }
  }

  /**
   * 스텝 실행
   * @param step - 스텝 정의
   * @param instance - 워크플로우 인스턴스
   * @param definition - 워크플로우 정의
   * @returns 스텝 결과
   */
  private async executeStep(
    step: StepDefinition,
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<StepResult> {
    const startTime = Date.now();

    const result: StepResult = {
      stepId: step.id,
      status: StepStatus.PENDING,
      startedAt: new Date(),
      retryCount: 0,
    };

    this.emitEvent('step:started', instance.instanceId, step.id);

    systemLogger.debug('Executing step', {
      stepId: step.id,
      stepName: step.name,
      agentId: step.agentId,
    });

    try {
      result.status = StepStatus.RUNNING;

      // 승인 필요 확인
      if (step.requiresApproval) {
        await this.requestApproval(step, instance);
      }

      // 입력 데이터 준비
      const inputData = this.prepareStepInput(step, instance);

      // 에이전트 실행
      const agent = agentRegistry.getAgent(step.agentId);

      if (!agent) {
        // 에이전트가 없으면 경고하고 스킵
        systemLogger.warn(`Agent not registered: ${step.agentId}`, {
          stepId: step.id,
        });

        if (!step.required) {
          result.status = StepStatus.SKIPPED;
          result.completedAt = new Date();
          result.executionTime = Date.now() - startTime;
          return result;
        }

        throw new Error(`Required agent not found: ${step.agentId}`);
      }

      // 타임아웃 설정
      const timeout = step.timeout || definition.globalTimeout || this.config.defaultTimeout;

      // 에이전트 실행 (타임아웃 적용)
      const agentResult = await this.executeWithTimeout(
        () => agent.execute(inputData, 'workflow-engine'),
        timeout
      );

      // 결과 매핑
      result.output = this.mapStepOutput(step, agentResult.data as Record<string, unknown>);
      result.status = agentResult.success ? StepStatus.COMPLETED : StepStatus.FAILED;

      if (!agentResult.success && agentResult.error) {
        result.error = {
          code: agentResult.error.code,
          message: agentResult.error.message,
          recoverable: agentResult.error.recoverable,
        };
      }

      result.completedAt = new Date();
      result.executionTime = Date.now() - startTime;

      if (result.status === StepStatus.COMPLETED) {
        this.emitEvent('step:completed', instance.instanceId, step.id, {
          executionTime: result.executionTime,
        });
      } else {
        this.emitEvent('step:failed', instance.instanceId, step.id, {
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      result.status = StepStatus.FAILED;
      result.completedAt = new Date();
      result.executionTime = Date.now() - startTime;
      result.error = {
        code: 'STEP_EXECUTION_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        recoverable: this.isRecoverableError(error as Error),
      };

      // 복구 시도
      if (step.retryConfig && result.retryCount < step.retryConfig.maxRetries) {
        const recoveryAction = await this.recoveryManager.determineRecoveryAction(
          result.error,
          step,
          instance
        );

        if (recoveryAction.type === 'retry') {
          result.retryCount++;
          await this.recoveryManager.executeRecoveryAction(recoveryAction, step, instance);

          this.emitEvent('step:retrying', instance.instanceId, step.id, {
            retryCount: result.retryCount,
          });

          return this.executeStep(step, instance, definition);
        }
      }

      this.emitEvent('step:failed', instance.instanceId, step.id, {
        error: result.error,
      });

      return result;
    }
  }

  /**
   * 타임아웃 적용 실행
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 스텝 입력 데이터 준비
   */
  private prepareStepInput(
    step: StepDefinition,
    instance: WorkflowInstance
  ): Record<string, unknown> {
    const input: Record<string, unknown> = { ...instance.input };

    if (step.inputMapping) {
      for (const [targetKey, sourceKey] of Object.entries(step.inputMapping)) {
        const value = this.getValueByPath(
          { input: instance.input, context: instance.context, results: instance.context.results },
          sourceKey
        );
        input[targetKey] = value;
      }
    }

    return input;
  }

  /**
   * 스텝 출력 데이터 매핑
   */
  private mapStepOutput(
    step: StepDefinition,
    output: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    if (!output) return {};

    if (step.outputMapping) {
      const mapped: Record<string, unknown> = {};
      for (const [targetKey, sourceKey] of Object.entries(step.outputMapping)) {
        mapped[targetKey] = this.getValueByPath(output, sourceKey);
      }
      return mapped;
    }

    return output;
  }

  /**
   * 경로로 값 조회
   */
  private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  /**
   * 다음 스텝 결정
   */
  private determineNextStep(
    step: StepDefinition,
    result: StepResult,
    context: WorkflowContext
  ): string | undefined {
    for (const transition of step.transitions) {
      if (transition.condition) {
        const value = this.getValueByPath(
          { result, context },
          transition.condition.field
        );
        if (this.evaluateCondition(value, transition.condition.operator, transition.condition.value)) {
          return transition.targetStepId;
        }
      } else if (transition.isDefault) {
        return transition.targetStepId;
      }
    }

    // 기본 전이가 없으면 워크플로우 종료
    return undefined;
  }

  /**
   * 조건 평가
   */
  private evaluateCondition(
    value: unknown,
    operator: string,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'ne':
        return value !== expected;
      case 'gt':
        return (value as number) > (expected as number);
      case 'gte':
        return (value as number) >= (expected as number);
      case 'lt':
        return (value as number) < (expected as number);
      case 'lte':
        return (value as number) <= (expected as number);
      case 'in':
        return (expected as unknown[]).includes(value);
      case 'contains':
        return String(value).includes(String(expected));
      default:
        return false;
    }
  }

  /**
   * 복구 가능한 에러 확인
   */
  private isRecoverableError(error: Error): boolean {
    const recoverablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'RATE_LIMIT',
      '503',
      '429',
    ];
    return recoverablePatterns.some((p) => error.message.includes(p));
  }

  /**
   * 승인 요청
   */
  private async requestApproval(
    step: StepDefinition,
    instance: WorkflowInstance
  ): Promise<void> {
    const stateMachine = this.stateMachines.get(instance.instanceId);
    if (!stateMachine) return;

    await stateMachine.transition('wait_approval');
    instance.status = WorkflowStatus.WAITING_APPROVAL;

    this.emitEvent('approval:requested', instance.instanceId, step.id);

    // 실제 구현에서는 승인 대기 로직 추가
    // 여기서는 바로 승인된 것으로 처리
    await stateMachine.transition('approval_received');
    instance.status = WorkflowStatus.RUNNING;

    this.emitEvent('approval:received', instance.instanceId, step.id, {
      approved: true,
    });
  }

  // ===========================================================================
  // 워크플로우 제어
  // ===========================================================================

  /**
   * 워크플로우 일시 정지
   */
  async pauseWorkflow(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const stateMachine = this.stateMachines.get(instanceId);

    if (!instance || !stateMachine) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (await stateMachine.transition('pause')) {
      instance.status = WorkflowStatus.PAUSED;
      this.emitEvent('workflow:paused', instanceId);
      systemLogger.info('Workflow paused', { instanceId });
    }
  }

  /**
   * 워크플로우 재개
   */
  async resumeWorkflow(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const stateMachine = this.stateMachines.get(instanceId);

    if (!instance || !stateMachine) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (await stateMachine.transition('resume')) {
      instance.status = WorkflowStatus.RUNNING;
      this.emitEvent('workflow:resumed', instanceId);
      systemLogger.info('Workflow resumed', { instanceId });

      // 실행 재개
      const definition = this.getWorkflowDefinition(instance.workflowId, instance.version);
      if (definition) {
        this.executeWorkflow(instance, definition).catch((error) => {
          systemLogger.error('Workflow resume failed', error);
        });
      }
    }
  }

  /**
   * 워크플로우 취소
   */
  async cancelWorkflow(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const stateMachine = this.stateMachines.get(instanceId);

    if (!instance || !stateMachine) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (await stateMachine.transition('cancel')) {
      instance.status = WorkflowStatus.CANCELLED;
      instance.completedAt = new Date();
      this.emitEvent('workflow:cancelled', instanceId);
      systemLogger.info('Workflow cancelled', { instanceId });
    }
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 워크플로우 인스턴스 조회
   */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * 실행 중인 워크플로우 수 조회
   */
  getRunningWorkflowCount(): number {
    let count = 0;
    for (const instance of this.instances.values()) {
      if (instance.status === WorkflowStatus.RUNNING) {
        count++;
      }
    }
    return count;
  }

  /**
   * 워크플로우 요약 조회
   */
  getWorkflowSummary(instanceId: string): WorkflowSummary | undefined {
    const instance = this.instances.get(instanceId);
    if (!instance) return undefined;

    const definition = this.getWorkflowDefinition(instance.workflowId, instance.version);
    const totalSteps = definition?.steps.length || 0;
    let completedSteps = 0;

    for (const result of instance.stepResults.values()) {
      if (result.status === StepStatus.COMPLETED || result.status === StepStatus.SKIPPED) {
        completedSteps++;
      }
    }

    const currentStep = definition?.steps.find((s) => s.id === instance.currentStepId);

    return {
      instanceId: instance.instanceId,
      workflowId: instance.workflowId,
      workflowName: definition?.name || 'Unknown',
      status: instance.status,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      totalSteps,
      completedSteps,
      currentStepName: currentStep?.name,
    };
  }

  // ===========================================================================
  // 이벤트 관리
  // ===========================================================================

  /**
   * 이벤트 핸들러 등록
   */
  onWorkflowEvent(eventType: WorkflowEventType, handler: WorkflowEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * 이벤트 발생
   */
  private emitEvent(
    type: WorkflowEventType,
    instanceId: string,
    stepId?: string,
    data?: Record<string, unknown>
  ): void {
    const event: WorkflowEvent = {
      id: uuidv4(),
      type,
      instanceId,
      stepId,
      timestamp: new Date(),
      data,
    };

    // 내부 이벤트 핸들러 호출
    const handlers = this.eventHandlers.get(type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        systemLogger.error('Event handler error', error as Error, { eventType: type });
      }
    }

    // EventEmitter 이벤트 발생
    this.emit(type, event);
    this.emit('*', event);
  }
}

// 싱글톤 인스턴스 export
export const workflowEngine = new WorkflowEngine();
export default WorkflowEngine;
