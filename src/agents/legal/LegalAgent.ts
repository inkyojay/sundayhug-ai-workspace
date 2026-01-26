/**
 * Legal Agent - 법률/컴플라이언스 에이전트
 * LANE 3 - Management & Compliance
 *
 * 인증관리, 광고심의, 규정준수를 총괄하는 메인 에이전트입니다.
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
  Certification,
  CertificationType,
  CertificationExpiryAlert,
  AdReviewRequest,
  AdReviewStatus,
  AdCopyCheckResult,
  ComplianceChecklist,
  RegulatoryViolation,
  PrivacyComplianceStatus,
  RegulationType,
  CertificationManagementTaskPayload,
  AdReviewTaskPayload,
  ComplianceTaskPayload,
  CertificationManagementResult,
  AdReviewResult as AdReviewResultType,
  ComplianceResult,
} from './types';

// 서브 에이전트 import
import { CertificationSubAgent } from './CertificationSubAgent';
import { AdReviewSubAgent } from './AdReviewSubAgent';
import { ComplianceSubAgent } from './ComplianceSubAgent';

/**
 * Legal Agent 설정
 */
const LEGAL_AGENT_CONFIG: AgentConfig = {
  id: 'legal-agent',
  name: 'Legal Agent',
  description: '인증관리, 광고심의, 규정준수를 총괄하는 법률/컴플라이언스 에이전트',
  enabled: true,
  schedule: '0 8 * * 1', // 매주 월요일 오전 8시
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 600000, // 10분
  approvalLevel: ApprovalLevel.MEDIUM,
};

/**
 * 법률 작업 유형
 */
export type LegalTaskType =
  | 'certification_check'
  | 'ad_review'
  | 'compliance_audit'
  | 'privacy_check'
  | 'full_compliance_report';

/**
 * 법률 태스크 페이로드
 */
export interface LegalTaskPayload {
  taskType: LegalTaskType;
  period?: DateRange;
  certificationTypes?: CertificationType[];
  regulationType?: RegulationType;
  adReviewRequest?: AdReviewRequest;
  options?: Record<string, unknown>;
}

/**
 * 법률 에이전트 결과
 */
export interface LegalAgentResultData {
  taskType: LegalTaskType;
  certification?: CertificationManagementResult;
  adReview?: AdReviewResultType;
  compliance?: ComplianceResult;
  summary?: {
    expiringCertifications?: number;
    pendingAdReviews?: number;
    complianceIssues?: number;
    overallComplianceRate?: number;
  };
}

/**
 * Legal Agent 클래스
 */
export class LegalAgent extends BaseAgent {
  /** 인증관리 서브에이전트 */
  private certificationSubAgent!: CertificationSubAgent;

  /** 광고심의 서브에이전트 */
  private adReviewSubAgent!: AdReviewSubAgent;

  /** 규정준수 서브에이전트 */
  private complianceSubAgent!: ComplianceSubAgent;

  constructor() {
    super(LEGAL_AGENT_CONFIG);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Legal Agent...');

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

    // 인증관리 서브에이전트 생성
    this.certificationSubAgent = new CertificationSubAgent({
      ...baseSubAgentConfig,
      id: 'certification-subagent',
      name: '인증관리 서브에이전트',
      description: 'KC, 안전인증 유효기간/갱신 관리 담당',
      approvalLevel: ApprovalLevel.MEDIUM,
    });

    // 광고심의 서브에이전트 생성
    this.adReviewSubAgent = new AdReviewSubAgent({
      ...baseSubAgentConfig,
      id: 'ad-review-subagent',
      name: '광고심의 서브에이전트',
      description: '광고문구검토, 위반방지 담당',
    });

    // 규정준수 서브에이전트 생성
    this.complianceSubAgent = new ComplianceSubAgent({
      ...baseSubAgentConfig,
      id: 'compliance-subagent',
      name: '규정준수 서브에이전트',
      description: '전자상거래법, 개인정보보호 준수 담당',
      approvalLevel: ApprovalLevel.MEDIUM,
    });

    // 에이전트 레지스트리에 등록
    agentRegistry.register(this, { type: 'base', tags: ['legal', 'lane3'] });
    agentRegistry.register(this.certificationSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['legal', 'certification'],
    });
    agentRegistry.register(this.adReviewSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['legal', 'ad-review'],
    });
    agentRegistry.register(this.complianceSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['legal', 'compliance'],
    });

    this.logger.info('Legal Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Legal Agent...');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<LegalAgentResultData>> {
    const startTime = Date.now();
    const taskPayload = context.data as LegalTaskPayload | undefined;

    // 기본값: 전체 컴플라이언스 점검
    const taskType: LegalTaskType = taskPayload?.taskType || 'full_compliance_report';

    this.logger.info(`Running Legal Agent - Task: ${taskType}`);

    try {
      let result: LegalAgentResultData;

      switch (taskType) {
        case 'certification_check':
          result = await this.runCertificationCheck(taskPayload?.certificationTypes);
          break;

        case 'ad_review':
          result = await this.runAdReview(taskPayload?.adReviewRequest);
          break;

        case 'compliance_audit':
          result = await this.runComplianceAudit(taskPayload?.regulationType);
          break;

        case 'privacy_check':
          result = await this.runPrivacyCheck();
          break;

        case 'full_compliance_report':
        default:
          result = await this.runFullComplianceReport();
          break;
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Legal Agent execution failed', error as Error);
      throw error;
    }
  }

  /**
   * 인증 점검 실행
   */
  private async runCertificationCheck(
    certificationTypes?: CertificationType[]
  ): Promise<LegalAgentResultData> {
    const payload: CertificationManagementTaskPayload = {
      action: 'check_expiry',
      certificationTypes,
      options: {
        sendNotification: true,
        expiryThresholdDays: 90,
      },
    };

    const taskResult = await this.certificationSubAgent.executeTask<
      CertificationManagementTaskPayload,
      CertificationManagementResult
    >({
      taskId: `cert-${Date.now()}`,
      type: 'certification_check',
      priority: 8,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    // 만료 임박 인증이 있으면 알림
    const expiringCount = taskResult.data?.expiringCertifications?.length || 0;
    if (expiringCount > 0) {
      await this.sendNotification(
        'high',
        'legal',
        '인증 만료 임박 알림',
        `${expiringCount}개의 인증이 90일 이내 만료 예정입니다. 갱신 절차를 진행하세요.`
      );
    }

    return {
      taskType: 'certification_check',
      certification: taskResult.data,
      summary: {
        expiringCertifications: expiringCount,
      },
    };
  }

  /**
   * 광고 심의 실행
   */
  private async runAdReview(
    adReviewRequest?: AdReviewRequest
  ): Promise<LegalAgentResultData> {
    if (!adReviewRequest) {
      throw new Error('Ad review request is required');
    }

    const payload: AdReviewTaskPayload = {
      action: 'review',
      adReviewRequest,
      options: {
        strictMode: true,
        autoSuggest: true,
      },
    };

    const taskResult = await this.adReviewSubAgent.executeTask<
      AdReviewTaskPayload,
      AdReviewResultType
    >({
      taskId: `ad-${Date.now()}`,
      type: 'ad_review',
      priority: 7,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'ad_review',
      adReview: taskResult.data,
      summary: {
        pendingAdReviews: taskResult.data?.summary?.revisionRequired || 0,
      },
    };
  }

  /**
   * 컴플라이언스 감사 실행
   */
  private async runComplianceAudit(
    regulationType?: RegulationType
  ): Promise<LegalAgentResultData> {
    const payload: ComplianceTaskPayload = {
      action: 'audit',
      regulationType,
      options: {
        fullAudit: true,
        autoRemediation: false,
      },
    };

    const taskResult = await this.complianceSubAgent.executeTask<
      ComplianceTaskPayload,
      ComplianceResult
    >({
      taskId: `compliance-${Date.now()}`,
      type: 'compliance_audit',
      priority: 8,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    const criticalIssues = taskResult.data?.violations?.filter(
      v => v.riskLevel === 'critical' || v.riskLevel === 'high'
    ).length || 0;

    if (criticalIssues > 0) {
      await this.sendNotification(
        'urgent',
        'legal',
        '중요 컴플라이언스 이슈 발견',
        `${criticalIssues}개의 중요 규정 위반 사항이 발견되었습니다. 즉시 조치가 필요합니다.`
      );
    }

    return {
      taskType: 'compliance_audit',
      compliance: taskResult.data,
      summary: {
        complianceIssues: taskResult.data?.violations?.length || 0,
        overallComplianceRate: taskResult.data?.summary?.overallComplianceRate,
      },
    };
  }

  /**
   * 개인정보 점검 실행
   */
  private async runPrivacyCheck(): Promise<LegalAgentResultData> {
    const payload: ComplianceTaskPayload = {
      action: 'check_privacy',
      options: {
        fullAudit: true,
      },
    };

    const taskResult = await this.complianceSubAgent.executeTask<
      ComplianceTaskPayload,
      ComplianceResult
    >({
      taskId: `privacy-${Date.now()}`,
      type: 'privacy_check',
      priority: 9,
      data: payload,
      createdAt: new Date(),
      retryCount: 0,
    });

    return {
      taskType: 'privacy_check',
      compliance: taskResult.data,
      summary: {
        complianceIssues: taskResult.data?.privacyStatus ? 0 : 1,
      },
    };
  }

  /**
   * 전체 컴플라이언스 리포트 생성
   */
  private async runFullComplianceReport(): Promise<LegalAgentResultData> {
    this.logger.info('Running full compliance report...');

    // 병렬로 모든 점검 실행
    const [certResult, complianceResult] = await Promise.all([
      this.runCertificationCheck(),
      this.runComplianceAudit(),
    ]);

    const summary = {
      expiringCertifications: certResult.summary?.expiringCertifications || 0,
      pendingAdReviews: 0,
      complianceIssues: complianceResult.summary?.complianceIssues || 0,
      overallComplianceRate: complianceResult.summary?.overallComplianceRate || 100,
    };

    // 주간 리포트 알림
    await this.sendNotification(
      'medium',
      'legal',
      '주간 컴플라이언스 리포트',
      `인증 만료 임박: ${summary.expiringCertifications}건\n` +
      `컴플라이언스 이슈: ${summary.complianceIssues}건\n` +
      `전체 준수율: ${summary.overallComplianceRate}%`
    );

    return {
      taskType: 'full_compliance_report',
      certification: certResult.certification,
      compliance: complianceResult.compliance,
      summary,
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

export default LegalAgent;
