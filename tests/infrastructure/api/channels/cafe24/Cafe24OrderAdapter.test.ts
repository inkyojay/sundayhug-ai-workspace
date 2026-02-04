/**
 * Cafe24OrderAdapter 테스트
 * Cafe24 주문 데이터를 표준 형식으로 변환
 */

import { describe, it, expect } from 'vitest';
import { Cafe24OrderAdapter } from '../../../../../src/infrastructure/api/channels/cafe24/Cafe24OrderAdapter';
import { Cafe24RawOrder } from '../../../../../src/infrastructure/api/channels/cafe24/types';
import { SalesChannel, OrderStatus } from '../../../../../src/types';

describe('Cafe24OrderAdapter', () => {
  const adapter = new Cafe24OrderAdapter();

  const mockCafe24Order: Cafe24RawOrder = {
    order_id: 'C2024011512345',
    order_date: '2024-01-15T10:30:00+09:00',
    payment_date: '2024-01-15T10:35:00+09:00',
    order_status: 'N10',
    buyer: {
      name: '홍길동',
      email: 'hong@test.com',
      phone: '02-1234-5678',
      cellphone: '010-1234-5678',
      member_id: 'member123',
      member_group_no: 1,
    },
    receiver: {
      name: '김철수',
      phone: '02-9876-5432',
      cellphone: '010-9876-5432',
      zipcode: '06234',
      address1: '서울시 강남구 테헤란로 123',
      address2: '101동 1001호',
      shipping_message: '문 앞에 놓아주세요',
    },
    items: [
      {
        order_item_code: 'ITEM001',
        product_no: 12345,
        product_code: 'P001',
        product_name: '테스트 상품 A',
        option_value: '색상: 블랙 / 사이즈: L',
        quantity: 2,
        product_price: 15000,
        discount_price: 1000,
        additional_discount_price: 500,
        actual_payment_amount: 27000,
      },
      {
        order_item_code: 'ITEM002',
        product_no: 12346,
        product_code: 'P002',
        product_name: '테스트 상품 B',
        quantity: 1,
        product_price: 8000,
        actual_payment_amount: 8000,
      },
    ],
    payment_amount: 38000,
    shipping_fee: 2500,
    discount_amount: 1500,
    mileage_used: 500,
    actual_payment_amount: 38500,
  };

  describe('toBaseOrder', () => {
    it('should convert Cafe24 order to BaseOrder', () => {
      const result = adapter.toBaseOrder(mockCafe24Order);

      expect(result.channelOrderId).toBe('C2024011512345');
      expect(result.channel).toBe(SalesChannel.CAFE24);
      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it('should convert buyer information correctly', () => {
      const result = adapter.toBaseOrder(mockCafe24Order);

      expect(result.customer.name).toBe('홍길동');
      expect(result.customer.phone).toBe('010-1234-5678');
      expect(result.customer.email).toBe('hong@test.com');
      expect(result.customer.customerId).toBe('member123');
    });

    it('should convert receiver/shipping information correctly', () => {
      const result = adapter.toBaseOrder(mockCafe24Order);

      expect(result.shipping.receiverName).toBe('김철수');
      expect(result.shipping.receiverPhone).toBe('010-9876-5432');
      expect(result.shipping.zipCode).toBe('06234');
      expect(result.shipping.address).toBe('서울시 강남구 테헤란로 123');
      expect(result.shipping.addressDetail).toBe('101동 1001호');
      expect(result.shipping.memo).toBe('문 앞에 놓아주세요');
    });

    it('should convert order items correctly', () => {
      const result = adapter.toBaseOrder(mockCafe24Order);

      expect(result.items).toHaveLength(2);

      const firstItem = result.items[0];
      expect(firstItem.productId).toBe('P001');
      expect(firstItem.channelProductId).toBe('ITEM001');
      expect(firstItem.productName).toBe('테스트 상품 A');
      expect(firstItem.optionName).toBe('색상: 블랙 / 사이즈: L');
      expect(firstItem.quantity).toBe(2);
      expect(firstItem.unitPrice).toBe(15000);
      expect(firstItem.discount).toBe(1500); // 1000 + 500

      const secondItem = result.items[1];
      expect(secondItem.quantity).toBe(1);
      expect(secondItem.discount).toBe(0);
    });

    it('should calculate payment correctly', () => {
      const result = adapter.toBaseOrder(mockCafe24Order);

      expect(result.payment.totalAmount).toBe(38500);
      expect(result.payment.shippingFee).toBe(2500);
      expect(result.payment.discountAmount).toBe(1500);
      expect(result.payment.usedPoints).toBe(500);
    });
  });

  describe('Status Mapping', () => {
    const statusTestCases: Array<{ cafe24Status: Cafe24RawOrder['order_status']; expectedStatus: OrderStatus }> = [
      { cafe24Status: 'N00', expectedStatus: OrderStatus.PENDING },
      { cafe24Status: 'N10', expectedStatus: OrderStatus.PREPARING },
      { cafe24Status: 'N20', expectedStatus: OrderStatus.PREPARING },
      { cafe24Status: 'N21', expectedStatus: OrderStatus.PREPARING },
      { cafe24Status: 'N22', expectedStatus: OrderStatus.PREPARING },
      { cafe24Status: 'N30', expectedStatus: OrderStatus.SHIPPING },
      { cafe24Status: 'N40', expectedStatus: OrderStatus.DELIVERED },
      { cafe24Status: 'N50', expectedStatus: OrderStatus.DELIVERED },
      { cafe24Status: 'C00', expectedStatus: OrderStatus.CANCELLED },
      { cafe24Status: 'C10', expectedStatus: OrderStatus.CANCELLED },
      { cafe24Status: 'C20', expectedStatus: OrderStatus.CANCELLED },
      { cafe24Status: 'R00', expectedStatus: OrderStatus.REFUND_REQUESTED },
      { cafe24Status: 'R10', expectedStatus: OrderStatus.REFUND_REQUESTED },
      { cafe24Status: 'R20', expectedStatus: OrderStatus.REFUNDED },
      { cafe24Status: 'E00', expectedStatus: OrderStatus.EXCHANGE_REQUESTED },
      { cafe24Status: 'E10', expectedStatus: OrderStatus.EXCHANGE_REQUESTED },
      { cafe24Status: 'E20', expectedStatus: OrderStatus.EXCHANGED },
    ];

    statusTestCases.forEach(({ cafe24Status, expectedStatus }) => {
      it(`should map ${cafe24Status} to ${expectedStatus}`, () => {
        const order: Cafe24RawOrder = { ...mockCafe24Order, order_status: cafe24Status };
        const result = adapter.toBaseOrder(order);
        expect(result.status).toBe(expectedStatus);
      });
    });
  });

  describe('toCafe24Order', () => {
    it('should include Cafe24-specific fields', () => {
      const result = adapter.toCafe24Order(mockCafe24Order, 'test-mall');

      expect(result.cafe24).toBeDefined();
      expect(result.cafe24.mallId).toBe('test-mall');
      expect(result.cafe24.memberGrade).toBeUndefined(); // member_group_no 1은 등급 이름 필요
      expect(result.cafe24.usedMileage).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const minimalOrder: Cafe24RawOrder = {
        order_id: 'C999',
        order_date: '2024-01-15T10:00:00Z',
        order_status: 'N00',
        buyer: {
          name: '테스트',
        },
        receiver: {
          name: '수령인',
          zipcode: '12345',
          address1: '주소',
        },
        items: [],
        payment_amount: 0,
        shipping_fee: 0,
        actual_payment_amount: 0,
      };

      const result = adapter.toBaseOrder(minimalOrder);

      expect(result.customer.phone).toBe('');
      expect(result.customer.email).toBeUndefined();
      expect(result.shipping.receiverPhone).toBe('');
      expect(result.shipping.addressDetail).toBeUndefined();
      expect(result.items).toHaveLength(0);
    });

    it('should prefer cellphone over phone', () => {
      const orderWithBothPhones: Cafe24RawOrder = {
        ...mockCafe24Order,
        buyer: {
          name: '홍길동',
          phone: '02-1234-5678',
          cellphone: '010-1111-2222',
        },
        receiver: {
          name: '김철수',
          phone: '02-3333-4444',
          cellphone: '010-5555-6666',
          zipcode: '06234',
          address1: '주소',
        },
      };

      const result = adapter.toBaseOrder(orderWithBothPhones);

      expect(result.customer.phone).toBe('010-1111-2222');
      expect(result.shipping.receiverPhone).toBe('010-5555-6666');
    });

    it('should handle shipping tracking info', () => {
      const orderWithTracking: Cafe24RawOrder = {
        ...mockCafe24Order,
        order_status: 'N30',
        shipping: {
          shipping_company_name: 'CJ대한통운',
          tracking_no: '123456789012',
          status: 'delivering',
        },
      };

      const result = adapter.toBaseOrder(orderWithTracking);

      expect(result.shipping.courier).toBe('CJ대한통운');
      expect(result.shipping.trackingNumber).toBe('123456789012');
    });
  });
});
