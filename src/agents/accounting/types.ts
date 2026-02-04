/**
 * Accounting Agent 타입 정의
 * LANE 3 - Management & Compliance
 */

import { SalesChannel, DateRange } from '../../types';

// =============================================================================
// 열거형 (Enums)
// =============================================================================

/**
 * 정산 상태
 */
export enum SettlementStatus {
  PENDING = 'pending',           // 정산 대기
  COLLECTED = 'collected',       // 수집 완료
  RECONCILED = 'reconciled',     // 대사 완료
  CONFIRMED = 'confirmed',       // 확정
  DISPUTED = 'disputed',         // 이의 제기
  COMPLETED = 'completed',       // 완료
}

/**
 * 비용 카테고리
 */
export enum ExpenseCategory {
  MATERIAL = 'material',           // 원재료
  PACKAGING = 'packaging',         // 포장재
  SHIPPING = 'shipping',           // 배송비
  MARKETING = 'marketing',         // 마케팅
  PLATFORM_FEE = 'platform_fee',   // 플랫폼 수수료
  LABOR = 'labor',                 // 인건비
  RENT = 'rent',                   // 임대료
  UTILITY = 'utility',             // 공과금
  TAX = 'tax',                     // 세금
  INSURANCE = 'insurance',         // 보험
  EQUIPMENT = 'equipment',         // 장비/설비
  OFFICE = 'office',               // 사무용품
  PROFESSIONAL = 'professional',   // 전문서비스 (법률, 회계 등)
  OTHER = 'other',                 // 기타
}

/**
 * 세금 유형
 */
export enum TaxType {
  VAT = 'vat',                     // 부가가치세
  INCOME = 'income',               // 소득세
  CORPORATE = 'corporate',         // 법인세
  WITHHOLDING = 'withholding',     // 원천징수
  LOCAL = 'local',                 // 지방세
}

/**
 * 세금계산서 상태
 */
export enum TaxInvoiceStatus {
  DRAFT = 'draft',               // 작성 중
  ISSUED = 'issued',             // 발행
  RECEIVED = 'received',         // 수취
  REPORTED = 'reported',         // 신고 완료
  AMENDED = 'amended',           // 수정 발행
  CANCELLED = 'cancelled',       // 취소
}

/**
 * 리포트 유형
 */
export enum ReportType {
  DAILY = 'daily',               // 일일
  WEEKLY = 'weekly',             // 주간
  MONTHLY = 'monthly',           // 월간
  QUARTERLY = 'quarterly',       // 분기
  ANNUAL = 'annual',             // 연간
  CUSTOM = 'custom',             // 사용자 정의
}

// =============================================================================
// 매출 정산 관련 타입
// =============================================================================

/**
 * 채널별 매출 정산
 */
export interface ChannelSettlement {
  /** 정산 ID */
  id: string;
  /** 판매 채널 */
  channel: SalesChannel;
  /** 정산 기간 */
  period: DateRange;
  /** 정산 상태 */
  status: SettlementStatus;
  /** 총 매출액 */
  totalSales: number;
  /** 수수료 */
  commissionFee: number;
  /** 광고비 */
  advertisingFee: number;
  /** 배송비 정산 */
  shippingSettlement: number;
  /** 반품/환불 금액 */
  refundAmount: number;
  /** 기타 공제 */
  otherDeductions: number;
  /** 최종 정산액 */
  netSettlement: number;
  /** 예정 입금일 */
  expectedPaymentDate?: Date;
  /** 실제 입금일 */
  actualPaymentDate?: Date;
  /** 주문 건수 */
  orderCount: number;
  /** 상세 내역 */
  details?: SettlementDetail[];
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 정산 상세 내역
 */
export interface SettlementDetail {
  /** 주문 ID */
  orderId: string;
  /** 채널 주문 ID */
  channelOrderId: string;
  /** 상품명 */
  productName: string;
  /** 판매가 */
  salePrice: number;
  /** 수수료 */
  commission: number;
  /** 정산액 */
  settlementAmount: number;
  /** 정산일 */
  settledAt?: Date;
}

/**
 * 정산 대사 결과
 */
export interface ReconciliationResult {
  /** 정산 ID */
  settlementId: string;
  /** 대사 완료 여부 */
  reconciled: boolean;
  /** 불일치 항목 수 */
  discrepancyCount: number;
  /** 불일치 금액 */
  discrepancyAmount: number;
  /** 불일치 상세 */
  discrepancies?: ReconciliationDiscrepancy[];
  /** 대사 일시 */
  reconciledAt: Date;
}

/**
 * 대사 불일치 항목
 */
export interface ReconciliationDiscrepancy {
  /** 주문 ID */
  orderId: string;
  /** 불일치 유형 */
  type: 'missing' | 'amount_mismatch' | 'status_mismatch';
  /** 예상 값 */
  expected: unknown;
  /** 실제 값 */
  actual: unknown;
  /** 차이 금액 */
  difference?: number;
}

// =============================================================================
// 비용 관리 관련 타입
// =============================================================================

/**
 * 비용 항목
 */
export interface ExpenseItem {
  /** 비용 ID */
  id: string;
  /** 카테고리 */
  category: ExpenseCategory;
  /** 비용명 */
  name: string;
  /** 금액 */
  amount: number;
  /** 부가세 포함 여부 */
  vatIncluded: boolean;
  /** 부가세 금액 */
  vatAmount?: number;
  /** 발생일 */
  expenseDate: Date;
  /** 결제일 */
  paymentDate?: Date;
  /** 결제 수단 */
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'other';
  /** 카드 내역 ID (카드 결제인 경우) */
  cardTransactionId?: string;
  /** 영수증 URL */
  receiptUrl?: string;
  /** 세금계산서 ID */
  taxInvoiceId?: string;
  /** 공급자 */
  vendor?: string;
  /** 메모 */
  memo?: string;
  /** 승인 상태 */
  approvalStatus: 'pending' | 'approved' | 'rejected';
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 카드 거래 내역
 */
export interface CardTransaction {
  /** 거래 ID */
  id: string;
  /** 카드 번호 (마스킹) */
  cardNumber: string;
  /** 카드사 */
  cardCompany: string;
  /** 거래 일시 */
  transactionDate: Date;
  /** 금액 */
  amount: number;
  /** 가맹점명 */
  merchantName: string;
  /** 가맹점 카테고리 */
  merchantCategory?: string;
  /** 분류된 비용 카테고리 */
  expenseCategory?: ExpenseCategory;
  /** 연결된 비용 ID */
  linkedExpenseId?: string;
  /** 상태 */
  status: 'pending' | 'classified' | 'excluded';
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 비용 요약
 */
export interface ExpenseSummary {
  /** 기간 */
  period: DateRange;
  /** 카테고리별 합계 */
  byCategory: Record<ExpenseCategory, number>;
  /** 총 비용 */
  totalExpense: number;
  /** 부가세 합계 */
  totalVat: number;
  /** 전월 대비 증감 */
  monthOverMonthChange?: number;
  /** 예산 대비 비율 */
  budgetUtilization?: number;
}

// =============================================================================
// 세무 관련 타입
// =============================================================================

/**
 * 세금계산서
 */
export interface TaxInvoice {
  /** 세금계산서 ID */
  id: string;
  /** 세금계산서 번호 */
  invoiceNumber: string;
  /** 발행/수취 구분 */
  direction: 'issued' | 'received';
  /** 상태 */
  status: TaxInvoiceStatus;
  /** 공급자 정보 */
  supplier: {
    registrationNumber: string;
    companyName: string;
    representative: string;
    address?: string;
  };
  /** 공급받는자 정보 */
  buyer: {
    registrationNumber: string;
    companyName: string;
    representative: string;
    address?: string;
  };
  /** 작성일 */
  issueDate: Date;
  /** 공급가액 */
  supplyAmount: number;
  /** 세액 */
  taxAmount: number;
  /** 합계 금액 */
  totalAmount: number;
  /** 품목 */
  items: TaxInvoiceItem[];
  /** 비고 */
  remarks?: string;
  /** 원본 파일 URL */
  fileUrl?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 세금계산서 품목
 */
export interface TaxInvoiceItem {
  /** 품목명 */
  name: string;
  /** 규격 */
  specification?: string;
  /** 수량 */
  quantity: number;
  /** 단가 */
  unitPrice: number;
  /** 공급가액 */
  supplyAmount: number;
  /** 세액 */
  taxAmount: number;
  /** 비고 */
  remarks?: string;
}

/**
 * 부가세 신고 자료
 */
export interface VatReportData {
  /** 신고 기간 */
  period: {
    year: number;
    quarter: 1 | 2 | 3 | 4;
  };
  /** 매출 세금계산서 합계 */
  salesTaxInvoices: {
    count: number;
    supplyAmount: number;
    taxAmount: number;
  };
  /** 매입 세금계산서 합계 */
  purchaseTaxInvoices: {
    count: number;
    supplyAmount: number;
    taxAmount: number;
  };
  /** 카드 매출 */
  cardSales: {
    amount: number;
    taxAmount: number;
  };
  /** 현금영수증 매출 */
  cashReceiptSales: {
    amount: number;
    taxAmount: number;
  };
  /** 납부/환급 세액 */
  payableOrRefundable: number;
  /** 생성일 */
  generatedAt: Date;
}

/**
 * 기장 데이터
 */
export interface BookkeepingData {
  /** 기간 */
  period: DateRange;
  /** 매출 내역 */
  salesEntries: AccountEntry[];
  /** 매입/비용 내역 */
  purchaseEntries: AccountEntry[];
  /** 자산 변동 */
  assetChanges?: AssetChange[];
  /** 상태 */
  status: 'draft' | 'submitted' | 'confirmed';
  /** 회계사무소 전송일 */
  submittedAt?: Date;
}

/**
 * 계정 분개
 */
export interface AccountEntry {
  /** 분개 ID */
  id: string;
  /** 날짜 */
  date: Date;
  /** 계정 과목 */
  accountCode: string;
  /** 계정 과목명 */
  accountName: string;
  /** 차변 금액 */
  debitAmount: number;
  /** 대변 금액 */
  creditAmount: number;
  /** 적요 */
  description: string;
  /** 증빙 유형 */
  evidenceType?: 'tax_invoice' | 'receipt' | 'card' | 'transfer' | 'other';
  /** 증빙 ID */
  evidenceId?: string;
}

/**
 * 자산 변동
 */
export interface AssetChange {
  /** 자산 ID */
  assetId: string;
  /** 자산명 */
  assetName: string;
  /** 변동 유형 */
  changeType: 'acquisition' | 'disposal' | 'depreciation';
  /** 변동 금액 */
  amount: number;
  /** 변동일 */
  changeDate: Date;
}

// =============================================================================
// 손익 분석 관련 타입
// =============================================================================

/**
 * 손익계산서
 */
export interface IncomeStatement {
  /** 기간 */
  period: DateRange;
  /** 매출액 */
  revenue: {
    /** 총 매출 */
    totalSales: number;
    /** 채널별 매출 */
    byChannel: Record<SalesChannel, number>;
    /** 상품별 매출 */
    byProduct?: Record<string, number>;
  };
  /** 매출원가 */
  costOfGoodsSold: {
    /** 상품 원가 */
    productCost: number;
    /** 배송비 */
    shippingCost: number;
    /** 포장비 */
    packagingCost: number;
    /** 플랫폼 수수료 */
    platformFee: number;
    /** 합계 */
    total: number;
  };
  /** 매출총이익 */
  grossProfit: number;
  /** 매출총이익률 */
  grossProfitMargin: number;
  /** 판매관리비 */
  operatingExpenses: {
    /** 마케팅비 */
    marketing: number;
    /** 인건비 */
    labor: number;
    /** 임대료 */
    rent: number;
    /** 기타 */
    other: number;
    /** 합계 */
    total: number;
  };
  /** 영업이익 */
  operatingIncome: number;
  /** 영업이익률 */
  operatingIncomeMargin: number;
  /** 영업외수익 */
  nonOperatingIncome: number;
  /** 영업외비용 */
  nonOperatingExpense: number;
  /** 법인세(추정) */
  estimatedTax: number;
  /** 순이익 */
  netIncome: number;
  /** 순이익률 */
  netIncomeMargin: number;
  /** 생성일 */
  generatedAt: Date;
}

/**
 * 손익 분석 리포트
 */
export interface ProfitabilityReport {
  /** 리포트 ID */
  id: string;
  /** 리포트 유형 */
  type: ReportType;
  /** 기간 */
  period: DateRange;
  /** 손익계산서 */
  incomeStatement: IncomeStatement;
  /** 트렌드 분석 */
  trends?: {
    /** 매출 추이 */
    revenueTrend: TrendData[];
    /** 이익률 추이 */
    marginTrend: TrendData[];
  };
  /** 비교 분석 */
  comparison?: {
    /** 전기 대비 */
    previousPeriod?: {
      revenueChange: number;
      profitChange: number;
    };
    /** 전년 동기 대비 */
    yearOverYear?: {
      revenueChange: number;
      profitChange: number;
    };
  };
  /** 인사이트 */
  insights?: string[];
  /** 생성일 */
  generatedAt: Date;
}

/**
 * 트렌드 데이터
 */
export interface TrendData {
  /** 날짜 */
  date: Date;
  /** 값 */
  value: number;
  /** 라벨 */
  label?: string;
}

// =============================================================================
// 에이전트 실행 관련 타입
// =============================================================================

/**
 * 매출정산 태스크 페이로드
 */
export interface RevenueSettlementTaskPayload {
  /** 작업 유형 */
  action: 'collect' | 'reconcile' | 'confirm';
  /** 대상 채널 */
  channels?: SalesChannel[];
  /** 기간 */
  period: DateRange;
  /** 옵션 */
  options?: {
    /** 자동 대사 */
    autoReconcile?: boolean;
    /** 불일치 허용 금액 */
    discrepancyThreshold?: number;
  };
}

/**
 * 비용관리 태스크 페이로드
 */
export interface ExpenseManagementTaskPayload {
  /** 작업 유형 */
  action: 'classify' | 'import_cards' | 'generate_summary';
  /** 기간 */
  period?: DateRange;
  /** 카드 거래 데이터 */
  cardTransactions?: CardTransaction[];
  /** 옵션 */
  options?: {
    /** 자동 분류 */
    autoClassify?: boolean;
    /** 기존 분류 덮어쓰기 */
    overwriteExisting?: boolean;
  };
}

/**
 * 세무 태스크 페이로드
 */
export interface TaxTaskPayload {
  /** 작업 유형 */
  action: 'import_invoices' | 'generate_vat_report' | 'prepare_bookkeeping';
  /** 기간 */
  period?: DateRange;
  /** 세금계산서 데이터 */
  taxInvoices?: TaxInvoice[];
  /** 옵션 */
  options?: {
    /** 회계사무소 자동 전송 */
    autoSubmit?: boolean;
  };
}

/**
 * 손익분석 태스크 페이로드
 */
export interface ProfitAnalysisTaskPayload {
  /** 작업 유형 */
  action: 'calculate' | 'generate_report';
  /** 리포트 유형 */
  reportType?: ReportType;
  /** 기간 */
  period: DateRange;
  /** 옵션 */
  options?: {
    /** 상세 분석 포함 */
    includeDetails?: boolean;
    /** 인사이트 생성 */
    generateInsights?: boolean;
    /** 비교 기간 포함 */
    includeComparison?: boolean;
  };
}

// =============================================================================
// 에이전트 결과 타입
// =============================================================================

/**
 * 매출정산 결과
 */
export interface RevenueSettlementResult {
  /** 처리된 정산 목록 */
  settlements: ChannelSettlement[];
  /** 대사 결과 */
  reconciliationResults?: ReconciliationResult[];
  /** 요약 */
  summary: {
    totalChannels: number;
    totalSettlementAmount: number;
    totalDiscrepancies: number;
  };
}

/**
 * 비용관리 결과
 */
export interface ExpenseManagementResult {
  /** 처리된 비용 목록 */
  expenses?: ExpenseItem[];
  /** 분류된 카드 거래 */
  classifiedTransactions?: CardTransaction[];
  /** 비용 요약 */
  summary?: ExpenseSummary;
}

/**
 * 세무 결과
 */
export interface TaxResult {
  /** 처리된 세금계산서 */
  processedInvoices?: TaxInvoice[];
  /** 부가세 신고 자료 */
  vatReportData?: VatReportData;
  /** 기장 데이터 */
  bookkeepingData?: BookkeepingData;
}

/**
 * 손익분석 결과
 */
export interface ProfitAnalysisResult {
  /** 손익계산서 */
  incomeStatement?: IncomeStatement;
  /** 손익 리포트 */
  report?: ProfitabilityReport;
}
