/**
 * 썬데이허그 AI 에이전트 시스템 - 타입 정의
 *
 * 이 파일은 에이전트 시스템 전체에서 사용되는 모든 타입을 정의합니다.
 * TypeScript strict mode를 사용하여 타입 안전성을 보장합니다.
 */

// =============================================================================
// 기본 열거형 (Enums)
// =============================================================================

/**
 * 에이전트 상태
 */
export enum AgentStatus {
  IDLE = 'idle',           // 대기 중
  RUNNING = 'running',     // 실행 중
  PAUSED = 'paused',       // 일시 정지
  ERROR = 'error',         // 오류 발생
  STOPPED = 'stopped',     // 정지됨
}

/**
 * 태스크 상태
 */
export enum TaskStatus {
  PENDING = 'pending',           // 대기 중
  IN_PROGRESS = 'in_progress',   // 진행 중
  COMPLETED = 'completed',       // 완료
  FAILED = 'failed',             // 실패
  CANCELLED = 'cancelled',       // 취소됨
  REQUIRES_APPROVAL = 'requires_approval', // 승인 필요
}

/**
 * 승인 레벨 - 작업의 중요도에 따른 승인 단계
 */
export enum ApprovalLevel {
  NONE = 'none',           // 승인 불필요
  LOW = 'low',             // 낮은 중요도 - 자동 승인 가능
  MEDIUM = 'medium',       // 중간 중요도 - 담당자 승인 필요
  HIGH = 'high',           // 높은 중요도 - 관리자 승인 필요
  CRITICAL = 'critical',   // 최고 중요도 - 대표 승인 필요
}

/**
 * 알림 우선순위
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 알림 채널
 */
export enum NotificationChannel {
  KAKAO = 'kakao',
  SLACK = 'slack',
  EMAIL = 'email',
  SMS = 'sms',
}

/**
 * 판매 채널 타입
 */
export enum SalesChannel {
  COUPANG = 'coupang',
  NAVER = 'naver',
  CAFE24 = 'cafe24',
  GMARKET = 'gmarket',
  ELEVEN_ST = '11st',
  AUCTION = 'auction',
  INTERPARK = 'interpark',
  TMON = 'tmon',
  WEMAKEPRICE = 'wemakeprice',
  SSG = 'ssg',
  LOTTE_ON = 'lotte_on',
  MANUAL = 'manual',
}

// =============================================================================
// 에이전트 관련 타입
// =============================================================================

/**
 * 에이전트 설정 인터페이스
 */
export interface AgentConfig {
  /** 에이전트 고유 ID */
  id: string;
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 설명 */
  description: string;
  /** 활성화 여부 */
  enabled: boolean;
  /** 실행 간격 (cron 표현식 또는 밀리초) */
  schedule?: string | number;
  /** 재시도 횟수 */
  maxRetries: number;
  /** 재시도 간격 (밀리초) */
  retryDelay: number;
  /** 타임아웃 (밀리초) */
  timeout: number;
  /** 승인 레벨 */
  approvalLevel: ApprovalLevel;
  /** 추가 설정 */
  metadata?: Record<string, unknown>;
}

/**
 * 에이전트 실행 컨텍스트
 */
export interface AgentContext {
  /** 실행 ID */
  executionId: string;
  /** 시작 시간 */
  startedAt: Date;
  /** 호출한 에이전트 ID (있는 경우) */
  callerAgentId?: string;
  /** 사용자 ID (수동 실행인 경우) */
  userId?: string;
  /** 실행 환경 */
  environment: 'development' | 'staging' | 'production';
  /** 추가 컨텍스트 데이터 */
  data?: Record<string, unknown>;
}

/**
 * 에이전트 실행 결과
 */
export interface AgentResult<T = unknown> {
  /** 성공 여부 */
  success: boolean;
  /** 결과 데이터 */
  data?: T;
  /** 에러 정보 */
  error?: AgentError;
  /** 실행 시간 (밀리초) */
  executionTime: number;
  /** 처리된 아이템 수 */
  processedCount?: number;
  /** 실패한 아이템 수 */
  failedCount?: number;
  /** 경고 메시지 목록 */
  warnings?: string[];
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 에이전트 에러 정보
 */
export interface AgentError {
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

// =============================================================================
// 태스크 관련 타입
// =============================================================================

/**
 * 태스크 페이로드 - 에이전트가 처리할 작업 데이터
 */
export interface TaskPayload<T = unknown> {
  /** 태스크 ID */
  taskId: string;
  /** 태스크 타입 */
  type: string;
  /** 우선순위 (1-10, 높을수록 우선) */
  priority: number;
  /** 태스크 데이터 */
  data: T;
  /** 생성 시간 */
  createdAt: Date;
  /** 만료 시간 */
  expiresAt?: Date;
  /** 재시도 횟수 */
  retryCount: number;
  /** 부모 태스크 ID */
  parentTaskId?: string;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 태스크 실행 결과
 */
export interface TaskResult<T = unknown> {
  /** 태스크 ID */
  taskId: string;
  /** 상태 */
  status: TaskStatus;
  /** 결과 데이터 */
  data?: T;
  /** 에러 정보 */
  error?: AgentError;
  /** 완료 시간 */
  completedAt?: Date;
  /** 실행 시간 (밀리초) */
  executionTime: number;
}

// =============================================================================
// 워크플로우 관련 타입
// =============================================================================

/**
 * 워크플로우 단계
 */
export interface WorkflowStep {
  /** 단계 ID */
  id: string;
  /** 단계 이름 */
  name: string;
  /** 담당 에이전트 ID */
  agentId: string;
  /** 다음 단계 ID 목록 (분기 가능) */
  nextSteps?: string[];
  /** 조건부 분기 */
  conditions?: WorkflowCondition[];
  /** 재시도 설정 */
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 필수 여부 */
  required: boolean;
}

/**
 * 워크플로우 조건
 */
export interface WorkflowCondition {
  /** 조건 필드 */
  field: string;
  /** 연산자 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  /** 비교 값 */
  value: unknown;
  /** 다음 단계 ID */
  nextStepId: string;
}

/**
 * 워크플로우 설정
 */
export interface WorkflowConfig {
  /** 워크플로우 ID */
  id: string;
  /** 워크플로우 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 버전 */
  version: string;
  /** 시작 단계 ID */
  startStepId: string;
  /** 단계 목록 */
  steps: WorkflowStep[];
  /** 전역 타임아웃 (밀리초) */
  globalTimeout?: number;
  /** 오류 처리 전략 */
  errorStrategy: 'stop' | 'skip' | 'retry';
  /** 활성화 여부 */
  enabled: boolean;
}

/**
 * 워크플로우 실행 상태
 */
export interface WorkflowExecution {
  /** 실행 ID */
  executionId: string;
  /** 워크플로우 ID */
  workflowId: string;
  /** 현재 단계 ID */
  currentStepId: string;
  /** 상태 */
  status: TaskStatus;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 단계별 결과 */
  stepResults: Map<string, TaskResult>;
  /** 컨텍스트 데이터 */
  context: Record<string, unknown>;
}

// =============================================================================
// 승인 관련 타입
// =============================================================================

/**
 * 승인 요청
 */
export interface ApprovalRequest {
  /** 승인 요청 ID */
  id: string;
  /** 요청 에이전트 ID */
  requesterId: string;
  /** 승인 레벨 */
  level: ApprovalLevel;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 관련 데이터 */
  data: unknown;
  /** 예상 영향 */
  impact?: {
    /** 영향받는 주문 수 */
    orderCount?: number;
    /** 영향받는 금액 */
    amount?: number;
    /** 영향받는 고객 수 */
    customerCount?: number;
  };
  /** 요청 시간 */
  requestedAt: Date;
  /** 만료 시간 */
  expiresAt: Date;
  /** 상태 */
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  /** 승인자 ID */
  approverId?: string;
  /** 승인/거절 시간 */
  resolvedAt?: Date;
  /** 승인/거절 사유 */
  reason?: string;
}

/**
 * 승인 응답
 */
export interface ApprovalResponse {
  /** 승인 요청 ID */
  requestId: string;
  /** 승인 여부 */
  approved: boolean;
  /** 승인자 ID */
  approverId: string;
  /** 사유 */
  reason?: string;
  /** 응답 시간 */
  respondedAt: Date;
}

// =============================================================================
// 채널별 주문 타입
// =============================================================================

/**
 * 기본 주문 인터페이스
 */
export interface BaseOrder {
  /** 내부 주문 ID */
  id: string;
  /** 채널 주문 ID */
  channelOrderId: string;
  /** 판매 채널 */
  channel: SalesChannel;
  /** 주문 상태 */
  status: OrderStatus;
  /** 주문 일시 */
  orderedAt: Date;
  /** 고객 정보 */
  customer: CustomerInfo;
  /** 배송 정보 */
  shipping: ShippingInfo;
  /** 주문 상품 목록 */
  items: OrderItem[];
  /** 결제 정보 */
  payment: PaymentInfo;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 주문 상태
 */
export enum OrderStatus {
  PENDING = 'pending',                 // 결제 대기
  PAID = 'paid',                       // 결제 완료
  PREPARING = 'preparing',             // 상품 준비 중
  SHIPPING = 'shipping',               // 배송 중
  DELIVERED = 'delivered',             // 배송 완료
  CANCELLED = 'cancelled',             // 취소됨
  REFUND_REQUESTED = 'refund_requested', // 환불 요청
  REFUNDED = 'refunded',               // 환불 완료
  EXCHANGE_REQUESTED = 'exchange_requested', // 교환 요청
  EXCHANGED = 'exchanged',             // 교환 완료
}

/**
 * 고객 정보
 */
export interface CustomerInfo {
  /** 고객 ID (채널별) */
  customerId?: string;
  /** 이름 */
  name: string;
  /** 전화번호 */
  phone: string;
  /** 이메일 */
  email?: string;
}

/**
 * 배송 정보
 */
export interface ShippingInfo {
  /** 수령인 */
  receiverName: string;
  /** 수령인 전화번호 */
  receiverPhone: string;
  /** 우편번호 */
  zipCode: string;
  /** 주소 */
  address: string;
  /** 상세 주소 */
  addressDetail?: string;
  /** 배송 메모 */
  memo?: string;
  /** 택배사 */
  courier?: string;
  /** 운송장 번호 */
  trackingNumber?: string;
}

/**
 * 주문 상품
 */
export interface OrderItem {
  /** 상품 ID */
  productId: string;
  /** 채널 상품 ID */
  channelProductId: string;
  /** 상품명 */
  productName: string;
  /** 옵션명 */
  optionName?: string;
  /** 수량 */
  quantity: number;
  /** 단가 */
  unitPrice: number;
  /** 할인 금액 */
  discount: number;
  /** 총 금액 */
  totalPrice: number;
}

/**
 * 결제 정보
 */
export interface PaymentInfo {
  /** 결제 방법 */
  method: 'card' | 'bank_transfer' | 'virtual_account' | 'mobile' | 'point' | 'mixed';
  /** 총 결제 금액 */
  totalAmount: number;
  /** 배송비 */
  shippingFee: number;
  /** 할인 금액 */
  discountAmount: number;
  /** 사용 포인트 */
  usedPoints?: number;
  /** 결제 일시 */
  paidAt?: Date;
}

/**
 * 쿠팡 주문 (채널 특화 필드 포함)
 */
export interface CoupangOrder extends BaseOrder {
  channel: SalesChannel.COUPANG;
  /** 쿠팡 특화 필드 */
  coupang: {
    /** 로켓배송 여부 */
    isRocketDelivery: boolean;
    /** 로켓와우 여부 */
    isRocketWow: boolean;
    /** 쿠팡 판매자 상품 ID */
    vendorItemId: string;
    /** 출고지 ID */
    outboundShippingPlaceCode?: string;
  };
}

/**
 * 네이버 주문 (채널 특화 필드 포함)
 */
export interface NaverOrder extends BaseOrder {
  channel: SalesChannel.NAVER;
  /** 네이버 특화 필드 */
  naver: {
    /** 스마트스토어 ID */
    smartStoreId: string;
    /** 네이버페이 주문번호 */
    payOrderId: string;
    /** 톡톡 문의 여부 */
    hasTalkTalkInquiry: boolean;
    /** 구매확정 여부 */
    isPurchaseConfirmed: boolean;
  };
}

/**
 * Cafe24 주문 (채널 특화 필드 포함)
 */
export interface Cafe24Order extends BaseOrder {
  channel: SalesChannel.CAFE24;
  /** Cafe24 특화 필드 */
  cafe24: {
    /** 몰 ID */
    mallId: string;
    /** 회원 등급 */
    memberGrade?: string;
    /** 적립금 사용 */
    usedMileage?: number;
  };
}

// =============================================================================
// 알림 관련 타입
// =============================================================================

/**
 * 알림 메시지
 */
export interface NotificationMessage {
  /** 알림 ID */
  id: string;
  /** 채널 */
  channel: NotificationChannel;
  /** 우선순위 */
  priority: NotificationPriority;
  /** 수신자 */
  recipients: string[];
  /** 제목 */
  title: string;
  /** 내용 */
  content: string;
  /** 링크 */
  link?: string;
  /** 첨부 데이터 */
  attachments?: NotificationAttachment[];
  /** 전송 예정 시간 */
  scheduledAt?: Date;
  /** 전송 시간 */
  sentAt?: Date;
  /** 전송 상태 */
  status: 'pending' | 'sent' | 'failed';
}

/**
 * 알림 첨부
 */
export interface NotificationAttachment {
  /** 타입 */
  type: 'image' | 'file' | 'button';
  /** URL 또는 데이터 */
  data: string;
  /** 이름 */
  name?: string;
}

// =============================================================================
// 로깅 관련 타입
// =============================================================================

/**
 * 로그 레벨
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * 로그 엔트리
 */
export interface LogEntry {
  /** 타임스탬프 */
  timestamp: Date;
  /** 로그 레벨 */
  level: LogLevel;
  /** 에이전트 ID */
  agentId: string;
  /** 실행 ID */
  executionId?: string;
  /** 메시지 */
  message: string;
  /** 추가 데이터 */
  data?: Record<string, unknown>;
  /** 에러 정보 */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// =============================================================================
// 유틸리티 타입
// =============================================================================

/**
 * Nullable 타입
 */
export type Nullable<T> = T | null;

/**
 * Optional 타입
 */
export type Optional<T> = T | undefined;

/**
 * 비동기 결과 타입
 */
export type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 페이지네이션 결과
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 날짜 범위
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 채널 API 자격 증명
 */
export interface ChannelCredentials {
  channel: SalesChannel;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}
