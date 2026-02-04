/**
 * 썬데이허그 AI 에이전트 시스템 - Logistics Agent (물류 에이전트)
 * LANE 1 - Core Operations
 *
 * 역할: 3PL 관리, 배송 최적화, 품질 관리를 총괄하는 메인 에이전트
 */

import { BaseAgent } from '../base/BaseAgent';
import { SubAgent, ParentAgentRef, SubAgentConfig } from '../base/SubAgent';
import agentRegistry from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  ApprovalLevel,
  TaskPayload,
  TaskResult,
  NotificationPriority,
} from '../../types';
import {
  LogisticsAgentConfig,
  FulfillmentPerformance,
  ShippingCostAnalysis,
  CourierRecommendation,
  QualityMonitoringResult,
  QualityKPI,
  CourierService,
} from './types';

// 서브에이전트 imports
import { ThreePLManagerSubAgent } from './sub/ThreePLManagerSubAgent';
import { ShippingOptimizerSubAgent } from './sub/ShippingOptimizerSubAgent';
import { QualityControlSubAgent } from './sub/QualityControlSubAgent';

/**
 * Logistics Agent 실행 결과
 */
interface LogisticsAgentResult {
  fulfillmentPerformance?: FulfillmentPerformance[];
  shippingCostAnalysis?: ShippingCostAnalysis;
  qualityMonitoring?: QualityMonitoringResult;
  alerts?: string[];
}

/**
 * LogisticsAgent 클래스
 * 물류 관련 모든 작업을 조율하는 메인 에이전트
 */
export class LogisticsAgent extends BaseAgent {
  private logisticsConfig: LogisticsAgentConfig;

  // 서브에이전트
  private threePLManager!: ThreePLManagerSubAgent;
  private shippingOptimizer!: ShippingOptimizerSubAgent;
  private qualityControl!: QualityControlSubAgent;

  constructor(config?: Partial<AgentConfig>, logisticsConfig?: Partial<LogisticsAgentConfig>) {
    const defaultConfig: AgentConfig = {
      id: 'logistics-agent',
      name: '물류 에이전트',
      description: '3PL 관리, 배송 최적화, 품질 관리를 담당합니다.',
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 300000,
      approvalLevel: ApprovalLevel.MEDIUM,
      schedule: '*/15 * * * *', // 15분마다 실행
      ...config,
    };

    super(defaultConfig);

    this.logisticsConfig = {
      fulfillmentConfig: {
        preferredCenters: [],
        autoAssignEnabled: true,
        performanceThreshold: 95,
      },
      shippingConfig: {
        preferredCouriers: ['cj', 'hanjin', 'lotte'],
        costOptimizationEnabled: true,
        defaultService: CourierService.STANDARD,
        maxCostPerShipment: 5000,
      },
      qualityConfig: {
        monitoringEnabled: true,
        alertThresholds: {
          delayRate: 5,
          damageRate: 1,
          lostRate: 0.5,
        },
        autoEscalateEnabled: true,
      },
      ...logisticsConfig,
    };
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing LogisticsAgent and sub-agents...');

    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
    };

    // 3PL관리 서브에이전트
    this.threePLManager = new ThreePLManagerSubAgent({
      id: '3pl-manager-sub',
      name: '3PL관리 서브에이전트',
      description: '풀필먼트 성과추적',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    // 배송최적화 서브에이전트
    this.shippingOptimizer = new ShippingOptimizerSubAgent({
      id: 'shipping-optimizer-sub',
      name: '배송최적화 서브에이전트',
      description: '배송비분석, 업체비교',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    // 품질관리 서브에이전트
    this.qualityControl = new QualityControlSubAgent({
      id: 'quality-control-sub',
      name: '품질관리 서브에이전트',
      description: '지연/파손 모니터링',
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.MEDIUM,
      parentRef,
    });

    // AgentRegistry에 서브에이전트 등록
    const subAgents = [
      { agent: this.threePLManager, tags: ['logistics', '3pl', 'fulfillment', 'lane1'] },
      { agent: this.shippingOptimizer, tags: ['logistics', 'shipping', 'optimization', 'lane1'] },
      { agent: this.qualityControl, tags: ['logistics', 'quality', 'monitoring', 'lane1'] },
    ];

    for (const { agent, tags } of subAgents) {
      agentRegistry.register(agent, {
        type: 'sub',
        parentId: this.config.id,
        tags,
      });
    }

    this.logger.info('LogisticsAgent initialization completed');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up LogisticsAgent...');

    const subAgentIds = [
      this.threePLManager?.getId(),
      this.shippingOptimizer?.getId(),
      this.qualityControl?.getId(),
    ];

    for (const id of subAgentIds) {
      if (id) await agentRegistry.unregister(id);
    }

    this.logger.info('LogisticsAgent cleanup completed');
  }

  /**
   * 에이전트 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<LogisticsAgentResult>> {
    const startTime = Date.now();
    const result: LogisticsAgentResult = {
      alerts: [],
    };

    try {
      // 1. 풀필먼트 성과 추적
      this.logger.info('Tracking fulfillment performance...');
      const fulfillmentPerformance = await this.trackFulfillmentPerformance();
      result.fulfillmentPerformance = fulfillmentPerformance;

      // 2. 배송 비용 분석
      this.logger.info('Analyzing shipping costs...');
      const shippingAnalysis = await this.analyzeShippingCosts();
      result.shippingCostAnalysis = shippingAnalysis;

      // 3. 품질 모니터링
      if (this.logisticsConfig.qualityConfig.monitoringEnabled) {
        this.logger.info('Running quality monitoring...');
        const qualityResult = await this.runQualityMonitoring();
        result.qualityMonitoring = qualityResult;

        // 품질 알림 처리
        if (qualityResult.alerts && qualityResult.alerts.length > 0) {
          for (const alert of qualityResult.alerts) {
            result.alerts!.push(alert.message);
            if (alert.severity === 'critical') {
              await this.sendNotification(
                NotificationPriority.URGENT,
                'operations',
                '물류 품질 경고',
                alert.message
              );
            }
          }
        }
      }

      // 4. 성과 기준 미달 풀필먼트 센터 경고
      const underperformingCenters = fulfillmentPerformance.filter(
        (p) => p.sla.actualOnTimeDelivery < this.logisticsConfig.fulfillmentConfig.performanceThreshold
      );

      if (underperformingCenters.length > 0) {
        const centerNames = underperformingCenters.map((c) => c.centerName).join(', ');
        result.alerts!.push(`성과 미달 풀필먼트 센터: ${centerNames}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('LogisticsAgent execution failed', error as Error);
      return this.createErrorResult(
        'LOGISTICS_AGENT_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 풀필먼트 성과 추적
   */
  private async trackFulfillmentPerformance(): Promise<FulfillmentPerformance[]> {
    const task: TaskPayload = {
      taskId: `track-fulfillment-${Date.now()}`,
      type: 'track_performance',
      priority: 6,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.threePLManager.executeTask<unknown, FulfillmentPerformance[]>(task);
    return result.data || [];
  }

  /**
   * 배송 비용 분석
   */
  private async analyzeShippingCosts(): Promise<ShippingCostAnalysis | undefined> {
    const task: TaskPayload = {
      taskId: `analyze-shipping-${Date.now()}`,
      type: 'analyze_costs',
      priority: 5,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.shippingOptimizer.executeTask<unknown, ShippingCostAnalysis>(task);
    return result.data;
  }

  /**
   * 품질 모니터링
   */
  private async runQualityMonitoring(): Promise<QualityMonitoringResult> {
    const task: TaskPayload = {
      taskId: `quality-monitoring-${Date.now()}`,
      type: 'monitor_quality',
      priority: 7,
      data: { thresholds: this.logisticsConfig.qualityConfig.alertThresholds },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.qualityControl.executeTask<unknown, QualityMonitoringResult>(task);
    return result.data || {
      period: { start: new Date(), end: new Date() },
      summary: { totalShipments: 0, issuesDetected: 0, issueRate: 0, criticalIssues: 0, resolvedIssues: 0 },
      byType: {} as any,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      trends: [],
      topIssues: [],
      alerts: [],
    };
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.logger.debug('Sub-agent result received', {
      taskId: result.taskId,
      status: result.status,
    });
  }

  /**
   * 서브에이전트 진행 상황 처리
   */
  private async handleSubAgentProgress(progress: { percentage: number; message?: string }): Promise<void> {
    this.logger.debug('Sub-agent progress', progress);
  }

  /**
   * 서브에이전트 에러 처리
   */
  private async handleSubAgentError(error: Error, context?: Record<string, unknown>): Promise<void> {
    this.logger.error('Sub-agent error', error, context);
    await this.sendNotification(
      NotificationPriority.HIGH,
      'operations',
      '물류 에이전트 오류',
      `에러: ${error.message}`
    );
  }

  // ===========================================================================
  // 공개 API 메서드
  // ===========================================================================

  /**
   * 주문에 대한 최적 택배사 추천
   */
  async recommendCourier(orderId: string): Promise<CourierRecommendation | null> {
    const task: TaskPayload = {
      taskId: `recommend-courier-${orderId}`,
      type: 'recommend_courier',
      priority: 7,
      data: { orderId },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.shippingOptimizer.executeTask<{ orderId: string }, CourierRecommendation>(task);
    return result.data || null;
  }

  /**
   * 품질 KPI 조회
   */
  async getQualityKPI(period?: { start: Date; end: Date }): Promise<QualityKPI | null> {
    const task: TaskPayload = {
      taskId: `quality-kpi-${Date.now()}`,
      type: 'get_quality_kpi',
      priority: 5,
      data: { period },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.qualityControl.executeTask<unknown, QualityKPI>(task);
    return result.data || null;
  }

  /**
   * 풀필먼트 센터 성과 비교
   */
  async compareFulfillmentCenters(): Promise<FulfillmentPerformance[]> {
    const task: TaskPayload = {
      taskId: `compare-centers-${Date.now()}`,
      type: 'compare_centers',
      priority: 4,
      data: {},
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.threePLManager.executeTask<unknown, FulfillmentPerformance[]>(task);
    return result.data || [];
  }

  /**
   * Logistics Agent 설정 조회
   */
  getLogisticsConfig(): LogisticsAgentConfig {
    return { ...this.logisticsConfig };
  }

  /**
   * Logistics Agent 설정 업데이트
   */
  updateLogisticsConfig(updates: Partial<LogisticsAgentConfig>): void {
    this.logisticsConfig = { ...this.logisticsConfig, ...updates };
    this.logger.info('LogisticsAgent config updated', updates);
  }
}

export default LogisticsAgent;
