/**
 * 썬데이허그 AI 에이전트 시스템 - Supervisor 타입 정의
 *
 * 에이전트 라우팅, 의도 분류, 워크플로우 오케스트레이션에 필요한 타입을 정의합니다.
 */

import { TaskPayload, TaskResult, AgentResult } from '../../types';

// =============================================================================
// 의도 분류 관련 타입
// =============================================================================

/**
 * 의도 카테고리
 */
export enum IntentCategory {
  // 주문 관련
  ORDER_CREATE = 'order_create',
  ORDER_CANCEL = 'order_cancel',
  ORDER_MODIFY = 'order_modify',
  ORDER_REFUND = 'order_refund',
  ORDER_TRACKING = 'order_tracking',

  // CS 관련
  CS_INQUIRY = 'cs_inquiry',
  CS_COMPLAINT = 'cs_complaint',
  CS_EXCHANGE = 'cs_exchange',
  CS_RETURN = 'cs_return',

  // 재고 관련
  INVENTORY_CHECK = 'inventory_check',
  INVENTORY_UPDATE = 'inventory_update',
  INVENTORY_ALERT = 'inventory_alert',

  // 회계 관련
  ACCOUNTING_SETTLEMENT = 'accounting_settlement',
  ACCOUNTING_REPORT = 'accounting_report',
  ACCOUNTING_TAX = 'accounting_tax',

  // 마케팅 관련
  MARKETING_CAMPAIGN = 'marketing_campaign',
  MARKETING_ANALYSIS = 'marketing_analysis',
  MARKETING_CONTENT = 'marketing_content',

  // 물류 관련
  LOGISTICS_SHIPPING = 'logistics_shipping',
  LOGISTICS_WAREHOUSE = 'logistics_warehouse',

  // 분석 관련
  ANALYTICS_SALES = 'analytics_sales',
  ANALYTICS_CUSTOMER = 'analytics_customer',
  ANALYTICS_PRODUCT = 'analytics_product',

  // 시스템 관련
  SYSTEM_STATUS = 'system_status',
  SYSTEM_CONFIG = 'system_config',

  // 기타
  UNKNOWN = 'unknown',
  AMBIGUOUS = 'ambiguous',
}

/**
 * 추출된 엔티티
 */
export interface ExtractedEntity {
  /** 엔티티 타입 */
  type: EntityType;
  /** 엔티티 값 */
  value: string;
  /** 원본 텍스트 */
  originalText: string;
  /** 신뢰도 (0-1) */
  confidence: number;
  /** 시작 위치 */
  startIndex?: number;
  /** 끝 위치 */
  endIndex?: number;
}

/**
 * 엔티티 타입
 */
export enum EntityType {
  ORDER_ID = 'order_id',
  CUSTOMER_ID = 'customer_id',
  PRODUCT_ID = 'product_id',
  PRODUCT_NAME = 'product_name',
  PHONE_NUMBER = 'phone_number',
  DATE = 'date',
  AMOUNT = 'amount',
  QUANTITY = 'quantity',
  CHANNEL = 'channel',
  TRACKING_NUMBER = 'tracking_number',
  ACTION = 'action',
  STATUS = 'status',
}

/**
 * 의도 분류 결과
 */
export interface IntentResult {
  /** 주요 의도 카테고리 */
  primaryIntent: IntentCategory;
  /** 주요 에이전트 ID */
  primaryAgentId: string;
  /** 신뢰도 (0-1) */
  confidence: number;
  /** 대안 에이전트 목록 */
  alternativeAgents: {
    agentId: string;
    confidence: number;
    reason: string;
  }[];
  /** 추출된 엔티티 */
  entities: ExtractedEntity[];
  /** 필요한 추가 컨텍스트 */
  requiredContext: string[];
  /** 애매한 요청인지 여부 */
  isAmbiguous: boolean;
  /** 명확화가 필요한 경우 질문 */
  clarificationQuestion?: string;
  /** 추천 워크플로우 ID */
  suggestedWorkflowId?: string;
}

// =============================================================================
// 에이전트 라우팅 관련 타입
// =============================================================================

/**
 * 에이전트 정보 (라우팅용)
 */
export interface AgentInfo {
  /** 에이전트 ID */
  id: string;
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 설명 */
  description: string;
  /** 담당 의도 카테고리 */
  categories: IntentCategory[];
  /** 트리거 키워드 */
  keywords: string[];
  /** 우선순위 (높을수록 우선) */
  priority: number;
  /** 담당 영역 설명 */
  scope: string;
  /** 서브 에이전트 ID 목록 */
  subAgentIds: string[];
  /** 활성화 여부 */
  enabled: boolean;
}

/**
 * 라우팅 결정
 */
export interface RoutingDecision {
  /** 대상 에이전트 ID */
  targetAgentId: string;
  /** 라우팅 유형 */
  routingType: RoutingType;
  /** 신뢰도 */
  confidence: number;
  /** 라우팅 사유 */
  reason: string;
  /** 사용자 확인 필요 여부 */
  needsConfirmation: boolean;
  /** 확인 옵션 */
  confirmationOptions?: ConfirmationOption[];
  /** 워크플로우 실행 여부 */
  executeWorkflow: boolean;
  /** 워크플로우 ID */
  workflowId?: string;
  /** 전달할 데이터 */
  payload: Record<string, unknown>;
}

/**
 * 라우팅 유형
 */
export enum RoutingType {
  /** 단일 에이전트 직접 라우팅 */
  DIRECT = 'direct',
  /** 워크플로우 실행 */
  WORKFLOW = 'workflow',
  /** 사용자 선택 필요 */
  USER_CHOICE = 'user_choice',
  /** 여러 에이전트 병렬 실행 */
  PARALLEL = 'parallel',
  /** 순차 실행 */
  SEQUENTIAL = 'sequential',
  /** 조건부 라우팅 */
  CONDITIONAL = 'conditional',
}

/**
 * 확인 옵션
 */
export interface ConfirmationOption {
  /** 옵션 ID */
  id: string;
  /** 표시 텍스트 */
  label: string;
  /** 설명 */
  description: string;
  /** 대상 에이전트 ID */
  agentId: string;
  /** 아이콘 */
  icon?: string;
}

// =============================================================================
// 키워드 매핑 관련 타입
// =============================================================================

/**
 * 키워드 매핑 항목
 */
export interface KeywordMapping {
  /** 에이전트 ID */
  agentId: string;
  /** 키워드 목록 */
  keywords: string[];
  /** 키워드 우선순위 */
  priority: number;
  /** 의도 카테고리 */
  category: IntentCategory;
}

/**
 * 중복 키워드 처리 규칙
 */
export interface AmbiguousKeywordRule {
  /** 키워드 */
  keyword: string;
  /** 컨텍스트별 라우팅 규칙 */
  contextRules: {
    /** 컨텍스트 조건 */
    condition: ContextCondition;
    /** 대상 에이전트 ID */
    agentId: string;
    /** 우선순위 */
    priority: number;
  }[];
  /** 기본 에이전트 (조건 불일치 시) */
  defaultAgentId: string;
}

/**
 * 컨텍스트 조건
 */
export interface ContextCondition {
  /** 조건 타입 */
  type: 'entity_exists' | 'entity_value' | 'previous_intent' | 'keyword_present';
  /** 엔티티 타입 (entity_exists, entity_value인 경우) */
  entityType?: EntityType;
  /** 기대 값 (entity_value인 경우) */
  expectedValue?: string;
  /** 키워드 (keyword_present인 경우) */
  keyword?: string;
  /** 이전 의도 (previous_intent인 경우) */
  previousIntent?: IntentCategory;
}

// =============================================================================
// 워크플로우 관련 타입
// =============================================================================

/**
 * 복합 워크플로우 정의
 */
export interface CompositeWorkflow {
  /** 워크플로우 ID */
  id: string;
  /** 워크플로우 이름 */
  name: string;
  /** 트리거 키워드/패턴 */
  triggers: string[];
  /** 트리거 의도 */
  triggerIntents: IntentCategory[];
  /** 워크플로우 단계 */
  steps: WorkflowStepDefinition[];
  /** 에러 처리 전략 */
  errorStrategy: 'stop' | 'skip' | 'retry' | 'rollback';
  /** 타임아웃 (밀리초) */
  timeout: number;
  /** 설명 */
  description: string;
}

/**
 * 워크플로우 단계 정의
 */
export interface WorkflowStepDefinition {
  /** 단계 ID */
  stepId: string;
  /** 단계 이름 */
  name: string;
  /** 담당 에이전트 ID */
  agentId: string;
  /** 액션 */
  action: string;
  /** 이전 단계에서 전달받을 데이터 매핑 */
  inputMapping?: Record<string, string>;
  /** 다음 단계로 전달할 데이터 매핑 */
  outputMapping?: Record<string, string>;
  /** 조건부 실행 */
  condition?: WorkflowConditionDefinition;
  /** 병렬 실행 가능 여부 */
  parallel?: boolean;
  /** 병렬 그룹 ID */
  parallelGroupId?: string;
  /** 필수 여부 */
  required: boolean;
  /** 재시도 횟수 */
  maxRetries: number;
}

/**
 * 워크플로우 조건 정의
 */
export interface WorkflowConditionDefinition {
  /** 조건 타입 */
  type: 'result_success' | 'result_value' | 'entity_exists' | 'custom';
  /** 이전 단계 ID */
  previousStepId?: string;
  /** 필드 경로 */
  field?: string;
  /** 연산자 */
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  /** 비교 값 */
  value?: unknown;
  /** 커스텀 조건 함수명 */
  customFunction?: string;
}

/**
 * 워크플로우 실행 상태
 */
export interface WorkflowExecutionState {
  /** 실행 ID */
  executionId: string;
  /** 워크플로우 ID */
  workflowId: string;
  /** 현재 단계 인덱스 */
  currentStepIndex: number;
  /** 상태 */
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 단계별 결과 */
  stepResults: Map<string, TaskResult>;
  /** 컨텍스트 데이터 */
  context: Record<string, unknown>;
  /** 에러 정보 */
  error?: {
    stepId: string;
    message: string;
    recoverable: boolean;
  };
}

// =============================================================================
// 사용자 요청 관련 타입
// =============================================================================

/**
 * 사용자 요청
 */
export interface UserRequest {
  /** 요청 ID */
  requestId: string;
  /** 원본 입력 텍스트 */
  rawInput: string;
  /** 정규화된 입력 */
  normalizedInput: string;
  /** 요청 시간 */
  timestamp: Date;
  /** 사용자 ID */
  userId?: string;
  /** 세션 ID */
  sessionId?: string;
  /** 이전 요청 ID (대화 연속성) */
  previousRequestId?: string;
  /** 추가 컨텍스트 */
  context?: Record<string, unknown>;
}

/**
 * Supervisor 응답
 */
export interface SupervisorResponse {
  /** 요청 ID */
  requestId: string;
  /** 성공 여부 */
  success: boolean;
  /** 응답 유형 */
  responseType: ResponseType;
  /** 메시지 */
  message: string;
  /** 실행된 에이전트 목록 */
  executedAgents: {
    agentId: string;
    result: AgentResult;
  }[];
  /** 사용자 선택 필요 여부 */
  needsUserInput: boolean;
  /** 선택 옵션 */
  options?: ConfirmationOption[];
  /** 다음 추천 액션 */
  suggestedNextActions?: string[];
  /** 실행 시간 */
  executionTime: number;
}

/**
 * 응답 유형
 */
export enum ResponseType {
  /** 직접 처리 완료 */
  COMPLETED = 'completed',
  /** 사용자 선택 필요 */
  NEEDS_SELECTION = 'needs_selection',
  /** 추가 정보 필요 */
  NEEDS_INFO = 'needs_info',
  /** 승인 대기 */
  PENDING_APPROVAL = 'pending_approval',
  /** 처리 중 */
  IN_PROGRESS = 'in_progress',
  /** 에러 */
  ERROR = 'error',
}

// =============================================================================
// 대화 컨텍스트 관련 타입
// =============================================================================

/**
 * 대화 컨텍스트
 */
export interface ConversationContext {
  /** 세션 ID */
  sessionId: string;
  /** 사용자 ID */
  userId?: string;
  /** 최근 의도 히스토리 */
  recentIntents: IntentCategory[];
  /** 최근 에이전트 히스토리 */
  recentAgents: string[];
  /** 활성 엔티티 */
  activeEntities: Map<EntityType, ExtractedEntity>;
  /** 진행 중인 워크플로우 */
  activeWorkflow?: WorkflowExecutionState;
  /** 세션 시작 시간 */
  startedAt: Date;
  /** 마지막 활동 시간 */
  lastActivityAt: Date;
  /** 추가 컨텍스트 데이터 */
  data: Record<string, unknown>;
}

// =============================================================================
// 우선순위 관련 타입
// =============================================================================

/**
 * 요청 우선순위 레벨
 */
export enum PriorityLevel {
  P0_CRITICAL = 0,   // 즉시 처리 (시스템 장애, 긴급 CS)
  P1_HIGH = 1,       // 높은 우선순위 (고객 불만, 배송 문제)
  P2_MEDIUM = 2,     // 중간 우선순위 (일반 주문)
  P3_LOW = 3,        // 낮은 우선순위 (문의, 분석)
  P4_BACKGROUND = 4, // 백그라운드 (레포트, 배치)
  P5_DEFERRED = 5,   // 지연 가능 (비긴급 작업)
}

/**
 * 우선순위 결정 요소
 */
export interface PriorityFactors {
  /** 의도 카테고리별 기본 우선순위 */
  intentPriority: PriorityLevel;
  /** 키워드 기반 우선순위 조정 */
  keywordBoost: number;
  /** 고객 등급 기반 조정 */
  customerTierBoost: number;
  /** 금액 기반 조정 */
  amountBoost: number;
  /** 시간 기반 조정 (마감 임박 등) */
  timeBoost: number;
  /** 최종 우선순위 */
  finalPriority: PriorityLevel;
}
