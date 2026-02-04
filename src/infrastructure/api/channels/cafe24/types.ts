/**
 * Cafe24 API 타입 정의
 */

/**
 * Cafe24 API 자격 증명
 */
export interface Cafe24Credentials {
  mallId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

/**
 * Cafe24 OAuth 토큰 응답
 */
export interface Cafe24TokenResponse {
  access_token: string;
  expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
  client_id: string;
  mall_id: string;
  user_id: string;
  scopes: string[];
  issued_at: string;
}

/**
 * Cafe24 API 공통 응답
 */
export interface Cafe24ApiResponse<T> {
  orders?: T[];
  order?: T;
  error?: {
    code: number;
    message: string;
  };
  links?: Cafe24PaginationLinks[];
}

/**
 * Cafe24 페이지네이션 링크
 */
export interface Cafe24PaginationLinks {
  rel: string;
  href: string;
}

/**
 * Cafe24 주문 상태
 */
export type Cafe24OrderStatus =
  | 'N00'  // 입금전
  | 'N10'  // 상품준비중
  | 'N20'  // 배송준비중
  | 'N21'  // 배송대기
  | 'N22'  // 배송보류
  | 'N30'  // 배송중
  | 'N40'  // 배송완료
  | 'N50'  // 구매확정
  | 'C00'  // 취소요청
  | 'C10'  // 취소접수
  | 'C20'  // 취소완료
  | 'C30'  // 취소 철회
  | 'R00'  // 반품요청
  | 'R10'  // 반품접수
  | 'R20'  // 반품완료
  | 'R30'  // 반품철회
  | 'E00'  // 교환요청
  | 'E10'  // 교환접수
  | 'E20'  // 교환완료
  | 'E30'; // 교환철회

/**
 * Cafe24 원시 주문 데이터
 */
export interface Cafe24RawOrder {
  order_id: string;
  order_date: string;
  payment_date?: string;
  order_status: Cafe24OrderStatus;
  buyer: {
    name: string;
    email?: string;
    phone?: string;
    cellphone?: string;
    member_id?: string;
    member_group_no?: number;
  };
  receiver: {
    name: string;
    phone?: string;
    cellphone?: string;
    zipcode: string;
    address1: string;
    address2?: string;
    shipping_message?: string;
  };
  items: Cafe24OrderItem[];
  payment_amount: number;
  shipping_fee: number;
  discount_amount?: number;
  mileage_used?: number;
  actual_payment_amount: number;
  shipping?: {
    shipping_company_name?: string;
    tracking_no?: string;
    status?: string;
  };
}

/**
 * Cafe24 주문 상품
 */
export interface Cafe24OrderItem {
  order_item_code: string;
  product_no: number;
  product_code: string;
  product_name: string;
  option_value?: string;
  quantity: number;
  product_price: number;
  discount_price?: number;
  additional_discount_price?: number;
  actual_payment_amount: number;
}

/**
 * Cafe24 주문 조회 요청
 */
export interface Cafe24OrderListRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string;
  order_status?: Cafe24OrderStatus[];
  limit?: number;
  offset?: number;
}

/**
 * Cafe24 배송 상태 업데이트 요청
 */
export interface Cafe24ShipmentRequest {
  order_id: string;
  shipping_company_code: string;
  tracking_no: string;
  status: 'T'; // T: 발송처리
}

/**
 * 택배사 코드 맵핑
 */
export const CAFE24_COURIER_CODES: Record<string, string> = {
  CJ대한통운: 'cjgls',
  롯데택배: 'lotte',
  한진택배: 'hanjin',
  로젠택배: 'logen',
  우체국택배: 'epost',
  CU편의점택배: 'cupost',
  GS편의점택배: 'gspost',
};
