/**
 * 원가분석 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 원가계산, 마진분석, 가격제안
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, SalesChannel } from '../../../types';
import {
  ProductCost,
  MarginAnalysis,
  ChannelFeeBreakdown,
  PriceSuggestion,
  CompetitorPrice,
} from '../types';

/**
 * 채널별 수수료율
 */
const CHANNEL_FEES: Record<SalesChannel, { commission: number; fulfillment: number }> = {
  [SalesChannel.COUPANG]: { commission: 10.8, fulfillment: 0 },
  [SalesChannel.NAVER]: { commission: 5.5, fulfillment: 0 },
  [SalesChannel.CAFE24]: { commission: 3.3, fulfillment: 0 },
  [SalesChannel.GMARKET]: { commission: 12, fulfillment: 0 },
  [SalesChannel.ELEVEN_ST]: { commission: 12, fulfillment: 0 },
  [SalesChannel.AUCTION]: { commission: 12, fulfillment: 0 },
  [SalesChannel.INTERPARK]: { commission: 11, fulfillment: 0 },
  [SalesChannel.TMON]: { commission: 11, fulfillment: 0 },
  [SalesChannel.WEMAKEPRICE]: { commission: 10, fulfillment: 0 },
  [SalesChannel.SSG]: { commission: 13, fulfillment: 0 },
  [SalesChannel.LOTTE_ON]: { commission: 12, fulfillment: 0 },
  [SalesChannel.MANUAL]: { commission: 0, fulfillment: 0 },
};

/**
 * CostAnalyzerSubAgent 클래스
 * 원가 분석을 담당하는 서브에이전트
 */
export class CostAnalyzerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('CostAnalyzerSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('CostAnalyzerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'analyze_margins':
        const marginConfig = context.data as {
          targetGrossMarginPercent: number;
          minNetMarginPercent: number;
        };
        const margins = await this.analyzeAllMargins(marginConfig);
        return this.createSuccessResult(margins, startTime);

      case 'get_product_cost':
        const { productId } = context.data as { productId: string };
        const cost = await this.getProductCost(productId);
        return this.createSuccessResult(cost, startTime);

      case 'calculate_channel_margins':
        const { calcProductId, channels } = context.data as {
          calcProductId: string;
          channels: SalesChannel[];
        };
        const channelMargins = await this.calculateChannelMargins(calcProductId, channels);
        return this.createSuccessResult(channelMargins, startTime);

      case 'suggest_prices':
        const priceConfig = context.data as {
          targetMarginPercent: number;
          productIds?: string[];
        };
        const suggestions = await this.suggestPrices(priceConfig);
        return this.createSuccessResult(suggestions, startTime);

      default:
        const defaultMargins = await this.analyzeAllMargins({
          targetGrossMarginPercent: 40,
          minNetMarginPercent: 15,
        });
        return this.createSuccessResult(defaultMargins, startTime);
    }
  }

  /**
   * 모든 상품 마진 분석
   */
  async analyzeAllMargins(config: {
    targetGrossMarginPercent: number;
    minNetMarginPercent: number;
  }): Promise<MarginAnalysis[]> {
    this.logger.info('Analyzing margins for all products...');

    const db = this.getDatabase('products');
    const productsResult = await db.findMany<{
      id: string;
      name: string;
      selling_price: number;
      purchase_cost: number;
      shipping_cost: number;
      packaging_cost: number;
    }>({});

    if (productsResult.error || !productsResult.data) {
      return [];
    }

    const analyses: MarginAnalysis[] = [];

    for (const product of productsResult.data) {
      const analysis = await this.analyzeProductMargin(
        product.id,
        product.name,
        product.selling_price,
        {
          purchaseCost: product.purchase_cost || 0,
          shippingCost: product.shipping_cost || 0,
          packagingCost: product.packaging_cost || 0,
          laborCost: 0,
          overheadCost: 0,
        }
      );

      // 마진 경고 체크
      if (analysis.netMarginPercent < config.minNetMarginPercent) {
        this.logger.warn('Low margin product detected', {
          productId: product.id,
          netMarginPercent: analysis.netMarginPercent,
        });
      }

      analyses.push(analysis);
    }

    // 마진율 낮은 순 정렬
    analyses.sort((a, b) => a.netMarginPercent - b.netMarginPercent);

    return analyses;
  }

  /**
   * 상품 원가 조회
   */
  async getProductCost(productId: string): Promise<ProductCost | null> {
    const db = this.getDatabase('products');
    const result = await db.findById<{
      id: string;
      name: string;
      sku: string;
      purchase_cost: number;
      shipping_cost: number;
      packaging_cost: number;
      labor_cost: number;
      overhead_cost: number;
    }>(productId);

    if (result.error || !result.data) {
      return null;
    }

    const product = result.data;
    const totalCost =
      (product.purchase_cost || 0) +
      (product.shipping_cost || 0) +
      (product.packaging_cost || 0) +
      (product.labor_cost || 0) +
      (product.overhead_cost || 0);

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      purchaseCost: product.purchase_cost || 0,
      shippingCost: product.shipping_cost || 0,
      packagingCost: product.packaging_cost || 0,
      laborCost: product.labor_cost || 0,
      overheadCost: product.overhead_cost || 0,
      totalCost,
      costUpdatedAt: new Date(),
    };
  }

  /**
   * 상품 마진 분석
   */
  private async analyzeProductMargin(
    productId: string,
    productName: string,
    sellingPrice: number,
    costs: {
      purchaseCost: number;
      shippingCost: number;
      packagingCost: number;
      laborCost: number;
      overheadCost: number;
    }
  ): Promise<MarginAnalysis> {
    const totalCost =
      costs.purchaseCost +
      costs.shippingCost +
      costs.packagingCost +
      costs.laborCost +
      costs.overheadCost;

    const grossMargin = sellingPrice - totalCost;
    const grossMarginPercent = sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : 0;

    // 주요 채널 수수료 계산 (네이버 기준)
    const channelFees = this.calculateChannelFees(sellingPrice, SalesChannel.NAVER);

    const netMargin = grossMargin - channelFees.totalFees;
    const netMarginPercent = sellingPrice > 0 ? (netMargin / sellingPrice) * 100 : 0;

    // 최근 30일 판매량 조회
    const salesVolume = await this.getSalesVolume(productId, 30);
    const totalProfit = netMargin * salesVolume;

    return {
      productId,
      productName,
      sellingPrice,
      totalCost,
      grossMargin,
      grossMarginPercent,
      channelFees,
      netMargin,
      netMarginPercent,
      salesVolume30Days: salesVolume,
      totalProfit30Days: totalProfit,
    };
  }

  /**
   * 채널별 수수료 계산
   */
  private calculateChannelFees(sellingPrice: number, channel: SalesChannel): ChannelFeeBreakdown {
    const fees = CHANNEL_FEES[channel] || CHANNEL_FEES[SalesChannel.MANUAL];

    const commissionAmount = sellingPrice * (fees.commission / 100);
    const fulfillmentFee = fees.fulfillment;
    const totalFees = commissionAmount + fulfillmentFee;

    return {
      channel,
      commissionPercent: fees.commission,
      commissionAmount,
      fulfillmentFee,
      totalFees,
    };
  }

  /**
   * 판매량 조회
   */
  private async getSalesVolume(productId: string, days: number): Promise<number> {
    const db = this.getDatabase('order_items');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.findMany<{ quantity: number }>({
      product_id: productId,
      created_at: { $gte: startDate },
    });

    if (result.error || !result.data) {
      return 0;
    }

    return result.data.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * 채널별 마진 계산
   */
  async calculateChannelMargins(
    productId: string,
    channels: SalesChannel[]
  ): Promise<ChannelFeeBreakdown[]> {
    const db = this.getDatabase('products');
    const result = await db.findById<{ selling_price: number }>(productId);

    if (result.error || !result.data) {
      return [];
    }

    const sellingPrice = result.data.selling_price;

    return channels.map((channel) => this.calculateChannelFees(sellingPrice, channel));
  }

  /**
   * 가격 제안
   */
  async suggestPrices(config: {
    targetMarginPercent: number;
    productIds?: string[];
  }): Promise<PriceSuggestion[]> {
    this.logger.info('Generating price suggestions...');

    const db = this.getDatabase('products');

    let productsResult;
    if (config.productIds && config.productIds.length > 0) {
      productsResult = await db.findMany<{
        id: string;
        name: string;
        selling_price: number;
        purchase_cost: number;
        min_price?: number;
        max_price?: number;
      }>({
        id: { $in: config.productIds },
      });
    } else {
      productsResult = await db.findMany<{
        id: string;
        name: string;
        selling_price: number;
        purchase_cost: number;
        min_price?: number;
        max_price?: number;
      }>({});
    }

    if (productsResult.error || !productsResult.data) {
      return [];
    }

    const suggestions: PriceSuggestion[] = [];

    for (const product of productsResult.data) {
      const currentMargin = await this.analyzeProductMargin(
        product.id,
        product.name,
        product.selling_price,
        { purchaseCost: product.purchase_cost || 0, shippingCost: 0, packagingCost: 0, laborCost: 0, overheadCost: 0 }
      );

      // 목표 마진에 맞는 가격 계산
      const targetMargin = config.targetMarginPercent / 100;
      const channelCommission = 0.055; // 네이버 기준
      const totalCost = product.purchase_cost || 0;

      // 목표가격 = 원가 / (1 - 목표마진율 - 채널수수료율)
      const suggestedPrice = totalCost / (1 - targetMargin - channelCommission);
      const expectedMargin = ((suggestedPrice - totalCost - suggestedPrice * channelCommission) / suggestedPrice) * 100;

      // 가격 범위 확인
      const minPrice = product.min_price || totalCost * 1.1;
      const maxPrice = product.max_price || product.selling_price * 1.5;

      const finalSuggestedPrice = Math.max(minPrice, Math.min(maxPrice, Math.round(suggestedPrice / 100) * 100));

      suggestions.push({
        productId: product.id,
        productName: product.name,
        currentPrice: product.selling_price,
        suggestedPrice: finalSuggestedPrice,
        minPrice,
        maxPrice,
        targetMarginPercent: config.targetMarginPercent,
        expectedMarginPercent: expectedMargin,
        reason: this.generatePriceReason(currentMargin.netMarginPercent, config.targetMarginPercent),
        confidence: this.calculateConfidence(currentMargin.netMarginPercent, config.targetMarginPercent),
      });
    }

    return suggestions;
  }

  /**
   * 가격 제안 사유 생성
   */
  private generatePriceReason(currentMargin: number, targetMargin: number): string {
    const diff = targetMargin - currentMargin;

    if (diff > 10) {
      return `현재 마진(${currentMargin.toFixed(1)}%)이 목표(${targetMargin}%)보다 많이 낮습니다. 가격 인상을 권장합니다.`;
    } else if (diff > 5) {
      return `마진 개선을 위해 소폭 가격 조정을 권장합니다.`;
    } else if (diff < -10) {
      return `현재 마진이 충분합니다. 경쟁력 강화를 위해 가격 인하를 고려해볼 수 있습니다.`;
    }

    return `현재 가격이 적정 수준입니다.`;
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(currentMargin: number, targetMargin: number): number {
    const diff = Math.abs(targetMargin - currentMargin);
    if (diff > 20) return 0.5;
    if (diff > 10) return 0.7;
    return 0.9;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'analyzing',
      message: '원가 분석 중...',
    };
  }
}

export default CostAnalyzerSubAgent;
