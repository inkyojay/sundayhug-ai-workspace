/**
 * Loyalty Agent 전용 타입 정의
 * LANE 4: Analytics & Growth
 */

// =============================================================================
// 공통 열거형
// =============================================================================

/**
 * 멤버십 등급
 */
export enum MembershipTier {
  BASIC = 'basic',           // 베이직
  SILVER = 'silver',         // 실버
  GOLD = 'gold',             // 골드
  PLATINUM = 'platinum',     // 플래티넘
  VIP = 'vip',               // VIP
  VVIP = 'vvip',             // VVIP
}

/**
 * 포인트 트랜잭션 타입
 */
export enum PointTransactionType {
  EARN_PURCHASE = 'earn_purchase',           // 구매 적립
  EARN_REVIEW = 'earn_review',               // 리뷰 적립
  EARN_EVENT = 'earn_event',                 // 이벤트 적립
  EARN_REFERRAL = 'earn_referral',           // 추천 적립
  EARN_BIRTHDAY = 'earn_birthday',           // 생일 적립
  EARN_SIGNUP = 'earn_signup',               // 가입 적립
  EARN_ADMIN = 'earn_admin',                 // 관리자 지급
  USE_ORDER = 'use_order',                   // 주문 사용
  USE_GIFT = 'use_gift',                     // 선물 사용
  EXPIRE = 'expire',                         // 소멸
  CANCEL_EARN = 'cancel_earn',               // 적립 취소
  CANCEL_USE = 'cancel_use',                 // 사용 취소
}

/**
 * VIP 상태
 */
export enum VIPStatus {
  ACTIVE = 'active',             // 활성
  AT_RISK = 'at_risk',           // 이탈 위험
  DORMANT = 'dormant',           // 휴면
  CHURNED = 'churned',           // 이탈
  REACTIVATED = 'reactivated',   // 재활성화
}

/**
 * 혜택 타입
 */
export enum BenefitType {
  DISCOUNT = 'discount',               // 할인
  FREE_SHIPPING = 'free_shipping',     // 무료배송
  POINT_MULTIPLIER = 'point_multiplier', // 포인트 배수
  EXCLUSIVE_PRODUCT = 'exclusive_product', // 전용 상품
  EARLY_ACCESS = 'early_access',       // 조기 접근
  GIFT = 'gift',                       // 증정품
  PRIORITY_CS = 'priority_cs',         // 우선 CS
  PERSONAL_SHOPPER = 'personal_shopper', // 개인 쇼핑 어시스턴트
}

/**
 * 쿠폰 상태
 */
export enum CouponStatus {
  ACTIVE = 'active',           // 활성
  USED = 'used',               // 사용됨
  EXPIRED = 'expired',         // 만료
  CANCELLED = 'cancelled',     // 취소됨
}

// =============================================================================
// 멤버십 관련 타입
// =============================================================================

/**
 * 멤버십 회원
 */
export interface MembershipMember {
  /** 회원 ID */
  id: string;
  /** 고객 ID */
  customerId: string;
  /** 현재 등급 */
  currentTier: MembershipTier;
  /** 다음 등급 */
  nextTier?: MembershipTier;
  /** 등급 유지 조건 달성률 */
  tierProgress: {
    /** 현재 등급 유지 진행률 */
    maintainProgress: number;
    /** 승급 진행률 */
    upgradeProgress: number;
    /** 필요 조건 */
    requirements: {
      criterion: string;
      current: number;
      target: number;
    }[];
  };
  /** 누적 구매 금액 */
  totalPurchaseAmount: number;
  /** 누적 구매 횟수 */
  totalPurchaseCount: number;
  /** 현재 포인트 */
  currentPoints: number;
  /** 소멸 예정 포인트 */
  expiringPoints: {
    amount: number;
    expiryDate: Date;
  }[];
  /** 가입일 */
  joinedAt: Date;
  /** 등급 갱신일 */
  tierUpdatedAt: Date;
  /** 마지막 구매일 */
  lastPurchaseAt?: Date;
  /** VIP 상태 */
  vipStatus?: VIPStatus;
  /** 선호 카테고리 */
  preferredCategories: string[];
  /** 생년월일 */
  birthDate?: Date;
  /** 연락처 정보 */
  contact: {
    phone: string;
    email: string;
    kakaoId?: string;
  };
}

/**
 * 멤버십 등급 규칙
 */
export interface TierRule {
  /** 등급 */
  tier: MembershipTier;
  /** 등급명 */
  displayName: string;
  /** 설명 */
  description: string;
  /** 승급 조건 */
  upgradeConditions: {
    /** 최소 구매 금액 */
    minPurchaseAmount?: number;
    /** 최소 구매 횟수 */
    minPurchaseCount?: number;
    /** 평가 기간 (개월) */
    evaluationPeriodMonths: number;
    /** AND/OR 조건 */
    conditionType: 'and' | 'or';
  };
  /** 유지 조건 */
  maintainConditions: {
    /** 최소 구매 금액 */
    minPurchaseAmount?: number;
    /** 최소 구매 횟수 */
    minPurchaseCount?: number;
    /** 평가 기간 (개월) */
    evaluationPeriodMonths: number;
  };
  /** 혜택 목록 */
  benefits: TierBenefit[];
  /** 포인트 적립률 (%) */
  pointEarnRate: number;
  /** 활성화 여부 */
  active: boolean;
}

/**
 * 등급 혜택
 */
export interface TierBenefit {
  /** 혜택 ID */
  id: string;
  /** 혜택 타입 */
  type: BenefitType;
  /** 혜택명 */
  name: string;
  /** 설명 */
  description: string;
  /** 혜택 값 */
  value: {
    discountRate?: number;
    discountAmount?: number;
    pointMultiplier?: number;
    freeShippingThreshold?: number;
    giftProductId?: string;
  };
  /** 적용 조건 */
  conditions?: {
    minOrderAmount?: number;
    applicableCategories?: string[];
    maxUsagePerMonth?: number;
  };
}

/**
 * 등급 변경 이력
 */
export interface TierChangeHistory {
  /** 이력 ID */
  id: string;
  /** 회원 ID */
  memberId: string;
  /** 이전 등급 */
  previousTier: MembershipTier;
  /** 새 등급 */
  newTier: MembershipTier;
  /** 변경 타입 */
  changeType: 'upgrade' | 'downgrade' | 'maintain';
  /** 변경 사유 */
  reason: string;
  /** 변경일 */
  changedAt: Date;
  /** 평가 데이터 */
  evaluationData: {
    purchaseAmount: number;
    purchaseCount: number;
    evaluationPeriodStart: Date;
    evaluationPeriodEnd: Date;
  };
}

// =============================================================================
// 포인트 관련 타입
// =============================================================================

/**
 * 포인트 계정
 */
export interface PointAccount {
  /** 계정 ID */
  id: string;
  /** 회원 ID */
  memberId: string;
  /** 총 잔액 */
  totalBalance: number;
  /** 가용 잔액 */
  availableBalance: number;
  /** 보류 중 잔액 */
  pendingBalance: number;
  /** 만료 예정 */
  upcomingExpiry: {
    amount: number;
    expiryDate: Date;
  }[];
  /** 마지막 적립일 */
  lastEarnedAt?: Date;
  /** 마지막 사용일 */
  lastUsedAt?: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 포인트 트랜잭션
 */
export interface PointTransaction {
  /** 트랜잭션 ID */
  id: string;
  /** 회원 ID */
  memberId: string;
  /** 트랜잭션 타입 */
  type: PointTransactionType;
  /** 금액 */
  amount: number;
  /** 잔액 */
  balance: number;
  /** 관련 주문 ID */
  orderId?: string;
  /** 설명 */
  description: string;
  /** 만료일 (적립인 경우) */
  expiryDate?: Date;
  /** 원본 트랜잭션 ID (취소인 경우) */
  originalTransactionId?: string;
  /** 생성일 */
  createdAt: Date;
}

/**
 * 포인트 정책
 */
export interface PointPolicy {
  /** 정책 ID */
  id: string;
  /** 정책명 */
  name: string;
  /** 적립 규칙 */
  earnRules: {
    /** 기본 적립률 (%) */
    baseRate: number;
    /** 등급별 추가 적립률 */
    tierBonusRates: {
      tier: MembershipTier;
      bonusRate: number;
    }[];
    /** 특별 적립 이벤트 */
    specialEvents: {
      name: string;
      multiplier: number;
      startDate: Date;
      endDate: Date;
      conditions?: Record<string, unknown>;
    }[];
  };
  /** 사용 규칙 */
  useRules: {
    /** 최소 사용 포인트 */
    minUsePoints: number;
    /** 최대 사용 비율 (%) */
    maxUseRate: number;
    /** 최대 사용 포인트 */
    maxUsePoints?: number;
    /** 사용 불가 상품 */
    excludedProducts?: string[];
    /** 사용 불가 카테고리 */
    excludedCategories?: string[];
  };
  /** 소멸 규칙 */
  expiryRules: {
    /** 유효 기간 (월) */
    validityMonths: number;
    /** 소멸 예정 알림 (일 전) */
    notifyDaysBefore: number;
  };
  /** 활성화 여부 */
  active: boolean;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 포인트 적립 예정
 */
export interface PendingPointEarn {
  /** ID */
  id: string;
  /** 회원 ID */
  memberId: string;
  /** 주문 ID */
  orderId: string;
  /** 적립 예정 포인트 */
  amount: number;
  /** 예정 적립일 */
  scheduledAt: Date;
  /** 상태 */
  status: 'pending' | 'completed' | 'cancelled';
  /** 생성일 */
  createdAt: Date;
}

// =============================================================================
// VIP 관리 관련 타입
// =============================================================================

/**
 * VIP 프로필
 */
export interface VIPProfile {
  /** 프로필 ID */
  id: string;
  /** 회원 ID */
  memberId: string;
  /** VIP 상태 */
  status: VIPStatus;
  /** VIP 점수 */
  vipScore: number;
  /** 이탈 위험도 */
  churnRisk: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
  };
  /** 고객 가치 */
  customerValue: {
    ltv: number;  // 생애 가치
    averageOrderValue: number;
    purchaseFrequency: number;
    lastPurchaseDays: number;
  };
  /** 선호도 */
  preferences: {
    preferredProducts: string[];
    preferredCategories: string[];
    preferredChannels: string[];
    communicationPreference: 'email' | 'sms' | 'kakao' | 'phone';
  };
  /** 특이사항 */
  notes: {
    date: Date;
    content: string;
    createdBy: string;
  }[];
  /** 전담 담당자 */
  assignedManager?: string;
  /** 마지막 연락일 */
  lastContactedAt?: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * VIP 케어 활동
 */
export interface VIPCareActivity {
  /** 활동 ID */
  id: string;
  /** VIP 프로필 ID */
  vipProfileId: string;
  /** 활동 타입 */
  activityType: 'call' | 'message' | 'gift' | 'exclusive_offer' | 'event_invitation' | 'personal_visit';
  /** 제목 */
  title: string;
  /** 내용 */
  content: string;
  /** 담당자 */
  performedBy: string;
  /** 결과 */
  result?: {
    outcome: 'positive' | 'neutral' | 'negative';
    feedback?: string;
    nextAction?: string;
  };
  /** 예정일 */
  scheduledAt?: Date;
  /** 완료일 */
  completedAt?: Date;
  /** 상태 */
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  /** 생성일 */
  createdAt: Date;
}

/**
 * 이탈 방지 캠페인
 */
export interface RetentionCampaign {
  /** 캠페인 ID */
  id: string;
  /** 캠페인명 */
  name: string;
  /** 대상 세그먼트 */
  targetSegment: {
    tierLevels?: MembershipTier[];
    churnRiskLevel?: ('medium' | 'high' | 'critical')[];
    inactiveDaysMin?: number;
    inactiveDaysMax?: number;
    customConditions?: Record<string, unknown>;
  };
  /** 캠페인 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 제안 내용 */
  offer: {
    type: 'discount' | 'points' | 'gift' | 'exclusive';
    value: number | string;
    description: string;
    validityDays: number;
  };
  /** 채널 */
  channels: ('email' | 'sms' | 'kakao' | 'push')[];
  /** 메시지 템플릿 */
  messageTemplate: {
    subject?: string;
    content: string;
  };
  /** 통계 */
  stats?: {
    targetCount: number;
    sentCount: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    reactivatedCount: number;
  };
  /** 상태 */
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  /** 생성일 */
  createdAt: Date;
}

// =============================================================================
// 쿠폰 관련 타입
// =============================================================================

/**
 * 쿠폰
 */
export interface Coupon {
  /** 쿠폰 ID */
  id: string;
  /** 쿠폰 코드 */
  code: string;
  /** 회원 ID */
  memberId: string;
  /** 쿠폰명 */
  name: string;
  /** 할인 타입 */
  discountType: 'rate' | 'amount';
  /** 할인 값 */
  discountValue: number;
  /** 최대 할인 금액 */
  maxDiscountAmount?: number;
  /** 최소 주문 금액 */
  minOrderAmount?: number;
  /** 적용 가능 카테고리 */
  applicableCategories?: string[];
  /** 적용 가능 제품 */
  applicableProducts?: string[];
  /** 유효 기간 */
  validPeriod: {
    startDate: Date;
    endDate: Date;
  };
  /** 상태 */
  status: CouponStatus;
  /** 사용일 */
  usedAt?: Date;
  /** 사용 주문 ID */
  usedOrderId?: string;
  /** 발급 사유 */
  issuedReason: string;
  /** 발급일 */
  issuedAt: Date;
}

// =============================================================================
// 서브에이전트 태스크 타입
// =============================================================================

/**
 * 멤버십 서브에이전트 태스크
 */
export interface MembershipTaskPayload {
  action: 'evaluate_tier' | 'apply_benefits' | 'process_upgrade' | 'send_notification';
  memberId?: string;
  memberIds?: string[];
  evaluationDate?: Date;
  notificationType?: 'tier_change' | 'tier_expiry_warning' | 'benefit_reminder';
}

/**
 * 포인트 서브에이전트 태스크
 */
export interface PointTaskPayload {
  action: 'earn_points' | 'use_points' | 'expire_points' | 'cancel_transaction' | 'calculate_expiry';
  memberId: string;
  amount?: number;
  orderId?: string;
  transactionId?: string;
  reason?: string;
  expiryNotificationDays?: number;
}

/**
 * VIP 관리 서브에이전트 태스크
 */
export interface VIPTaskPayload {
  action: 'analyze_churn_risk' | 'create_care_activity' | 'execute_retention' | 'update_vip_score';
  vipProfileId?: string;
  memberIds?: string[];
  campaignId?: string;
  activityData?: Partial<VIPCareActivity>;
  retentionCampaignData?: Partial<RetentionCampaign>;
}
