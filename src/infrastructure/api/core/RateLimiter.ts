/**
 * Rate Limiter
 * Token Bucket 알고리즘 기반 레이트 리미터
 */

import { RateLimiterConfig } from './types';

export interface RateLimiterStatus {
  /** 남은 토큰 수 */
  remaining: number;
  /** 리셋까지 남은 시간 (밀리초) */
  resetMs: number;
  /** 최대 요청 수 */
  limit: number;
}

/**
 * Rate Limiter 에러
 */
export class RateLimitError extends Error {
  public readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Token Bucket 기반 Rate Limiter
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private readonly maxWaitMs: number;
  private lastRefillTime: number;
  private pendingRequests: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(config: RateLimiterConfig) {
    if (config.maxRequests <= 0) {
      throw new Error('maxRequests must be greater than 0');
    }
    if (config.windowMs <= 0) {
      throw new Error('windowMs must be greater than 0');
    }

    this.maxTokens = config.maxRequests;
    this.tokens = config.maxRequests;
    this.windowMs = config.windowMs;
    this.maxWaitMs = config.maxWaitMs ?? 0;
    this.lastRefillTime = Date.now();
  }

  /**
   * 토큰 획득 시도 (논블로킹)
   * @returns 토큰 획득 성공 여부
   */
  async tryAcquire(): Promise<boolean> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * 토큰 획득 (블로킹, 대기)
   * @throws RateLimitError maxWaitMs 초과 시
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // 대기 시간 초과
    if (this.maxWaitMs === 0) {
      throw new RateLimitError(
        'Rate limit exceeded',
        this.getTimeUntilRefill()
      );
    }

    // 토큰 대기
    return new Promise<void>((resolve, reject) => {
      const timeUntilRefill = this.getTimeUntilRefill();

      if (timeUntilRefill > this.maxWaitMs) {
        reject(new RateLimitError(
          'Rate limit exceeded',
          timeUntilRefill
        ));
        return;
      }

      const timeoutId = setTimeout(() => {
        const index = this.pendingRequests.findIndex(
          (req) => req.timeoutId === timeoutId
        );
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
        }
        reject(new RateLimitError(
          'Rate limit exceeded',
          this.getTimeUntilRefill()
        ));
      }, this.maxWaitMs);

      this.pendingRequests.push({ resolve, reject, timeoutId });

      // 다음 리필 시점에 대기 중인 요청 처리
      setTimeout(() => {
        this.processPendingRequests();
      }, timeUntilRefill);
    });
  }

  /**
   * 현재 상태 조회
   */
  getStatus(): RateLimiterStatus {
    this.refill();
    return {
      remaining: Math.floor(this.tokens),
      resetMs: this.getTimeUntilRefill(),
      limit: this.maxTokens,
    };
  }

  /**
   * 토큰 리셋
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();

    // 대기 중인 요청 모두 처리
    while (this.pendingRequests.length > 0 && this.tokens >= 1) {
      const request = this.pendingRequests.shift();
      if (request) {
        clearTimeout(request.timeoutId);
        this.tokens -= 1;
        request.resolve();
      }
    }
  }

  /**
   * 토큰 리필
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed >= this.windowMs) {
      // 전체 윈도우가 지났으면 완전 리필
      const windows = Math.floor(elapsed / this.windowMs);
      this.tokens = Math.min(this.maxTokens, this.tokens + this.maxTokens * windows);
      this.lastRefillTime = this.lastRefillTime + windows * this.windowMs;
    }
  }

  /**
   * 다음 리필까지 남은 시간
   */
  private getTimeUntilRefill(): number {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    return Math.max(0, this.windowMs - elapsed);
  }

  /**
   * 대기 중인 요청 처리
   */
  private processPendingRequests(): void {
    this.refill();

    while (this.pendingRequests.length > 0 && this.tokens >= 1) {
      const request = this.pendingRequests.shift();
      if (request) {
        clearTimeout(request.timeoutId);
        this.tokens -= 1;
        request.resolve();
      }
    }
  }
}

export default RateLimiter;
