/**
 * BizSupport Agent 타입 정의
 * LANE 3 - Management & Compliance
 */

import { DateRange } from '../../types';

// =============================================================================
// 열거형 (Enums)
// =============================================================================

/**
 * 지원사업 유형
 */
export enum SupportProgramType {
  SUBSIDY = 'subsidy',               // 보조금
  LOAN = 'loan',                     // 융자
  TAX_BENEFIT = 'tax_benefit',       // 세제 혜택
  R_AND_D = 'r_and_d',               // R&D 지원
  EXPORT = 'export',                 // 수출 지원
  MARKETING = 'marketing',           // 마케팅 지원
  CONSULTING = 'consulting',         // 컨설팅 지원
  EDUCATION = 'education',           // 교육/훈련
  FACILITY = 'facility',             // 시설/설비 지원
  EMPLOYMENT = 'employment',         // 고용 지원
  STARTUP = 'startup',               // 창업 지원
  OTHER = 'other',                   // 기타
}

/**
 * 지원 기관 유형
 */
export enum SupportAgencyType {
  GOVERNMENT = 'government',               // 정부/중앙부처
  LOCAL_GOVERNMENT = 'local_government',   // 지자체
  PUBLIC_INSTITUTION = 'public_institution', // 공공기관
  ASSOCIATION = 'association',             // 협회/조합
  FOUNDATION = 'foundation',               // 재단
  PRIVATE = 'private',                     // 민간
}

/**
 * 지원사업 상태
 */
export enum ProgramStatus {
  UPCOMING = 'upcoming',           // 예정
  OPEN = 'open',                   // 접수 중
  CLOSED = 'closed',               // 접수 마감
  REVIEWING = 'reviewing',         // 심사 중
  COMPLETED = 'completed',         // 완료
}

/**
 * 신청 상태
 */
export enum ApplicationStatus {
  DRAFT = 'draft',                     // 작성 중
  SUBMITTED = 'submitted',             // 제출 완료
  UNDER_REVIEW = 'under_review',       // 심사 중
  ADDITIONAL_REQUIRED = 'additional_required', // 추가 서류 요청
  APPROVED = 'approved',               // 승인
  REJECTED = 'rejected',               // 탈락
  CANCELLED = 'cancelled',             // 취소
}

/**
 * 적합성 수준
 */
export enum FitLevel {
  EXCELLENT = 'excellent',   // 매우 적합 (80% 이상)
  GOOD = 'good',             // 적합 (60-79%)
  MODERATE = 'moderate',     // 보통 (40-59%)
  LOW = 'low',               // 낮음 (40% 미만)
}

/**
 * 정산 상태
 */
export enum SettlementReportStatus {
  NOT_STARTED = 'not_started',     // 미시작
  IN_PROGRESS = 'in_progress',     // 작성 중
  SUBMITTED = 'submitted',         // 제출 완료
  REVISION_REQUIRED = 'revision_required', // 수정 요청
  APPROVED = 'approved',           // 승인
  COMPLETED = 'completed',         // 완료
}

// =============================================================================
// 지원사업 모니터링 관련 타입
// =============================================================================

/**
 * 지원사업 정보
 */
export interface SupportProgram {
  /** 사업 ID */
  id: string;
  /** 사업명 */
  name: string;
  /** 사업 유형 */
  type: SupportProgramType;
  /** 지원 기관 */
  agency: SupportAgency;
  /** 사업 상태 */
  status: ProgramStatus;
  /** 사업 개요 */
  description: string;
  /** 지원 대상 */
  eligibility: EligibilityCriteria;
  /** 지원 내용 */
  supportDetails: {
    /** 지원 금액 */
    amount?: string;
    /** 지원 비율 */
    supportRatio?: string;
    /** 지원 기간 */
    duration?: string;
    /** 지원 방식 */
    method?: string;
  };
  /** 접수 기간 */
  applicationPeriod: {
    start: Date;
    end: Date;
  };
  /** 사업 기간 */
  projectPeriod?: {
    start: Date;
    end: Date;
  };
  /** 공고 URL */
  announcementUrl: string;
  /** 신청 URL */
  applicationUrl?: string;
  /** 문의처 */
  contact?: {
    department?: string;
    phone?: string;
    email?: string;
  };
  /** 첨부 파일 URL */
  attachmentUrls?: string[];
  /** 적합성 분석 결과 */
  fitAnalysis?: FitAnalysisResult;
  /** 태그 */
  tags?: string[];
  /** 크롤링 소스 */
  source?: string;
  /** 크롤링 일시 */
  crawledAt?: Date;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 지원 기관
 */
export interface SupportAgency {
  /** 기관 ID */
  id: string;
  /** 기관명 */
  name: string;
  /** 기관 유형 */
  type: SupportAgencyType;
  /** 웹사이트 */
  website?: string;
  /** 연락처 */
  contact?: string;
}

/**
 * 지원 자격 조건
 */
export interface EligibilityCriteria {
  /** 기업 규모 */
  companySize?: ('micro' | 'small' | 'medium' | 'large')[];
  /** 업종 */
  industries?: string[];
  /** 지역 */
  regions?: string[];
  /** 업력 */
  yearsInBusiness?: {
    min?: number;
    max?: number;
  };
  /** 매출액 */
  revenue?: {
    min?: number;
    max?: number;
  };
  /** 고용 인원 */
  employeeCount?: {
    min?: number;
    max?: number;
  };
  /** 기타 조건 */
  otherRequirements?: string[];
  /** 제외 조건 */
  exclusions?: string[];
}

/**
 * 적합성 분석 결과
 */
export interface FitAnalysisResult {
  /** 적합도 점수 (0-100) */
  score: number;
  /** 적합성 수준 */
  level: FitLevel;
  /** 충족 조건 */
  metCriteria: string[];
  /** 미충족 조건 */
  unmetCriteria: string[];
  /** 확인 필요 조건 */
  uncertainCriteria: string[];
  /** 권장 사항 */
  recommendations?: string[];
  /** 분석 일시 */
  analyzedAt: Date;
}

/**
 * 크롤링 설정
 */
export interface CrawlingConfig {
  /** 설정 ID */
  id: string;
  /** 크롤링 대상 */
  sources: CrawlingSource[];
  /** 키워드 */
  keywords: string[];
  /** 제외 키워드 */
  excludeKeywords?: string[];
  /** 사업 유형 필터 */
  programTypes?: SupportProgramType[];
  /** 크롤링 주기 (시간) */
  intervalHours: number;
  /** 자동 알림 */
  autoNotify: boolean;
  /** 최소 적합도 점수 (알림 기준) */
  minFitScore?: number;
  /** 활성화 여부 */
  enabled: boolean;
}

/**
 * 크롤링 소스
 */
export interface CrawlingSource {
  /** 소스 ID */
  id: string;
  /** 소스명 */
  name: string;
  /** URL */
  url: string;
  /** 기관 유형 */
  agencyType: SupportAgencyType;
  /** 우선순위 */
  priority: number;
}

/**
 * 크롤링 결과
 */
export interface CrawlingResult {
  /** 크롤링 ID */
  id: string;
  /** 소스 */
  source: CrawlingSource;
  /** 크롤링 일시 */
  crawledAt: Date;
  /** 발견된 사업 수 */
  programsFound: number;
  /** 신규 사업 수 */
  newPrograms: number;
  /** 업데이트된 사업 수 */
  updatedPrograms: number;
  /** 적합 사업 수 */
  fitPrograms: number;
  /** 오류 */
  errors?: string[];
}

// =============================================================================
// 신청 지원 관련 타입
// =============================================================================

/**
 * 지원사업 신청
 */
export interface ProgramApplication {
  /** 신청 ID */
  id: string;
  /** 지원사업 ID */
  programId: string;
  /** 지원사업명 */
  programName: string;
  /** 신청 상태 */
  status: ApplicationStatus;
  /** 신청일 */
  appliedAt?: Date;
  /** 신청 마감일 */
  deadline: Date;
  /** 필요 서류 */
  requiredDocuments: RequiredDocument[];
  /** 사업계획서 */
  businessPlan?: BusinessPlan;
  /** 신청 금액 */
  requestedAmount?: number;
  /** 승인 금액 */
  approvedAmount?: number;
  /** 심사 결과 */
  reviewResult?: ApplicationReviewResult;
  /** 담당자 */
  assignee?: string;
  /** 메모 */
  notes?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 필요 서류
 */
export interface RequiredDocument {
  /** 서류 ID */
  id: string;
  /** 서류명 */
  name: string;
  /** 필수 여부 */
  mandatory: boolean;
  /** 상태 */
  status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
  /** 파일 URL */
  fileUrl?: string;
  /** 만료일 (유효기간 있는 서류) */
  expiryDate?: Date;
  /** 메모 */
  notes?: string;
}

/**
 * 사업계획서
 */
export interface BusinessPlan {
  /** 사업계획서 ID */
  id: string;
  /** 사업명 */
  projectName: string;
  /** 사업 개요 */
  summary: string;
  /** 사업 목표 */
  objectives: string[];
  /** 추진 전략 */
  strategies: string[];
  /** 추진 일정 */
  timeline: BusinessPlanTimeline[];
  /** 예산 계획 */
  budget: BusinessPlanBudget;
  /** 기대 효과 */
  expectedOutcomes: string[];
  /** 상태 */
  status: 'draft' | 'in_review' | 'approved' | 'final';
  /** 버전 */
  version: number;
  /** 파일 URL */
  fileUrl?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 사업계획서 일정
 */
export interface BusinessPlanTimeline {
  /** 단계 */
  phase: string;
  /** 내용 */
  activities: string[];
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 산출물 */
  deliverables?: string[];
}

/**
 * 사업계획서 예산
 */
export interface BusinessPlanBudget {
  /** 총 사업비 */
  totalAmount: number;
  /** 정부 지원금 */
  governmentSupport: number;
  /** 자기 부담금 */
  selfContribution: number;
  /** 비목별 내역 */
  breakdown: BudgetItem[];
}

/**
 * 예산 항목
 */
export interface BudgetItem {
  /** 비목 */
  category: string;
  /** 세목 */
  subcategory?: string;
  /** 금액 */
  amount: number;
  /** 산출 근거 */
  justification?: string;
}

/**
 * 신청 심사 결과
 */
export interface ApplicationReviewResult {
  /** 결과 */
  result: 'approved' | 'rejected' | 'conditional';
  /** 심사일 */
  reviewedAt: Date;
  /** 심사 점수 */
  score?: number;
  /** 심사 의견 */
  comments?: string;
  /** 조건 (조건부 승인 시) */
  conditions?: string[];
  /** 탈락 사유 (탈락 시) */
  rejectionReason?: string;
}

// =============================================================================
// 사후 관리 관련 타입
// =============================================================================

/**
 * 지원사업 수행 현황
 */
export interface ProjectExecution {
  /** 수행 ID */
  id: string;
  /** 신청 ID */
  applicationId: string;
  /** 지원사업 ID */
  programId: string;
  /** 사업 기간 */
  projectPeriod: DateRange;
  /** 총 지원금 */
  totalSupportAmount: number;
  /** 기 집행액 */
  spentAmount: number;
  /** 잔액 */
  remainingAmount: number;
  /** 마일스톤 */
  milestones: ProjectMilestone[];
  /** 정산 보고서 */
  settlementReports: SettlementReport[];
  /** 결과 보고서 */
  resultReports?: ResultReport[];
  /** 상태 */
  status: 'active' | 'completed' | 'terminated';
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 프로젝트 마일스톤
 */
export interface ProjectMilestone {
  /** 마일스톤 ID */
  id: string;
  /** 마일스톤명 */
  name: string;
  /** 예정일 */
  dueDate: Date;
  /** 완료일 */
  completedAt?: Date;
  /** 상태 */
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  /** 산출물 */
  deliverables?: string[];
  /** 메모 */
  notes?: string;
}

/**
 * 정산 보고서
 */
export interface SettlementReport {
  /** 보고서 ID */
  id: string;
  /** 정산 기간 */
  period: DateRange;
  /** 상태 */
  status: SettlementReportStatus;
  /** 정산 금액 */
  settlementAmount: number;
  /** 비목별 집행 내역 */
  expenditures: ExpenditureItem[];
  /** 증빙 서류 */
  evidenceDocuments: EvidenceDocument[];
  /** 제출일 */
  submittedAt?: Date;
  /** 승인일 */
  approvedAt?: Date;
  /** 수정 요청 사항 */
  revisionRequests?: string[];
  /** 파일 URL */
  fileUrl?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 집행 항목
 */
export interface ExpenditureItem {
  /** 항목 ID */
  id: string;
  /** 비목 */
  category: string;
  /** 세목 */
  subcategory?: string;
  /** 집행 금액 */
  amount: number;
  /** 집행일 */
  expenditureDate: Date;
  /** 적요 */
  description: string;
  /** 증빙 ID */
  evidenceId?: string;
}

/**
 * 증빙 서류
 */
export interface EvidenceDocument {
  /** 증빙 ID */
  id: string;
  /** 증빙 유형 */
  type: 'receipt' | 'invoice' | 'contract' | 'bank_statement' | 'other';
  /** 파일명 */
  fileName: string;
  /** 파일 URL */
  fileUrl: string;
  /** 금액 */
  amount: number;
  /** 발행일 */
  issueDate: Date;
  /** 연결된 집행 항목 ID */
  linkedExpenditureIds?: string[];
}

/**
 * 결과 보고서
 */
export interface ResultReport {
  /** 보고서 ID */
  id: string;
  /** 보고서 유형 */
  type: 'interim' | 'final';
  /** 보고 기간 */
  period: DateRange;
  /** 목표 달성률 */
  achievementRate: number;
  /** 성과 지표 */
  performanceIndicators: PerformanceIndicator[];
  /** 주요 성과 */
  keyAchievements: string[];
  /** 문제점 및 개선사항 */
  issuesAndImprovements?: string[];
  /** 제출일 */
  submittedAt?: Date;
  /** 파일 URL */
  fileUrl?: string;
  /** 생성일 */
  createdAt: Date;
}

/**
 * 성과 지표
 */
export interface PerformanceIndicator {
  /** 지표명 */
  name: string;
  /** 단위 */
  unit: string;
  /** 목표값 */
  targetValue: number;
  /** 달성값 */
  achievedValue: number;
  /** 달성률 */
  achievementRate: number;
}

// =============================================================================
// 에이전트 실행 관련 타입
// =============================================================================

/**
 * 모니터링 태스크 페이로드
 */
export interface SupportMonitoringTaskPayload {
  /** 작업 유형 */
  action: 'crawl' | 'analyze_fit' | 'update_config' | 'generate_report';
  /** 크롤링 소스 */
  sources?: string[];
  /** 키워드 */
  keywords?: string[];
  /** 사업 유형 필터 */
  programTypes?: SupportProgramType[];
  /** 옵션 */
  options?: {
    /** 적합성 분석 포함 */
    includeFitAnalysis?: boolean;
    /** 최소 적합도 점수 */
    minFitScore?: number;
    /** 알림 발송 */
    sendNotification?: boolean;
  };
}

/**
 * 신청지원 태스크 페이로드
 */
export interface ApplicationSupportTaskPayload {
  /** 작업 유형 */
  action: 'prepare_documents' | 'draft_business_plan' | 'submit' | 'check_status';
  /** 지원사업 ID */
  programId?: string;
  /** 신청 ID */
  applicationId?: string;
  /** 사업계획서 입력 데이터 */
  businessPlanInput?: Partial<BusinessPlan>;
  /** 옵션 */
  options?: {
    /** 자동 서류 수집 */
    autoCollectDocuments?: boolean;
    /** AI 초안 작성 */
    aiDraftGeneration?: boolean;
  };
}

/**
 * 사후관리 태스크 페이로드
 */
export interface PostManagementTaskPayload {
  /** 작업 유형 */
  action: 'track_progress' | 'prepare_settlement' | 'prepare_result_report' | 'check_deadlines';
  /** 수행 ID */
  executionId?: string;
  /** 신청 ID */
  applicationId?: string;
  /** 기간 */
  period?: DateRange;
  /** 옵션 */
  options?: {
    /** 자동 정산 자료 수집 */
    autoCollectExpenses?: boolean;
    /** 마감 알림 */
    notifyDeadlines?: boolean;
    /** 알림 기준 일수 */
    deadlineThresholdDays?: number;
  };
}

// =============================================================================
// 에이전트 결과 타입
// =============================================================================

/**
 * 모니터링 결과
 */
export interface SupportMonitoringResult {
  /** 크롤링 결과 */
  crawlingResults?: CrawlingResult[];
  /** 발견된 지원사업 */
  programs?: SupportProgram[];
  /** 적합 사업 */
  fitPrograms?: SupportProgram[];
  /** 요약 */
  summary?: {
    sourcesScanned: number;
    programsFound: number;
    newPrograms: number;
    fitPrograms: number;
  };
}

/**
 * 신청지원 결과
 */
export interface ApplicationSupportResult {
  /** 신청 정보 */
  application?: ProgramApplication;
  /** 준비된 서류 */
  preparedDocuments?: RequiredDocument[];
  /** 사업계획서 */
  businessPlan?: BusinessPlan;
  /** 요약 */
  summary?: {
    documentsReady: number;
    documentsTotal: number;
    readinessRate: number;
  };
}

/**
 * 사후관리 결과
 */
export interface PostManagementResult {
  /** 수행 현황 */
  execution?: ProjectExecution;
  /** 정산 보고서 */
  settlementReport?: SettlementReport;
  /** 결과 보고서 */
  resultReport?: ResultReport;
  /** 마감 알림 */
  deadlineAlerts?: DeadlineAlert[];
  /** 요약 */
  summary?: {
    executionProgress: number;
    budgetUtilization: number;
    upcomingDeadlines: number;
  };
}

/**
 * 마감 알림
 */
export interface DeadlineAlert {
  /** 유형 */
  type: 'milestone' | 'settlement' | 'report' | 'project_end';
  /** 항목명 */
  name: string;
  /** 마감일 */
  deadline: Date;
  /** 남은 일수 */
  daysRemaining: number;
  /** 긴급도 */
  urgency: 'urgent' | 'warning' | 'notice';
}
