/**
 * Logistics Agent 전용 타입 정의
 * LANE 1 - Core Operations
 */

// =============================================================================
// 3PL/풀필먼트 관련 타입
// =============================================================================

/**
 * 풀필먼트 센터
 */
export interface FulfillmentCenter {
  id: string;
  name: string;
  provider: string;
  address: string;
  region: string;
  capacity: number;
  currentUtilization: number;
  isActive: boolean;
  contactInfo: {
    email: string;
    phone: string;
    manager: string;
  };
  operatingHours: {
    start: string;
    end: string;
    workDays: number[];
  };
  services: FulfillmentService[];
  fees: FulfillmentFees;
}

/**
 * 풀필먼트 서비스 유형
 */
export enum FulfillmentService {
  STORAGE = 'storage',               // 보관
  PICK_PACK = 'pick_pack',           // 피킹/패킹
  SHIPPING = 'shipping',             // 배송
  RETURN_PROCESSING = 'return_processing', // 반품 처리
  GIFT_WRAPPING = 'gift_wrapping',   // 선물 포장
  QUALITY_CHECK = 'quality_check',   // 품질 검수
  LABELING = 'labeling',             // 라벨링
}

/**
 * 풀필먼트 수수료
 */
export interface FulfillmentFees {
  storageFeePerUnit: number;
  pickPackFeePerOrder: number;
  shippingFeeBase: number;
  additionalItemFee: number;
  returnProcessingFee: number;
  specialHandlingFee?: number;
}

/**
 * 풀필먼트 성과 지표
 */
export interface FulfillmentPerformance {
  centerId: string;
  centerName: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalOrders: number;
    ordersShipped: number;
    ordersOnTime: number;
    ordersFailed: number;
    averageProcessingTime: number; // 분
    accuracyRate: number; // %
    returnRate: number; // %
  };
  sla: {
    onTimeDeliveryTarget: number;
    actualOnTimeDelivery: number;
    accuracyTarget: number;
    actualAccuracy: number;
  };
  issues: FulfillmentIssue[];
}

/**
 * 풀필먼트 이슈
 */
export interface FulfillmentIssue {
  id: string;
  type: 'delay' | 'damage' | 'lost' | 'wrong_item' | 'quality' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  orderId?: string;
  description: string;
  occurredAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

// =============================================================================
// 배송 최적화 관련 타입
// =============================================================================

/**
 * 택배사 정보
 */
export interface CourierCompany {
  id: string;
  name: string;
  code: string;
  apiSupported: boolean;
  coverageRegions: string[];
  services: CourierService[];
  pricing: CourierPricing;
  performance: CourierPerformance;
  isActive: boolean;
}

/**
 * 택배 서비스 유형
 */
export enum CourierService {
  STANDARD = 'standard',         // 일반 배송
  EXPRESS = 'express',           // 익일 배송
  SAME_DAY = 'same_day',         // 당일 배송
  DAWN = 'dawn',                 // 새벽 배송
  SCHEDULED = 'scheduled',       // 지정일 배송
  FRESH = 'fresh',               // 신선 배송
  OVERSEAS = 'overseas',         // 해외 배송
}

/**
 * 택배 가격 정보
 */
export interface CourierPricing {
  basePrice: number;
  weightLimits: {
    upTo2kg: number;
    upTo5kg: number;
    upTo10kg: number;
    upTo20kg: number;
    over20kg: number;
  };
  sizeSurcharge: {
    small: number;
    medium: number;
    large: number;
    oversized: number;
  };
  regionSurcharge: {
    jeju: number;
    island: number;
  };
  fuelSurcharge?: number;
  volumeDiscount?: {
    tier1: { minVolume: number; discountPercent: number };
    tier2: { minVolume: number; discountPercent: number };
    tier3: { minVolume: number; discountPercent: number };
  };
}

/**
 * 택배사 성과
 */
export interface CourierPerformance {
  courierId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalShipments: number;
  deliveredOnTime: number;
  deliveredLate: number;
  lost: number;
  damaged: number;
  averageDeliveryDays: number;
  customerSatisfaction?: number;
}

/**
 * 배송 비용 분석
 */
export interface ShippingCostAnalysis {
  totalShipments: number;
  totalCost: number;
  averageCostPerShipment: number;
  byCourier: {
    courierId: string;
    courierName: string;
    shipments: number;
    totalCost: number;
    averageCost: number;
  }[];
  byRegion: {
    region: string;
    shipments: number;
    totalCost: number;
    averageCost: number;
  }[];
  byService: {
    service: CourierService;
    shipments: number;
    totalCost: number;
    averageCost: number;
  }[];
  savingsOpportunities: {
    description: string;
    estimatedSavings: number;
    implementation: string;
  }[];
}

/**
 * 택배사 추천
 */
export interface CourierRecommendation {
  orderId: string;
  recommendations: {
    courierId: string;
    courierName: string;
    service: CourierService;
    estimatedCost: number;
    estimatedDeliveryDays: number;
    score: number;
    reasons: string[];
  }[];
  selectedCourier?: string;
}

// =============================================================================
// 품질 관리 관련 타입
// =============================================================================

/**
 * 배송 품질 이슈 유형
 */
export enum QualityIssueType {
  DELAY = 'delay',                   // 배송 지연
  DAMAGE = 'damage',                 // 파손
  LOST = 'lost',                     // 분실
  WRONG_ADDRESS = 'wrong_address',   // 주소 오류
  WRONG_ITEM = 'wrong_item',         // 오배송
  INCOMPLETE = 'incomplete',         // 누락
  CUSTOMER_ABSENCE = 'customer_absence', // 부재
  RETURN_ISSUE = 'return_issue',     // 반품 문제
}

/**
 * 품질 이슈 상태
 */
export enum QualityIssueStatus {
  DETECTED = 'detected',       // 감지됨
  INVESTIGATING = 'investigating', // 조사 중
  RESOLVED = 'resolved',       // 해결됨
  ESCALATED = 'escalated',     // 에스컬레이션
  CLOSED = 'closed',           // 종료
}

/**
 * 품질 이슈
 */
export interface QualityIssue {
  id: string;
  type: QualityIssueType;
  status: QualityIssueStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  orderId?: string;
  shipmentId?: string;
  courierId?: string;
  fulfillmentCenterId?: string;
  description: string;
  rootCause?: string;
  impact?: {
    affectedOrders: number;
    financialImpact: number;
    customerImpact: string;
  };
  resolution?: {
    action: string;
    resolvedAt: Date;
    resolvedBy: string;
    preventiveMeasure?: string;
  };
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 품질 모니터링 결과
 */
export interface QualityMonitoringResult {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalShipments: number;
    issuesDetected: number;
    issueRate: number;
    criticalIssues: number;
    resolvedIssues: number;
  };
  byType: Record<QualityIssueType, number>;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  trends: {
    date: Date;
    issueCount: number;
    issueRate: number;
  }[];
  topIssues: QualityIssue[];
  alerts: {
    type: string;
    message: string;
    severity: 'warning' | 'critical';
    triggeredAt: Date;
  }[];
}

/**
 * 품질 KPI
 */
export interface QualityKPI {
  period: {
    start: Date;
    end: Date;
  };
  kpis: {
    onTimeDeliveryRate: number;
    damageRate: number;
    lostRate: number;
    accuracyRate: number;
    customerSatisfaction?: number;
  };
  targets: {
    onTimeDeliveryRate: number;
    damageRate: number;
    lostRate: number;
    accuracyRate: number;
  };
  status: {
    onTimeDeliveryRate: 'good' | 'warning' | 'critical';
    damageRate: 'good' | 'warning' | 'critical';
    lostRate: 'good' | 'warning' | 'critical';
    accuracyRate: 'good' | 'warning' | 'critical';
  };
}

// =============================================================================
// Logistics Agent 설정 타입
// =============================================================================

/**
 * Logistics Agent 설정
 */
export interface LogisticsAgentConfig {
  fulfillmentConfig: {
    preferredCenters: string[];
    autoAssignEnabled: boolean;
    performanceThreshold: number;
  };
  shippingConfig: {
    preferredCouriers: string[];
    costOptimizationEnabled: boolean;
    defaultService: CourierService;
    maxCostPerShipment: number;
  };
  qualityConfig: {
    monitoringEnabled: boolean;
    alertThresholds: {
      delayRate: number;
      damageRate: number;
      lostRate: number;
    };
    autoEscalateEnabled: boolean;
  };
}
