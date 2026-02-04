/**
 * 썬데이허그 AI 에이전트 시스템 - 워크플로우 오케스트레이터
 *
 * 복합 워크플로우의 실행을 관리합니다.
 * 순차/병렬 실행, 조건부 분기, 에러 처리, 롤백을 담당합니다.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CompositeWorkflow,
  WorkflowStepDefinition,
  WorkflowExecutionState,
  WorkflowConditionDefinition,
} from './types';
import { PREDEFINED_WORKFLOWS } from './KeywordMapping';
import { agentRegistry } from '../base/AgentRegistry';
import { systemLogger } from '../../utils/logger';
import { TaskResult, TaskStatus, AgentResult } from '../../types';

// =============================================================================
// 워크플로우 실행 이벤트
// =============================================================================

export type WorkflowEventType =
  | 'workflow:started'
  | 'workflow:step_started'
  | 'workflow:step_completed'
  | 'workflow:step_failed'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'workflow:cancelled'
  | 'workflow:paused'
  | 'workflow:resumed';

export type WorkflowEventListener = (
  event: WorkflowEventType,
  data: Record<string, unknown>
) => void | Promise<void>;

// =============================================================================
// WorkflowOrchestrator 클래스
// =============================================================================

/**
 * 워크플로우 오케스트레이터
 * 복합 워크플로우의 실행을 관리합니다.
 */
export class WorkflowOrchestrator {
  /** 진행 중인 워크플로우 */
  private runningWorkflows: Map<string, WorkflowExecutionState> = new Map();

  /** 이벤트 리스너 */
  private eventListeners: Map<WorkflowEventType, WorkflowEventListener[]> = new Map();

  /** 롤백 액션 (실행된 단계 역순으로 실행) */
  private rollbackActions: Map<string, (() => Promise<void>)[]> = new Map();

  constructor() {
    systemLogger.info('WorkflowOrchestrator initialized');
  }

  // ===========================================================================
  // 워크플로우 실행
  // ===========================================================================

  /**
   * 워크플로우 실행
   * @param workflowId - 워크플로우 ID
   * @param initialContext - 초기 컨텍스트 데이터
   * @returns 실행 결과
   */
  async execute(
    workflowId: string,
    initialContext: Record<string, unknown> = {}
  ): Promise<WorkflowExecutionState> {
    // 워크플로우 정의 조회
    const workflow = PREDEFINED_WORKFLOWS.find((w) => w.id === workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // 실행 상태 초기화
    const executionId = uuidv4();
    const state: WorkflowExecutionState = {
      executionId,
      workflowId,
      currentStepIndex: 0,
      status: 'running',
      startedAt: new Date(),
      stepResults: new Map(),
      context: { ...initialContext },
    };

    this.runningWorkflows.set(executionId, state);
    this.rollbackActions.set(executionId, []);

    systemLogger.info('Workflow started', {
      executionId,
      workflowId,
      workflowName: workflow.name,
    });

    await this.emitEvent('workflow:started', {
      executionId,
      workflowId,
      workflowName: workflow.name,
    });

    try {
      // 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Workflow timeout after ${workflow.timeout}ms`));
        }, workflow.timeout);
      });

      // 워크플로우 실행
      const executionPromise = this.executeSteps(workflow, state);

      await Promise.race([executionPromise, timeoutPromise]);

      // 성공
      state.status = 'completed';
      state.completedAt = new Date();

      systemLogger.info('Workflow completed', {
        executionId,
        workflowId,
        duration: state.completedAt.getTime() - state.startedAt.getTime(),
      });

      await this.emitEvent('workflow:completed', {
        executionId,
        workflowId,
        results: Object.fromEntries(state.stepResults),
      });
    } catch (error) {
      // 실패
      state.status = 'failed';
      state.completedAt = new Date();
      state.error = {
        stepId: workflow.steps[state.currentStepIndex]?.stepId || 'unknown',
        message: (error as Error).message,
        recoverable: false,
      };

      systemLogger.error('Workflow failed', error as Error, {
        executionId,
        workflowId,
        failedStep: state.currentStepIndex,
      });

      await this.emitEvent('workflow:failed', {
        executionId,
        workflowId,
        error: state.error,
      });

      // 롤백 처리
      if (workflow.errorStrategy === 'rollback') {
        await this.rollback(executionId);
      }
    } finally {
      // 정리
      this.runningWorkflows.delete(executionId);
      this.rollbackActions.delete(executionId);
    }

    return state;
  }

  /**
   * 워크플로우 단계 실행
   */
  private async executeSteps(
    workflow: CompositeWorkflow,
    state: WorkflowExecutionState
  ): Promise<void> {
    // 병렬 그룹 처리
    const parallelGroups = this.groupParallelSteps(workflow.steps);

    for (const group of parallelGroups) {
      if (state.status !== 'running') break;

      if (group.parallel) {
        // 병렬 실행
        await this.executeParallelGroup(group.steps, workflow, state);
      } else {
        // 순차 실행
        for (const step of group.steps) {
          if (state.status !== 'running') break;
          await this.executeStep(step, workflow, state);
          state.currentStepIndex++;
        }
      }
    }
  }

  /**
   * 병렬 단계 그룹화
   */
  private groupParallelSteps(
    steps: WorkflowStepDefinition[]
  ): { parallel: boolean; steps: WorkflowStepDefinition[] }[] {
    const groups: { parallel: boolean; steps: WorkflowStepDefinition[] }[] = [];
    let currentGroup: WorkflowStepDefinition[] = [];
    let currentParallel = false;

    for (const step of steps) {
      const isParallel = step.parallel || false;

      if (currentGroup.length === 0) {
        currentParallel = isParallel;
        currentGroup.push(step);
      } else if (isParallel === currentParallel &&
                 (!step.parallelGroupId ||
                  step.parallelGroupId === currentGroup[0].parallelGroupId)) {
        currentGroup.push(step);
      } else {
        groups.push({ parallel: currentParallel, steps: currentGroup });
        currentGroup = [step];
        currentParallel = isParallel;
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ parallel: currentParallel, steps: currentGroup });
    }

    return groups;
  }

  /**
   * 병렬 그룹 실행
   */
  private async executeParallelGroup(
    steps: WorkflowStepDefinition[],
    workflow: CompositeWorkflow,
    state: WorkflowExecutionState
  ): Promise<void> {
    systemLogger.debug('Executing parallel group', {
      executionId: state.executionId,
      steps: steps.map((s) => s.stepId),
    });

    const executions = steps.map((step) =>
      this.executeStep(step, workflow, state).catch((error) => {
        if (step.required && workflow.errorStrategy === 'stop') {
          throw error;
        }
        systemLogger.warn('Parallel step failed (non-critical)', {
          stepId: step.stepId,
          error: (error as Error).message,
        });
      })
    );

    await Promise.all(executions);
    state.currentStepIndex += steps.length;
  }

  /**
   * 단일 단계 실행
   */
  private async executeStep(
    step: WorkflowStepDefinition,
    workflow: CompositeWorkflow,
    state: WorkflowExecutionState
  ): Promise<TaskResult> {
    systemLogger.debug('Executing step', {
      executionId: state.executionId,
      stepId: step.stepId,
      agentId: step.agentId,
    });

    await this.emitEvent('workflow:step_started', {
      executionId: state.executionId,
      stepId: step.stepId,
      agentId: step.agentId,
    });

    // 조건 확인
    if (step.condition && !this.evaluateCondition(step.condition, state)) {
      systemLogger.debug('Step skipped due to condition', {
        stepId: step.stepId,
      });

      const skippedResult: TaskResult = {
        taskId: uuidv4(),
        status: TaskStatus.CANCELLED,
        data: { skipped: true, reason: 'Condition not met' },
        executionTime: 0,
      };

      state.stepResults.set(step.stepId, skippedResult);
      return skippedResult;
    }

    // 에이전트 조회
    const agent = agentRegistry.getAgent(step.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${step.agentId}`);
    }

    // 입력 데이터 준비
    const inputData = this.prepareInputData(step, state);

    // 재시도 로직
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await agent.execute(inputData);

        const taskResult: TaskResult = {
          taskId: uuidv4(),
          status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
          data: result.data,
          error: result.error,
          executionTime: Date.now() - startTime,
        };

        // 결과 저장
        state.stepResults.set(step.stepId, taskResult);

        // 출력 매핑
        if (result.success && step.outputMapping && result.data) {
          this.applyOutputMapping(step.outputMapping, result.data, state);
        }

        // 롤백 액션 등록
        if (result.success) {
          const rollbacks = this.rollbackActions.get(state.executionId);
          if (rollbacks) {
            rollbacks.push(async () => {
              // 롤백 로직 (에이전트별로 구현 필요)
              systemLogger.info('Rolling back step', { stepId: step.stepId });
            });
          }
        }

        await this.emitEvent('workflow:step_completed', {
          executionId: state.executionId,
          stepId: step.stepId,
          success: result.success,
          executionTime: taskResult.executionTime,
        });

        if (!result.success && step.required) {
          throw new Error(`Required step failed: ${step.stepId}`);
        }

        return taskResult;
      } catch (error) {
        lastError = error as Error;
        if (attempt < step.maxRetries) {
          systemLogger.warn('Step failed, retrying', {
            stepId: step.stepId,
            attempt: attempt + 1,
            maxRetries: step.maxRetries,
          });
          await this.sleep(1000 * (attempt + 1)); // 지수 백오프
        }
      }
    }

    // 모든 재시도 실패
    const failedResult: TaskResult = {
      taskId: uuidv4(),
      status: TaskStatus.FAILED,
      error: {
        code: 'STEP_FAILED',
        message: lastError?.message || 'Unknown error',
        recoverable: false,
      },
      executionTime: 0,
    };

    state.stepResults.set(step.stepId, failedResult);

    await this.emitEvent('workflow:step_failed', {
      executionId: state.executionId,
      stepId: step.stepId,
      error: failedResult.error,
    });

    if (step.required) {
      throw lastError || new Error(`Required step failed: ${step.stepId}`);
    }

    return failedResult;
  }

  /**
   * 조건 평가
   */
  private evaluateCondition(
    condition: WorkflowConditionDefinition,
    state: WorkflowExecutionState
  ): boolean {
    switch (condition.type) {
      case 'result_success': {
        const prevResult = state.stepResults.get(condition.previousStepId || '');
        return prevResult?.status === TaskStatus.COMPLETED;
      }

      case 'result_value': {
        const prevResult = state.stepResults.get(condition.previousStepId || '');
        if (!prevResult?.data || !condition.field) return false;

        const value = this.getNestedValue(prevResult.data, condition.field);
        return this.compareValues(value, condition.operator || 'eq', condition.value);
      }

      case 'entity_exists': {
        const value = state.context[condition.field || ''];
        return value !== undefined && value !== null;
      }

      case 'custom':
        // 커스텀 함수는 나중에 구현
        return true;

      default:
        return true;
    }
  }

  /**
   * 중첩 객체에서 값 조회
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * 값 비교
   */
  private compareValues(
    actual: unknown,
    operator: string,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return (actual as number) > (expected as number);
      case 'gte':
        return (actual as number) >= (expected as number);
      case 'lt':
        return (actual as number) < (expected as number);
      case 'lte':
        return (actual as number) <= (expected as number);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected as string);
      default:
        return false;
    }
  }

  /**
   * 입력 데이터 준비
   */
  private prepareInputData(
    step: WorkflowStepDefinition,
    state: WorkflowExecutionState
  ): Record<string, unknown> {
    const data: Record<string, unknown> = { ...state.context };

    if (step.inputMapping) {
      for (const [targetKey, sourceKey] of Object.entries(step.inputMapping)) {
        data[targetKey] = state.context[sourceKey];
      }
    }

    data.action = step.action;
    data.stepId = step.stepId;
    data.executionId = state.executionId;

    return data;
  }

  /**
   * 출력 매핑 적용
   */
  private applyOutputMapping(
    mapping: Record<string, string>,
    data: unknown,
    state: WorkflowExecutionState
  ): void {
    if (typeof data !== 'object' || data === null) return;

    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      const value = this.getNestedValue(data, sourceKey);
      if (value !== undefined) {
        state.context[targetKey] = value;
      }
    }
  }

  // ===========================================================================
  // 워크플로우 제어
  // ===========================================================================

  /**
   * 워크플로우 일시 정지
   */
  pause(executionId: string): boolean {
    const state = this.runningWorkflows.get(executionId);
    if (!state || state.status !== 'running') {
      return false;
    }

    state.status = 'paused';
    systemLogger.info('Workflow paused', { executionId });
    this.emitEvent('workflow:paused', { executionId });
    return true;
  }

  /**
   * 워크플로우 재개
   */
  resume(executionId: string): boolean {
    const state = this.runningWorkflows.get(executionId);
    if (!state || state.status !== 'paused') {
      return false;
    }

    state.status = 'running';
    systemLogger.info('Workflow resumed', { executionId });
    this.emitEvent('workflow:resumed', { executionId });
    return true;
  }

  /**
   * 워크플로우 취소
   */
  cancel(executionId: string): boolean {
    const state = this.runningWorkflows.get(executionId);
    if (!state) {
      return false;
    }

    state.status = 'cancelled';
    state.completedAt = new Date();
    systemLogger.info('Workflow cancelled', { executionId });
    this.emitEvent('workflow:cancelled', { executionId });
    return true;
  }

  /**
   * 롤백 실행
   */
  private async rollback(executionId: string): Promise<void> {
    const actions = this.rollbackActions.get(executionId);
    if (!actions || actions.length === 0) return;

    systemLogger.info('Starting rollback', {
      executionId,
      stepCount: actions.length,
    });

    // 역순으로 롤백
    for (let i = actions.length - 1; i >= 0; i--) {
      try {
        await actions[i]();
      } catch (error) {
        systemLogger.error('Rollback step failed', error as Error, {
          executionId,
          stepIndex: i,
        });
      }
    }

    systemLogger.info('Rollback completed', { executionId });
  }

  // ===========================================================================
  // 상태 조회
  // ===========================================================================

  /**
   * 워크플로우 상태 조회
   */
  getState(executionId: string): WorkflowExecutionState | undefined {
    return this.runningWorkflows.get(executionId);
  }

  /**
   * 실행 중인 워크플로우 목록
   */
  getRunningWorkflows(): string[] {
    return Array.from(this.runningWorkflows.keys());
  }

  /**
   * 워크플로우 정의 조회
   */
  getWorkflowDefinition(workflowId: string): CompositeWorkflow | undefined {
    return PREDEFINED_WORKFLOWS.find((w) => w.id === workflowId);
  }

  /**
   * 사용 가능한 워크플로우 목록
   */
  getAvailableWorkflows(): { id: string; name: string; description: string }[] {
    return PREDEFINED_WORKFLOWS.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
    }));
  }

  // ===========================================================================
  // 이벤트 관리
  // ===========================================================================

  /**
   * 이벤트 리스너 등록
   */
  on(event: WorkflowEventType, listener: WorkflowEventListener): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event: WorkflowEventType, listener: WorkflowEventListener): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  /**
   * 이벤트 발생
   */
  private async emitEvent(
    event: WorkflowEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    const listeners = this.eventListeners.get(event) || [];

    for (const listener of listeners) {
      try {
        await listener(event, data);
      } catch (error) {
        systemLogger.error(`Event listener error for ${event}`, error as Error);
      }
    }
  }

  // ===========================================================================
  // 유틸리티
  // ===========================================================================

  /**
   * 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 싱글톤 인스턴스
let orchestratorInstance: WorkflowOrchestrator | null = null;

/**
 * WorkflowOrchestrator 싱글톤 인스턴스 가져오기
 */
export function getWorkflowOrchestrator(): WorkflowOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new WorkflowOrchestrator();
  }
  return orchestratorInstance;
}

export default WorkflowOrchestrator;
