/**
 * 배송최적화 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 배송비분석, 업체비교
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  CourierCompany,
  CourierService,
  CourierPerformance,
  CourierPricing,
  ShippingCostAnalysis,
  CourierRecommendation,
} from '../types';

/**
 * ShippingOptimizerSubAgent 클래스
 * 배송 최적화를 담당하는 서브에이전트
 */
export class ShippingOptimizerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('ShippingOptimizerSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('ShippingOptimizerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'analyze_costs':
        const analysis = await this.analyzeShippingCosts();
        return this.createSuccessResult(analysis, startTime);

      case 'recommend_courier':
        const { orderId } = context.data as { orderId: string };
        const recommendation = await this.recommendCourier(orderId);
        return this.createSuccessResult(recommendation, startTime);

      case 'compare_couriers':
        const comparison = await this.compareCouriers();
        return this.createSuccessResult(comparison, startTime);

      case 'calculate_shipping_cost':
        const calcData = context.data as {
          courierId: string;
          weight: number;
          region: string;
          service: CourierService;
        };
        const cost = await this.calculateShippingCost(calcData);
        return this.createSuccessResult(cost, startTime);

      default:
        const defaultAnalysis = await this.analyzeShippingCosts();
        return this.createSuccessResult(defaultAnalysis, startTime);
    }
  }

  /**
   * 배송 비용 분석
   */
  async analyzeShippingCosts(): Promise<ShippingCostAnalysis> {
    this.logger.info('Analyzing shipping costs...');

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 배송 데이터 조회
    const db = this.getDatabase('shipments');
    const shipmentsResult = await db.findMany<{
      id: string;
      courier_id: string;
      courier_name: string;
      shipping_cost: number;
      service_type: CourierService;
      region: string;
      created_at: Date;
    }>({
      created_at: { $gte: monthAgo },
    });

    const shipments = shipmentsResult.data || [];

    if (shipments.length === 0) {
      return this.createEmptyAnalysis();
    }

    // 총계 계산
    const totalShipments = shipments.length;
    const totalCost = shipments.reduce((sum, s) => sum + (s.shipping_cost || 0), 0);
    const averageCostPerShipment = totalCost / totalShipments;

    // 택배사별 분석
    const byCourier = this.groupAndAnalyze(shipments, 'courier_id', 'courier_name');

    // 지역별 분석
    const byRegion = this.groupAndAnalyzeByRegion(shipments);

    // 서비스별 분석
    const byService = this.groupAndAnalyzeByService(shipments);

    // 절감 기회 식별
    const savingsOpportunities = await this.identifySavingsOpportunities(shipments, byCourier);

    return {
      totalShipments,
      totalCost,
      averageCostPerShipment,
      byCourier,
      byRegion,
      byService,
      savingsOpportunities,
    };
  }

  /**
   * 택배사별 그룹화 및 분석
   */
  private groupAndAnalyze(
    shipments: { courier_id: string; courier_name: string; shipping_cost: number }[],
    groupKey: string,
    nameKey: string
  ) {
    const groups = new Map<string, { name: string; shipments: number; totalCost: number }>();

    for (const shipment of shipments) {
      const key = (shipment as any)[groupKey];
      const name = (shipment as any)[nameKey];
      const existing = groups.get(key);

      if (existing) {
        existing.shipments++;
        existing.totalCost += shipment.shipping_cost || 0;
      } else {
        groups.set(key, { name, shipments: 1, totalCost: shipment.shipping_cost || 0 });
      }
    }

    return Array.from(groups.entries()).map(([id, data]) => ({
      courierId: id,
      courierName: data.name,
      shipments: data.shipments,
      totalCost: data.totalCost,
      averageCost: data.totalCost / data.shipments,
    }));
  }

  /**
   * 지역별 그룹화 및 분석
   */
  private groupAndAnalyzeByRegion(shipments: { region: string; shipping_cost: number }[]) {
    const groups = new Map<string, { shipments: number; totalCost: number }>();

    for (const shipment of shipments) {
      const region = shipment.region || '기타';
      const existing = groups.get(region);

      if (existing) {
        existing.shipments++;
        existing.totalCost += shipment.shipping_cost || 0;
      } else {
        groups.set(region, { shipments: 1, totalCost: shipment.shipping_cost || 0 });
      }
    }

    return Array.from(groups.entries()).map(([region, data]) => ({
      region,
      shipments: data.shipments,
      totalCost: data.totalCost,
      averageCost: data.totalCost / data.shipments,
    }));
  }

  /**
   * 서비스별 그룹화 및 분석
   */
  private groupAndAnalyzeByService(shipments: { service_type: CourierService; shipping_cost: number }[]) {
    const groups = new Map<CourierService, { shipments: number; totalCost: number }>();

    for (const shipment of shipments) {
      const service = shipment.service_type || CourierService.STANDARD;
      const existing = groups.get(service);

      if (existing) {
        existing.shipments++;
        existing.totalCost += shipment.shipping_cost || 0;
      } else {
        groups.set(service, { shipments: 1, totalCost: shipment.shipping_cost || 0 });
      }
    }

    return Array.from(groups.entries()).map(([service, data]) => ({
      service,
      shipments: data.shipments,
      totalCost: data.totalCost,
      averageCost: data.totalCost / data.shipments,
    }));
  }

  /**
   * 절감 기회 식별
   */
  private async identifySavingsOpportunities(
    shipments: any[],
    byCourier: { courierId: string; courierName: string; averageCost: number }[]
  ) {
    const opportunities: {
      description: string;
      estimatedSavings: number;
      implementation: string;
    }[] = [];

    // 최저 비용 택배사 찾기
    if (byCourier.length > 1) {
      const sortedByAvgCost = [...byCourier].sort((a, b) => a.averageCost - b.averageCost);
      const cheapest = sortedByAvgCost[0];
      const mostExpensive = sortedByAvgCost[sortedByAvgCost.length - 1];

      if (mostExpensive.averageCost > cheapest.averageCost * 1.2) {
        const potentialSavings = (mostExpensive.averageCost - cheapest.averageCost) * shipments.length * 0.3;
        opportunities.push({
          description: `${mostExpensive.courierName}에서 ${cheapest.courierName}로 일부 물량 이관`,
          estimatedSavings: Math.round(potentialSavings),
          implementation: '지역별 택배사 재배정 검토',
        });
      }
    }

    // 물량 할인 협상 기회
    const monthlyVolume = shipments.length;
    if (monthlyVolume > 1000) {
      opportunities.push({
        description: '월 물량 기반 택배사 할인 협상',
        estimatedSavings: Math.round(shipments.reduce((s, sh) => s + sh.shipping_cost, 0) * 0.05),
        implementation: '주요 택배사와 물량 할인 계약 재협상',
      });
    }

    return opportunities;
  }

  /**
   * 빈 분석 결과 생성
   */
  private createEmptyAnalysis(): ShippingCostAnalysis {
    return {
      totalShipments: 0,
      totalCost: 0,
      averageCostPerShipment: 0,
      byCourier: [],
      byRegion: [],
      byService: [],
      savingsOpportunities: [],
    };
  }

  /**
   * 택배사 추천
   */
  async recommendCourier(orderId: string): Promise<CourierRecommendation> {
    this.logger.info('Recommending courier for order', { orderId });

    // 주문 정보 조회
    const ordersDb = this.getDatabase('orders');
    const orderResult = await ordersDb.findById<{
      id: string;
      shipping_region: string;
      total_weight: number;
      delivery_type: string;
    }>(orderId);

    if (orderResult.error || !orderResult.data) {
      return {
        orderId,
        recommendations: [],
      };
    }

    const order = orderResult.data;

    // 택배사 목록 조회
    const couriersDb = this.getDatabase('couriers');
    const couriersResult = await couriersDb.findMany<CourierCompany>({ is_active: true });
    const couriers = couriersResult.data || [];

    // 각 택배사 점수 계산
    const recommendations = [];

    for (const courier of couriers) {
      const score = await this.calculateCourierScore(courier, order);
      const estimatedCost = this.estimateShippingCost(courier, order.total_weight, order.shipping_region);

      recommendations.push({
        courierId: courier.id,
        courierName: courier.name,
        service: CourierService.STANDARD,
        estimatedCost,
        estimatedDeliveryDays: courier.performance?.averageDeliveryDays || 2,
        score,
        reasons: this.generateRecommendationReasons(courier, score),
      });
    }

    // 점수순 정렬
    recommendations.sort((a, b) => b.score - a.score);

    return {
      orderId,
      recommendations: recommendations.slice(0, 3), // 상위 3개만
      selectedCourier: recommendations[0]?.courierId,
    };
  }

  /**
   * 택배사 점수 계산
   */
  private async calculateCourierScore(
    courier: CourierCompany,
    order: { shipping_region: string; total_weight: number }
  ): Promise<number> {
    let score = 50; // 기본 점수

    // 지역 커버리지
    if (courier.coverageRegions.includes(order.shipping_region)) {
      score += 20;
    }

    // 성과 지표
    if (courier.performance) {
      const onTimeRate = courier.performance.deliveredOnTime / courier.performance.totalShipments;
      score += onTimeRate * 30;
    }

    // 가격 경쟁력 (낮을수록 좋음)
    if (courier.pricing) {
      const basePriceScore = Math.max(0, 20 - (courier.pricing.basePrice / 300));
      score += basePriceScore;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 배송 비용 추정
   */
  private estimateShippingCost(courier: CourierCompany, weight: number, region: string): number {
    if (!courier.pricing) return 3000; // 기본값

    let cost = courier.pricing.basePrice;

    // 무게별 추가 비용
    if (weight > 20) cost += courier.pricing.weightLimits.over20kg;
    else if (weight > 10) cost += courier.pricing.weightLimits.upTo20kg;
    else if (weight > 5) cost += courier.pricing.weightLimits.upTo10kg;
    else if (weight > 2) cost += courier.pricing.weightLimits.upTo5kg;
    else cost += courier.pricing.weightLimits.upTo2kg;

    // 지역 할증
    if (region === '제주') cost += courier.pricing.regionSurcharge.jeju;
    else if (['울릉', '도서'].some((r) => region.includes(r))) {
      cost += courier.pricing.regionSurcharge.island;
    }

    return cost;
  }

  /**
   * 추천 사유 생성
   */
  private generateRecommendationReasons(courier: CourierCompany, score: number): string[] {
    const reasons: string[] = [];

    if (score >= 80) reasons.push('종합 점수 우수');
    if (courier.performance?.averageDeliveryDays && courier.performance.averageDeliveryDays <= 2) {
      reasons.push('빠른 배송 속도');
    }
    if (courier.pricing?.basePrice && courier.pricing.basePrice <= 2500) {
      reasons.push('경쟁력 있는 가격');
    }

    return reasons.length > 0 ? reasons : ['기본 추천'];
  }

  /**
   * 택배사 비교
   */
  async compareCouriers(): Promise<CourierPerformance[]> {
    const db = this.getDatabase('couriers');
    const couriersResult = await db.findMany<CourierCompany>({ is_active: true });

    if (couriersResult.error || !couriersResult.data) {
      return [];
    }

    const performances: CourierPerformance[] = [];
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const courier of couriersResult.data) {
      if (courier.performance) {
        performances.push({
          ...courier.performance,
          courierId: courier.id,
          period: { start: monthAgo, end: now },
        });
      }
    }

    // 정시 배송율 순 정렬
    performances.sort((a, b) => {
      const rateA = a.deliveredOnTime / a.totalShipments;
      const rateB = b.deliveredOnTime / b.totalShipments;
      return rateB - rateA;
    });

    return performances;
  }

  /**
   * 배송 비용 계산
   */
  async calculateShippingCost(data: {
    courierId: string;
    weight: number;
    region: string;
    service: CourierService;
  }): Promise<{ cost: number; breakdown: Record<string, number> }> {
    const db = this.getDatabase('couriers');
    const courierResult = await db.findById<CourierCompany>(data.courierId);

    if (courierResult.error || !courierResult.data) {
      return { cost: 0, breakdown: {} };
    }

    const courier = courierResult.data;
    const baseCost = this.estimateShippingCost(courier, data.weight, data.region);

    // 서비스 추가 비용
    let serviceSurcharge = 0;
    if (data.service === CourierService.EXPRESS) serviceSurcharge = 2000;
    else if (data.service === CourierService.SAME_DAY) serviceSurcharge = 5000;
    else if (data.service === CourierService.DAWN) serviceSurcharge = 3000;

    return {
      cost: baseCost + serviceSurcharge,
      breakdown: {
        base: courier.pricing?.basePrice || 0,
        weight: baseCost - (courier.pricing?.basePrice || 0),
        service: serviceSurcharge,
      },
    };
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'optimizing',
      message: '배송 최적화 분석 중...',
    };
  }
}

export default ShippingOptimizerSubAgent;
