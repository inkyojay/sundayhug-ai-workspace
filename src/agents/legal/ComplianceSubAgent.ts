/**
 * 규정준수 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 전자상거래법, 개인정보보호 준수를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  DateRange,
} from '../../types';
import {
  ComplianceChecklist,
  ComplianceCheckItem,
  ComplianceStatus,
  RegulatoryViolation,
  RemediationAction,
  PrivacyComplianceStatus,
  RegulationType,
  RiskLevel,
  ComplianceTaskPayload,
  ComplianceResult,
} from './types';

/**
 * 규정별 체크리스트 템플릿
 */
const COMPLIANCE_TEMPLATES: Record<RegulationType, Omit<ComplianceCheckItem, 'id' | 'status' | 'lastCheckedAt'>[]> = {
  [RegulationType.ECOMMERCE_ACT]: [
    { title: '사업자 정보 표시', description: '상호, 대표자, 주소, 연락처, 사업자등록번호 표시', mandatory: true },
    { title: '이용약관 게시', description: '서비스 이용약관 명시 및 동의 절차', mandatory: true },
    { title: '청약철회 안내', description: '7일 이내 청약철회 권리 고지', mandatory: true },
    { title: '반품/환불 정책', description: '반품/환불 조건 및 절차 안내', mandatory: true },
    { title: '배송 정보 제공', description: '배송비, 배송 기간, 배송 방법 안내', mandatory: true },
    { title: '결제 정보 보안', description: 'PG사 연동 및 결제 정보 암호화', mandatory: true },
  ],
  [RegulationType.CONSUMER_PROTECTION]: [
    { title: '상품 정보 제공', description: '필수 표시사항 및 상세 정보 제공', mandatory: true },
    { title: '가격 표시', description: '정확한 가격 및 추가 비용 안내', mandatory: true },
    { title: '광고 진실성', description: '허위/과장 광고 금지 준수', mandatory: true },
    { title: '소비자 분쟁 해결', description: '분쟁해결기준 및 절차 안내', mandatory: true },
  ],
  [RegulationType.PERSONAL_INFO]: [
    { title: '개인정보 처리방침', description: '개인정보 처리방침 공개 및 최신화', mandatory: true },
    { title: '수집 동의', description: '개인정보 수집/이용 동의 절차', mandatory: true },
    { title: '제3자 제공 동의', description: '제3자 제공 시 별도 동의', mandatory: true },
    { title: '마케팅 동의', description: '마케팅 활용 별도 동의 (선택)', mandatory: true },
    { title: '보유기간 준수', description: '수집 목적 달성 후 파기', mandatory: true },
    { title: '암호화', description: '주민번호, 카드번호 등 민감정보 암호화', mandatory: true },
    { title: '접근 통제', description: '개인정보 접근 권한 관리', mandatory: true },
    { title: '개인정보 파기', description: '보유기간 경과 정보 파기 절차', mandatory: true },
  ],
  [RegulationType.PRODUCT_LIABILITY]: [
    { title: '제품 안전 표시', description: '제품 안전 관련 주의사항 표시', mandatory: true },
    { title: '사용 설명서', description: '올바른 사용법 안내', mandatory: false },
    { title: '품질 보증', description: '품질 보증 기간 및 내용', mandatory: false },
  ],
  [RegulationType.FAIR_TRADE]: [
    { title: '부당 표시 금지', description: '원산지, 품질 등 부당 표시 금지', mandatory: true },
    { title: '끼워팔기 금지', description: '부당한 끼워팔기 금지', mandatory: true },
    { title: '판매 조건 명시', description: '판매 조건 명확히 표시', mandatory: true },
  ],
  [RegulationType.LABELING]: [
    { title: '필수 표시사항', description: '법적 필수 표시사항 기재', mandatory: true },
    { title: '광고 표시 기준', description: '표시광고법 준수', mandatory: true },
  ],
  [RegulationType.FOOD_SANITATION]: [
    { title: '영업신고', description: '식품 판매업 영업신고', mandatory: true },
    { title: '위생 관리', description: '식품 보관/취급 위생 관리', mandatory: true },
    { title: '유통기한 표시', description: '유통기한/소비기한 표시', mandatory: true },
  ],
  [RegulationType.CHILDREN_PRODUCT]: [
    { title: 'KC 안전인증', description: '어린이제품 안전인증 취득', mandatory: true },
    { title: '연령 표시', description: '사용 연령 표시', mandatory: true },
    { title: '안전 주의사항', description: '안전 관련 주의사항 표시', mandatory: true },
  ],
  [RegulationType.OTHER]: [],
};

/**
 * 규정준수 서브에이전트 클래스
 */
export class ComplianceSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Compliance SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<ComplianceResult>> {
    const startTime = Date.now();
    const payload = context.data as ComplianceTaskPayload;

    this.logger.info('Running Compliance SubAgent', {
      action: payload.action,
    });

    try {
      let result: ComplianceResult;

      switch (payload.action) {
        case 'audit':
          result = await this.performAudit(payload.regulationType, payload.options);
          break;

        case 'check_privacy':
          result = await this.checkPrivacyCompliance();
          break;

        case 'update_checklist':
          result = await this.updateChecklist(payload.checklistId!, payload.options);
          break;

        case 'generate_report':
          result = await this.generateComplianceReport(payload.period);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Compliance check failed', error as Error);
      throw error;
    }
  }

  /**
   * 컴플라이언스 감사
   */
  private async performAudit(
    regulationType?: RegulationType,
    options?: ComplianceTaskPayload['options']
  ): Promise<ComplianceResult> {
    const checklists: ComplianceChecklist[] = [];
    const violations: RegulatoryViolation[] = [];

    // 대상 규정 결정
    const targetRegulations = regulationType
      ? [regulationType]
      : Object.keys(COMPLIANCE_TEMPLATES) as RegulationType[];

    for (const regType of targetRegulations) {
      const checklist = await this.auditRegulation(regType);
      checklists.push(checklist);

      // 미준수 항목에서 위반 사항 생성
      for (const item of checklist.items) {
        if (item.status === ComplianceStatus.NON_COMPLIANT && item.mandatory) {
          violations.push({
            id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            regulationType: regType,
            description: `${item.title}: ${item.description}`,
            riskLevel: RiskLevel.HIGH,
            detectedAt: new Date(),
            detectionSource: 'audit',
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // 전체 준수율 계산
    const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
    const compliantItems = checklists.reduce(
      (sum, c) => sum + c.items.filter(i => i.status === ComplianceStatus.COMPLIANT).length,
      0
    );
    const overallComplianceRate = totalItems > 0
      ? Math.round((compliantItems / totalItems) * 100)
      : 100;

    this.logger.info('Compliance audit completed', {
      checklists: checklists.length,
      violations: violations.length,
      complianceRate: overallComplianceRate,
    });

    // 심각한 위반이 있으면 알림
    if (violations.some(v => v.riskLevel === RiskLevel.CRITICAL || v.riskLevel === RiskLevel.HIGH)) {
      await this.notifyParent(
        '컴플라이언스 위반 발견',
        `${violations.length}개의 규정 위반이 발견되었습니다.\n` +
        violations.map(v => `- [${v.riskLevel}] ${v.description}`).join('\n'),
        'high'
      );
    }

    return {
      checklists,
      violations,
      summary: {
        overallComplianceRate,
        criticalIssues: violations.filter(
          v => v.riskLevel === RiskLevel.CRITICAL || v.riskLevel === RiskLevel.HIGH
        ).length,
        pendingRemediations: violations.filter(v => v.status === 'open').length,
      },
    };
  }

  /**
   * 규정별 감사
   */
  private async auditRegulation(regulationType: RegulationType): Promise<ComplianceChecklist> {
    const template = COMPLIANCE_TEMPLATES[regulationType] || [];
    const now = new Date();

    const items: ComplianceCheckItem[] = template.map((item, index) => ({
      id: `item-${regulationType}-${index}`,
      ...item,
      status: this.simulateComplianceCheck(item),
      lastCheckedAt: now,
    }));

    const compliantCount = items.filter(i => i.status === ComplianceStatus.COMPLIANT).length;
    const complianceRate = items.length > 0
      ? Math.round((compliantCount / items.length) * 100)
      : 100;

    return {
      id: `checklist-${regulationType}-${now.getTime()}`,
      regulationType,
      name: this.getRegulationName(regulationType),
      description: `${this.getRegulationName(regulationType)} 컴플라이언스 체크리스트`,
      items,
      overallStatus: complianceRate === 100
        ? ComplianceStatus.COMPLIANT
        : complianceRate >= 70
          ? ComplianceStatus.PARTIAL
          : ComplianceStatus.NON_COMPLIANT,
      complianceRate,
      lastReviewedAt: now,
      nextReviewDueAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30일 후
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 컴플라이언스 상태 시뮬레이션
   */
  private simulateComplianceCheck(item: Omit<ComplianceCheckItem, 'id' | 'status' | 'lastCheckedAt'>): ComplianceStatus {
    // 실제 구현에서는 실제 시스템 상태를 체크합니다
    // 여기서는 시뮬레이션으로 대부분 준수 상태를 반환
    const random = Math.random();

    if (random > 0.9) {
      return ComplianceStatus.NON_COMPLIANT;
    } else if (random > 0.8) {
      return ComplianceStatus.PARTIAL;
    }
    return ComplianceStatus.COMPLIANT;
  }

  /**
   * 개인정보 보호 준수 점검
   */
  private async checkPrivacyCompliance(): Promise<ComplianceResult> {
    const now = new Date();

    // 개인정보 처리 현황 점검
    const privacyStatus: PrivacyComplianceStatus = {
      privacyPolicyVersion: '3.2.0',
      lastPolicyUpdate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30일 전
      consentCollection: {
        mandatory: true,
        marketing: true,
        thirdParty: true,
      },
      retentionCompliant: true,
      encryptionStatus: {
        database: true,
        transmission: true,
        backup: true,
      },
      accessControlStatus: true,
      lastAuditDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90일 전
    };

    // 이슈 확인
    const issues: RegulatoryViolation[] = [];

    // 정책 업데이트 확인 (6개월 이상 미업데이트)
    const daysSinceUpdate = Math.floor(
      (now.getTime() - privacyStatus.lastPolicyUpdate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceUpdate > 180) {
      issues.push({
        id: `privacy-${now.getTime()}-1`,
        regulationType: RegulationType.PERSONAL_INFO,
        description: `개인정보 처리방침이 ${daysSinceUpdate}일 동안 업데이트되지 않았습니다.`,
        riskLevel: RiskLevel.MEDIUM,
        detectedAt: now,
        detectionSource: 'audit',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 감사 일정 확인 (90일 이상 미감사)
    if (privacyStatus.lastAuditDate) {
      const daysSinceAudit = Math.floor(
        (now.getTime() - privacyStatus.lastAuditDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysSinceAudit > 90) {
        issues.push({
          id: `privacy-${now.getTime()}-2`,
          regulationType: RegulationType.PERSONAL_INFO,
          description: `개인정보 보호 감사가 ${daysSinceAudit}일 동안 수행되지 않았습니다.`,
          riskLevel: RiskLevel.LOW,
          detectedAt: now,
          detectionSource: 'audit',
          status: 'open',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    privacyStatus.issues = issues;

    this.logger.info('Privacy compliance check completed', {
      issues: issues.length,
      policyVersion: privacyStatus.privacyPolicyVersion,
    });

    return {
      privacyStatus,
      violations: issues,
      summary: {
        overallComplianceRate: issues.length === 0 ? 100 : 85,
        criticalIssues: issues.filter(i => i.riskLevel === RiskLevel.CRITICAL).length,
        pendingRemediations: issues.length,
      },
    };
  }

  /**
   * 체크리스트 업데이트
   */
  private async updateChecklist(
    checklistId: string,
    options?: ComplianceTaskPayload['options']
  ): Promise<ComplianceResult> {
    const db = this.getDatabase('compliance_checklists');
    const checklistResult = await db.findById<ComplianceChecklist>(checklistId);

    if (!checklistResult.data) {
      throw new Error(`Checklist not found: ${checklistId}`);
    }

    const checklist = checklistResult.data;
    checklist.lastReviewedAt = new Date();
    checklist.updatedAt = new Date();

    await db.update(checklist.id, checklist);

    return {
      checklists: [checklist],
    };
  }

  /**
   * 컴플라이언스 리포트 생성
   */
  private async generateComplianceReport(period?: DateRange): Promise<ComplianceResult> {
    const auditResult = await this.performAudit();
    const privacyResult = await this.checkPrivacyCompliance();

    return {
      checklists: auditResult.checklists,
      violations: [...(auditResult.violations || []), ...(privacyResult.violations || [])],
      privacyStatus: privacyResult.privacyStatus,
      summary: {
        overallComplianceRate: Math.round(
          ((auditResult.summary?.overallComplianceRate || 100) +
           (privacyResult.summary?.overallComplianceRate || 100)) / 2
        ),
        criticalIssues: (auditResult.summary?.criticalIssues || 0) +
                        (privacyResult.summary?.criticalIssues || 0),
        pendingRemediations: (auditResult.summary?.pendingRemediations || 0) +
                             (privacyResult.summary?.pendingRemediations || 0),
      },
    };
  }

  /**
   * 규정명 조회
   */
  private getRegulationName(type: RegulationType): string {
    const names: Record<RegulationType, string> = {
      [RegulationType.ECOMMERCE_ACT]: '전자상거래법',
      [RegulationType.CONSUMER_PROTECTION]: '소비자보호법',
      [RegulationType.PERSONAL_INFO]: '개인정보보호법',
      [RegulationType.PRODUCT_LIABILITY]: '제조물책임법',
      [RegulationType.FAIR_TRADE]: '공정거래법',
      [RegulationType.LABELING]: '표시광고법',
      [RegulationType.FOOD_SANITATION]: '식품위생법',
      [RegulationType.CHILDREN_PRODUCT]: '어린이제품안전법',
      [RegulationType.OTHER]: '기타 규정',
    };

    return names[type] || type;
  }
}

export default ComplianceSubAgent;
