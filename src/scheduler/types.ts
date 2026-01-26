/**
 * 썬데이허그 AI 에이전트 시스템 - 스케줄러 타입 정의
 *
 * LANE 5: Integration & Orchestration
 * 크론 스케줄러, 작업 큐, 재시도 정책에서 사용하는 타입들입니다.
 */

/**
 * 작업 상태
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
  SCHEDULED = 'scheduled',
}

/**
 * 작업 우선순위
 */
export enum JobPriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  NORMAL = 3,
  LOW = 4,
  BATCH = 5,
}

/**
 * 작업 정의
 */
export interface JobDefinition {
  /** 작업 ID */
  id: string;
  /** 작업 이름 */
  name: string;
  /** 설명 */
  description?: string;
  /** 크론 표현식 */
  cronExpression: string;
  /** 타임존 */
  timezone: string;
  /** 담당 에이전트/워크플로우 ID */
  targetId: string;
  /** 타겟 타입 */
  targetType: 'agent' | 'workflow';
  /** 입력 데이터 */
  inputData?: Record<string, unknown>;
  /** 우선순위 */
  priority: JobPriority;
  /** 활성화 여부 */
  enabled: boolean;
  /** 재시도 정책 */
  retryPolicy?: RetryPolicyConfig;
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 실행 조건 */
  conditions?: JobCondition[];
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 작업 조건
 */
export interface JobCondition {
  /** 조건 타입 */
  type: 'business_days_only' | 'exclude_weekends' | 'skip_holidays' | 'custom';
  /** 커스텀 조건 함수 (type이 custom인 경우) */
  evaluate?: () => boolean | Promise<boolean>;
}

/**
 * 작업 인스턴스
 */
export interface JobInstance {
  /** 인스턴스 ID */
  instanceId: string;
  /** 작업 정의 ID */
  jobId: string;
  /** 상태 */
  status: JobStatus;
  /** 예정 실행 시간 */
  scheduledAt: Date;
  /** 실제 시작 시간 */
  startedAt?: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 실행 시간 (밀리초) */
  executionTime?: number;
  /** 재시도 횟수 */
  retryCount: number;
  /** 결과 */
  result?: JobResult;
  /** 에러 */
  error?: JobError;
  /** 입력 데이터 */
  input?: Record<string, unknown>;
  /** 출력 데이터 */
  output?: Record<string, unknown>;
}

/**
 * 작업 결과
 */
export interface JobResult {
  /** 성공 여부 */
  success: boolean;
  /** 결과 데이터 */
  data?: Record<string, unknown>;
  /** 처리된 항목 수 */
  processedCount?: number;
  /** 실패한 항목 수 */
  failedCount?: number;
  /** 메시지 */
  message?: string;
}

/**
 * 작업 에러
 */
export interface JobError {
  /** 에러 코드 */
  code: string;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: unknown;
  /** 스택 트레이스 */
  stack?: string;
  /** 복구 가능 여부 */
  recoverable: boolean;
}

/**
 * 재시도 정책 설정
 */
export interface RetryPolicyConfig {
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 초기 지연 시간 (밀리초) */
  initialDelay: number;
  /** 최대 지연 시간 (밀리초) */
  maxDelay: number;
  /** 지수 백오프 사용 여부 */
  exponentialBackoff: boolean;
  /** 백오프 승수 */
  backoffMultiplier: number;
  /** 재시도 가능한 에러 코드 */
  retryableErrors?: string[];
  /** 재시도 불가능한 에러 코드 */
  nonRetryableErrors?: string[];
}

/**
 * 큐 설정
 */
export interface QueueConfig {
  /** 큐 이름 */
  name: string;
  /** 최대 동시 처리 수 */
  concurrency: number;
  /** 최대 큐 크기 */
  maxSize: number;
  /** 우선순위 기반 정렬 */
  priorityBased: boolean;
  /** 작업 타임아웃 (밀리초) */
  defaultTimeout: number;
  /** 재시도 정책 */
  retryPolicy?: RetryPolicyConfig;
}

/**
 * 큐 항목
 */
export interface QueueItem<T = unknown> {
  /** 항목 ID */
  id: string;
  /** 페이로드 */
  payload: T;
  /** 우선순위 */
  priority: JobPriority;
  /** 생성 시간 */
  createdAt: Date;
  /** 만료 시간 */
  expiresAt?: Date;
  /** 재시도 횟수 */
  retryCount: number;
  /** 마지막 시도 시간 */
  lastAttemptAt?: Date;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 스케줄 정보
 */
export interface ScheduleInfo {
  /** 작업 ID */
  jobId: string;
  /** 다음 실행 시간 */
  nextRun: Date;
  /** 이전 실행 시간 */
  previousRun?: Date;
  /** 크론 표현식 */
  cronExpression: string;
  /** 활성화 여부 */
  enabled: boolean;
}

/**
 * 스케줄러 통계
 */
export interface SchedulerStats {
  /** 등록된 작업 수 */
  registeredJobs: number;
  /** 실행 중인 작업 수 */
  runningJobs: number;
  /** 대기 중인 작업 수 */
  pendingJobs: number;
  /** 오늘 완료된 작업 수 */
  completedToday: number;
  /** 오늘 실패한 작업 수 */
  failedToday: number;
  /** 평균 실행 시간 (밀리초) */
  averageExecutionTime: number;
  /** 성공률 */
  successRate: number;
}

/**
 * 스케줄러 이벤트
 */
export interface SchedulerEvent {
  /** 이벤트 타입 */
  type: SchedulerEventType;
  /** 작업 ID */
  jobId: string;
  /** 인스턴스 ID */
  instanceId?: string;
  /** 타임스탬프 */
  timestamp: Date;
  /** 데이터 */
  data?: Record<string, unknown>;
}

/**
 * 스케줄러 이벤트 타입
 */
export type SchedulerEventType =
  | 'job:registered'
  | 'job:unregistered'
  | 'job:scheduled'
  | 'job:started'
  | 'job:completed'
  | 'job:failed'
  | 'job:retrying'
  | 'job:cancelled'
  | 'job:timeout'
  | 'scheduler:started'
  | 'scheduler:stopped'
  | 'scheduler:paused'
  | 'scheduler:resumed';

/**
 * 스케줄러 이벤트 핸들러
 */
export type SchedulerEventHandler = (event: SchedulerEvent) => void | Promise<void>;
