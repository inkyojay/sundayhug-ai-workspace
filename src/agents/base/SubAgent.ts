/**
 * 썬데이허그 AI 에이전트 시스템 - SubAgent 추상 클래스
 *
 * 부모 에이전트에 의해 생성되고 관리되는 하위 에이전트입니다.
 * 태스크 위임, 결과 보고 등 부모와의 통신 기능을 제공합니다.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  TaskPayload,
  TaskResult,
  TaskStatus,
  AgentStatus,
  NotificationPriority,
} from '../../types';
import { BaseAgent } from './BaseAgent';

/**
 * 부모 에이전트 참조 인터페이스
 */
export interface ParentAgentRef {
  /** 부모 에이전트 ID */
  id: string;
  /** 부모 에이전트 이름 */
  name: string;
  /** 결과 보고 콜백 */
  onTaskComplete: (result: TaskResult) => Promise<void>;
  /** 진행 상황 보고 콜백 */
  onProgress?: (progress: ProgressReport) => Promise<void>;
  /** 에러 보고 콜백 */
  onError?: (error: Error, context?: Record<string, unknown>) => Promise<void>;
  /** 승인 요청 콜백 */
  requestApprovalFromParent?: (
    title: string,
    description: string,
    data: unknown
  ) => Promise<boolean>;
}

/**
 * 진행 상황 보고
 */
export interface ProgressReport {
  /** 현재 진행률 (0-100) */
  percentage: number;
  /** 현재 단계 */
  currentStep?: string;
  /** 처리된 항목 수 */
  processedCount?: number;
  /** 총 항목 수 */
  totalCount?: number;
  /** 메시지 */
  message?: string;
  /** 추가 데이터 */
  data?: Record<string, unknown>;
}

/**
 * SubAgent 설정 (BaseAgent 설정 확장)
 */
export interface SubAgentConfig extends AgentConfig {
  /** 부모 에이전트 참조 */
  parentRef: ParentAgentRef;
  /** 자동 결과 보고 여부 */
  autoReportResults?: boolean;
  /** 진행 상황 보고 간격 (밀리초) */
  progressReportInterval?: number;
}

/**
 * SubAgent 추상 클래스
 * 부모 에이전트의 하위 작업을 처리하는 에이전트입니다.
 */
export abstract class SubAgent extends BaseAgent {
  /** 부모 에이전트 참조 */
  protected parentRef: ParentAgentRef;

  /** 현재 태스크 */
  protected currentTask: TaskPayload | null = null;

  /** 자동 결과 보고 여부 */
  protected autoReportResults: boolean;

  /** 진행 상황 보고 간격 */
  protected progressReportInterval: number;

  /** 진행 상황 보고 타이머 */
  private progressTimer: NodeJS.Timeout | null = null;

  /**
   * SubAgent 생성자
   * @param config - SubAgent 설정
   */
  constructor(config: SubAgentConfig) {
    super(config);
    this.parentRef = config.parentRef;
    this.autoReportResults = config.autoReportResults ?? true;
    this.progressReportInterval = config.progressReportInterval ?? 30000; // 기본 30초

    this.logger.info(`SubAgent initialized with parent: ${this.parentRef.name}`, {
      parentId: this.parentRef.id,
      autoReportResults: this.autoReportResults,
    });
  }

  // ===========================================================================
  // 태스크 관련 메서드
  // ===========================================================================

  /**
   * 태스크 실행
   * 부모로부터 받은 태스크를 처리합니다.
   * @param task - 태스크 페이로드
   * @returns 태스크 결과
   */
  async executeTask<T = unknown, R = unknown>(task: TaskPayload<T>): Promise<TaskResult<R>> {
    const startTime = Date.now();
    this.currentTask = task;

    this.logger.info(`Starting task: ${task.type}`, {
      taskId: task.taskId,
      priority: task.priority,
    });

    try {
      // 진행 상황 보고 시작
      this.startProgressReporting();

      // 태스크 실행
      const result = await this.execute(task.data as Record<string, unknown>, this.parentRef.id);

      // 태스크 결과 생성
      const taskResult: TaskResult<R> = {
        taskId: task.taskId,
        status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
        data: result.data as R,
        error: result.error,
        completedAt: new Date(),
        executionTime: Date.now() - startTime,
      };

      // 자동 결과 보고
      if (this.autoReportResults) {
        await this.reportResult(taskResult);
      }

      return taskResult;
    } catch (error) {
      const taskResult: TaskResult<R> = {
        taskId: task.taskId,
        status: TaskStatus.FAILED,
        error: {
          code: 'TASK_EXECUTION_ERROR',
          message: (error as Error).message,
          stack: (error as Error).stack,
          recoverable: this.isRecoverableError(error as Error),
        },
        completedAt: new Date(),
        executionTime: Date.now() - startTime,
      };

      // 에러 보고
      await this.reportError(error as Error, { taskId: task.taskId });

      if (this.autoReportResults) {
        await this.reportResult(taskResult);
      }

      return taskResult;
    } finally {
      this.stopProgressReporting();
      this.currentTask = null;
    }
  }

  /**
   * 태스크 생성
   * @param type - 태스크 타입
   * @param data - 태스크 데이터
   * @param priority - 우선순위 (1-10)
   * @param expiresIn - 만료 시간 (밀리초)
   * @returns 태스크 페이로드
   */
  protected createTask<T>(
    type: string,
    data: T,
    priority: number = 5,
    expiresIn?: number
  ): TaskPayload<T> {
    return {
      taskId: uuidv4(),
      type,
      priority,
      data,
      createdAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
      retryCount: 0,
      parentTaskId: this.currentTask?.taskId,
    };
  }

  // ===========================================================================
  // 부모 에이전트 통신 메서드
  // ===========================================================================

  /**
   * 결과 보고
   * 부모 에이전트에게 태스크 결과를 보고합니다.
   * @param result - 태스크 결과
   */
  async reportResult(result: TaskResult): Promise<void> {
    try {
      await this.parentRef.onTaskComplete(result);
      this.logger.info(`Result reported to parent: ${this.parentRef.name}`, {
        taskId: result.taskId,
        status: result.status,
      });
    } catch (error) {
      this.logger.error('Failed to report result to parent', error as Error, {
        taskId: result.taskId,
      });
    }
  }

  /**
   * 진행 상황 보고
   * @param progress - 진행 상황
   */
  async reportProgress(progress: ProgressReport): Promise<void> {
    if (this.parentRef.onProgress) {
      try {
        await this.parentRef.onProgress(progress);
        this.logger.debug('Progress reported', progress);
      } catch (error) {
        this.logger.error('Failed to report progress', error as Error);
      }
    }
  }

  /**
   * 에러 보고
   * @param error - 에러 객체
   * @param context - 추가 컨텍스트
   */
  async reportError(error: Error, context?: Record<string, unknown>): Promise<void> {
    if (this.parentRef.onError) {
      try {
        await this.parentRef.onError(error, context);
        this.logger.info('Error reported to parent');
      } catch (reportError) {
        this.logger.error('Failed to report error to parent', reportError as Error);
      }
    }
  }

  /**
   * 부모 에이전트에게 승인 요청
   * @param title - 제목
   * @param description - 설명
   * @param data - 관련 데이터
   * @returns 승인 여부
   */
  async requestApprovalFromParent(
    title: string,
    description: string,
    data: unknown
  ): Promise<boolean> {
    if (this.parentRef.requestApprovalFromParent) {
      try {
        const approved = await this.parentRef.requestApprovalFromParent(title, description, data);
        this.logger.info(`Parent approval result: ${approved ? 'approved' : 'rejected'}`, {
          title,
        });
        return approved;
      } catch (error) {
        this.logger.error('Failed to request approval from parent', error as Error);
        return false;
      }
    }

    // 부모에게 승인 요청 기능이 없으면 기본 승인 요청 사용
    const response = await this.requestApproval(title, description, data);
    return response.approved;
  }

  // ===========================================================================
  // 진행 상황 보고 관리
  // ===========================================================================

  /**
   * 진행 상황 자동 보고 시작
   */
  private startProgressReporting(): void {
    if (this.parentRef.onProgress && this.progressReportInterval > 0) {
      this.progressTimer = setInterval(async () => {
        const progress = await this.getCurrentProgress();
        if (progress) {
          await this.reportProgress(progress);
        }
      }, this.progressReportInterval);
    }
  }

  /**
   * 진행 상황 자동 보고 중지
   */
  private stopProgressReporting(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  /**
   * 현재 진행 상황 조회
   * 하위 클래스에서 오버라이드하여 구현합니다.
   * @returns 진행 상황
   */
  protected async getCurrentProgress(): Promise<ProgressReport | null> {
    // 기본 구현: 상태 기반 진행률
    const statusProgress: Record<AgentStatus, number> = {
      [AgentStatus.IDLE]: 0,
      [AgentStatus.RUNNING]: 50,
      [AgentStatus.PAUSED]: 50,
      [AgentStatus.ERROR]: 0,
      [AgentStatus.STOPPED]: 100,
    };

    return {
      percentage: statusProgress[this.status],
      currentStep: this.status,
      message: `Agent is ${this.status}`,
    };
  }

  // ===========================================================================
  // 태스크 위임 메서드
  // ===========================================================================

  /**
   * 동료 에이전트에게 태스크 위임
   * AgentRegistry를 통해 다른 에이전트에게 작업을 요청합니다.
   * @param agentId - 대상 에이전트 ID
   * @param task - 태스크 페이로드
   * @returns 태스크 결과
   */
  async delegateTask<T = unknown, R = unknown>(
    agentId: string,
    task: TaskPayload<T>
  ): Promise<TaskResult<R>> {
    this.logger.info(`Delegating task to agent: ${agentId}`, {
      taskId: task.taskId,
      taskType: task.type,
    });

    // AgentRegistry에서 에이전트를 찾아 태스크 실행
    // 실제 구현은 AgentRegistry를 통해 이루어집니다.
    const registry = await import('./AgentRegistry');
    const agent = registry.default.getAgent(agentId);

    if (!agent) {
      return {
        taskId: task.taskId,
        status: TaskStatus.FAILED,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent not found: ${agentId}`,
          recoverable: false,
        },
        executionTime: 0,
      };
    }

    // 에이전트가 SubAgent인 경우 executeTask 호출
    if ('executeTask' in agent) {
      return (agent as SubAgent).executeTask<T, R>(task);
    }

    // 일반 에이전트인 경우 execute 호출
    const result = await agent.execute(task.data as Record<string, unknown>, this.config.id);

    return {
      taskId: task.taskId,
      status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
      data: result.data as R,
      error: result.error,
      completedAt: new Date(),
      executionTime: result.executionTime,
    };
  }

  /**
   * 여러 태스크 병렬 처리
   * @param tasks - 태스크 배열
   * @param concurrency - 동시 실행 수
   * @returns 태스크 결과 배열
   */
  async executeTasksParallel<T = unknown, R = unknown>(
    tasks: TaskPayload<T>[],
    concurrency: number = 3
  ): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = [];

    // 동시성 제한을 위한 청크 분할
    for (let i = 0; i < tasks.length; i += concurrency) {
      const chunk = tasks.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map((task) => this.executeTask<T, R>(task))
      );
      results.push(...chunkResults);

      // 청크 간 짧은 대기
      if (i + concurrency < tasks.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * 태스크 체이닝
   * 순차적으로 태스크를 실행하며, 이전 결과를 다음 태스크에 전달합니다.
   * @param tasks - 태스크 생성 함수 배열
   * @returns 최종 태스크 결과
   */
  async executeTasksSequential<T = unknown, R = unknown>(
    tasks: ((previousResult?: R) => TaskPayload<T>)[]
  ): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = [];
    let previousResult: R | undefined;

    for (const createTask of tasks) {
      const task = createTask(previousResult);
      const result = await this.executeTask<T, R>(task);

      results.push(result);

      if (result.status === TaskStatus.FAILED) {
        this.logger.warn('Task chain stopped due to failure', {
          taskId: task.taskId,
          failedAt: results.length,
        });
        break;
      }

      previousResult = result.data;
    }

    return results;
  }

  // ===========================================================================
  // 유틸리티 메서드
  // ===========================================================================

  /**
   * 부모 에이전트 ID 조회
   * @returns 부모 에이전트 ID
   */
  getParentId(): string {
    return this.parentRef.id;
  }

  /**
   * 부모 에이전트 이름 조회
   * @returns 부모 에이전트 이름
   */
  getParentName(): string {
    return this.parentRef.name;
  }

  /**
   * 현재 태스크 조회
   * @returns 현재 태스크
   */
  getCurrentTask(): TaskPayload | null {
    return this.currentTask;
  }

  /**
   * 태스크 취소
   * 현재 실행 중인 태스크를 취소합니다.
   */
  async cancelCurrentTask(): Promise<void> {
    if (this.currentTask) {
      this.logger.info('Cancelling current task', {
        taskId: this.currentTask.taskId,
      });

      const result: TaskResult = {
        taskId: this.currentTask.taskId,
        status: TaskStatus.CANCELLED,
        completedAt: new Date(),
        executionTime: 0,
      };

      await this.reportResult(result);
      this.stopProgressReporting();
      this.currentTask = null;
      this.setStatus(AgentStatus.IDLE);
    }
  }

  /**
   * 부모 에이전트에게 알림 전달
   * @param title - 제목
   * @param content - 내용
   * @param priority - 우선순위
   */
  async notifyParent(
    title: string,
    content: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<void> {
    // 부모에게 알림 채널을 통해 전달
    await this.sendNotification(
      priority,
      'operations',
      `[${this.config.name}] ${title}`,
      `Parent: ${this.parentRef.name}\n\n${content}`
    );
  }

  /**
   * 정리 로직 확장
   * 부모 참조 정리를 포함합니다.
   */
  protected async cleanupSubAgent(): Promise<void> {
    this.stopProgressReporting();
    this.currentTask = null;
    this.logger.info('SubAgent cleanup completed');
  }
}

export default SubAgent;
