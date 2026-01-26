/**
 * IP (Intellectual Property) Agent 타입 정의
 * LANE 3 - Management & Compliance
 */

import { DateRange } from '../../types';

// =============================================================================
// 열거형 (Enums)
// =============================================================================

/**
 * 지식재산권 유형
 */
export enum IPType {
  TRADEMARK = 'trademark',         // 상표권
  DESIGN = 'design',               // 디자인권
  PATENT = 'patent',               // 특허권
  COPYRIGHT = 'copyright',         // 저작권
  TRADE_SECRET = 'trade_secret',   // 영업비밀
  UTILITY_MODEL = 'utility_model', // 실용신안
}

/**
 * 권리 상태
 */
export enum IPStatus {
  APPLIED = 'applied',             // 출원 중
  REGISTERED = 'registered',       // 등록 완료
  EXPIRING_SOON = 'expiring_soon', // 만료 임박
  EXPIRED = 'expired',             // 만료됨
  RENEWED = 'renewed',             // 갱신 완료
  ABANDONED = 'abandoned',         // 포기
  DISPUTED = 'disputed',           // 분쟁 중
  CANCELLED = 'cancelled',         // 취소됨
}

/**
 * 침해 유형
 */
export enum InfringementType {
  COUNTERFEIT = 'counterfeit',           // 위조품
  COPYCAT = 'copycat',                   // 카피캣 (모방 상품)
  TRADEMARK_MISUSE = 'trademark_misuse', // 상표 무단 사용
  DESIGN_COPY = 'design_copy',           // 디자인 모방
  IMAGE_THEFT = 'image_theft',           // 이미지 도용
  CONTENT_COPY = 'content_copy',         // 콘텐츠 도용
  PARALLEL_IMPORT = 'parallel_import',   // 병행수입
  OTHER = 'other',                       // 기타
}

/**
 * 침해 심각도
 */
export enum InfringementSeverity {
  CRITICAL = 'critical',   // 심각 (즉시 조치 필요)
  HIGH = 'high',           // 높음
  MEDIUM = 'medium',       // 중간
  LOW = 'low',             // 낮음
}

/**
 * 대응 상태
 */
export enum ResponseStatus {
  DETECTED = 'detected',           // 발견됨
  UNDER_REVIEW = 'under_review',   // 검토 중
  WARNING_SENT = 'warning_sent',   // 경고장 발송
  TAKEDOWN_REQUESTED = 'takedown_requested', // 삭제 요청
  LEGAL_ACTION = 'legal_action',   // 법적 조치 진행
  RESOLVED = 'resolved',           // 해결됨
  ESCALATED = 'escalated',         // 에스컬레이션
  DISMISSED = 'dismissed',         // 기각/무시
}

/**
 * 모니터링 채널
 */
export enum MonitoringChannel {
  COUPANG = 'coupang',
  NAVER = 'naver',
  GMARKET = 'gmarket',
  ELEVEN_ST = '11st',
  ALIEXPRESS = 'aliexpress',
  AMAZON = 'amazon',
  TAOBAO = 'taobao',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
  OTHER = 'other',
}

// =============================================================================
// 권리 관리 관련 타입
// =============================================================================

/**
 * 지식재산권 정보
 */
export interface IntellectualProperty {
  /** IP ID */
  id: string;
  /** 권리 유형 */
  type: IPType;
  /** 출원/등록 번호 */
  registrationNumber: string;
  /** 권리명 */
  name: string;
  /** 설명 */
  description?: string;
  /** 상태 */
  status: IPStatus;
  /** 권리자 */
  owner: string;
  /** 출원일 */
  applicationDate: Date;
  /** 등록일 */
  registrationDate?: Date;
  /** 만료일 */
  expiryDate: Date;
  /** 갱신 필요 일자 */
  renewalDueDate: Date;
  /** 지정 상품/서비스 분류 (상표의 경우) */
  classifications?: IPClassification[];
  /** 대표 이미지 URL */
  imageUrl?: string;
  /** 관련 서류 URL */
  documentUrls?: string[];
  /** 갱신 이력 */
  renewalHistory?: IPRenewalRecord[];
  /** 관련 상품 ID */
  relatedProducts?: string[];
  /** 비용 */
  costs?: IPCost[];
  /** 메모 */
  notes?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * IP 분류 (상표의 상품/서비스 분류)
 */
export interface IPClassification {
  /** 분류 코드 (니스 분류) */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 지정 상품/서비스 */
  designatedItems?: string[];
}

/**
 * IP 갱신 이력
 */
export interface IPRenewalRecord {
  /** 갱신 ID */
  id: string;
  /** 갱신일 */
  renewalDate: Date;
  /** 이전 만료일 */
  previousExpiryDate: Date;
  /** 새 만료일 */
  newExpiryDate: Date;
  /** 갱신 비용 */
  cost: number;
  /** 처리 대리인 */
  agent?: string;
  /** 메모 */
  notes?: string;
}

/**
 * IP 비용
 */
export interface IPCost {
  /** 비용 ID */
  id: string;
  /** 비용 유형 */
  type: 'application' | 'registration' | 'renewal' | 'maintenance' | 'legal' | 'other';
  /** 금액 */
  amount: number;
  /** 발생일 */
  date: Date;
  /** 설명 */
  description?: string;
}

/**
 * IP 만료 알림
 */
export interface IPExpiryAlert {
  /** IP ID */
  ipId: string;
  /** 권리 유형 */
  ipType: IPType;
  /** 등록 번호 */
  registrationNumber: string;
  /** 권리명 */
  name: string;
  /** 만료일 */
  expiryDate: Date;
  /** 남은 일수 */
  daysUntilExpiry: number;
  /** 긴급도 */
  urgency: 'urgent' | 'warning' | 'notice';
  /** 예상 갱신 비용 */
  estimatedRenewalCost?: number;
  /** 권장 조치 */
  recommendedAction: string;
}

// =============================================================================
// 침해 감시 관련 타입
// =============================================================================

/**
 * 침해 의심 건
 */
export interface InfringementCase {
  /** 케이스 ID */
  id: string;
  /** 침해 유형 */
  type: InfringementType;
  /** 심각도 */
  severity: InfringementSeverity;
  /** 대응 상태 */
  status: ResponseStatus;
  /** 발견 채널 */
  channel: MonitoringChannel;
  /** 침해자 정보 */
  infringer: InfringerInfo;
  /** 침해 상품/콘텐츠 정보 */
  infringedItem: InfringedItem;
  /** 침해된 IP */
  affectedIP: {
    ipId: string;
    ipType: IPType;
    registrationNumber: string;
    name: string;
  };
  /** 발견일 */
  detectedAt: Date;
  /** 유사도 점수 (0-100) */
  similarityScore?: number;
  /** 증거 자료 */
  evidence: InfringementEvidence[];
  /** 대응 이력 */
  responseHistory?: ResponseAction[];
  /** 예상 피해액 */
  estimatedDamage?: number;
  /** 메모 */
  notes?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 침해자 정보
 */
export interface InfringerInfo {
  /** 판매자/침해자명 */
  name: string;
  /** 판매자 ID (플랫폼) */
  sellerId?: string;
  /** 상호명 */
  businessName?: string;
  /** 연락처 */
  contact?: string;
  /** 주소 */
  address?: string;
  /** 플랫폼 URL */
  platformUrl?: string;
  /** 과거 침해 이력 */
  previousInfringements?: number;
}

/**
 * 침해 상품/콘텐츠 정보
 */
export interface InfringedItem {
  /** 상품/콘텐츠명 */
  name: string;
  /** URL */
  url: string;
  /** 가격 */
  price?: number;
  /** 판매량 (추정) */
  estimatedSales?: number;
  /** 이미지 URL */
  imageUrls?: string[];
  /** 상품 설명 */
  description?: string;
  /** 발견 당시 스크린샷 URL */
  screenshotUrl?: string;
}

/**
 * 침해 증거
 */
export interface InfringementEvidence {
  /** 증거 ID */
  id: string;
  /** 증거 유형 */
  type: 'screenshot' | 'document' | 'video' | 'purchase_record' | 'other';
  /** 파일 URL */
  url: string;
  /** 설명 */
  description?: string;
  /** 수집일 */
  collectedAt: Date;
  /** 공증 여부 */
  notarized?: boolean;
}

/**
 * 모니터링 결과
 */
export interface MonitoringResult {
  /** 모니터링 ID */
  id: string;
  /** 모니터링 채널 */
  channel: MonitoringChannel;
  /** 검색 키워드 */
  searchKeywords: string[];
  /** 스캔 일시 */
  scannedAt: Date;
  /** 스캔된 항목 수 */
  itemsScanned: number;
  /** 발견된 의심 건 */
  suspectedCases: InfringementCase[];
  /** 새로 발견된 건 수 */
  newCasesCount: number;
  /** 기존 건 업데이트 수 */
  updatedCasesCount: number;
  /** 오류 */
  errors?: string[];
}

/**
 * 모니터링 설정
 */
export interface MonitoringConfig {
  /** 설정 ID */
  id: string;
  /** 모니터링 활성화 */
  enabled: boolean;
  /** 대상 채널 */
  channels: MonitoringChannel[];
  /** 검색 키워드 */
  keywords: string[];
  /** 모니터링 주기 (시간) */
  intervalHours: number;
  /** 유사도 임계값 */
  similarityThreshold: number;
  /** 자동 알림 */
  autoNotify: boolean;
  /** 알림 대상 */
  notifyRecipients?: string[];
}

// =============================================================================
// 대응 관련 타입
// =============================================================================

/**
 * 대응 조치
 */
export interface ResponseAction {
  /** 조치 ID */
  id: string;
  /** 케이스 ID */
  caseId: string;
  /** 조치 유형 */
  actionType: ResponseActionType;
  /** 조치 상태 */
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  /** 조치 일시 */
  actionDate: Date;
  /** 담당자 */
  assignee?: string;
  /** 상세 내용 */
  details: string;
  /** 결과 */
  result?: string;
  /** 관련 문서 URL */
  documentUrls?: string[];
  /** 비용 */
  cost?: number;
  /** 생성일 */
  createdAt: Date;
}

/**
 * 대응 조치 유형
 */
export type ResponseActionType =
  | 'internal_review'    // 내부 검토
  | 'warning_letter'     // 경고장 발송
  | 'cease_desist'       // 중지 요청서
  | 'platform_report'    // 플랫폼 신고
  | 'takedown_request'   // 삭제 요청
  | 'legal_consultation' // 법률 상담
  | 'lawsuit_filing'     // 소송 제기
  | 'settlement'         // 합의
  | 'customs_report'     // 세관 신고
  | 'escalation'         // 에스컬레이션
  | 'case_closed';       // 케이스 종료

/**
 * 경고장 템플릿
 */
export interface WarningLetterTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿명 */
  name: string;
  /** 침해 유형 */
  infringementType: InfringementType;
  /** 제목 템플릿 */
  subjectTemplate: string;
  /** 본문 템플릿 */
  bodyTemplate: string;
  /** 변수 목록 */
  variables: string[];
  /** 언어 */
  language: 'ko' | 'en' | 'cn';
}

/**
 * 법적 조치 에스컬레이션
 */
export interface LegalEscalation {
  /** 에스컬레이션 ID */
  id: string;
  /** 케이스 ID */
  caseId: string;
  /** 에스컬레이션 사유 */
  reason: string;
  /** 권장 조치 */
  recommendedAction: ResponseActionType;
  /** 예상 비용 */
  estimatedCost?: number;
  /** 예상 소요 기간 */
  estimatedDuration?: string;
  /** 성공 가능성 (0-100) */
  successProbability?: number;
  /** 법률 자문 필요 여부 */
  legalConsultationRequired: boolean;
  /** 대표 승인 필요 여부 */
  ceoApprovalRequired: boolean;
  /** 상태 */
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  /** 생성일 */
  createdAt: Date;
}

// =============================================================================
// 에이전트 실행 관련 타입
// =============================================================================

/**
 * 권리관리 태스크 페이로드
 */
export interface IPManagementTaskPayload {
  /** 작업 유형 */
  action: 'check_expiry' | 'initiate_renewal' | 'register_new' | 'update_status' | 'generate_report';
  /** IP ID (특정 IP 대상 시) */
  ipId?: string;
  /** IP 유형 필터 */
  ipTypes?: IPType[];
  /** 신규 등록 데이터 */
  newIPData?: Partial<IntellectualProperty>;
  /** 옵션 */
  options?: {
    /** 알림 발송 */
    sendNotification?: boolean;
    /** 만료 임박 기준 일수 */
    expiryThresholdDays?: number;
  };
}

/**
 * 침해감시 태스크 페이로드
 */
export interface InfringementMonitoringTaskPayload {
  /** 작업 유형 */
  action: 'scan' | 'analyze' | 'update_config' | 'generate_report';
  /** 대상 채널 */
  channels?: MonitoringChannel[];
  /** 키워드 */
  keywords?: string[];
  /** 기간 */
  period?: DateRange;
  /** 옵션 */
  options?: {
    /** 상세 분석 */
    detailedAnalysis?: boolean;
    /** 자동 케이스 생성 */
    autoCreateCases?: boolean;
    /** 유사도 임계값 */
    similarityThreshold?: number;
  };
}

/**
 * 대응 태스크 페이로드
 */
export interface InfringementResponseTaskPayload {
  /** 작업 유형 */
  action: 'take_action' | 'send_warning' | 'request_takedown' | 'escalate' | 'generate_report';
  /** 케이스 ID */
  caseId?: string;
  /** 케이스 ID 목록 (일괄 처리) */
  caseIds?: string[];
  /** 조치 유형 */
  actionType?: ResponseActionType;
  /** 옵션 */
  options?: {
    /** 자동 경고장 발송 */
    autoSendWarning?: boolean;
    /** 템플릿 ID */
    templateId?: string;
    /** 에스컬레이션 승인 요청 */
    requestApproval?: boolean;
  };
}

// =============================================================================
// 에이전트 결과 타입
// =============================================================================

/**
 * 권리관리 결과
 */
export interface IPManagementResult {
  /** 만료 임박 IP */
  expiringIPs?: IPExpiryAlert[];
  /** 갱신된 IP */
  renewedIPs?: IntellectualProperty[];
  /** 신규 등록 IP */
  newlyRegisteredIP?: IntellectualProperty;
  /** 전체 IP 현황 */
  ipSummary?: {
    total: number;
    byType: Record<IPType, number>;
    registered: number;
    expiringSoon: number;
    expired: number;
  };
}

/**
 * 침해감시 결과
 */
export interface InfringementMonitoringResult {
  /** 모니터링 결과 */
  monitoringResults?: MonitoringResult[];
  /** 발견된 케이스 */
  detectedCases?: InfringementCase[];
  /** 요약 */
  summary?: {
    channelsScanned: number;
    itemsScanned: number;
    newCases: number;
    totalActiveCases: number;
    bySeverity: Record<InfringementSeverity, number>;
  };
}

/**
 * 대응 결과
 */
export interface InfringementResponseResult {
  /** 처리된 케이스 */
  processedCases?: InfringementCase[];
  /** 수행된 조치 */
  actionsPerformed?: ResponseAction[];
  /** 에스컬레이션 */
  escalations?: LegalEscalation[];
  /** 요약 */
  summary?: {
    casesProcessed: number;
    warningsSent: number;
    takedownsRequested: number;
    escalated: number;
    resolved: number;
  };
}
