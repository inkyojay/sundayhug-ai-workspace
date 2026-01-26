/**
 * 썬데이허그 AI 에이전트 시스템 - BaseAgent 추상 클래스
 *
 * 모든 에이전트의 기반이 되는 추상 클래스입니다.
 * 공통 기능(로깅, 에러 핸들링, 승인 요청, 알림)을 제공합니다.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentError,
  AgentStatus,
  ApprovalLevel,
  ApprovalRequest,
  ApprovalResponse,
  TaskPayload,
  TaskResult,
  TaskStatus,
  NotificationPriority,
} from '../../types';
import { Logger, createLogger } from '../../utils/logger';
import { DatabaseHelper, createDatabaseHelper, getSupabaseClient } from '../../utils/supabase';
import { NotificationService, getNotificationService } from '../../utils/notification';

/**
 * 에이전트 이벤트 타입
 */
export type AgentEventType =
  | 'started'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'resumed'
  | 'approval_requested'
  | 'approval_received';

/**
 * 에이전트 이벤트 리스너
 */
export type AgentEventListener = (
  event: AgentEventType,
  data: Record<string, unknown>
) => void | Promise<void>;

/**
 * BaseAgent 추상 클래스
 * 모든 에이전트가 상속받아야 하는 기본 클래스입니다.
 */
export abstract class BaseAgent {
  /** 에이전트 설정 */
  protected config: AgentConfig;

  /** 현재 상태 */
  protected status: AgentStatus = AgentStatus.IDLE;

  /** 로거 인스턴스 */
  protected logger: Logger;

  /** 알림 서비스 */
  protected notificationService: NotificationService;

  /** 현재 실행 컨텍스트 */
  protected currentContext: AgentContext | null = null;

  /** 이벤트 리스너 */
  private eventListeners: Map<AgentEventType, AgentEventListener[]> = new Map();

  /** 재시도 카운터 */
  private retryCount: number = 0;

  /**
   * BaseAgent 생성자
   * @param config - 에이전트 설정
   */
  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = createLogger(config.id);
    this.notificationService = getNotificationService();

    this.logger.info(`Agent initialized: ${config.name}`, {
      id: config.id,
      approvalLevel: config.approvalLevel,
    });
  }

  // ===========================================================================
  // 추상 메서드 (하위 클래스에서 구현 필수)
  // ===========================================================================

  /**
   * 에이전트의 실제 작업 로직
   * 하위 클래스에서 반드시 구현해야 합니다.
   * @param context - 실행 컨텍스트
   * @returns 실행 결과
   */
  protected abstract run(context: AgentContext): Promise<AgentResult>;

  /**
   * 에이전트 초기화 로직
   * 필요한 리소스를 준비합니다.
   */
  protected abstract initialize(): Promise<void>;

  /**
   * 에이전트 정리 로직
   * 사용한 리소스를 정리합니다.
   */
  protected abstract cleanup(): Promise<void>;

  // ===========================================================================
  // 공통 메서드
  // ===========================================================================

  /**
   * 에이전트 실행
   * 전체 실행 흐름을 관리합니다.
   * @param data - 실행에 필요한 데이터
   * @param callerAgentId - 호출한 에이전트 ID (선택)
   * @returns 실행 결과
   */
  async execute(
    data?: Record<string, unknown>,
    callerAgentId?: string
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const executionId = uuidv4();

    // 실행 컨텍스트 생성
    const context: AgentContext = {
      executionId,
      startedAt: new Date(),
      callerAgentId,
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      data,
    };

    this.currentContext = context;
    this.logger.setExecutionId(executionId);

    try {
      // 상태 확인
      if (!this.config.enabled) {
        return this.createErrorResult(
          'AGENT_DISABLED',
          `Agent ${this.config.id} is disabled`,
          startTime,
          false
        );
      }

      // 상태 변경: 실행 중
      this.setStatus(AgentStatus.RUNNING);
      await this.emitEvent('started', { context });

      // 초기화
      this.logger.info('Initializing agent...');
      await this.initialize();

      // 실제 작업 실행 (타임아웃 적용)
      this.logger.info('Running agent...');
      const result = await this.executeWithTimeout(
        () => this.run(context),
        this.config.timeout
      );

      // 성공 처리
      if (result.success) {
        this.setStatus(AgentStatus.IDLE);
        await this.emitEvent('completed', { context, result });
        this.logger.info('Agent completed successfully', {
          executionTime: result.executionTime,
          processedCount: result.processedCount,
        });
      } else {
        // 실패 처리
        await this.handleExecutionError(result.error!, context, startTime);
      }

      // 정리
      await this.cleanup();
      this.retryCount = 0;

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      // 예외 발생 시 에러 핸들링
      return await this.handleError(error as Error, context, startTime);
    } finally {
      this.currentContext = null;
      this.logger.clearExecutionId();
    }
  }

  /**
   * 타임아웃이 적용된 실행
   * @param fn - 실행할 함수
   * @param timeoutMs - 타임아웃 (밀리초)
   * @returns 실행 결과
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 에러 핸들링
   * @param error - 발생한 에러
   * @param context - 실행 컨텍스트
   * @param startTime - 시작 시간
   * @returns 에러 결과
   */
  async handleError(
    error: Error,
    context: AgentContext,
    startTime: number
  ): Promise<AgentResult> {
    const agentError: AgentError = {
      code: 'EXECUTION_ERROR',
      message: error.message,
      stack: error.stack,
      recoverable: this.isRecoverableError(error),
    };

    this.logger.error('Agent execution error', error, {
      executionId: context.executionId,
      retryCount: this.retryCount,
    });

    // 재시도 가능한 에러인 경우
    if (agentError.recoverable && this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      this.logger.info(`Retrying... (${this.retryCount}/${this.config.maxRetries})`);

      // 재시도 대기
      await this.sleep(this.config.retryDelay * this.retryCount);

      // 재시도
      return this.execute(context.data, context.callerAgentId);
    }

    // 재시도 불가 또는 최대 재시도 횟수 초과
    this.setStatus(AgentStatus.ERROR);
    await this.emitEvent('failed', { context, error: agentError });

    // 알림 발송
    await this.notificationService.notifyAgentError(this.config.id, error, {
      executionId: context.executionId,
      retryCount: this.retryCount,
    });

    // 정리 시도
    try {
      await this.cleanup();
    } catch (cleanupError) {
      this.logger.error('Cleanup failed', cleanupError as Error);
    }

    return this.createErrorResult(
      agentError.code,
      agentError.message,
      startTime,
      agentError.recoverable
    );
  }

  /**
   * 실행 실패 처리
   * @param error - 에러 정보
   * @param context - 실행 컨텍스트
   * @param startTime - 시작 시간
   */
  private async handleExecutionError(
    error: AgentError,
    context: AgentContext,
    startTime: number
  ): Promise<void> {
    this.setStatus(AgentStatus.ERROR);
    await this.emitEvent('failed', { context, error });

    this.logger.error('Agent execution failed', new Error(error.message), {
      code: error.code,
      recoverable: error.recoverable,
    });
  }

  /**
   * 복구 가능한 에러인지 판단
   * @param error - 에러 객체
   * @returns 복구 가능 여부
   */
  protected isRecoverableError(error: Error): boolean {
    const recoverablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'RATE_LIMIT',
      'SERVICE_UNAVAILABLE',
      '503',
      '429',
    ];

    return recoverablePatterns.some(
      (pattern) =>
        error.message.includes(pattern) || error.name.includes(pattern)
    );
  }

  /**
   * 에러 결과 생성
   * @param code - 에러 코드
   * @param message - 에러 메시지
   * @param startTime - 시작 시간
   * @param recoverable - 복구 가능 여부
   * @returns 에러 결과
   */
  protected createErrorResult(
    code: string,
    message: string,
    startTime: number,
    recoverable: boolean
  ): AgentResult {
    return {
      success: false,
      error: {
        code,
        message,
        recoverable,
      },
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 성공 결과 생성
   * @param data - 결과 데이터
   * @param startTime - 시작 시간
   * @param counts - 처리 건수
   * @returns 성공 결과
   */
  protected createSuccessResult<T>(
    data: T,
    startTime: number,
    counts?: { processed?: number; failed?: number }
  ): AgentResult<T> {
    return {
      success: true,
      data,
      executionTime: Date.now() - startTime,
      processedCount: counts?.processed,
      failedCount: counts?.failed,
    };
  }

  // ===========================================================================
  // 승인 관련 메서드
  // ===========================================================================

  /**
   * 승인 요청
   * 작업의 중요도에 따라 승인을 요청합니다.
   * @param title - 승인 요청 제목
   * @param description - 설명
   * @param data - 관련 데이터
   * @param impact - 예상 영향
   * @returns 승인 응답
   */
  async requestApproval(
    title: string,
    description: string,
    data: unknown,
    impact?: ApprovalRequest['impact']
  ): Promise<ApprovalResponse> {
    const approvalRequest: ApprovalRequest = {
      id: uuidv4(),
      requesterId: this.config.id,
      level: this.config.approvalLevel,
      title,
      description,
      data,
      impact,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후 만료
      status: 'pending',
    };

    this.logger.info('Approval requested', {
      approvalId: approvalRequest.id,
      level: approvalRequest.level,
      title,
    });

    // 승인 요청 저장
    const db = this.getDatabase('approval_requests');
    await db.create(approvalRequest);

    // 승인 알림 발송
    const approvalLink = `${process.env.DASHBOARD_URL}/approvals/${approvalRequest.id}`;
    await this.notificationService.notifyApprovalRequest(
      approvalRequest.id,
      title,
      description,
      approvalLink
    );

    await this.emitEvent('approval_requested', { request: approvalRequest });

    // 승인 대기
    return this.waitForApproval(approvalRequest);
  }

  /**
   * 승인 대기
   * @param request - 승인 요청
   * @returns 승인 응답
   */
  private async waitForApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    const db = this.getDatabase('approval_requests');
    const pollInterval = 30000; // 30초
    const maxWaitTime = request.expiresAt.getTime() - Date.now();
    const maxPolls = Math.ceil(maxWaitTime / pollInterval);

    this.setStatus(AgentStatus.PAUSED);

    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(pollInterval);

      const result = await db.findById<ApprovalRequest>(request.id);
      if (result.error || !result.data) {
        continue;
      }

      const updatedRequest = result.data;

      if (updatedRequest.status === 'approved' || updatedRequest.status === 'rejected') {
        const response: ApprovalResponse = {
          requestId: request.id,
          approved: updatedRequest.status === 'approved',
          approverId: updatedRequest.approverId || 'unknown',
          reason: updatedRequest.reason,
          respondedAt: updatedRequest.resolvedAt || new Date(),
        };

        await this.emitEvent('approval_received', { response });
        this.setStatus(AgentStatus.RUNNING);

        return response;
      }

      if (updatedRequest.status === 'expired') {
        break;
      }
    }

    // 만료
    const expiredResponse: ApprovalResponse = {
      requestId: request.id,
      approved: false,
      approverId: 'system',
      reason: 'Approval request expired',
      respondedAt: new Date(),
    };

    this.setStatus(AgentStatus.RUNNING);
    return expiredResponse;
  }

  /**
   * 승인이 필요한지 확인
   * @param level - 필요한 승인 레벨
   * @returns 승인 필요 여부
   */
  protected needsApproval(level: ApprovalLevel = this.config.approvalLevel): boolean {
    return level !== ApprovalLevel.NONE && level !== ApprovalLevel.LOW;
  }

  // ===========================================================================
  // 알림 관련 메서드
  // ===========================================================================

  /**
   * 알림 발송
   * @param priority - 우선순위
   * @param recipientGroup - 수신자 그룹
   * @param title - 제목
   * @param content - 내용
   * @param link - 링크 (선택)
   */
  async sendNotification(
    priority: NotificationPriority,
    recipientGroup: string,
    title: string,
    content: string,
    link?: string
  ): Promise<void> {
    await this.notificationService.sendByPriority({
      priority,
      recipientGroup,
      title: `[${this.config.name}] ${title}`,
      content,
      link,
    });
  }

  // ===========================================================================
  // 데이터베이스 헬퍼
  // ===========================================================================

  /**
   * 데이터베이스 헬퍼 가져오기
   * @param tableName - 테이블 이름
   * @param useAdmin - Admin 권한 사용 여부
   * @returns DatabaseHelper 인스턴스
   */
  protected getDatabase(tableName: string, useAdmin: boolean = false): DatabaseHelper {
    return createDatabaseHelper(tableName, useAdmin);
  }

  /**
   * Supabase 클라이언트 가져오기
   * 복잡한 쿼리가 필요한 경우 직접 클라이언트 사용
   * @returns Supabase 클라이언트
   */
  protected getSupabase() {
    return getSupabaseClient();
  }

  // ===========================================================================
  // 이벤트 관련 메서드
  // ===========================================================================

  /**
   * 이벤트 리스너 등록
   * @param event - 이벤트 타입
   * @param listener - 리스너 함수
   */
  on(event: AgentEventType, listener: AgentEventListener): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * 이벤트 리스너 제거
   * @param event - 이벤트 타입
   * @param listener - 리스너 함수
   */
  off(event: AgentEventType, listener: AgentEventListener): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  /**
   * 이벤트 발생
   * @param event - 이벤트 타입
   * @param data - 이벤트 데이터
   */
  protected async emitEvent(
    event: AgentEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    const listeners = this.eventListeners.get(event) || [];

    for (const listener of listeners) {
      try {
        await listener(event, data);
      } catch (error) {
        this.logger.error(`Event listener error for ${event}`, error as Error);
      }
    }
  }

  // ===========================================================================
  // 상태 관리 메서드
  // ===========================================================================

  /**
   * 상태 설정
   * @param status - 새 상태
   */
  protected setStatus(status: AgentStatus): void {
    const previousStatus = this.status;
    this.status = status;
    this.logger.debug(`Status changed: ${previousStatus} -> ${status}`);
  }

  /**
   * 현재 상태 조회
   * @returns 현재 상태
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * 에이전트 설정 조회
   * @returns 에이전트 설정
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * 에이전트 ID 조회
   * @returns 에이전트 ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * 에이전트 이름 조회
   * @returns 에이전트 이름
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 에이전트 활성화
   */
  enable(): void {
    this.config.enabled = true;
    this.logger.info('Agent enabled');
  }

  /**
   * 에이전트 비활성화
   */
  disable(): void {
    this.config.enabled = false;
    this.logger.info('Agent disabled');
  }

  /**
   * 에이전트 일시 정지
   */
  pause(): void {
    if (this.status === AgentStatus.RUNNING) {
      this.setStatus(AgentStatus.PAUSED);
      this.emitEvent('paused', {});
    }
  }

  /**
   * 에이전트 재개
   */
  resume(): void {
    if (this.status === AgentStatus.PAUSED) {
      this.setStatus(AgentStatus.RUNNING);
      this.emitEvent('resumed', {});
    }
  }

  /**
   * 에이전트 정지
   */
  async stop(): Promise<void> {
    this.setStatus(AgentStatus.STOPPED);
    await this.cleanup();
    this.logger.info('Agent stopped');
  }

  // ===========================================================================
  // 유틸리티 메서드
  // ===========================================================================

  /**
   * 대기 (Sleep)
   * @param ms - 대기 시간 (밀리초)
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 배치 처리
   * 대량의 아이템을 배치로 나누어 처리합니다.
   * @param items - 처리할 아이템 배열
   * @param batchSize - 배치 크기
   * @param processor - 배치 처리 함수
   * @returns 처리 결과
   */
  protected async processBatch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<{ results: R[]; errors: Error[] }> {
    const results: R[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);

        this.logger.debug(`Batch processed: ${i + batch.length}/${items.length}`);
      } catch (error) {
        errors.push(error as Error);
        this.logger.error(`Batch processing error at index ${i}`, error as Error);
      }

      // 배치 간 짧은 대기 (API 레이트 리밋 방지)
      if (i + batchSize < items.length) {
        await this.sleep(100);
      }
    }

    return { results, errors };
  }

  /**
   * 재시도가 포함된 작업 실행
   * @param operation - 실행할 작업
   * @param maxRetries - 최대 재시도 횟수
   * @param delay - 재시도 간격 (밀리초)
   * @returns 작업 결과
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries,
    delay: number = this.config.retryDelay
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
            error: lastError.message,
          });
          await this.sleep(delay * (attempt + 1)); // 지수 백오프
        }
      }
    }

    throw lastError;
  }
}

export default BaseAgent;
