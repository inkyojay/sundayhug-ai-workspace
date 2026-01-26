/**
 * Partnership Agent 전용 타입 정의
 * LANE 4: Analytics & Growth
 */

// =============================================================================
// 공통 열거형
// =============================================================================

/**
 * 파트너 타입
 */
export enum PartnerType {
  B2B_CLIENT = 'b2b_client',           // B2B 고객
  WHOLESALER = 'wholesaler',           // 도매상
  DISTRIBUTOR = 'distributor',         // 총판
  GROUP_BUYING = 'group_buying',       // 공동구매
  AFFILIATE = 'affiliate',             // 제휴사
  INSTITUTIONAL = 'institutional',     // 기관
}

/**
 * 파트너 상태
 */
export enum PartnerStatus {
  PROSPECT = 'prospect',               // 잠재
  NEGOTIATING = 'negotiating',         // 협상 중
  ACTIVE = 'active',                   // 활성
  INACTIVE = 'inactive',               // 비활성
  SUSPENDED = 'suspended',             // 일시중단
  TERMINATED = 'terminated',           // 종료
}

/**
 * 계약 상태
 */
export enum ContractStatus {
  DRAFT = 'draft',                     // 초안
  REVIEW = 'review',                   // 검토 중
  NEGOTIATING = 'negotiating',         // 협상 중
  PENDING_SIGNATURE = 'pending_signature', // 서명 대기
  ACTIVE = 'active',                   // 활성
  EXPIRED = 'expired',                 // 만료
  TERMINATED = 'terminated',           // 해지
}

/**
 * 공동구매 상태
 */
export enum GroupBuyingStatus {
  PLANNING = 'planning',               // 기획 중
  RECRUITING = 'recruiting',           // 모집 중
  CONFIRMED = 'confirmed',             // 확정
  PREPARING = 'preparing',             // 준비 중
  IN_PROGRESS = 'in_progress',         // 진행 중
  SHIPPING = 'shipping',               // 배송 중
  COMPLETED = 'completed',             // 완료
  CANCELLED = 'cancelled',             // 취소
}

/**
 * 정산 상태
 */
export enum SettlementStatus {
  PENDING = 'pending',                 // 대기
  CALCULATING = 'calculating',         // 정산 중
  CONFIRMED = 'confirmed',             // 확정
  INVOICED = 'invoiced',               // 청구됨
  PAID = 'paid',                       // 지급완료
  DISPUTED = 'disputed',               // 분쟁
}

// =============================================================================
// 파트너 관련 타입
// =============================================================================

/**
 * 파트너 정보
 */
export interface Partner {
  /** 파트너 ID */
  id: string;
  /** 파트너 타입 */
  type: PartnerType;
  /** 상태 */
  status: PartnerStatus;
  /** 회사명 */
  companyName: string;
  /** 사업자등록번호 */
  businessNumber: string;
  /** 대표자명 */
  representativeName: string;
  /** 담당자 정보 */
  contactPerson: {
    name: string;
    position: string;
    phone: string;
    email: string;
  };
  /** 주소 */
  address: {
    zipCode: string;
    address: string;
    addressDetail: string;
  };
  /** 등급 */
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  /** 할인율 */
  discountRate: number;
  /** 신용 한도 */
  creditLimit?: number;
  /** 결제 조건 */
  paymentTerms: string;
  /** 메모 */
  notes?: string;
  /** 태그 */
  tags: string[];
  /** 등록일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 계약 정보
 */
export interface Contract {
  /** 계약 ID */
  id: string;
  /** 파트너 ID */
  partnerId: string;
  /** 계약 타입 */
  contractType: 'supply' | 'distribution' | 'agency' | 'special';
  /** 상태 */
  status: ContractStatus;
  /** 계약 제목 */
  title: string;
  /** 계약 기간 */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** 자동 갱신 여부 */
  autoRenewal: boolean;
  /** 계약 조건 */
  terms: {
    minimumOrderQuantity?: number;
    minimumOrderAmount?: number;
    discountRate: number;
    paymentTermDays: number;
    exclusivity?: string;
  };
  /** 제품 범위 */
  productScope: {
    productIds?: string[];
    categories?: string[];
    exclusions?: string[];
  };
  /** 지역 범위 */
  territoryScope?: string[];
  /** 첨부 파일 */
  attachments: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  /** 서명 정보 */
  signatures: {
    party: string;
    signedBy: string;
    signedAt: Date;
  }[];
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

// =============================================================================
// B2B 관련 타입
// =============================================================================

/**
 * B2B 문의
 */
export interface B2BInquiry {
  /** 문의 ID */
  id: string;
  /** 파트너 ID (기존 파트너인 경우) */
  partnerId?: string;
  /** 회사명 */
  companyName: string;
  /** 담당자 */
  contactPerson: {
    name: string;
    phone: string;
    email: string;
    position?: string;
  };
  /** 문의 유형 */
  inquiryType: 'quotation' | 'partnership' | 'sample' | 'information' | 'other';
  /** 문의 내용 */
  content: string;
  /** 관심 제품 */
  interestedProducts: {
    productId: string;
    productName: string;
    estimatedQuantity?: number;
  }[];
  /** 예상 거래 규모 */
  estimatedVolume?: {
    monthlyQuantity: number;
    monthlyAmount: number;
  };
  /** 상태 */
  status: 'new' | 'contacted' | 'negotiating' | 'converted' | 'rejected' | 'closed';
  /** 담당자 */
  assignedTo?: string;
  /** 후속 조치 */
  followUps: {
    date: Date;
    action: string;
    note: string;
    by: string;
  }[];
  /** 수신일 */
  receivedAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 견적서
 */
export interface Quotation {
  /** 견적 ID */
  id: string;
  /** 견적 번호 */
  quotationNumber: string;
  /** 파트너 ID */
  partnerId: string;
  /** 문의 ID 참조 */
  inquiryId?: string;
  /** 상태 */
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  /** 유효기간 */
  validUntil: Date;
  /** 품목 목록 */
  items: QuotationItem[];
  /** 소계 */
  subtotal: number;
  /** 할인 */
  discount: {
    type: 'rate' | 'amount';
    value: number;
    amount: number;
  };
  /** 배송비 */
  shippingFee: number;
  /** 부가세 */
  tax: number;
  /** 총액 */
  totalAmount: number;
  /** 결제 조건 */
  paymentTerms: string;
  /** 배송 조건 */
  shippingTerms: string;
  /** 특이사항 */
  remarks?: string;
  /** 생성일 */
  createdAt: Date;
  /** 발송일 */
  sentAt?: Date;
}

/**
 * 견적 품목
 */
export interface QuotationItem {
  /** 품목 ID */
  id: string;
  /** 제품 ID */
  productId: string;
  /** 제품명 */
  productName: string;
  /** SKU */
  sku: string;
  /** 단가 */
  unitPrice: number;
  /** 수량 */
  quantity: number;
  /** 할인율 */
  discountRate: number;
  /** 할인 후 단가 */
  discountedPrice: number;
  /** 금액 */
  amount: number;
  /** 비고 */
  note?: string;
}

// =============================================================================
// 도매/총판 관련 타입
// =============================================================================

/**
 * 도매 주문
 */
export interface WholesaleOrder {
  /** 주문 ID */
  id: string;
  /** 주문 번호 */
  orderNumber: string;
  /** 파트너 ID */
  partnerId: string;
  /** 주문 유형 */
  orderType: 'regular' | 'urgent' | 'seasonal' | 'promotion';
  /** 상태 */
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  /** 품목 목록 */
  items: WholesaleOrderItem[];
  /** 소계 */
  subtotal: number;
  /** 할인 금액 */
  discountAmount: number;
  /** 배송비 */
  shippingFee: number;
  /** 부가세 */
  tax: number;
  /** 총액 */
  totalAmount: number;
  /** 배송 정보 */
  shipping: {
    method: string;
    address: string;
    requestedDate?: Date;
    trackingNumber?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
  };
  /** 결제 정보 */
  payment: {
    method: 'credit' | 'prepaid' | 'cod';
    dueDate?: Date;
    paidAt?: Date;
    paidAmount?: number;
  };
  /** 메모 */
  notes?: string;
  /** 주문일 */
  orderedAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 도매 주문 품목
 */
export interface WholesaleOrderItem {
  /** 품목 ID */
  id: string;
  /** 제품 ID */
  productId: string;
  /** 제품명 */
  productName: string;
  /** SKU */
  sku: string;
  /** 단가 */
  unitPrice: number;
  /** 수량 */
  quantity: number;
  /** 할인율 */
  discountRate: number;
  /** 금액 */
  amount: number;
  /** 출고 상태 */
  fulfillmentStatus: 'pending' | 'allocated' | 'picked' | 'shipped';
}

// =============================================================================
// 공동구매 관련 타입
// =============================================================================

/**
 * 공동구매 캠페인
 */
export interface GroupBuyingCampaign {
  /** 캠페인 ID */
  id: string;
  /** 캠페인명 */
  name: string;
  /** 상태 */
  status: GroupBuyingStatus;
  /** 주최자 */
  organizer: {
    name: string;
    platform: string;
    contactInfo: string;
    followers?: number;
  };
  /** 기간 */
  period: {
    recruitmentStart: Date;
    recruitmentEnd: Date;
    orderDeadline: Date;
    deliveryStart: Date;
    deliveryEnd: Date;
  };
  /** 제품 정보 */
  products: GroupBuyingProduct[];
  /** 목표 수량 */
  targetQuantity: number;
  /** 현재 수량 */
  currentQuantity: number;
  /** 참가자 수 */
  participantCount: number;
  /** 조건 */
  conditions: {
    minimumQuantity: number;
    maximumQuantity?: number;
    discountRate: number;
    additionalBenefits?: string[];
  };
  /** 배송 방식 */
  deliveryMethod: 'direct' | 'group_pickup' | 'individual';
  /** 수수료율 */
  commissionRate: number;
  /** 정산 정보 */
  settlement?: {
    status: SettlementStatus;
    totalSales: number;
    commission: number;
    netAmount: number;
    settledAt?: Date;
  };
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 공동구매 제품
 */
export interface GroupBuyingProduct {
  /** 제품 ID */
  productId: string;
  /** 제품명 */
  productName: string;
  /** 옵션 */
  options: {
    optionId: string;
    optionName: string;
    originalPrice: number;
    groupPrice: number;
    availableQuantity: number;
    orderedQuantity: number;
  }[];
}

/**
 * 공동구매 참가자
 */
export interface GroupBuyingParticipant {
  /** 참가 ID */
  id: string;
  /** 캠페인 ID */
  campaignId: string;
  /** 구매자 정보 */
  buyer: {
    name: string;
    phone: string;
    email?: string;
  };
  /** 주문 품목 */
  items: {
    productId: string;
    optionId: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
  /** 총액 */
  totalAmount: number;
  /** 배송 정보 */
  shipping: {
    address: string;
    memo?: string;
  };
  /** 결제 상태 */
  paymentStatus: 'pending' | 'paid' | 'refunded';
  /** 배송 상태 */
  deliveryStatus: 'pending' | 'shipped' | 'delivered';
  /** 참가일 */
  joinedAt: Date;
}

// =============================================================================
// 정산 관련 타입
// =============================================================================

/**
 * 정산 내역
 */
export interface Settlement {
  /** 정산 ID */
  id: string;
  /** 정산 번호 */
  settlementNumber: string;
  /** 파트너 ID */
  partnerId: string;
  /** 정산 유형 */
  type: 'wholesale' | 'group_buying' | 'commission' | 'other';
  /** 상태 */
  status: SettlementStatus;
  /** 정산 기간 */
  period: {
    start: Date;
    end: Date;
  };
  /** 상세 내역 */
  details: SettlementDetail[];
  /** 총 매출 */
  totalSales: number;
  /** 총 할인 */
  totalDiscount: number;
  /** 수수료 */
  commission: number;
  /** 기타 공제 */
  deductions: {
    type: string;
    amount: number;
    description: string;
  }[];
  /** 정산 금액 */
  settlementAmount: number;
  /** 지급 예정일 */
  dueDate: Date;
  /** 지급일 */
  paidAt?: Date;
  /** 지급 계좌 */
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  /** 생성일 */
  createdAt: Date;
}

/**
 * 정산 상세
 */
export interface SettlementDetail {
  /** 상세 ID */
  id: string;
  /** 주문 ID */
  orderId: string;
  /** 주문 번호 */
  orderNumber: string;
  /** 거래일 */
  transactionDate: Date;
  /** 제품명 */
  productName: string;
  /** 수량 */
  quantity: number;
  /** 매출 금액 */
  salesAmount: number;
  /** 할인 금액 */
  discountAmount: number;
  /** 수수료 */
  commission: number;
  /** 정산 금액 */
  netAmount: number;
}

// =============================================================================
// 서브에이전트 태스크 타입
// =============================================================================

/**
 * B2B 서브에이전트 태스크
 */
export interface B2BTaskPayload {
  action: 'handle_inquiry' | 'create_quotation' | 'manage_contract' | 'process_order';
  inquiryId?: string;
  partnerId?: string;
  quotationData?: Partial<Quotation>;
  contractData?: Partial<Contract>;
  orderData?: Partial<WholesaleOrder>;
}

/**
 * 도매 서브에이전트 태스크
 */
export interface WholesaleTaskPayload {
  action: 'process_order' | 'manage_inventory' | 'update_pricing' | 'generate_report';
  partnerId?: string;
  orderId?: string;
  priceUpdates?: {
    productId: string;
    newPrice: number;
    effectiveDate: Date;
  }[];
  reportType?: 'sales' | 'inventory' | 'partner_performance';
  period?: {
    start: Date;
    end: Date;
  };
}

/**
 * 공동구매 서브에이전트 태스크
 */
export interface GroupBuyingTaskPayload {
  action: 'create_campaign' | 'manage_orders' | 'process_settlement' | 'send_notification';
  campaignId?: string;
  campaignData?: Partial<GroupBuyingCampaign>;
  settlementPeriod?: {
    start: Date;
    end: Date;
  };
  notificationType?: 'recruitment' | 'deadline' | 'shipping' | 'completion';
}
