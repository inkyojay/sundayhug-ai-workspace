/**
 * 클레임처리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 클레임 접수 및 해결
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, NotificationPriority } from '../../../types';
import {
  Claim,
  ClaimType,
  ClaimStatus,
  ClaimInvestigation,
  ClaimResolution,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * ClaimProcessorSubAgent 클래스
 * 클레임 처리를 담당하는 서브에이전트
 */
export class ClaimProcessorSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('ClaimProcessorSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('ClaimProcessorSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'submit_claim':
        const claimData = context.data as Partial<Claim>;
        const submittedClaim = await this.submitClaim(claimData);
        return this.createSuccessResult(submittedClaim, startTime);

      case 'process_pending_claims':
        const { autoEscalateAmount } = context.data as { autoEscalateAmount?: number };
        const result = await this.processPendingClaims(autoEscalateAmount);
        return this.createSuccessResult(result, startTime);

      case 'investigate_claim':
        const { claimId, investigation } = context.data as {
          claimId: string;
          investigation: ClaimInvestigation;
        };
        const investigatedClaim = await this.recordInvestigation(claimId, investigation);
        return this.createSuccessResult(investigatedClaim, startTime);

      case 'resolve_claim':
        const { resolveClaimId, resolution } = context.data as {
          resolveClaimId: string;
          resolution: ClaimResolution;
        };
        const resolvedClaim = await this.resolveClaim(resolveClaimId, resolution);
        return this.createSuccessResult(resolvedClaim, startTime);

      default:
        const defaultResult = await this.processPendingClaims();
        return this.createSuccessResult(defaultResult, startTime);
    }
  }

  /**
   * 클레임 접수
   */
  async submitClaim(data: Partial<Claim>): Promise<Claim> {
    this.logger.info('Submitting claim...');

    const claim: Claim = {
      id: uuidv4(),
      customerId: data.customerId,
      customerName: data.customerName || '',
      customerContact: data.customerContact || '',
      orderId: data.orderId,
      productId: data.productId,
      type: data.type || ClaimType.OTHER,
      status: ClaimStatus.SUBMITTED,
      severity: this.assessSeverity(data),
      description: data.description || '',
      evidence: data.evidence,
      compensationRequested: data.compensationRequested,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // DB에 저장
    const db = this.getDatabase('claims');
    await db.create({
      ...claim,
      created_at: claim.createdAt,
      updated_at: claim.updatedAt,
    });

    // 심각도에 따른 알림
    if (claim.severity === 'critical' || claim.severity === 'high') {
      await this.notifyParent(
        `긴급 클레임 접수 [${claim.severity.toUpperCase()}]`,
        `유형: ${this.getClaimTypeText(claim.type)}\n내용: ${claim.description.substring(0, 100)}...`,
        claim.severity === 'critical' ? NotificationPriority.URGENT : NotificationPriority.HIGH
      );
    }

    this.logger.info('Claim submitted', { claimId: claim.id, severity: claim.severity });

    return claim;
  }

  /**
   * 심각도 평가
   */
  private assessSeverity(data: Partial<Claim>): 'low' | 'medium' | 'high' | 'critical' {
    // 보상 요청 금액 기준
    if (data.compensationRequested) {
      if (data.compensationRequested >= 500000) return 'critical';
      if (data.compensationRequested >= 100000) return 'high';
      if (data.compensationRequested >= 50000) return 'medium';
    }

    // 클레임 유형 기준
    const highSeverityTypes = [ClaimType.DAMAGED, ClaimType.PRODUCT_DEFECT, ClaimType.MISSING_ITEM];
    if (data.type && highSeverityTypes.includes(data.type)) {
      return 'high';
    }

    const mediumSeverityTypes = [ClaimType.WRONG_DELIVERY, ClaimType.LATE_DELIVERY];
    if (data.type && mediumSeverityTypes.includes(data.type)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 클레임 유형 텍스트
   */
  private getClaimTypeText(type: ClaimType): string {
    const typeMap: Record<ClaimType, string> = {
      [ClaimType.PRODUCT_DEFECT]: '상품 불량',
      [ClaimType.DAMAGED]: '파손',
      [ClaimType.WRONG_DELIVERY]: '오배송',
      [ClaimType.MISSING_ITEM]: '누락',
      [ClaimType.LATE_DELIVERY]: '배송 지연',
      [ClaimType.SERVICE_ISSUE]: '서비스 불만',
      [ClaimType.OVERCHARGE]: '과다 청구',
      [ClaimType.OTHER]: '기타',
    };
    return typeMap[type] || type;
  }

  /**
   * 대기 중인 클레임 처리
   */
  async processPendingClaims(autoEscalateAmount?: number): Promise<{ processed: number; escalated: number }> {
    this.logger.info('Processing pending claims...');

    const db = this.getDatabase('claims');
    const result = await db.findMany<Claim>({
      status: { $in: [ClaimStatus.SUBMITTED, ClaimStatus.REVIEWING] },
    });

    if (result.error || !result.data) {
      return { processed: 0, escalated: 0 };
    }

    let processed = 0;
    let escalated = 0;

    for (const claim of result.data) {
      try {
        // 자동 에스컬레이션 조건 확인
        const shouldEscalate = this.shouldAutoEscalate(claim, autoEscalateAmount || 100000);

        if (shouldEscalate) {
          await this.escalateClaim(claim);
          escalated++;
        } else {
          // 자동 처리 가능 여부 확인
          const canAutoProcess = this.canAutoProcess(claim);

          if (canAutoProcess) {
            await this.autoProcessClaim(claim);
          } else {
            await this.markAsReviewing(claim);
          }
          processed++;
        }
      } catch (error) {
        this.logger.error('Failed to process claim', error as Error, { claimId: claim.id });
      }
    }

    return { processed, escalated };
  }

  /**
   * 자동 에스컬레이션 여부 확인
   */
  private shouldAutoEscalate(claim: Claim, threshold: number): boolean {
    // 보상 요청 금액이 임계값 이상
    if (claim.compensationRequested && claim.compensationRequested >= threshold) {
      return true;
    }

    // 심각도가 critical
    if (claim.severity === 'critical') {
      return true;
    }

    // 오래된 미처리 클레임
    const daysSinceCreated = (Date.now() - claim.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceCreated > 3 && claim.status === ClaimStatus.SUBMITTED) {
      return true;
    }

    return false;
  }

  /**
   * 자동 처리 가능 여부 확인
   */
  private canAutoProcess(claim: Claim): boolean {
    // 소액 클레임 자동 처리 가능
    if (claim.compensationRequested && claim.compensationRequested <= 10000) {
      return true;
    }

    // 배송 지연 클레임 자동 처리
    if (claim.type === ClaimType.LATE_DELIVERY && claim.severity === 'low') {
      return true;
    }

    return false;
  }

  /**
   * 클레임 자동 처리
   */
  private async autoProcessClaim(claim: Claim): Promise<void> {
    this.logger.info('Auto-processing claim', { claimId: claim.id });

    const resolution: ClaimResolution = {
      type: 'compensation',
      description: '자동 처리: 쿠폰/포인트 보상',
      compensationAmount: Math.min(claim.compensationRequested || 5000, 10000),
      compensationType: 'point',
      resolvedBy: this.config.id,
      resolvedAt: new Date(),
      customerAccepted: undefined,
    };

    // 승인 요청
    const approved = await this.requestApprovalFromParent(
      '클레임 자동 처리 승인 요청',
      `클레임 ID: ${claim.id}\n유형: ${this.getClaimTypeText(claim.type)}\n보상: ${resolution.compensationAmount}원 (${resolution.compensationType})`,
      { claim, resolution }
    );

    if (approved) {
      await this.resolveClaim(claim.id, resolution);
    } else {
      await this.markAsReviewing(claim);
    }
  }

  /**
   * 클레임 에스컬레이션
   */
  async escalateClaim(claim: Claim): Promise<Claim> {
    this.logger.info('Escalating claim', { claimId: claim.id });

    const db = this.getDatabase('claims');
    await db.update({ id: claim.id }, {
      status: ClaimStatus.ESCALATED,
      updated_at: new Date(),
    });

    await this.notifyParent(
      '클레임 에스컬레이션',
      `클레임 ID: ${claim.id}\n유형: ${this.getClaimTypeText(claim.type)}\n심각도: ${claim.severity}\n내용: ${claim.description}`,
      NotificationPriority.HIGH
    );

    return { ...claim, status: ClaimStatus.ESCALATED };
  }

  /**
   * 검토 중 상태로 변경
   */
  private async markAsReviewing(claim: Claim): Promise<void> {
    const db = this.getDatabase('claims');
    await db.update({ id: claim.id }, {
      status: ClaimStatus.REVIEWING,
      updated_at: new Date(),
    });
  }

  /**
   * 조사 내용 기록
   */
  async recordInvestigation(claimId: string, investigation: ClaimInvestigation): Promise<Claim | null> {
    const db = this.getDatabase('claims');
    const result = await db.findById<Claim>(claimId);

    if (result.error || !result.data) {
      return null;
    }

    await db.update({ id: claimId }, {
      status: ClaimStatus.INVESTIGATING,
      investigation,
      updated_at: new Date(),
    });

    this.logger.info('Investigation recorded', { claimId });

    return { ...result.data, status: ClaimStatus.INVESTIGATING, investigation };
  }

  /**
   * 클레임 해결
   */
  async resolveClaim(claimId: string, resolution: ClaimResolution): Promise<Claim | null> {
    const db = this.getDatabase('claims');
    const result = await db.findById<Claim>(claimId);

    if (result.error || !result.data) {
      return null;
    }

    const claim = result.data;

    // 보상 처리
    if (resolution.type === 'refund' || resolution.type === 'compensation') {
      await this.processCompensation(claim, resolution);
    }

    await db.update({ id: claimId }, {
      status: ClaimStatus.RESOLVED,
      resolution,
      resolved_at: new Date(),
      updated_at: new Date(),
    });

    // 해결 안내 발송
    await this.sendResolutionNotice(claim, resolution);

    this.logger.info('Claim resolved', { claimId, resolutionType: resolution.type });

    return { ...claim, status: ClaimStatus.RESOLVED, resolution, resolvedAt: new Date() };
  }

  /**
   * 보상 처리
   */
  private async processCompensation(claim: Claim, resolution: ClaimResolution): Promise<void> {
    // TODO: 실제 보상 처리 (포인트 지급, 환불, 쿠폰 발급 등)
    this.logger.info('Processing compensation', {
      claimId: claim.id,
      amount: resolution.compensationAmount,
      type: resolution.compensationType,
    });
  }

  /**
   * 해결 안내 발송
   */
  private async sendResolutionNotice(claim: Claim, resolution: ClaimResolution): Promise<void> {
    // TODO: 고객에게 해결 안내 발송
    this.logger.info('Sending resolution notice', { claimId: claim.id });
  }

  /**
   * 클레임 반려
   */
  async rejectClaim(claimId: string, reason: string): Promise<Claim | null> {
    const db = this.getDatabase('claims');

    const resolution: ClaimResolution = {
      type: 'rejected',
      description: reason,
      resolvedBy: this.config.id,
      resolvedAt: new Date(),
    };

    await db.update({ id: claimId }, {
      status: ClaimStatus.REJECTED,
      resolution,
      resolved_at: new Date(),
      updated_at: new Date(),
    });

    const result = await db.findById<Claim>(claimId);
    return result.data || null;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'processing',
      message: '클레임 처리 중...',
    };
  }
}

export default ClaimProcessorSubAgent;
