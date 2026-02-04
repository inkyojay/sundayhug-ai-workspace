/**
 * Crisis Agent 전용 타입 정의
 * LANE 4: Analytics & Growth
 */

// =============================================================================
// 공통 열거형
// =============================================================================

/**
 * 위기 심각도 레벨
 */
export enum CrisisSeverity {
  LOW = 'low',           // 경미 - 일반 모니터링
  MEDIUM = 'medium',     // 보통 - 주의 필요
  HIGH = 'high',         // 심각 - 즉시 대응 필요
  CRITICAL = 'critical', // 위기 - 긴급 대응
}

/**
 * 위기 상태
 */
export enum CrisisStatus {
  DETECTED = 'detected',             // 감지됨
  INVESTIGATING = 'investigating',   // 조사 중
  RESPONDING = 'responding',         // 대응 중
  MONITORING = 'monitoring',         // 모니터링 중
  RESOLVED = 'resolved',             // 해결됨
  CLOSED = 'closed',                 // 종료
}

/**
 * 위기 카테고리
 */
export enum CrisisCategory {
  PRODUCT_SAFETY = 'product_safety',       // 제품 안전
  QUALITY_ISSUE = 'quality_issue',         // 품질 문제
  CUSTOMER_COMPLAINT = 'customer_complaint', // 고객 불만
  NEGATIVE_REVIEW = 'negative_review',     // 악성 리뷰
  SOCIAL_MEDIA = 'social_media',           // SNS 이슈
  LEGAL = 'legal',                         // 법적 문제
  SUPPLY_CHAIN = 'supply_chain',           // 공급망 문제
  REPUTATION = 'reputation',               // 평판 위기
  OPERATIONAL = 'operational',             // 운영 문제
  EXTERNAL = 'external',                   // 외부 요인
}

/**
 * 대응 액션 타입
 */
export enum ResponseActionType {
  IMMEDIATE_RESPONSE = 'immediate_response',     // 즉시 대응
  CUSTOMER_CONTACT = 'customer_contact',         // 고객 연락
  REFUND_OFFER = 'refund_offer',                 // 환불 제안
  REPLACEMENT_OFFER = 'replacement_offer',       // 교환 제안
  PUBLIC_STATEMENT = 'public_statement',         // 공개 성명
  INTERNAL_ESCALATION = 'internal_escalation',   // 내부 에스컬레이션
  PRODUCT_RECALL = 'product_recall',             // 제품 리콜
  LEGAL_ACTION = 'legal_action',                 // 법적 조치
  MONITORING = 'monitoring',                     // 모니터링
}

/**
 * 모니터링 소스
 */
export enum MonitoringSource {
  REVIEW_PLATFORM = 'review_platform',     // 리뷰 플랫폼
  SOCIAL_MEDIA = 'social_media',           // SNS
  CS_TICKET = 'cs_ticket',                 // CS 티켓
  EMAIL = 'email',                         // 이메일
  PHONE = 'phone',                         // 전화
  NEWS = 'news',                           // 뉴스
  COMMUNITY = 'community',                 // 커뮤니티
  INTERNAL = 'internal',                   // 내부 보고
}

// =============================================================================
// 위기 감지 관련 타입
// =============================================================================

/**
 * 위기 이벤트
 */
export interface CrisisEvent {
  /** 이벤트 ID */
  id: string;
  /** 카테고리 */
  category: CrisisCategory;
  /** 심각도 */
  severity: CrisisSeverity;
  /** 상태 */
  status: CrisisStatus;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 감지 소스 */
  source: MonitoringSource;
  /** 감지 시간 */
  detectedAt: Date;
  /** 영향 범위 */
  impact: CrisisImpact;
  /** 관련 데이터 */
  relatedData: {
    orderId?: string;
    productId?: string;
    customerId?: string;
    reviewId?: string;
    urls?: string[];
  };
  /** 담당자 */
  assignedTo?: string;
  /** 태그 */
  tags: string[];
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 위기 영향 범위
 */
export interface CrisisImpact {
  /** 영향받는 고객 수 */
  affectedCustomers: number;
  /** 영향받는 주문 수 */
  affectedOrders: number;
  /** 예상 재정 손실 */
  estimatedFinancialImpact: number;
  /** 평판 영향도 (1-10) */
  reputationScore: number;
  /** 확산 가능성 (1-10) */
  viralPotential: number;
  /** 영향 지역 */
  affectedRegions?: string[];
}

/**
 * 모니터링 알림
 */
export interface MonitoringAlert {
  /** 알림 ID */
  id: string;
  /** 소스 */
  source: MonitoringSource;
  /** 알림 타입 */
  type: 'negative_review' | 'mention' | 'complaint' | 'trend' | 'threshold';
  /** 심각도 */
  severity: CrisisSeverity;
  /** 제목 */
  title: string;
  /** 내용 */
  content: string;
  /** 원본 URL */
  sourceUrl?: string;
  /** 감지 시간 */
  detectedAt: Date;
  /** 감성 점수 (-1 ~ 1) */
  sentimentScore?: number;
  /** 키워드 */
  keywords: string[];
  /** 처리 여부 */
  processed: boolean;
  /** 연결된 위기 ID */
  linkedCrisisId?: string;
}

/**
 * 리뷰 분석 결과
 */
export interface ReviewAnalysis {
  /** 리뷰 ID */
  reviewId: string;
  /** 플랫폼 */
  platform: string;
  /** 별점 */
  rating: number;
  /** 내용 */
  content: string;
  /** 감성 분석 */
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  /** 추출된 이슈 */
  extractedIssues: string[];
  /** 언급된 제품 */
  mentionedProducts: string[];
  /** 위험도 점수 */
  riskScore: number;
  /** 대응 필요 여부 */
  requiresResponse: boolean;
  /** 분석 시간 */
  analyzedAt: Date;
}

// =============================================================================
// 대응 관련 타입
// =============================================================================

/**
 * 대응 계획
 */
export interface ResponsePlan {
  /** 계획 ID */
  id: string;
  /** 위기 ID 참조 */
  crisisId: string;
  /** 계획 제목 */
  title: string;
  /** 액션 목록 */
  actions: ResponseAction[];
  /** 우선순위 */
  priority: number;
  /** 예상 해결 시간 */
  estimatedResolutionTime: number; // 시간 단위
  /** 필요 리소스 */
  requiredResources: string[];
  /** 승인 필요 여부 */
  requiresApproval: boolean;
  /** 승인자 */
  approvedBy?: string;
  /** 상태 */
  status: 'draft' | 'pending_approval' | 'approved' | 'executing' | 'completed';
  /** 생성일 */
  createdAt: Date;
}

/**
 * 대응 액션
 */
export interface ResponseAction {
  /** 액션 ID */
  id: string;
  /** 액션 타입 */
  type: ResponseActionType;
  /** 설명 */
  description: string;
  /** 담당자 */
  assignee: string;
  /** 순서 */
  order: number;
  /** 상태 */
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** 마감일 */
  dueDate?: Date;
  /** 완료일 */
  completedAt?: Date;
  /** 결과 메모 */
  resultNote?: string;
  /** 자동화 가능 여부 */
  automatable: boolean;
}

/**
 * SOP (Standard Operating Procedure)
 */
export interface SOP {
  /** SOP ID */
  id: string;
  /** 이름 */
  name: string;
  /** 적용 카테고리 */
  category: CrisisCategory;
  /** 적용 심각도 */
  severityLevel: CrisisSeverity;
  /** 단계 목록 */
  steps: SOPStep[];
  /** 템플릿 메시지 */
  templates: {
    id: string;
    name: string;
    channel: string;
    content: string;
  }[];
  /** 에스컬레이션 규칙 */
  escalationRules: {
    condition: string;
    escalateTo: string;
    timeLimit: number;
  }[];
  /** 활성화 여부 */
  active: boolean;
  /** 마지막 업데이트 */
  updatedAt: Date;
}

/**
 * SOP 단계
 */
export interface SOPStep {
  /** 단계 번호 */
  stepNumber: number;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 필수 여부 */
  required: boolean;
  /** 최대 소요 시간 (분) */
  maxDuration: number;
  /** 담당 역할 */
  responsibleRole: string;
  /** 체크리스트 */
  checklist: string[];
}

// =============================================================================
// 복구 및 사후 분석 타입
// =============================================================================

/**
 * 위기 해결 보고서
 */
export interface CrisisResolutionReport {
  /** 보고서 ID */
  id: string;
  /** 위기 ID 참조 */
  crisisId: string;
  /** 요약 */
  summary: {
    title: string;
    category: CrisisCategory;
    severity: CrisisSeverity;
    duration: number; // 시간 단위
    totalCost: number;
  };
  /** 타임라인 */
  timeline: {
    event: string;
    timestamp: Date;
    actor: string;
  }[];
  /** 취해진 조치 */
  actionsTaken: {
    action: string;
    result: string;
    effectiveness: number; // 1-10
  }[];
  /** 영향 분석 */
  impactAnalysis: {
    customersAffected: number;
    ordersAffected: number;
    financialLoss: number;
    reputationImpact: string;
  };
  /** 근본 원인 분석 */
  rootCauseAnalysis: {
    primaryCause: string;
    contributingFactors: string[];
    evidence: string[];
  };
  /** 교훈 */
  lessonsLearned: string[];
  /** 재발 방지 대책 */
  preventiveMeasures: {
    measure: string;
    owner: string;
    dueDate: Date;
    status: 'planned' | 'in_progress' | 'completed';
  }[];
  /** 생성일 */
  createdAt: Date;
}

/**
 * 재발 방지 조치
 */
export interface PreventiveMeasure {
  /** 조치 ID */
  id: string;
  /** 관련 위기 ID */
  relatedCrisisId: string;
  /** 조치 내용 */
  description: string;
  /** 담당자 */
  owner: string;
  /** 마감일 */
  dueDate: Date;
  /** 우선순위 */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** 상태 */
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  /** 효과 검증일 */
  verifiedAt?: Date;
  /** 효과 메모 */
  effectivenessNote?: string;
}

// =============================================================================
// 서브에이전트 태스크 타입
// =============================================================================

/**
 * 모니터링 서브에이전트 태스크
 */
export interface MonitoringTaskPayload {
  action: 'scan_reviews' | 'scan_social' | 'analyze_sentiment' | 'check_threshold';
  sources?: MonitoringSource[];
  keywords?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  thresholds?: {
    negativeReviewCount?: number;
    sentimentScore?: number;
    complaintRate?: number;
  };
}

/**
 * 대응 서브에이전트 태스크
 */
export interface ResponseTaskPayload {
  action: 'create_plan' | 'execute_sop' | 'send_response' | 'escalate';
  crisisId: string;
  sopId?: string;
  responseTemplate?: string;
  escalationTarget?: string;
  customActions?: Partial<ResponseAction>[];
}

/**
 * 복구 서브에이전트 태스크
 */
export interface RecoveryTaskPayload {
  action: 'analyze_root_cause' | 'generate_report' | 'create_preventive_measure' | 'verify_resolution';
  crisisId: string;
  reportType?: 'summary' | 'detailed' | 'executive';
  measureDetails?: Partial<PreventiveMeasure>;
}
