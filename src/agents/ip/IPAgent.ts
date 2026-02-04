/**
 * IP Agent - 지식재산권 에이전트
 * LANE 3 - Management & Compliance
 *
 * 권리관리, 침해감시, 대응을 총괄하는 메인 에이전트입니다.
 */

import { BaseAgent } from '../base/BaseAgent';
import { SubAgent, ParentAgentRef, SubAgentConfig } from '../base/SubAgent';
import agentRegistry from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  ApprovalLevel,
  TaskResult,
  DateRange,
} from '../../types';
import {
  IntellectualProperty,
  IPType,
  IPExpiryAlert,
  InfringementCase,
  InfringementSeverity,
  MonitoringResult,
  MonitoringChannel,
  ResponseAction,
  LegalEscalation,
  IPManagementTaskPayload,
  InfringementMonitoringTaskPayload,
  InfringementResponseTaskPayload,
  IPManagementResult,
  InfringementMonitoringResult,
  InfringementResponseResult,
} from './types';

// 서브 에이전트 import
import { IPManagementSubAgent } from './IPManagementSubAgent';
import { InfringementMonitoringSubAgent } from './InfringementMonitoringSubAgent';
import { InfringementResponseSubAgent } from './InfringementResponseSubAgent';

/**
 * IP Agent 설정
 */
const IP_AGENT_CONFIG: AgentConfig = {
  id: 'ip-agent',
  name: 'IP Agent',
  description: '권리관리, 침해감시, 대응을 총괄하는 지식재산권 에이전트',
  enabled: true,
  schedule: '0 10 * * *', // 매일 오전 10시
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 900000, // 15분 (모니터링에 시간 소요)
  approvalLevel: ApprovalLevel.MEDIUM,
};

/**
 * IP 작업 유형
 */
export type IPTaskType =
  | 'ip_check'
  | 'infringement_scan'
  | 'take_action'
  | 'daily_monitoring'
  | 'ip_report';

/**
 * IP 태스크 페이로드
 */
export interface IPTaskPayload {
  taskType: IPTaskType;
  period?: DateRange;
  ipTypes?: IPType[];
  channels?: MonitoringChannel[];
  caseId?: string;
  options?: Record<string, unknown>;
}

/**
 * IP 에이전트 결과
 */
export interface IPAgentResultData {
  taskType: IPTaskType;
  ipManagement?: IPManagementResult;
  infringementMonitoring?: InfringementMonitoringResult;
  infringementResponse?: InfringementResponseResult;
  summary?: {
    totalIPs?: number;
    expiringIPs?: number;
    activeCases?: number;
    newCases?: number;
    resolvedCases?: number;
    criticalCases?: number;
  };
}

/**
 * IP Agent 클래스
 */
export class IPAgent extends BaseAgent {
  /** 권리관리 서브에이전트 */
  private ipManagementSubAgent!: IPManagementSubAgent;

  /** 침해감시 서브에이전트 */
  private infringementMonitoringSubAgent!: InfringementMonitoringSubAgent;

  /** 대응 서브에이전트 */
  private infringementResponseSubAgent!: InfringementResponseSubAgent;

  constructor() {
    super(IP_AGENT_CONFIG);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing IP Agent...');

    // 부모 참조 생성
    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentTaskComplete.bind(this),
      onProgress: this.handleSubAgentProgress.bind(this),
      onError: this.handleSubAgentError.bind(this),
    };

    // 서브에이전트 설정 기본값
    const baseSubAgentConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelay: 3000,
      timeout: 300000, // 5분
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    };

    // 권리관리 서브에이전트 생성
    this.ipManagementSubAgent = new IPManagementSubAgent({
      ...baseSubAgentConfig,
      id: 'ip-management-subagent',
      name: '권리관리 서브에이전트',
      description: '상표/디자인권 등록/갱신 관리 담당',
      approvalLevel: ApprovalLevel.MEDIUM,
    });

    // 침해감시 서브에이전트 생성
    this.infringementMonitoringSubAgent = new InfringementMonitoringSubAgent({
      ...baseSubAgentConfig,
      id: 'infringement-monitoring-subagent',
      name: '침해감시 서브에이전트',
      description: '카피캣 모니터링, 침해알림 담당',
      timeout: 600000, // 10분 (모니터링 시간)
    });

    // 대응 서브에이전트 생성
    this.infringementResponseSubAgent = new InfringementResponseSubAgent({
      ...baseSubAgentConfig,
      id: 'infringement-response-subagent',
      name: '대응 서브에이전트',
      description: '침해대응, 법적조치 에스컬레이션 담당',
      approvalLevel: ApprovalLevel.HIGH,
    });

    // 에이전트 레지스트리에 등록
    agentRegistry.register(this, { type: 'base', tags: ['ip', 'lane3'] });
    agentRegistry.register(this.ipManagementSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['ip', 'management'],
    });
    agentRegistry.register(this.infringementMonitoringSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['ip', 'monitoring'],
    });
    agentRegistry.register(this.infringementResponseSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['ip', 'response'],
    });

    this.logger.info('IP Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up IP Agent...');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<IPAgentResultData>> {
    const startTime = Date.now();
    const taskPayload = context.data as IPTaskPayload | undefined;

    // 기본값: 일일 모니터링
    const taskType: IPTaskType = taskPayload?.taskType || 'daily_monitoring';

    this.logger.info(`Running IP Agent - Task: ${taskType}`);

    try {
      let result: IPAgentResultData;

      switch (taskType) {
        case 'ip_check':
          result = await this.runIPCheck(taskPayload?.ipTypes);
          break;

        case 'infringement_scan':
          result = await this.runInfringementScan(taskPayload?.channels);
          break;

        case 'take_action':
          result = await this.runTakeAction(taskPayload?.caseId);
          break;

        case 'ip_report':
          result = await this.runIPReport();
          break;

        case 'daily_monitoring':
        default:
          result = await this.runDailyMonitoring();
          break;
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('IP Agent execution failed', error as Error);
      throw error;
    }
  }

  /**
   * IP 권리 점검
   */
  private async runIPCheck(ipTypes?: IPType[]): Promise<IPAgentResultData> {
    const payload: IPManagementTaskPayload = {
      action: 'check_expiry',
      ipTypes,
      options: {
        sendNotification: true,
        expiryThresholdDays: 180, // IP는 6개월 전부터 준비
      },
    };

    const taskResult = await this.ipManagementSubAgent.executeTask<
      IPManagementTaskPayload,
      IPManagementResult
    >({
      taskId: `ip-${Date.now()}`,
      type: 'ip_check',
      priority: 7,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    const expiringCount = taskResult.data?.expiringIPs?.length || 0;
    if (expiringCount > 0) {
      await this.sendNotification(
        'high',
        'legal',
        'IP 권리 만료 임박 알림',
        `${expiringCount}개의 IP 권리가 6개월 이내 만료 예정입니다. 갱신 절차를 진행하세요.`
      );
    }

    return {
      taskType: 'ip_check',
      ipManagement: taskResult.data,
      summary: {
        totalIPs: taskResult.data?.ipSummary?.total,
        expiringIPs: expiringCount,
      },
    };
  }

  /**
   * 침해 스캔
   */
  private async runInfringementScan(channels?: MonitoringChannel[]): Promise<IPAgentResultData> {
    const payload: InfringementMonitoringTaskPayload = {
      action: 'scan',
      channels: channels || [
        MonitoringChannel.COUPANG,
        MonitoringChannel.NAVER,
        MonitoringChannel.GMARKET,
      ],
      options: {
        detailedAnalysis: true,
        autoCreateCases: true,
        similarityThreshold: 70,
      },
    };

    const taskResult = await this.infringementMonitoringSubAgent.executeTask<
      InfringementMonitoringTaskPayload,
      InfringementMonitoringResult
    >({
      taskId: `scan-${Date.now()}`,
      type: 'infringement_scan',
      priority: 8,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    const newCases = taskResult.data?.summary?.newCases || 0;
    const criticalCases = taskResult.data?.summary?.bySeverity?.[InfringementSeverity.CRITICAL] || 0;

    if (criticalCases > 0) {
      await this.sendNotification(
        'urgent',
        'legal',
        '긴급: 심각한 IP 침해 발견',
        `${criticalCases}건의 심각한 침해가 발견되었습니다. 즉시 대응이 필요합니다.`
      );
    } else if (newCases > 0) {
      await this.sendNotification(
        'high',
        'legal',
        'IP 침해 발견 알림',
        `${newCases}건의 새로운 IP 침해 의심 건이 발견되었습니다.`
      );
    }

    return {
      taskType: 'infringement_scan',
      infringementMonitoring: taskResult.data,
      summary: {
        activeCases: taskResult.data?.summary?.totalActiveCases,
        newCases,
        criticalCases,
      },
    };
  }

  /**
   * 대응 조치
   */
  private async runTakeAction(caseId?: string): Promise<IPAgentResultData> {
    const payload: InfringementResponseTaskPayload = {
      action: caseId ? 'take_action' : 'generate_report',
      caseId,
      options: {
        autoSendWarning: false, // 수동 확인 후 발송
        requestApproval: true,
      },
    };

    const taskResult = await this.infringementResponseSubAgent.executeTask<
      InfringementResponseTaskPayload,
      InfringementResponseResult
    >({
      taskId: `action-${Date.now()}`,
      type: 'take_action',
      priority: 9,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'take_action',
      infringementResponse: taskResult.data,
      summary: {
        resolvedCases: taskResult.data?.summary?.resolved,
      },
    };
  }

  /**
   * 일일 모니터링
   */
  private async runDailyMonitoring(): Promise<IPAgentResultData> {
    this.logger.info('Running daily IP monitoring...');

    // IP 점검과 침해 스캔 병렬 실행
    const [ipResult, scanResult] = await Promise.all([
      this.runIPCheck(),
      this.runInfringementScan(),
    ]);

    // 심각한 케이스가 있으면 자동 대응 검토
    if ((scanResult.summary?.criticalCases || 0) > 0) {
      this.logger.info('Critical cases found, reviewing for auto-response...');
      // 실제로는 대응 팀에 알림만 발송
    }

    return {
      taskType: 'daily_monitoring',
      ipManagement: ipResult.ipManagement,
      infringementMonitoring: scanResult.infringementMonitoring,
      summary: {
        totalIPs: ipResult.summary?.totalIPs,
        expiringIPs: ipResult.summary?.expiringIPs,
        activeCases: scanResult.summary?.activeCases,
        newCases: scanResult.summary?.newCases,
        criticalCases: scanResult.summary?.criticalCases,
      },
    };
  }

  /**
   * IP 리포트 생성
   */
  private async runIPReport(): Promise<IPAgentResultData> {
    const [ipResult, scanResult, responseResult] = await Promise.all([
      this.runIPCheck(),
      this.runInfringementScan(),
      this.runTakeAction(),
    ]);

    await this.sendNotification(
      'medium',
      'legal',
      'IP 현황 리포트',
      `총 IP: ${ipResult.summary?.totalIPs || 0}건\n` +
      `만료 임박: ${ipResult.summary?.expiringIPs || 0}건\n` +
      `활성 침해 케이스: ${scanResult.summary?.activeCases || 0}건\n` +
      `금일 신규 발견: ${scanResult.summary?.newCases || 0}건\n` +
      `해결된 케이스: ${responseResult.summary?.resolvedCases || 0}건`
    );

    return {
      taskType: 'ip_report',
      ipManagement: ipResult.ipManagement,
      infringementMonitoring: scanResult.infringementMonitoring,
      infringementResponse: responseResult.infringementResponse,
      summary: {
        totalIPs: ipResult.summary?.totalIPs,
        expiringIPs: ipResult.summary?.expiringIPs,
        activeCases: scanResult.summary?.activeCases,
        newCases: scanResult.summary?.newCases,
        resolvedCases: responseResult.summary?.resolvedCases,
        criticalCases: scanResult.summary?.criticalCases,
      },
    };
  }

  /**
   * 서브에이전트 태스크 완료 핸들러
   */
  private async handleSubAgentTaskComplete(result: TaskResult): Promise<void> {
    this.logger.debug('Sub-agent task completed', {
      taskId: result.taskId,
      status: result.status,
    });
  }

  /**
   * 서브에이전트 진행 상황 핸들러
   */
  private async handleSubAgentProgress(progress: { percentage: number; message?: string }): Promise<void> {
    this.logger.debug('Sub-agent progress', progress);
  }

  /**
   * 서브에이전트 에러 핸들러
   */
  private async handleSubAgentError(error: Error, context?: Record<string, unknown>): Promise<void> {
    this.logger.error('Sub-agent error', error, context);
  }
}

export default IPAgent;
