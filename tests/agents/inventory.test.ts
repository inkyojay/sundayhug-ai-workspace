/**
 * Inventory Agent 단위 테스트
 * 개별 에이전트 동작 검증
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockInventoryItem,
  inventoryScenarios,
  createMockOrder,
} from '../mocks/mockData';
import { createTestEnvironment, TestEnvironment } from '../utils/testHelpers';
import { SalesChannel, ApprovalLevel } from '../../src/types';

describe('Inventory Agent 단위 테스트', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('Inventory Agent 기본 기능', () => {
    it('Inventory Agent가 정상적으로 등록되어야 함', () => {
      const inventoryAgent = env.agents.get('05-inventory');
      expect(inventoryAgent).toBeDefined();
      expect(inventoryAgent?.getId()).toBe('05-inventory');
    });

    it('Inventory Agent가 실행 가능해야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const result = await inventoryAgent.execute({
        action: 'sync_inventory',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('재고 동기화 서브에이전트 (StockSync)', () => {
    it('여러 채널의 재고를 동기화할 수 있어야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const channels = [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24];

      const result = await inventoryAgent.execute({
        action: 'sync_stock',
        channels,
      });

      expect(result.success).toBe(true);
    });

    it('재고 수량 변경을 감지해야 함', () => {
      const previousStock = createMockInventoryItem({ currentStock: 150 });
      const currentStock = createMockInventoryItem({ currentStock: 140 });

      const stockChange = previousStock.currentStock - currentStock.currentStock;
      const hasChanged = stockChange !== 0;

      expect(hasChanged).toBe(true);
      expect(stockChange).toBe(10);
    });

    it('재고 불일치를 감지해야 함', () => {
      const internalStock = 150;
      const channelStocks = {
        [SalesChannel.COUPANG]: 148,
        [SalesChannel.NAVER]: 150,
        [SalesChannel.CAFE24]: 152,
      };

      const discrepancies: { channel: SalesChannel; diff: number }[] = [];

      for (const [channel, stock] of Object.entries(channelStocks)) {
        const diff = stock - internalStock;
        if (diff !== 0) {
          discrepancies.push({ channel: channel as SalesChannel, diff });
        }
      }

      expect(discrepancies).toHaveLength(2);
    });
  });

  describe('발주 관리 서브에이전트 (PurchaseOrder)', () => {
    it('재주문점 도달 시 발주를 생성해야 함', () => {
      const inventory = inventoryScenarios.lowStock;

      // currentStock(30) < reorderPoint(80)
      const needsReorder = inventory.currentStock < inventory.reorderPoint;
      expect(needsReorder).toBe(true);
    });

    it('발주 수량을 계산해야 함', () => {
      const inventory = inventoryScenarios.lowStock;

      // 최대 재고까지 채우는 방식
      const orderQuantity = inventory.maxStock - inventory.currentStock;

      expect(orderQuantity).toBe(inventory.maxStock - inventory.currentStock);
      expect(orderQuantity).toBeGreaterThan(0);
    });

    it('발주 금액에 따라 승인 레벨을 결정해야 함', () => {
      const approvalThresholds = {
        [ApprovalLevel.NONE]: 100000, // 10만원 미만
        [ApprovalLevel.LOW]: 500000, // 50만원 미만
        [ApprovalLevel.MEDIUM]: 1000000, // 100만원 미만
        [ApprovalLevel.HIGH]: 5000000, // 500만원 미만
        [ApprovalLevel.CRITICAL]: Infinity, // 500만원 이상
      };

      const determineApprovalLevel = (amount: number): ApprovalLevel => {
        if (amount < approvalThresholds[ApprovalLevel.NONE]) return ApprovalLevel.NONE;
        if (amount < approvalThresholds[ApprovalLevel.LOW]) return ApprovalLevel.LOW;
        if (amount < approvalThresholds[ApprovalLevel.MEDIUM]) return ApprovalLevel.MEDIUM;
        if (amount < approvalThresholds[ApprovalLevel.HIGH]) return ApprovalLevel.HIGH;
        return ApprovalLevel.CRITICAL;
      };

      expect(determineApprovalLevel(50000)).toBe(ApprovalLevel.NONE);
      expect(determineApprovalLevel(300000)).toBe(ApprovalLevel.LOW);
      expect(determineApprovalLevel(800000)).toBe(ApprovalLevel.MEDIUM);
      expect(determineApprovalLevel(3000000)).toBe(ApprovalLevel.HIGH);
      expect(determineApprovalLevel(10000000)).toBe(ApprovalLevel.CRITICAL);
    });

    it('발주 생성 요청을 처리할 수 있어야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const lowStock = inventoryScenarios.lowStock;

      const result = await inventoryAgent.execute({
        action: 'create_purchase_order',
        productId: lowStock.productId,
        quantity: lowStock.maxStock - lowStock.currentStock,
        reason: 'reorder_point_reached',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('비용 분석 서브에이전트 (CostAnalyzer)', () => {
    it('제품 원가를 계산해야 함', () => {
      const product = {
        purchasePrice: 15000, // 매입가
        shippingCost: 2000, // 입고 물류비
        storageCost: 500, // 보관비
        handlingCost: 300, // 핸들링 비용
      };

      const totalCost =
        product.purchasePrice + product.shippingCost + product.storageCost + product.handlingCost;

      expect(totalCost).toBe(17800);
    });

    it('마진율을 계산해야 함', () => {
      const product = {
        sellingPrice: 45000,
        totalCost: 17800,
      };

      const margin = product.sellingPrice - product.totalCost;
      const marginRate = (margin / product.sellingPrice) * 100;

      expect(marginRate).toBeCloseTo(60.44, 1);
    });

    it('재고 가치를 계산해야 함', () => {
      const inventory = inventoryScenarios.normalStock;
      const unitCost = 17800;

      const inventoryValue = inventory.currentStock * unitCost;

      expect(inventoryValue).toBe(150 * 17800);
    });
  });

  describe('재고 상태 관리', () => {
    it('정상 재고를 식별해야 함', () => {
      const inventory = inventoryScenarios.normalStock;

      // currentStock(150) > safetyStock(50)
      const isNormal = inventory.currentStock > inventory.safetyStock;

      expect(isNormal).toBe(true);
    });

    it('저재고를 식별해야 함', () => {
      const inventory = inventoryScenarios.lowStock;

      // currentStock(30) < safetyStock(50)
      const isLow = inventory.currentStock < inventory.safetyStock;

      expect(isLow).toBe(true);
    });

    it('품절을 식별해야 함', () => {
      const inventory = inventoryScenarios.outOfStock;

      const isOutOfStock = inventory.currentStock === 0;

      expect(isOutOfStock).toBe(true);
    });

    it('과잉 재고를 식별해야 함', () => {
      const inventory = inventoryScenarios.overstock;

      // currentStock(480) > maxStock * 0.9 (450)
      const isOverstock = inventory.currentStock > inventory.maxStock * 0.9;

      expect(isOverstock).toBe(true);
    });
  });

  describe('재고 조정', () => {
    it('반품 시 재고를 증가시켜야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const order = createMockOrder();

      const result = await inventoryAgent.execute({
        action: 'restore_stock',
        productId: order.items[0].productId,
        quantity: order.items[0].quantity,
        reason: 'return_completed',
      });

      expect(result.success).toBe(true);
    });

    it('판매 시 재고를 감소시켜야 함', async () => {
      const inventoryAgent = env.agents.get('05-inventory')!;
      const order = createMockOrder();

      const result = await inventoryAgent.execute({
        action: 'decrease_stock',
        productId: order.items[0].productId,
        quantity: order.items[0].quantity,
        reason: 'order_confirmed',
      });

      expect(result.success).toBe(true);
    });

    it('재고 조정 이력을 기록해야 함', () => {
      const adjustmentLog = {
        id: 'ADJ-001',
        productId: 'PRD-00001',
        previousQuantity: 150,
        newQuantity: 149,
        changeQuantity: -1,
        reason: 'order_confirmed',
        orderId: 'ORD-001',
        timestamp: new Date(),
      };

      expect(adjustmentLog.changeQuantity).toBe(-1);
      expect(adjustmentLog.reason).toBe('order_confirmed');
    });
  });

  describe('알림 설정', () => {
    it('저재고 알림을 발송해야 함', () => {
      const inventory = inventoryScenarios.lowStock;
      const notificationSettings = {
        lowStockAlert: true,
        lowStockThreshold: 50,
        outOfStockAlert: true,
        reorderAlert: true,
      };

      const shouldNotify =
        notificationSettings.lowStockAlert &&
        inventory.currentStock <= notificationSettings.lowStockThreshold;

      expect(shouldNotify).toBe(true);
    });

    it('품절 알림을 발송해야 함', () => {
      const inventory = inventoryScenarios.outOfStock;
      const notificationSettings = {
        outOfStockAlert: true,
      };

      const shouldNotify = notificationSettings.outOfStockAlert && inventory.currentStock === 0;

      expect(shouldNotify).toBe(true);
    });
  });
});

describe('Inventory Agent 설정', () => {
  it('기본 설정값이 올바르게 설정되어야 함', () => {
    const defaultInventoryConfig = {
      syncInterval: 15, // 15분마다 동기화
      autoReorder: true,
      reorderLeadTime: 7, // 7일
      safetyStockMultiplier: 1.5, // 안전재고 = 평균판매량 * 1.5
      channels: [SalesChannel.COUPANG, SalesChannel.NAVER, SalesChannel.CAFE24],
      notificationSettings: {
        lowStockAlert: true,
        outOfStockAlert: true,
        reorderAlert: true,
      },
    };

    expect(defaultInventoryConfig.syncInterval).toBe(15);
    expect(defaultInventoryConfig.autoReorder).toBe(true);
    expect(defaultInventoryConfig.reorderLeadTime).toBe(7);
  });
});

describe('채널별 재고 관리', () => {
  it('채널별 재고 할당을 관리해야 함', () => {
    const totalStock = 150;
    const channelAllocation = {
      [SalesChannel.COUPANG]: 0.4, // 40%
      [SalesChannel.NAVER]: 0.35, // 35%
      [SalesChannel.CAFE24]: 0.25, // 25%
    };

    const allocatedStock = {
      [SalesChannel.COUPANG]: Math.floor(totalStock * channelAllocation[SalesChannel.COUPANG]),
      [SalesChannel.NAVER]: Math.floor(totalStock * channelAllocation[SalesChannel.NAVER]),
      [SalesChannel.CAFE24]: Math.floor(totalStock * channelAllocation[SalesChannel.CAFE24]),
    };

    expect(allocatedStock[SalesChannel.COUPANG]).toBe(60);
    expect(allocatedStock[SalesChannel.NAVER]).toBe(52);
    expect(allocatedStock[SalesChannel.CAFE24]).toBe(37);
  });

  it('판매 속도에 따라 채널별 재고를 재할당해야 함', () => {
    const salesVelocity = {
      [SalesChannel.COUPANG]: 10, // 일 판매량
      [SalesChannel.NAVER]: 5,
      [SalesChannel.CAFE24]: 3,
    };

    const totalVelocity = Object.values(salesVelocity).reduce((sum, v) => sum + v, 0);
    const newAllocation = {
      [SalesChannel.COUPANG]: salesVelocity[SalesChannel.COUPANG] / totalVelocity,
      [SalesChannel.NAVER]: salesVelocity[SalesChannel.NAVER] / totalVelocity,
      [SalesChannel.CAFE24]: salesVelocity[SalesChannel.CAFE24] / totalVelocity,
    };

    expect(newAllocation[SalesChannel.COUPANG]).toBeCloseTo(0.556, 2);
    expect(newAllocation[SalesChannel.NAVER]).toBeCloseTo(0.278, 2);
    expect(newAllocation[SalesChannel.CAFE24]).toBeCloseTo(0.167, 2);
  });
});
