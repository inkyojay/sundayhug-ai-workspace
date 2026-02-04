/**
 * 쿠팡 주문 어댑터
 * 쿠팡 API 응답을 표준 주문 형식으로 변환
 */

import {
  BaseOrder,
  CoupangOrder,
  OrderStatus,
  SalesChannel,
  CustomerInfo,
  ShippingInfo,
  OrderItem,
  PaymentInfo,
} from '../../../../types';
import { CoupangRawOrder, CoupangOrderItem, CoupangOrderStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 쿠팡 주문 상태를 표준 주문 상태로 매핑
 */
const STATUS_MAP: Record<CoupangOrderStatus, OrderStatus> = {
  ACCEPT: OrderStatus.PAID,
  INSTRUCT: OrderStatus.PREPARING,
  DEPARTURE: OrderStatus.SHIPPING,
  DELIVERING: OrderStatus.SHIPPING,
  FINAL_DELIVERY: OrderStatus.DELIVERED,
  CANCEL: OrderStatus.CANCELLED,
  RETURN: OrderStatus.REFUND_REQUESTED,
  EXCHANGE: OrderStatus.EXCHANGE_REQUESTED,
};

/**
 * 쿠팡 주문 어댑터
 */
export class CoupangOrderAdapter {
  /**
   * 쿠팡 주문을 표준 BaseOrder로 변환
   */
  toBaseOrder(coupangOrder: CoupangRawOrder): BaseOrder {
    const customer = this.extractCustomerInfo(coupangOrder);
    const shipping = this.extractShippingInfo(coupangOrder);
    const items = this.extractOrderItems(coupangOrder.orderItems);
    const payment = this.calculatePayment(coupangOrder, items);

    return {
      id: uuidv4(),
      channelOrderId: String(coupangOrder.orderId),
      channel: SalesChannel.COUPANG,
      status: this.mapStatus(coupangOrder.status),
      orderedAt: new Date(coupangOrder.orderedAt),
      customer,
      shipping,
      items,
      payment,
      metadata: {
        shipmentBoxId: coupangOrder.shipmentBoxId,
        originalData: coupangOrder,
      },
    };
  }

  /**
   * 쿠팡 주문을 CoupangOrder (확장 형식)로 변환
   */
  toCoupangOrder(coupangOrder: CoupangRawOrder): CoupangOrder {
    const baseOrder = this.toBaseOrder(coupangOrder);

    return {
      ...baseOrder,
      channel: SalesChannel.COUPANG,
      coupang: {
        isRocketDelivery: false, // API 응답에서 확인 필요
        isRocketWow: false, // API 응답에서 확인 필요
        vendorItemId: coupangOrder.orderItems[0]?.vendorItemId?.toString() || '',
        outboundShippingPlaceCode: undefined,
      },
    };
  }

  /**
   * 복수 주문 변환
   */
  toBaseOrders(coupangOrders: CoupangRawOrder[]): BaseOrder[] {
    return coupangOrders.map((order) => this.toBaseOrder(order));
  }

  /**
   * 복수 주문을 CoupangOrder 형식으로 변환
   */
  toCoupangOrders(coupangOrders: CoupangRawOrder[]): CoupangOrder[] {
    return coupangOrders.map((order) => this.toCoupangOrder(order));
  }

  /**
   * 쿠팡 상태를 표준 상태로 매핑
   */
  private mapStatus(status: CoupangOrderStatus): OrderStatus {
    return STATUS_MAP[status] || OrderStatus.PENDING;
  }

  /**
   * 고객 정보 추출
   */
  private extractCustomerInfo(order: CoupangRawOrder): CustomerInfo {
    const orderer = order.orderer;

    return {
      customerId: undefined,
      name: orderer.name,
      phone: orderer.safeNumber || orderer.ordererNumber || '',
      email: orderer.email,
    };
  }

  /**
   * 배송 정보 추출
   */
  private extractShippingInfo(order: CoupangRawOrder): ShippingInfo {
    const receiver = order.receiver;

    return {
      receiverName: receiver.name,
      receiverPhone: receiver.safeNumber || receiver.receiverNumber || '',
      zipCode: receiver.postCode,
      address: receiver.addr1,
      addressDetail: receiver.addr2,
      memo: order.shippingMessage || order.parcelPrintMessage,
      courier: undefined,
      trackingNumber: undefined,
    };
  }

  /**
   * 주문 상품 목록 추출
   */
  private extractOrderItems(coupangItems: CoupangOrderItem[]): OrderItem[] {
    return coupangItems.map((item) => {
      const discount =
        (item.discountPrice || 0) +
        (item.instantCouponDiscount || 0) +
        (item.downloadableCouponDiscount || 0);

      return {
        productId: item.externalVendorSkuCode || String(item.vendorItemId),
        channelProductId: String(item.vendorItemId),
        productName: item.vendorItemName,
        optionName: item.vendorItemPackageName,
        quantity: item.shippingCount,
        unitPrice: item.salesPrice,
        discount,
        totalPrice: item.orderPrice * item.shippingCount,
      };
    });
  }

  /**
   * 결제 정보 계산
   */
  private calculatePayment(order: CoupangRawOrder, items: OrderItem[]): PaymentInfo {
    // 총 상품 금액
    const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // 총 할인 금액
    const totalDiscount = items.reduce((sum, item) => sum + item.discount * item.quantity, 0);

    // 배송비 (기본 + 도서산간)
    const shippingFee = order.shippingPrice + order.remotePrice;

    return {
      method: 'card', // 쿠팡은 결제 방법 정보를 제공하지 않음
      totalAmount: itemsTotal,
      shippingFee,
      discountAmount: totalDiscount,
      usedPoints: undefined,
      paidAt: order.paidAt ? new Date(order.paidAt) : undefined,
    };
  }
}

export default CoupangOrderAdapter;
