/**
 * 대응 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 침해대응, 법적조치 에스컬레이션을 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  ApprovalLevel,
} from '../../types';
import {
  InfringementCase,
  InfringementSeverity,
  ResponseStatus,
  ResponseAction,
  ResponseActionType,
  LegalEscalation,
  WarningLetterTemplate,
  InfringementResponseTaskPayload,
  InfringementResponseResult,
} from './types';

/**
 * 경고장 템플릿
 */
const WARNING_TEMPLATES: WarningLetterTemplate[] = [
  {
    id: 'trademark-warning-ko',
    name: '상표권 침해 경고장 (한국어)',
    infringementType: 'trademark_misuse',
    subjectTemplate: '[경고] 상표권 침해에 대한 즉각적인 시정 요청',
    bodyTemplate: `
안녕하세요, {infringer_name} 담당자님.

본 서신은 귀하의 판매 활동이 당사의 등록 상표권을 침해하고 있음을 알려드리기 위해 발송합니다.

■ 침해 상표 정보
- 상표명: {trademark_name}
- 등록번호: {registration_number}
- 권리자: 썬데이허그

■ 침해 내용
- 침해 상품: {infringing_product}
- 판매 플랫폼: {platform}
- 발견 일시: {detected_date}

귀하의 상기 행위는 상표법 제108조에 의거 상표권 침해에 해당하며, 7년 이하의 징역 또는 1억원 이하의 벌금에 처해질 수 있습니다.

이에 본 서신을 수령한 날로부터 3일 이내에 다음 조치를 취해주시기 바랍니다:
1. 해당 상품의 판매 즉시 중단
2. 상표가 부착된 모든 재고의 폐기
3. 향후 동일/유사 상표 사용 금지

상기 기한 내 시정 조치가 이루어지지 않을 경우, 당사는 민·형사상 법적 절차를 진행할 것임을 알려드립니다.

감사합니다.

썬데이허그 법무팀
    `,
    variables: ['infringer_name', 'trademark_name', 'registration_number', 'infringing_product', 'platform', 'detected_date'],
    language: 'ko',
  },
];

/**
 * 대응 서브에이전트 클래스
 */
export class InfringementResponseSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Infringement Response SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<InfringementResponseResult>> {
    const startTime = Date.now();
    const payload = context.data as InfringementResponseTaskPayload;

    this.logger.info('Running Infringement Response SubAgent', {
      action: payload.action,
    });

    try {
      let result: InfringementResponseResult;

      switch (payload.action) {
        case 'take_action':
          result = await this.takeAction(payload.caseId!, payload.actionType, payload.options);
          break;

        case 'send_warning':
          result = await this.sendWarningLetter(payload.caseId!, payload.options?.templateId as string);
          break;

        case 'request_takedown':
          result = await this.requestTakedown(payload.caseIds || [payload.caseId!]);
          break;

        case 'escalate':
          result = await this.escalateCase(payload.caseId!, payload.options);
          break;

        case 'generate_report':
          result = await this.generateResponseReport();
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Infringement response failed', error as Error);
      throw error;
    }
  }

  /**
   * 대응 조치
   */
  private async takeAction(
    caseId: string,
    actionType?: ResponseActionType,
    options?: InfringementResponseTaskPayload['options']
  ): Promise<InfringementResponseResult> {
    const db = this.getDatabase('infringement_cases');
    const caseResult = await db.findById<InfringementCase>(caseId);

    if (!caseResult.data) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const caseItem = caseResult.data;

    // 적절한 조치 결정
    const selectedAction = actionType || this.determineAppropriateAction(caseItem);

    // 승인이 필요한 조치 확인
    if (this.requiresApproval(selectedAction)) {
      const approved = await this.requestApprovalFromParent(
        `침해 대응 승인 요청: ${selectedAction}`,
        `케이스 ${caseItem.id}에 대해 ${this.getActionName(selectedAction)} 조치를 진행합니다.\n` +
        `침해 유형: ${caseItem.type}\n` +
        `심각도: ${caseItem.severity}\n` +
        `침해자: ${caseItem.infringer.name}`,
        { case: caseItem, action: selectedAction }
      );

      if (!approved) {
        throw new Error('Response action was not approved');
      }
    }

    // 조치 수행
    const action = await this.performAction(caseItem, selectedAction);

    // 케이스 상태 업데이트
    this.updateCaseStatus(caseItem, selectedAction);
    caseItem.responseHistory = [...(caseItem.responseHistory || []), action];
    caseItem.updatedAt = new Date();

    await db.update(caseItem.id, caseItem);

    this.logger.info(`Performed action on case ${caseItem.id}: ${selectedAction}`);

    return {
      processedCases: [caseItem],
      actionsPerformed: [action],
      summary: this.calculateSummary([action]),
    };
  }

  /**
   * 적절한 조치 결정
   */
  private determineAppropriateAction(caseItem: InfringementCase): ResponseActionType {
    // 이미 경고장을 보낸 경우
    const hasWarning = caseItem.responseHistory?.some(
      a => a.actionType === 'warning_letter' || a.actionType === 'cease_desist'
    );

    // 심각도에 따른 조치 결정
    switch (caseItem.severity) {
      case InfringementSeverity.CRITICAL:
        return hasWarning ? 'legal_consultation' : 'cease_desist';

      case InfringementSeverity.HIGH:
        return hasWarning ? 'platform_report' : 'warning_letter';

      case InfringementSeverity.MEDIUM:
        return hasWarning ? 'takedown_request' : 'warning_letter';

      case InfringementSeverity.LOW:
      default:
        return hasWarning ? 'case_closed' : 'internal_review';
    }
  }

  /**
   * 승인 필요 여부 확인
   */
  private requiresApproval(actionType: ResponseActionType): boolean {
    const approvalRequired: ResponseActionType[] = [
      'legal_consultation',
      'lawsuit_filing',
      'settlement',
      'customs_report',
      'escalation',
    ];

    return approvalRequired.includes(actionType);
  }

  /**
   * 조치 수행
   */
  private async performAction(
    caseItem: InfringementCase,
    actionType: ResponseActionType
  ): Promise<ResponseAction> {
    const now = new Date();

    const action: ResponseAction = {
      id: `action-${now.getTime()}`,
      caseId: caseItem.id,
      actionType,
      status: 'completed',
      actionDate: now,
      details: this.generateActionDetails(caseItem, actionType),
      createdAt: now,
    };

    // 조치별 추가 처리
    switch (actionType) {
      case 'warning_letter':
      case 'cease_desist':
        // 경고장 발송 로직 (실제로는 이메일 발송)
        this.logger.info(`Sending ${actionType} to ${caseItem.infringer.name}`);
        break;

      case 'platform_report':
      case 'takedown_request':
        // 플랫폼 신고 로직 (실제로는 API 호출)
        this.logger.info(`Reporting to platform: ${caseItem.channel}`);
        break;

      case 'legal_consultation':
        // 법률 상담 예약 로직
        this.logger.info('Scheduling legal consultation');
        break;

      default:
        break;
    }

    return action;
  }

  /**
   * 조치 상세 생성
   */
  private generateActionDetails(
    caseItem: InfringementCase,
    actionType: ResponseActionType
  ): string {
    const details: Record<ResponseActionType, string> = {
      'internal_review': `케이스 ${caseItem.id}에 대한 내부 검토 완료`,
      'warning_letter': `${caseItem.infringer.name}에게 경고장 발송`,
      'cease_desist': `${caseItem.infringer.name}에게 중지 요청서 발송`,
      'platform_report': `${caseItem.channel} 플랫폼에 침해 신고 접수`,
      'takedown_request': `${caseItem.channel} 플랫폼에 삭제 요청`,
      'legal_consultation': '법률 자문 요청 완료',
      'lawsuit_filing': '소송 제기 준비 시작',
      'settlement': '합의 협상 시작',
      'customs_report': '세관 신고 접수',
      'escalation': '법무팀 에스컬레이션',
      'case_closed': '케이스 종료 처리',
    };

    return details[actionType] || `${actionType} 조치 수행`;
  }

  /**
   * 케이스 상태 업데이트
   */
  private updateCaseStatus(caseItem: InfringementCase, actionType: ResponseActionType): void {
    const statusMap: Partial<Record<ResponseActionType, ResponseStatus>> = {
      'internal_review': ResponseStatus.UNDER_REVIEW,
      'warning_letter': ResponseStatus.WARNING_SENT,
      'cease_desist': ResponseStatus.WARNING_SENT,
      'platform_report': ResponseStatus.TAKEDOWN_REQUESTED,
      'takedown_request': ResponseStatus.TAKEDOWN_REQUESTED,
      'legal_consultation': ResponseStatus.LEGAL_ACTION,
      'lawsuit_filing': ResponseStatus.LEGAL_ACTION,
      'escalation': ResponseStatus.ESCALATED,
      'case_closed': ResponseStatus.RESOLVED,
    };

    if (statusMap[actionType]) {
      caseItem.status = statusMap[actionType]!;
    }
  }

  /**
   * 경고장 발송
   */
  private async sendWarningLetter(
    caseId: string,
    templateId?: string
  ): Promise<InfringementResponseResult> {
    const db = this.getDatabase('infringement_cases');
    const caseResult = await db.findById<InfringementCase>(caseId);

    if (!caseResult.data) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const caseItem = caseResult.data;
    const template = templateId
      ? WARNING_TEMPLATES.find(t => t.id === templateId)
      : WARNING_TEMPLATES[0];

    if (!template) {
      throw new Error('Warning letter template not found');
    }

    // 템플릿 변수 치환
    let content = template.bodyTemplate;
    content = content.replace('{infringer_name}', caseItem.infringer.name);
    content = content.replace('{trademark_name}', caseItem.affectedIP.name);
    content = content.replace('{registration_number}', caseItem.affectedIP.registrationNumber);
    content = content.replace('{infringing_product}', caseItem.infringedItem.name);
    content = content.replace('{platform}', caseItem.channel);
    content = content.replace('{detected_date}', caseItem.detectedAt.toString());

    // 경고장 발송 (실제로는 이메일/우편 발송)
    this.logger.info('Warning letter prepared', {
      caseId,
      infringer: caseItem.infringer.name,
      template: template.id,
    });

    return await this.takeAction(caseId, 'warning_letter');
  }

  /**
   * 삭제 요청
   */
  private async requestTakedown(caseIds: string[]): Promise<InfringementResponseResult> {
    const processedCases: InfringementCase[] = [];
    const actionsPerformed: ResponseAction[] = [];

    for (const caseId of caseIds) {
      try {
        const result = await this.takeAction(caseId, 'takedown_request');
        if (result.processedCases) processedCases.push(...result.processedCases);
        if (result.actionsPerformed) actionsPerformed.push(...result.actionsPerformed);
      } catch (error) {
        this.logger.error(`Failed to request takedown for ${caseId}`, error as Error);
      }
    }

    return {
      processedCases,
      actionsPerformed,
      summary: this.calculateSummary(actionsPerformed),
    };
  }

  /**
   * 에스컬레이션
   */
  private async escalateCase(
    caseId: string,
    options?: InfringementResponseTaskPayload['options']
  ): Promise<InfringementResponseResult> {
    const db = this.getDatabase('infringement_cases');
    const caseResult = await db.findById<InfringementCase>(caseId);

    if (!caseResult.data) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const caseItem = caseResult.data;

    // 에스컬레이션 생성
    const escalation: LegalEscalation = {
      id: `escalation-${Date.now()}`,
      caseId,
      reason: `${caseItem.severity} 심각도 침해 건에 대한 법적 조치 검토 필요`,
      recommendedAction: 'legal_consultation',
      estimatedCost: this.estimateLegalCost(caseItem),
      legalConsultationRequired: true,
      ceoApprovalRequired: caseItem.severity === InfringementSeverity.CRITICAL,
      status: 'pending',
      createdAt: new Date(),
    };

    // 에스컬레이션 저장
    const escalationDb = this.getDatabase('legal_escalations');
    await escalationDb.create(escalation);

    // 케이스 상태 업데이트
    caseItem.status = ResponseStatus.ESCALATED;
    caseItem.updatedAt = new Date();
    await db.update(caseItem.id, caseItem);

    // 긴급 알림
    await this.notifyParent(
      '법적 조치 에스컬레이션',
      `케이스 ${caseItem.id}가 법적 조치 검토를 위해 에스컬레이션되었습니다.\n` +
      `침해 유형: ${caseItem.type}\n` +
      `심각도: ${caseItem.severity}\n` +
      `예상 법적 비용: ${escalation.estimatedCost?.toLocaleString()}원`,
      'urgent'
    );

    this.logger.info(`Case escalated: ${caseId}`);

    return {
      processedCases: [caseItem],
      escalations: [escalation],
      summary: {
        casesProcessed: 1,
        warningsSent: 0,
        takedownsRequested: 0,
        escalated: 1,
        resolved: 0,
      },
    };
  }

  /**
   * 법적 비용 추정
   */
  private estimateLegalCost(caseItem: InfringementCase): number {
    const baseCosts: Record<InfringementSeverity, number> = {
      [InfringementSeverity.CRITICAL]: 5000000,
      [InfringementSeverity.HIGH]: 3000000,
      [InfringementSeverity.MEDIUM]: 1500000,
      [InfringementSeverity.LOW]: 500000,
    };

    return baseCosts[caseItem.severity];
  }

  /**
   * 대응 리포트 생성
   */
  private async generateResponseReport(): Promise<InfringementResponseResult> {
    const db = this.getDatabase('infringement_cases');
    const casesResult = await db.findByCondition<InfringementCase>({});
    const cases = casesResult.data || [];

    // 최근 30일 조치 통계
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actionsInPeriod: ResponseAction[] = [];
    for (const caseItem of cases) {
      const recentActions = (caseItem.responseHistory || []).filter(
        a => new Date(a.actionDate) >= thirtyDaysAgo
      );
      actionsInPeriod.push(...recentActions);
    }

    return {
      processedCases: cases,
      actionsPerformed: actionsInPeriod,
      summary: this.calculateSummary(actionsInPeriod),
    };
  }

  /**
   * 요약 계산
   */
  private calculateSummary(actions: ResponseAction[]): InfringementResponseResult['summary'] {
    return {
      casesProcessed: actions.length,
      warningsSent: actions.filter(
        a => a.actionType === 'warning_letter' || a.actionType === 'cease_desist'
      ).length,
      takedownsRequested: actions.filter(
        a => a.actionType === 'takedown_request' || a.actionType === 'platform_report'
      ).length,
      escalated: actions.filter(a => a.actionType === 'escalation').length,
      resolved: actions.filter(a => a.actionType === 'case_closed').length,
    };
  }

  /**
   * 조치명 조회
   */
  private getActionName(actionType: ResponseActionType): string {
    const names: Record<ResponseActionType, string> = {
      'internal_review': '내부 검토',
      'warning_letter': '경고장 발송',
      'cease_desist': '중지 요청서 발송',
      'platform_report': '플랫폼 신고',
      'takedown_request': '삭제 요청',
      'legal_consultation': '법률 자문',
      'lawsuit_filing': '소송 제기',
      'settlement': '합의',
      'customs_report': '세관 신고',
      'escalation': '에스컬레이션',
      'case_closed': '케이스 종료',
    };

    return names[actionType] || actionType;
  }
}

export default InfringementResponseSubAgent;
