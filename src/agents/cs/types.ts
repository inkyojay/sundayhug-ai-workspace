/**
 * CS Agent 전용 타입 정의
 * LANE 1 - Core Operations
 */

// =============================================================================
// 문의 관련 타입
// =============================================================================

/**
 * 문의 채널
 */
export enum InquiryChannel {
  KAKAO = 'kakao',           // 카카오톡
  NAVER_TALK = 'naver_talk', // 네이버 톡톡
  EMAIL = 'email',           // 이메일
  BOARD = 'board',           // 게시판
  PHONE = 'phone',           // 전화 (후처리)
  COUPANG_QNA = 'coupang_qna', // 쿠팡 Q&A
  DIRECT = 'direct',         // 자사몰 직접 문의
}

/**
 * 문의 유형
 */
export enum InquiryType {
  PRODUCT = 'product',           // 상품 문의
  DELIVERY = 'delivery',         // 배송 문의
  RETURN_EXCHANGE = 'return_exchange', // 반품/교환 문의
  PAYMENT = 'payment',           // 결제 문의
  CANCEL = 'cancel',             // 주문 취소
  AS = 'as',                     // A/S 문의
  COMPLAINT = 'complaint',       // 불만/클레임
  GENERAL = 'general',           // 일반 문의
  RECOMMENDATION = 'recommendation', // 상품 추천
  STOCK = 'stock',               // 재입고 문의
}

/**
 * 문의 상태
 */
export enum InquiryStatus {
  NEW = 'new',                   // 신규
  IN_PROGRESS = 'in_progress',   // 처리 중
  WAITING_CUSTOMER = 'waiting_customer', // 고객 응답 대기
  ANSWERED = 'answered',         // 답변 완료
  CLOSED = 'closed',             // 종료
  ESCALATED = 'escalated',       // 에스컬레이션
}

/**
 * 문의 우선순위
 */
export enum InquiryPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 문의 정보
 */
export interface Inquiry {
  id: string;
  channel: InquiryChannel;
  channelInquiryId?: string;
  type: InquiryType;
  status: InquiryStatus;
  priority: InquiryPriority;
  customerId?: string;
  customerName: string;
  customerContact: string;
  orderId?: string;
  productId?: string;
  subject: string;
  content: string;
  attachments?: string[];
  responses: InquiryResponse[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 문의 응답
 */
export interface InquiryResponse {
  id: string;
  content: string;
  respondedBy: 'ai' | 'human';
  agentId?: string;
  createdAt: Date;
  isInternal?: boolean;
}

/**
 * AI 응답 생성 결과
 */
export interface AIResponseResult {
  inquiryId: string;
  suggestedResponse: string;
  confidence: number;
  autoRespond: boolean;
  requiresHumanReview: boolean;
  reasoning?: string;
  relatedFAQs?: string[];
}

// =============================================================================
// 리뷰 관련 타입
// =============================================================================

/**
 * 리뷰 플랫폼
 */
export enum ReviewPlatform {
  COUPANG = 'coupang',
  NAVER = 'naver',
  CAFE24 = 'cafe24',
  GOOGLE = 'google',
  INSTAGRAM = 'instagram',
  BLOG = 'blog',
}

/**
 * 감성 분류
 */
export enum SentimentType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

/**
 * 리뷰 정보
 */
export interface Review {
  id: string;
  platform: ReviewPlatform;
  platformReviewId: string;
  productId: string;
  productName: string;
  customerId?: string;
  customerName: string;
  rating: number;
  content: string;
  images?: string[];
  sentiment: SentimentType;
  sentimentScore: number;
  keywords: string[];
  hasResponse: boolean;
  response?: ReviewResponse;
  createdAt: Date;
  collectedAt: Date;
}

/**
 * 리뷰 응답
 */
export interface ReviewResponse {
  content: string;
  respondedBy: 'ai' | 'human';
  respondedAt: Date;
  platformResponseId?: string;
}

/**
 * 리뷰 분석 결과
 */
export interface ReviewAnalysisResult {
  totalReviews: number;
  averageRating: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topPositiveKeywords: string[];
  topNegativeKeywords: string[];
  improvementSuggestions: string[];
  period: {
    start: Date;
    end: Date;
  };
}

// =============================================================================
// AS 관련 타입
// =============================================================================

/**
 * AS 유형
 */
export enum ASType {
  REPAIR = 'repair',           // 수리
  REPLACEMENT = 'replacement', // 부품 교체
  MAINTENANCE = 'maintenance', // 유지보수
  INSPECTION = 'inspection',   // 점검
}

/**
 * AS 상태
 */
export enum ASStatus {
  REQUESTED = 'requested',       // 접수됨
  CONFIRMED = 'confirmed',       // 확인됨
  IN_PROGRESS = 'in_progress',   // 진행 중
  WAITING_PARTS = 'waiting_parts', // 부품 대기
  COMPLETED = 'completed',       // 완료
  CANCELLED = 'cancelled',       // 취소
}

/**
 * AS 요청
 */
export interface ASRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerContact: string;
  orderId?: string;
  productId: string;
  productName: string;
  purchaseDate?: Date;
  type: ASType;
  status: ASStatus;
  symptom: string;
  diagnosis?: string;
  solution?: string;
  cost?: ASCost;
  scheduledDate?: Date;
  completedDate?: Date;
  technicianNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AS 비용
 */
export interface ASCost {
  laborCost: number;
  partsCost: number;
  shippingCost: number;
  totalCost: number;
  warranty: boolean;
  warrantyNote?: string;
}

// =============================================================================
// VOC (Voice of Customer) 관련 타입
// =============================================================================

/**
 * VOC 카테고리
 */
export enum VOCCategory {
  PRODUCT_QUALITY = 'product_quality',     // 상품 품질
  PRODUCT_FUNCTION = 'product_function',   // 상품 기능
  PACKAGING = 'packaging',                 // 포장
  DELIVERY = 'delivery',                   // 배송
  PRICE = 'price',                         // 가격
  CS = 'cs',                               // 고객서비스
  WEBSITE = 'website',                     // 웹사이트/앱
  OTHER = 'other',                         // 기타
}

/**
 * VOC 유형
 */
export enum VOCType {
  PRAISE = 'praise',         // 칭찬
  SUGGESTION = 'suggestion', // 제안
  COMPLAINT = 'complaint',   // 불만
  INQUIRY = 'inquiry',       // 문의
  BUG_REPORT = 'bug_report', // 버그 신고
}

/**
 * VOC 항목
 */
export interface VOCItem {
  id: string;
  source: 'inquiry' | 'review' | 'claim' | 'social';
  sourceId: string;
  category: VOCCategory;
  type: VOCType;
  content: string;
  extractedKeywords: string[];
  sentiment: SentimentType;
  sentimentScore: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  actionTaken?: string;
  createdAt: Date;
  analyzedAt: Date;
}

/**
 * VOC 분석 리포트
 */
export interface VOCAnalysisReport {
  period: {
    start: Date;
    end: Date;
  };
  totalItems: number;
  byCategory: Record<VOCCategory, number>;
  byType: Record<VOCType, number>;
  sentimentTrend: {
    positive: number;
    neutral: number;
    negative: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  topIssues: {
    issue: string;
    count: number;
    category: VOCCategory;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];
  insights: string[];
  recommendations: string[];
}

// =============================================================================
// 클레임 관련 타입
// =============================================================================

/**
 * 클레임 유형
 */
export enum ClaimType {
  PRODUCT_DEFECT = 'product_defect',     // 상품 불량
  DAMAGED = 'damaged',                   // 파손
  WRONG_DELIVERY = 'wrong_delivery',     // 오배송
  MISSING_ITEM = 'missing_item',         // 누락
  LATE_DELIVERY = 'late_delivery',       // 배송 지연
  SERVICE_ISSUE = 'service_issue',       // 서비스 불만
  OVERCHARGE = 'overcharge',             // 과다 청구
  OTHER = 'other',                       // 기타
}

/**
 * 클레임 상태
 */
export enum ClaimStatus {
  SUBMITTED = 'submitted',       // 제출됨
  REVIEWING = 'reviewing',       // 검토 중
  INVESTIGATING = 'investigating', // 조사 중
  RESOLVED = 'resolved',         // 해결됨
  REJECTED = 'rejected',         // 반려됨
  ESCALATED = 'escalated',       // 에스컬레이션
}

/**
 * 클레임 정보
 */
export interface Claim {
  id: string;
  customerId?: string;
  customerName: string;
  customerContact: string;
  orderId?: string;
  productId?: string;
  type: ClaimType;
  status: ClaimStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string[];
  investigation?: ClaimInvestigation;
  resolution?: ClaimResolution;
  compensationRequested?: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

/**
 * 클레임 조사
 */
export interface ClaimInvestigation {
  investigatorNote: string;
  findings: string;
  customerFault: boolean;
  sellerFault: boolean;
  thirdPartyFault: boolean;
  investigatedAt: Date;
}

/**
 * 클레임 해결
 */
export interface ClaimResolution {
  type: 'refund' | 'replacement' | 'repair' | 'compensation' | 'apology' | 'rejected';
  description: string;
  compensationAmount?: number;
  compensationType?: 'cash' | 'point' | 'coupon' | 'product';
  resolvedBy: string;
  resolvedAt: Date;
  customerAccepted?: boolean;
}

// =============================================================================
// CS Agent 설정 타입
// =============================================================================

/**
 * CS Agent 설정
 */
export interface CSAgentConfig {
  autoResponseEnabled: boolean;
  autoResponseConfidenceThreshold: number;
  reviewAutoReplyEnabled: boolean;
  reviewAutoReplyMinRating: number;
  claimAutoEscalateAmount: number;
  vipCustomerPriority: boolean;
  workingHours: {
    start: number;
    end: number;
    timezone: string;
  };
  escalationRules: {
    waitTimeMinutes: number;
    negativeSentimentThreshold: number;
    repeatInquiryCount: number;
  };
}
