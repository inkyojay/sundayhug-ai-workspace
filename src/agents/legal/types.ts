/**
 * Legal Agent 타입 정의
 * LANE 3 - Management & Compliance
 */

import { DateRange } from '../../types';

// =============================================================================
// 열거형 (Enums)
// =============================================================================

/**
 * 인증 유형
 */
export enum CertificationType {
  KC = 'kc',                         // KC 안전인증
  KC_SELF = 'kc_self',               // KC 자율안전확인
  KC_SUPPLIER = 'kc_supplier',       // KC 공급자적합성확인
  HACCP = 'haccp',                   // HACCP
  ORGANIC = 'organic',               // 유기농 인증
  HALAL = 'halal',                   // 할랄 인증
  ISO = 'iso',                       // ISO 인증
  CE = 'ce',                         // CE 마킹
  FDA = 'fda',                       // FDA 승인
  OTHER = 'other',                   // 기타
}

/**
 * 인증 상태
 */
export enum CertificationStatus {
  VALID = 'valid',                   // 유효
  EXPIRING_SOON = 'expiring_soon',   // 만료 임박 (90일 이내)
  EXPIRED = 'expired',               // 만료됨
  SUSPENDED = 'suspended',           // 정지됨
  PENDING_RENEWAL = 'pending_renewal', // 갱신 중
  REVOKED = 'revoked',               // 취소됨
}

/**
 * 광고 심의 상태
 */
export enum AdReviewStatus {
  PENDING = 'pending',               // 검토 대기
  APPROVED = 'approved',             // 승인
  REJECTED = 'rejected',             // 거절
  REVISION_REQUIRED = 'revision_required', // 수정 필요
  CONDITIONALLY_APPROVED = 'conditionally_approved', // 조건부 승인
}

/**
 * 광고 위반 유형
 */
export enum AdViolationType {
  FALSE_CLAIM = 'false_claim',           // 허위 과장 광고
  UNVERIFIED_CLAIM = 'unverified_claim', // 미인증 효능 표기
  MISLEADING = 'misleading',             // 소비자 오인 유발
  COMPARATIVE = 'comparative',           // 비교 광고 위반
  PRICING = 'pricing',                   // 가격 표시 위반
  SAFETY = 'safety',                     // 안전 정보 누락
  PERSONAL_INFO = 'personal_info',       // 개인정보 관련 위반
  COPYRIGHT = 'copyright',               // 저작권 관련 위반
  OTHER = 'other',                       // 기타
}

/**
 * 규정 유형
 */
export enum RegulationType {
  ECOMMERCE_ACT = 'ecommerce_act',         // 전자상거래법
  CONSUMER_PROTECTION = 'consumer_protection', // 소비자보호법
  PERSONAL_INFO = 'personal_info',         // 개인정보보호법
  PRODUCT_LIABILITY = 'product_liability', // 제조물책임법
  FAIR_TRADE = 'fair_trade',               // 공정거래법
  LABELING = 'labeling',                   // 표시광고법
  FOOD_SANITATION = 'food_sanitation',     // 식품위생법
  CHILDREN_PRODUCT = 'children_product',   // 어린이제품안전법
  OTHER = 'other',                         // 기타
}

/**
 * 컴플라이언스 상태
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',             // 준수
  NON_COMPLIANT = 'non_compliant',     // 미준수
  PARTIAL = 'partial',                 // 부분 준수
  UNDER_REVIEW = 'under_review',       // 검토 중
  REMEDIATION = 'remediation',         // 개선 조치 중
}

/**
 * 위험 수준
 */
export enum RiskLevel {
  CRITICAL = 'critical',   // 심각 (즉시 조치 필요)
  HIGH = 'high',           // 높음
  MEDIUM = 'medium',       // 중간
  LOW = 'low',             // 낮음
  NONE = 'none',           // 없음
}

// =============================================================================
// 인증 관리 관련 타입
// =============================================================================

/**
 * 인증서 정보
 */
export interface Certification {
  /** 인증 ID */
  id: string;
  /** 인증 유형 */
  type: CertificationType;
  /** 인증 번호 */
  certificationNumber: string;
  /** 인증 상태 */
  status: CertificationStatus;
  /** 인증 기관 */
  issuingAuthority: string;
  /** 인증 대상 상품 */
  products: CertifiedProduct[];
  /** 발급일 */
  issueDate: Date;
  /** 만료일 */
  expiryDate: Date;
  /** 갱신 필요 일자 (만료 90일 전) */
  renewalDueDate: Date;
  /** 인증서 파일 URL */
  certificateUrl?: string;
  /** 갱신 이력 */
  renewalHistory?: RenewalRecord[];
  /** 메모 */
  notes?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 인증 대상 상품
 */
export interface CertifiedProduct {
  /** 상품 ID */
  productId: string;
  /** 상품명 */
  productName: string;
  /** 모델명 */
  modelName?: string;
  /** SKU */
  sku?: string;
}

/**
 * 갱신 이력
 */
export interface RenewalRecord {
  /** 갱신 ID */
  id: string;
  /** 이전 인증 번호 */
  previousCertNumber: string;
  /** 새 인증 번호 */
  newCertNumber: string;
  /** 갱신일 */
  renewalDate: Date;
  /** 비용 */
  cost?: number;
  /** 메모 */
  notes?: string;
}

/**
 * 인증 만료 알림
 */
export interface CertificationExpiryAlert {
  /** 인증 ID */
  certificationId: string;
  /** 인증 유형 */
  certificationType: CertificationType;
  /** 인증 번호 */
  certificationNumber: string;
  /** 만료일 */
  expiryDate: Date;
  /** 남은 일수 */
  daysUntilExpiry: number;
  /** 긴급도 */
  urgency: 'urgent' | 'warning' | 'notice';
  /** 영향 받는 상품 수 */
  affectedProductCount: number;
  /** 권장 조치 */
  recommendedAction: string;
}

// =============================================================================
// 광고 심의 관련 타입
// =============================================================================

/**
 * 광고 심의 요청
 */
export interface AdReviewRequest {
  /** 심의 ID */
  id: string;
  /** 광고 유형 */
  adType: 'product_detail' | 'banner' | 'video' | 'social_post' | 'email' | 'other';
  /** 광고 제목 */
  title: string;
  /** 광고 내용 */
  content: string;
  /** 이미지 URL 목록 */
  imageUrls?: string[];
  /** 관련 상품 */
  relatedProducts?: string[];
  /** 심의 상태 */
  status: AdReviewStatus;
  /** 요청일 */
  requestedAt: Date;
  /** 심의 결과 */
  reviewResult?: AdReviewResult;
  /** 요청자 */
  requestedBy?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 광고 심의 결과
 */
export interface AdReviewResult {
  /** 심의 상태 */
  status: AdReviewStatus;
  /** 심의자 */
  reviewedBy: 'ai' | 'human';
  /** 심의일 */
  reviewedAt: Date;
  /** 위반 항목 */
  violations?: AdViolation[];
  /** 수정 요청 사항 */
  revisionRequests?: string[];
  /** 승인 조건 (조건부 승인 시) */
  approvalConditions?: string[];
  /** 심의 의견 */
  comments?: string;
}

/**
 * 광고 위반 항목
 */
export interface AdViolation {
  /** 위반 유형 */
  type: AdViolationType;
  /** 위반 심각도 */
  severity: RiskLevel;
  /** 위반 내용 */
  description: string;
  /** 위반 위치 (문장, 이미지 등) */
  location?: string;
  /** 관련 법규 */
  relatedRegulation?: string;
  /** 수정 권고 */
  suggestion?: string;
}

/**
 * 광고 문구 검토 결과
 */
export interface AdCopyCheckResult {
  /** 원본 문구 */
  originalCopy: string;
  /** 검토 통과 여부 */
  passed: boolean;
  /** 위험 점수 (0-100) */
  riskScore: number;
  /** 발견된 이슈 */
  issues: AdCopyIssue[];
  /** 수정 제안 */
  suggestions?: string[];
  /** 검토일 */
  checkedAt: Date;
}

/**
 * 광고 문구 이슈
 */
export interface AdCopyIssue {
  /** 이슈 유형 */
  type: AdViolationType;
  /** 문제 문구 */
  problematicText: string;
  /** 이슈 설명 */
  description: string;
  /** 심각도 */
  severity: RiskLevel;
  /** 대체 문구 제안 */
  suggestedReplacement?: string;
}

// =============================================================================
// 규정 준수 관련 타입
// =============================================================================

/**
 * 컴플라이언스 체크리스트
 */
export interface ComplianceChecklist {
  /** 체크리스트 ID */
  id: string;
  /** 규정 유형 */
  regulationType: RegulationType;
  /** 체크리스트 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 체크 항목 */
  items: ComplianceCheckItem[];
  /** 전체 상태 */
  overallStatus: ComplianceStatus;
  /** 준수율 */
  complianceRate: number;
  /** 마지막 검토일 */
  lastReviewedAt?: Date;
  /** 다음 검토 예정일 */
  nextReviewDueAt?: Date;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 컴플라이언스 체크 항목
 */
export interface ComplianceCheckItem {
  /** 항목 ID */
  id: string;
  /** 항목명 */
  title: string;
  /** 설명 */
  description: string;
  /** 필수 여부 */
  mandatory: boolean;
  /** 상태 */
  status: ComplianceStatus;
  /** 증빙 자료 */
  evidence?: string;
  /** 증빙 URL */
  evidenceUrl?: string;
  /** 마지막 확인일 */
  lastCheckedAt?: Date;
  /** 담당자 */
  assignee?: string;
  /** 메모 */
  notes?: string;
}

/**
 * 규정 위반 사항
 */
export interface RegulatoryViolation {
  /** 위반 ID */
  id: string;
  /** 규정 유형 */
  regulationType: RegulationType;
  /** 위반 상세 */
  description: string;
  /** 위험 수준 */
  riskLevel: RiskLevel;
  /** 발견일 */
  detectedAt: Date;
  /** 발견 경로 */
  detectionSource: 'monitoring' | 'audit' | 'complaint' | 'self_report';
  /** 상태 */
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  /** 시정 조치 */
  remediation?: RemediationAction;
  /** 관련 상품/서비스 */
  affectedItems?: string[];
  /** 잠재적 벌금/제재 */
  potentialPenalty?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 시정 조치
 */
export interface RemediationAction {
  /** 조치 ID */
  id: string;
  /** 조치 내용 */
  description: string;
  /** 담당자 */
  assignee: string;
  /** 기한 */
  dueDate: Date;
  /** 상태 */
  status: 'planned' | 'in_progress' | 'completed' | 'overdue';
  /** 완료일 */
  completedAt?: Date;
  /** 완료 증빙 */
  completionEvidence?: string;
}

/**
 * 개인정보 처리 현황
 */
export interface PrivacyComplianceStatus {
  /** 개인정보 처리방침 버전 */
  privacyPolicyVersion: string;
  /** 마지막 업데이트 */
  lastPolicyUpdate: Date;
  /** 동의 수집 상태 */
  consentCollection: {
    mandatory: boolean;
    marketing: boolean;
    thirdParty: boolean;
  };
  /** 보유 기간 준수 여부 */
  retentionCompliant: boolean;
  /** 암호화 상태 */
  encryptionStatus: {
    database: boolean;
    transmission: boolean;
    backup: boolean;
  };
  /** 접근 통제 상태 */
  accessControlStatus: boolean;
  /** 마지막 감사일 */
  lastAuditDate?: Date;
  /** 이슈 목록 */
  issues?: RegulatoryViolation[];
}

// =============================================================================
// 에이전트 실행 관련 타입
// =============================================================================

/**
 * 인증관리 태스크 페이로드
 */
export interface CertificationManagementTaskPayload {
  /** 작업 유형 */
  action: 'check_expiry' | 'initiate_renewal' | 'update_status' | 'generate_report';
  /** 인증 ID (특정 인증 대상 시) */
  certificationId?: string;
  /** 인증 유형 필터 */
  certificationTypes?: CertificationType[];
  /** 옵션 */
  options?: {
    /** 알림 발송 여부 */
    sendNotification?: boolean;
    /** 만료 임박 기준 일수 */
    expiryThresholdDays?: number;
  };
}

/**
 * 광고심의 태스크 페이로드
 */
export interface AdReviewTaskPayload {
  /** 작업 유형 */
  action: 'review' | 'check_copy' | 'batch_review';
  /** 광고 심의 요청 */
  adReviewRequest?: AdReviewRequest;
  /** 광고 문구 목록 (일괄 검토 시) */
  adCopies?: string[];
  /** 옵션 */
  options?: {
    /** 엄격 모드 */
    strictMode?: boolean;
    /** 자동 수정 제안 */
    autoSuggest?: boolean;
  };
}

/**
 * 규정준수 태스크 페이로드
 */
export interface ComplianceTaskPayload {
  /** 작업 유형 */
  action: 'audit' | 'check_privacy' | 'update_checklist' | 'generate_report';
  /** 규정 유형 */
  regulationType?: RegulationType;
  /** 체크리스트 ID */
  checklistId?: string;
  /** 기간 */
  period?: DateRange;
  /** 옵션 */
  options?: {
    /** 전체 감사 */
    fullAudit?: boolean;
    /** 자동 시정 조치 생성 */
    autoRemediation?: boolean;
  };
}

// =============================================================================
// 에이전트 결과 타입
// =============================================================================

/**
 * 인증관리 결과
 */
export interface CertificationManagementResult {
  /** 만료 임박 인증 */
  expiringCertifications?: CertificationExpiryAlert[];
  /** 갱신된 인증 */
  renewedCertifications?: Certification[];
  /** 전체 인증 현황 */
  certificationSummary?: {
    total: number;
    valid: number;
    expiringSoon: number;
    expired: number;
  };
}

/**
 * 광고심의 결과
 */
export interface AdReviewResult {
  /** 심의된 광고 */
  reviewedAds?: AdReviewRequest[];
  /** 문구 검토 결과 */
  copyCheckResults?: AdCopyCheckResult[];
  /** 요약 */
  summary?: {
    total: number;
    approved: number;
    rejected: number;
    revisionRequired: number;
  };
}

/**
 * 규정준수 결과
 */
export interface ComplianceResult {
  /** 체크리스트 상태 */
  checklists?: ComplianceChecklist[];
  /** 위반 사항 */
  violations?: RegulatoryViolation[];
  /** 개인정보 준수 현황 */
  privacyStatus?: PrivacyComplianceStatus;
  /** 요약 */
  summary?: {
    overallComplianceRate: number;
    criticalIssues: number;
    pendingRemediations: number;
  };
}
