/**
 * 품질관리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 지연/파손 모니터링
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, NotificationPriority } from '../../../types';
import {
  QualityIssue,
  QualityIssueType,
  QualityIssueStatus,
  QualityMonitoringResult,
  QualityKPI,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * QualityControlSubAgent 클래스
 * 배송 품질 관리를 담당하는 서브에이전트
 */
export class QualityControlSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('QualityControlSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('QualityControlSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'monitor_quality':
        const { thresholds } = context.data as {
          thresholds: { delayRate: number; damageRate: number; lostRate: number };
        };
        const monitoring = await this.monitorQuality(thresholds);
        return this.createSuccessResult(monitoring, startTime);

      case 'get_quality_kpi':
        const { period } = context.data as { period?: { start: Date; end: Date } };
        const kpi = await this.getQualityKPI(period);
        return this.createSuccessResult(kpi, startTime);

      case 'report_quality_issue':
        const issueData = context.data as Partial<QualityIssue>;
        const issue = await this.reportQualityIssue(issueData);
        return this.createSuccessResult(issue, startTime);

      case 'resolve_issue':
        const { issueId, resolution } = context.data as {
          issueId: string;
          resolution: { action: string; preventiveMeasure?: string };
        };
        const resolved = await this.resolveIssue(issueId, resolution);
        return this.createSuccessResult(resolved, startTime);

      default:
        const defaultMonitoring = await this.monitorQuality({
          delayRate: 5,
          damageRate: 1,
          lostRate: 0.5,
        });
        return this.createSuccessResult(defaultMonitoring, startTime);
    }
  }

  /**
   * 품질 모니터링
   */
  async monitorQuality(thresholds: {
    delayRate: number;
    damageRate: number;
    lostRate: number;
  }): Promise<QualityMonitoringResult> {
    this.logger.info('Running quality monitoring...');

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 배송 데이터 조회
    const shipmentsDb = this.getDatabase('shipments');
    const shipmentsResult = await shipmentsDb.findMany<{
      id: string;
      status: string;
      is_delayed: boolean;
      is_damaged: boolean;
      is_lost: boolean;
      created_at: Date;
    }>({
      created_at: { $gte: weekAgo },
    });

    const shipments = shipmentsResult.data || [];
    const totalShipments = shipments.length;

    // 이슈 카운트
    const delayedCount = shipments.filter((s) => s.is_delayed).length;
    const damagedCount = shipments.filter((s) => s.is_damaged).length;
    const lostCount = shipments.filter((s) => s.is_lost).length;

    // 이슈 데이터 조회
    const issuesDb = this.getDatabase('quality_issues');
    const issuesResult = await issuesDb.findMany<QualityIssue>({
      detected_at: { $gte: weekAgo },
    });

    const issues = issuesResult.data || [];

    // 유형별 집계
    const byType: Record<QualityIssueType, number> = {
      [QualityIssueType.DELAY]: issues.filter((i) => i.type === QualityIssueType.DELAY).length,
      [QualityIssueType.DAMAGE]: issues.filter((i) => i.type === QualityIssueType.DAMAGE).length,
      [QualityIssueType.LOST]: issues.filter((i) => i.type === QualityIssueType.LOST).length,
      [QualityIssueType.WRONG_ADDRESS]: issues.filter((i) => i.type === QualityIssueType.WRONG_ADDRESS).length,
      [QualityIssueType.WRONG_ITEM]: issues.filter((i) => i.type === QualityIssueType.WRONG_ITEM).length,
      [QualityIssueType.INCOMPLETE]: issues.filter((i) => i.type === QualityIssueType.INCOMPLETE).length,
      [QualityIssueType.CUSTOMER_ABSENCE]: issues.filter((i) => i.type === QualityIssueType.CUSTOMER_ABSENCE).length,
      [QualityIssueType.RETURN_ISSUE]: issues.filter((i) => i.type === QualityIssueType.RETURN_ISSUE).length,
    };

    // 심각도별 집계
    const bySeverity = {
      low: issues.filter((i) => i.severity === 'low').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      high: issues.filter((i) => i.severity === 'high').length,
      critical: issues.filter((i) => i.severity === 'critical').length,
    };

    // 알림 생성
    const alerts: { type: string; message: string; severity: 'warning' | 'critical'; triggeredAt: Date }[] = [];

    const delayRate = totalShipments > 0 ? (delayedCount / totalShipments) * 100 : 0;
    const damageRate = totalShipments > 0 ? (damagedCount / totalShipments) * 100 : 0;
    const lostRate = totalShipments > 0 ? (lostCount / totalShipments) * 100 : 0;

    if (delayRate > thresholds.delayRate) {
      alerts.push({
        type: 'delay',
        message: `배송 지연율이 임계값(${thresholds.delayRate}%)을 초과했습니다. 현재: ${delayRate.toFixed(2)}%`,
        severity: delayRate > thresholds.delayRate * 2 ? 'critical' : 'warning',
        triggeredAt: now,
      });
    }

    if (damageRate > thresholds.damageRate) {
      alerts.push({
        type: 'damage',
        message: `파손율이 임계값(${thresholds.damageRate}%)을 초과했습니다. 현재: ${damageRate.toFixed(2)}%`,
        severity: damageRate > thresholds.damageRate * 2 ? 'critical' : 'warning',
        triggeredAt: now,
      });
    }

    if (lostRate > thresholds.lostRate) {
      alerts.push({
        type: 'lost',
        message: `분실율이 임계값(${thresholds.lostRate}%)을 초과했습니다. 현재: ${lostRate.toFixed(2)}%`,
        severity: 'critical',
        triggeredAt: now,
      });
    }

    // 트렌드 계산 (일별)
    const trends = this.calculateTrends(shipments, issues, weekAgo, now);

    // 상위 이슈
    const topIssues = issues
      .filter((i) => i.severity === 'high' || i.severity === 'critical')
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, 10);

    const issueRate = totalShipments > 0 ? (issues.length / totalShipments) * 100 : 0;

    return {
      period: { start: weekAgo, end: now },
      summary: {
        totalShipments,
        issuesDetected: issues.length,
        issueRate,
        criticalIssues: bySeverity.critical + bySeverity.high,
        resolvedIssues: issues.filter((i) => i.status === QualityIssueStatus.RESOLVED).length,
      },
      byType,
      bySeverity,
      trends,
      topIssues,
      alerts,
    };
  }

  /**
   * 트렌드 계산
   */
  private calculateTrends(
    shipments: { created_at: Date }[],
    issues: QualityIssue[],
    start: Date,
    end: Date
  ): { date: Date; issueCount: number; issueRate: number }[] {
    const trends: { date: Date; issueCount: number; issueRate: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayShipments = shipments.filter(
        (s) => new Date(s.created_at) >= dayStart && new Date(s.created_at) <= dayEnd
      ).length;

      const dayIssues = issues.filter(
        (i) => new Date(i.detectedAt) >= dayStart && new Date(i.detectedAt) <= dayEnd
      ).length;

      trends.push({
        date: dayStart,
        issueCount: dayIssues,
        issueRate: dayShipments > 0 ? (dayIssues / dayShipments) * 100 : 0,
      });
    }

    return trends;
  }

  /**
   * 품질 KPI 조회
   */
  async getQualityKPI(period?: { start: Date; end: Date }): Promise<QualityKPI> {
    const now = new Date();
    const start = period?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = period?.end || now;

    // 배송 데이터 조회
    const shipmentsDb = this.getDatabase('shipments');
    const shipmentsResult = await shipmentsDb.findMany<{
      id: string;
      is_on_time: boolean;
      is_damaged: boolean;
      is_lost: boolean;
      is_accurate: boolean;
    }>({
      created_at: { $gte: start, $lte: end },
    });

    const shipments = shipmentsResult.data || [];
    const total = shipments.length;

    if (total === 0) {
      return this.createEmptyKPI(start, end);
    }

    // KPI 계산
    const onTimeCount = shipments.filter((s) => s.is_on_time).length;
    const damageCount = shipments.filter((s) => s.is_damaged).length;
    const lostCount = shipments.filter((s) => s.is_lost).length;
    const accurateCount = shipments.filter((s) => s.is_accurate !== false).length;

    const kpis = {
      onTimeDeliveryRate: (onTimeCount / total) * 100,
      damageRate: (damageCount / total) * 100,
      lostRate: (lostCount / total) * 100,
      accuracyRate: (accurateCount / total) * 100,
    };

    const targets = {
      onTimeDeliveryRate: 95,
      damageRate: 1,
      lostRate: 0.5,
      accuracyRate: 99,
    };

    const status = {
      onTimeDeliveryRate: this.getStatus(kpis.onTimeDeliveryRate, targets.onTimeDeliveryRate, true),
      damageRate: this.getStatus(kpis.damageRate, targets.damageRate, false),
      lostRate: this.getStatus(kpis.lostRate, targets.lostRate, false),
      accuracyRate: this.getStatus(kpis.accuracyRate, targets.accuracyRate, true),
    };

    return {
      period: { start, end },
      kpis,
      targets,
      status,
    };
  }

  /**
   * 빈 KPI 생성
   */
  private createEmptyKPI(start: Date, end: Date): QualityKPI {
    return {
      period: { start, end },
      kpis: { onTimeDeliveryRate: 0, damageRate: 0, lostRate: 0, accuracyRate: 0 },
      targets: { onTimeDeliveryRate: 95, damageRate: 1, lostRate: 0.5, accuracyRate: 99 },
      status: { onTimeDeliveryRate: 'critical', damageRate: 'good', lostRate: 'good', accuracyRate: 'critical' },
    };
  }

  /**
   * 상태 판단
   */
  private getStatus(actual: number, target: number, higherIsBetter: boolean): 'good' | 'warning' | 'critical' {
    if (higherIsBetter) {
      if (actual >= target) return 'good';
      if (actual >= target * 0.9) return 'warning';
      return 'critical';
    } else {
      if (actual <= target) return 'good';
      if (actual <= target * 1.5) return 'warning';
      return 'critical';
    }
  }

  /**
   * 품질 이슈 보고
   */
  async reportQualityIssue(issueData: Partial<QualityIssue>): Promise<QualityIssue> {
    const issue: QualityIssue = {
      id: uuidv4(),
      type: issueData.type || QualityIssueType.DELAY,
      status: QualityIssueStatus.DETECTED,
      severity: issueData.severity || 'medium',
      orderId: issueData.orderId,
      shipmentId: issueData.shipmentId,
      courierId: issueData.courierId,
      fulfillmentCenterId: issueData.fulfillmentCenterId,
      description: issueData.description || '',
      impact: issueData.impact,
      detectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // DB에 저장
    const db = this.getDatabase('quality_issues');
    await db.create({
      ...issue,
      detected_at: issue.detectedAt,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
    });

    // 심각한 이슈 알림
    if (issue.severity === 'high' || issue.severity === 'critical') {
      await this.notifyParent(
        `품질 이슈 [${issue.severity.toUpperCase()}]`,
        `유형: ${issue.type}\n설명: ${issue.description}`,
        issue.severity === 'critical' ? NotificationPriority.URGENT : NotificationPriority.HIGH
      );
    }

    this.logger.info('Quality issue reported', { issueId: issue.id, type: issue.type });

    return issue;
  }

  /**
   * 이슈 해결
   */
  async resolveIssue(
    issueId: string,
    resolution: { action: string; preventiveMeasure?: string }
  ): Promise<QualityIssue | null> {
    const db = this.getDatabase('quality_issues');
    const result = await db.findById<QualityIssue>(issueId);

    if (result.error || !result.data) {
      return null;
    }

    const issue = result.data;

    const updatedIssue: QualityIssue = {
      ...issue,
      status: QualityIssueStatus.RESOLVED,
      resolution: {
        action: resolution.action,
        resolvedAt: new Date(),
        resolvedBy: this.config.id,
        preventiveMeasure: resolution.preventiveMeasure,
      },
      updatedAt: new Date(),
    };

    await db.update({ id: issueId }, {
      status: QualityIssueStatus.RESOLVED,
      resolution: updatedIssue.resolution,
      updated_at: updatedIssue.updatedAt,
    });

    this.logger.info('Quality issue resolved', { issueId });

    return updatedIssue;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'monitoring',
      message: '품질 모니터링 중...',
    };
  }
}

export default QualityControlSubAgent;
