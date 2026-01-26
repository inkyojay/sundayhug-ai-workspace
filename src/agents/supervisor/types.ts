/**
 * 썬데이허그 AI 에이전트 시스템 - Supervisor 에이전트 타입
 *
 * LANE 5: Integration & Orchestration
 * Supervisor 에이전트 전용 타입 정의
 */

import { Priority, TaskPayload, AgentContext } from '../../types';

// ===========================================================================
// 라우팅 관련 타입
// ===========================================================================

/**
 * 라우팅 결정 결과
 */
export interface RoutingDecision {
  /** 대상 에이전트 ID */
  targetAgent: string;
  /** 신뢰도 (0-1) */
  confidence: number;
  /** 대안 에이전트 목록 */
  alternativeAgents: string[];
  /** 멀티 에이전트 협업 필요 여부 */
  requiresMultiAgent: boolean;
  /** 관련 에이전트 목록 (멀티 에이전트 시) */
  involvedAgents?: string[];
  /** 라우팅 사유 */
  reason: RoutingReason;
  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 라우팅 사유
 */
export enum RoutingReason {
  /** 키워드 매칭 */
  KEYWORD_MATCH = 'keyword_match',
  /** 엔티티 기반 */
  ENTITY_BASED = 'entity_based',
  /** 소스 채널 기반 */
  SOURCE_BASED = 'source_based',
  /** 안전 이슈 */
  SAFETY_ISSUE = 'safety_issue',
  /** 기본 라우팅 */
  DEFAULT = 'default',
  /** VIP 고객 */
  VIP_CUSTOMER = 'vip_customer',
  /** 이력 기반 */
  HISTORY_BASED = 'history_based',
}

/**
 * 키워드 라우팅 규칙
 */
export interface KeywordRoutingRule {
  /** 에이전트 ID */
  agentId: string;
  /** 키워드 목록 */
  keywords: string[];
  /** 우선순위 (낮을수록 높은 우선순위) */
  priority: number;
}

/**
 * 엔티티 라우팅 규칙
 */
export interface EntityRoutingRule {
  /** 엔티티 타입 */
  entityType: string;
  /** 패턴 (정규식) */
  pattern: string;
  /** 대상 에이전트 ID */
  targetAgent: string;
}

/**
 * 소스 라우팅 규칙
 */
export interface SourceRoutingRule {
  /** 소스명 */
  source: string;
  /** 주 에이전트 */
  primary: string;
  /** 폴백 에이전트 */
  fallback: string;
}

/**
 * 라우팅 규칙 설정
 */
export interface RoutingRules {
  /** 키워드 기반 라우팅 */
  keywordRouting: KeywordRoutingRule[];
  /** 엔티티 기반 라우팅 */
  entityRouting: EntityRoutingRule[];
  /** 소스 기반 라우팅 */
  sourceRouting: SourceRoutingRule[];
  /** 기본 에이전트 */
  defaultAgent: string;
  /** 안전 키워드 */
  safetyKeywords: string[];
  /** 안전 에이전트 */
  safetyAgent: string;
}

// ===========================================================================
// 우선순위 관리 타입
// ===========================================================================

/**
 * 우선순위 레벨
 */
export enum PriorityLevel {
  /** 즉시 처리 (5분) */
  P0_CRITICAL = 0,
  /** 긴급 처리 (30분) */
  P1_URGENT = 1,
  /** 우선 처리 (2시간) */
  P2_HIGH = 2,
  /** 일반 처리 (24시간) */
  P3_NORMAL = 3,
  /** 낮은 우선순위 (48시간) */
  P4_LOW = 4,
  /** 배치 처리 (주간) */
  P5_BATCH = 5,
}

/**
 * 우선순위 SLA 설정
 */
export interface PrioritySLA {
  /** 우선순위 레벨 */
  level: PriorityLevel;
  /** 최대 대기 시간 (초) */
  maxWaitTime: number;
  /** 동시 처리 수 */
  concurrentProcessing: number;
  /** SLA 위반 시 에스컬레이션 여부 */
  escalationOnBreach: boolean;
  /** 에스컬레이션 대상 */
  escalationTarget?: string;
}

/**
 * 우선순위 조정 결과
 */
export interface PriorityAdjustment {
  /** 요청 ID */
  requestId: string;
  /** 원래 우선순위 */
  originalPriority: PriorityLevel;
  /** 조정된 우선순위 */
  adjustedPriority: PriorityLevel;
  /** 조정 사유 */
  reason: string;
  /** 조정 시각 */
  adjustedAt: Date;
}

/**
 * 우선순위 결정 요소
 */
export interface PriorityFactors {
  /** 대기 시간 (밀리초) */
  waitTime: number;
  /** 고객 가치 */
  customerValue: number;
  /** 반복 불만 여부 */
  isRepeatComplaint: boolean;
  /** 감정 점수 (-1 ~ 1) */
  sentimentScore: number;
  /** 업무 시간 여부 */
  isBusinessHours: boolean;
  /** 재무 영향 금액 */
  financialImpact?: number;
  /** VIP 여부 */
  isVip?: boolean;
}

// ===========================================================================
// 오케스트레이션 타입
// ===========================================================================

/**
 * 오케스트레이션 패턴
 */
export enum OrchestrationPattern {
  /** 순차 실행 */
  SEQUENTIAL = 'sequential',
  /** 병렬 실행 */
  PARALLEL = 'parallel',
  /** 분산-수집 */
  SCATTER_GATHER = 'scatter_gather',
  /** 사가 패턴 */
  SAGA = 'saga',
  /** 이벤트 기반 */
  EVENT_DRIVEN = 'event_driven',
}

/**
 * 오케스트레이션 작업
 */
export interface OrchestrationTask {
  /** 작업 ID */
  id: string;
  /** 패턴 */
  pattern: OrchestrationPattern;
  /** 관련 에이전트 */
  agents: string[];
  /** 입력 데이터 */
  input: Record<string, unknown>;
  /** 현재 상태 */
  status: OrchestrationStatus;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 각 에이전트 결과 */
  results: Map<string, unknown>;
  /** 에러 정보 */
  errors?: Map<string, Error>;
}

/**
 * 오케스트레이션 상태
 */
export enum OrchestrationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
}

// ===========================================================================
// CEO 커뮤니케이션 타입
// ===========================================================================

/**
 * CEO 알림 채널
 */
export enum CEONotificationChannel {
  /** 전화 (긴급) */
  PHONE = 'phone',
  /** 카카오톡 (긴급/중요) */
  KAKAO = 'kakao',
  /** Slack (일반) */
  SLACK = 'slack',
  /** 이메일 (리포트) */
  EMAIL = 'email',
  /** 대시보드 (상시) */
  DASHBOARD = 'dashboard',
}

/**
 * CEO 알림 트리거 타입
 */
export enum CEOAlertType {
  /** 안전 이슈 */
  SAFETY_ISSUE = 'safety_issue',
  /** 시스템 장애 */
  SYSTEM_DOWN = 'system_down',
  /** 법적 긴급 */
  LEGAL_EMERGENCY = 'legal_emergency',
  /** VIP 불만 */
  VIP_COMPLAINT = 'vip_complaint',
  /** 평판 위기 */
  REPUTATION_CRISIS = 'reputation_crisis',
  /** 보안 위반 */
  SECURITY_BREACH = 'security_breach',
  /** 환불 승인 */
  REFUND_APPROVAL = 'refund_approval',
  /** 캠페인 승인 */
  CAMPAIGN_APPROVAL = 'campaign_approval',
  /** 재고 위급 */
  INVENTORY_CRITICAL = 'inventory_critical',
  /** 일간 요약 */
  DAILY_SUMMARY = 'daily_summary',
  /** 승인 대기 */
  PENDING_APPROVALS = 'pending_approvals',
}

/**
 * CEO 알림 설정
 */
export interface CEONotificationConfig {
  /** 알림 타입 */
  alertType: CEOAlertType;
  /** 채널 */
  channel: CEONotificationChannel;
  /** 조건 */
  condition?: string;
  /** 예약 시간 */
  scheduledTime?: string;
}

/**
 * 승인 요청
 */
export interface ApprovalRequest {
  /** 요청 ID */
  id: string;
  /** 요청 타입 */
  type: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 요청 에이전트 */
  requestedBy: string;
  /** 요청 시간 */
  requestedAt: Date;
  /** 긴급도 */
  urgency: PriorityLevel;
  /** 기한 */
  deadline?: Date;
  /** 옵션 */
  options: ApprovalOption[];
  /** AI 추천 */
  aiRecommendation?: {
    option: string;
    reason: string;
  };
  /** 관련 데이터 */
  context: Record<string, unknown>;
  /** 상태 */
  status: ApprovalStatus;
  /** 응답 */
  response?: ApprovalResponse;
}

/**
 * 승인 옵션
 */
export interface ApprovalOption {
  /** 옵션 ID */
  id: string;
  /** 라벨 */
  label: string;
  /** 장점 */
  pros: string[];
  /** 단점 */
  cons: string[];
}

/**
 * 승인 상태
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
  EXPIRED = 'expired',
}

/**
 * 승인 응답
 */
export interface ApprovalResponse {
  /** 상태 */
  status: ApprovalStatus;
  /** 선택된 옵션 */
  selectedOption?: string;
  /** 수정 내용 */
  modifications?: Record<string, unknown>;
  /** 코멘트 */
  comment?: string;
  /** 응답 시간 */
  respondedAt: Date;
}

// ===========================================================================
// 에스컬레이션 타입
// ===========================================================================

/**
 * 에스컬레이션 요청
 */
export interface EscalationRequest {
  /** ID */
  id: string;
  /** 요청 에이전트 */
  fromAgent: string;
  /** 에스컬레이션 사유 */
  reason: EscalationReason;
  /** 원본 요청 */
  originalRequest: TaskPayload;
  /** 컨텍스트 */
  context: Record<string, unknown>;
  /** 우선순위 */
  priority: PriorityLevel;
  /** 요청 시간 */
  requestedAt: Date;
  /** 상태 */
  status: EscalationStatus;
  /** 처리 결과 */
  resolution?: EscalationResolution;
}

/**
 * 에스컬레이션 사유
 */
export enum EscalationReason {
  /** 승인 필요 */
  APPROVAL_REQUIRED = 'approval_required',
  /** 권한 부족 */
  INSUFFICIENT_PERMISSION = 'insufficient_permission',
  /** 불확실성 */
  UNCERTAINTY = 'uncertainty',
  /** 예외 상황 */
  EXCEPTIONAL_CASE = 'exceptional_case',
  /** 고객 요청 */
  CUSTOMER_REQUEST = 'customer_request',
  /** SLA 위반 */
  SLA_BREACH = 'sla_breach',
  /** 에러 발생 */
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * 에스컬레이션 상태
 */
export enum EscalationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  FORWARDED = 'forwarded',
  EXPIRED = 'expired',
}

/**
 * 에스컬레이션 해결
 */
export interface EscalationResolution {
  /** 해결 방법 */
  action: string;
  /** 해결자 */
  resolvedBy: string;
  /** 해결 시간 */
  resolvedAt: Date;
  /** 결과 */
  result: Record<string, unknown>;
  /** 메모 */
  notes?: string;
}

// ===========================================================================
// 시스템 모니터링 타입
// ===========================================================================

/**
 * 에이전트 상태
 */
export interface AgentStatus {
  /** 에이전트 ID */
  agentId: string;
  /** 에이전트 이름 */
  name: string;
  /** 상태 */
  status: AgentHealthStatus;
  /** 마지막 헬스체크 시간 */
  lastHealthCheck: Date;
  /** 응답 시간 (밀리초) */
  responseTime: number;
  /** 에러율 */
  errorRate: number;
  /** 큐 깊이 */
  queueDepth: number;
  /** 활성 작업 수 */
  activeJobs: number;
}

/**
 * 에이전트 헬스 상태
 */
export enum AgentHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  DOWN = 'down',
  UNKNOWN = 'unknown',
}

/**
 * 시스템 상태 리포트
 */
export interface SystemStatusReport {
  /** 타임스탬프 */
  timestamp: Date;
  /** 전체 상태 */
  overallStatus: AgentHealthStatus;
  /** 에이전트별 상태 */
  agents: AgentStatus[];
  /** 큐 상태 */
  queues: QueueStatus[];
  /** 메트릭 */
  metrics: SystemMetrics;
  /** 알림 */
  alerts: ActiveAlert[];
}

/**
 * 큐 상태
 */
export interface QueueStatus {
  /** 우선순위 레벨 */
  priority: PriorityLevel;
  /** 대기 수 */
  pending: number;
  /** 처리 중 수 */
  processing: number;
  /** 평균 대기 시간 */
  avgWaitTime: number;
}

/**
 * 시스템 메트릭
 */
export interface SystemMetrics {
  /** 요청 처리율 (시간당) */
  requestsPerHour: number;
  /** 평균 응답 시간 (밀리초) */
  avgResponseTime: number;
  /** 에러율 */
  errorRate: number;
  /** 오늘의 에스컬레이션 수 */
  escalationsToday: number;
}

/**
 * 활성 알림
 */
export interface ActiveAlert {
  /** 알림 ID */
  id: string;
  /** 심각도 */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** 메시지 */
  message: string;
  /** 발생 시간 */
  occurredAt: Date;
}

// ===========================================================================
// 에러 핸들링 타입
// ===========================================================================

/**
 * Supervisor 에러 코드
 */
export enum SupervisorErrorCode {
  /** 라우팅 실패 */
  SUP_001_ROUTING_FAILED = 'SUP-001',
  /** 에이전트 타임아웃 */
  SUP_002_AGENT_TIMEOUT = 'SUP-002',
  /** 큐 오버플로우 */
  SUP_003_QUEUE_OVERFLOW = 'SUP-003',
  /** 순환 참조 */
  SUP_004_CIRCULAR_REFERENCE = 'SUP-004',
  /** 인증 실패 */
  SUP_005_AUTH_FAILED = 'SUP-005',
}

/**
 * 폴백 설정
 */
export interface FallbackConfig {
  /** 에이전트별 폴백 */
  agentFallbacks: Map<string, string[]>;
  /** 기본 폴백 에이전트 */
  defaultFallback: string;
  /** 알림 대상 */
  notifyTarget: CEONotificationChannel;
}

// ===========================================================================
// Supervisor 설정 타입
// ===========================================================================

/**
 * Supervisor 설정
 */
export interface SupervisorConfig {
  /** 라우팅 규칙 */
  routingRules: RoutingRules;
  /** 우선순위 SLA */
  prioritySLAs: PrioritySLA[];
  /** CEO 알림 설정 */
  ceoNotifications: CEONotificationConfig[];
  /** 폴백 설정 */
  fallbackConfig: FallbackConfig;
  /** 헬스체크 간격 (밀리초) */
  healthCheckInterval: number;
  /** 리밸런싱 간격 (밀리초) */
  rebalancingInterval: number;
  /** 최대 동시 처리 수 */
  maxConcurrentTasks: number;
}
