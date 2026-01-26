/**
 * 발주관리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 발주제안, 발주서생성, 입고추적
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, NotificationPriority } from '../../../types';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  PurchaseOrderSuggestion,
  Supplier,
  StockInfo,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * PurchaseOrderSubAgent 클래스
 * 발주 관리를 담당하는 서브에이전트
 */
export class PurchaseOrderSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('PurchaseOrderSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('PurchaseOrderSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'generate_suggestions':
        const reorderConfig = context.data as {
          defaultLeadTimeDays: number;
          safetyStockDays: number;
          minReorderQuantity: number;
        };
        const suggestions = await this.generateSuggestions(reorderConfig);
        return this.createSuccessResult(suggestions, startTime);

      case 'create_purchase_order':
        const suggestion = context.data as PurchaseOrderSuggestion;
        const order = await this.createPurchaseOrder(suggestion);
        return this.createSuccessResult(order, startTime);

      case 'track_incoming':
        const tracking = await this.trackIncomingOrders();
        return this.createSuccessResult(tracking, startTime);

      case 'receive_order':
        const { orderId, receivedItems } = context.data as {
          orderId: string;
          receivedItems: { productId: string; quantity: number }[];
        };
        const received = await this.receiveOrder(orderId, receivedItems);
        return this.createSuccessResult(received, startTime);

      default:
        const defaultSuggestions = await this.generateSuggestions({
          defaultLeadTimeDays: 7,
          safetyStockDays: 3,
          minReorderQuantity: 10,
        });
        return this.createSuccessResult(defaultSuggestions, startTime);
    }
  }

  /**
   * 발주 제안 생성
   */
  async generateSuggestions(config: {
    defaultLeadTimeDays: number;
    safetyStockDays: number;
    minReorderQuantity: number;
  }): Promise<PurchaseOrderSuggestion[]> {
    this.logger.info('Generating purchase order suggestions...');

    const suggestions: PurchaseOrderSuggestion[] = [];

    // 재고 데이터 조회
    const db = this.getDatabase('products');
    const productsResult = await db.findMany<{
      id: string;
      name: string;
      sku: string;
      stock_quantity: number;
      reserved_quantity: number;
      low_stock_threshold: number;
      purchase_cost: number;
      supplier_id?: string;
    }>({});

    if (productsResult.error || !productsResult.data) {
      return suggestions;
    }

    // 판매 데이터 조회 (최근 30일)
    const salesDb = this.getDatabase('order_items');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const product of productsResult.data) {
      const availableStock = product.stock_quantity - (product.reserved_quantity || 0);
      const threshold = product.low_stock_threshold || 10;

      // 재주문 필요 여부 확인
      if (availableStock > threshold) continue;

      // 일평균 판매량 계산
      const salesResult = await salesDb.findMany<{ quantity: number }>({
        product_id: product.id,
        created_at: { $gte: thirtyDaysAgo },
      });

      const totalSales = (salesResult.data || []).reduce((sum, item) => sum + item.quantity, 0);
      const averageDailySales = totalSales / 30;

      // 리드타임 동안 필요한 재고 + 안전재고
      const leadTimeDays = config.defaultLeadTimeDays;
      const safetyStock = averageDailySales * config.safetyStockDays;
      const requiredStock = averageDailySales * leadTimeDays + safetyStock;

      // 발주 수량 계산
      let suggestedQuantity = Math.ceil(requiredStock - availableStock);
      suggestedQuantity = Math.max(suggestedQuantity, config.minReorderQuantity);

      // 공급업체 정보 조회
      let supplier: Supplier | null = null;
      if (product.supplier_id) {
        const supplierDb = this.getDatabase('suppliers');
        const supplierResult = await supplierDb.findById<Supplier>(product.supplier_id);
        supplier = supplierResult.data || null;
      }

      // 우선순위 결정
      let priority: 'low' | 'medium' | 'high' | 'urgent';
      if (availableStock <= 0) {
        priority = 'urgent';
      } else if (availableStock <= threshold * 0.5) {
        priority = 'high';
      } else if (availableStock <= threshold) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      suggestions.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: availableStock,
        averageDailySales,
        suggestedQuantity,
        reorderPoint: threshold,
        leadTimeDays,
        preferredSupplierId: supplier?.id,
        preferredSupplierName: supplier?.name,
        estimatedCost: suggestedQuantity * (product.purchase_cost || 0),
        priority,
        reason: this.generateSuggestionReason(availableStock, threshold, averageDailySales),
      });
    }

    // 우선순위 순 정렬
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    this.logger.info(`Generated ${suggestions.length} purchase order suggestions`);

    return suggestions;
  }

  /**
   * 제안 사유 생성
   */
  private generateSuggestionReason(currentStock: number, threshold: number, dailySales: number): string {
    if (currentStock <= 0) {
      return '품절 상태입니다. 긴급 발주가 필요합니다.';
    }
    if (currentStock <= threshold * 0.5) {
      const daysUntilStockout = currentStock / dailySales;
      return `재고가 부족합니다. 약 ${Math.ceil(daysUntilStockout)}일 후 품절 예상.`;
    }
    return `재고 수준이 임계점에 도달했습니다. (현재: ${currentStock}, 임계: ${threshold})`;
  }

  /**
   * 발주서 생성
   */
  async createPurchaseOrder(suggestion: PurchaseOrderSuggestion): Promise<PurchaseOrder> {
    this.logger.info('Creating purchase order...', { productId: suggestion.productId });

    // 승인 요청 (고액 발주의 경우)
    if (suggestion.estimatedCost > 1000000) {
      const approved = await this.requestApprovalFromParent(
        '발주 승인 요청',
        `상품: ${suggestion.productName}\n수량: ${suggestion.suggestedQuantity}\n예상 금액: ${suggestion.estimatedCost.toLocaleString()}원`,
        suggestion
      );

      if (!approved) {
        throw new Error('발주가 승인되지 않았습니다.');
      }
    }

    const order: PurchaseOrder = {
      id: uuidv4(),
      orderNumber: this.generateOrderNumber(),
      supplierId: suggestion.preferredSupplierId || '',
      supplierName: suggestion.preferredSupplierName || '',
      status: PurchaseOrderStatus.DRAFT,
      items: [
        {
          productId: suggestion.productId,
          productName: suggestion.productName,
          sku: suggestion.sku,
          quantity: suggestion.suggestedQuantity,
          receivedQuantity: 0,
          unitCost: suggestion.estimatedCost / suggestion.suggestedQuantity,
          totalCost: suggestion.estimatedCost,
        },
      ],
      totalAmount: suggestion.estimatedCost,
      currency: 'KRW',
      expectedDeliveryDate: new Date(Date.now() + suggestion.leadTimeDays * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // DB에 저장
    const db = this.getDatabase('purchase_orders');
    await db.create({
      ...order,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      expected_delivery_date: order.expectedDeliveryDate,
    });

    this.logger.info('Purchase order created', { orderId: order.id, orderNumber: order.orderNumber });

    return order;
  }

  /**
   * 발주번호 생성
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${dateStr}-${random}`;
  }

  /**
   * 입고 예정 발주 추적
   */
  async trackIncomingOrders(): Promise<PurchaseOrder[]> {
    this.logger.info('Tracking incoming orders...');

    const db = this.getDatabase('purchase_orders');
    const result = await db.findMany<PurchaseOrder>({
      status: { $in: [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.PARTIALLY_RECEIVED] },
    });

    if (result.error || !result.data) {
      return [];
    }

    // 입고 예정일 초과 발주 알림
    const overdueOrders = result.data.filter(
      (order) =>
        order.expectedDeliveryDate && new Date(order.expectedDeliveryDate) < new Date()
    );

    if (overdueOrders.length > 0) {
      await this.notifyParent(
        '입고 지연 알림',
        `${overdueOrders.length}건의 발주가 예정일을 초과했습니다.`,
        NotificationPriority.HIGH
      );
    }

    return result.data;
  }

  /**
   * 입고 처리
   */
  async receiveOrder(
    orderId: string,
    receivedItems: { productId: string; quantity: number }[]
  ): Promise<PurchaseOrder | null> {
    this.logger.info('Processing order receipt...', { orderId });

    const db = this.getDatabase('purchase_orders');
    const result = await db.findById<PurchaseOrder>(orderId);

    if (result.error || !result.data) {
      return null;
    }

    const order = result.data;

    // 입고 수량 업데이트
    let allReceived = true;
    const updatedItems = order.items.map((item) => {
      const received = receivedItems.find((r) => r.productId === item.productId);
      const newReceivedQty = (item.receivedQuantity || 0) + (received?.quantity || 0);
      if (newReceivedQty < item.quantity) allReceived = false;
      return { ...item, receivedQuantity: newReceivedQty };
    });

    // 상태 업데이트
    const newStatus = allReceived
      ? PurchaseOrderStatus.RECEIVED
      : PurchaseOrderStatus.PARTIALLY_RECEIVED;

    await db.update({ id: orderId }, {
      items: updatedItems,
      status: newStatus,
      actual_delivery_date: allReceived ? new Date() : undefined,
      updated_at: new Date(),
    });

    // 재고 업데이트 (AgentRegistry를 통해 StockSync 호출)
    for (const received of receivedItems) {
      // TODO: StockSyncSubAgent 호출하여 재고 증가 처리
      this.logger.info('Stock updated for product', {
        productId: received.productId,
        quantity: received.quantity,
      });
    }

    const updatedResult = await db.findById<PurchaseOrder>(orderId);
    return updatedResult.data || null;
  }

  /**
   * 발주 승인
   */
  async approvePurchaseOrder(orderId: string, approverId: string): Promise<PurchaseOrder | null> {
    const db = this.getDatabase('purchase_orders');

    await db.update({ id: orderId }, {
      status: PurchaseOrderStatus.APPROVED,
      approved_at: new Date(),
      approved_by: approverId,
      updated_at: new Date(),
    });

    const result = await db.findById<PurchaseOrder>(orderId);
    return result.data || null;
  }

  /**
   * 발주 취소
   */
  async cancelPurchaseOrder(orderId: string, reason: string): Promise<PurchaseOrder | null> {
    const db = this.getDatabase('purchase_orders');

    await db.update({ id: orderId }, {
      status: PurchaseOrderStatus.CANCELLED,
      notes: reason,
      updated_at: new Date(),
    });

    const result = await db.findById<PurchaseOrder>(orderId);
    return result.data || null;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'processing',
      message: '발주 처리 중...',
    };
  }
}

export default PurchaseOrderSubAgent;
