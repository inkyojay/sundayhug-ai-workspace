/**
 * 권리관리 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 상표/디자인권 등록/갱신 관리를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
} from '../../types';
import {
  IntellectualProperty,
  IPType,
  IPStatus,
  IPExpiryAlert,
  IPRenewalRecord,
  IPClassification,
  IPManagementTaskPayload,
  IPManagementResult,
} from './types';

/**
 * 권리관리 서브에이전트 클래스
 */
export class IPManagementSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing IP Management SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<IPManagementResult>> {
    const startTime = Date.now();
    const payload = context.data as IPManagementTaskPayload;

    this.logger.info('Running IP Management SubAgent', {
      action: payload.action,
    });

    try {
      let result: IPManagementResult;

      switch (payload.action) {
        case 'check_expiry':
          result = await this.checkExpiringIPs(
            payload.ipTypes,
            payload.options?.expiryThresholdDays as number
          );
          break;

        case 'initiate_renewal':
          result = await this.initiateRenewal(payload.ipId!);
          break;

        case 'register_new':
          result = await this.registerNewIP(payload.newIPData!);
          break;

        case 'update_status':
          result = await this.updateIPStatus(payload.ipId!);
          break;

        case 'generate_report':
          result = await this.generateIPReport();
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('IP management failed', error as Error);
      throw error;
    }
  }

  /**
   * 만료 임박 IP 확인
   */
  private async checkExpiringIPs(
    types?: IPType[],
    thresholdDays: number = 180
  ): Promise<IPManagementResult> {
    const db = this.getDatabase('intellectual_properties');
    const ipsResult = await db.findByCondition<IntellectualProperty>({});

    const ips = ipsResult.data || [];
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);

    const expiringIPs: IPExpiryAlert[] = [];

    for (const ip of ips) {
      // 타입 필터링
      if (types && types.length > 0 && !types.includes(ip.type)) {
        continue;
      }

      // 만료된 IP 제외
      if (ip.status === IPStatus.EXPIRED || ip.status === IPStatus.ABANDONED) {
        continue;
      }

      const expiryDate = new Date(ip.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (expiryDate <= thresholdDate) {
        // 긴급도 결정
        let urgency: 'urgent' | 'warning' | 'notice';
        if (daysUntilExpiry <= 60) {
          urgency = 'urgent';
        } else if (daysUntilExpiry <= 120) {
          urgency = 'warning';
        } else {
          urgency = 'notice';
        }

        expiringIPs.push({
          ipId: ip.id,
          ipType: ip.type,
          registrationNumber: ip.registrationNumber,
          name: ip.name,
          expiryDate,
          daysUntilExpiry,
          urgency,
          estimatedRenewalCost: this.estimateRenewalCost(ip.type),
          recommendedAction: this.getRecommendedAction(ip.type, daysUntilExpiry),
        });

        // 상태 업데이트
        if (daysUntilExpiry <= 180 && ip.status !== IPStatus.EXPIRING_SOON) {
          ip.status = IPStatus.EXPIRING_SOON;
          await db.update(ip.id, ip);
        }
      }
    }

    // 긴급도 순 정렬
    expiringIPs.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    this.logger.info(`Found ${expiringIPs.length} expiring IPs`);

    // 긴급 알림 (60일 이내)
    const urgentIPs = expiringIPs.filter(ip => ip.urgency === 'urgent');
    if (urgentIPs.length > 0) {
      await this.notifyParent(
        '긴급: IP 권리 만료 임박',
        `${urgentIPs.length}개의 IP가 60일 이내 만료됩니다.\n` +
        urgentIPs.map(ip => `- ${ip.ipType}: ${ip.name} (${ip.daysUntilExpiry}일 남음)`).join('\n'),
        'high'
      );
    }

    return {
      expiringIPs,
      ipSummary: await this.getIPSummary(),
    };
  }

  /**
   * 갱신 절차 시작
   */
  private async initiateRenewal(ipId: string): Promise<IPManagementResult> {
    const db = this.getDatabase('intellectual_properties');
    const ipResult = await db.findById<IntellectualProperty>(ipId);

    if (!ipResult.data) {
      throw new Error(`IP not found: ${ipId}`);
    }

    const ip = ipResult.data;
    const renewalCost = this.estimateRenewalCost(ip.type);

    // 승인 요청
    const approved = await this.requestApprovalFromParent(
      'IP 갱신 승인 요청',
      `${ip.type} (${ip.registrationNumber}) 갱신을 진행합니다.\n` +
      `권리명: ${ip.name}\n` +
      `현재 만료일: ${ip.expiryDate}\n` +
      `예상 갱신 비용: ${renewalCost.toLocaleString()}원`,
      { ip, estimatedCost: renewalCost }
    );

    if (!approved) {
      throw new Error('IP renewal was not approved');
    }

    // 갱신 상태로 변경
    ip.status = IPStatus.RENEWED;
    ip.updatedAt = new Date();

    // 새 만료일 설정 (유형별 갱신 기간)
    const newExpiryDate = this.calculateNewExpiryDate(ip.type, new Date(ip.expiryDate));
    ip.expiryDate = newExpiryDate;
    ip.renewalDueDate = new Date(newExpiryDate.getTime() - 180 * 24 * 60 * 60 * 1000);

    // 갱신 이력 추가
    const renewalRecord: IPRenewalRecord = {
      id: `renewal-${Date.now()}`,
      renewalDate: new Date(),
      previousExpiryDate: ipResult.data.expiryDate,
      newExpiryDate,
      cost: renewalCost,
    };

    ip.renewalHistory = [...(ip.renewalHistory || []), renewalRecord];

    await db.update(ip.id, ip);

    this.logger.info(`Initiated renewal for IP: ${ip.registrationNumber}`);

    return {
      renewedIPs: [ip],
      ipSummary: await this.getIPSummary(),
    };
  }

  /**
   * 신규 IP 등록
   */
  private async registerNewIP(
    data: Partial<IntellectualProperty>
  ): Promise<IPManagementResult> {
    const now = new Date();

    const ip: IntellectualProperty = {
      id: `ip-${now.getTime()}`,
      type: data.type!,
      registrationNumber: data.registrationNumber!,
      name: data.name!,
      description: data.description,
      status: data.status || IPStatus.APPLIED,
      owner: data.owner || '썬데이허그',
      applicationDate: data.applicationDate || now,
      registrationDate: data.registrationDate,
      expiryDate: data.expiryDate!,
      renewalDueDate: new Date(data.expiryDate!.getTime() - 180 * 24 * 60 * 60 * 1000),
      classifications: data.classifications,
      imageUrl: data.imageUrl,
      documentUrls: data.documentUrls,
      relatedProducts: data.relatedProducts,
      createdAt: now,
      updatedAt: now,
    };

    const db = this.getDatabase('intellectual_properties');
    await db.create(ip);

    this.logger.info('Registered new IP', {
      id: ip.id,
      type: ip.type,
      registrationNumber: ip.registrationNumber,
    });

    return {
      newlyRegisteredIP: ip,
      ipSummary: await this.getIPSummary(),
    };
  }

  /**
   * IP 상태 업데이트
   */
  private async updateIPStatus(ipId: string): Promise<IPManagementResult> {
    const db = this.getDatabase('intellectual_properties');
    const ipResult = await db.findById<IntellectualProperty>(ipId);

    if (!ipResult.data) {
      throw new Error(`IP not found: ${ipId}`);
    }

    const ip = ipResult.data;
    const now = new Date();
    const expiryDate = new Date(ip.expiryDate);

    // 상태 결정
    if (expiryDate < now) {
      ip.status = IPStatus.EXPIRED;
    } else if (expiryDate.getTime() - now.getTime() <= 180 * 24 * 60 * 60 * 1000) {
      ip.status = IPStatus.EXPIRING_SOON;
    } else if (ip.status === IPStatus.EXPIRING_SOON) {
      ip.status = IPStatus.REGISTERED;
    }

    ip.updatedAt = now;
    await db.update(ip.id, ip);

    this.logger.info(`Updated IP status: ${ip.registrationNumber} -> ${ip.status}`);

    return {
      ipSummary: await this.getIPSummary(),
    };
  }

  /**
   * IP 리포트 생성
   */
  private async generateIPReport(): Promise<IPManagementResult> {
    const summary = await this.getIPSummary();
    const expiryResult = await this.checkExpiringIPs();

    return {
      expiringIPs: expiryResult.expiringIPs,
      ipSummary: summary,
    };
  }

  /**
   * IP 현황 요약
   */
  private async getIPSummary(): Promise<IPManagementResult['ipSummary']> {
    const db = this.getDatabase('intellectual_properties');
    const ipsResult = await db.findByCondition<IntellectualProperty>({});
    const ips = ipsResult.data || [];

    const byType: Record<IPType, number> = {
      [IPType.TRADEMARK]: 0,
      [IPType.DESIGN]: 0,
      [IPType.PATENT]: 0,
      [IPType.COPYRIGHT]: 0,
      [IPType.TRADE_SECRET]: 0,
      [IPType.UTILITY_MODEL]: 0,
    };

    for (const ip of ips) {
      byType[ip.type] = (byType[ip.type] || 0) + 1;
    }

    return {
      total: ips.length,
      byType,
      registered: ips.filter(ip => ip.status === IPStatus.REGISTERED).length,
      expiringSoon: ips.filter(ip => ip.status === IPStatus.EXPIRING_SOON).length,
      expired: ips.filter(ip => ip.status === IPStatus.EXPIRED).length,
    };
  }

  /**
   * 갱신 비용 추정
   */
  private estimateRenewalCost(type: IPType): number {
    const costs: Record<IPType, number> = {
      [IPType.TRADEMARK]: 350000, // 상표권 갱신
      [IPType.DESIGN]: 250000,    // 디자인권 갱신
      [IPType.PATENT]: 500000,    // 특허권 갱신
      [IPType.COPYRIGHT]: 0,       // 저작권 (자동 보호)
      [IPType.TRADE_SECRET]: 0,    // 영업비밀
      [IPType.UTILITY_MODEL]: 200000, // 실용신안
    };

    return costs[type] || 300000;
  }

  /**
   * 새 만료일 계산
   */
  private calculateNewExpiryDate(type: IPType, currentExpiry: Date): Date {
    const renewalPeriods: Record<IPType, number> = {
      [IPType.TRADEMARK]: 10,      // 10년
      [IPType.DESIGN]: 5,          // 5년
      [IPType.PATENT]: 1,          // 연차료
      [IPType.COPYRIGHT]: 0,
      [IPType.TRADE_SECRET]: 0,
      [IPType.UTILITY_MODEL]: 1,   // 연차료
    };

    const years = renewalPeriods[type] || 1;
    const newExpiry = new Date(currentExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + years);

    return newExpiry;
  }

  /**
   * 권장 조치 생성
   */
  private getRecommendedAction(type: IPType, daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 30) {
      return '즉시 갱신 신청 필요. 특허청/대리인에 긴급 연락하세요.';
    } else if (daysUntilExpiry <= 90) {
      return '갱신 절차를 시작하세요. 대리인 비용 및 일정을 확인하세요.';
    } else {
      return '갱신 준비를 계획하세요. 예산 확보 및 대리인 선정을 고려하세요.';
    }
  }
}

export default IPManagementSubAgent;
