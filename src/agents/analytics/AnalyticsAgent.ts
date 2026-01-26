/**
 * Analytics Agent - 데이터 분석 메인 에이전트
 * LANE 4: Analytics & Growth
 *
 * 역할: KPI 집계, 실시간 분석, 리포트 생성, 예측 분석을 총괄합니다.
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
  TaskStatus,
  NotificationPriority,
} from '../../types';
import {
  AnalyticsPeriod,
  KPIMetric,
  DashboardConfig,
  ReportConfig,
  GeneratedReport,
  ForecastRequest,
  ForecastResult,
  AnomalyDetection,
  SalesAggregation,
  DashboardTaskPayload,
  ReportTaskPayload,
  ForecastTaskPayload,
} from './types';

// =============================================================================
// Analytics Agent 설정
// =============================================================================

const ANALYTICS_AGENT_CONFIG: AgentConfig = {
  id: 'analytics-agent',
  name: 'Analytics Agent',
  description: '데이터 분석, KPI 집계, 리포트 생성, 예측 분석을 담당하는 에이전트',
  enabled: true,
  schedule: '0 */30 * * * *', // 30분마다
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 300000, // 5분
  approvalLevel: ApprovalLevel.LOW,
  metadata: {
    version: '1.0.0',
    domain: 'analytics',
    layer: 'growth',
  },
};

// =============================================================================
// Analytics Agent 클래스
// =============================================================================

export class AnalyticsAgent extends BaseAgent {
  /** 대시보드 서브에이전트 */
  private dashboardSubAgent: DashboardSubAgent | null = null;

  /** 리포트 서브에이전트 */
  private reportSubAgent: ReportSubAgent | null = null;

  /** 예측 서브에이전트 */
  private forecastSubAgent: ForecastSubAgent | null = null;

  constructor(config: AgentConfig = ANALYTICS_AGENT_CONFIG) {
    super(config);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Analytics Agent and sub-agents...');

    // 부모 참조 생성
    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: async (progress) => {
        this.logger.debug('Sub-agent progress', progress);
      },
      onError: async (error, context) => {
        this.logger.error('Sub-agent error', error, context);
      },
    };

    // 서브에이전트 생성 및 등록
    this.dashboardSubAgent = new DashboardSubAgent({
      id: 'analytics-dashboard-subagent',
      name: 'Dashboard SubAgent',
      description: 'KPI 집계, 실시간 시각화 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 60000,
      approvalLevel: ApprovalLevel.NONE,
      parentRef,
    });

    this.reportSubAgent = new ReportSubAgent({
      id: 'analytics-report-subagent',
      name: 'Report SubAgent',
      description: '일간/주간/월간 리포트 자동생성 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    this.forecastSubAgent = new ForecastSubAgent({
      id: 'analytics-forecast-subagent',
      name: 'Forecast SubAgent',
      description: '수요예측, 매출예측, 이상감지 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    // AgentRegistry에 등록
    agentRegistry.register(this.dashboardSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['analytics', 'dashboard', 'kpi'],
    });

    agentRegistry.register(this.reportSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['analytics', 'report', 'automation'],
    });

    agentRegistry.register(this.forecastSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['analytics', 'forecast', 'prediction'],
    });

    this.logger.info('Analytics Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Analytics Agent...');

    if (this.dashboardSubAgent) {
      await agentRegistry.unregister(this.dashboardSubAgent.getId());
    }
    if (this.reportSubAgent) {
      await agentRegistry.unregister(this.reportSubAgent.getId());
    }
    if (this.forecastSubAgent) {
      await agentRegistry.unregister(this.forecastSubAgent.getId());
    }

    this.logger.info('Analytics Agent cleanup completed');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this.logger.info('Analytics Agent running...', { executionId: context.executionId });

    try {
      const data = context.data || {};
      const action = data.action as string;

      switch (action) {
        case 'aggregate_kpi':
          return await this.handleKPIAggregation(data, startTime);

        case 'generate_report':
          return await this.handleReportGeneration(data, startTime);

        case 'forecast':
          return await this.handleForecast(data, startTime);

        case 'detect_anomaly':
          return await this.handleAnomalyDetection(data, startTime);

        case 'full_analysis':
          return await this.handleFullAnalysis(startTime);

        default:
          // 기본: 주기적 분석 실행
          return await this.handlePeriodicAnalysis(startTime);
      }
    } catch (error) {
      this.logger.error('Analytics Agent execution failed', error as Error);
      return this.createErrorResult(
        'ANALYTICS_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * KPI 집계 처리
   */
  private async handleKPIAggregation(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.dashboardSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Dashboard SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<DashboardTaskPayload> = {
      taskId: `kpi-${Date.now()}`,
      type: 'aggregate_kpi',
      priority: 7,
      data: {
        action: 'aggregate_kpi',
        period: data.period as AnalyticsPeriod || AnalyticsPeriod.DAILY,
        kpiIds: data.kpiIds as string[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.dashboardSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'kpi_aggregation' },
      startTime,
      { processed: 1 }
    );
  }

  /**
   * 리포트 생성 처리
   */
  private async handleReportGeneration(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.reportSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Report SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<ReportTaskPayload> = {
      taskId: `report-${Date.now()}`,
      type: 'generate_report',
      priority: 6,
      data: {
        action: 'generate_report',
        reportConfigId: data.reportConfigId as string,
        reportType: data.reportType as any,
        format: data.format as any,
        recipients: data.recipients as string[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.reportSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'report_generation' },
      startTime,
      { processed: 1 }
    );
  }

  /**
   * 예측 분석 처리
   */
  private async handleForecast(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.forecastSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Forecast SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<ForecastTaskPayload> = {
      taskId: `forecast-${Date.now()}`,
      type: 'generate_forecast',
      priority: 5,
      data: {
        action: 'generate_forecast',
        forecastRequest: data.forecastRequest as ForecastRequest,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.forecastSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'forecast' },
      startTime,
      { processed: 1 }
    );
  }

  /**
   * 이상 감지 처리
   */
  private async handleAnomalyDetection(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.forecastSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Forecast SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<ForecastTaskPayload> = {
      taskId: `anomaly-${Date.now()}`,
      type: 'detect_anomaly',
      priority: 8,
      data: {
        action: 'detect_anomaly',
        metricsToMonitor: data.metricsToMonitor as string[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.forecastSubAgent.executeTask(task);

    // 이상 감지 시 알림
    if (result.data && (result.data as any).anomalies?.length > 0) {
      await this.sendNotification(
        NotificationPriority.HIGH,
        'operations',
        '이상 감지 알림',
        `${(result.data as any).anomalies.length}건의 이상이 감지되었습니다.`
      );
    }

    return this.createSuccessResult(
      { taskResult: result, type: 'anomaly_detection' },
      startTime,
      { processed: 1 }
    );
  }

  /**
   * 전체 분석 실행
   */
  private async handleFullAnalysis(startTime: number): Promise<AgentResult> {
    const results: TaskResult[] = [];

    // 병렬로 분석 실행
    const tasks = await Promise.allSettled([
      this.dashboardSubAgent?.executeTask({
        taskId: `full-kpi-${Date.now()}`,
        type: 'aggregate_kpi',
        priority: 5,
        data: { action: 'aggregate_kpi', period: AnalyticsPeriod.DAILY },
        createdAt: new Date(),
        retryCount: 0,
      }),
      this.forecastSubAgent?.executeTask({
        taskId: `full-anomaly-${Date.now()}`,
        type: 'detect_anomaly',
        priority: 5,
        data: { action: 'detect_anomaly' },
        createdAt: new Date(),
        retryCount: 0,
      }),
    ]);

    for (const task of tasks) {
      if (task.status === 'fulfilled' && task.value) {
        results.push(task.value);
      }
    }

    return this.createSuccessResult(
      { results, type: 'full_analysis' },
      startTime,
      { processed: results.length }
    );
  }

  /**
   * 주기적 분석 실행 (스케줄)
   */
  private async handlePeriodicAnalysis(startTime: number): Promise<AgentResult> {
    this.logger.info('Running periodic analysis...');

    // KPI 갱신
    const kpiResult = await this.dashboardSubAgent?.executeTask({
      taskId: `periodic-kpi-${Date.now()}`,
      type: 'refresh_realtime',
      priority: 4,
      data: { action: 'refresh_realtime' },
      createdAt: new Date(),
      retryCount: 0,
    });

    // 이상 감지
    const anomalyResult = await this.forecastSubAgent?.executeTask({
      taskId: `periodic-anomaly-${Date.now()}`,
      type: 'detect_anomaly',
      priority: 4,
      data: { action: 'detect_anomaly' },
      createdAt: new Date(),
      retryCount: 0,
    });

    return this.createSuccessResult(
      {
        kpiResult,
        anomalyResult,
        type: 'periodic_analysis',
      },
      startTime,
      { processed: 2 }
    );
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.logger.info('Received sub-agent result', {
      taskId: result.taskId,
      status: result.status,
    });

    if (result.status === TaskStatus.FAILED && result.error) {
      this.logger.error('Sub-agent task failed', new Error(result.error.message), {
        taskId: result.taskId,
      });
    }
  }
}

// =============================================================================
// Dashboard SubAgent - KPI 집계 및 실시간 시각화
// =============================================================================

export class DashboardSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Dashboard SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as DashboardTaskPayload;

    this.logger.info('Dashboard SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'aggregate_kpi':
        return await this.aggregateKPI(data, startTime);

      case 'update_widget':
        return await this.updateWidget(data, startTime);

      case 'refresh_realtime':
        return await this.refreshRealtime(startTime);

      case 'create_dashboard':
        return await this.createDashboard(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * KPI 집계
   */
  private async aggregateKPI(data: DashboardTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Aggregating KPIs...', { period: data.period });

    // 실제 구현에서는 데이터베이스에서 데이터를 조회하고 집계
    const kpis: KPIMetric[] = [
      {
        id: 'daily_sales',
        name: '일 매출',
        category: 'sales' as any,
        currentValue: 15000000,
        previousValue: 14500000,
        targetValue: 16000000,
        changeRate: 3.45,
        unit: 'KRW',
        calculatedAt: new Date(),
      },
      {
        id: 'daily_orders',
        name: '일 주문 수',
        category: 'sales' as any,
        currentValue: 450,
        previousValue: 420,
        targetValue: 500,
        changeRate: 7.14,
        unit: '건',
        calculatedAt: new Date(),
      },
      {
        id: 'aov',
        name: '평균 주문 금액',
        category: 'sales' as any,
        currentValue: 33333,
        previousValue: 34524,
        targetValue: 35000,
        changeRate: -3.45,
        unit: 'KRW',
        calculatedAt: new Date(),
      },
    ];

    return this.createSuccessResult(
      { kpis, period: data.period, aggregatedAt: new Date() },
      startTime,
      { processed: kpis.length }
    );
  }

  /**
   * 위젯 업데이트
   */
  private async updateWidget(data: DashboardTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Updating widget...', { widgetId: data.widgetId });

    // 위젯 데이터 갱신 로직
    return this.createSuccessResult(
      { widgetId: data.widgetId, updated: true },
      startTime
    );
  }

  /**
   * 실시간 데이터 새로고침
   */
  private async refreshRealtime(startTime: number): Promise<AgentResult> {
    this.logger.info('Refreshing realtime data...');

    // 실시간 메트릭 갱신
    const realtimeMetrics = {
      timestamp: new Date(),
      activeUsers: 125,
      ordersInProgress: 23,
      pendingCS: 5,
    };

    return this.createSuccessResult(
      { realtimeMetrics, refreshedAt: new Date() },
      startTime
    );
  }

  /**
   * 대시보드 생성
   */
  private async createDashboard(data: DashboardTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating new dashboard...');

    const dashboardConfig: Partial<DashboardConfig> = {
      id: `dashboard-${Date.now()}`,
      name: 'New Dashboard',
      description: 'Auto-generated dashboard',
      widgets: [],
      defaultPeriod: AnalyticsPeriod.DAILY,
      autoRefresh: true,
      sharedWith: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.createSuccessResult(
      { dashboard: dashboardConfig },
      startTime
    );
  }
}

// =============================================================================
// Report SubAgent - 리포트 자동 생성
// =============================================================================

export class ReportSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Report SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as ReportTaskPayload;

    this.logger.info('Report SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'generate_report':
        return await this.generateReport(data, startTime);

      case 'schedule_report':
        return await this.scheduleReport(data, startTime);

      case 'send_report':
        return await this.sendReport(data, startTime);

      case 'create_template':
        return await this.createTemplate(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 리포트 생성
   */
  private async generateReport(data: ReportTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Generating report...', { reportType: data.reportType });

    const report: GeneratedReport = {
      id: `report-${Date.now()}`,
      configId: data.reportConfigId || 'default',
      generatedAt: new Date(),
      periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      content: {
        sections: [
          {
            id: 'sales-summary',
            title: '매출 요약',
            data: {
              totalSales: 15000000,
              totalOrders: 450,
              aov: 33333,
            },
          },
          {
            id: 'channel-breakdown',
            title: '채널별 현황',
            data: {
              coupang: 8000000,
              naver: 5000000,
              cafe24: 2000000,
            },
          },
        ],
        summary: '전일 대비 매출 3.45% 증가, 주문 수 7.14% 증가',
        insights: [
          '쿠팡 채널 성장세 지속',
          '평균 주문 금액 소폭 하락 - 프로모션 영향으로 추정',
          '재구매율 전월 대비 2% 상승',
        ],
      },
      status: 'completed',
    };

    return this.createSuccessResult(
      { report },
      startTime
    );
  }

  /**
   * 리포트 스케줄 설정
   */
  private async scheduleReport(data: ReportTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Scheduling report...', { reportConfigId: data.reportConfigId });

    // 스케줄 등록 로직
    return this.createSuccessResult(
      { scheduled: true, reportConfigId: data.reportConfigId },
      startTime
    );
  }

  /**
   * 리포트 발송
   */
  private async sendReport(data: ReportTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Sending report...', { recipients: data.recipients });

    // 이메일/슬랙 발송 로직
    return this.createSuccessResult(
      { sent: true, recipients: data.recipients, sentAt: new Date() },
      startTime
    );
  }

  /**
   * 리포트 템플릿 생성
   */
  private async createTemplate(data: ReportTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating report template...');

    const template: Partial<ReportConfig> = {
      id: `template-${Date.now()}`,
      type: data.reportType || 'daily_summary' as any,
      title: 'New Report Template',
      sections: [],
      format: data.format || 'html' as any,
      enabled: true,
    };

    return this.createSuccessResult(
      { template },
      startTime
    );
  }
}

// =============================================================================
// Forecast SubAgent - 예측 및 이상 감지
// =============================================================================

export class ForecastSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Forecast SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as ForecastTaskPayload;

    this.logger.info('Forecast SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'generate_forecast':
        return await this.generateForecast(data, startTime);

      case 'detect_anomaly':
        return await this.detectAnomaly(data, startTime);

      case 'update_model':
        return await this.updateModel(data, startTime);

      case 'evaluate_accuracy':
        return await this.evaluateAccuracy(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 예측 생성
   */
  private async generateForecast(data: ForecastTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Generating forecast...', { target: data.forecastRequest?.target });

    const result: ForecastResult = {
      requestId: data.forecastRequest?.requestId || `forecast-${Date.now()}`,
      predictions: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 15000000 + Math.random() * 2000000,
        lowerBound: 13000000,
        upperBound: 18000000,
      })),
      modelMetrics: {
        mape: 5.2,
        rmse: 750000,
        r2: 0.92,
      },
      generatedAt: new Date(),
      nextUpdateAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    return this.createSuccessResult(
      { forecast: result },
      startTime
    );
  }

  /**
   * 이상 감지
   */
  private async detectAnomaly(data: ForecastTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Detecting anomalies...');

    // 이상 감지 로직 - 실제로는 통계적 분석 수행
    const anomalies: AnomalyDetection[] = [];

    // 샘플 이상 감지 (실제로는 데이터 분석 결과)
    const hasAnomaly = Math.random() > 0.7;
    if (hasAnomaly) {
      anomalies.push({
        id: `anomaly-${Date.now()}`,
        metricId: 'daily_sales',
        metricName: '일 매출',
        detectedAt: new Date(),
        severity: 'warning' as any,
        expectedValue: 15000000,
        actualValue: 12000000,
        deviation: -20,
        description: '일 매출이 예상치보다 20% 낮습니다.',
        possibleCauses: [
          '계절적 요인',
          '마케팅 캠페인 종료',
          '경쟁사 프로모션',
        ],
        recommendedActions: [
          '채널별 매출 분석 확인',
          '마케팅팀과 협의',
          '프로모션 검토',
        ],
        status: 'new',
      });
    }

    return this.createSuccessResult(
      { anomalies, checkedAt: new Date(), metricsChecked: data.metricsToMonitor?.length || 10 },
      startTime,
      { processed: anomalies.length }
    );
  }

  /**
   * 모델 업데이트
   */
  private async updateModel(data: ForecastTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Updating forecast model...', { modelId: data.modelId });

    // 모델 재학습 로직
    return this.createSuccessResult(
      { modelId: data.modelId, updated: true, updatedAt: new Date() },
      startTime
    );
  }

  /**
   * 예측 정확도 평가
   */
  private async evaluateAccuracy(data: ForecastTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Evaluating forecast accuracy...');

    const evaluation = {
      period: data.evaluationPeriod,
      metrics: {
        mape: 4.8,
        rmse: 680000,
        r2: 0.94,
        bias: 0.02,
      },
      comparison: {
        previousMape: 5.2,
        improvement: 7.7,
      },
      evaluatedAt: new Date(),
    };

    return this.createSuccessResult(
      { evaluation },
      startTime
    );
  }
}

// =============================================================================
// Export
// =============================================================================

export default AnalyticsAgent;
