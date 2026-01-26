/**
 * 리뷰관리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 리뷰수집, 감정분석, 답변생성
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  Review,
  ReviewPlatform,
  ReviewResponse,
  ReviewAnalysisResult,
  SentimentType,
} from '../types';

/**
 * ReviewManagerSubAgent 클래스
 * 리뷰 수집 및 관리를 담당하는 서브에이전트
 */
export class ReviewManagerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('ReviewManagerSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('ReviewManagerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'collect_and_process_reviews':
        const result = await this.collectAndProcessReviews();
        return this.createSuccessResult(result, startTime);

      case 'generate_review_reply':
        const { reviewId } = context.data as { reviewId: string };
        const reply = await this.generateReviewReply(reviewId);
        return this.createSuccessResult(reply, startTime);

      case 'analyze_reviews':
        const analysisResult = await this.analyzeReviews();
        return this.createSuccessResult(analysisResult, startTime);

      default:
        const defaultResult = await this.collectAndProcessReviews();
        return this.createSuccessResult(defaultResult, startTime);
    }
  }

  /**
   * 리뷰 수집 및 처리
   */
  async collectAndProcessReviews(): Promise<{ processed: number }> {
    this.logger.info('Collecting and processing reviews...');

    let totalProcessed = 0;

    // 각 플랫폼에서 리뷰 수집
    const platforms = [ReviewPlatform.COUPANG, ReviewPlatform.NAVER, ReviewPlatform.CAFE24];

    for (const platform of platforms) {
      const reviews = await this.collectFromPlatform(platform);

      for (const review of reviews) {
        // 감정 분석
        const analyzedReview = await this.analyzeSentiment(review);

        // DB에 저장
        await this.saveReview(analyzedReview);

        // 부정적 리뷰 알림
        if (analyzedReview.sentiment === SentimentType.NEGATIVE && analyzedReview.rating <= 2) {
          await this.notifyNegativeReview(analyzedReview);
        }

        // 자동 답변 생성 (긍정적 리뷰)
        if (analyzedReview.sentiment === SentimentType.POSITIVE && analyzedReview.rating >= 4 && !analyzedReview.hasResponse) {
          const reply = await this.generateAutoReply(analyzedReview);
          if (reply) {
            await this.postReplyToPlatform(analyzedReview, reply);
          }
        }

        totalProcessed++;
      }
    }

    return { processed: totalProcessed };
  }

  /**
   * 플랫폼에서 리뷰 수집
   */
  private async collectFromPlatform(platform: ReviewPlatform): Promise<Review[]> {
    this.logger.info(`Collecting reviews from ${platform}...`);

    // TODO: 실제 플랫폼 API 연동
    await this.sleep(300);

    // 시뮬레이션 데이터
    return [];
  }

  /**
   * 감정 분석
   */
  private async analyzeSentiment(review: Review): Promise<Review> {
    // 간단한 규칙 기반 감정 분석
    const positiveWords = ['좋아요', '최고', '만족', '추천', '감사', '빠른', '친절', '좋은', '예쁜', '깔끔'];
    const negativeWords = ['불만', '실망', '최악', '별로', '느린', '불친절', '문제', '고장', '불량', '늦은'];

    const content = review.content.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of positiveWords) {
      if (content.includes(word)) positiveScore++;
    }
    for (const word of negativeWords) {
      if (content.includes(word)) negativeScore++;
    }

    // 별점 가중치 적용
    if (review.rating >= 4) positiveScore += 2;
    else if (review.rating <= 2) negativeScore += 2;

    let sentiment: SentimentType;
    let sentimentScore: number;

    if (positiveScore > negativeScore + 1) {
      sentiment = SentimentType.POSITIVE;
      sentimentScore = 0.5 + Math.min(positiveScore * 0.1, 0.5);
    } else if (negativeScore > positiveScore + 1) {
      sentiment = SentimentType.NEGATIVE;
      sentimentScore = -(0.5 + Math.min(negativeScore * 0.1, 0.5));
    } else {
      sentiment = SentimentType.NEUTRAL;
      sentimentScore = (positiveScore - negativeScore) * 0.1;
    }

    // 키워드 추출
    const keywords = this.extractKeywords(review.content);

    return {
      ...review,
      sentiment,
      sentimentScore,
      keywords,
    };
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    const importantWords = ['배송', '품질', '가격', '디자인', '사이즈', '색상', '포장', '착용감', '마감'];

    for (const word of importantWords) {
      if (content.includes(word)) {
        keywords.push(word);
      }
    }

    return keywords;
  }

  /**
   * 리뷰 저장
   */
  private async saveReview(review: Review): Promise<void> {
    const db = this.getDatabase('reviews');
    await db.upsert({ platform_review_id: review.platformReviewId }, {
      ...review,
      collected_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * 부정적 리뷰 알림
   */
  private async notifyNegativeReview(review: Review): Promise<void> {
    this.logger.warn('Negative review detected', {
      reviewId: review.id,
      platform: review.platform,
      rating: review.rating,
    });

    await this.notifyParent(
      '부정적 리뷰 감지',
      `[${review.platform}] ${review.productName}\n별점: ${review.rating}\n내용: ${review.content.substring(0, 100)}...`
    );
  }

  /**
   * 리뷰 답변 생성
   */
  async generateReviewReply(reviewId: string): Promise<{ reply: string }> {
    const db = this.getDatabase('reviews');
    const result = await db.findById<Review>(reviewId);

    if (result.error || !result.data) {
      return { reply: '' };
    }

    const reply = await this.generateAutoReply(result.data);
    return { reply: reply || '' };
  }

  /**
   * 자동 답변 생성
   */
  private async generateAutoReply(review: Review): Promise<string | null> {
    if (review.sentiment === SentimentType.POSITIVE) {
      return this.generatePositiveReply(review);
    } else if (review.sentiment === SentimentType.NEUTRAL) {
      return this.generateNeutralReply(review);
    } else {
      // 부정적 리뷰는 수동 검토 필요
      return null;
    }
  }

  /**
   * 긍정적 리뷰 답변 생성
   */
  private generatePositiveReply(review: Review): string {
    const templates = [
      `안녕하세요, ${review.customerName}님! 썬데이허그입니다.\n\n소중한 리뷰 남겨주셔서 진심으로 감사드립니다. 저희 제품에 만족하셨다니 정말 기쁩니다.\n\n앞으로도 더 좋은 제품과 서비스로 보답하겠습니다. 항상 응원해 주세요!`,
      `${review.customerName}님, 따뜻한 리뷰 감사합니다!\n\n고객님의 만족이 저희에게 큰 힘이 됩니다. 앞으로도 변함없는 품질과 서비스로 찾아뵙겠습니다.\n\n감사합니다, 좋은 하루 되세요!`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * 중립적 리뷰 답변 생성
   */
  private generateNeutralReply(review: Review): string {
    return `안녕하세요, ${review.customerName}님. 썬데이허그입니다.\n\n소중한 리뷰 남겨주셔서 감사합니다. 고객님의 의견을 바탕으로 더 나은 제품과 서비스를 제공하기 위해 노력하겠습니다.\n\n추가 문의사항이 있으시면 언제든 연락 주세요. 감사합니다.`;
  }

  /**
   * 플랫폼에 답변 등록
   */
  private async postReplyToPlatform(review: Review, reply: string): Promise<void> {
    // TODO: 실제 플랫폼 API로 답변 등록
    this.logger.info('Posting reply to platform', {
      reviewId: review.id,
      platform: review.platform,
    });

    const db = this.getDatabase('reviews');
    await db.update({ id: review.id }, {
      has_response: true,
      response: {
        content: reply,
        respondedBy: 'ai',
        respondedAt: new Date(),
      },
      updated_at: new Date(),
    });
  }

  /**
   * 리뷰 분석
   */
  async analyzeReviews(): Promise<ReviewAnalysisResult> {
    const db = this.getDatabase('reviews');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 최근 일주일 리뷰 조회
    const result = await db.findMany<Review>({
      collected_at: { $gte: weekAgo },
    });

    const reviews = result.data || [];

    const sentimentDistribution = {
      positive: reviews.filter((r) => r.sentiment === SentimentType.POSITIVE).length,
      neutral: reviews.filter((r) => r.sentiment === SentimentType.NEUTRAL).length,
      negative: reviews.filter((r) => r.sentiment === SentimentType.NEGATIVE).length,
    };

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // 키워드 빈도 분석
    const keywordCounts: Record<string, { positive: number; negative: number }> = {};
    for (const review of reviews) {
      for (const keyword of review.keywords) {
        if (!keywordCounts[keyword]) {
          keywordCounts[keyword] = { positive: 0, negative: 0 };
        }
        if (review.sentiment === SentimentType.POSITIVE) {
          keywordCounts[keyword].positive++;
        } else if (review.sentiment === SentimentType.NEGATIVE) {
          keywordCounts[keyword].negative++;
        }
      }
    }

    const topPositiveKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b.positive - a.positive)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    const topNegativeKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b.negative - a.negative)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    return {
      totalReviews: reviews.length,
      averageRating,
      sentimentDistribution,
      topPositiveKeywords,
      topNegativeKeywords,
      improvementSuggestions: this.generateImprovementSuggestions(topNegativeKeywords),
      period: { start: weekAgo, end: now },
    };
  }

  /**
   * 개선 제안 생성
   */
  private generateImprovementSuggestions(negativeKeywords: string[]): string[] {
    const suggestions: string[] = [];

    if (negativeKeywords.includes('배송')) {
      suggestions.push('배송 서비스 품질 점검 및 택배사 재검토 필요');
    }
    if (negativeKeywords.includes('품질')) {
      suggestions.push('제품 품질 관리 강화 및 QC 프로세스 점검');
    }
    if (negativeKeywords.includes('사이즈')) {
      suggestions.push('상세페이지 사이즈 가이드 보완 필요');
    }
    if (negativeKeywords.includes('포장')) {
      suggestions.push('포장 방식 개선 검토');
    }

    return suggestions;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'analyzing',
      message: '리뷰 분석 중...',
    };
  }
}

export default ReviewManagerSubAgent;
