/**
 * 신청지원 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 서류준비, 사업계획서 초안작성을 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
} from '../../types';
import {
  SupportProgram,
  ProgramApplication,
  ApplicationStatus,
  RequiredDocument,
  BusinessPlan,
  BusinessPlanTimeline,
  BusinessPlanBudget,
  BudgetItem,
  ApplicationSupportTaskPayload,
  ApplicationSupportResult,
} from './types';

/**
 * 공통 필요 서류 목록
 */
const COMMON_REQUIRED_DOCUMENTS: Omit<RequiredDocument, 'id'>[] = [
  { name: '사업자등록증 사본', mandatory: true, status: 'not_started' },
  { name: '법인등기부등본', mandatory: true, status: 'not_started' },
  { name: '중소기업확인서', mandatory: true, status: 'not_started' },
  { name: '재무제표 (최근 3개년)', mandatory: true, status: 'not_started' },
  { name: '국세/지방세 납세증명서', mandatory: true, status: 'not_started' },
  { name: '4대보험 가입증명서', mandatory: false, status: 'not_started' },
  { name: '대표자 신분증 사본', mandatory: true, status: 'not_started' },
  { name: '통장 사본', mandatory: true, status: 'not_started' },
];

/**
 * 신청지원 서브에이전트 클래스
 */
export class ApplicationSupportSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Application Support SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<ApplicationSupportResult>> {
    const startTime = Date.now();
    const payload = context.data as ApplicationSupportTaskPayload;

    this.logger.info('Running Application Support SubAgent', {
      action: payload.action,
    });

    try {
      let result: ApplicationSupportResult;

      switch (payload.action) {
        case 'prepare_documents':
          result = await this.prepareDocuments(payload.programId!, payload.options);
          break;

        case 'draft_business_plan':
          result = await this.draftBusinessPlan(
            payload.programId!,
            payload.businessPlanInput
          );
          break;

        case 'submit':
          result = await this.submitApplication(payload.applicationId!);
          break;

        case 'check_status':
          result = await this.checkApplicationStatus(payload.applicationId);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Application support failed', error as Error);
      throw error;
    }
  }

  /**
   * 서류 준비
   */
  private async prepareDocuments(
    programId: string,
    options?: ApplicationSupportTaskPayload['options']
  ): Promise<ApplicationSupportResult> {
    const programDb = this.getDatabase('support_programs');
    const applicationDb = this.getDatabase('program_applications');

    // 지원사업 조회
    const programResult = await programDb.findById<SupportProgram>(programId);
    if (!programResult.data) {
      throw new Error(`Program not found: ${programId}`);
    }

    const program = programResult.data;
    const now = new Date();

    // 필요 서류 목록 생성
    const requiredDocuments: RequiredDocument[] = COMMON_REQUIRED_DOCUMENTS.map((doc, index) => ({
      ...doc,
      id: `doc-${now.getTime()}-${index}`,
    }));

    // 사업유형별 추가 서류
    const additionalDocs = this.getAdditionalDocuments(program);
    requiredDocuments.push(...additionalDocs);

    // 자동 서류 수집 (시뮬레이션)
    if (options?.autoCollectDocuments) {
      for (const doc of requiredDocuments) {
        // 시뮬레이션: 일부 서류는 자동으로 준비됨
        if (Math.random() > 0.3) {
          doc.status = 'completed';
          doc.fileUrl = `https://storage.example.com/docs/${doc.id}.pdf`;
        } else {
          doc.status = 'in_progress';
        }
      }
    }

    // 신청 생성 또는 업데이트
    const applicationId = `app-${programId}-${now.getTime()}`;
    const application: ProgramApplication = {
      id: applicationId,
      programId,
      programName: program.name,
      status: ApplicationStatus.DRAFT,
      deadline: program.applicationPeriod.end,
      requiredDocuments,
      createdAt: now,
      updatedAt: now,
    };

    await applicationDb.create(application);

    // 준비 현황 계산
    const completedDocs = requiredDocuments.filter(d => d.status === 'completed');
    const readinessRate = Math.round((completedDocs.length / requiredDocuments.length) * 100);

    this.logger.info('Prepared documents', {
      applicationId,
      total: requiredDocuments.length,
      completed: completedDocs.length,
      readinessRate,
    });

    // 준비가 많이 남은 경우 알림
    if (readinessRate < 50) {
      const daysUntilDeadline = Math.ceil(
        (program.applicationPeriod.end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntilDeadline <= 7) {
        await this.notifyParent(
          '서류 준비 필요',
          `${program.name} 신청 마감까지 ${daysUntilDeadline}일 남았습니다.\n` +
          `서류 준비율: ${readinessRate}%\n` +
          `미완료 서류: ${requiredDocuments.filter(d => d.status !== 'completed').map(d => d.name).join(', ')}`,
          'high'
        );
      }
    }

    return {
      application,
      preparedDocuments: requiredDocuments,
      summary: {
        documentsReady: completedDocs.length,
        documentsTotal: requiredDocuments.length,
        readinessRate,
      },
    };
  }

  /**
   * 사업유형별 추가 서류
   */
  private getAdditionalDocuments(program: SupportProgram): RequiredDocument[] {
    const additionalDocs: RequiredDocument[] = [];
    const now = Date.now();

    switch (program.type) {
      case 'r_and_d':
        additionalDocs.push(
          { id: `doc-${now}-a1`, name: '연구개발계획서', mandatory: true, status: 'not_started' },
          { id: `doc-${now}-a2`, name: '기술현황서', mandatory: true, status: 'not_started' },
          { id: `doc-${now}-a3`, name: '선행기술조사서', mandatory: false, status: 'not_started' }
        );
        break;
      case 'export':
        additionalDocs.push(
          { id: `doc-${now}-a1`, name: '수출실적증명서', mandatory: true, status: 'not_started' },
          { id: `doc-${now}-a2`, name: '해외바이어 정보', mandatory: false, status: 'not_started' }
        );
        break;
      case 'marketing':
        additionalDocs.push(
          { id: `doc-${now}-a1`, name: '마케팅 계획서', mandatory: true, status: 'not_started' },
          { id: `doc-${now}-a2`, name: '제품/서비스 소개서', mandatory: true, status: 'not_started' }
        );
        break;
      case 'facility':
        additionalDocs.push(
          { id: `doc-${now}-a1`, name: '시설투자계획서', mandatory: true, status: 'not_started' },
          { id: `doc-${now}-a2`, name: '견적서', mandatory: true, status: 'not_started' },
          { id: `doc-${now}-a3`, name: '임대차계약서', mandatory: false, status: 'not_started' }
        );
        break;
    }

    return additionalDocs;
  }

  /**
   * 사업계획서 초안 작성
   */
  private async draftBusinessPlan(
    programId: string,
    input?: Partial<BusinessPlan>
  ): Promise<ApplicationSupportResult> {
    const programDb = this.getDatabase('support_programs');
    const applicationDb = this.getDatabase('program_applications');

    // 지원사업 조회
    const programResult = await programDb.findById<SupportProgram>(programId);
    if (!programResult.data) {
      throw new Error(`Program not found: ${programId}`);
    }

    const program = programResult.data;
    const now = new Date();

    // 사업계획서 초안 생성
    const businessPlan = this.generateBusinessPlanDraft(program, input);

    // 관련 신청 조회 또는 생성
    const applicationsResult = await applicationDb.findByCondition<ProgramApplication>({});
    let application = (applicationsResult.data || []).find(a => a.programId === programId);

    if (application) {
      application.businessPlan = businessPlan;
      application.updatedAt = now;
      await applicationDb.update(application.id, application);
    } else {
      application = {
        id: `app-${programId}-${now.getTime()}`,
        programId,
        programName: program.name,
        status: ApplicationStatus.DRAFT,
        deadline: program.applicationPeriod.end,
        requiredDocuments: [],
        businessPlan,
        createdAt: now,
        updatedAt: now,
      };
      await applicationDb.create(application);
    }

    this.logger.info('Drafted business plan', {
      applicationId: application.id,
      projectName: businessPlan.projectName,
      version: businessPlan.version,
    });

    // 승인 요청
    const approved = await this.requestApprovalFromParent(
      '사업계획서 초안 검토',
      `${program.name}용 사업계획서 초안이 작성되었습니다.\n\n` +
      `사업명: ${businessPlan.projectName}\n` +
      `사업 개요: ${businessPlan.summary}\n` +
      `총 사업비: ${businessPlan.budget.totalAmount.toLocaleString()}원\n` +
      `정부지원금: ${businessPlan.budget.governmentSupport.toLocaleString()}원\n\n` +
      `검토 후 승인해주세요.`,
      { businessPlan }
    );

    if (approved) {
      businessPlan.status = 'in_review';
      application.businessPlan = businessPlan;
      await applicationDb.update(application.id, application);
    }

    return {
      application,
      businessPlan,
      summary: {
        documentsReady: 0,
        documentsTotal: 0,
        readinessRate: 0,
      },
    };
  }

  /**
   * 사업계획서 초안 생성
   */
  private generateBusinessPlanDraft(
    program: SupportProgram,
    input?: Partial<BusinessPlan>
  ): BusinessPlan {
    const now = new Date();

    // 프로젝트 기간 설정
    const projectStart = program.projectPeriod?.start || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const projectEnd = program.projectPeriod?.end || new Date(projectStart.getTime() + 180 * 24 * 60 * 60 * 1000);

    // 기본 타임라인 생성
    const timeline = this.generateTimeline(projectStart, projectEnd);

    // 기본 예산 생성
    const budget = this.generateBudget(program);

    const businessPlan: BusinessPlan = {
      id: `bp-${now.getTime()}`,
      projectName: input?.projectName || `썬데이허그 ${program.type} 사업`,
      summary: input?.summary || this.generateSummary(program),
      objectives: input?.objectives || this.generateObjectives(program),
      strategies: input?.strategies || this.generateStrategies(program),
      timeline: input?.timeline || timeline,
      budget: input?.budget || budget,
      expectedOutcomes: input?.expectedOutcomes || this.generateExpectedOutcomes(program),
      status: 'draft',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return businessPlan;
  }

  /**
   * 사업 개요 생성
   */
  private generateSummary(program: SupportProgram): string {
    const templates: Record<string, string> = {
      r_and_d: '본 사업은 유아용품 분야의 혁신 기술 개발을 통해 제품 경쟁력을 강화하고 시장 점유율을 확대하고자 합니다.',
      export: '본 사업은 해외 시장 진출을 통한 매출 다변화 및 글로벌 브랜드 인지도 제고를 목표로 합니다.',
      marketing: '본 사업은 디지털 마케팅 역량 강화를 통해 온라인 채널 매출을 확대하고 브랜드 가치를 높이고자 합니다.',
      facility: '본 사업은 생산 시설 현대화를 통해 생산성을 향상시키고 품질 경쟁력을 강화하고자 합니다.',
      subsidy: '본 사업은 경영 혁신 활동을 통해 기업 성장 기반을 구축하고 지속 가능한 발전을 도모하고자 합니다.',
    };

    return templates[program.type] || templates.subsidy;
  }

  /**
   * 사업 목표 생성
   */
  private generateObjectives(program: SupportProgram): string[] {
    const baseObjectives = [
      '매출액 20% 성장 달성',
      '신규 고객 1,000명 확보',
      '브랜드 인지도 30% 향상',
    ];

    const typeSpecificObjectives: Record<string, string[]> = {
      r_and_d: ['신제품 2종 개발 완료', '특허 1건 출원'],
      export: ['해외 매출 비중 10% 달성', '신규 해외 바이어 5개사 확보'],
      marketing: ['온라인 매출 50% 증가', 'SNS 팔로워 10,000명 확보'],
      facility: ['생산성 30% 향상', '불량률 50% 감소'],
    };

    return [
      ...baseObjectives,
      ...(typeSpecificObjectives[program.type] || []),
    ];
  }

  /**
   * 추진 전략 생성
   */
  private generateStrategies(program: SupportProgram): string[] {
    return [
      '전문 인력 확보 및 역량 강화',
      '데이터 기반 의사결정 체계 구축',
      '고객 중심 제품/서비스 개선',
      '파트너십 확대 및 협력 네트워크 강화',
      '지속적인 품질 관리 및 개선',
    ];
  }

  /**
   * 타임라인 생성
   */
  private generateTimeline(start: Date, end: Date): BusinessPlanTimeline[] {
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const phaseDays = Math.floor(totalDays / 3);

    const phases: BusinessPlanTimeline[] = [
      {
        phase: '1단계: 준비 및 기반 구축',
        activities: ['사업 환경 분석', '인력 및 자원 확보', '세부 계획 수립'],
        startDate: start,
        endDate: new Date(start.getTime() + phaseDays * 24 * 60 * 60 * 1000),
        deliverables: ['환경분석 보고서', '실행계획서'],
      },
      {
        phase: '2단계: 본격 추진',
        activities: ['핵심 과제 실행', '중간 점검 및 보완', '성과 관리'],
        startDate: new Date(start.getTime() + phaseDays * 24 * 60 * 60 * 1000),
        endDate: new Date(start.getTime() + phaseDays * 2 * 24 * 60 * 60 * 1000),
        deliverables: ['중간보고서', '진척도 보고'],
      },
      {
        phase: '3단계: 완료 및 정착',
        activities: ['성과 종합', '결과 분석', '후속 계획 수립'],
        startDate: new Date(start.getTime() + phaseDays * 2 * 24 * 60 * 60 * 1000),
        endDate: end,
        deliverables: ['최종보고서', '성과분석서'],
      },
    ];

    return phases;
  }

  /**
   * 예산 생성
   */
  private generateBudget(program: SupportProgram): BusinessPlanBudget {
    // 지원 금액에서 총 사업비 추정
    let totalAmount = 50000000; // 기본 5천만원
    if (program.supportDetails.amount) {
      const match = program.supportDetails.amount.match(/(\d+)/);
      if (match) {
        totalAmount = parseInt(match[1]) * 10000000; // 천만원 단위로 가정
      }
    }

    // 지원 비율에서 정부지원금 계산
    let supportRatio = 0.7; // 기본 70%
    if (program.supportDetails.supportRatio) {
      const match = program.supportDetails.supportRatio.match(/(\d+)/);
      if (match) {
        supportRatio = parseInt(match[1]) / 100;
      }
    }

    const governmentSupport = Math.round(totalAmount * supportRatio);
    const selfContribution = totalAmount - governmentSupport;

    const breakdown: BudgetItem[] = [
      { category: '인건비', amount: Math.round(totalAmount * 0.4), justification: '전담인력 인건비' },
      { category: '재료비', amount: Math.round(totalAmount * 0.2), justification: '원자재 및 시제품 제작' },
      { category: '외주용역비', amount: Math.round(totalAmount * 0.15), justification: '전문업체 위탁' },
      { category: '기타경비', amount: Math.round(totalAmount * 0.25), justification: '기타 사업비' },
    ];

    return {
      totalAmount,
      governmentSupport,
      selfContribution,
      breakdown,
    };
  }

  /**
   * 기대효과 생성
   */
  private generateExpectedOutcomes(program: SupportProgram): string[] {
    return [
      '매출 증대를 통한 기업 경쟁력 강화',
      '고용 창출 및 지역 경제 기여',
      '기술/역량 향상을 통한 지속 성장 기반 마련',
      '고객 만족도 향상 및 브랜드 가치 제고',
    ];
  }

  /**
   * 신청 제출
   */
  private async submitApplication(applicationId: string): Promise<ApplicationSupportResult> {
    const applicationDb = this.getDatabase('program_applications');
    const applicationResult = await applicationDb.findById<ProgramApplication>(applicationId);

    if (!applicationResult.data) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const application = applicationResult.data;
    const now = new Date();

    // 서류 준비 상태 확인
    const incompleteDocs = application.requiredDocuments.filter(
      d => d.mandatory && d.status !== 'completed'
    );

    if (incompleteDocs.length > 0) {
      throw new Error(
        `필수 서류가 준비되지 않았습니다: ${incompleteDocs.map(d => d.name).join(', ')}`
      );
    }

    // 사업계획서 확인
    if (!application.businessPlan) {
      throw new Error('사업계획서가 작성되지 않았습니다.');
    }

    // 제출 승인 요청
    const approved = await this.requestApprovalFromParent(
      '지원사업 신청 제출 승인',
      `${application.programName} 신청을 제출합니다.\n\n` +
      `신청 마감일: ${application.deadline.toLocaleDateString()}\n` +
      `준비 서류: ${application.requiredDocuments.filter(d => d.status === 'completed').length}/${application.requiredDocuments.length}개\n` +
      `사업계획서: ${application.businessPlan.projectName}\n\n` +
      `제출을 승인하시겠습니까?`,
      { application }
    );

    if (!approved) {
      throw new Error('신청 제출이 승인되지 않았습니다.');
    }

    // 상태 업데이트
    application.status = ApplicationStatus.SUBMITTED;
    application.appliedAt = now;
    application.updatedAt = now;

    await applicationDb.update(application.id, application);

    this.logger.info('Submitted application', {
      applicationId: application.id,
      programName: application.programName,
    });

    await this.notifyParent(
      '지원사업 신청 완료',
      `${application.programName} 신청이 완료되었습니다.\n` +
      `신청일: ${now.toLocaleDateString()}\n` +
      `심사 결과는 별도 안내될 예정입니다.`,
      'medium'
    );

    return {
      application,
      summary: {
        documentsReady: application.requiredDocuments.filter(d => d.status === 'completed').length,
        documentsTotal: application.requiredDocuments.length,
        readinessRate: 100,
      },
    };
  }

  /**
   * 신청 상태 확인
   */
  private async checkApplicationStatus(applicationId?: string): Promise<ApplicationSupportResult> {
    const applicationDb = this.getDatabase('program_applications');

    if (applicationId) {
      const applicationResult = await applicationDb.findById<ProgramApplication>(applicationId);
      if (!applicationResult.data) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      const application = applicationResult.data;
      const completedDocs = application.requiredDocuments.filter(d => d.status === 'completed');

      return {
        application,
        preparedDocuments: application.requiredDocuments,
        businessPlan: application.businessPlan,
        summary: {
          documentsReady: completedDocs.length,
          documentsTotal: application.requiredDocuments.length,
          readinessRate: Math.round((completedDocs.length / application.requiredDocuments.length) * 100),
        },
      };
    }

    // 전체 신청 현황
    const applicationsResult = await applicationDb.findByCondition<ProgramApplication>({});
    const applications = applicationsResult.data || [];

    const activeApplications = applications.filter(
      a => a.status !== ApplicationStatus.REJECTED &&
           a.status !== ApplicationStatus.CANCELLED
    );

    this.logger.info('Checked application status', {
      total: applications.length,
      active: activeApplications.length,
    });

    return {
      summary: {
        documentsReady: 0,
        documentsTotal: 0,
        readinessRate: 0,
      },
    };
  }
}

export default ApplicationSupportSubAgent;
