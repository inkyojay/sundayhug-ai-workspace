/**
 * 썬데이허그 AI 에이전트 시스템 - 에러 복구 메커니즘
 *
 * LANE 5: Integration & Orchestration
 * 워크플로우 실행 중 발생하는 에러를 감지하고 복구합니다.
 */

import { EventEmitter } from 'events';
import {
  StepError,
  StepDefinition,
  WorkflowInstance,
  RecoveryAction,
  RecoveryHandler,
  RetryConfig,
  ErrorStrategy,
} from './types';
import { systemLogger } from '../utils/logger';

/**
 * 에러 분류
 */
export enum ErrorCategory {
  /** 일시적 오류 - 재시도로 복구 가능 */
  TRANSIENT = 'transient',
  /** 비즈니스 로직 오류 - 스킵 또는 대체 처리 */
  BUSINESS = 'business',
  /** 시스템 오류 - 에스컬레이션 필요 */
  SYSTEM = 'system',
  /** 타임아웃 - 재시도 또는 스킵 */
  TIMEOUT = 'timeout',
  /** 외부 서비스 오류 - 재시도 또는 폴백 */
  EXTERNAL = 'external',
  /** 알 수 없는 오류 */
  UNKNOWN = 'unknown',
}

/**
 * 에러 패턴 정의
 */
interface ErrorPattern {
  /** 에러 코드 패턴 (정규식) */
  codePattern?: RegExp;
  /** 에러 메시지 패턴 (정규식) */
  messagePattern?: RegExp;
  /** 에러 카테고리 */
  category: ErrorCategory;
  /** 기본 복구 액션 */
  defaultAction: RecoveryAction;
}

/**
 * 복구 통계
 */
interface RecoveryStats {
  /** 총 복구 시도 */
  totalAttempts: number;
  /** 성공 횟수 */
  successful: number;
  /** 실패 횟수 */
  failed: number;
  /** 에스컬레이션 횟수 */
  escalated: number;
  /** 카테고리별 통계 */
  byCategory: Record<ErrorCategory, number>;
}

/**
 * 에러 복구 관리자
 */
export class ErrorRecoveryManager extends EventEmitter {
  private patterns: ErrorPattern[] = [];
  private customHandlers: Map<string, RecoveryHandler> = new Map();
  private stats: RecoveryStats = {
    totalAttempts: 0,
    successful: 0,
    failed: 0,
    escalated: 0,
    byCategory: {
      [ErrorCategory.TRANSIENT]: 0,
      [ErrorCategory.BUSINESS]: 0,
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.TIMEOUT]: 0,
      [ErrorCategory.EXTERNAL]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    },
  };

  constructor() {
    super();
    this.initializeDefaultPatterns();
  }

  /**
   * 기본 에러 패턴 초기화
   */
  private initializeDefaultPatterns(): void {
    this.patterns = [
      // 네트워크/일시적 오류
      {
        codePattern: /ECONNRESET|ETIMEDOUT|ECONNREFUSED|NETWORK_ERROR/,
        category: ErrorCategory.TRANSIENT,
        defaultAction: { type: 'retry', delay: 1000 },
      },
      {
        codePattern: /RATE_LIMIT|429|503/,
        category: ErrorCategory.TRANSIENT,
        defaultAction: { type: 'retry', delay: 5000 },
      },
      // 타임아웃
      {
        codePattern: /TIMEOUT|DEADLINE_EXCEEDED/,
        messagePattern: /timed?\s*out/i,
        category: ErrorCategory.TIMEOUT,
        defaultAction: { type: 'retry', delay: 2000 },
      },
      // 외부 서비스 오류
      {
        codePattern: /EXTERNAL_SERVICE|API_ERROR|502|504/,
        category: ErrorCategory.EXTERNAL,
        defaultAction: { type: 'retry', delay: 3000 },
      },
      // 비즈니스 로직 오류
      {
        codePattern: /VALIDATION_ERROR|BUSINESS_RULE|INVALID_/,
        category: ErrorCategory.BUSINESS,
        defaultAction: { type: 'skip' },
      },
      // 시스템 오류
      {
        codePattern: /INTERNAL_ERROR|FATAL|CRITICAL/,
        category: ErrorCategory.SYSTEM,
        defaultAction: { type: 'escalate' },
      },
    ];
  }

  /**
   * 에러 패턴 추가
   * @param pattern - 에러 패턴
   */
  addPattern(pattern: ErrorPattern): void {
    this.patterns.unshift(pattern); // 우선순위가 높은 패턴을 앞에 추가
  }

  /**
   * 커스텀 복구 핸들러 등록
   * @param stepId - 스텝 ID
   * @param handler - 복구 핸들러
   */
  registerHandler(stepId: string, handler: RecoveryHandler): void {
    this.customHandlers.set(stepId, handler);
  }

  /**
   * 에러 분류
   * @param error - 스텝 에러
   * @returns 에러 카테고리
   */
  classifyError(error: StepError): ErrorCategory {
    for (const pattern of this.patterns) {
      if (pattern.codePattern && pattern.codePattern.test(error.code)) {
        return pattern.category;
      }
      if (pattern.messagePattern && pattern.messagePattern.test(error.message)) {
        return pattern.category;
      }
    }
    return ErrorCategory.UNKNOWN;
  }

  /**
   * 복구 액션 결정
   * @param error - 스텝 에러
   * @param step - 스텝 정의
   * @param instance - 워크플로우 인스턴스
   * @returns 복구 액션
   */
  async determineRecoveryAction(
    error: StepError,
    step: StepDefinition,
    instance: WorkflowInstance
  ): Promise<RecoveryAction> {
    this.stats.totalAttempts++;

    const category = this.classifyError(error);
    this.stats.byCategory[category]++;

    systemLogger.info('Determining recovery action', {
      stepId: step.id,
      errorCode: error.code,
      category,
      retryCount: instance.stepResults.get(step.id)?.retryCount || 0,
    });

    // 커스텀 핸들러 확인
    const customHandler = this.customHandlers.get(step.id);
    if (customHandler) {
      try {
        const action = await customHandler(error, step, instance);
        this.emit('recovery:custom', { step, error, action });
        return action;
      } catch (handlerError) {
        systemLogger.error('Custom recovery handler failed', handlerError as Error);
      }
    }

    // 스텝 재시도 설정 확인
    const stepResult = instance.stepResults.get(step.id);
    const currentRetryCount = stepResult?.retryCount || 0;

    if (step.retryConfig && error.recoverable) {
      if (currentRetryCount < step.retryConfig.maxRetries) {
        const delay = this.calculateRetryDelay(step.retryConfig, currentRetryCount);
        return {
          type: 'retry',
          delay,
          message: `Retrying step (${currentRetryCount + 1}/${step.retryConfig.maxRetries})`,
        };
      }
    }

    // 패턴 기반 기본 액션
    for (const pattern of this.patterns) {
      const matchesCode = pattern.codePattern?.test(error.code);
      const matchesMessage = pattern.messagePattern?.test(error.message);

      if (matchesCode || matchesMessage) {
        // 재시도 액션인 경우 재시도 횟수 확인
        if (pattern.defaultAction.type === 'retry') {
          const maxRetries = step.retryConfig?.maxRetries || 3;
          if (currentRetryCount >= maxRetries) {
            return this.getFallbackAction(step, category);
          }
        }
        return { ...pattern.defaultAction };
      }
    }

    // 기본 폴백
    return this.getFallbackAction(step, category);
  }

  /**
   * 재시도 지연 시간 계산
   * @param config - 재시도 설정
   * @param retryCount - 현재 재시도 횟수
   * @returns 지연 시간 (밀리초)
   */
  private calculateRetryDelay(config: RetryConfig, retryCount: number): number {
    if (config.exponentialBackoff) {
      return config.retryDelay * Math.pow(2, retryCount);
    }
    return config.retryDelay;
  }

  /**
   * 폴백 액션 결정
   * @param step - 스텝 정의
   * @param category - 에러 카테고리
   * @returns 폴백 액션
   */
  private getFallbackAction(step: StepDefinition, category: ErrorCategory): RecoveryAction {
    // 필수 스텝이면 에스컬레이션
    if (step.required) {
      this.stats.escalated++;
      return {
        type: 'escalate',
        message: `Required step failed: ${step.name}`,
      };
    }

    // 비즈니스 에러나 비필수 스텝은 스킵
    if (category === ErrorCategory.BUSINESS || !step.required) {
      return {
        type: 'skip',
        message: `Skipping optional step: ${step.name}`,
      };
    }

    // 그 외 에스컬레이션
    this.stats.escalated++;
    return {
      type: 'escalate',
      message: `Unrecoverable error in step: ${step.name}`,
    };
  }

  /**
   * 복구 액션 실행
   * @param action - 복구 액션
   * @param step - 스텝 정의
   * @param instance - 워크플로우 인스턴스
   */
  async executeRecoveryAction(
    action: RecoveryAction,
    step: StepDefinition,
    instance: WorkflowInstance
  ): Promise<void> {
    systemLogger.info('Executing recovery action', {
      actionType: action.type,
      stepId: step.id,
      instanceId: instance.instanceId,
    });

    switch (action.type) {
      case 'retry':
        if (action.delay) {
          await this.sleep(action.delay);
        }
        this.emit('recovery:retry', { step, action, instance });
        this.stats.successful++;
        break;

      case 'skip':
        this.emit('recovery:skip', { step, action, instance });
        this.stats.successful++;
        break;

      case 'fallback':
        if (action.targetStepId) {
          this.emit('recovery:fallback', {
            step,
            targetStepId: action.targetStepId,
            instance,
          });
          this.stats.successful++;
        } else {
          this.stats.failed++;
        }
        break;

      case 'escalate':
        this.emit('recovery:escalate', { step, action, instance });
        this.stats.escalated++;
        break;

      case 'abort':
        this.emit('recovery:abort', { step, action, instance });
        this.stats.failed++;
        break;

      default:
        this.stats.failed++;
    }
  }

  /**
   * 에러 전략에 따른 액션 결정
   * @param strategy - 에러 전략
   * @param error - 에러
   * @param step - 스텝
   * @returns 복구 액션
   */
  getActionFromStrategy(
    strategy: ErrorStrategy,
    error: StepError,
    step: StepDefinition
  ): RecoveryAction {
    switch (strategy) {
      case 'stop':
        return { type: 'abort', message: error.message };

      case 'skip':
        return { type: 'skip', message: `Skipped due to error: ${error.message}` };

      case 'retry':
        return {
          type: 'retry',
          delay: step.retryConfig?.retryDelay || 1000,
        };

      case 'fallback':
        return {
          type: 'fallback',
          message: `Fallback due to error: ${error.message}`,
        };

      default:
        return { type: 'escalate', message: error.message };
    }
  }

  /**
   * 복구 통계 조회
   * @returns 복구 통계
   */
  getStats(): RecoveryStats {
    return { ...this.stats };
  }

  /**
   * 통계 리셋
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successful: 0,
      failed: 0,
      escalated: 0,
      byCategory: {
        [ErrorCategory.TRANSIENT]: 0,
        [ErrorCategory.BUSINESS]: 0,
        [ErrorCategory.SYSTEM]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.EXTERNAL]: 0,
        [ErrorCategory.UNKNOWN]: 0,
      },
    };
  }

  /**
   * 대기
   * @param ms - 밀리초
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 서킷 브레이커
 * 연속된 실패를 감지하고 일시적으로 요청을 차단합니다.
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private readonly threshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenRequests: number;

  /**
   * CircuitBreaker 생성자
   * @param threshold - 실패 임계값
   * @param resetTimeout - 리셋 타임아웃 (밀리초)
   * @param halfOpenRequests - half-open 상태에서 허용할 요청 수
   */
  constructor(
    threshold: number = 5,
    resetTimeout: number = 30000,
    halfOpenRequests: number = 3
  ) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.halfOpenRequests = halfOpenRequests;
  }

  /**
   * 현재 상태 조회
   * @returns 서킷 브레이커 상태
   */
  getState(): string {
    this.updateState();
    return this.state;
  }

  /**
   * 요청 허용 여부 확인
   * @returns 허용 여부
   */
  canExecute(): boolean {
    this.updateState();

    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        return false;
      case 'half-open':
        return this.successCount < this.halfOpenRequests;
    }
  }

  /**
   * 성공 기록
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.halfOpenRequests) {
        this.state = 'closed';
        this.successCount = 0;
        systemLogger.info('Circuit breaker closed after successful requests');
      }
    }
  }

  /**
   * 실패 기록
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.successCount = 0;
      systemLogger.warn('Circuit breaker opened due to failures', {
        failureCount: this.failureCount,
      });
    }
  }

  /**
   * 상태 업데이트
   */
  private updateState(): void {
    if (this.state === 'open' && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime.getTime();
      if (elapsed >= this.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
        systemLogger.info('Circuit breaker transitioning to half-open');
      }
    }
  }

  /**
   * 서킷 브레이커 리셋
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}

// 싱글톤 인스턴스 export
export const errorRecoveryManager = new ErrorRecoveryManager();
export default ErrorRecoveryManager;
