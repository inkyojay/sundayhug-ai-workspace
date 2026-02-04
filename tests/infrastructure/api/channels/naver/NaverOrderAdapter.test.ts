/**
 * NaverOrderAdapter 테스트
 * 네이버 주문 데이터를 표준 형식으로 변환
 */

import { describe, it, expect } from 'vitest';
import { NaverOrderAdapter } from '../../../../../src/infrastructure/api/channels/naver/NaverOrderAdapter';
import { NaverRawOrder } from '../../../../../src/infrastructure/api/channels/naver/types';
import { SalesChannel, OrderStatus } from '../../../../../src/types';

describe('NaverOrderAdapter', () => {
  const adapter = new NaverOrderAdapter();

  const mockNaverOrder: NaverRawOrder = {
    orderId: 'N2024011512345',
    productOrderId: 'PO2024011512345',
    orderDate: '2024-01-15T10:30:00+09:00',
    paymentDate: '2024-01-15T10:35:00+09:00',
    ordererName: '홍길동',
    ordererTel: '010-1234-5678',
    ordererNo: 'MEMBER123',
    productOrder: {
      productName: '테스트 상품 A',
      productOption: '옵션: 블랙 / 사이즈: L',
      quantity: 2,
      unitPrice: 15000,
      totalPaymentAmount: 28000,
      productDiscountAmount: 2000,
      sellerProductCode: 'SKU-001',
    },
    shippingAddress: {
      name: '김철수',
      tel1: '010-9876-5432',
      tel2: '02-1234-5678',
      zipCode: '06234',
      baseAddress: '서울시 강남구 테헤란로 123',
      detailAddress: '101동 1001호',
    },
    shippingMemo: '문 앞에 놓아주세요',
    deliveryMethod: 'DELIVERY',
    deliveryFee: 2500,
    orderStatus: 'PAYED',
    isGiftOrder: false,
  };

  describe('toBaseOrder', () => {
    it('should convert Naver order to BaseOrder', () => {
      const result = adapter.toBaseOrder(mockNaverOrder);

      expect(result.channelOrderId).toBe('N2024011512345');
      expect(result.channel).toBe(SalesChannel.NAVER);
      expect(result.status).toBe(OrderStatus.PAID);
    });

    it('should convert orderer information correctly', () => {
      const result = adapter.toBaseOrder(mockNaverOrder);

      expect(result.customer.name).toBe('홍길동');
      expect(result.customer.phone).toBe('010-1234-5678');
      expect(result.customer.customerId).toBe('MEMBER123');
    });

    it('should convert shipping information correctly', () => {
      const result = adapter.toBaseOrder(mockNaverOrder);

      expect(result.shipping.receiverName).toBe('김철수');
      expect(result.shipping.receiverPhone).toBe('010-9876-5432');
      expect(result.shipping.zipCode).toBe('06234');
      expect(result.shipping.address).toBe('서울시 강남구 테헤란로 123');
      expect(result.shipping.addressDetail).toBe('101동 1001호');
      expect(result.shipping.memo).toBe('문 앞에 놓아주세요');
    });

    it('should convert order items correctly', () => {
      const result = adapter.toBaseOrder(mockNaverOrder);

      expect(result.items).toHaveLength(1);

      const item = result.items[0];
      expect(item.productId).toBe('SKU-001');
      expect(item.channelProductId).toBe('PO2024011512345');
      expect(item.productName).toBe('테스트 상품 A');
      expect(item.optionName).toBe('옵션: 블랙 / 사이즈: L');
      expect(item.quantity).toBe(2);
      expect(item.unitPrice).toBe(15000);
      expect(item.discount).toBe(2000);
    });

    it('should calculate payment correctly', () => {
      const result = adapter.toBaseOrder(mockNaverOrder);

      expect(result.payment.totalAmount).toBe(28000);
      expect(result.payment.shippingFee).toBe(2500);
      expect(result.payment.discountAmount).toBe(2000);
    });
  });

  describe('Status Mapping', () => {
    const statusTestCases: Array<{ naverStatus: NaverRawOrder['orderStatus']; expectedStatus: OrderStatus }> = [
      { naverStatus: 'PAYMENT_WAITING', expectedStatus: OrderStatus.PENDING },
      { naverStatus: 'PAYED', expectedStatus: OrderStatus.PAID },
      { naverStatus: 'DELIVERING', expectedStatus: OrderStatus.SHIPPING },
      { naverStatus: 'DELIVERED', expectedStatus: OrderStatus.DELIVERED },
      { naverStatus: 'PURCHASE_DECIDED', expectedStatus: OrderStatus.DELIVERED },
      { naverStatus: 'CANCELED', expectedStatus: OrderStatus.CANCELLED },
      { naverStatus: 'RETURNED', expectedStatus: OrderStatus.REFUNDED },
      { naverStatus: 'EXCHANGED', expectedStatus: OrderStatus.EXCHANGED },
      { naverStatus: 'CANCEL_REQUEST', expectedStatus: OrderStatus.CANCELLED },
      { naverStatus: 'RETURN_REQUEST', expectedStatus: OrderStatus.REFUND_REQUESTED },
      { naverStatus: 'EXCHANGE_REQUEST', expectedStatus: OrderStatus.EXCHANGE_REQUESTED },
    ];

    statusTestCases.forEach(({ naverStatus, expectedStatus }) => {
      it(`should map ${naverStatus} to ${expectedStatus}`, () => {
        const order: NaverRawOrder = { ...mockNaverOrder, orderStatus: naverStatus };
        const result = adapter.toBaseOrder(order);
        expect(result.status).toBe(expectedStatus);
      });
    });
  });

  describe('toNaverOrder', () => {
    it('should include Naver-specific fields', () => {
      const result = adapter.toNaverOrder(mockNaverOrder, 'test-smartstore');

      expect(result.naver).toBeDefined();
      expect(result.naver.smartStoreId).toBe('test-smartstore');
      expect(result.naver.payOrderId).toBe('N2024011512345');
      expect(result.naver.hasTalkTalkInquiry).toBe(false);
      expect(result.naver.isPurchaseConfirmed).toBe(false);
    });

    it('should mark purchase confirmed for PURCHASE_DECIDED status', () => {
      const confirmedOrder: NaverRawOrder = {
        ...mockNaverOrder,
        orderStatus: 'PURCHASE_DECIDED',
      };

      const result = adapter.toNaverOrder(confirmedOrder, 'test-smartstore');
      expect(result.naver.isPurchaseConfirmed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const minimalOrder: NaverRawOrder = {
        orderId: 'N999',
        productOrderId: 'PO999',
        orderDate: '2024-01-15T10:00:00Z',
        ordererName: '테스트',
        productOrder: {
          productName: '상품',
          quantity: 1,
          unitPrice: 10000,
          totalPaymentAmount: 10000,
        },
        shippingAddress: {
          name: '수령인',
          tel1: '010-0000-0000',
          zipCode: '12345',
          baseAddress: '주소',
        },
        orderStatus: 'PAYED',
      };

      const result = adapter.toBaseOrder(minimalOrder);

      expect(result.customer.phone).toBe('');
      expect(result.shipping.addressDetail).toBeUndefined();
      expect(result.payment.shippingFee).toBe(0);
    });

    it('should handle delivery tracking info', () => {
      const orderWithTracking: NaverRawOrder = {
        ...mockNaverOrder,
        orderStatus: 'DELIVERING',
        deliveryCompanyCode: 'CJGLS',
        trackingNumber: '123456789012',
      };

      const result = adapter.toBaseOrder(orderWithTracking);

      expect(result.shipping.courier).toBe('CJGLS');
      expect(result.shipping.trackingNumber).toBe('123456789012');
    });
  });
});
