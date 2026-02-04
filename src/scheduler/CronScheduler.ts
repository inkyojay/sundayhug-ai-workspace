/**
 * 썬데이허그 AI 에이전트 시스템 - 크론 스케줄러
 *
 * LANE 5: Integration & Orchestration
 * 크론 표현식 기반 작업 스케줄링을 관리합니다.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  JobDefinition,
  JobInstance,
  JobStatus,
  JobPriority,
  JobResult,
  JobError,
  ScheduleInfo,
  SchedulerStats,
  SchedulerEvent,
  SchedulerEventType,
  SchedulerEventHandler,
} from './types';
import { RetryPolicy } from './RetryPolicy';
import { JobQueue } from './JobQueue';
import { systemLogger } from '../utils/logger';
import agentRegistry from '../agents/base/AgentRegistry';
import { workflowRunner } from '../workflows/WorkflowRunner';

/**
 * 크론 표현식 파서 (간단한 구현)
 * 실제 프로덕션에서는 node-cron이나 cron-parser 라이브러리 사용 권장
 */
class CronParser {
  /**
   * 다음 실행 시간 계산
   * @param expression - 크론 표현식
   * @param timezone - 타임존
   * @returns 다음 실행 시간
   */
  static getNextRunTime(expression: string, timezone: string = 'Asia/Seoul'): Date {
    // 간단한 구현: 크론 표현식 파싱
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const now = new Date();

    // 다음 분으로 이동
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // 분 처리
    if (minute !== '*') {
      const targetMinute = parseInt(minute, 10);
      if (next.getMinutes() >= targetMinute) {
        next.setHours(next.getHours() + 1);
      }
      next.setMinutes(targetMinute);
    } else {
      next.setMinutes(next.getMinutes() + 1);
    }

    // 시간 처리
    if (hour !== '*') {
      const targetHour = parseInt(hour, 10);
      if (next.getHours() > targetHour ||
          (next.getHours() === targetHour && minute !== '*')) {
        next.setDate(next.getDate() + 1);
      }
      next.setHours(targetHour);
      if (minute === '*') {
        next.setMinutes(0);
      }
    }

    return next;
  }

  /**
   * 크론 표현식 유효성 검사
   */
  static isValid(expression: string): boolean {
    const parts = expression.split(' ');
    return parts.length === 5;
  }
}

/**
 * 스케줄러 설정
 */
interface SchedulerConfig {
  /** 타임존 */
  timezone: string;
  /** 틱 간격 (밀리초) */
  tickInterval: number;
  /** 최대 동시 실행 수 */
  maxConcurrent: number;
  /** 실행 이력 보관 기간 (일) */
  historyRetentionDays: number;
}

/**
 * 기본 설정
 */
const defaultConfig: SchedulerConfig = {
  timezone: 'Asia/Seoul',
  tickInterval: 60000, // 1분
  maxConcurrent: 10,
  historyRetentionDays: 7,
};

/**
 * 크론 스케줄러 클래스
 */
export class CronScheduler extends EventEmitter {
  private config: SchedulerConfig;
  private jobs: Map<string, JobDefinition> = new Map();
  private schedules: Map<string, ScheduleInfo> = new Map();
  private instances: Map<string, JobInstance> = new Map();
  private history: JobInstance[] = [];
  private eventHandlers: Map<SchedulerEventType, SchedulerEventHandler[]> = new Map();
  private tickTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private runningJobs: Set<string> = new Set();
  private jobQueue: JobQueue<JobDefinition, JobResult>;

  /**
   * CronScheduler 생성자
   */
  constructor(config?: Partial<SchedulerConfig>) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.jobQueue = new JobQueue({
      name: 'scheduler-queue',
      concurrency: this.config.maxConcurrent,
      priorityBased: true,
    });

    this.setupQueueHandlers();
    systemLogger.info('CronScheduler initialized', {
      timezone: this.config.timezone,
      maxConcurrent: this.config.maxConcurrent,
    });
  }

  /**
   * 큐 이벤트 핸들러 설정
   */
  private setupQueueHandlers(): void {
    this.jobQueue.on('completed', ({ item, result, executionTime }) => {
      this.handleJobCompleted(item.id, result as JobResult, executionTime);
    });

    this.jobQueue.on('failed', ({ item, error }) => {
      this.handleJobFailed(item.id, error);
    });
  }

  // ===========================================================================
  // 작업 등록 관리
  // ===========================================================================

  /**
   * 작업 등록
   */
  registerJob(job: JobDefinition): void {
    if (!CronParser.isValid(job.cronExpression)) {
      throw new Error(`Invalid cron expression: ${job.cronExpression}`);
    }

    this.jobs.set(job.id, job);

    // 스케줄 정보 생성
    const nextRun = CronParser.getNextRunTime(job.cronExpression, job.timezone);
    this.schedules.set(job.id, {
      jobId: job.id,
      nextRun,
      cronExpression: job.cronExpression,
      enabled: job.enabled,
    });

    this.emitEvent('job:registered', job.id);
    systemLogger.info('Job registered', {
      id: job.id,
      name: job.name,
      cronExpression: job.cronExpression,
      nextRun,
    });
  }

  /**
   * 작업 해제
   */
  unregisterJob(jobId: string): void {
    this.jobs.delete(jobId);
    this.schedules.delete(jobId);
    this.emitEvent('job:unregistered', jobId);
    systemLogger.info('Job unregistered', { id: jobId });
  }

  /**
   * 여러 작업 등록
   */
  registerJobs(jobs: JobDefinition[]): void {
    for (const job of jobs) {
      this.registerJob(job);
    }
  }

  /**
   * 작업 활성화
   */
  enableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      const schedule = this.schedules.get(jobId);
      if (schedule) {
        schedule.enabled = true;
        schedule.nextRun = CronParser.getNextRunTime(
          job.cronExpression,
          job.timezone
        );
      }
    }
  }

  /**
   * 작업 비활성화
   */
  disableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      const schedule = this.schedules.get(jobId);
      if (schedule) {
        schedule.enabled = false;
      }
    }
  }

  // ===========================================================================
  // 스케줄러 제어
  // ===========================================================================

  /**
   * 스케줄러 시작
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.jobQueue.start();

    // 틱 타이머 시작
    this.tickTimer = setInterval(() => {
      this.tick();
    }, this.config.tickInterval);

    // 즉시 첫 틱 실행
    this.tick();

    this.emitEvent('scheduler:started', 'scheduler');
    systemLogger.info('Scheduler started');
  }

  /**
   * 스케줄러 정지
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }

    this.jobQueue.stop();
    this.emitEvent('scheduler:stopped', 'scheduler');
    systemLogger.info('Scheduler stopped');
  }

  /**
   * 스케줄러 일시 정지
   */
  pause(): void {
    this.isPaused = true;
    this.jobQueue.pause();
    this.emitEvent('scheduler:paused', 'scheduler');
    systemLogger.info('Scheduler paused');
  }

  /**
   * 스케줄러 재개
   */
  resume(): void {
    this.isPaused = false;
    this.jobQueue.resume();
    this.emitEvent('scheduler:resumed', 'scheduler');
    systemLogger.info('Scheduler resumed');
  }

  /**
   * 틱 처리 (스케줄 확인 및 작업 실행)
   */
  private tick(): void {
    if (this.isPaused) return;

    const now = new Date();

    for (const [jobId, schedule] of this.schedules) {
      if (!schedule.enabled) continue;
      if (this.runningJobs.has(jobId)) continue;

      // 실행 시간 확인
      if (schedule.nextRun <= now) {
        const job = this.jobs.get(jobId);
        if (!job) continue;

        // 조건 확인
        if (job.conditions && !this.checkConditions(job.conditions)) {
          systemLogger.debug('Job conditions not met, skipping', { jobId });
          schedule.previousRun = now;
          schedule.nextRun = CronParser.getNextRunTime(
            job.cronExpression,
            job.timezone
          );
          continue;
        }

        // 작업 실행
        this.executeJob(job);

        // 다음 실행 시간 업데이트
        schedule.previousRun = now;
        schedule.nextRun = CronParser.getNextRunTime(
          job.cronExpression,
          job.timezone
        );
      }
    }
  }

  /**
   * 조건 확인
   */
  private checkConditions(conditions: JobDefinition['conditions']): boolean {
    if (!conditions || conditions.length === 0) return true;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const condition of conditions) {
      switch (condition.type) {
        case 'business_days_only':
          if (isWeekend) return false;
          break;
        case 'exclude_weekends':
          if (isWeekend) return false;
          break;
        case 'skip_holidays':
          // TODO: 공휴일 API 연동
          break;
        case 'custom':
          if (condition.evaluate && !condition.evaluate()) return false;
          break;
      }
    }

    return true;
  }

  /**
   * 작업 실행
   */
  private async executeJob(job: JobDefinition): Promise<void> {
    const instanceId = uuidv4();

    const instance: JobInstance = {
      instanceId,
      jobId: job.id,
      status: JobStatus.SCHEDULED,
      scheduledAt: new Date(),
      retryCount: 0,
      input: job.inputData,
    };

    this.instances.set(instanceId, instance);
    this.runningJobs.add(job.id);

    this.emitEvent('job:scheduled', job.id, instanceId);
    systemLogger.info('Job scheduled for execution', {
      jobId: job.id,
      instanceId,
    });

    try {
      instance.status = JobStatus.RUNNING;
      instance.startedAt = new Date();
      this.emitEvent('job:started', job.id, instanceId);

      let result: JobResult;

      // 타겟 타입에 따른 실행
      if (job.targetType === 'agent') {
        result = await this.executeAgentJob(job);
      } else {
        result = await this.executeWorkflowJob(job);
      }

      this.handleJobCompleted(instanceId, result,
        Date.now() - instance.startedAt.getTime());

    } catch (error) {
      this.handleJobFailed(instanceId, {
        code: 'EXECUTION_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        recoverable: false,
      });
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  /**
   * 에이전트 작업 실행
   */
  private async executeAgentJob(job: JobDefinition): Promise<JobResult> {
    const agent = agentRegistry.getAgent(job.targetId);

    if (!agent) {
      systemLogger.warn(`Agent not registered: ${job.targetId}`);
      return {
        success: false,
        message: `Agent not found: ${job.targetId}`,
      };
    }

    const result = await agent.execute(job.inputData, 'cron-scheduler');

    return {
      success: result.success,
      data: result.data as Record<string, unknown>,
      processedCount: result.processedCount,
      failedCount: result.failedCount,
      message: result.error?.message,
    };
  }

  /**
   * 워크플로우 작업 실행
   */
  private async executeWorkflowJob(job: JobDefinition): Promise<JobResult> {
    const instance = await workflowRunner.runAndWait(
      job.targetId,
      job.inputData || {}
    );

    return {
      success: instance.status === 'completed',
      data: instance.context.results,
      message: instance.error?.message,
    };
  }

  /**
   * 작업 완료 처리
   */
  private handleJobCompleted(
    instanceId: string,
    result: JobResult,
    executionTime: number
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.status = JobStatus.COMPLETED;
    instance.completedAt = new Date();
    instance.executionTime = executionTime;
    instance.result = result;
    instance.output = result.data;

    this.moveToHistory(instance);
    this.emitEvent('job:completed', instance.jobId, instanceId, {
      executionTime,
      result,
    });

    systemLogger.info('Job completed', {
      jobId: instance.jobId,
      instanceId,
      executionTime,
      success: result.success,
    });
  }

  /**
   * 작업 실패 처리
   */
  private handleJobFailed(instanceId: string, error: JobError): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.status = JobStatus.FAILED;
    instance.completedAt = new Date();
    instance.error = error;

    this.moveToHistory(instance);
    this.emitEvent('job:failed', instance.jobId, instanceId, { error });

    systemLogger.error('Job failed', new Error(error.message), {
      jobId: instance.jobId,
      instanceId,
    });
  }

  /**
   * 인스턴스를 이력으로 이동
   */
  private moveToHistory(instance: JobInstance): void {
    this.instances.delete(instance.instanceId);
    this.history.push(instance);

    // 오래된 이력 정리
    this.cleanupHistory();
  }

  /**
   * 이력 정리
   */
  private cleanupHistory(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.historyRetentionDays);

    this.history = this.history.filter(
      (instance) => instance.completedAt && instance.completedAt > cutoff
    );
  }

  // ===========================================================================
  // 수동 실행
  // ===========================================================================

  /**
   * 작업 즉시 실행
   */
  async runNow(jobId: string, input?: Record<string, unknown>): Promise<JobInstance> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const modifiedJob = input
      ? { ...job, inputData: { ...job.inputData, ...input } }
      : job;

    const instanceId = uuidv4();
    const instance: JobInstance = {
      instanceId,
      jobId: job.id,
      status: JobStatus.PENDING,
      scheduledAt: new Date(),
      retryCount: 0,
      input: modifiedJob.inputData,
    };

    this.instances.set(instanceId, instance);

    // 실행
    await this.executeJob(modifiedJob);

    return this.instances.get(instanceId) || instance;
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 등록된 작업 목록 조회
   */
  listJobs(): JobDefinition[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 작업 조회
   */
  getJob(jobId: string): JobDefinition | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 스케줄 정보 조회
   */
  getSchedule(jobId: string): ScheduleInfo | undefined {
    return this.schedules.get(jobId);
  }

  /**
   * 모든 스케줄 조회
   */
  listSchedules(): ScheduleInfo[] {
    return Array.from(this.schedules.values());
  }

  /**
   * 인스턴스 조회
   */
  getInstance(instanceId: string): JobInstance | undefined {
    return this.instances.get(instanceId) ||
           this.history.find((i) => i.instanceId === instanceId);
  }

  /**
   * 이력 조회
   */
  getHistory(jobId?: string, limit: number = 100): JobInstance[] {
    let result = this.history;

    if (jobId) {
      result = result.filter((i) => i.jobId === jobId);
    }

    return result.slice(-limit);
  }

  /**
   * 통계 조회
   */
  getStats(): SchedulerStats {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayHistory = this.history.filter(
      (i) => i.completedAt && i.completedAt >= today
    );

    const completed = todayHistory.filter((i) => i.status === JobStatus.COMPLETED);
    const failed = todayHistory.filter((i) => i.status === JobStatus.FAILED);

    const totalExecutionTime = completed.reduce(
      (sum, i) => sum + (i.executionTime || 0),
      0
    );

    return {
      registeredJobs: this.jobs.size,
      runningJobs: this.runningJobs.size,
      pendingJobs: this.instances.size - this.runningJobs.size,
      completedToday: completed.length,
      failedToday: failed.length,
      averageExecutionTime:
        completed.length > 0 ? totalExecutionTime / completed.length : 0,
      successRate:
        todayHistory.length > 0
          ? (completed.length / todayHistory.length) * 100
          : 100,
    };
  }

  // ===========================================================================
  // 이벤트 관리
  // ===========================================================================

  /**
   * 이벤트 핸들러 등록
   */
  onEvent(eventType: SchedulerEventType, handler: SchedulerEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * 이벤트 발생
   */
  private emitEvent(
    type: SchedulerEventType,
    jobId: string,
    instanceId?: string,
    data?: Record<string, unknown>
  ): void {
    const event: SchedulerEvent = {
      type,
      jobId,
      instanceId,
      timestamp: new Date(),
      data,
    };

    const handlers = this.eventHandlers.get(type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        systemLogger.error('Event handler error', error as Error);
      }
    }

    this.emit(type, event);
  }
}

// 싱글톤 인스턴스 export
export const cronScheduler = new CronScheduler();
export default CronScheduler;
