/**
 * Cafe24 주문 어댑터
 * Cafe24 API 응답을 표준 주문 형식으로 변환
 */

import {
  BaseOrder,
  Cafe24Order,
  OrderStatus,
  SalesChannel,
  CustomerInfo,
  ShippingInfo,
  OrderItem,
  PaymentInfo,
} from '../../../../types';
import { Cafe24RawOrder, Cafe24OrderItem, Cafe24OrderStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cafe24 주문 상태를 표준 주문 상태로 매핑
 */
const STATUS_MAP: Record<Cafe24OrderStatus, OrderStatus> = {
  N00: OrderStatus.PENDING,
  N10: OrderStatus.PREPARING,
  N20: OrderStatus.PREPARING,
  N21: OrderStatus.PREPARING,
  N22: OrderStatus.PREPARING,
  N30: OrderStatus.SHIPPING,
  N40: OrderStatus.DELIVERED,
  N50: OrderStatus.DELIVERED,
  C00: OrderStatus.CANCELLED,
  C10: OrderStatus.CANCELLED,
  C20: OrderStatus.CANCELLED,
  C30: OrderStatus.PAID, // 취소 철회 = 결제 완료 상태로 복귀
  R00: OrderStatus.REFUND_REQUESTED,
  R10: OrderStatus.REFUND_REQUESTED,
  R20: OrderStatus.REFUNDED,
  R30: OrderStatus.PAID, // 반품 철회 = 결제 완료 상태로 복귀
  E00: OrderStatus.EXCHANGE_REQUESTED,
  E10: OrderStatus.EXCHANGE_REQUESTED,
  E20: OrderStatus.EXCHANGED,
  E30: OrderStatus.PAID, // 교환 철회 = 결제 완료 상태로 복귀
};

/**
 * Cafe24 주문 어댑터
 */
export class Cafe24OrderAdapter {
  /**
   * Cafe24 주문을 표준 BaseOrder로 변환
   */
  toBaseOrder(cafe24Order: Cafe24RawOrder): BaseOrder {
    const customer = this.extractCustomerInfo(cafe24Order);
    const shipping = this.extractShippingInfo(cafe24Order);
    const items = this.extractOrderItems(cafe24Order.items);
    const payment = this.calculatePayment(cafe24Order);

    return {
      id: uuidv4(),
      channelOrderId: cafe24Order.order_id,
      channel: SalesChannel.CAFE24,
      status: this.mapStatus(cafe24Order.order_status),
      orderedAt: new Date(cafe24Order.order_date),
      customer,
      shipping,
      items,
      payment,
      metadata: {
        originalData: cafe24Order,
      },
    };
  }

  /**
   * Cafe24 주문을 Cafe24Order (확장 형식)로 변환
   */
  toCafe24Order(cafe24Order: Cafe24RawOrder, mallId: string): Cafe24Order {
    const baseOrder = this.toBaseOrder(cafe24Order);

    return {
      ...baseOrder,
      channel: SalesChannel.CAFE24,
      cafe24: {
        mallId,
        memberGrade: undefined, // member_group_no를 등급 이름으로 변환 필요
        usedMileage: cafe24Order.mileage_used,
      },
    };
  }

  /**
   * 복수 주문 변환
   */
  toBaseOrders(cafe24Orders: Cafe24RawOrder[]): BaseOrder[] {
    return cafe24Orders.map((order) => this.toBaseOrder(order));
  }

  /**
   * 복수 주문을 Cafe24Order 형식으로 변환
   */
  toCafe24Orders(cafe24Orders: Cafe24RawOrder[], mallId: string): Cafe24Order[] {
    return cafe24Orders.map((order) => this.toCafe24Order(order, mallId));
  }

  /**
   * Cafe24 상태를 표준 상태로 매핑
   */
  private mapStatus(status: Cafe24OrderStatus): OrderStatus {
    return STATUS_MAP[status] || OrderStatus.PENDING;
  }

  /**
   * 고객 정보 추출
   */
  private extractCustomerInfo(order: Cafe24RawOrder): CustomerInfo {
    const buyer = order.buyer;

    return {
      customerId: buyer.member_id,
      name: buyer.name,
      phone: buyer.cellphone || buyer.phone || '',
      email: buyer.email,
    };
  }

  /**
   * 배송 정보 추출
   */
  private extractShippingInfo(order: Cafe24RawOrder): ShippingInfo {
    const receiver = order.receiver;

    return {
      receiverName: receiver.name,
      receiverPhone: receiver.cellphone || receiver.phone || '',
      zipCode: receiver.zipcode,
      address: receiver.address1,
      addressDetail: receiver.address2,
      memo: receiver.shipping_message,
      courier: order.shipping?.shipping_company_name,
      trackingNumber: order.shipping?.tracking_no,
    };
  }

  /**
   * 주문 상품 목록 추출
   */
  private extractOrderItems(cafe24Items: Cafe24OrderItem[]): OrderItem[] {
    return cafe24Items.map((item) => {
      const discount = (item.discount_price || 0) + (item.additional_discount_price || 0);

      return {
        productId: item.product_code,
        channelProductId: item.order_item_code,
        productName: item.product_name,
        optionName: item.option_value,
        quantity: item.quantity,
        unitPrice: item.product_price,
        discount,
        totalPrice: item.actual_payment_amount,
      };
    });
  }

  /**
   * 결제 정보 계산
   */
  private calculatePayment(order: Cafe24RawOrder): PaymentInfo {
    return {
      method: 'card', // Cafe24는 결제 방법 정보가 별도 API 필요
      totalAmount: order.actual_payment_amount,
      shippingFee: order.shipping_fee,
      discountAmount: order.discount_amount || 0,
      usedPoints: order.mileage_used,
      paidAt: order.payment_date ? new Date(order.payment_date) : undefined,
    };
  }
}

export default Cafe24OrderAdapter;
