/**
 * 썬데이허그 AI 에이전트 시스템 - 워크플로우 러너
 *
 * LANE 5: Integration & Orchestration
 * 워크플로우를 로드, 실행, 모니터링하는 고수준 인터페이스입니다.
 */

import { EventEmitter } from 'events';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowSummary,
  WorkflowExecutionOptions,
  WorkflowEvent,
  WorkflowEventType,
} from './types';
import { WorkflowEngine, workflowEngine } from './WorkflowEngine';
import { systemLogger } from '../utils/logger';

/**
 * 워크플로우 러너 설정
 */
interface WorkflowRunnerConfig {
  /** 워크플로우 정의 로드 경로 */
  definitionsPath?: string;
  /** 이벤트 기반 트리거 활성화 */
  enableEventTriggers: boolean;
  /** 스케줄 기반 트리거 활성화 */
  enableScheduleTriggers: boolean;
  /** 자동 재시도 */
  autoRetry: boolean;
}

/**
 * 워크플로우 실행 요청
 */
interface WorkflowExecutionRequest {
  /** 워크플로우 ID */
  workflowId: string;
  /** 입력 데이터 */
  input: Record<string, unknown>;
  /** 실행 옵션 */
  options?: WorkflowExecutionOptions;
  /** 콜백 */
  callback?: (instance: WorkflowInstance) => void;
}

/**
 * 워크플로우 러너
 * 워크플로우 실행을 위한 통합 인터페이스입니다.
 */
export class WorkflowRunner extends EventEmitter {
  private engine: WorkflowEngine;
  private config: WorkflowRunnerConfig;
  private eventSubscriptions: Map<string, Set<string>> = new Map();
  private pendingQueue: WorkflowExecutionRequest[] = [];
  private isProcessing: boolean = false;

  /**
   * WorkflowRunner 생성자
   */
  constructor(config?: Partial<WorkflowRunnerConfig>) {
    super();
    this.engine = workflowEngine;
    this.config = {
      enableEventTriggers: true,
      enableScheduleTriggers: true,
      autoRetry: true,
      ...config,
    };

    this.setupEventListeners();
    systemLogger.info('WorkflowRunner initialized');
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 워크플로우 완료 이벤트
    this.engine.on('workflow:completed', (event: WorkflowEvent) => {
      this.emit('completed', event);
      this.processNextInQueue();
    });

    // 워크플로우 실패 이벤트
    this.engine.on('workflow:failed', (event: WorkflowEvent) => {
      this.emit('failed', event);

      // 자동 재시도
      if (this.config.autoRetry) {
        const instance = this.engine.getInstance(event.instanceId);
        if (instance && instance.retryCount < 3) {
          this.retryWorkflow(event.instanceId).catch((error) => {
            systemLogger.error('Auto retry failed', error);
          });
        }
      }

      this.processNextInQueue();
    });

    // 모든 이벤트 전달
    this.engine.on('*', (event: WorkflowEvent) => {
      this.emit('event', event);
    });
  }

  // ===========================================================================
  // 워크플로우 정의 관리
  // ===========================================================================

  /**
   * 워크플로우 정의 등록
   */
  registerWorkflow(definition: WorkflowDefinition): void {
    this.engine.registerWorkflow(definition);

    // 이벤트 트리거 구독 설정
    if (this.config.enableEventTriggers) {
      for (const trigger of definition.triggers) {
        if (trigger.type === 'event' && trigger.eventName) {
          this.subscribeToEvent(trigger.eventName, definition.id);
        }
      }
    }
  }

  /**
   * 이벤트 구독
   */
  private subscribeToEvent(eventName: string, workflowId: string): void {
    let workflows = this.eventSubscriptions.get(eventName);
    if (!workflows) {
      workflows = new Set();
      this.eventSubscriptions.set(eventName, workflows);
    }
    workflows.add(workflowId);

    systemLogger.debug('Workflow subscribed to event', {
      eventName,
      workflowId,
    });
  }

  /**
   * 여러 워크플로우 등록
   */
  registerWorkflows(definitions: WorkflowDefinition[]): void {
    for (const definition of definitions) {
      this.registerWorkflow(definition);
    }
  }

  /**
   * 등록된 워크플로우 목록 조회
   */
  listWorkflows(): WorkflowDefinition[] {
    return this.engine.listWorkflows();
  }

  // ===========================================================================
  // 워크플로우 실행
  // ===========================================================================

  /**
   * 워크플로우 실행
   */
  async run(
    workflowId: string,
    input: Record<string, unknown>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowInstance> {
    systemLogger.info('Running workflow', { workflowId, input });

    try {
      const instance = await this.engine.startWorkflow(workflowId, input, options);
      return instance;
    } catch (error) {
      systemLogger.error('Failed to run workflow', error as Error, { workflowId });
      throw error;
    }
  }

  /**
   * 워크플로우 동기 실행 (완료까지 대기)
   */
  async runAndWait(
    workflowId: string,
    input: Record<string, unknown>,
    options?: Omit<WorkflowExecutionOptions, 'sync'>
  ): Promise<WorkflowInstance> {
    return this.run(workflowId, input, { ...options, sync: true });
  }

  /**
   * 큐에 워크플로우 추가
   */
  enqueue(request: WorkflowExecutionRequest): void {
    this.pendingQueue.push(request);
    systemLogger.debug('Workflow enqueued', {
      workflowId: request.workflowId,
      queueSize: this.pendingQueue.length,
    });

    if (!this.isProcessing) {
      this.processNextInQueue();
    }
  }

  /**
   * 큐에서 다음 워크플로우 처리
   */
  private async processNextInQueue(): Promise<void> {
    if (this.pendingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const request = this.pendingQueue.shift()!;

    try {
      const instance = await this.run(
        request.workflowId,
        request.input,
        request.options
      );

      if (request.callback) {
        request.callback(instance);
      }
    } catch (error) {
      systemLogger.error('Queued workflow failed', error as Error, {
        workflowId: request.workflowId,
      });
    }
  }

  /**
   * 이벤트로 워크플로우 트리거
   */
  async triggerByEvent(
    eventName: string,
    eventData: Record<string, unknown>
  ): Promise<WorkflowInstance[]> {
    const workflows = this.eventSubscriptions.get(eventName);
    if (!workflows || workflows.size === 0) {
      systemLogger.debug('No workflows subscribed to event', { eventName });
      return [];
    }

    const instances: WorkflowInstance[] = [];

    for (const workflowId of workflows) {
      try {
        const instance = await this.run(workflowId, eventData, {
          metadata: { triggeredBy: 'event', eventName },
        });
        instances.push(instance);
      } catch (error) {
        systemLogger.error('Event-triggered workflow failed', error as Error, {
          workflowId,
          eventName,
        });
      }
    }

    return instances;
  }

  // ===========================================================================
  // 워크플로우 제어
  // ===========================================================================

  /**
   * 워크플로우 일시 정지
   */
  async pause(instanceId: string): Promise<void> {
    await this.engine.pauseWorkflow(instanceId);
    this.emit('paused', { instanceId });
  }

  /**
   * 워크플로우 재개
   */
  async resume(instanceId: string): Promise<void> {
    await this.engine.resumeWorkflow(instanceId);
    this.emit('resumed', { instanceId });
  }

  /**
   * 워크플로우 취소
   */
  async cancel(instanceId: string): Promise<void> {
    await this.engine.cancelWorkflow(instanceId);
    this.emit('cancelled', { instanceId });
  }

  /**
   * 워크플로우 재시도
   */
  async retryWorkflow(instanceId: string): Promise<WorkflowInstance | null> {
    const instance = this.engine.getInstance(instanceId);
    if (!instance) {
      systemLogger.warn('Instance not found for retry', { instanceId });
      return null;
    }

    if (instance.status !== WorkflowStatus.FAILED) {
      systemLogger.warn('Cannot retry non-failed workflow', {
        instanceId,
        status: instance.status,
      });
      return null;
    }

    systemLogger.info('Retrying workflow', { instanceId });

    // 새 인스턴스로 재실행
    return this.run(instance.workflowId, instance.input, {
      metadata: {
        ...instance.metadata,
        retriedFrom: instanceId,
        retryCount: (instance.retryCount || 0) + 1,
      },
    });
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 워크플로우 인스턴스 조회
   */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.engine.getInstance(instanceId);
  }

  /**
   * 워크플로우 요약 조회
   */
  getSummary(instanceId: string): WorkflowSummary | undefined {
    return this.engine.getWorkflowSummary(instanceId);
  }

  /**
   * 실행 중인 워크플로우 수 조회
   */
  getRunningCount(): number {
    return this.engine.getRunningWorkflowCount();
  }

  /**
   * 대기 중인 워크플로우 수 조회
   */
  getQueuedCount(): number {
    return this.pendingQueue.length;
  }

  /**
   * 워크플로우 상태 조회
   */
  getStatus(instanceId: string): WorkflowStatus | undefined {
    const instance = this.getInstance(instanceId);
    return instance?.status;
  }

  // ===========================================================================
  // 대량 작업
  // ===========================================================================

  /**
   * 여러 워크플로우 일괄 실행
   */
  async runBatch(
    requests: Array<{ workflowId: string; input: Record<string, unknown> }>
  ): Promise<WorkflowInstance[]> {
    const instances: WorkflowInstance[] = [];

    for (const request of requests) {
      try {
        const instance = await this.run(request.workflowId, request.input);
        instances.push(instance);
      } catch (error) {
        systemLogger.error('Batch workflow failed', error as Error, {
          workflowId: request.workflowId,
        });
      }
    }

    return instances;
  }

  /**
   * 모든 실행 중인 워크플로우 일시 정지
   */
  async pauseAll(): Promise<void> {
    const workflows = this.engine.listWorkflows();
    // 실제 구현에서는 모든 실행 중인 인스턴스를 순회
    systemLogger.info('Pausing all workflows');
    this.emit('pausedAll');
  }

  /**
   * 모든 일시 정지된 워크플로우 재개
   */
  async resumeAll(): Promise<void> {
    systemLogger.info('Resuming all workflows');
    this.emit('resumedAll');
  }

  // ===========================================================================
  // 통계
  // ===========================================================================

  /**
   * 러너 통계 조회
   */
  getStats(): {
    registered: number;
    running: number;
    queued: number;
    eventSubscriptions: number;
  } {
    return {
      registered: this.engine.listWorkflows().length,
      running: this.engine.getRunningWorkflowCount(),
      queued: this.pendingQueue.length,
      eventSubscriptions: this.eventSubscriptions.size,
    };
  }

  /**
   * 큐 비우기
   */
  clearQueue(): void {
    this.pendingQueue = [];
    systemLogger.info('Workflow queue cleared');
  }

  /**
   * 러너 종료
   */
  async shutdown(): Promise<void> {
    systemLogger.info('Shutting down WorkflowRunner');

    // 대기 중인 작업 취소
    this.clearQueue();

    // 실행 중인 워크플로우 일시 정지
    await this.pauseAll();

    this.emit('shutdown');
  }
}

// 싱글톤 인스턴스 export
export const workflowRunner = new WorkflowRunner();
export default WorkflowRunner;
