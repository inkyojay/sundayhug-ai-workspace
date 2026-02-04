/**
 * 네이버 커머스 API 타입 정의
 */

/**
 * 네이버 API 자격 증명
 */
export interface NaverCredentials {
  clientId: string;
  clientSecret: string;
  smartStoreId?: string;
}

/**
 * 네이버 OAuth 토큰 응답
 */
export interface NaverTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * 네이버 API 공통 응답
 */
export interface NaverApiResponse<T> {
  timestamp: string;
  traceId: string;
  data: T;
}

/**
 * 네이버 주문 목록 응답
 */
export interface NaverOrderListResponse {
  contents: NaverRawOrder[];
  pageInfo: {
    totalPages: number;
    totalElements: number;
    size: number;
    current: number;
  };
}

/**
 * 네이버 주문 상태
 */
export type NaverOrderStatus =
  | 'PAYMENT_WAITING'   // 결제 대기
  | 'PAYED'             // 결제 완료
  | 'DELIVERING'        // 배송 중
  | 'DELIVERED'         // 배송 완료
  | 'PURCHASE_DECIDED'  // 구매 확정
  | 'EXCHANGED'         // 교환
  | 'CANCELED'          // 취소
  | 'RETURNED'          // 반품
  | 'CANCEL_REQUEST'    // 취소 요청
  | 'RETURN_REQUEST'    // 반품 요청
  | 'EXCHANGE_REQUEST'; // 교환 요청

/**
 * 네이버 원시 주문 데이터
 */
export interface NaverRawOrder {
  orderId: string;
  productOrderId: string;
  orderDate: string;
  paymentDate?: string;
  ordererName: string;
  ordererTel?: string;
  ordererNo?: string;
  productOrder: {
    productName: string;
    productOption?: string;
    quantity: number;
    unitPrice: number;
    totalPaymentAmount: number;
    productDiscountAmount?: number;
    sellerProductCode?: string;
  };
  shippingAddress: {
    name: string;
    tel1: string;
    tel2?: string;
    zipCode: string;
    baseAddress: string;
    detailAddress?: string;
  };
  shippingMemo?: string;
  deliveryMethod?: string;
  deliveryFee?: number;
  orderStatus: NaverOrderStatus;
  claimType?: 'CANCEL' | 'RETURN' | 'EXCHANGE';
  claimStatus?: string;
  isGiftOrder?: boolean;
  placeOrderDate?: string;
  deliveryCompanyCode?: string;
  trackingNumber?: string;
}

/**
 * 네이버 주문 조회 요청 파라미터
 */
export interface NaverOrderListRequest {
  orderDateFrom?: string; // yyyy-MM-dd'T'HH:mm:ss.SSSXXX
  orderDateTo?: string;
  productOrderStatus?: NaverOrderStatus[];
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * 네이버 배송 상태 업데이트 요청
 */
export interface NaverShipmentRequest {
  productOrderIds: string[];
  dispatchDate: string;
  deliveryCompanyCode: string;
  trackingNumber: string;
}

/**
 * 택배사 코드 맵핑
 */
export const NAVER_COURIER_CODES: Record<string, string> = {
  CJ대한통운: 'CJGLS',
  롯데택배: 'LOTTE',
  한진택배: 'HANJIN',
  로젠택배: 'LOGEN',
  우체국택배: 'EPOST',
  CU편의점택배: 'CUPOST',
  GS편의점택배: 'GSPOST',
};
