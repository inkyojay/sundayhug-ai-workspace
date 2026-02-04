/**
 * 쿠팡 API 타입 정의
 */

/**
 * 쿠팡 API 자격 증명
 */
export interface CoupangCredentials {
  vendorId: string;
  accessKey: string;
  secretKey: string;
}

/**
 * 쿠팡 API 응답 기본 구조
 */
export interface CoupangApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

/**
 * 쿠팡 주문 목록 조회 요청
 */
export interface CoupangOrderListRequest {
  vendorId: string;
  createdAtFrom: string; // yyyy-MM-dd
  createdAtTo: string;
  status?: CoupangOrderStatus;
  maxPerPage?: number;
  nextToken?: string;
}

/**
 * 쿠팡 주문 상태
 */
export type CoupangOrderStatus =
  | 'ACCEPT'
  | 'INSTRUCT'
  | 'DEPARTURE'
  | 'DELIVERING'
  | 'FINAL_DELIVERY'
  | 'CANCEL'
  | 'RETURN'
  | 'EXCHANGE';

/**
 * 쿠팡 원시 주문 데이터
 */
export interface CoupangRawOrder {
  orderId: number;
  orderedAt: string;
  orderer: {
    name: string;
    email?: string;
    safeNumber?: string;
    ordererNumber?: string;
  };
  receiver: {
    name: string;
    safeNumber?: string;
    receiverNumber?: string;
    addr1: string;
    addr2?: string;
    postCode: string;
  };
  orderItems: CoupangOrderItem[];
  shippingPrice: number;
  remotePrice: number;
  shippingMessage?: string;
  parcelPrintMessage?: string;
  status: CoupangOrderStatus;
  paidAt?: string;
  shipmentBoxId?: number;
  splitShipping?: boolean;
}

/**
 * 쿠팡 주문 상품
 */
export interface CoupangOrderItem {
  vendorItemId: number;
  vendorItemName: string;
  vendorItemPackageId: number;
  vendorItemPackageName?: string;
  shippingCount: number;
  salesPrice: number;
  discountPrice: number;
  instantCouponDiscount?: number;
  downloadableCouponDiscount?: number;
  orderPrice: number;
  externalVendorSkuCode?: string;
  sellerProductId?: number;
  sellerProductName?: string;
  sellerProductItemName?: string;
  estimatedShippingDate?: string;
  plannedShippingDate?: string;
  invoiceNumber?: string;
  etcInfoHeader?: string;
  etcInfoValue?: string;
  extraProperties?: Record<string, string>;
}

/**
 * 쿠팡 주문 목록 응답
 */
export interface CoupangOrderListResponse {
  data: CoupangRawOrder[];
  nextToken?: string;
}

/**
 * 쿠팡 배송 상태 업데이트 요청
 */
export interface CoupangShipmentRequest {
  vendorId: string;
  shipmentBoxId: number;
  orderId: number;
  deliveryCompanyCode: string;
  invoiceNumber: string;
}

/**
 * 택배사 코드 맵핑
 */
export const COUPANG_COURIER_CODES: Record<string, string> = {
  CJ대한통운: 'CJGLS',
  롯데택배: 'LOTTE',
  한진택배: 'HANJIN',
  로젠택배: 'LOGEN',
  우체국택배: 'EPOST',
  CU편의점택배: 'CU',
  GS편의점택배: 'GS',
};
