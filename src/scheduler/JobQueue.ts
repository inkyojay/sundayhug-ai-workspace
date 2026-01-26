/**
 * 썬데이허그 AI 에이전트 시스템 - 작업 큐
 *
 * LANE 5: Integration & Orchestration
 * 우선순위 기반 작업 큐를 관리합니다.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  QueueConfig,
  QueueItem,
  JobPriority,
  JobStatus,
  JobError,
} from './types';
import { RetryPolicy, defaultRetryPolicy } from './RetryPolicy';
import { systemLogger } from '../utils/logger';

/**
 * 기본 큐 설정
 */
const defaultQueueConfig: QueueConfig = {
  name: 'default',
  concurrency: 5,
  maxSize: 1000,
  priorityBased: true,
  defaultTimeout: 300000, // 5분
  retryPolicy: defaultRetryPolicy,
};

/**
 * 작업 처리 함수 타입
 */
type JobProcessor<T, R> = (payload: T) => Promise<R>;

/**
 * 작업 큐 클래스
 */
export class JobQueue<T = unknown, R = unknown> extends EventEmitter {
  private config: QueueConfig;
  private queue: QueueItem<T>[] = [];
  private processing: Map<string, QueueItem<T>> = new Map();
  private retryPolicy: RetryPolicy;
  private processor?: JobProcessor<T, R>;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  /**
   * JobQueue 생성자
   * @param config - 큐 설정
   */
  constructor(config?: Partial<QueueConfig>) {
    super();
    this.config = { ...defaultQueueConfig, ...config };
    this.retryPolicy = new RetryPolicy(this.config.retryPolicy);

    systemLogger.info('JobQueue initialized', {
      name: this.config.name,
      concurrency: this.config.concurrency,
      maxSize: this.config.maxSize,
    });
  }

  /**
   * 작업 처리기 설정
   * @param processor - 작업 처리 함수
   */
  setProcessor(processor: JobProcessor<T, R>): void {
    this.processor = processor;
  }

  /**
   * 큐에 작업 추가
   * @param payload - 작업 페이로드
   * @param priority - 우선순위
   * @param options - 추가 옵션
   * @returns 큐 항목 ID
   */
  enqueue(
    payload: T,
    priority: JobPriority = JobPriority.NORMAL,
    options?: {
      expiresIn?: number;
      metadata?: Record<string, unknown>;
    }
  ): string {
    if (this.queue.length >= this.config.maxSize) {
      throw new Error(`Queue is full: ${this.config.name}`);
    }

    const item: QueueItem<T> = {
      id: uuidv4(),
      payload,
      priority,
      createdAt: new Date(),
      expiresAt: options?.expiresIn
        ? new Date(Date.now() + options.expiresIn)
        : undefined,
      retryCount: 0,
      metadata: options?.metadata,
    };

    // 우선순위 기반 삽입
    if (this.config.priorityBased) {
      this.insertByPriority(item);
    } else {
      this.queue.push(item);
    }

    this.emit('enqueued', item);
    systemLogger.debug('Job enqueued', {
      id: item.id,
      priority,
      queueSize: this.queue.length,
    });

    // 자동 처리 시작
    if (this.isRunning && !this.isPaused) {
      this.processNext();
    }

    return item.id;
  }

  /**
   * 우선순위에 따라 삽입
   */
  private insertByPriority(item: QueueItem<T>): void {
    let inserted = false;

    for (let i = 0; i < this.queue.length; i++) {
      if (item.priority < this.queue[i].priority) {
        this.queue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(item);
    }
  }

  /**
   * 큐에서 작업 제거 (취소)
   * @param itemId - 항목 ID
   * @returns 제거 성공 여부
   */
  dequeue(itemId: string): boolean {
    const index = this.queue.findIndex((item) => item.id === itemId);
    if (index !== -1) {
      const [removed] = this.queue.splice(index, 1);
      this.emit('dequeued', removed);
      return true;
    }
    return false;
  }

  /**
   * 큐 시작
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.emit('started');
    systemLogger.info('JobQueue started', { name: this.config.name });

    // 대기 중인 작업 처리 시작
    this.processQueue();
  }

  /**
   * 큐 정지
   */
  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
    systemLogger.info('JobQueue stopped', { name: this.config.name });
  }

  /**
   * 큐 일시 정지
   */
  pause(): void {
    this.isPaused = true;
    this.emit('paused');
    systemLogger.info('JobQueue paused', { name: this.config.name });
  }

  /**
   * 큐 재개
   */
  resume(): void {
    this.isPaused = false;
    this.emit('resumed');
    systemLogger.info('JobQueue resumed', { name: this.config.name });
    this.processQueue();
  }

  /**
   * 큐 처리
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning && !this.isPaused) {
      if (this.processing.size >= this.config.concurrency) {
        // 동시 처리 수 제한
        await this.sleep(100);
        continue;
      }

      if (this.queue.length === 0) {
        // 큐가 비어있으면 대기
        await this.sleep(100);
        continue;
      }

      this.processNext();
    }
  }

  /**
   * 다음 작업 처리
   */
  private async processNext(): Promise<void> {
    if (!this.processor) {
      systemLogger.warn('No processor set for queue', { name: this.config.name });
      return;
    }

    // 만료된 항목 제거
    this.removeExpired();

    if (this.queue.length === 0) return;
    if (this.processing.size >= this.config.concurrency) return;

    const item = this.queue.shift()!;
    this.processing.set(item.id, item);

    this.emit('processing', item);
    systemLogger.debug('Processing job', { id: item.id });

    const startTime = Date.now();

    try {
      // 타임아웃 적용
      const result = await this.executeWithTimeout(
        () => this.processor!(item.payload),
        this.config.defaultTimeout
      );

      this.processing.delete(item.id);

      this.emit('completed', {
        item,
        result,
        executionTime: Date.now() - startTime,
      });

      systemLogger.debug('Job completed', {
        id: item.id,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      this.processing.delete(item.id);

      const jobError: JobError = {
        code: (error as Error).name || 'PROCESSING_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        recoverable: this.isRecoverableError(error as Error),
      };

      // 재시도 확인
      if (this.retryPolicy.shouldRetry(jobError, item.retryCount)) {
        item.retryCount++;
        item.lastAttemptAt = new Date();

        const delay = this.retryPolicy.getDelay(item.retryCount);

        this.emit('retrying', { item, error: jobError, delay });
        systemLogger.info('Retrying job', {
          id: item.id,
          retryCount: item.retryCount,
          delay,
        });

        // 지연 후 재큐잉
        setTimeout(() => {
          if (this.config.priorityBased) {
            this.insertByPriority(item);
          } else {
            this.queue.push(item);
          }
        }, delay);
      } else {
        this.emit('failed', { item, error: jobError });
        systemLogger.error('Job failed', error as Error, {
          id: item.id,
          retryCount: item.retryCount,
        });
      }
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
        reject(new Error(`Job timed out after ${timeout}ms`));
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
   * 만료된 항목 제거
   */
  private removeExpired(): void {
    const now = new Date();
    const expired = this.queue.filter(
      (item) => item.expiresAt && item.expiresAt < now
    );

    for (const item of expired) {
      this.dequeue(item.id);
      this.emit('expired', item);
    }
  }

  /**
   * 복구 가능한 에러 확인
   */
  private isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const recoverablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      '503',
      '429',
    ];
    return recoverablePatterns.some((pattern) => message.includes(pattern));
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 큐 크기 조회
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 처리 중인 작업 수 조회
   */
  processingCount(): number {
    return this.processing.size;
  }

  /**
   * 큐가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 큐가 가득 찼는지 확인
   */
  isFull(): boolean {
    return this.queue.length >= this.config.maxSize;
  }

  /**
   * 항목 조회
   */
  getItem(itemId: string): QueueItem<T> | undefined {
    return this.queue.find((item) => item.id === itemId);
  }

  /**
   * 처리 중인 항목 조회
   */
  getProcessingItem(itemId: string): QueueItem<T> | undefined {
    return this.processing.get(itemId);
  }

  /**
   * 큐 상태 조회
   */
  getStatus(): {
    name: string;
    size: number;
    processing: number;
    isRunning: boolean;
    isPaused: boolean;
  } {
    return {
      name: this.config.name,
      size: this.queue.length,
      processing: this.processing.size,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
    };
  }

  /**
   * 큐 비우기
   */
  clear(): void {
    this.queue = [];
    this.emit('cleared');
    systemLogger.info('Queue cleared', { name: this.config.name });
  }

  /**
   * 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 우선순위 큐 생성
 */
export function createPriorityQueue<T, R>(
  name: string,
  concurrency: number = 5
): JobQueue<T, R> {
  return new JobQueue<T, R>({
    name,
    concurrency,
    priorityBased: true,
  });
}

/**
 * FIFO 큐 생성
 */
export function createFifoQueue<T, R>(
  name: string,
  concurrency: number = 5
): JobQueue<T, R> {
  return new JobQueue<T, R>({
    name,
    concurrency,
    priorityBased: false,
  });
}

export default JobQueue;
