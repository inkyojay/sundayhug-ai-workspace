/**
 * 인증관리 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * KC, 안전인증 유효기간/갱신 관리를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
} from '../../types';
import {
  Certification,
  CertificationType,
  CertificationStatus,
  CertificationExpiryAlert,
  RenewalRecord,
  CertificationManagementTaskPayload,
  CertificationManagementResult,
} from './types';

/**
 * 인증관리 서브에이전트 클래스
 */
export class CertificationSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Certification SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<CertificationManagementResult>> {
    const startTime = Date.now();
    const payload = context.data as CertificationManagementTaskPayload;

    this.logger.info('Running Certification SubAgent', {
      action: payload.action,
    });

    try {
      let result: CertificationManagementResult;

      switch (payload.action) {
        case 'check_expiry':
          result = await this.checkExpiringCertifications(
            payload.certificationTypes,
            payload.options?.expiryThresholdDays as number
          );
          break;

        case 'initiate_renewal':
          result = await this.initiateRenewal(payload.certificationId!);
          break;

        case 'update_status':
          result = await this.updateCertificationStatus(payload.certificationId!);
          break;

        case 'generate_report':
          result = await this.generateCertificationReport();
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Certification management failed', error as Error);
      throw error;
    }
  }

  /**
   * 만료 임박 인증 확인
   */
  private async checkExpiringCertifications(
    types?: CertificationType[],
    thresholdDays: number = 90
  ): Promise<CertificationManagementResult> {
    const db = this.getDatabase('certifications');
    const certificationsResult = await db.findByCondition<Certification>({
      status: CertificationStatus.VALID,
    });

    const certifications = certificationsResult.data || [];
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);

    const expiringCertifications: CertificationExpiryAlert[] = [];

    for (const cert of certifications) {
      // 타입 필터링
      if (types && types.length > 0 && !types.includes(cert.type)) {
        continue;
      }

      const expiryDate = new Date(cert.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (expiryDate <= thresholdDate) {
        // 긴급도 결정
        let urgency: 'urgent' | 'warning' | 'notice';
        if (daysUntilExpiry <= 30) {
          urgency = 'urgent';
        } else if (daysUntilExpiry <= 60) {
          urgency = 'warning';
        } else {
          urgency = 'notice';
        }

        expiringCertifications.push({
          certificationId: cert.id,
          certificationType: cert.type,
          certificationNumber: cert.registrationNumber,
          expiryDate,
          daysUntilExpiry,
          urgency,
          affectedProductCount: cert.products.length,
          recommendedAction: this.getRecommendedAction(cert.type, daysUntilExpiry),
        });

        // 상태 업데이트
        if (daysUntilExpiry <= 90 && cert.status !== CertificationStatus.EXPIRING_SOON) {
          cert.status = CertificationStatus.EXPIRING_SOON;
          await db.update(cert.id, cert);
        }
      }
    }

    // 긴급도 순 정렬
    expiringCertifications.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    this.logger.info(`Found ${expiringCertifications.length} expiring certifications`);

    // 긴급 알림 (30일 이내)
    const urgentCerts = expiringCertifications.filter(c => c.urgency === 'urgent');
    if (urgentCerts.length > 0) {
      await this.notifyParent(
        '긴급: 인증 만료 임박',
        `${urgentCerts.length}개의 인증이 30일 이내 만료됩니다.\n` +
        urgentCerts.map(c => `- ${c.certificationType}: ${c.certificationNumber} (${c.daysUntilExpiry}일 남음)`).join('\n'),
        'high'
      );
    }

    return {
      expiringCertifications,
      certificationSummary: await this.getCertificationSummary(),
    };
  }

  /**
   * 갱신 절차 시작
   */
  private async initiateRenewal(certificationId: string): Promise<CertificationManagementResult> {
    const db = this.getDatabase('certifications');
    const certResult = await db.findById<Certification>(certificationId);

    if (!certResult.data) {
      throw new Error(`Certification not found: ${certificationId}`);
    }

    const cert = certResult.data;

    // 승인 요청
    const approved = await this.requestApprovalFromParent(
      '인증 갱신 승인 요청',
      `${cert.type} 인증 (${cert.registrationNumber}) 갱신을 진행합니다.\n` +
      `인증 대상 상품: ${cert.products.length}개\n` +
      `현재 만료일: ${cert.expiryDate}`,
      { certification: cert }
    );

    if (!approved) {
      throw new Error('Certification renewal was not approved');
    }

    // 갱신 상태로 변경
    cert.status = CertificationStatus.PENDING_RENEWAL;
    cert.updatedAt = new Date();
    await db.update(cert.id, cert);

    this.logger.info(`Initiated renewal for certification: ${cert.registrationNumber}`);

    return {
      renewedCertifications: [cert],
      certificationSummary: await this.getCertificationSummary(),
    };
  }

  /**
   * 인증 상태 업데이트
   */
  private async updateCertificationStatus(
    certificationId: string
  ): Promise<CertificationManagementResult> {
    const db = this.getDatabase('certifications');
    const certResult = await db.findById<Certification>(certificationId);

    if (!certResult.data) {
      throw new Error(`Certification not found: ${certificationId}`);
    }

    const cert = certResult.data;
    const now = new Date();
    const expiryDate = new Date(cert.expiryDate);

    // 상태 결정
    if (expiryDate < now) {
      cert.status = CertificationStatus.EXPIRED;
    } else if (expiryDate.getTime() - now.getTime() <= 90 * 24 * 60 * 60 * 1000) {
      cert.status = CertificationStatus.EXPIRING_SOON;
    } else {
      cert.status = CertificationStatus.VALID;
    }

    cert.updatedAt = now;
    await db.update(cert.id, cert);

    this.logger.info(`Updated certification status: ${cert.registrationNumber} -> ${cert.status}`);

    return {
      certificationSummary: await this.getCertificationSummary(),
    };
  }

  /**
   * 인증 리포트 생성
   */
  private async generateCertificationReport(): Promise<CertificationManagementResult> {
    const summary = await this.getCertificationSummary();
    const expiryResult = await this.checkExpiringCertifications();

    return {
      expiringCertifications: expiryResult.expiringCertifications,
      certificationSummary: summary,
    };
  }

  /**
   * 인증 현황 요약
   */
  private async getCertificationSummary(): Promise<CertificationManagementResult['certificationSummary']> {
    const db = this.getDatabase('certifications');
    const certificationsResult = await db.findByCondition<Certification>({});
    const certifications = certificationsResult.data || [];

    const summary = {
      total: certifications.length,
      valid: certifications.filter(c => c.status === CertificationStatus.VALID).length,
      expiringSoon: certifications.filter(c => c.status === CertificationStatus.EXPIRING_SOON).length,
      expired: certifications.filter(c => c.status === CertificationStatus.EXPIRED).length,
    };

    return summary;
  }

  /**
   * 권장 조치 생성
   */
  private getRecommendedAction(type: CertificationType, daysUntilExpiry: number): string {
    const renewalLeadTime: Record<CertificationType, number> = {
      [CertificationType.KC]: 60,
      [CertificationType.KC_SELF]: 30,
      [CertificationType.KC_SUPPLIER]: 30,
      [CertificationType.HACCP]: 90,
      [CertificationType.ORGANIC]: 60,
      [CertificationType.HALAL]: 90,
      [CertificationType.ISO]: 90,
      [CertificationType.CE]: 60,
      [CertificationType.FDA]: 120,
      [CertificationType.OTHER]: 30,
    };

    const leadTime = renewalLeadTime[type] || 30;

    if (daysUntilExpiry <= leadTime / 2) {
      return '즉시 갱신 신청 필요. 인증기관에 긴급 연락하세요.';
    } else if (daysUntilExpiry <= leadTime) {
      return '갱신 신청을 시작하세요. 서류 준비가 필요합니다.';
    } else {
      return '갱신 준비를 시작하세요. 필요 서류를 확인하세요.';
    }
  }

  /**
   * 인증 등록
   */
  async registerCertification(
    type: CertificationType,
    certificationNumber: string,
    issuingAuthority: string,
    expiryDate: Date,
    products: Certification['products'],
    options?: Partial<Certification>
  ): Promise<Certification> {
    const now = new Date();
    const renewalDueDate = new Date(expiryDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const certification: Certification = {
      id: `cert-${now.getTime()}`,
      type,
      registrationNumber: certificationNumber,
      status: CertificationStatus.VALID,
      issuingAuthority,
      products,
      issueDate: options?.issueDate || now,
      expiryDate,
      renewalDueDate,
      createdAt: now,
      updatedAt: now,
      ...options,
    };

    const db = this.getDatabase('certifications');
    await db.create(certification);

    this.logger.info('Registered new certification', {
      id: certification.id,
      type,
      certificationNumber,
    });

    return certification;
  }
}

export default CertificationSubAgent;
