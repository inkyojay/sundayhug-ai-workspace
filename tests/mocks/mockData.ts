/**
 * Mock 데이터 정의
 * 테스트용 주문, CS, 재고 데이터
 */

import {
  BaseOrder,
  CoupangOrder,
  NaverOrder,
  Cafe24Order,
  OrderStatus,
  SalesChannel,
  CustomerInfo,
  ShippingInfo,
  OrderItem,
  PaymentInfo,
  TaskPayload,
  TaskStatus,
  ApprovalRequest,
  ApprovalLevel,
} from '../../src/types';

// =============================================================================
// 주문 Mock 데이터
// =============================================================================

/**
 * Mock 고객 정보 생성
 */
export function createMockCustomer(overrides?: Partial<CustomerInfo>): CustomerInfo {
  return {
    customerId: 'CUS-001234',
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'hong@example.com',
    ...overrides,
  };
}

/**
 * Mock 배송 정보 생성
 */
export function createMockShipping(overrides?: Partial<ShippingInfo>): ShippingInfo {
  return {
    receiverName: '홍길동',
    receiverPhone: '010-1234-5678',
    zipCode: '06234',
    address: '서울특별시 강남구 테헤란로 123',
    addressDetail: '101동 1001호',
    memo: '부재시 경비실에 맡겨주세요',
    ...overrides,
  };
}

/**
 * Mock 주문 상품 생성
 */
export function createMockOrderItem(overrides?: Partial<OrderItem>): OrderItem {
  return {
    productId: 'PRD-00001',
    channelProductId: 'CP-12345',
    productName: '썬데이허그 프리미엄 쿠션',
    optionName: '21호 라이트베이지',
    quantity: 1,
    unitPrice: 45000,
    discount: 5000,
    totalPrice: 40000,
    ...overrides,
  };
}

/**
 * Mock 결제 정보 생성
 */
export function createMockPayment(overrides?: Partial<PaymentInfo>): PaymentInfo {
  return {
    method: 'card',
    totalAmount: 42500,
    shippingFee: 2500,
    discountAmount: 5000,
    usedPoints: 0,
    paidAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock 기본 주문 생성
 */
export function createMockOrder(overrides?: Partial<BaseOrder>): BaseOrder {
  const now = new Date();
  return {
    id: `ORD-${Date.now()}-0001`,
    channelOrderId: `CH-${Date.now()}`,
    channel: SalesChannel.NAVER,
    status: OrderStatus.PAID,
    orderedAt: now,
    customer: createMockCustomer(),
    shipping: createMockShipping(),
    items: [createMockOrderItem()],
    payment: createMockPayment(),
    ...overrides,
  };
}

/**
 * Mock 쿠팡 주문 생성
 */
export function createMockCoupangOrder(overrides?: Partial<CoupangOrder>): CoupangOrder {
  const baseOrder = createMockOrder({
    channel: SalesChannel.COUPANG,
    channelOrderId: `COU-${Date.now()}`,
  });

  return {
    ...baseOrder,
    channel: SalesChannel.COUPANG,
    coupang: {
      isRocketDelivery: true,
      isRocketWow: false,
      vendorItemId: 'VI-12345678',
      outboundShippingPlaceCode: 'OSP-001',
    },
    ...overrides,
  } as CoupangOrder;
}

/**
 * Mock 네이버 주문 생성
 */
export function createMockNaverOrder(overrides?: Partial<NaverOrder>): NaverOrder {
  const baseOrder = createMockOrder({
    channel: SalesChannel.NAVER,
    channelOrderId: `NAV-${Date.now()}`,
  });

  return {
    ...baseOrder,
    channel: SalesChannel.NAVER,
    naver: {
      smartStoreId: 'SS-12345',
      payOrderId: `NPO-${Date.now()}`,
      hasTalkTalkInquiry: false,
      isPurchaseConfirmed: false,
    },
    ...overrides,
  } as NaverOrder;
}

/**
 * Mock Cafe24 주문 생성
 */
export function createMockCafe24Order(overrides?: Partial<Cafe24Order>): Cafe24Order {
  const baseOrder = createMockOrder({
    channel: SalesChannel.CAFE24,
    channelOrderId: `C24-${Date.now()}`,
  });

  return {
    ...baseOrder,
    channel: SalesChannel.CAFE24,
    cafe24: {
      mallId: 'sundayhug',
      memberGrade: 'VIP',
      usedMileage: 1000,
    },
    ...overrides,
  } as Cafe24Order;
}

// =============================================================================
// CS 문의 Mock 데이터
// =============================================================================

export interface MockCSInquiry {
  id: string;
  customerId: string;
  customerName: string;
  channel: SalesChannel;
  type: 'product_inquiry' | 'order_inquiry' | 'complaint' | 'return_request' | 'exchange_request';
  subject: string;
  content: string;
  orderId?: string;
  productId?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentiment?: number; // -1 to 1
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mock CS 문의 생성
 */
export function createMockCSInquiry(overrides?: Partial<MockCSInquiry>): MockCSInquiry {
  const now = new Date();
  return {
    id: `INQ-${Date.now()}`,
    customerId: 'CUS-001234',
    customerName: '홍길동',
    channel: SalesChannel.NAVER,
    type: 'product_inquiry',
    subject: '제품 사용법 문의',
    content: '쿠션 사용 방법이 궁금합니다. 퍼프로 톡톡 두드려야 하나요?',
    status: 'pending',
    priority: 'medium',
    sentiment: 0.2,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * 다양한 CS 문의 시나리오 생성
 */
export const csInquiryScenarios = {
  simpleProductInquiry: createMockCSInquiry({
    type: 'product_inquiry',
    subject: '제품 성분 문의',
    content: '민감성 피부인데 사용해도 될까요? 성분이 궁금합니다.',
    priority: 'low',
    sentiment: 0.3,
  }),

  orderStatusInquiry: createMockCSInquiry({
    type: 'order_inquiry',
    subject: '배송 현황 문의',
    content: '주문한 지 3일이 지났는데 아직 발송 안 됐나요?',
    orderId: 'ORD-20250201-0001',
    priority: 'medium',
    sentiment: -0.2,
  }),

  angryComplaint: createMockCSInquiry({
    type: 'complaint',
    subject: '불량품 수령',
    content: '받은 제품이 파손되어 있습니다. 어떻게 된 건가요? 빨리 처리해주세요!',
    orderId: 'ORD-20250131-0002',
    priority: 'high',
    sentiment: -0.8,
  }),

  returnRequest: createMockCSInquiry({
    type: 'return_request',
    subject: '반품 요청',
    content: '피부에 맞지 않아서 반품하고 싶습니다. 절차를 알려주세요.',
    orderId: 'ORD-20250130-0003',
    priority: 'medium',
    sentiment: -0.3,
  }),

  exchangeRequest: createMockCSInquiry({
    type: 'exchange_request',
    subject: '호수 교환 요청',
    content: '21호가 너무 밝아서 23호로 교환하고 싶습니다.',
    orderId: 'ORD-20250129-0004',
    productId: 'PRD-00001',
    priority: 'medium',
    sentiment: 0.1,
  }),

  urgentSafetyIssue: createMockCSInquiry({
    type: 'complaint',
    subject: '피부 트러블 발생',
    content: '제품 사용 후 얼굴에 발진이 생겼습니다. 위험한 성분이 있는 건가요?',
    orderId: 'ORD-20250128-0005',
    productId: 'PRD-00001',
    priority: 'urgent',
    sentiment: -0.9,
  }),
};

// =============================================================================
// 재고 Mock 데이터
// =============================================================================

export interface MockInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  maxStock: number;
  warehouseLocation: string;
  lastUpdated: Date;
}

/**
 * Mock 재고 항목 생성
 */
export function createMockInventoryItem(overrides?: Partial<MockInventoryItem>): MockInventoryItem {
  return {
    productId: 'PRD-00001',
    productName: '썬데이허그 프리미엄 쿠션',
    sku: 'SH-PC-21-001',
    currentStock: 150,
    safetyStock: 50,
    reorderPoint: 80,
    maxStock: 500,
    warehouseLocation: 'A-01-01',
    lastUpdated: new Date(),
    ...overrides,
  };
}

/**
 * 재고 시나리오
 */
export const inventoryScenarios = {
  normalStock: createMockInventoryItem({
    currentStock: 150,
    safetyStock: 50,
    reorderPoint: 80,
  }),

  lowStock: createMockInventoryItem({
    productId: 'PRD-00002',
    productName: '썬데이허그 립틴트',
    sku: 'SH-LT-01-001',
    currentStock: 30,
    safetyStock: 50,
    reorderPoint: 80,
  }),

  outOfStock: createMockInventoryItem({
    productId: 'PRD-00003',
    productName: '썬데이허그 아이섀도우 팔레트',
    sku: 'SH-ES-01-001',
    currentStock: 0,
    safetyStock: 30,
    reorderPoint: 50,
  }),

  overstock: createMockInventoryItem({
    productId: 'PRD-00004',
    productName: '썬데이허그 클렌징폼',
    sku: 'SH-CF-01-001',
    currentStock: 480,
    safetyStock: 50,
    maxStock: 500,
    reorderPoint: 80,
  }),
};

// =============================================================================
// Task Payload Mock 데이터
// =============================================================================

/**
 * Mock TaskPayload 생성
 */
export function createMockTaskPayload<T = unknown>(
  type: string,
  data: T,
  overrides?: Partial<TaskPayload<T>>
): TaskPayload<T> {
  return {
    taskId: `TASK-${Date.now()}`,
    type,
    priority: 5,
    data,
    createdAt: new Date(),
    retryCount: 0,
    ...overrides,
  };
}

/**
 * 주문 처리 Task
 */
export function createOrderProcessingTask(order?: BaseOrder): TaskPayload {
  const orderData = order || createMockOrder();
  return createMockTaskPayload('order:process', {
    action: 'process_new_order',
    order: orderData,
    source: orderData.channel,
    content: `새 주문 접수: ${orderData.id}`,
  });
}

/**
 * CS 문의 처리 Task
 */
export function createCSInquiryTask(inquiry?: MockCSInquiry): TaskPayload {
  const csData = inquiry || createMockCSInquiry();
  return createMockTaskPayload('cs:inquiry', {
    action: 'handle_inquiry',
    inquiry: csData,
    source: csData.channel,
    content: csData.content,
    message: csData.subject,
  });
}

/**
 * 재고 확인 Task
 */
export function createInventoryCheckTask(productId?: string): TaskPayload {
  return createMockTaskPayload('inventory:check', {
    action: 'check_stock',
    productId: productId || 'PRD-00001',
    content: `재고 확인: ${productId || 'PRD-00001'}`,
  });
}

// =============================================================================
// 승인 요청 Mock 데이터
// =============================================================================

/**
 * Mock 승인 요청 생성
 */
export function createMockApprovalRequest(overrides?: Partial<ApprovalRequest>): ApprovalRequest {
  const now = new Date();
  return {
    id: `APR-${Date.now()}`,
    requesterId: '01-order',
    level: ApprovalLevel.MEDIUM,
    title: '대량 주문 처리 승인 요청',
    description: '100만원 이상의 대량 주문 처리를 위해 승인이 필요합니다.',
    data: {
      orderId: 'ORD-20250201-0001',
      amount: 1500000,
      items: 50,
    },
    impact: {
      orderCount: 1,
      amount: 1500000,
      customerCount: 1,
    },
    requestedAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    status: 'pending',
    ...overrides,
  };
}
