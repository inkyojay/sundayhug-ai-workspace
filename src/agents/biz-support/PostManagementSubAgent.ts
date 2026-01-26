/**
 * 사후관리 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 결과추적, 정산/보고서 관리를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  DateRange,
} from '../../types';
import {
  ProgramApplication,
  ApplicationStatus,
  ProjectExecution,
  ProjectMilestone,
  SettlementReport,
  SettlementReportStatus,
  ResultReport,
  ExpenditureItem,
  EvidenceDocument,
  PerformanceIndicator,
  DeadlineAlert,
  PostManagementTaskPayload,
  PostManagementResult,
} from './types';

/**
 * 사후관리 서브에이전트 클래스
 */
export class PostManagementSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Post Management SubAgent...');
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<PostManagementResult>> {
    const startTime = Date.now();
    const payload = context.data as PostManagementTaskPayload;

    this.logger.info('Running Post Management SubAgent', {
      action: payload.action,
    });

    try {
      let result: PostManagementResult;

      switch (payload.action) {
        case 'track_progress':
          result = await this.trackProgress(payload.executionId, payload.applicationId);
          break;

        case 'prepare_settlement':
          result = await this.prepareSettlementReport(
            payload.executionId!,
            payload.period,
            payload.options
          );
          break;

        case 'prepare_result_report':
          result = await this.prepareResultReport(payload.executionId!, payload.period);
          break;

        case 'check_deadlines':
          result = await this.checkDeadlines(payload.options);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Post management failed', error as Error);
      throw error;
    }
  }

  /**
   * 진행 상황 추적
   */
  private async trackProgress(
    executionId?: string,
    applicationId?: string
  ): Promise<PostManagementResult> {
    const executionDb = this.getDatabase('project_executions');
    const applicationDb = this.getDatabase('program_applications');

    let execution: ProjectExecution | undefined;

    if (executionId) {
      const result = await executionDb.findById<ProjectExecution>(executionId);
      execution = result.data;
    } else if (applicationId) {
      // 신청 기반으로 수행현황 조회 또는 생성
      const applicationResult = await applicationDb.findById<ProgramApplication>(applicationId);
      if (!applicationResult.data) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      const application = applicationResult.data;

      // 승인된 신청만 처리
      if (application.status !== ApplicationStatus.APPROVED) {
        throw new Error('Application is not approved yet');
      }

      // 기존 수행현황 조회
      const executionsResult = await executionDb.findByCondition<ProjectExecution>({});
      execution = (executionsResult.data || []).find(e => e.applicationId === applicationId);

      // 없으면 새로 생성
      if (!execution) {
        execution = await this.createExecution(application);
      }
    }

    if (!execution) {
      throw new Error('Execution not found');
    }

    // 진행률 계산
    const completedMilestones = execution.milestones.filter(m => m.status === 'completed');
    const executionProgress = Math.round(
      (completedMilestones.length / execution.milestones.length) * 100
    );

    // 예산 집행률 계산
    const budgetUtilization = Math.round(
      (execution.spentAmount / execution.totalSupportAmount) * 100
    );

    // 마감 알림 확인
    const deadlineAlerts = this.checkExecutionDeadlines(execution);

    this.logger.info('Tracked progress', {
      executionId: execution.id,
      progress: executionProgress,
      budgetUtilization,
      upcomingDeadlines: deadlineAlerts.length,
    });

    return {
      execution,
      deadlineAlerts,
      summary: {
        executionProgress,
        budgetUtilization,
        upcomingDeadlines: deadlineAlerts.length,
      },
    };
  }

  /**
   * 수행현황 생성
   */
  private async createExecution(application: ProgramApplication): Promise<ProjectExecution> {
    const executionDb = this.getDatabase('project_executions');
    const now = new Date();

    // 사업 기간 설정 (기본 6개월)
    const projectStart = new Date(now);
    const projectEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    // 마일스톤 생성
    const milestones = this.generateMilestones(projectStart, projectEnd);

    const execution: ProjectExecution = {
      id: `exec-${application.id}-${now.getTime()}`,
      applicationId: application.id,
      programId: application.programId,
      projectPeriod: {
        start: projectStart,
        end: projectEnd,
      },
      totalSupportAmount: application.approvedAmount || 50000000,
      spentAmount: 0,
      remainingAmount: application.approvedAmount || 50000000,
      milestones,
      settlementReports: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await executionDb.create(execution);
    this.logger.info('Created project execution', { executionId: execution.id });

    return execution;
  }

  /**
   * 마일스톤 생성
   */
  private generateMilestones(start: Date, end: Date): ProjectMilestone[] {
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const milestones: ProjectMilestone[] = [];

    // 착수 단계
    milestones.push({
      id: `ms-${Date.now()}-1`,
      name: '사업 착수',
      dueDate: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
      deliverables: ['착수계', '협약서'],
    });

    // 중간 점검
    const midpoint = new Date(start.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);
    milestones.push({
      id: `ms-${Date.now()}-2`,
      name: '중간 점검',
      dueDate: midpoint,
      status: 'pending',
      deliverables: ['중간보고서', '진도점검표'],
    });

    // 중간 정산
    milestones.push({
      id: `ms-${Date.now()}-3`,
      name: '중간 정산',
      dueDate: new Date(midpoint.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: 'pending',
      deliverables: ['중간정산서', '집행증빙'],
    });

    // 최종 완료
    milestones.push({
      id: `ms-${Date.now()}-4`,
      name: '사업 완료',
      dueDate: end,
      status: 'pending',
      deliverables: ['최종보고서', '성과보고서'],
    });

    // 최종 정산
    milestones.push({
      id: `ms-${Date.now()}-5`,
      name: '최종 정산',
      dueDate: new Date(end.getTime() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      deliverables: ['최종정산서', '증빙자료'],
    });

    return milestones;
  }

  /**
   * 수행현황 마감 알림 확인
   */
  private checkExecutionDeadlines(execution: ProjectExecution): DeadlineAlert[] {
    const alerts: DeadlineAlert[] = [];
    const now = new Date();
    const thresholdDays = 14; // 14일 이내 마감

    // 마일스톤 마감 확인
    for (const milestone of execution.milestones) {
      if (milestone.status === 'completed') continue;

      const daysRemaining = Math.ceil(
        (milestone.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysRemaining <= thresholdDays && daysRemaining > 0) {
        alerts.push({
          type: 'milestone',
          name: milestone.name,
          deadline: milestone.dueDate,
          daysRemaining,
          urgency: daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : 'notice',
        });
      } else if (daysRemaining <= 0) {
        milestone.status = 'delayed';
        alerts.push({
          type: 'milestone',
          name: milestone.name,
          deadline: milestone.dueDate,
          daysRemaining,
          urgency: 'urgent',
        });
      }
    }

    // 정산 보고서 마감 확인
    for (const report of execution.settlementReports) {
      if (report.status === SettlementReportStatus.COMPLETED ||
          report.status === SettlementReportStatus.APPROVED) continue;

      // 정산 기간 종료일 + 30일을 마감으로 설정
      const deadline = new Date(report.period.end.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil(
        (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysRemaining <= thresholdDays) {
        alerts.push({
          type: 'settlement',
          name: `정산 보고서 (${report.period.start.toLocaleDateString()} ~ ${report.period.end.toLocaleDateString()})`,
          deadline,
          daysRemaining,
          urgency: daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : 'notice',
        });
      }
    }

    // 사업 종료일 확인
    const projectEndDays = Math.ceil(
      (execution.projectPeriod.end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (projectEndDays <= 30 && projectEndDays > 0) {
      alerts.push({
        type: 'project_end',
        name: '사업 종료',
        deadline: execution.projectPeriod.end,
        daysRemaining: projectEndDays,
        urgency: projectEndDays <= 7 ? 'urgent' : projectEndDays <= 14 ? 'warning' : 'notice',
      });
    }

    // 긴급도 순 정렬
    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return alerts;
  }

  /**
   * 정산 보고서 준비
   */
  private async prepareSettlementReport(
    executionId: string,
    period?: DateRange,
    options?: PostManagementTaskPayload['options']
  ): Promise<PostManagementResult> {
    const executionDb = this.getDatabase('project_executions');
    const executionResult = await executionDb.findById<ProjectExecution>(executionId);

    if (!executionResult.data) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const execution = executionResult.data;
    const now = new Date();

    // 정산 기간 설정
    const reportPeriod = period || {
      start: execution.projectPeriod.start,
      end: now,
    };

    // 집행 내역 수집 (시뮬레이션)
    const expenditures = await this.collectExpenditures(executionId, reportPeriod, options);

    // 증빙 서류 수집
    const evidenceDocuments = this.generateEvidenceDocuments(expenditures);

    // 정산 금액 계산
    const settlementAmount = expenditures.reduce((sum, e) => sum + e.amount, 0);

    // 정산 보고서 생성
    const settlementReport: SettlementReport = {
      id: `settlement-${executionId}-${now.getTime()}`,
      period: reportPeriod,
      status: SettlementReportStatus.IN_PROGRESS,
      settlementAmount,
      expenditures,
      evidenceDocuments,
      createdAt: now,
      updatedAt: now,
    };

    // 수행현황에 정산 보고서 추가
    execution.settlementReports.push(settlementReport);
    execution.spentAmount += settlementAmount;
    execution.remainingAmount = execution.totalSupportAmount - execution.spentAmount;
    execution.updatedAt = now;

    await executionDb.update(execution.id, execution);

    this.logger.info('Prepared settlement report', {
      reportId: settlementReport.id,
      amount: settlementAmount,
      expenditureCount: expenditures.length,
    });

    // 승인 요청
    const approved = await this.requestApprovalFromParent(
      '정산 보고서 검토',
      `정산 보고서가 준비되었습니다.\n\n` +
      `정산 기간: ${reportPeriod.start.toLocaleDateString()} ~ ${reportPeriod.end.toLocaleDateString()}\n` +
      `정산 금액: ${settlementAmount.toLocaleString()}원\n` +
      `집행 건수: ${expenditures.length}건\n\n` +
      `검토 후 승인해주세요.`,
      { settlementReport }
    );

    if (approved) {
      settlementReport.status = SettlementReportStatus.SUBMITTED;
      settlementReport.submittedAt = new Date();
      await executionDb.update(execution.id, execution);
    }

    return {
      execution,
      settlementReport,
      summary: {
        executionProgress: Math.round(
          (execution.milestones.filter(m => m.status === 'completed').length / execution.milestones.length) * 100
        ),
        budgetUtilization: Math.round((execution.spentAmount / execution.totalSupportAmount) * 100),
        upcomingDeadlines: 0,
      },
    };
  }

  /**
   * 집행 내역 수집
   */
  private async collectExpenditures(
    executionId: string,
    period: DateRange,
    options?: PostManagementTaskPayload['options']
  ): Promise<ExpenditureItem[]> {
    // 실제 구현에서는 회계 시스템과 연동하여 집행 내역을 수집합니다
    // 여기서는 시뮬레이션 데이터를 생성합니다

    const expenditures: ExpenditureItem[] = [];
    const categories = ['인건비', '재료비', '외주용역비', '기타경비'];

    // 시뮬레이션: 5-15개의 집행 내역 생성
    const count = Math.floor(Math.random() * 11) + 5;

    for (let i = 0; i < count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const expenditureDate = new Date(
        period.start.getTime() +
        Math.random() * (period.end.getTime() - period.start.getTime())
      );

      expenditures.push({
        id: `exp-${Date.now()}-${i}`,
        category,
        amount: Math.floor(Math.random() * 5000000) + 100000,
        expenditureDate,
        description: `${category} - ${this.generateExpenseDescription(category)}`,
      });
    }

    return expenditures;
  }

  /**
   * 비용 설명 생성
   */
  private generateExpenseDescription(category: string): string {
    const descriptions: Record<string, string[]> = {
      '인건비': ['연구원 인건비', '개발자 인건비', '프로젝트 매니저 인건비'],
      '재료비': ['원자재 구입', '샘플 제작', '시제품 제작'],
      '외주용역비': ['디자인 외주', '개발 외주', '컨설팅 용역'],
      '기타경비': ['출장비', '회의비', '사무용품'],
    };

    const options = descriptions[category] || ['기타 비용'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 증빙 서류 생성
   */
  private generateEvidenceDocuments(expenditures: ExpenditureItem[]): EvidenceDocument[] {
    return expenditures.map((exp, index) => ({
      id: `evidence-${Date.now()}-${index}`,
      type: Math.random() > 0.5 ? 'receipt' : 'invoice',
      fileName: `증빙_${exp.category}_${exp.expenditureDate.toISOString().split('T')[0]}.pdf`,
      fileUrl: `https://storage.example.com/evidence/${exp.id}.pdf`,
      amount: exp.amount,
      issueDate: exp.expenditureDate,
      linkedExpenditureIds: [exp.id],
    }));
  }

  /**
   * 결과 보고서 준비
   */
  private async prepareResultReport(
    executionId: string,
    period?: DateRange
  ): Promise<PostManagementResult> {
    const executionDb = this.getDatabase('project_executions');
    const executionResult = await executionDb.findById<ProjectExecution>(executionId);

    if (!executionResult.data) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const execution = executionResult.data;
    const now = new Date();

    // 보고서 기간 설정
    const reportPeriod = period || {
      start: execution.projectPeriod.start,
      end: now,
    };

    // 결과 유형 결정
    const projectEndDate = new Date(execution.projectPeriod.end);
    const reportType: 'interim' | 'final' =
      now >= projectEndDate ? 'final' : 'interim';

    // 성과 지표 생성
    const performanceIndicators = this.generatePerformanceIndicators();

    // 달성률 계산
    const achievementRate = Math.round(
      performanceIndicators.reduce((sum, p) => sum + p.achievementRate, 0) /
      performanceIndicators.length
    );

    // 결과 보고서 생성
    const resultReport: ResultReport = {
      id: `result-${executionId}-${now.getTime()}`,
      type: reportType,
      period: reportPeriod,
      achievementRate,
      performanceIndicators,
      keyAchievements: this.generateKeyAchievements(performanceIndicators),
      issuesAndImprovements: this.generateIssuesAndImprovements(),
      createdAt: now,
    };

    // 수행현황에 결과 보고서 추가
    execution.resultReports = execution.resultReports || [];
    execution.resultReports.push(resultReport);
    execution.updatedAt = now;

    await executionDb.update(execution.id, execution);

    this.logger.info('Prepared result report', {
      reportId: resultReport.id,
      type: reportType,
      achievementRate,
    });

    // 승인 요청
    await this.requestApprovalFromParent(
      `${reportType === 'final' ? '최종' : '중간'} 결과 보고서 검토`,
      `결과 보고서가 준비되었습니다.\n\n` +
      `보고서 유형: ${reportType === 'final' ? '최종' : '중간'} 보고서\n` +
      `보고 기간: ${reportPeriod.start.toLocaleDateString()} ~ ${reportPeriod.end.toLocaleDateString()}\n` +
      `목표 달성률: ${achievementRate}%\n\n` +
      `주요 성과:\n${resultReport.keyAchievements.map(a => `- ${a}`).join('\n')}`,
      { resultReport }
    );

    return {
      execution,
      resultReport,
      summary: {
        executionProgress: achievementRate,
        budgetUtilization: Math.round((execution.spentAmount / execution.totalSupportAmount) * 100),
        upcomingDeadlines: 0,
      },
    };
  }

  /**
   * 성과 지표 생성
   */
  private generatePerformanceIndicators(): PerformanceIndicator[] {
    return [
      {
        name: '매출 증가',
        unit: '백만원',
        targetValue: 500,
        achievedValue: Math.floor(Math.random() * 200) + 350,
        achievementRate: 0, // 아래에서 계산
      },
      {
        name: '신규 고객 확보',
        unit: '명',
        targetValue: 1000,
        achievedValue: Math.floor(Math.random() * 500) + 600,
        achievementRate: 0,
      },
      {
        name: '고용 창출',
        unit: '명',
        targetValue: 5,
        achievedValue: Math.floor(Math.random() * 3) + 3,
        achievementRate: 0,
      },
      {
        name: '제품 개발',
        unit: '종',
        targetValue: 2,
        achievedValue: Math.floor(Math.random() * 2) + 1,
        achievementRate: 0,
      },
    ].map(indicator => ({
      ...indicator,
      achievementRate: Math.min(100, Math.round((indicator.achievedValue / indicator.targetValue) * 100)),
    }));
  }

  /**
   * 주요 성과 생성
   */
  private generateKeyAchievements(indicators: PerformanceIndicator[]): string[] {
    const achievements: string[] = [];

    for (const indicator of indicators) {
      if (indicator.achievementRate >= 100) {
        achievements.push(`${indicator.name} 목표 달성 (${indicator.achievedValue}${indicator.unit})`);
      } else if (indicator.achievementRate >= 80) {
        achievements.push(`${indicator.name} 목표 근접 (${indicator.achievementRate}% 달성)`);
      }
    }

    achievements.push('사업 관리 체계 구축 완료');
    achievements.push('파트너십 네트워크 확대');

    return achievements;
  }

  /**
   * 문제점 및 개선사항 생성
   */
  private generateIssuesAndImprovements(): string[] {
    return [
      '초기 사업 착수 지연으로 일정 조정 필요',
      '일부 외주 업체 선정 과정에서 시간 소요',
      '향후 유사 사업 시 사전 준비 기간 확보 필요',
      '정산 프로세스 개선을 통한 효율성 제고',
    ];
  }

  /**
   * 마감 확인
   */
  private async checkDeadlines(
    options?: PostManagementTaskPayload['options']
  ): Promise<PostManagementResult> {
    const executionDb = this.getDatabase('project_executions');
    const executionsResult = await executionDb.findByCondition<ProjectExecution>({});
    const executions = (executionsResult.data || []).filter(e => e.status === 'active');

    const allAlerts: DeadlineAlert[] = [];
    const thresholdDays = options?.deadlineThresholdDays || 14;

    for (const execution of executions) {
      const alerts = this.checkExecutionDeadlines(execution);
      allAlerts.push(...alerts.filter(a => a.daysRemaining <= thresholdDays));
    }

    // 긴급도 순 정렬
    allAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // 긴급 알림 발송
    if (options?.notifyDeadlines) {
      const urgentAlerts = allAlerts.filter(a => a.urgency === 'urgent');

      if (urgentAlerts.length > 0) {
        await this.notifyParent(
          '긴급: 지원사업 마감 임박',
          `${urgentAlerts.length}건의 마감이 임박했습니다.\n\n` +
          urgentAlerts.slice(0, 5).map(a =>
            `- ${a.name}: ${a.daysRemaining <= 0 ? '마감 초과' : `${a.daysRemaining}일 남음`}`
          ).join('\n'),
          'urgent'
        );
      }
    }

    this.logger.info('Checked deadlines', {
      totalAlerts: allAlerts.length,
      urgent: allAlerts.filter(a => a.urgency === 'urgent').length,
    });

    return {
      deadlineAlerts: allAlerts,
      summary: {
        executionProgress: 0,
        budgetUtilization: 0,
        upcomingDeadlines: allAlerts.length,
      },
    };
  }
}

export default PostManagementSubAgent;
