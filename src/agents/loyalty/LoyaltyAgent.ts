/**
 * Loyalty Agent - 고객 로열티 메인 에이전트
 * LANE 4: Analytics & Growth
 *
 * 역할: 멤버십 관리, 포인트 운영, VIP 케어를 총괄합니다.
 */

import { BaseAgent } from '../base/BaseAgent';
import { SubAgent, ParentAgentRef, SubAgentConfig } from '../base/SubAgent';
import agentRegistry from '../base/AgentRegistry';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  ApprovalLevel,
  TaskPayload,
  TaskResult,
  TaskStatus,
  NotificationPriority,
} from '../../types';
import {
  MembershipTier,
  PointTransactionType,
  VIPStatus,
  MembershipMember,
  TierRule,
  TierChangeHistory,
  PointAccount,
  PointTransaction,
  PointPolicy,
  VIPProfile,
  VIPCareActivity,
  RetentionCampaign,
  Coupon,
  MembershipTaskPayload,
  PointTaskPayload,
  VIPTaskPayload,
} from './types';

// =============================================================================
// Loyalty Agent 설정
// =============================================================================

const LOYALTY_AGENT_CONFIG: AgentConfig = {
  id: 'loyalty-agent',
  name: 'Loyalty Agent',
  description: '멤버십, 포인트, VIP 관리를 담당하는 에이전트',
  enabled: true,
  schedule: '0 0 0 * * *', // 매일 자정
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 300000, // 5분
  approvalLevel: ApprovalLevel.LOW,
  metadata: {
    version: '1.0.0',
    domain: 'loyalty',
    layer: 'growth',
  },
};

// =============================================================================
// Loyalty Agent 클래스
// =============================================================================

export class LoyaltyAgent extends BaseAgent {
  /** 멤버십 서브에이전트 */
  private membershipSubAgent: MembershipSubAgent | null = null;

  /** 포인트 서브에이전트 */
  private pointSubAgent: PointSubAgent | null = null;

  /** VIP 관리 서브에이전트 */
  private vipSubAgent: VIPSubAgent | null = null;

  constructor(config: AgentConfig = LOYALTY_AGENT_CONFIG) {
    super(config);
  }

  /**
   * 에이전트 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Loyalty Agent and sub-agents...');

    const parentRef: ParentAgentRef = {
      id: this.config.id,
      name: this.config.name,
      onTaskComplete: this.handleSubAgentResult.bind(this),
      onProgress: async (progress) => {
        this.logger.debug('Sub-agent progress', progress);
      },
      onError: async (error, context) => {
        this.logger.error('Sub-agent error', error, context);
      },
    };

    // 서브에이전트 생성
    this.membershipSubAgent = new MembershipSubAgent({
      id: 'loyalty-membership-subagent',
      name: 'Membership SubAgent',
      description: '등급관리, 혜택적용 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 120000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    this.pointSubAgent = new PointSubAgent({
      id: 'loyalty-point-subagent',
      name: 'Point SubAgent',
      description: '적립/사용/소멸 관리 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 60000,
      approvalLevel: ApprovalLevel.LOW,
      parentRef,
    });

    this.vipSubAgent = new VIPSubAgent({
      id: 'loyalty-vip-subagent',
      name: 'VIP SubAgent',
      description: 'VIP케어, 이탈방지 담당',
      enabled: true,
      maxRetries: 2,
      retryDelay: 3000,
      timeout: 180000,
      approvalLevel: ApprovalLevel.MEDIUM,
      parentRef,
    });

    // AgentRegistry에 등록
    agentRegistry.register(this.membershipSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['loyalty', 'membership', 'tier'],
    });

    agentRegistry.register(this.pointSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['loyalty', 'point', 'reward'],
    });

    agentRegistry.register(this.vipSubAgent, {
      type: 'sub',
      parentId: this.config.id,
      tags: ['loyalty', 'vip', 'retention'],
    });

    this.logger.info('Loyalty Agent initialized with 3 sub-agents');
  }

  /**
   * 에이전트 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Loyalty Agent...');

    if (this.membershipSubAgent) {
      await agentRegistry.unregister(this.membershipSubAgent.getId());
    }
    if (this.pointSubAgent) {
      await agentRegistry.unregister(this.pointSubAgent.getId());
    }
    if (this.vipSubAgent) {
      await agentRegistry.unregister(this.vipSubAgent.getId());
    }

    this.logger.info('Loyalty Agent cleanup completed');
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this.logger.info('Loyalty Agent running...', { executionId: context.executionId });

    try {
      const data = context.data || {};
      const action = data.action as string;

      switch (action) {
        case 'evaluate_tier':
          return await this.handleTierEvaluation(data, startTime);

        case 'earn_points':
          return await this.handleEarnPoints(data, startTime);

        case 'use_points':
          return await this.handleUsePoints(data, startTime);

        case 'expire_points':
          return await this.handleExpirePoints(startTime);

        case 'analyze_churn':
          return await this.handleChurnAnalysis(data, startTime);

        case 'execute_retention':
          return await this.handleRetentionCampaign(data, startTime);

        default:
          return await this.handleDailyOperations(startTime);
      }
    } catch (error) {
      this.logger.error('Loyalty Agent execution failed', error as Error);
      return this.createErrorResult(
        'LOYALTY_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  /**
   * 등급 평가
   */
  private async handleTierEvaluation(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.membershipSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Membership SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<MembershipTaskPayload> = {
      taskId: `tier-eval-${Date.now()}`,
      type: 'evaluate_tier',
      priority: 6,
      data: {
        action: 'evaluate_tier',
        memberId: data.memberId as string,
        memberIds: data.memberIds as string[],
        evaluationDate: new Date(),
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.membershipSubAgent.executeTask(task);

    // 등급 변경 알림
    if (result.data && (result.data as any).changes?.length > 0) {
      const upgrades = (result.data as any).changes.filter((c: any) => c.changeType === 'upgrade');
      if (upgrades.length > 0) {
        await this.sendNotification(
          NotificationPriority.MEDIUM,
          'marketing-team',
          '등급 승급 고객 발생',
          `${upgrades.length}명의 고객이 등급 승급했습니다.`
        );
      }
    }

    return this.createSuccessResult(
      { taskResult: result, type: 'evaluate_tier' },
      startTime
    );
  }

  /**
   * 포인트 적립
   */
  private async handleEarnPoints(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.pointSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Point SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<PointTaskPayload> = {
      taskId: `earn-${Date.now()}`,
      type: 'earn_points',
      priority: 7,
      data: {
        action: 'earn_points',
        memberId: data.memberId as string,
        amount: data.amount as number,
        orderId: data.orderId as string,
        reason: data.reason as string,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.pointSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'earn_points' },
      startTime
    );
  }

  /**
   * 포인트 사용
   */
  private async handleUsePoints(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.pointSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Point SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<PointTaskPayload> = {
      taskId: `use-${Date.now()}`,
      type: 'use_points',
      priority: 8,
      data: {
        action: 'use_points',
        memberId: data.memberId as string,
        amount: data.amount as number,
        orderId: data.orderId as string,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.pointSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'use_points' },
      startTime
    );
  }

  /**
   * 포인트 소멸 처리
   */
  private async handleExpirePoints(startTime: number): Promise<AgentResult> {
    if (!this.pointSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'Point SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<PointTaskPayload> = {
      taskId: `expire-${Date.now()}`,
      type: 'expire_points',
      priority: 5,
      data: {
        action: 'expire_points',
        memberId: 'all',
        expiryNotificationDays: 7,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.pointSubAgent.executeTask(task);

    // 소멸 예정 알림 발송
    if (result.data && (result.data as any).upcomingExpiry?.length > 0) {
      this.logger.info('Sending expiry notifications', {
        count: (result.data as any).upcomingExpiry.length,
      });
    }

    return this.createSuccessResult(
      { taskResult: result, type: 'expire_points' },
      startTime
    );
  }

  /**
   * 이탈 분석
   */
  private async handleChurnAnalysis(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.vipSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'VIP SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<VIPTaskPayload> = {
      taskId: `churn-${Date.now()}`,
      type: 'analyze_churn_risk',
      priority: 6,
      data: {
        action: 'analyze_churn_risk',
        memberIds: data.memberIds as string[],
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.vipSubAgent.executeTask(task);

    // 고위험 이탈 고객 알림
    if (result.data && (result.data as any).highRiskCount > 0) {
      await this.sendNotification(
        NotificationPriority.HIGH,
        'cs-team',
        'VIP 이탈 위험 고객 감지',
        `${(result.data as any).highRiskCount}명의 VIP 고객이 이탈 위험 상태입니다.`
      );
    }

    return this.createSuccessResult(
      { taskResult: result, type: 'analyze_churn' },
      startTime
    );
  }

  /**
   * 리텐션 캠페인 실행
   */
  private async handleRetentionCampaign(
    data: Record<string, unknown>,
    startTime: number
  ): Promise<AgentResult> {
    if (!this.vipSubAgent) {
      return this.createErrorResult('SUBAGENT_NOT_READY', 'VIP SubAgent not initialized', startTime, false);
    }

    const task: TaskPayload<VIPTaskPayload> = {
      taskId: `retention-${Date.now()}`,
      type: 'execute_retention',
      priority: 7,
      data: {
        action: 'execute_retention',
        campaignId: data.campaignId as string,
        retentionCampaignData: data.campaignData as Partial<RetentionCampaign>,
      },
      createdAt: new Date(),
      retryCount: 0,
    };

    const result = await this.vipSubAgent.executeTask(task);

    return this.createSuccessResult(
      { taskResult: result, type: 'execute_retention' },
      startTime
    );
  }

  /**
   * 일일 운영 (스케줄)
   */
  private async handleDailyOperations(startTime: number): Promise<AgentResult> {
    this.logger.info('Running daily loyalty operations...');

    const results: Record<string, TaskResult | undefined> = {};

    // 등급 평가 (월 1일에만)
    const today = new Date();
    if (today.getDate() === 1) {
      results.tierEvaluation = await this.membershipSubAgent?.executeTask({
        taskId: `daily-tier-${Date.now()}`,
        type: 'evaluate_tier',
        priority: 6,
        data: { action: 'evaluate_tier', evaluationDate: today },
        createdAt: new Date(),
        retryCount: 0,
      });
    }

    // 포인트 소멸 처리
    results.pointExpiry = await this.pointSubAgent?.executeTask({
      taskId: `daily-expiry-${Date.now()}`,
      type: 'expire_points',
      priority: 5,
      data: { action: 'expire_points', memberId: 'all', expiryNotificationDays: 7 },
      createdAt: new Date(),
      retryCount: 0,
    });

    // VIP 이탈 위험 분석
    results.churnAnalysis = await this.vipSubAgent?.executeTask({
      taskId: `daily-churn-${Date.now()}`,
      type: 'analyze_churn_risk',
      priority: 5,
      data: { action: 'analyze_churn_risk' },
      createdAt: new Date(),
      retryCount: 0,
    });

    return this.createSuccessResult(
      { results, type: 'daily_operations' },
      startTime,
      { processed: Object.keys(results).length }
    );
  }

  /**
   * 서브에이전트 결과 처리
   */
  private async handleSubAgentResult(result: TaskResult): Promise<void> {
    this.logger.info('Received sub-agent result', {
      taskId: result.taskId,
      status: result.status,
    });
  }
}

// =============================================================================
// Membership SubAgent - 멤버십 등급 관리
// =============================================================================

export class MembershipSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Membership SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as MembershipTaskPayload;

    this.logger.info('Membership SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'evaluate_tier':
        return await this.evaluateTier(data, startTime);

      case 'apply_benefits':
        return await this.applyBenefits(data, startTime);

      case 'process_upgrade':
        return await this.processUpgrade(data, startTime);

      case 'send_notification':
        return await this.sendTierNotification(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 등급 평가
   */
  private async evaluateTier(data: MembershipTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Evaluating member tiers...');

    // 등급 평가 로직
    const evaluationResults: TierChangeHistory[] = [];
    const changes: TierChangeHistory[] = [];

    // 샘플 등급 변경 (실제로는 DB 조회 후 평가)
    const sampleChange: TierChangeHistory = {
      id: `change-${Date.now()}`,
      memberId: data.memberId || 'sample-member',
      previousTier: MembershipTier.SILVER,
      newTier: MembershipTier.GOLD,
      changeType: 'upgrade',
      reason: '구매 금액 기준 충족 (600,000원)',
      changedAt: new Date(),
      evaluationData: {
        purchaseAmount: 650000,
        purchaseCount: 12,
        evaluationPeriodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        evaluationPeriodEnd: new Date(),
      },
    };

    if (Math.random() > 0.7) {
      changes.push(sampleChange);
    }

    return this.createSuccessResult(
      {
        evaluatedCount: 100,
        changes,
        evaluatedAt: new Date(),
      },
      startTime,
      { processed: changes.length }
    );
  }

  /**
   * 혜택 적용
   */
  private async applyBenefits(data: MembershipTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Applying benefits...', { memberId: data.memberId });

    const appliedBenefits = {
      memberId: data.memberId,
      tier: MembershipTier.GOLD,
      benefits: [
        { type: 'discount', value: 10, description: '골드 등급 10% 할인' },
        { type: 'free_shipping', value: 0, description: '5만원 이상 무료배송' },
        { type: 'point_multiplier', value: 1.5, description: '포인트 1.5배 적립' },
      ],
      appliedAt: new Date(),
    };

    return this.createSuccessResult(
      { appliedBenefits },
      startTime
    );
  }

  /**
   * 승급 처리
   */
  private async processUpgrade(data: MembershipTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Processing upgrade...', { memberId: data.memberId });

    const upgradeResult = {
      memberId: data.memberId,
      previousTier: MembershipTier.SILVER,
      newTier: MembershipTier.GOLD,
      upgraded: true,
      upgradedAt: new Date(),
      newBenefits: ['10% 할인', '무료배송 기준 인하', '포인트 1.5배'],
    };

    return this.createSuccessResult(
      { upgradeResult },
      startTime
    );
  }

  /**
   * 등급 알림 발송
   */
  private async sendTierNotification(data: MembershipTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Sending tier notification...', { type: data.notificationType });

    const notificationResult = {
      type: data.notificationType,
      sentCount: 50,
      sentAt: new Date(),
    };

    return this.createSuccessResult(
      { notificationResult },
      startTime
    );
  }
}

// =============================================================================
// Point SubAgent - 포인트 관리
// =============================================================================

export class PointSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Point SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as PointTaskPayload;

    this.logger.info('Point SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'earn_points':
        return await this.earnPoints(data, startTime);

      case 'use_points':
        return await this.usePoints(data, startTime);

      case 'expire_points':
        return await this.expirePoints(data, startTime);

      case 'cancel_transaction':
        return await this.cancelTransaction(data, startTime);

      case 'calculate_expiry':
        return await this.calculateExpiry(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 포인트 적립
   */
  private async earnPoints(data: PointTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Earning points...', { memberId: data.memberId, amount: data.amount });

    const transaction: PointTransaction = {
      id: `tx-${Date.now()}`,
      memberId: data.memberId,
      type: PointTransactionType.EARN_PURCHASE,
      amount: data.amount || 0,
      balance: (data.amount || 0) + 5000, // 기존 잔액 + 적립
      orderId: data.orderId,
      description: `주문 #${data.orderId} 구매 적립`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { transaction, newBalance: transaction.balance },
      startTime
    );
  }

  /**
   * 포인트 사용
   */
  private async usePoints(data: PointTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Using points...', { memberId: data.memberId, amount: data.amount });

    const transaction: PointTransaction = {
      id: `tx-${Date.now()}`,
      memberId: data.memberId,
      type: PointTransactionType.USE_ORDER,
      amount: -(data.amount || 0),
      balance: 5000 - (data.amount || 0), // 기존 잔액 - 사용
      orderId: data.orderId,
      description: `주문 #${data.orderId} 사용`,
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { transaction, newBalance: transaction.balance },
      startTime
    );
  }

  /**
   * 포인트 소멸 처리
   */
  private async expirePoints(data: PointTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Processing point expiry...');

    const expiryResult = {
      expiredCount: 15,
      totalExpiredPoints: 75000,
      upcomingExpiry: [
        { memberId: 'm-001', amount: 3000, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { memberId: 'm-002', amount: 5000, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      ],
      processedAt: new Date(),
    };

    return this.createSuccessResult(
      { expiryResult },
      startTime,
      { processed: expiryResult.expiredCount }
    );
  }

  /**
   * 트랜잭션 취소
   */
  private async cancelTransaction(data: PointTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Cancelling transaction...', { transactionId: data.transactionId });

    const cancelResult = {
      originalTransactionId: data.transactionId,
      cancelled: true,
      refundedAmount: data.amount,
      cancelledAt: new Date(),
    };

    return this.createSuccessResult(
      { cancelResult },
      startTime
    );
  }

  /**
   * 소멸 예정 계산
   */
  private async calculateExpiry(data: PointTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Calculating expiry...', { memberId: data.memberId });

    const expirySchedule = {
      memberId: data.memberId,
      upcomingExpiry: [
        { amount: 2000, expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { amount: 3000, expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      ],
      totalExpiringIn30Days: 2000,
      totalExpiringIn90Days: 5000,
      calculatedAt: new Date(),
    };

    return this.createSuccessResult(
      { expirySchedule },
      startTime
    );
  }
}

// =============================================================================
// VIP SubAgent - VIP 케어 및 이탈 방지
// =============================================================================

export class VIPSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('VIP SubAgent initialized');
  }

  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const data = context.data as VIPTaskPayload;

    this.logger.info('VIP SubAgent processing', { action: data?.action });

    switch (data?.action) {
      case 'analyze_churn_risk':
        return await this.analyzeChurnRisk(data, startTime);

      case 'create_care_activity':
        return await this.createCareActivity(data, startTime);

      case 'execute_retention':
        return await this.executeRetention(data, startTime);

      case 'update_vip_score':
        return await this.updateVIPScore(data, startTime);

      default:
        return this.createErrorResult('UNKNOWN_ACTION', `Unknown action: ${data?.action}`, startTime, false);
    }
  }

  /**
   * 이탈 위험 분석
   */
  private async analyzeChurnRisk(data: VIPTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Analyzing churn risk...');

    const analysisResult = {
      totalAnalyzed: 50,
      riskDistribution: {
        low: 30,
        medium: 12,
        high: 6,
        critical: 2,
      },
      highRiskCount: 8,
      highRiskMembers: [
        {
          memberId: 'vip-001',
          name: '김VIP',
          tier: MembershipTier.VIP,
          riskLevel: 'critical',
          riskScore: 0.85,
          lastPurchaseDays: 45,
          factors: ['구매 빈도 감소', '최근 CS 불만', '경쟁사 구매 의심'],
          recommendedAction: '즉시 전화 연락',
        },
        {
          memberId: 'vip-002',
          name: '이프리미엄',
          tier: MembershipTier.PLATINUM,
          riskLevel: 'high',
          riskScore: 0.72,
          lastPurchaseDays: 38,
          factors: ['구매 금액 감소', '사이트 방문 감소'],
          recommendedAction: '특별 할인 쿠폰 발송',
        },
      ],
      analyzedAt: new Date(),
    };

    return this.createSuccessResult(
      { analysisResult },
      startTime,
      { processed: analysisResult.totalAnalyzed }
    );
  }

  /**
   * 케어 활동 생성
   */
  private async createCareActivity(data: VIPTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Creating care activity...', { vipProfileId: data.vipProfileId });

    const activity: VIPCareActivity = {
      id: `activity-${Date.now()}`,
      vipProfileId: data.vipProfileId || 'unknown',
      activityType: (data.activityData?.activityType as any) || 'call',
      title: data.activityData?.title || 'VIP 케어 전화',
      content: data.activityData?.content || 'VIP 고객 감사 인사 및 피드백 수집',
      performedBy: 'vip-care-team',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { activity },
      startTime
    );
  }

  /**
   * 리텐션 캠페인 실행
   */
  private async executeRetention(data: VIPTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Executing retention campaign...', { campaignId: data.campaignId });

    const campaign: Partial<RetentionCampaign> = {
      id: data.campaignId || `campaign-${Date.now()}`,
      name: data.retentionCampaignData?.name || 'VIP 이탈 방지 캠페인',
      targetSegment: {
        tierLevels: [MembershipTier.VIP, MembershipTier.PLATINUM],
        churnRiskLevel: ['high', 'critical'],
        inactiveDaysMin: 30,
      },
      offer: {
        type: 'discount',
        value: 20,
        description: 'VIP 특별 20% 할인',
        validityDays: 14,
      },
      channels: ['email', 'kakao'],
      messageTemplate: {
        subject: '[썬데이허그] 소중한 고객님께 드리는 특별한 혜택',
        content: '오랜만에 인사드립니다. 특별한 혜택을 준비했습니다.',
      },
      stats: {
        targetCount: 20,
        sentCount: 20,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        reactivatedCount: 0,
      },
      status: 'running',
      createdAt: new Date(),
    };

    return this.createSuccessResult(
      { campaign, executedAt: new Date() },
      startTime
    );
  }

  /**
   * VIP 점수 업데이트
   */
  private async updateVIPScore(data: VIPTaskPayload, startTime: number): Promise<AgentResult> {
    this.logger.info('Updating VIP scores...');

    const updateResult = {
      updatedCount: data.memberIds?.length || 50,
      scoreChanges: [
        { memberId: 'vip-001', previousScore: 85, newScore: 82, change: -3 },
        { memberId: 'vip-002', previousScore: 78, newScore: 80, change: 2 },
      ],
      updatedAt: new Date(),
    };

    return this.createSuccessResult(
      { updateResult },
      startTime,
      { processed: updateResult.updatedCount }
    );
  }
}

// =============================================================================
// Export
// =============================================================================

export default LoyaltyAgent;
