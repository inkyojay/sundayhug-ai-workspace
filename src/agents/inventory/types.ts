/**
 * Inventory Agent 전용 타입 정의
 * LANE 1 - Core Operations
 */

import { SalesChannel } from '../../types';

// =============================================================================
// 재고 관련 타입
// =============================================================================

/**
 * 재고 상태
 */
export enum StockStatus {
  IN_STOCK = 'in_stock',         // 재고 있음
  LOW_STOCK = 'low_stock',       // 재고 부족
  OUT_OF_STOCK = 'out_of_stock', // 품절
  DISCONTINUED = 'discontinued', // 단종
}

/**
 * 재고 정보
 */
export interface StockInfo {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  status: StockStatus;
  lowStockThreshold: number;
  location?: string;
  lastUpdated: Date;
}

/**
 * 채널별 재고 정보
 */
export interface ChannelStockInfo {
  productId: string;
  channel: SalesChannel;
  channelProductId: string;
  quantity: number;
  syncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastError?: string;
}

/**
 * 재고 동기화 결과
 */
export interface StockSyncResult {
  channel: SalesChannel;
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors?: StockSyncError[];
  syncedAt: Date;
}

/**
 * 재고 동기화 에러
 */
export interface StockSyncError {
  productId: string;
  errorCode: string;
  errorMessage: string;
}

/**
 * 재고 변동 기록
 */
export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  referenceId?: string;
  referenceType?: 'order' | 'return' | 'adjustment' | 'purchase_order';
  createdAt: Date;
  createdBy: string;
}

/**
 * 재고 변동 유형
 */
export enum StockMovementType {
  INBOUND = 'inbound',           // 입고
  OUTBOUND = 'outbound',         // 출고
  ADJUSTMENT = 'adjustment',     // 조정
  TRANSFER = 'transfer',         // 이동
  RETURN = 'return',             // 반품 입고
  DAMAGE = 'damage',             // 파손/폐기
  RESERVED = 'reserved',         // 예약
  RELEASED = 'released',         // 예약 해제
}

// =============================================================================
// 발주 관련 타입
// =============================================================================

/**
 * 발주 상태
 */
export enum PurchaseOrderStatus {
  DRAFT = 'draft',               // 초안
  PENDING_APPROVAL = 'pending_approval', // 승인 대기
  APPROVED = 'approved',         // 승인됨
  ORDERED = 'ordered',           // 발주됨
  PARTIALLY_RECEIVED = 'partially_received', // 부분 입고
  RECEIVED = 'received',         // 입고 완료
  CANCELLED = 'cancelled',       // 취소됨
}

/**
 * 발주서
 */
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  currency: string;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

/**
 * 발주 품목
 */
export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * 발주 제안
 */
export interface PurchaseOrderSuggestion {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  averageDailySales: number;
  suggestedQuantity: number;
  reorderPoint: number;
  leadTimeDays: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
}

/**
 * 공급업체 정보
 */
export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  leadTimeDays: number;
  minimumOrderAmount?: number;
  paymentTerms?: string;
  rating?: number;
  isActive: boolean;
}

// =============================================================================
// 원가 분석 관련 타입
// =============================================================================

/**
 * 상품 원가 정보
 */
export interface ProductCost {
  productId: string;
  productName: string;
  sku: string;
  purchaseCost: number;
  shippingCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costUpdatedAt: Date;
}

/**
 * 마진 분석 결과
 */
export interface MarginAnalysis {
  productId: string;
  productName: string;
  sellingPrice: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPercent: number;
  channelFees: ChannelFeeBreakdown;
  netMargin: number;
  netMarginPercent: number;
  salesVolume30Days: number;
  totalProfit30Days: number;
}

/**
 * 채널별 수수료 내역
 */
export interface ChannelFeeBreakdown {
  channel: SalesChannel;
  commissionPercent: number;
  commissionAmount: number;
  fulfillmentFee: number;
  advertisingFee?: number;
  otherFees?: number;
  totalFees: number;
}

/**
 * 가격 제안
 */
export interface PriceSuggestion {
  productId: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  targetMarginPercent: number;
  expectedMarginPercent: number;
  competitorPrices?: CompetitorPrice[];
  reason: string;
  confidence: number;
}

/**
 * 경쟁사 가격
 */
export interface CompetitorPrice {
  competitorName: string;
  price: number;
  url?: string;
  collectedAt: Date;
}

// =============================================================================
// Inventory Agent 설정 타입
// =============================================================================

/**
 * Inventory Agent 설정
 */
export interface InventoryAgentConfig {
  syncConfig: {
    channels: SalesChannel[];
    syncInterval: number;
    batchSize: number;
  };
  alertConfig: {
    lowStockThresholdPercent: number;
    notifyOnLowStock: boolean;
    notifyOnOutOfStock: boolean;
    notifyOnOverstock: boolean;
  };
  reorderConfig: {
    autoSuggestEnabled: boolean;
    defaultLeadTimeDays: number;
    safetyStockDays: number;
    minReorderQuantity: number;
  };
  marginConfig: {
    targetGrossMarginPercent: number;
    minNetMarginPercent: number;
    priceAdjustmentEnabled: boolean;
  };
}
