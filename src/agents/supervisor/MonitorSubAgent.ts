/**
 * 썬데이허그 AI 에이전트 시스템 - Monitor 서브 에이전트
 *
 * LANE 5: Integration & Orchestration
 * 전체 시스템 상태 모니터링 및 알림을 담당하는 서브 에이전트
 */

import { SubAgent, SubAgentConfig, ParentAgentRef } from '../base/SubAgent';
import { agentRegistry } from '../base/AgentRegistry';
import {
  AgentContext,
  AgentResult,
  AgentStatus,
  ApprovalLevel,
  NotificationPriority,
} from '../../types';
import {
  AgentHealthStatus,
  SystemStatusReport,
  SystemMetrics,
  QueueStatus,
  PriorityLevel,
  ActiveAlert,
} from './types';
import { metricsCollector, healthCheckManager, alertManager } from '../../monitoring';
import { systemLogger } from '../../utils/logger';

/**
 * Monitor 설정
 */
interface MonitorConfig {
  /** 헬스체크 간격 (밀리초) */
  healthCheckInterval: number;
  /** 메트릭 수집 간격 (밀리초) */
  metricsCollectionInterval: number;
  /** 리포트 생성 간격 (밀리초) */
  reportGenerationInterval: number;
  /** 알림 임계값 */
  alertThresholds: {
    errorRatePercent: number;
    responseTimeMs: number;
    queueDepth: number;
  };
}

/**
 * 기본 Monitor 설정
 */
const defaultMonitorConfig: MonitorConfig = {
  healthCheckInterval: 30000, // 30초
  metricsCollectionInterval: 60000, // 1분
  reportGenerationInterval: 300000, // 5분
  alertThresholds: {
    errorRatePercent: 5,
    responseTimeMs: 5000,
    queueDepth: 100,
  },
};

/**
 * 에이전트 상태 이력
 */
interface AgentStatusHistory {
  agentId: string;
  status: AgentHealthStatus;
  timestamp: Date;
  responseTime?: number;
  errorRate?: number;
}

/**
 * Monitor 서브 에이전트 클래스
 */
export class MonitorSubAgent extends SubAgent {
  private monitorConfig: MonitorConfig;
  private agentStatuses: Map<string, AgentHealthStatus> = new Map();
  private statusHistory: AgentStatusHistory[] = [];
  private lastReport?: SystemStatusReport;
  private healthCheckTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private reportTimer?: NodeJS.Timeout;
  private activeAlerts: Map<string, ActiveAlert> = new Map();

  /**
   * MonitorSubAgent 생성자
   */
  constructor(parentRef: ParentAgentRef, config?: Partial<MonitorConfig>) {
    const subAgentConfig: SubAgentConfig = {
      id: '00-02-monitor',
      name: 'Monitor',
      description: '전체 시스템 상태 모니터링 및 알림',
      approvalLevel: ApprovalLevel.NONE,
      enabled: true,
      timeout: 60000,
      maxRetries: 2,
      retryDelay: 1000,
      parentRef,
      autoReportResults: true,
    };

    super(subAgentConfig);
    this.monitorConfig = { ...defaultMonitorConfig, ...config };

    systemLogger.info('MonitorSubAgent initialized');
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing MonitorSubAgent...');

    // 헬스체크 시작
    this.startHealthChecks();

    // 메트릭 수집 시작
    this.startMetricsCollection();

    // 리포트 생성 시작
    this.startReportGeneration();
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up MonitorSubAgent...');

    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.reportTimer) clearInterval(this.reportTimer);

    await this.cleanupSubAgent();
  }

  /**
   * 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const data = context.data || {};
      const action = data.action as string;

      switch (action) {
        case 'health_check':
          return await this.performHealthCheckAction(startTime);

        case 'collect_metrics':
          return await this.collectMetricsAction(startTime);

        case 'generate_report':
          return await this.generateReportAction(startTime);

        case 'get_status':
          return await this.getStatusAction(data.agentId as string | undefined, startTime);

        default:
          // 기본: 전체 상태 리포트
          return await this.generateReportAction(startTime);
      }
    } catch (error) {
      return this.createErrorResult(
        'MONITOR_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  // ===========================================================================
  // 헬스체크 메서드
  // ===========================================================================

  /**
   * 헬스체크 시작
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.monitorConfig.healthCheckInterval);

    // 즉시 첫 체크
    this.performHealthChecks();
  }

  /**
   * 헬스체크 수행
   */
  private async performHealthChecks(): Promise<void> {
    const agents = agentRegistry.getAllAgents();

    for (const [agentId, agent] of agents) {
      const startTime = Date.now();

      try {
        const status = agent.getStatus();
        const meta = agentRegistry.getAgentMetadata(agentId);

        // 상태 결정
        let healthStatus: AgentHealthStatus;
        if (status === AgentStatus.ERROR) {
          healthStatus = AgentHealthStatus.UNHEALTHY;
        } else if (status === AgentStatus.RUNNING) {
          healthStatus = AgentHealthStatus.HEALTHY;
        } else if (status === AgentStatus.PAUSED) {
          healthStatus = AgentHealthStatus.DEGRADED;
        } else {
          healthStatus = AgentHealthStatus.HEALTHY;
        }

        // 에러율 체크
        if (meta) {
          const errorRate = meta.failureCount / (meta.executionCount || 1) * 100;
          if (errorRate > this.monitorConfig.alertThresholds.errorRatePercent) {
            healthStatus = AgentHealthStatus.DEGRADED;
          }
        }

        const previousStatus = this.agentStatuses.get(agentId);
        this.agentStatuses.set(agentId, healthStatus);

        // 이력 기록
        this.recordStatusHistory(agentId, healthStatus, Date.now() - startTime);

        // 상태 변경 알림
        if (previousStatus && previousStatus !== healthStatus) {
          await this.handleStatusChange(agentId, previousStatus, healthStatus);
        }
      } catch (error) {
        this.agentStatuses.set(agentId, AgentHealthStatus.UNKNOWN);
        this.logger.error(`Health check failed for ${agentId}`, error as Error);
      }
    }

    // 전체 상태 메트릭 업데이트
    this.updateHealthMetrics();
  }

  /**
   * 헬스체크 액션
   */
  private async performHealthCheckAction(startTime: number): Promise<AgentResult> {
    await this.performHealthChecks();

    const statuses = Object.fromEntries(this.agentStatuses);

    return this.createSuccessResult(
      {
        statuses,
        timestamp: new Date(),
        totalAgents: this.agentStatuses.size,
        healthyCount: Array.from(this.agentStatuses.values()).filter(
          (s) => s === AgentHealthStatus.HEALTHY
        ).length,
      },
      startTime
    );
  }

  /**
   * 상태 변경 처리
   */
  private async handleStatusChange(
    agentId: string,
    previousStatus: AgentHealthStatus,
    currentStatus: AgentHealthStatus
  ): Promise<void> {
    this.logger.warn('Agent status changed', {
      agentId,
      previousStatus,
      currentStatus,
    });

    // 알림 생성
    if (currentStatus === AgentHealthStatus.UNHEALTHY) {
      const alert: ActiveAlert = {
        id: `alert_${agentId}_${Date.now()}`,
        severity: 'error',
        message: `Agent ${agentId} is unhealthy`,
        occurredAt: new Date(),
      };
      this.activeAlerts.set(alert.id, alert);

      // 부모에게 알림
      await this.notifyParent(
        `에이전트 상태 이상: ${agentId}`,
        `에이전트 ${agentId}가 ${previousStatus}에서 ${currentStatus}로 변경되었습니다.`,
        NotificationPriority.HIGH
      );
    }
  }

  /**
   * 상태 이력 기록
   */
  private recordStatusHistory(
    agentId: string,
    status: AgentHealthStatus,
    responseTime?: number
  ): void {
    const meta = agentRegistry.getAgentMetadata(agentId);
    const errorRate = meta
      ? (meta.failureCount / (meta.executionCount || 1)) * 100
      : undefined;

    this.statusHistory.push({
      agentId,
      status,
      timestamp: new Date(),
      responseTime,
      errorRate,
    });

    // 최대 10000개 유지
    if (this.statusHistory.length > 10000) {
      this.statusHistory = this.statusHistory.slice(-10000);
    }
  }

  /**
   * 헬스 메트릭 업데이트
   */
  private updateHealthMetrics(): void {
    const healthyCounts = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    };

    for (const status of this.agentStatuses.values()) {
      switch (status) {
        case AgentHealthStatus.HEALTHY:
          healthyCounts.healthy++;
          break;
        case AgentHealthStatus.DEGRADED:
          healthyCounts.degraded++;
          break;
        case AgentHealthStatus.UNHEALTHY:
          healthyCounts.unhealthy++;
          break;
        default:
          healthyCounts.unknown++;
      }
    }

    metricsCollector.setGauge('agents_healthy', healthyCounts.healthy);
    metricsCollector.setGauge('agents_degraded', healthyCounts.degraded);
    metricsCollector.setGauge('agents_unhealthy', healthyCounts.unhealthy);
  }

  // ===========================================================================
  // 메트릭 수집 메서드
  // ===========================================================================

  /**
   * 메트릭 수집 시작
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.monitorConfig.metricsCollectionInterval);

    // 즉시 첫 수집
    this.collectSystemMetrics();
  }

  /**
   * 시스템 메트릭 수집
   */
  private collectSystemMetrics(): void {
    const stats = agentRegistry.getStatistics();

    // 에이전트 통계
    metricsCollector.setGauge('total_agents', stats.totalAgents);
    metricsCollector.setGauge('total_executions', stats.totalExecutions);
    metricsCollector.setGauge('total_successes', stats.totalSuccesses);
    metricsCollector.setGauge('total_failures', stats.totalFailures);

    // 성공률
    const successRate = stats.totalExecutions > 0
      ? (stats.totalSuccesses / stats.totalExecutions) * 100
      : 100;
    metricsCollector.setGauge('success_rate_percent', successRate);

    // 메모리 사용량
    const memUsage = process.memoryUsage();
    metricsCollector.setGauge('memory_heap_used', memUsage.heapUsed);
    metricsCollector.setGauge('memory_heap_total', memUsage.heapTotal);
    metricsCollector.setGauge('memory_rss', memUsage.rss);

    this.logger.debug('System metrics collected', {
      totalAgents: stats.totalAgents,
      successRate,
    });
  }

  /**
   * 메트릭 수집 액션
   */
  private async collectMetricsAction(startTime: number): Promise<AgentResult> {
    this.collectSystemMetrics();

    const snapshot = metricsCollector.getSnapshot();

    return this.createSuccessResult(
      {
        metrics: snapshot,
        timestamp: new Date(),
      },
      startTime
    );
  }

  // ===========================================================================
  // 리포트 생성 메서드
  // ===========================================================================

  /**
   * 리포트 생성 시작
   */
  private startReportGeneration(): void {
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.monitorConfig.reportGenerationInterval);
  }

  /**
   * 리포트 생성
   */
  private generateReport(): SystemStatusReport {
    const stats = agentRegistry.getStatistics();
    const health = agentRegistry.healthCheck();

    // 에이전트 상태
    const agents = Array.from(agentRegistry.getAllMetadata().entries()).map(
      ([id, meta]) => ({
        agentId: id,
        name: meta.name,
        status: this.agentStatuses.get(id) || AgentHealthStatus.UNKNOWN,
        lastHealthCheck: new Date(),
        responseTime: 0,
        errorRate: meta.executionCount > 0
          ? (meta.failureCount / meta.executionCount) * 100
          : 0,
        queueDepth: 0,
        activeJobs: meta.status === AgentStatus.RUNNING ? 1 : 0,
      })
    );

    // 큐 상태
    const queues: QueueStatus[] = [
      { priority: PriorityLevel.P0_CRITICAL, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P1_URGENT, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P2_HIGH, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P3_NORMAL, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P4_LOW, pending: 0, processing: 0, avgWaitTime: 0 },
      { priority: PriorityLevel.P5_BATCH, pending: 0, processing: 0, avgWaitTime: 0 },
    ];

    // 메트릭
    const metrics: SystemMetrics = {
      requestsPerHour: metricsCollector.getCounter('supervisor_routing_decisions') || 0,
      avgResponseTime: metricsCollector.getGauge('avg_response_time') || 0,
      errorRate: stats.totalExecutions > 0
        ? (stats.totalFailures / stats.totalExecutions) * 100
        : 0,
      escalationsToday: 0,
    };

    // 전체 상태
    let overallStatus = AgentHealthStatus.HEALTHY;
    const unhealthyCount = agents.filter(
      (a) => a.status === AgentHealthStatus.UNHEALTHY
    ).length;
    const degradedCount = agents.filter(
      (a) => a.status === AgentHealthStatus.DEGRADED
    ).length;

    if (unhealthyCount > 0) {
      overallStatus = unhealthyCount > agents.length / 2
        ? AgentHealthStatus.UNHEALTHY
        : AgentHealthStatus.DEGRADED;
    } else if (degradedCount > 0) {
      overallStatus = AgentHealthStatus.DEGRADED;
    }

    const report: SystemStatusReport = {
      timestamp: new Date(),
      status: overallStatus,
      agents,
      queues,
      metrics,
      alerts: Array.from(this.activeAlerts.values()),
    };

    this.lastReport = report;

    this.logger.info('System report generated', {
      status: overallStatus,
      totalAgents: agents.length,
    });

    return report;
  }

  /**
   * 리포트 생성 액션
   */
  private async generateReportAction(startTime: number): Promise<AgentResult> {
    const report = this.generateReport();

    return this.createSuccessResult(report, startTime);
  }

  // ===========================================================================
  // 상태 조회 메서드
  // ===========================================================================

  /**
   * 상태 조회 액션
   */
  private async getStatusAction(
    agentId: string | undefined,
    startTime: number
  ): Promise<AgentResult> {
    if (agentId) {
      // 특정 에이전트 상태
      const status = this.agentStatuses.get(agentId);
      const meta = agentRegistry.getAgentMetadata(agentId);

      if (!status || !meta) {
        return this.createErrorResult('AGENT_NOT_FOUND', `Agent ${agentId} not found`, startTime, false);
      }

      return this.createSuccessResult(
        {
          agentId,
          status,
          metadata: meta,
          history: this.getAgentHistory(agentId, 50),
        },
        startTime
      );
    }

    // 전체 상태
    return this.createSuccessResult(
      {
        statuses: Object.fromEntries(this.agentStatuses),
        lastReport: this.lastReport,
        alerts: Array.from(this.activeAlerts.values()),
      },
      startTime
    );
  }

  /**
   * 에이전트 이력 조회
   */
  private getAgentHistory(agentId: string, limit: number): AgentStatusHistory[] {
    return this.statusHistory
      .filter((h) => h.agentId === agentId)
      .slice(-limit);
  }

  // ===========================================================================
  // 공개 API
  // ===========================================================================

  /**
   * 에이전트 상태 조회
   */
  getAgentStatus(agentId: string): AgentHealthStatus | undefined {
    return this.agentStatuses.get(agentId);
  }

  /**
   * 모든 에이전트 상태 조회
   */
  getAllAgentStatuses(): Map<string, AgentHealthStatus> {
    return new Map(this.agentStatuses);
  }

  /**
   * 마지막 리포트 조회
   */
  getLastReport(): SystemStatusReport | undefined {
    return this.lastReport;
  }

  /**
   * 활성 알림 조회
   */
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 알림 해결
   */
  resolveAlert(alertId: string): boolean {
    if (this.activeAlerts.has(alertId)) {
      this.activeAlerts.delete(alertId);
      this.logger.info('Alert resolved', { alertId });
      return true;
    }
    return false;
  }

  /**
   * 모든 알림 해결
   */
  resolveAllAlerts(): void {
    this.activeAlerts.clear();
    this.logger.info('All alerts resolved');
  }

  /**
   * 임계값 설정
   */
  setAlertThresholds(thresholds: Partial<MonitorConfig['alertThresholds']>): void {
    this.monitorConfig.alertThresholds = {
      ...this.monitorConfig.alertThresholds,
      ...thresholds,
    };
    this.logger.info('Alert thresholds updated', { thresholds });
  }

  /**
   * 상태 이력 조회
   */
  getStatusHistory(limit: number = 100): AgentStatusHistory[] {
    return this.statusHistory.slice(-limit);
  }
}

export default MonitorSubAgent;
