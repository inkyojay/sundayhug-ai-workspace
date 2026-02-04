/**
 * 썬데이허그 AI 에이전트 시스템 - 재시도 정책
 *
 * LANE 5: Integration & Orchestration
 * 작업 실패 시 재시도 로직을 관리합니다.
 */

import { RetryPolicyConfig, JobError } from './types';
import { systemLogger } from '../utils/logger';

/**
 * 기본 재시도 정책 설정
 */
export const defaultRetryPolicy: RetryPolicyConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 60000,
  exponentialBackoff: true,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'RATE_LIMIT',
    'SERVICE_UNAVAILABLE',
    '503',
    '429',
    'TIMEOUT',
  ],
  nonRetryableErrors: [
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
    'NOT_FOUND',
    '400',
    '401',
    '403',
    '404',
  ],
};

/**
 * 재시도 정책 클래스
 */
export class RetryPolicy {
  private config: RetryPolicyConfig;

  /**
   * RetryPolicy 생성자
   * @param config - 재시도 정책 설정
   */
  constructor(config?: Partial<RetryPolicyConfig>) {
    this.config = { ...defaultRetryPolicy, ...config };
  }

  /**
   * 재시도 가능 여부 확인
   * @param error - 에러 정보
   * @param retryCount - 현재 재시도 횟수
   * @returns 재시도 가능 여부
   */
  shouldRetry(error: JobError, retryCount: number): boolean {
    // 최대 재시도 횟수 초과
    if (retryCount >= this.config.maxRetries) {
      systemLogger.debug('Max retries exceeded', {
        retryCount,
        maxRetries: this.config.maxRetries,
      });
      return false;
    }

    // 에러가 복구 불가능하면 재시도 안 함
    if (!error.recoverable) {
      return false;
    }

    // 재시도 불가능한 에러 확인
    if (this.isNonRetryableError(error.code)) {
      return false;
    }

    // 재시도 가능한 에러 확인
    if (this.config.retryableErrors && this.config.retryableErrors.length > 0) {
      return this.isRetryableError(error.code);
    }

    // 기본적으로 recoverable이면 재시도
    return error.recoverable;
  }

  /**
   * 재시도 가능한 에러인지 확인
   * @param errorCode - 에러 코드
   * @returns 재시도 가능 여부
   */
  private isRetryableError(errorCode: string): boolean {
    if (!this.config.retryableErrors) return true;

    return this.config.retryableErrors.some(
      (pattern) => errorCode.includes(pattern) || pattern.includes(errorCode)
    );
  }

  /**
   * 재시도 불가능한 에러인지 확인
   * @param errorCode - 에러 코드
   * @returns 재시도 불가능 여부
   */
  private isNonRetryableError(errorCode: string): boolean {
    if (!this.config.nonRetryableErrors) return false;

    return this.config.nonRetryableErrors.some(
      (pattern) => errorCode.includes(pattern) || pattern.includes(errorCode)
    );
  }

  /**
   * 재시도 지연 시간 계산
   * @param retryCount - 현재 재시도 횟수
   * @returns 지연 시간 (밀리초)
   */
  getDelay(retryCount: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.initialDelay;
    }

    // 지수 백오프 계산
    const delay =
      this.config.initialDelay *
      Math.pow(this.config.backoffMultiplier, retryCount);

    // 지터(Jitter) 추가 (최대 ±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5) * 2;
    const delayWithJitter = delay + jitter;

    // 최대 지연 시간 제한
    return Math.min(delayWithJitter, this.config.maxDelay);
  }

  /**
   * 재시도 실행
   * @param operation - 실행할 작업
   * @param retryCount - 초기 재시도 횟수
   * @returns 작업 결과
   */
  async execute<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const jobError: JobError = {
        code: (error as Error).name || 'UNKNOWN_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        recoverable: this.isErrorRecoverable(error as Error),
      };

      if (this.shouldRetry(jobError, retryCount)) {
        const delay = this.getDelay(retryCount);

        systemLogger.info('Retrying operation', {
          retryCount: retryCount + 1,
          maxRetries: this.config.maxRetries,
          delay,
        });

        await this.sleep(delay);
        return this.execute(operation, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * 에러가 복구 가능한지 확인
   * @param error - 에러 객체
   * @returns 복구 가능 여부
   */
  private isErrorRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    const recoverablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      '503',
      '429',
      'temporarily',
      'retry',
    ];

    return recoverablePatterns.some(
      (pattern) => message.includes(pattern) || name.includes(pattern)
    );
  }

  /**
   * 대기
   * @param ms - 밀리초
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 설정 조회
   * @returns 재시도 정책 설정
   */
  getConfig(): RetryPolicyConfig {
    return { ...this.config };
  }

  /**
   * 설정 업데이트
   * @param updates - 업데이트할 설정
   */
  updateConfig(updates: Partial<RetryPolicyConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * 지수 백오프 재시도 정책 생성
 */
export function createExponentialBackoff(
  maxRetries: number = 5,
  initialDelay: number = 1000
): RetryPolicy {
  return new RetryPolicy({
    maxRetries,
    initialDelay,
    exponentialBackoff: true,
    backoffMultiplier: 2,
  });
}

/**
 * 선형 재시도 정책 생성
 */
export function createLinearRetry(
  maxRetries: number = 3,
  delay: number = 2000
): RetryPolicy {
  return new RetryPolicy({
    maxRetries,
    initialDelay: delay,
    exponentialBackoff: false,
  });
}

/**
 * 즉시 재시도 정책 생성 (지연 없음)
 */
export function createImmediateRetry(maxRetries: number = 3): RetryPolicy {
  return new RetryPolicy({
    maxRetries,
    initialDelay: 0,
    exponentialBackoff: false,
  });
}

export default RetryPolicy;
