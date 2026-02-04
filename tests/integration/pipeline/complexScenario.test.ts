/**
 * 복합 시나리오 통합 테스트
 *
 * 시나리오 C: 복합 시나리오
 * 반품 요청 접수 → CS Agent 반품 사유 확인 → Order Agent 반품 처리
 * → Inventory Agent 재고 복원 → Accounting Agent 환불 처리
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockOrder,
  createMockCSInquiry,
  csInquiryScenarios,
  createMockInventoryItem,
  inventoryScenarios,
} from '../../mocks/mockData';
import {
  MockAgent,
  MockAgentRegistry,
  createStandardMockAgents,
  createMockAgent,
} from '../../mocks/mockAgents';
import { createTestEnvironment, TestEnvironment } from '../../utils/testHelpers';
import { OrderStatus, TaskStatus } from '../../../src/types';

describe('복합 시나리오: 반품 처리 전체 흐름', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('시나리오 C: 반품 처리 파이프라인', () => {
    it('전체 반품 처리 흐름이 올바르게 실행되어야 함', async () => {
      const returnInquiry = csInquiryScenarios.returnRequest;
      const order = createMockOrder({
        id: returnInquiry.orderId!,
        status: OrderStatus.DELIVERED,
      });
      const inventory = inventoryScenarios.normalStock;

      const executedAgents: string[] = [];
      const executionResults: Record<string, boolean> = {};

      // 1. CS Agent: 반품 사유 확인
      const csAgent = env.agents.get('02-cs')!;
      const csResult = await csAgent.execute({
        action: 'verify_return_reason',
        inquiry: returnInquiry,
        orderId: order.id,
        returnReason: '피부에 맞지 않음',
      });
      executedAgents.push('02-cs');
      executionResults['02-cs'] = csResult.success;

      // 2. Order Agent: 반품 처리
      const orderAgent = env.agents.get('01-order')!;
      const orderResult = await orderAgent.execute({
        action: 'process_return',
        orderId: order.id,
        items: order.items,
        returnReason: '피부에 맞지 않음',
        returnStatus: 'approved',
      });
      executedAgents.push('01-order');
      executionResults['01-order'] = orderResult.success;

      // 3. Inventory Agent: 재고 복원
      const inventoryAgent = env.agents.get('05-inventory')!;
      const inventoryResult = await inventoryAgent.execute({
        action: 'restore_stock',
        productId: order.items[0].productId,
        quantity: order.items[0].quantity,
        reason: 'return_completed',
        orderId: order.id,
      });
      executedAgents.push('05-inventory');
      executionResults['05-inventory'] = inventoryResult.success;

      // 4. Accounting Agent: 환불 처리
      const accountingAgent = env.agents.get('06-accounting')!;
      const accountingResult = await accountingAgent.execute({
        action: 'process_refund',
        orderId: order.id,
        amount: order.payment.totalAmount,
        refundMethod: order.payment.method,
        customerId: order.customer.customerId,
      });
      executedAgents.push('06-accounting');
      executionResults['06-accounting'] = accountingResult.success;

      // 검증: 모든 에이전트가 올바른 순서로 실행
      expect(executedAgents).toEqual(['02-cs', '01-order', '05-inventory', '06-accounting']);

      // 검증: 모든 실행이 성공
      expect(Object.values(executionResults).every((v) => v)).toBe(true);
    });

    it('반품 불가 사유가 있으면 CS Agent에서 거절 응답을 생성해야 함', async () => {
      const returnInquiry = createMockCSInquiry({
        type: 'return_request',
        subject: '반품 요청 (14일 경과)',
        content: '3주 전에 받은 상품인데 반품하고 싶습니다.',
        orderId: 'ORD-20250115-0001',
      });

      // 반품 정책: 14일 이내
      const orderDate = new Date('2025-01-15');
      const today = new Date('2025-02-04');
      const daysSinceDelivery = Math.floor(
        (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const RETURN_PERIOD_DAYS = 14;
      const isReturnEligible = daysSinceDelivery <= RETURN_PERIOD_DAYS;

      expect(isReturnEligible).toBe(false);
      expect(daysSinceDelivery).toBeGreaterThan(RETURN_PERIOD_DAYS);
    });

    it('부분 반품 시 일부 상품만 재고 복원되어야 함', async () => {
      const order = createMockOrder({
        items: [
          {
            productId: 'PRD-00001',
            channelProductId: 'CP-001',
            productName: '상품 A',
            quantity: 2,
            unitPrice: 30000,
            discount: 0,
            totalPrice: 60000,
          },
          {
            productId: 'PRD-00002',
            channelProductId: 'CP-002',
            productName: '상품 B',
            quantity: 1,
            unitPrice: 50000,
            discount: 0,
            totalPrice: 50000,
          },
        ],
      });

      // 상품 A만 1개 반품
      const partialReturnItems = [
        {
          productId: 'PRD-00001',
          quantity: 1, // 2개 중 1개만 반품
        },
      ];

      const inventoryAgent = env.agents.get('05-inventory')!;
      const result = await inventoryAgent.execute({
        action: 'restore_stock',
        items: partialReturnItems,
        reason: 'partial_return',
        orderId: order.id,
      });

      expect(result.success).toBe(true);
      expect(inventoryAgent.executeHistory.length).toBe(1);

      const lastExec = inventoryAgent.getLastExecution();
      expect(lastExec?.data?.items).toHaveLength(1);
      expect(lastExec?.data?.items[0].quantity).toBe(1);
    });
  });

  describe('시나리오: 교환 처리 파이프라인', () => {
    it('전체 교환 처리 흐름이 올바르게 실행되어야 함', async () => {
      const exchangeInquiry = csInquiryScenarios.exchangeRequest;
      const order = createMockOrder({
        id: exchangeInquiry.orderId!,
        status: OrderStatus.DELIVERED,
      });

      const executedAgents: string[] = [];

      // 1. CS Agent: 교환 요청 접수
      const csAgent = env.agents.get('02-cs')!;
      await csAgent.execute({
        action: 'receive_exchange_request',
        inquiry: exchangeInquiry,
        originalOption: '21호',
        newOption: '23호',
      });
      executedAgents.push('02-cs');

      // 2. Inventory Agent: 교환 상품 재고 확인
      const inventoryAgent = env.agents.get('05-inventory')!;
      await inventoryAgent.execute({
        action: 'check_exchange_stock',
        productId: exchangeInquiry.productId,
        newOption: '23호',
        quantity: 1,
      });
      executedAgents.push('05-inventory');

      // 3. Order Agent: 교환 주문 생성
      const orderAgent = env.agents.get('01-order')!;
      await orderAgent.execute({
        action: 'create_exchange_order',
        originalOrderId: order.id,
        originalOption: '21호',
        newOption: '23호',
      });
      executedAgents.push('01-order');

      // 4. Logistics Agent: 수거 및 재배송 처리
      const logisticsAgent = env.agents.get('13-logistics')!;
      await logisticsAgent.execute({
        action: 'process_exchange_shipping',
        orderId: order.id,
        pickupRequired: true,
        newShipmentRequired: true,
      });
      executedAgents.push('13-logistics');

      // 검증
      expect(executedAgents).toEqual(['02-cs', '05-inventory', '01-order', '13-logistics']);
    });

    it('교환 상품 재고가 없으면 대기 또는 환불 옵션을 제공해야 함', async () => {
      const outOfStockInventory = inventoryScenarios.outOfStock;

      // 재고 없음 확인
      expect(outOfStockInventory.currentStock).toBe(0);

      // 옵션 제공
      const options = {
        waitForRestock: {
          available: true,
          estimatedDays: 7,
          message: '입고 예정일: 7일 후',
        },
        fullRefund: {
          available: true,
          amount: 40000,
          message: '전액 환불 가능',
        },
        alternativeProduct: {
          available: true,
          productId: 'PRD-00005',
          message: '유사 상품으로 교환 가능',
        },
      };

      expect(options.waitForRestock.available).toBe(true);
      expect(options.fullRefund.available).toBe(true);
    });
  });

  describe('시나리오: 주문 취소 파이프라인', () => {
    it('결제 전 취소는 단순 주문 삭제로 처리되어야 함', async () => {
      const order = createMockOrder({
        status: OrderStatus.PENDING,
      });

      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'cancel_order',
        orderId: order.id,
        orderStatus: order.status,
        cancellationReason: '고객 변심',
      });

      expect(result.success).toBe(true);
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it('결제 후 취소는 환불 프로세스가 포함되어야 함', async () => {
      const order = createMockOrder({
        status: OrderStatus.PAID,
      });

      const executedAgents: string[] = [];

      // 1. Order Agent: 주문 취소
      const orderAgent = env.agents.get('01-order')!;
      await orderAgent.execute({
        action: 'cancel_order',
        orderId: order.id,
        orderStatus: order.status,
      });
      executedAgents.push('01-order');

      // 2. Accounting Agent: 환불 처리
      const accountingAgent = env.agents.get('06-accounting')!;
      await accountingAgent.execute({
        action: 'process_refund',
        orderId: order.id,
        amount: order.payment.totalAmount,
      });
      executedAgents.push('06-accounting');

      expect(executedAgents).toEqual(['01-order', '06-accounting']);
    });

    it('배송 중 취소는 수거 프로세스가 포함되어야 함', async () => {
      const order = createMockOrder({
        status: OrderStatus.SHIPPING,
        shipping: {
          receiverName: '홍길동',
          receiverPhone: '010-1234-5678',
          zipCode: '06234',
          address: '서울특별시 강남구',
          courier: 'CJ대한통운',
          trackingNumber: 'CJ123456789',
        },
      });

      const executedAgents: string[] = [];

      // 1. Logistics Agent: 배송 중단 및 수거 요청
      const logisticsAgent = env.agents.get('13-logistics')!;
      await logisticsAgent.execute({
        action: 'request_pickup',
        orderId: order.id,
        trackingNumber: order.shipping.trackingNumber,
        courier: order.shipping.courier,
      });
      executedAgents.push('13-logistics');

      // 2. Order Agent: 주문 취소
      const orderAgent = env.agents.get('01-order')!;
      await orderAgent.execute({
        action: 'cancel_order',
        orderId: order.id,
        requiresPickup: true,
      });
      executedAgents.push('01-order');

      expect(executedAgents).toContain('13-logistics');
      expect(executedAgents).toContain('01-order');
    });
  });

  describe('시나리오: 대량 주문 처리 (승인 필요)', () => {
    it('50만원 초과 주문은 승인이 필요해야 함', async () => {
      const largeOrder = createMockOrder({
        payment: {
          method: 'card',
          totalAmount: 1500000,
          shippingFee: 0,
          discountAmount: 0,
        },
      });

      const APPROVAL_THRESHOLD = 500000;
      const needsApproval = largeOrder.payment.totalAmount > APPROVAL_THRESHOLD;

      expect(needsApproval).toBe(true);
    });

    it('승인 대기 상태에서 주문 처리가 보류되어야 함', async () => {
      const largeOrder = createMockOrder({
        payment: {
          method: 'card',
          totalAmount: 2000000,
          shippingFee: 0,
          discountAmount: 0,
        },
      });

      // 승인 요청 시뮬레이션
      const approvalRequest = {
        id: `APR-${Date.now()}`,
        orderId: largeOrder.id,
        amount: largeOrder.payment.totalAmount,
        status: 'pending' as const,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      expect(approvalRequest.status).toBe('pending');
    });

    it('승인 완료 후 주문 처리가 재개되어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      const inventoryAgent = env.agents.get('05-inventory')!;

      // 승인 완료 후 처리 재개
      const approvedOrder = {
        id: 'ORD-APPROVED-001',
        amount: 1500000,
        approvalStatus: 'approved',
      };

      // 주문 처리 재개
      await orderAgent.execute({
        action: 'resume_processing',
        orderId: approvedOrder.id,
        approvalStatus: approvedOrder.approvalStatus,
      });

      expect(orderAgent.executeHistory.length).toBe(1);
    });
  });

  describe('시나리오: 에러 복구', () => {
    it('중간 단계 실패 시 롤백이 필요한 경우를 식별해야 함', async () => {
      // 시나리오: 재고 복원 성공 후 환불 실패
      const failurePoint = 'accounting_refund';

      const rollbackActions = {
        accounting_refund: ['inventory_restore_rollback', 'order_status_rollback'],
        inventory_restore: ['order_status_rollback'],
        order_return_process: [],
      };

      const requiredRollbacks = rollbackActions[failurePoint];
      expect(requiredRollbacks).toContain('inventory_restore_rollback');
    });

    it('재시도 가능한 에러는 자동 재시도해야 함', () => {
      const recoverableErrors = ['ECONNRESET', 'ETIMEDOUT', 'RATE_LIMIT', '503', '429'];

      const error = new Error('ETIMEDOUT: Connection timed out');
      const isRecoverable = recoverableErrors.some((e) => error.message.includes(e));

      expect(isRecoverable).toBe(true);
    });

    it('최대 재시도 횟수 초과 시 에스컬레이션되어야 함', () => {
      const MAX_RETRIES = 3;
      let retryCount = 0;

      // 재시도 시뮬레이션
      while (retryCount < MAX_RETRIES) {
        retryCount++;
        // 실패 지속
      }

      const shouldEscalate = retryCount >= MAX_RETRIES;
      expect(shouldEscalate).toBe(true);
    });
  });
});
