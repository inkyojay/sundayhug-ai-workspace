/**
 * 썬데이허그 AI 에이전트 시스템 - 모니터링 타입 정의
 *
 * LANE 5: Integration & Orchestration
 * 메트릭 수집, 알림, 헬스체크에서 사용하는 타입들입니다.
 */

/**
 * 메트릭 타입
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * 알림 심각도
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 헬스 상태
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * 메트릭 정의
 */
export interface MetricDefinition {
  /** 메트릭 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 메트릭 타입 */
  type: MetricType;
  /** 단위 */
  unit?: string;
  /** 라벨 */
  labels?: string[];
}

/**
 * 메트릭 값
 */
export interface MetricValue {
  /** 메트릭 이름 */
  name: string;
  /** 값 */
  value: number;
  /** 타임스탬프 */
  timestamp: Date;
  /** 라벨 값 */
  labels?: Record<string, string>;
}

/**
 * 메트릭 스냅샷
 */
export interface MetricSnapshot {
  /** 메트릭 이름 */
  name: string;
  /** 타입 */
  type: MetricType;
  /** 현재 값 */
  value: number;
  /** 이전 값 */
  previousValue?: number;
  /** 변화량 */
  delta?: number;
  /** 변화율 */
  changeRate?: number;
  /** 라벨 */
  labels?: Record<string, string>;
  /** 타임스탬프 */
  timestamp: Date;
}

/**
 * 히스토그램 버킷
 */
export interface HistogramBucket {
  /** 상한값 */
  le: number;
  /** 카운트 */
  count: number;
}

/**
 * 히스토그램 값
 */
export interface HistogramValue {
  /** 메트릭 이름 */
  name: string;
  /** 버킷 */
  buckets: HistogramBucket[];
  /** 합계 */
  sum: number;
  /** 카운트 */
  count: number;
  /** 라벨 */
  labels?: Record<string, string>;
}

/**
 * 알림 규칙
 */
export interface AlertRule {
  /** 규칙 ID */
  id: string;
  /** 규칙 이름 */
  name: string;
  /** 설명 */
  description?: string;
  /** 메트릭 이름 */
  metricName: string;
  /** 조건 */
  condition: AlertCondition;
  /** 심각도 */
  severity: AlertSeverity;
  /** 알림 채널 */
  channels: AlertChannel[];
  /** 활성화 여부 */
  enabled: boolean;
  /** 쿨다운 (초) */
  cooldown?: number;
  /** 라벨 필터 */
  labelFilter?: Record<string, string>;
}

/**
 * 알림 조건
 */
export interface AlertCondition {
  /** 연산자 */
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  /** 임계값 */
  threshold: number;
  /** 지속 시간 (초) */
  duration?: number;
  /** 연속 위반 횟수 */
  consecutiveViolations?: number;
}

/**
 * 알림 채널
 */
export interface AlertChannel {
  /** 채널 타입 */
  type: 'slack' | 'kakao' | 'email' | 'sms' | 'webhook';
  /** 대상 */
  target: string;
  /** 템플릿 ID */
  templateId?: string;
}

/**
 * 알림 인스턴스
 */
export interface AlertInstance {
  /** 알림 ID */
  id: string;
  /** 규칙 ID */
  ruleId: string;
  /** 규칙 이름 */
  ruleName: string;
  /** 심각도 */
  severity: AlertSeverity;
  /** 메트릭 이름 */
  metricName: string;
  /** 현재 값 */
  currentValue: number;
  /** 임계값 */
  threshold: number;
  /** 상태 */
  status: 'firing' | 'resolved' | 'acknowledged';
  /** 발생 시간 */
  firedAt: Date;
  /** 해결 시간 */
  resolvedAt?: Date;
  /** 확인 시간 */
  acknowledgedAt?: Date;
  /** 확인자 */
  acknowledgedBy?: string;
  /** 라벨 */
  labels?: Record<string, string>;
  /** 메시지 */
  message?: string;
}

/**
 * 헬스체크 정의
 */
export interface HealthCheckDefinition {
  /** 체크 ID */
  id: string;
  /** 체크 이름 */
  name: string;
  /** 대상 타입 */
  targetType: 'agent' | 'service' | 'database' | 'api';
  /** 대상 ID */
  targetId: string;
  /** 체크 간격 (초) */
  interval: number;
  /** 타임아웃 (초) */
  timeout: number;
  /** 활성화 여부 */
  enabled: boolean;
  /** 실패 임계값 */
  failureThreshold: number;
  /** 성공 임계값 */
  successThreshold: number;
}

/**
 * 헬스체크 결과
 */
export interface HealthCheckResult {
  /** 체크 ID */
  checkId: string;
  /** 상태 */
  status: HealthStatus;
  /** 응답 시간 (밀리초) */
  responseTime?: number;
  /** 메시지 */
  message?: string;
  /** 상세 정보 */
  details?: Record<string, unknown>;
  /** 타임스탬프 */
  timestamp: Date;
  /** 연속 실패 횟수 */
  consecutiveFailures: number;
  /** 연속 성공 횟수 */
  consecutiveSuccesses: number;
}

/**
 * 시스템 헬스 요약
 */
export interface SystemHealthSummary {
  /** 전체 상태 */
  overallStatus: HealthStatus;
  /** 건강한 컴포넌트 수 */
  healthyCount: number;
  /** 저하된 컴포넌트 수 */
  degradedCount: number;
  /** 비정상 컴포넌트 수 */
  unhealthyCount: number;
  /** 컴포넌트별 상태 */
  components: Record<string, ComponentHealth>;
  /** 마지막 체크 시간 */
  lastCheckedAt: Date;
}

/**
 * 컴포넌트 헬스
 */
export interface ComponentHealth {
  /** 컴포넌트 이름 */
  name: string;
  /** 상태 */
  status: HealthStatus;
  /** 응답 시간 (밀리초) */
  responseTime?: number;
  /** 마지막 체크 시간 */
  lastCheckedAt: Date;
  /** 마지막 정상 시간 */
  lastHealthyAt?: Date;
  /** 메시지 */
  message?: string;
}

/**
 * 대시보드 데이터
 */
export interface DashboardData {
  /** 시스템 헬스 */
  health: SystemHealthSummary;
  /** 주요 메트릭 */
  metrics: MetricSnapshot[];
  /** 활성 알림 */
  activeAlerts: AlertInstance[];
  /** 최근 이벤트 */
  recentEvents: MonitoringEvent[];
  /** 업데이트 시간 */
  updatedAt: Date;
}

/**
 * 모니터링 이벤트
 */
export interface MonitoringEvent {
  /** 이벤트 ID */
  id: string;
  /** 이벤트 타입 */
  type: MonitoringEventType;
  /** 소스 */
  source: string;
  /** 메시지 */
  message: string;
  /** 심각도 */
  severity: AlertSeverity;
  /** 타임스탬프 */
  timestamp: Date;
  /** 데이터 */
  data?: Record<string, unknown>;
}

/**
 * 모니터링 이벤트 타입
 */
export type MonitoringEventType =
  | 'metric:threshold_exceeded'
  | 'alert:fired'
  | 'alert:resolved'
  | 'health:status_changed'
  | 'system:startup'
  | 'system:shutdown'
  | 'agent:error'
  | 'workflow:failed';

/**
 * 모니터링 이벤트 핸들러
 */
export type MonitoringEventHandler = (event: MonitoringEvent) => void | Promise<void>;
