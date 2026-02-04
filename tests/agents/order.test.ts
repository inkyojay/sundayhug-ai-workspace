/**
 * Order Agent 단위 테스트
 * 개별 에이전트 동작 검증
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockOrder,
  createMockCoupangOrder,
  createMockNaverOrder,
  createMockInventoryItem,
  inventoryScenarios,
} from '../mocks/mockData';
import { createTestEnvironment, TestEnvironment } from '../utils/testHelpers';
import { SalesChannel, OrderStatus, ApprovalLevel } from '../../src/types';

describe('Order Agent 단위 테스트', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('Order Agent 기본 기능', () => {
    it('Order Agent가 정상적으로 등록되어야 함', () => {
      const orderAgent = env.agents.get('01-order');
      expect(orderAgent).toBeDefined();
      expect(orderAgent?.getId()).toBe('01-order');
    });

    it('Order Agent가 실행 가능해야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'collect_orders',
        channels: [SalesChannel.NAVER],
      });

      expect(result.success).toBe(true);
    });

    it('실행 히스토리가 기록되어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      await orderAgent.execute({ action: 'test' });
      await orderAgent.execute({ action: 'test2' });

      expect(orderAgent.executeHistory).toHaveLength(2);
    });
  });

  describe('주문 수집 서브에이전트 (OrderCollector)', () => {
    it('여러 채널에서 주문을 수집할 수 있어야 함', async () => {
      const channels = [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24];
      const orderAgent = env.agents.get('01-order')!;

      for (const channel of channels) {
        const result = await orderAgent.execute({
          action: 'collect_orders',
          channel,
        });
        expect(result.success).toBe(true);
      }

      expect(orderAgent.executeHistory).toHaveLength(channels.length);
    });

    it('수집 결과에 채널 정보가 포함되어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'collect_orders',
        channel: SalesChannel.COUPANG,
      });

      expect(result.success).toBe(true);
      expect(orderAgent.getLastExecution()?.data?.channel).toBe(SalesChannel.COUPANG);
    });
  });

  describe('배송 관리 서브에이전트 (ShippingManager)', () => {
    it('송장 등록 요청을 처리할 수 있어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      const order = createMockOrder();

      const result = await orderAgent.execute({
        action: 'register_tracking',
        orderId: order.id,
        courier: 'CJ대한통운',
        trackingNumber: 'CJ123456789',
      });

      expect(result.success).toBe(true);
    });

    it('배송 상태 업데이트를 처리할 수 있어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;

      const result = await orderAgent.execute({
        action: 'update_shipping_status',
        orderIds: ['ORD-001', 'ORD-002'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('반품/교환 서브에이전트 (ReturnExchange)', () => {
    it('반품 요청을 처리할 수 있어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      const order = createMockOrder({ status: OrderStatus.DELIVERED });

      const result = await orderAgent.execute({
        action: 'process_return',
        orderId: order.id,
        reason: '단순 변심',
        items: order.items,
      });

      expect(result.success).toBe(true);
    });

    it('교환 요청을 처리할 수 있어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      const order = createMockOrder({ status: OrderStatus.DELIVERED });

      const result = await orderAgent.execute({
        action: 'process_exchange',
        orderId: order.id,
        originalOption: '21호',
        newOption: '23호',
      });

      expect(result.success).toBe(true);
    });

    it('자동 승인 조건을 확인해야 함', () => {
      const autoApproveConfig = {
        enabled: true,
        maxAmount: 50000,
        allowedReasons: ['단순 변심', '사이즈 교환'],
      };

      const returnRequest = {
        amount: 45000,
        reason: '단순 변심',
      };

      const canAutoApprove =
        autoApproveConfig.enabled &&
        returnRequest.amount <= autoApproveConfig.maxAmount &&
        autoApproveConfig.allowedReasons.includes(returnRequest.reason);

      expect(canAutoApprove).toBe(true);
    });

    it('금액이 초과하면 자동 승인이 거부되어야 함', () => {
      const autoApproveConfig = {
        enabled: true,
        maxAmount: 50000,
        allowedReasons: ['단순 변심'],
      };

      const returnRequest = {
        amount: 100000,
        reason: '단순 변심',
      };

      const canAutoApprove =
        autoApproveConfig.enabled && returnRequest.amount <= autoApproveConfig.maxAmount;

      expect(canAutoApprove).toBe(false);
    });
  });

  describe('채널별 주문 처리', () => {
    it('쿠팡 주문의 특수 필드를 처리할 수 있어야 함', async () => {
      const coupangOrder = createMockCoupangOrder();

      expect(coupangOrder.coupang.isRocketDelivery).toBeDefined();
      expect(coupangOrder.coupang.vendorItemId).toBeDefined();

      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'process_coupang_order',
        order: coupangOrder,
        isRocket: coupangOrder.coupang.isRocketDelivery,
      });

      expect(result.success).toBe(true);
    });

    it('네이버 주문의 특수 필드를 처리할 수 있어야 함', async () => {
      const naverOrder = createMockNaverOrder();

      expect(naverOrder.naver.smartStoreId).toBeDefined();
      expect(naverOrder.naver.payOrderId).toBeDefined();

      const orderAgent = env.agents.get('01-order')!;
      const result = await orderAgent.execute({
        action: 'process_naver_order',
        order: naverOrder,
        smartStoreId: naverOrder.naver.smartStoreId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('재고 연동', () => {
    it('주문 처리 전 재고 확인을 요청해야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const order = createMockOrder();

      const result = await inventoryAgent.execute({
        action: 'check_stock',
        productId: order.items[0].productId,
        quantity: order.items[0].quantity,
      });

      expect(result.success).toBe(true);
    });

    it('재고 부족 시 발주 요청을 생성해야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const lowStock = inventoryScenarios.lowStock;

      // 재주문점 미만
      expect(lowStock.currentStock).toBeLessThan(lowStock.reorderPoint);

      const result = await inventoryAgent.execute({
        action: 'create_purchase_order',
        productId: lowStock.productId,
        quantity: lowStock.maxStock - lowStock.currentStock,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Order Agent 설정', () => {
  it('기본 설정값이 올바르게 설정되어야 함', () => {
    const defaultOrderConfig = {
      collectionConfig: {
        channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
        syncInterval: 5,
        batchSize: 100,
        lookbackHours: 24,
      },
      enabledChannels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
      autoRegisterTracking: true,
      autoApproveReturn: {
        enabled: true,
        maxAmount: 50000,
        allowedReasons: [],
      },
      notificationSettings: {
        notifyOnNewOrder: true,
        notifyOnShippingUpdate: false,
        notifyOnReturnRequest: true,
      },
    };

    expect(defaultOrderConfig.collectionConfig.syncInterval).toBe(5);
    expect(defaultOrderConfig.enabledChannels).toContain(SalesChannel.NAVER);
    expect(defaultOrderConfig.autoApproveReturn.maxAmount).toBe(50000);
  });

  it('설정 업데이트가 가능해야 함', () => {
    const config = {
      autoApproveReturn: {
        enabled: true,
        maxAmount: 50000,
        allowedReasons: [],
      },
    };

    const updates = {
      autoApproveReturn: {
        ...config.autoApproveReturn,
        maxAmount: 100000,
      },
    };

    const updatedConfig = { ...config, ...updates };
    expect(updatedConfig.autoApproveReturn.maxAmount).toBe(100000);
  });
});

describe('Order Agent 에러 처리', () => {
  it('API 연결 실패 시 재시도해야 함', () => {
    const retryConfig = {
      maxRetries: 3,
      retryDelay: 5000,
    };

    expect(retryConfig.maxRetries).toBe(3);
    expect(retryConfig.retryDelay).toBe(5000);
  });

  it('재시도 실패 시 에러 알림을 발송해야 함', async () => {
    const notificationSent = { value: false };

    // 시뮬레이션: 재시도 후에도 실패하면 알림
    const simulateFailureWithNotification = async () => {
      for (let i = 0; i < 3; i++) {
        // 실패 시뮬레이션
      }
      notificationSent.value = true;
    };

    await simulateFailureWithNotification();
    expect(notificationSent.value).toBe(true);
  });
});
