/**
 * Order Agent 전용 타입 정의
 * LANE 1 - Core Operations
 */

import { SalesChannel, OrderStatus, CustomerInfo, ShippingInfo, OrderItem, PaymentInfo } from '../../types';

// =============================================================================
// 주문 수집 관련 타입
// =============================================================================

/**
 * 채널별 주문 수집 결과
 */
export interface OrderCollectionResult {
  channel: SalesChannel;
  success: boolean;
  ordersCollected: number;
  newOrders: number;
  updatedOrders: number;
  failedOrders: number;
  errors?: OrderCollectionError[];
  collectedAt: Date;
}

/**
 * 주문 수집 에러
 */
export interface OrderCollectionError {
  channelOrderId: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}

/**
 * 주문 수집 설정
 */
export interface OrderCollectionConfig {
  channels: SalesChannel[];
  syncInterval: number; // 분 단위
  batchSize: number;
  lookbackHours: number; // 몇 시간 전 주문까지 수집
}

// =============================================================================
// 배송 관리 관련 타입
// =============================================================================

/**
 * 배송 상태
 */
export enum ShippingStatus {
  PENDING = 'pending',           // 배송 대기
  PICKED_UP = 'picked_up',       // 수거 완료
  IN_TRANSIT = 'in_transit',     // 배송 중
  OUT_FOR_DELIVERY = 'out_for_delivery', // 배송 출발
  DELIVERED = 'delivered',       // 배송 완료
  FAILED = 'failed',             // 배송 실패
  RETURNED = 'returned',         // 반송됨
}

/**
 * 택배사 정보
 */
export interface CourierInfo {
  code: string;
  name: string;
  apiSupported: boolean;
  trackingUrlTemplate?: string;
}

/**
 * 송장 등록 요청
 */
export interface TrackingNumberRequest {
  orderId: string;
  channelOrderId: string;
  channel: SalesChannel;
  courierCode: string;
  trackingNumber: string;
}

/**
 * 송장 등록 결과
 */
export interface TrackingNumberResult {
  orderId: string;
  success: boolean;
  registeredAt?: Date;
  error?: string;
}

/**
 * 배송 추적 정보
 */
export interface ShippingTrackingInfo {
  orderId: string;
  trackingNumber: string;
  courierCode: string;
  courierName: string;
  status: ShippingStatus;
  events: ShippingEvent[];
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  updatedAt: Date;
}

/**
 * 배송 이벤트
 */
export interface ShippingEvent {
  timestamp: Date;
  status: ShippingStatus;
  location?: string;
  description: string;
}

// =============================================================================
// 반품/교환 관련 타입
// =============================================================================

/**
 * 반품/교환 유형
 */
export enum ReturnExchangeType {
  RETURN = 'return',             // 반품 (환불)
  EXCHANGE = 'exchange',         // 교환
  PARTIAL_RETURN = 'partial_return', // 부분 반품
}

/**
 * 반품/교환 사유
 */
export enum ReturnReason {
  CUSTOMER_CHANGE_MIND = 'customer_change_mind',   // 단순 변심
  WRONG_SIZE = 'wrong_size',                       // 사이즈 불일치
  WRONG_PRODUCT = 'wrong_product',                 // 오배송
  DEFECTIVE = 'defective',                         // 불량
  DAMAGED = 'damaged',                             // 파손
  NOT_AS_DESCRIBED = 'not_as_described',           // 상품 설명과 다름
  LATE_DELIVERY = 'late_delivery',                 // 배송 지연
  OTHER = 'other',                                 // 기타
}

/**
 * 반품/교환 상태
 */
export enum ReturnStatus {
  REQUESTED = 'requested',           // 요청됨
  APPROVED = 'approved',             // 승인됨
  PICKUP_SCHEDULED = 'pickup_scheduled', // 수거 예정
  PICKED_UP = 'picked_up',           // 수거 완료
  INSPECTING = 'inspecting',         // 검수 중
  INSPECTION_PASSED = 'inspection_passed', // 검수 통과
  INSPECTION_FAILED = 'inspection_failed', // 검수 불합격
  REFUND_PROCESSING = 'refund_processing', // 환불 처리 중
  REFUND_COMPLETED = 'refund_completed', // 환불 완료
  EXCHANGE_SHIPPING = 'exchange_shipping', // 교환품 배송 중
  COMPLETED = 'completed',           // 완료
  REJECTED = 'rejected',             // 반려
  CANCELLED = 'cancelled',           // 취소
}

/**
 * 반품/교환 요청
 */
export interface ReturnExchangeRequest {
  id: string;
  orderId: string;
  channelOrderId: string;
  channel: SalesChannel;
  type: ReturnExchangeType;
  reason: ReturnReason;
  reasonDetail?: string;
  items: ReturnItem[];
  status: ReturnStatus;
  pickupInfo?: PickupInfo;
  refundInfo?: RefundInfo;
  exchangeInfo?: ExchangeInfo;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 반품 상품
 */
export interface ReturnItem {
  orderItemId: string;
  productId: string;
  productName: string;
  optionName?: string;
  quantity: number;
  returnQuantity: number;
  unitPrice: number;
  returnAmount: number;
}

/**
 * 수거 정보
 */
export interface PickupInfo {
  scheduledDate: Date;
  courierCode: string;
  courierName: string;
  trackingNumber?: string;
  status: 'scheduled' | 'picked_up' | 'in_transit' | 'arrived' | 'failed';
  address: string;
  contactPhone: string;
  memo?: string;
}

/**
 * 환불 정보
 */
export interface RefundInfo {
  totalRefundAmount: number;
  productRefundAmount: number;
  shippingRefundAmount: number;
  deductions: RefundDeduction[];
  method: 'original' | 'bank_transfer' | 'point';
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * 환불 차감 내역
 */
export interface RefundDeduction {
  type: 'shipping_fee' | 'restocking_fee' | 'damage_fee' | 'other';
  amount: number;
  reason: string;
}

/**
 * 교환 정보
 */
export interface ExchangeInfo {
  newProductId: string;
  newProductName: string;
  newOptionName?: string;
  priceDifference: number;
  shippingInfo?: ShippingInfo;
  trackingNumber?: string;
  status: 'pending' | 'preparing' | 'shipping' | 'delivered';
}

// =============================================================================
// Order Agent 작업 타입
// =============================================================================

/**
 * Order Agent 작업 유형
 */
export type OrderAgentTaskType =
  | 'collect_orders'
  | 'register_tracking'
  | 'update_shipping_status'
  | 'process_return_request'
  | 'process_exchange_request'
  | 'schedule_pickup'
  | 'process_refund'
  | 'sync_order_status';

/**
 * Order Agent 설정
 */
export interface OrderAgentConfig {
  collectionConfig: OrderCollectionConfig;
  enabledChannels: SalesChannel[];
  autoRegisterTracking: boolean;
  autoApproveReturn: {
    enabled: boolean;
    maxAmount: number;
    allowedReasons: ReturnReason[];
  };
  notificationSettings: {
    notifyOnNewOrder: boolean;
    notifyOnShippingUpdate: boolean;
    notifyOnReturnRequest: boolean;
  };
}

/**
 * 채널 API 연동 상태
 */
export interface ChannelApiStatus {
  channel: SalesChannel;
  connected: boolean;
  lastSync?: Date;
  errorCount: number;
  lastError?: string;
}
