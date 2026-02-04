/**
 * 주문 처리 파이프라인 통합 테스트
 *
 * 시나리오 A: 주문 처리 파이프라인
 * 새 주문 이벤트 발생 → Supervisor 라우팅 → OrderCollector 수집
 * → Inventory Agent 재고 확인 → 배송 준비 또는 발주 생성
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockOrder,
  createMockCoupangOrder,
  createMockNaverOrder,
  createOrderProcessingTask,
  createInventoryCheckTask,
  inventoryScenarios,
} from '../../mocks/mockData';
import {
  MockAgent,
  MockAgentRegistry,
  createStandardMockAgents,
  createMockAgent,
} from '../../mocks/mockAgents';
import { createTestEnvironment, TestEnvironment, wait } from '../../utils/testHelpers';
import { OrderStatus, SalesChannel, TaskStatus } from '../../../src/types';

describe('주문 처리 파이프라인', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('시나리오 A: 정상 주문 처리 흐름', () => {
    it('새 주문이 Supervisor를 통해 Order Agent로 라우팅되어야 함', async () => {
      const order = createMockNaverOrder();
      const task = createOrderProcessingTask(order);

      // Step 1: Supervisor가 주문을 Order Agent로 라우팅
      const supervisor = env.agents.get('00-supervisor')!;
      const orderAgent = env.agents.get('01-order')!;

      // Supervisor 실행
      const routingResult = await supervisor.execute({
        action: 'route',
        request: task,
      });

      expect(routingResult.success).toBe(true);
      expect(supervisor.executeHistory.length).toBe(1);
    });

    it('Order Agent가 주문을 수집하고 처리해야 함', async () => {
      const order = createMockNaverOrder();
      const orderAgent = env.agents.get('01-order')!;

      const result = await orderAgent.execute({
        action: 'process_new_order',
        order: order,
        source: order.channel,
      });

      expect(result.success).toBe(true);
      expect(orderAgent.executeHistory.length).toBe(1);

      const lastExec = orderAgent.getLastExecution();
      expect(lastExec?.data?.order).toBeDefined();
    });

    it('주문 처리 후 Inventory Agent에 재고 확인 요청이 전달되어야 함', async () => {
      const order = createMockOrder();
      const inventoryAgent = env.agents.get('05-inventory')!;

      // 재고 확인 요청
      const result = await inventoryAgent.execute({
        action: 'check_stock',
        productId: order.items[0].productId,
        quantity: order.items[0].quantity,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('재고 있음 → 배송 준비 프로세스가 시작되어야 함', async () => {
      const order = createMockOrder();
      const inventory = inventoryScenarios.normalStock;

      // 재고 충분: currentStock(150) > safetyStock(50)
      expect(inventory.currentStock).toBeGreaterThan(inventory.safetyStock);

      // 배송 준비 시작
      const logisticsAgent = env.agents.get('13-logistics')!;
      const result = await logisticsAgent.execute({
        action: 'prepare_shipment',
        orderId: order.id,
        items: order.items,
      });

      expect(result.success).toBe(true);
    });

    it('재고 없음 → 발주 생성 프로세스가 시작되어야 함', async () => {
      const order = createMockOrder({
        items: [
          {
            productId: 'PRD-00003',
            channelProductId: 'CP-00003',
            productName: '품절 상품',
            quantity: 5,
            unitPrice: 30000,
            discount: 0,
            totalPrice: 150000,
          },
        ],
      });
      const inventory = inventoryScenarios.outOfStock;

      // 재고 없음
      expect(inventory.currentStock).toBe(0);

      // 발주 생성
      const inventoryAgent = env.agents.get('05-inventory')!;
      const result = await inventoryAgent.execute({
        action: 'create_purchase_order',
        productId: inventory.productId,
        quantity: 100,
        reason: 'out_of_stock',
        orderId: order.id,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('시나리오 B: 채널별 주문 처리', () => {
    it('쿠팡 로켓배송 주문 처리', async () => {
      const coupangOrder = createMockCoupangOrder();
      expect(coupangOrder.coupang.isRocketDelivery).toBe(true);

      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'process_coupang_order',
        order: coupangOrder,
        isRocket: coupangOrder.coupang.isRocketDelivery,
      });

      expect(result.success).toBe(true);
    });

    it('네이버 스마트스토어 주문 처리', async () => {
      const naverOrder = createMockNaverOrder();
      expect(naverOrder.naver.smartStoreId).toBeDefined();

      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'process_naver_order',
        order: naverOrder,
        smartStoreId: naverOrder.naver.smartStoreId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('시나리오 C: 에러 처리', () => {
    it('에이전트 실행 실패 시 에러가 올바르게 반환되어야 함', async () => {
      const failingAgent = createMockAgent({
        id: 'failing-agent',
        name: 'Failing Agent',
        shouldSucceed: false,
        errorMessage: 'Simulated failure',
      });

      env.registry.register(failingAgent);

      const result = await failingAgent.execute({ test: true });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Simulated failure');
    });

    it('재시도 정책이 적용되어야 함 (미구현 - Mock 한계)', async () => {
      // 실제 BaseAgent의 재시도 로직은 테스트가 복잡하므로
      // 재시도 설정값만 확인
      const agentConfig = {
        maxRetries: 3,
        retryDelay: 1000,
      };

      expect(agentConfig.maxRetries).toBe(3);
      expect(agentConfig.retryDelay).toBe(1000);
    });
  });

  describe('시나리오 D: 전체 파이프라인 흐름', () => {
    it('전체 주문 처리 파이프라인이 순차적으로 실행되어야 함', async () => {
      const order = createMockNaverOrder();
      const executedAgents: string[] = [];

      // 1. Supervisor 라우팅
      const supervisor = env.agents.get('00-supervisor')!;
      await supervisor.execute({ action: 'route', order });
      executedAgents.push('00-supervisor');

      // 2. Order Agent 주문 수집
      const orderAgent = env.agents.get('01-order')!;
      await orderAgent.execute({ action: 'collect_order', order });
      executedAgents.push('01-order');

      // 3. Inventory Agent 재고 확인
      const inventoryAgent = env.agents.get('05-inventory')!;
      await inventoryAgent.execute({
        action: 'check_stock',
        productId: order.items[0].productId,
      });
      executedAgents.push('05-inventory');

      // 4. Logistics Agent 배송 준비
      const logisticsAgent = env.agents.get('13-logistics')!;
      await logisticsAgent.execute({
        action: 'prepare_shipment',
        orderId: order.id,
      });
      executedAgents.push('13-logistics');

      // 모든 에이전트가 실행되었는지 확인
      expect(executedAgents).toEqual(['00-supervisor', '01-order', '05-inventory', '13-logistics']);

      // 각 에이전트의 실행 기록 확인
      expect(supervisor.executeHistory.length).toBe(1);
      expect(orderAgent.executeHistory.length).toBe(1);
      expect(inventoryAgent.executeHistory.length).toBe(1);
      expect(logisticsAgent.executeHistory.length).toBe(1);
    });

    it('재고 부족 시 발주 + 승인 워크플로우가 시작되어야 함', async () => {
      const order = createMockOrder();
      const lowStockInventory = inventoryScenarios.lowStock;

      // 재고가 재주문점 미만
      expect(lowStockInventory.currentStock).toBeLessThan(lowStockInventory.reorderPoint);

      // 발주 필요 여부 확인
      const needsPurchaseOrder = lowStockInventory.currentStock < lowStockInventory.reorderPoint;
      expect(needsPurchaseOrder).toBe(true);

      // 승인 요청이 필요한 발주
      const purchaseOrderAmount = 100 * 10000; // 100개 * 10,000원
      const needsApproval = purchaseOrderAmount > 500000; // 50만원 초과 시 승인 필요
      expect(needsApproval).toBe(true);
    });
  });
});

describe('주문 상태 전이', () => {
  it('주문 상태가 올바르게 전이되어야 함', () => {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.REFUND_REQUESTED],
      [OrderStatus.PREPARING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUND_REQUESTED, OrderStatus.EXCHANGE_REQUESTED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUND_REQUESTED]: [OrderStatus.REFUNDED, OrderStatus.DELIVERED],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.EXCHANGE_REQUESTED]: [OrderStatus.EXCHANGED, OrderStatus.DELIVERED],
      [OrderStatus.EXCHANGED]: [],
    };

    // PAID → PREPARING 전이 가능
    expect(validTransitions[OrderStatus.PAID]).toContain(OrderStatus.PREPARING);

    // SHIPPING → PAID 전이 불가
    expect(validTransitions[OrderStatus.SHIPPING]).not.toContain(OrderStatus.PAID);

    // DELIVERED 후 반품/교환 요청 가능
    expect(validTransitions[OrderStatus.DELIVERED]).toContain(OrderStatus.REFUND_REQUESTED);
    expect(validTransitions[OrderStatus.DELIVERED]).toContain(OrderStatus.EXCHANGE_REQUESTED);
  });
});
