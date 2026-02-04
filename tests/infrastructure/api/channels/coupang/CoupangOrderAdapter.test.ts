/**
 * CoupangOrderAdapter 테스트
 * 쿠팡 주문 데이터를 표준 형식으로 변환
 */

import { describe, it, expect } from 'vitest';
import { CoupangOrderAdapter } from '../../../../../src/infrastructure/api/channels/coupang/CoupangOrderAdapter';
import { CoupangRawOrder } from '../../../../../src/infrastructure/api/channels/coupang/types';
import { SalesChannel, OrderStatus } from '../../../../../src/types';

describe('CoupangOrderAdapter', () => {
  const adapter = new CoupangOrderAdapter();

  const mockCoupangOrder: CoupangRawOrder = {
    orderId: 12345678,
    orderedAt: '2024-01-15T10:30:00',
    orderer: {
      name: '홍길동',
      email: 'hong@test.com',
      safeNumber: '050-1234-5678',
    },
    receiver: {
      name: '김철수',
      safeNumber: '050-9876-5432',
      addr1: '서울시 강남구 테헤란로 123',
      addr2: '101동 1001호',
      postCode: '06234',
    },
    orderItems: [
      {
        vendorItemId: 111111,
        vendorItemName: '테스트 상품 A',
        vendorItemPackageId: 222222,
        vendorItemPackageName: '패키지 A',
        shippingCount: 2,
        salesPrice: 15000,
        discountPrice: 2000,
        instantCouponDiscount: 500,
        downloadableCouponDiscount: 300,
        orderPrice: 12200,
        externalVendorSkuCode: 'SKU-001',
      },
      {
        vendorItemId: 333333,
        vendorItemName: '테스트 상품 B',
        vendorItemPackageId: 444444,
        shippingCount: 1,
        salesPrice: 8000,
        discountPrice: 0,
        orderPrice: 8000,
      },
    ],
    shippingPrice: 2500,
    remotePrice: 1000,
    shippingMessage: '문 앞에 놓아주세요',
    status: 'ACCEPT',
    paidAt: '2024-01-15T10:35:00',
    shipmentBoxId: 9999,
  };

  describe('toBaseOrder', () => {
    it('should convert Coupang order to BaseOrder', () => {
      const result = adapter.toBaseOrder(mockCoupangOrder);

      expect(result.channelOrderId).toBe('12345678');
      expect(result.channel).toBe(SalesChannel.COUPANG);
      expect(result.status).toBe(OrderStatus.PAID);
    });

    it('should convert orderer information correctly', () => {
      const result = adapter.toBaseOrder(mockCoupangOrder);

      expect(result.customer.name).toBe('홍길동');
      expect(result.customer.phone).toBe('050-1234-5678');
      expect(result.customer.email).toBe('hong@test.com');
    });

    it('should convert receiver/shipping information correctly', () => {
      const result = adapter.toBaseOrder(mockCoupangOrder);

      expect(result.shipping.receiverName).toBe('김철수');
      expect(result.shipping.receiverPhone).toBe('050-9876-5432');
      expect(result.shipping.zipCode).toBe('06234');
      expect(result.shipping.address).toBe('서울시 강남구 테헤란로 123');
      expect(result.shipping.addressDetail).toBe('101동 1001호');
      expect(result.shipping.memo).toBe('문 앞에 놓아주세요');
    });

    it('should convert order items correctly', () => {
      const result = adapter.toBaseOrder(mockCoupangOrder);

      expect(result.items).toHaveLength(2);

      const firstItem = result.items[0];
      expect(firstItem.channelProductId).toBe('111111');
      expect(firstItem.productName).toBe('테스트 상품 A');
      expect(firstItem.optionName).toBe('패키지 A');
      expect(firstItem.quantity).toBe(2);
      expect(firstItem.unitPrice).toBe(15000);
      expect(firstItem.discount).toBe(2800); // 2000 + 500 + 300

      const secondItem = result.items[1];
      expect(secondItem.quantity).toBe(1);
      expect(secondItem.discount).toBe(0);
    });

    it('should calculate payment correctly', () => {
      const result = adapter.toBaseOrder(mockCoupangOrder);

      // 12200 * 2 + 8000 * 1 = 32400
      expect(result.payment.totalAmount).toBe(32400);
      expect(result.payment.shippingFee).toBe(3500); // 2500 + 1000 (remote)
    });
  });

  describe('Status Mapping', () => {
    const statusTestCases: Array<{ coupangStatus: CoupangRawOrder['status']; expectedStatus: OrderStatus }> = [
      { coupangStatus: 'ACCEPT', expectedStatus: OrderStatus.PAID },
      { coupangStatus: 'INSTRUCT', expectedStatus: OrderStatus.PREPARING },
      { coupangStatus: 'DEPARTURE', expectedStatus: OrderStatus.SHIPPING },
      { coupangStatus: 'DELIVERING', expectedStatus: OrderStatus.SHIPPING },
      { coupangStatus: 'FINAL_DELIVERY', expectedStatus: OrderStatus.DELIVERED },
      { coupangStatus: 'CANCEL', expectedStatus: OrderStatus.CANCELLED },
      { coupangStatus: 'RETURN', expectedStatus: OrderStatus.REFUND_REQUESTED },
      { coupangStatus: 'EXCHANGE', expectedStatus: OrderStatus.EXCHANGE_REQUESTED },
    ];

    statusTestCases.forEach(({ coupangStatus, expectedStatus }) => {
      it(`should map ${coupangStatus} to ${expectedStatus}`, () => {
        const order: CoupangRawOrder = { ...mockCoupangOrder, status: coupangStatus };
        const result = adapter.toBaseOrder(order);
        expect(result.status).toBe(expectedStatus);
      });
    });
  });

  describe('toCoupangOrder', () => {
    it('should include Coupang-specific fields', () => {
      const result = adapter.toCoupangOrder(mockCoupangOrder);

      expect(result.coupang).toBeDefined();
      expect(result.coupang.vendorItemId).toBe('111111');
      expect(result.coupang.isRocketDelivery).toBe(false);
      expect(result.coupang.isRocketWow).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const minimalOrder: CoupangRawOrder = {
        orderId: 999,
        orderedAt: '2024-01-15T10:00:00',
        orderer: { name: '테스트' },
        receiver: {
          name: '수령인',
          addr1: '주소',
          postCode: '12345',
        },
        orderItems: [],
        shippingPrice: 0,
        remotePrice: 0,
        status: 'ACCEPT',
      };

      const result = adapter.toBaseOrder(minimalOrder);

      expect(result.customer.phone).toBe('');
      expect(result.customer.email).toBeUndefined();
      expect(result.shipping.addressDetail).toBeUndefined();
      expect(result.items).toHaveLength(0);
    });

    it('should handle ordererNumber fallback', () => {
      const orderWithNumber: CoupangRawOrder = {
        ...mockCoupangOrder,
        orderer: {
          name: '홍길동',
          ordererNumber: '010-1111-2222', // safeNumber 대신 ordererNumber
        },
      };

      const result = adapter.toBaseOrder(orderWithNumber);
      expect(result.customer.phone).toBe('010-1111-2222');
    });
  });
});
