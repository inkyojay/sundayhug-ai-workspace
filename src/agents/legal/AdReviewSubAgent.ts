/**
 * 광고심의 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 광고문구검토, 위반방지를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
} from '../../types';
import {
  AdReviewRequest,
  AdReviewResult,
  AdReviewStatus,
  AdViolation,
  AdViolationType,
  AdCopyCheckResult,
  AdCopyIssue,
  RiskLevel,
  AdReviewTaskPayload,
  AdReviewResult as AdReviewResultType,
} from './types';

/**
 * 금지/주의 키워드
 */
const PROHIBITED_KEYWORDS: Record<string, { type: AdViolationType; severity: RiskLevel; suggestion?: string }> = {
  '최고': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.MEDIUM, suggestion: '우수한' },
  '최상': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.MEDIUM, suggestion: '뛰어난' },
  '최저가': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.HIGH, suggestion: '합리적인 가격' },
  '무조건': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.MEDIUM, suggestion: '대부분의 경우' },
  '100%': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.MEDIUM, suggestion: '높은 비율로' },
  '완벽': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.LOW, suggestion: '우수한' },
  '기적': { type: AdViolationType.UNVERIFIED_CLAIM, severity: RiskLevel.HIGH },
  '치료': { type: AdViolationType.UNVERIFIED_CLAIM, severity: RiskLevel.CRITICAL },
  '효능': { type: AdViolationType.UNVERIFIED_CLAIM, severity: RiskLevel.HIGH },
  '효과': { type: AdViolationType.UNVERIFIED_CLAIM, severity: RiskLevel.MEDIUM },
  '즉시': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.LOW, suggestion: '빠르게' },
  '특허': { type: AdViolationType.UNVERIFIED_CLAIM, severity: RiskLevel.HIGH },
  '인증': { type: AdViolationType.UNVERIFIED_CLAIM, severity: RiskLevel.MEDIUM },
  '1위': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.HIGH },
  '업계최초': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.HIGH },
  '세계최초': { type: AdViolationType.FALSE_CLAIM, severity: RiskLevel.HIGH },
};

/**
 * 광고심의 서브에이전트 클래스
 */
export class AdReviewSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Ad Review SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<AdReviewResultType>> {
    const startTime = Date.now();
    const payload = context.data as AdReviewTaskPayload;

    this.logger.info('Running Ad Review SubAgent', {
      action: payload.action,
    });

    try {
      let result: AdReviewResultType;

      switch (payload.action) {
        case 'review':
          result = await this.reviewAd(payload.adReviewRequest!, payload.options);
          break;

        case 'check_copy':
          result = await this.checkAdCopies(payload.adCopies || [], payload.options);
          break;

        case 'batch_review':
          result = await this.batchReviewAds(payload.options);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Ad review failed', error as Error);
      throw error;
    }
  }

  /**
   * 광고 심의
   */
  private async reviewAd(
    request: AdReviewRequest,
    options?: AdReviewTaskPayload['options']
  ): Promise<AdReviewResultType> {
    this.logger.info(`Reviewing ad: ${request.title}`);

    const violations: AdViolation[] = [];
    const revisionRequests: string[] = [];

    // 광고 내용 검토
    const copyCheckResult = await this.analyzeAdCopy(
      request.content,
      options?.strictMode as boolean
    );

    if (!copyCheckResult.passed) {
      for (const issue of copyCheckResult.issues) {
        violations.push({
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          location: issue.problematicText,
          suggestion: issue.suggestedReplacement,
        });

        if (issue.suggestedReplacement) {
          revisionRequests.push(
            `"${issue.problematicText}"를 "${issue.suggestedReplacement}"로 수정하세요.`
          );
        } else {
          revisionRequests.push(`"${issue.problematicText}" 문구를 삭제 또는 수정하세요.`);
        }
      }
    }

    // 이미지 검토 (URL이 있는 경우)
    if (request.imageUrls && request.imageUrls.length > 0) {
      // 실제 구현에서는 이미지 분석 API 호출
      this.logger.info(`Checking ${request.imageUrls.length} images...`);
    }

    // 심의 결과 결정
    let status: AdReviewStatus;
    if (violations.some(v => v.severity === RiskLevel.CRITICAL)) {
      status = AdReviewStatus.REJECTED;
    } else if (violations.some(v => v.severity === RiskLevel.HIGH)) {
      status = AdReviewStatus.REVISION_REQUIRED;
    } else if (violations.some(v => v.severity === RiskLevel.MEDIUM)) {
      status = AdReviewStatus.CONDITIONALLY_APPROVED;
    } else {
      status = AdReviewStatus.APPROVED;
    }

    // 심의 결과 저장
    request.status = status;
    request.reviewResult = {
      status,
      reviewedBy: 'ai',
      reviewedAt: new Date(),
      violations: violations.length > 0 ? violations : undefined,
      revisionRequests: revisionRequests.length > 0 ? revisionRequests : undefined,
      comments: this.generateReviewComments(violations, status),
    };

    const db = this.getDatabase('ad_reviews');
    await db.update(request.id, request);

    this.logger.info(`Ad review completed: ${request.id} -> ${status}`);

    return {
      reviewedAds: [request],
      copyCheckResults: [copyCheckResult],
      summary: {
        total: 1,
        approved: status === AdReviewStatus.APPROVED ? 1 : 0,
        rejected: status === AdReviewStatus.REJECTED ? 1 : 0,
        revisionRequired: status === AdReviewStatus.REVISION_REQUIRED ||
                          status === AdReviewStatus.CONDITIONALLY_APPROVED ? 1 : 0,
      },
    };
  }

  /**
   * 광고 문구 검토
   */
  private async checkAdCopies(
    copies: string[],
    options?: AdReviewTaskPayload['options']
  ): Promise<AdReviewResultType> {
    const copyCheckResults: AdCopyCheckResult[] = [];
    let passedCount = 0;

    for (const copy of copies) {
      const result = await this.analyzeAdCopy(copy, options?.strictMode as boolean);
      copyCheckResults.push(result);
      if (result.passed) passedCount++;
    }

    return {
      copyCheckResults,
      summary: {
        total: copies.length,
        approved: passedCount,
        rejected: 0,
        revisionRequired: copies.length - passedCount,
      },
    };
  }

  /**
   * 일괄 심의
   */
  private async batchReviewAds(options?: AdReviewTaskPayload['options']): Promise<AdReviewResultType> {
    const db = this.getDatabase('ad_reviews');
    const pendingResult = await db.findByCondition<AdReviewRequest>({
      status: AdReviewStatus.PENDING,
    });

    const pendingAds = pendingResult.data || [];
    const reviewedAds: AdReviewRequest[] = [];
    const copyCheckResults: AdCopyCheckResult[] = [];

    let approved = 0;
    let rejected = 0;
    let revisionRequired = 0;

    for (const ad of pendingAds) {
      const result = await this.reviewAd(ad, options);
      if (result.reviewedAds) {
        reviewedAds.push(...result.reviewedAds);
      }
      if (result.copyCheckResults) {
        copyCheckResults.push(...result.copyCheckResults);
      }

      if (result.summary) {
        approved += result.summary.approved;
        rejected += result.summary.rejected;
        revisionRequired += result.summary.revisionRequired;
      }
    }

    this.logger.info(`Batch review completed: ${reviewedAds.length} ads processed`);

    return {
      reviewedAds,
      copyCheckResults,
      summary: {
        total: reviewedAds.length,
        approved,
        rejected,
        revisionRequired,
      },
    };
  }

  /**
   * 광고 문구 분석
   */
  private async analyzeAdCopy(copy: string, strictMode: boolean = false): Promise<AdCopyCheckResult> {
    const issues: AdCopyIssue[] = [];
    let riskScore = 0;

    // 금지 키워드 검사
    for (const [keyword, config] of Object.entries(PROHIBITED_KEYWORDS)) {
      if (copy.includes(keyword)) {
        const severity = strictMode && config.severity === RiskLevel.LOW
          ? RiskLevel.MEDIUM
          : config.severity;

        issues.push({
          type: config.type,
          problematicText: keyword,
          description: this.getViolationDescription(config.type, keyword),
          severity,
          suggestedReplacement: config.suggestion,
        });

        // 위험 점수 계산
        const severityScores: Record<RiskLevel, number> = {
          [RiskLevel.CRITICAL]: 40,
          [RiskLevel.HIGH]: 25,
          [RiskLevel.MEDIUM]: 15,
          [RiskLevel.LOW]: 5,
          [RiskLevel.NONE]: 0,
        };
        riskScore += severityScores[severity];
      }
    }

    // 점수 정규화 (0-100)
    riskScore = Math.min(100, riskScore);

    return {
      originalCopy: copy,
      passed: issues.length === 0 || (riskScore < 30 && !strictMode),
      riskScore,
      issues,
      suggestions: issues
        .filter(i => i.suggestedReplacement)
        .map(i => `"${i.problematicText}" → "${i.suggestedReplacement}"`),
      checkedAt: new Date(),
    };
  }

  /**
   * 위반 설명 생성
   */
  private getViolationDescription(type: AdViolationType, keyword: string): string {
    const descriptions: Record<AdViolationType, string> = {
      [AdViolationType.FALSE_CLAIM]: `"${keyword}"은(는) 객관적 근거 없이 사용할 수 없는 과장 표현입니다.`,
      [AdViolationType.UNVERIFIED_CLAIM]: `"${keyword}"은(는) 인증되지 않은 효능/효과 주장으로 사용이 제한됩니다.`,
      [AdViolationType.MISLEADING]: `"${keyword}"은(는) 소비자 오인을 유발할 수 있는 표현입니다.`,
      [AdViolationType.COMPARATIVE]: `"${keyword}"은(는) 비교 광고 규정 위반 소지가 있습니다.`,
      [AdViolationType.PRICING]: `"${keyword}"은(는) 가격 표시 규정 위반 소지가 있습니다.`,
      [AdViolationType.SAFETY]: `"${keyword}"은(는) 안전 정보 관련 규정 위반 소지가 있습니다.`,
      [AdViolationType.PERSONAL_INFO]: `"${keyword}"은(는) 개인정보 관련 규정 위반 소지가 있습니다.`,
      [AdViolationType.COPYRIGHT]: `"${keyword}"은(는) 저작권 관련 문제가 있을 수 있습니다.`,
      [AdViolationType.OTHER]: `"${keyword}"은(는) 광고 심의 기준에 부적합할 수 있습니다.`,
    };

    return descriptions[type] || `"${keyword}"은(는) 광고 심의 기준 검토가 필요합니다.`;
  }

  /**
   * 심의 의견 생성
   */
  private generateReviewComments(violations: AdViolation[], status: AdReviewStatus): string {
    if (status === AdReviewStatus.APPROVED) {
      return '광고 심의 기준을 충족합니다. 사용 가능합니다.';
    }

    if (status === AdReviewStatus.REJECTED) {
      return `심각한 규정 위반이 발견되어 광고 사용이 불가합니다. ` +
             `${violations.filter(v => v.severity === RiskLevel.CRITICAL).length}개의 심각한 문제를 해결해야 합니다.`;
    }

    if (status === AdReviewStatus.REVISION_REQUIRED) {
      return `${violations.length}개의 수정이 필요한 항목이 있습니다. 수정 후 재심의를 요청하세요.`;
    }

    return `${violations.length}개의 주의 항목이 있습니다. 수정을 권장하지만, 현재 상태로 사용 가능합니다.`;
  }

  /**
   * 광고 심의 요청 생성
   */
  async createAdReviewRequest(
    title: string,
    content: string,
    adType: AdReviewRequest['adType'],
    options?: Partial<AdReviewRequest>
  ): Promise<AdReviewRequest> {
    const now = new Date();

    const request: AdReviewRequest = {
      id: `ad-${now.getTime()}`,
      adType,
      title,
      content,
      status: AdReviewStatus.PENDING,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
      ...options,
    };

    const db = this.getDatabase('ad_reviews');
    await db.create(request);

    this.logger.info('Created ad review request', { id: request.id, title });

    return request;
  }
}

export default AdReviewSubAgent;
