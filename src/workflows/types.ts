/**
 * 썬데이허그 AI 에이전트 시스템 - 워크플로우 타입 정의
 *
 * LANE 5: Integration & Orchestration
 * 워크플로우 엔진에서 사용하는 타입들을 정의합니다.
 */

/**
 * 워크플로우 상태
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  WAITING_APPROVAL = 'waiting_approval',
}

/**
 * 스텝 상태
 */
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  WAITING = 'waiting',
}

/**
 * 워크플로우 정의
 */
export interface WorkflowDefinition {
  /** 워크플로우 ID */
  id: string;
  /** 워크플로우 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 버전 */
  version: string;
  /** 트리거 조건 */
  triggers: WorkflowTrigger[];
  /** 스텝 정의 */
  steps: StepDefinition[];
  /** 시작 스텝 ID */
  startStepId: string;
  /** 전역 타임아웃 (밀리초) */
  globalTimeout?: number;
  /** 에러 처리 전략 */
  errorStrategy: ErrorStrategy;
  /** 활성화 여부 */
  enabled: boolean;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 워크플로우 트리거
 */
export interface WorkflowTrigger {
  /** 트리거 타입 */
  type: 'event' | 'schedule' | 'manual' | 'webhook';
  /** 이벤트 이름 (event 타입) */
  eventName?: string;
  /** 크론 표현식 (schedule 타입) */
  cronExpression?: string;
  /** 조건 */
  condition?: TriggerCondition;
}

/**
 * 트리거 조건
 */
export interface TriggerCondition {
  /** 필드 경로 */
  field: string;
  /** 연산자 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex';
  /** 비교 값 */
  value: unknown;
}

/**
 * 스텝 정의
 */
export interface StepDefinition {
  /** 스텝 ID */
  id: string;
  /** 스텝 이름 */
  name: string;
  /** 담당 에이전트 ID */
  agentId: string;
  /** 액션 */
  action: string;
  /** 입력 매핑 */
  inputMapping?: Record<string, string>;
  /** 출력 매핑 */
  outputMapping?: Record<string, string>;
  /** 다음 스텝 */
  transitions: StepTransition[];
  /** 재시도 설정 */
  retryConfig?: RetryConfig;
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 필수 여부 */
  required: boolean;
  /** 승인 필요 여부 */
  requiresApproval?: boolean;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 스텝 전이
 */
export interface StepTransition {
  /** 다음 스텝 ID */
  targetStepId: string;
  /** 조건 */
  condition?: TransitionCondition;
  /** 기본 전이 여부 */
  isDefault?: boolean;
}

/**
 * 전이 조건
 */
export interface TransitionCondition {
  /** 필드 경로 (result.data.xxx 형식) */
  field: string;
  /** 연산자 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  /** 비교 값 */
  value: unknown;
}

/**
 * 재시도 설정
 */
export interface RetryConfig {
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 재시도 간격 (밀리초) */
  retryDelay: number;
  /** 지수 백오프 사용 여부 */
  exponentialBackoff?: boolean;
  /** 재시도 가능한 에러 코드 */
  retryableErrors?: string[];
}

/**
 * 에러 처리 전략
 */
export type ErrorStrategy = 'stop' | 'skip' | 'retry' | 'fallback';

/**
 * 워크플로우 실행 인스턴스
 */
export interface WorkflowInstance {
  /** 인스턴스 ID */
  instanceId: string;
  /** 워크플로우 ID */
  workflowId: string;
  /** 워크플로우 버전 */
  version: string;
  /** 상태 */
  status: WorkflowStatus;
  /** 현재 스텝 ID */
  currentStepId?: string;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 입력 데이터 */
  input: Record<string, unknown>;
  /** 컨텍스트 데이터 (스텝 간 공유) */
  context: WorkflowContext;
  /** 스텝 실행 결과 */
  stepResults: Map<string, StepResult>;
  /** 에러 정보 */
  error?: WorkflowError;
  /** 재시도 횟수 */
  retryCount: number;
  /** 트리거 정보 */
  triggeredBy?: TriggerInfo;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 워크플로우 컨텍스트
 */
export interface WorkflowContext {
  /** 변수 저장소 */
  variables: Record<string, unknown>;
  /** 누적 결과 */
  results: Record<string, unknown>;
  /** 실행 환경 */
  environment: 'development' | 'staging' | 'production';
  /** 사용자 ID */
  userId?: string;
  /** 테넌트 ID */
  tenantId?: string;
}

/**
 * 스텝 실행 결과
 */
export interface StepResult {
  /** 스텝 ID */
  stepId: string;
  /** 상태 */
  status: StepStatus;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 실행 시간 (밀리초) */
  executionTime?: number;
  /** 출력 데이터 */
  output?: Record<string, unknown>;
  /** 에러 정보 */
  error?: StepError;
  /** 재시도 횟수 */
  retryCount: number;
}

/**
 * 스텝 에러
 */
export interface StepError {
  /** 에러 코드 */
  code: string;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: unknown;
  /** 복구 가능 여부 */
  recoverable: boolean;
  /** 스택 트레이스 */
  stack?: string;
}

/**
 * 워크플로우 에러
 */
export interface WorkflowError {
  /** 에러 코드 */
  code: string;
  /** 에러 메시지 */
  message: string;
  /** 실패한 스텝 ID */
  failedStepId?: string;
  /** 상세 정보 */
  details?: unknown;
  /** 복구 가능 여부 */
  recoverable: boolean;
}

/**
 * 트리거 정보
 */
export interface TriggerInfo {
  /** 트리거 타입 */
  type: 'event' | 'schedule' | 'manual' | 'webhook';
  /** 트리거 소스 */
  source: string;
  /** 트리거 시간 */
  triggeredAt: Date;
  /** 트리거 데이터 */
  data?: Record<string, unknown>;
}

/**
 * 워크플로우 이벤트
 */
export interface WorkflowEvent {
  /** 이벤트 ID */
  id: string;
  /** 이벤트 타입 */
  type: WorkflowEventType;
  /** 워크플로우 인스턴스 ID */
  instanceId: string;
  /** 스텝 ID (스텝 이벤트인 경우) */
  stepId?: string;
  /** 타임스탬프 */
  timestamp: Date;
  /** 이벤트 데이터 */
  data?: Record<string, unknown>;
}

/**
 * 워크플로우 이벤트 타입
 */
export type WorkflowEventType =
  | 'workflow:started'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'workflow:paused'
  | 'workflow:resumed'
  | 'workflow:cancelled'
  | 'step:started'
  | 'step:completed'
  | 'step:failed'
  | 'step:skipped'
  | 'step:retrying'
  | 'approval:requested'
  | 'approval:received';

/**
 * 워크플로우 이벤트 핸들러
 */
export type WorkflowEventHandler = (event: WorkflowEvent) => void | Promise<void>;

/**
 * 에러 복구 액션
 */
export interface RecoveryAction {
  /** 액션 타입 */
  type: 'retry' | 'skip' | 'fallback' | 'escalate' | 'abort';
  /** 대상 스텝 ID (fallback인 경우) */
  targetStepId?: string;
  /** 지연 시간 (밀리초) */
  delay?: number;
  /** 메시지 */
  message?: string;
}

/**
 * 복구 핸들러
 */
export type RecoveryHandler = (
  error: StepError,
  step: StepDefinition,
  instance: WorkflowInstance
) => Promise<RecoveryAction>;

/**
 * 상태 머신 상태
 */
export interface StateMachineState {
  /** 현재 상태 */
  current: string;
  /** 이전 상태 */
  previous?: string;
  /** 상태 진입 시간 */
  enteredAt: Date;
  /** 상태 데이터 */
  data?: Record<string, unknown>;
}

/**
 * 상태 전이 규칙
 */
export interface StateTransitionRule {
  /** 시작 상태 */
  from: string | string[];
  /** 종료 상태 */
  to: string;
  /** 이벤트 */
  event: string;
  /** 가드 조건 */
  guard?: (context: WorkflowContext) => boolean;
  /** 전이 액션 */
  action?: (context: WorkflowContext) => void | Promise<void>;
}

/**
 * 워크플로우 실행 옵션
 */
export interface WorkflowExecutionOptions {
  /** 동기 실행 여부 */
  sync?: boolean;
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 우선순위 */
  priority?: number;
  /** 사용자 ID */
  userId?: string;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 워크플로우 요약
 */
export interface WorkflowSummary {
  /** 인스턴스 ID */
  instanceId: string;
  /** 워크플로우 ID */
  workflowId: string;
  /** 워크플로우 이름 */
  workflowName: string;
  /** 상태 */
  status: WorkflowStatus;
  /** 진행률 (0-100) */
  progress: number;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 총 스텝 수 */
  totalSteps: number;
  /** 완료된 스텝 수 */
  completedSteps: number;
  /** 현재 스텝 이름 */
  currentStepName?: string;
}
