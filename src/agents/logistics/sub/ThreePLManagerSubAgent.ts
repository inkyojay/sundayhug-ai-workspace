/**
 * 3PL관리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 풀필먼트 성과추적
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, NotificationPriority } from '../../../types';
import {
  FulfillmentCenter,
  FulfillmentPerformance,
  FulfillmentService,
  FulfillmentIssue,
} from '../types';

/**
 * ThreePLManagerSubAgent 클래스
 * 3PL/풀필먼트 센터 관리를 담당하는 서브에이전트
 */
export class ThreePLManagerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('ThreePLManagerSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('ThreePLManagerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'track_performance':
        const performance = await this.trackAllCentersPerformance();
        return this.createSuccessResult(performance, startTime);

      case 'compare_centers':
        const comparison = await this.compareCenters();
        return this.createSuccessResult(comparison, startTime);

      case 'get_center_details':
        const { centerId } = context.data as { centerId: string };
        const details = await this.getCenterDetails(centerId);
        return this.createSuccessResult(details, startTime);

      case 'report_issue':
        const issueData = context.data as Partial<FulfillmentIssue>;
        const issue = await this.reportIssue(issueData);
        return this.createSuccessResult(issue, startTime);

      default:
        const defaultPerformance = await this.trackAllCentersPerformance();
        return this.createSuccessResult(defaultPerformance, startTime);
    }
  }

  /**
   * 모든 센터 성과 추적
   */
  async trackAllCentersPerformance(): Promise<FulfillmentPerformance[]> {
    this.logger.info('Tracking all fulfillment centers performance...');

    const db = this.getDatabase('fulfillment_centers');
    const centersResult = await db.findMany<FulfillmentCenter>({ is_active: true });

    if (centersResult.error || !centersResult.data) {
      return [];
    }

    const performances: FulfillmentPerformance[] = [];

    for (const center of centersResult.data) {
      const performance = await this.calculateCenterPerformance(center);
      performances.push(performance);

      // SLA 미달 시 알림
      if (performance.sla.actualOnTimeDelivery < performance.sla.onTimeDeliveryTarget * 0.95) {
        await this.notifyParent(
          '풀필먼트 센터 성과 경고',
          `${center.name}의 정시 배송율이 목표 대비 낮습니다.\n현재: ${performance.sla.actualOnTimeDelivery}%\n목표: ${performance.sla.onTimeDeliveryTarget}%`,
          NotificationPriority.HIGH
        );
      }
    }

    return performances;
  }

  /**
   * 센터 성과 계산
   */
  private async calculateCenterPerformance(center: FulfillmentCenter): Promise<FulfillmentPerformance> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 주문 데이터 조회
    const ordersDb = this.getDatabase('fulfillment_orders');
    const ordersResult = await ordersDb.findMany<{
      id: string;
      center_id: string;
      status: string;
      processing_time: number;
      shipped_at?: Date;
      delivered_at?: Date;
      is_on_time: boolean;
    }>({
      center_id: center.id,
      created_at: { $gte: weekAgo },
    });

    const orders = ordersResult.data || [];

    // 성과 지표 계산
    const totalOrders = orders.length;
    const ordersShipped = orders.filter((o) => o.shipped_at).length;
    const ordersOnTime = orders.filter((o) => o.is_on_time).length;
    const ordersFailed = orders.filter((o) => o.status === 'failed').length;

    const processingTimes = orders.map((o) => o.processing_time || 0).filter((t) => t > 0);
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    const accuracyRate = totalOrders > 0 ? ((totalOrders - ordersFailed) / totalOrders) * 100 : 100;
    const onTimeDeliveryRate = ordersShipped > 0 ? (ordersOnTime / ordersShipped) * 100 : 100;

    // 이슈 조회
    const issuesDb = this.getDatabase('fulfillment_issues');
    const issuesResult = await issuesDb.findMany<FulfillmentIssue>({
      center_id: center.id,
      occurred_at: { $gte: weekAgo },
    });

    const issues = issuesResult.data || [];

    // 반품율 계산
    const returnsDb = this.getDatabase('returns');
    const returnsResult = await returnsDb.findMany<{ id: string }>({
      fulfillment_center_id: center.id,
      created_at: { $gte: weekAgo },
    });
    const returnCount = returnsResult.data?.length || 0;
    const returnRate = ordersShipped > 0 ? (returnCount / ordersShipped) * 100 : 0;

    return {
      centerId: center.id,
      centerName: center.name,
      period: { start: weekAgo, end: now },
      metrics: {
        totalOrders,
        ordersShipped,
        ordersOnTime,
        ordersFailed,
        averageProcessingTime,
        accuracyRate,
        returnRate,
      },
      sla: {
        onTimeDeliveryTarget: 95,
        actualOnTimeDelivery: onTimeDeliveryRate,
        accuracyTarget: 99,
        actualAccuracy: accuracyRate,
      },
      issues,
    };
  }

  /**
   * 센터 비교
   */
  async compareCenters(): Promise<FulfillmentPerformance[]> {
    const performances = await this.trackAllCentersPerformance();

    // 성과순 정렬
    performances.sort((a, b) => {
      const scoreA = a.sla.actualOnTimeDelivery + a.sla.actualAccuracy;
      const scoreB = b.sla.actualOnTimeDelivery + b.sla.actualAccuracy;
      return scoreB - scoreA;
    });

    return performances;
  }

  /**
   * 센터 상세 정보 조회
   */
  async getCenterDetails(centerId: string): Promise<FulfillmentCenter | null> {
    const db = this.getDatabase('fulfillment_centers');
    const result = await db.findById<FulfillmentCenter>(centerId);
    return result.data || null;
  }

  /**
   * 이슈 보고
   */
  async reportIssue(issueData: Partial<FulfillmentIssue>): Promise<FulfillmentIssue> {
    const issue: FulfillmentIssue = {
      id: `issue-${Date.now()}`,
      type: issueData.type || 'other',
      severity: issueData.severity || 'medium',
      orderId: issueData.orderId,
      description: issueData.description || '',
      occurredAt: new Date(),
    };

    const db = this.getDatabase('fulfillment_issues');
    await db.create({
      ...issue,
      occurred_at: issue.occurredAt,
    });

    // 심각한 이슈 알림
    if (issue.severity === 'high' || issue.severity === 'critical') {
      await this.notifyParent(
        `풀필먼트 이슈 [${issue.severity.toUpperCase()}]`,
        `유형: ${issue.type}\n설명: ${issue.description}`,
        issue.severity === 'critical' ? NotificationPriority.URGENT : NotificationPriority.HIGH
      );
    }

    return issue;
  }

  /**
   * 센터 가용성 확인
   */
  async checkCenterAvailability(centerId: string): Promise<{
    available: boolean;
    currentLoad: number;
    estimatedProcessingTime: number;
  }> {
    const center = await this.getCenterDetails(centerId);

    if (!center || !center.isActive) {
      return { available: false, currentLoad: 100, estimatedProcessingTime: 0 };
    }

    return {
      available: center.currentUtilization < 90,
      currentLoad: center.currentUtilization,
      estimatedProcessingTime: center.currentUtilization > 70 ? 60 : 30, // 분 단위
    };
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'tracking',
      message: '풀필먼트 성과 추적 중...',
    };
  }
}

export default ThreePLManagerSubAgent;
