/**
 * BizSupport Agent - 지원사업 에이전트
 * LANE 3 - Management & Compliance
 *
 * 모니터링, 신청지원, 사후관리를 총괄하는 메인 에이전트입니다.
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
  SupportProgram,
  SupportProgramType,
  ProgramApplication,
  ApplicationStatus,
  ProjectExecution,
  FitLevel,
  DeadlineAlert,
  SupportMonitoringTaskPayload,
  ApplicationSupportTaskPayload,
  PostManagementTaskPayload,
  SupportMonitoringResult,
  ApplicationSupportResult,
  PostManagementResult,
} from './types';

// 서브 에이전트 import
import { SupportMonitoringSubAgent } from './SupportMonitoringSubAgent';
import { ApplicationSupportSubAgent } from './ApplicationSupportSubAgent';
import { PostManagementSubAgent } from './PostManagementSubAgent';

/**
 * BizSupport Agent 설정
 */
const BIZSUPPORT_AGENT_CONFIG: AgentConfig = {
  id: 'bizsupport-agent',
  name: 'BizSupport Agent',
  description: '모니터링, 신청지원, 사후관리를 총괄하는 지원사업 에이전트',
  enabled: true,
  schedule: '0 9 * * 1,3,5', // 월,수,금 오전 9시
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 600000, // 10분
  approvalLevel: ApprovalLevel.MEDIUM,
};

/**
 * 지원사업 작업 유형
 */
export type BizSupportTaskType =
  | 'scan_programs'
  | 'analyze_fit'
  | 'prepare_application'
  | 'track_execution'
  | 'check_deadlines'
  | 'weekly_summary';

/**
 * 지원사업 태스크 페이로드
 */
export interface BizSupportTaskPayload {
  taskType: BizSupportTaskType;
  programId?: string;
  applicationId?: string;
  executionId?: string;
  period?: DateRange;
  programTypes?: SupportProgramType[];
  options?: Record<string, unknown>;
}

/**
 * 지원사업 에이전트 결과
 */
export interface BizSupportAgentResultData {
  taskType: BizSupportTaskType;
  monitoring?: SupportMonitoringResult;
  application?: ApplicationSupportResult;
  postManagement?: PostManagementResult;
  summary?: {
    totalPrograms?: number;
    fitPrograms?: number;
    activeApplications?: number;
    activeExecutions?: number;
    upcomingDeadlines?: number;
  };
}

/**
 * BizSupport Agent 클래스
 */
export class BizSupportAgent extends BaseAgent {
  /** 모니터링 서브에이전트 */
  private supportMonitoringSubAgent!: SupportMonitoringSubAgent;

  /** 신청지원 서브에이전트 */
  private applicationSupportSubAgent!: ApplicationSupportSubAgent;

  /** 사후관리 서브에이전트 */
  private postManagementSubAgent!: PostManagementSubAgent;

  constructor() {
    super(BIZSUPPORT_AGENT_CONFIG);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing BizSupport Agent...');

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

    // 모니터링 서브에이전트 생성
    this.supportMonitoringSubAgent = new SupportMonitoringSubAgent({
      ...baseSubAgentConfig,
      id: 'support-monitoring-subagent',
      name: '모니터링 서브에이전트',
      description: '지원사업 크롤링, 적합성 매칭 담당',
      timeout: 600000, // 10분 (크롤링 시간)
    });

    // 신청지원 서브에이전트 생성
    this.applicationSupportSubAgent = new ApplicationSupportSubAgent({
      ...baseSubAgentConfig,
      id: 'application-support-subagent',
      name: '신청지원 서브에이전트',
      description: '서류준비, 사업계획서 초안작성 담당',
      approvalLevel: ApprovalLevel.MEDIUM,
    });

    // 사후관리 서브에이전트 생성
    this.postManagementSubAgent = new PostManagementSubAgent({
      ...baseSubAgentConfig,
      id: 'post-management-subagent',
      name: '사후관리 서브에이전트',
      description: '결과추적, 정산/보고서 관리 담당',
      approvalLevel: ApprovalLevel.MEDIUM,
    });

    // 에이전트 레지스트리에 등록
    agentRegistry.register(this, { type: 'base', tags: ['bizsupport', 'lane3'] });
    agentRegistry.register(this.supportMonitoringSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['bizsupport', 'monitoring'],
    });
    agentRegistry.register(this.applicationSupportSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['bizsupport', 'application'],
    });
    agentRegistry.register(this.postManagementSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['bizsupport', 'post-management'],
    });

    this.logger.info('BizSupport Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up BizSupport Agent...');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<BizSupportAgentResultData>> {
    const startTime = Date.now();
    const taskPayload = context.data as BizSupportTaskPayload | undefined;

    // 기본값: 주간 요약
    const taskType: BizSupportTaskType = taskPayload?.taskType || 'weekly_summary';

    this.logger.info(`Running BizSupport Agent - Task: ${taskType}`);

    try {
      let result: BizSupportAgentResultData;

      switch (taskType) {
        case 'scan_programs':
          result = await this.runScanPrograms(taskPayload?.programTypes);
          break;

        case 'analyze_fit':
          result = await this.runAnalyzeFit(taskPayload?.programTypes);
          break;

        case 'prepare_application':
          result = await this.runPrepareApplication(taskPayload?.programId);
          break;

        case 'track_execution':
          result = await this.runTrackExecution(
            taskPayload?.executionId,
            taskPayload?.applicationId
          );
          break;

        case 'check_deadlines':
          result = await this.runCheckDeadlines();
          break;

        case 'weekly_summary':
        default:
          result = await this.runWeeklySummary();
          break;
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('BizSupport Agent execution failed', error as Error);
      throw error;
    }
  }

  /**
   * 지원사업 스캔
   */
  private async runScanPrograms(
    programTypes?: SupportProgramType[]
  ): Promise<BizSupportAgentResultData> {
    const payload: SupportMonitoringTaskPayload = {
      action: 'crawl',
      programTypes,
      options: {
        includeFitAnalysis: true,
        sendNotification: true,
        minFitScore: 60,
      },
    };

    const taskResult = await this.supportMonitoringSubAgent.executeTask<
      SupportMonitoringTaskPayload,
      SupportMonitoringResult
    >({
      taskId: `scan-${Date.now()}`,
      type: 'scan_programs',
      priority: 7,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    const fitPrograms = taskResult.data?.fitPrograms || [];

    // 우수 적합 사업 알림
    const excellentPrograms = fitPrograms.filter(
      p => p.fitAnalysis?.level === FitLevel.EXCELLENT
    );

    if (excellentPrograms.length > 0) {
      await this.sendNotification(
        'high',
        'management',
        '적합도 높은 지원사업 발견',
        `${excellentPrograms.length}개의 적합도 높은 지원사업이 발견되었습니다.\n\n` +
        excellentPrograms.slice(0, 5).map(p =>
          `- ${p.name} (적합도: ${p.fitAnalysis?.score}%)`
        ).join('\n')
      );
    }

    return {
      taskType: 'scan_programs',
      monitoring: taskResult.data,
      summary: {
        totalPrograms: taskResult.data?.summary?.programsFound,
        fitPrograms: taskResult.data?.summary?.fitPrograms,
      },
    };
  }

  /**
   * 적합성 분석
   */
  private async runAnalyzeFit(
    programTypes?: SupportProgramType[]
  ): Promise<BizSupportAgentResultData> {
    const payload: SupportMonitoringTaskPayload = {
      action: 'analyze_fit',
      programTypes,
    };

    const taskResult = await this.supportMonitoringSubAgent.executeTask<
      SupportMonitoringTaskPayload,
      SupportMonitoringResult
    >({
      taskId: `fit-${Date.now()}`,
      type: 'analyze_fit',
      priority: 6,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'analyze_fit',
      monitoring: taskResult.data,
      summary: {
        totalPrograms: taskResult.data?.programs?.length,
        fitPrograms: taskResult.data?.fitPrograms?.length,
      },
    };
  }

  /**
   * 신청 준비
   */
  private async runPrepareApplication(programId?: string): Promise<BizSupportAgentResultData> {
    if (!programId) {
      throw new Error('programId is required for prepare_application');
    }

    // 1. 서류 준비
    const documentPayload: ApplicationSupportTaskPayload = {
      action: 'prepare_documents',
      programId,
      options: {
        autoCollectDocuments: true,
      },
    };

    const documentResult = await this.applicationSupportSubAgent.executeTask<
      ApplicationSupportTaskPayload,
      ApplicationSupportResult
    >({
      taskId: `docs-${Date.now()}`,
      type: 'prepare_documents',
      priority: 8,
      data: documentPayload,
      createdAt: new Date(),
      retryCount: 0,
    });

    // 2. 사업계획서 작성
    const planPayload: ApplicationSupportTaskPayload = {
      action: 'draft_business_plan',
      programId,
      options: {
        aiDraftGeneration: true,
      },
    };

    const planResult = await this.applicationSupportSubAgent.executeTask<
      ApplicationSupportTaskPayload,
      ApplicationSupportResult
    >({
      taskId: `plan-${Date.now()}`,
      type: 'draft_business_plan',
      priority: 8,
      data: planPayload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'prepare_application',
      application: {
        application: planResult.data?.application || documentResult.data?.application,
        preparedDocuments: documentResult.data?.preparedDocuments,
        businessPlan: planResult.data?.businessPlan,
        summary: documentResult.data?.summary,
      },
      summary: {
        activeApplications: 1,
      },
    };
  }

  /**
   * 수행 추적
   */
  private async runTrackExecution(
    executionId?: string,
    applicationId?: string
  ): Promise<BizSupportAgentResultData> {
    const payload: PostManagementTaskPayload = {
      action: 'track_progress',
      executionId,
      applicationId,
    };

    const taskResult = await this.postManagementSubAgent.executeTask<
      PostManagementTaskPayload,
      PostManagementResult
    >({
      taskId: `track-${Date.now()}`,
      type: 'track_execution',
      priority: 7,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    const execution = taskResult.data?.execution;
    const alerts = taskResult.data?.deadlineAlerts || [];

    // 긴급 알림
    const urgentAlerts = alerts.filter(a => a.urgency === 'urgent');
    if (urgentAlerts.length > 0) {
      await this.sendNotification(
        'urgent',
        'management',
        '지원사업 마감 임박',
        `${urgentAlerts.length}건의 마감이 임박했습니다.\n\n` +
        urgentAlerts.map(a =>
          `- ${a.name}: ${a.daysRemaining <= 0 ? '마감 초과' : `${a.daysRemaining}일 남음`}`
        ).join('\n')
      );
    }

    return {
      taskType: 'track_execution',
      postManagement: taskResult.data,
      summary: {
        activeExecutions: execution ? 1 : 0,
        upcomingDeadlines: alerts.length,
      },
    };
  }

  /**
   * 마감 확인
   */
  private async runCheckDeadlines(): Promise<BizSupportAgentResultData> {
    const payload: PostManagementTaskPayload = {
      action: 'check_deadlines',
      options: {
        notifyDeadlines: true,
        deadlineThresholdDays: 14,
      },
    };

    const taskResult = await this.postManagementSubAgent.executeTask<
      PostManagementTaskPayload,
      PostManagementResult
    >({
      taskId: `deadlines-${Date.now()}`,
      type: 'check_deadlines',
      priority: 8,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'check_deadlines',
      postManagement: taskResult.data,
      summary: {
        upcomingDeadlines: taskResult.data?.deadlineAlerts?.length || 0,
      },
    };
  }

  /**
   * 주간 요약
   */
  private async runWeeklySummary(): Promise<BizSupportAgentResultData> {
    this.logger.info('Running weekly summary...');

    // 1. 지원사업 스캔
    const scanResult = await this.runScanPrograms();

    // 2. 마감 확인
    const deadlineResult = await this.runCheckDeadlines();

    // 3. 신청 현황 확인
    const applicationDb = this.getDatabase('program_applications');
    const applicationsResult = await applicationDb.findByCondition<ProgramApplication>({});
    const activeApplications = (applicationsResult.data || []).filter(
      a => a.status !== ApplicationStatus.REJECTED &&
           a.status !== ApplicationStatus.CANCELLED
    );

    // 4. 수행 현황 확인
    const executionDb = this.getDatabase('project_executions');
    const executionsResult = await executionDb.findByCondition<ProjectExecution>({});
    const activeExecutions = (executionsResult.data || []).filter(
      e => e.status === 'active'
    );

    // 주간 요약 알림
    await this.sendNotification(
      'medium',
      'management',
      '지원사업 주간 요약',
      `[지원사업 현황]\n` +
      `- 발견된 지원사업: ${scanResult.summary?.totalPrograms || 0}건\n` +
      `- 적합 사업: ${scanResult.summary?.fitPrograms || 0}건\n` +
      `- 진행중 신청: ${activeApplications.length}건\n` +
      `- 수행중 사업: ${activeExecutions.length}건\n` +
      `- 임박 마감: ${deadlineResult.summary?.upcomingDeadlines || 0}건`
    );

    return {
      taskType: 'weekly_summary',
      monitoring: scanResult.monitoring,
      postManagement: deadlineResult.postManagement,
      summary: {
        totalPrograms: scanResult.summary?.totalPrograms,
        fitPrograms: scanResult.summary?.fitPrograms,
        activeApplications: activeApplications.length,
        activeExecutions: activeExecutions.length,
        upcomingDeadlines: deadlineResult.summary?.upcomingDeadlines,
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

export default BizSupportAgent;
