/**
 * 네이버 주문 어댑터
 * 네이버 API 응답을 표준 주문 형식으로 변환
 */

import {
  BaseOrder,
  NaverOrder,
  OrderStatus,
  SalesChannel,
  CustomerInfo,
  ShippingInfo,
  OrderItem,
  PaymentInfo,
} from '../../../../types';
import { NaverRawOrder, NaverOrderStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 네이버 주문 상태를 표준 주문 상태로 매핑
 */
const STATUS_MAP: Record<NaverOrderStatus, OrderStatus> = {
  PAYMENT_WAITING: OrderStatus.PENDING,
  PAYED: OrderStatus.PAID,
  DELIVERING: OrderStatus.SHIPPING,
  DELIVERED: OrderStatus.DELIVERED,
  PURCHASE_DECIDED: OrderStatus.DELIVERED,
  EXCHANGED: OrderStatus.EXCHANGED,
  CANCELED: OrderStatus.CANCELLED,
  RETURNED: OrderStatus.REFUNDED,
  CANCEL_REQUEST: OrderStatus.CANCELLED,
  RETURN_REQUEST: OrderStatus.REFUND_REQUESTED,
  EXCHANGE_REQUEST: OrderStatus.EXCHANGE_REQUESTED,
};

/**
 * 네이버 주문 어댑터
 */
export class NaverOrderAdapter {
  /**
   * 네이버 주문을 표준 BaseOrder로 변환
   */
  toBaseOrder(naverOrder: NaverRawOrder): BaseOrder {
    const customer = this.extractCustomerInfo(naverOrder);
    const shipping = this.extractShippingInfo(naverOrder);
    const items = this.extractOrderItems(naverOrder);
    const payment = this.calculatePayment(naverOrder);

    return {
      id: uuidv4(),
      channelOrderId: naverOrder.orderId,
      channel: SalesChannel.NAVER,
      status: this.mapStatus(naverOrder.orderStatus),
      orderedAt: new Date(naverOrder.orderDate),
      customer,
      shipping,
      items,
      payment,
      metadata: {
        productOrderId: naverOrder.productOrderId,
        isGiftOrder: naverOrder.isGiftOrder,
        originalData: naverOrder,
      },
    };
  }

  /**
   * 네이버 주문을 NaverOrder (확장 형식)로 변환
   */
  toNaverOrder(naverOrder: NaverRawOrder, smartStoreId: string): NaverOrder {
    const baseOrder = this.toBaseOrder(naverOrder);

    return {
      ...baseOrder,
      channel: SalesChannel.NAVER,
      naver: {
        smartStoreId,
        payOrderId: naverOrder.orderId,
        hasTalkTalkInquiry: false, // API에서 별도 조회 필요
        isPurchaseConfirmed: naverOrder.orderStatus === 'PURCHASE_DECIDED',
      },
    };
  }

  /**
   * 복수 주문 변환
   */
  toBaseOrders(naverOrders: NaverRawOrder[]): BaseOrder[] {
    return naverOrders.map((order) => this.toBaseOrder(order));
  }

  /**
   * 복수 주문을 NaverOrder 형식으로 변환
   */
  toNaverOrders(naverOrders: NaverRawOrder[], smartStoreId: string): NaverOrder[] {
    return naverOrders.map((order) => this.toNaverOrder(order, smartStoreId));
  }

  /**
   * 네이버 상태를 표준 상태로 매핑
   */
  private mapStatus(status: NaverOrderStatus): OrderStatus {
    return STATUS_MAP[status] || OrderStatus.PENDING;
  }

  /**
   * 고객 정보 추출
   */
  private extractCustomerInfo(order: NaverRawOrder): CustomerInfo {
    return {
      customerId: order.ordererNo,
      name: order.ordererName,
      phone: order.ordererTel || '',
      email: undefined,
    };
  }

  /**
   * 배송 정보 추출
   */
  private extractShippingInfo(order: NaverRawOrder): ShippingInfo {
    const addr = order.shippingAddress;

    return {
      receiverName: addr.name,
      receiverPhone: addr.tel1,
      zipCode: addr.zipCode,
      address: addr.baseAddress,
      addressDetail: addr.detailAddress,
      memo: order.shippingMemo,
      courier: order.deliveryCompanyCode,
      trackingNumber: order.trackingNumber,
    };
  }

  /**
   * 주문 상품 목록 추출
   */
  private extractOrderItems(order: NaverRawOrder): OrderItem[] {
    const product = order.productOrder;

    return [
      {
        productId: product.sellerProductCode || order.productOrderId,
        channelProductId: order.productOrderId,
        productName: product.productName,
        optionName: product.productOption,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        discount: product.productDiscountAmount || 0,
        totalPrice: product.totalPaymentAmount,
      },
    ];
  }

  /**
   * 결제 정보 계산
   */
  private calculatePayment(order: NaverRawOrder): PaymentInfo {
    const product = order.productOrder;

    return {
      method: 'card', // 네이버페이 결제 방법 상세는 별도 조회 필요
      totalAmount: product.totalPaymentAmount,
      shippingFee: order.deliveryFee || 0,
      discountAmount: product.productDiscountAmount || 0,
      usedPoints: undefined,
      paidAt: order.paymentDate ? new Date(order.paymentDate) : undefined,
    };
  }
}

export default NaverOrderAdapter;
