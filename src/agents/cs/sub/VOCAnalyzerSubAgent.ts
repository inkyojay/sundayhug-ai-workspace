/**
 * VOC분석 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 클레임분류, 패턴분석, 인사이트 도출
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  VOCItem,
  VOCCategory,
  VOCType,
  VOCAnalysisReport,
  SentimentType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * VOCAnalyzerSubAgent 클래스
 * VOC 분석을 담당하는 서브에이전트
 */
export class VOCAnalyzerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('VOCAnalyzerSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('VOCAnalyzerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'analyze_voc':
        const period = (context.data as { period?: string })?.period || 'daily';
        const result = await this.analyzeVOC(period);
        return this.createSuccessResult(result, startTime);

      case 'generate_voc_report':
        const reportPeriod = (context.data as { period?: string })?.period || 'daily';
        const report = await this.generateVOCReport(reportPeriod as 'daily' | 'weekly' | 'monthly');
        return this.createSuccessResult(report, startTime);

      case 'extract_voc_from_sources':
        const extracted = await this.extractVOCFromSources();
        return this.createSuccessResult(extracted, startTime);

      default:
        const defaultResult = await this.analyzeVOC('daily');
        return this.createSuccessResult(defaultResult, startTime);
    }
  }

  /**
   * VOC 분석 실행
   */
  async analyzeVOC(period: string): Promise<{ analyzed: number }> {
    this.logger.info('Analyzing VOC...', { period });

    // 1. 소스에서 VOC 추출
    const extracted = await this.extractVOCFromSources();

    // 2. 각 VOC 항목 분석
    for (const item of extracted.items) {
      await this.analyzeVOCItem(item);
    }

    return { analyzed: extracted.items.length };
  }

  /**
   * 소스에서 VOC 추출
   */
  async extractVOCFromSources(): Promise<{ items: VOCItem[] }> {
    const items: VOCItem[] = [];

    // 문의에서 VOC 추출
    const inquiryItems = await this.extractFromInquiries();
    items.push(...inquiryItems);

    // 리뷰에서 VOC 추출
    const reviewItems = await this.extractFromReviews();
    items.push(...reviewItems);

    // 클레임에서 VOC 추출
    const claimItems = await this.extractFromClaims();
    items.push(...claimItems);

    return { items };
  }

  /**
   * 문의에서 VOC 추출
   */
  private async extractFromInquiries(): Promise<VOCItem[]> {
    const db = this.getDatabase('inquiries');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.findMany<{
      id: string;
      content: string;
      type: string;
      created_at: Date;
    }>({
      created_at: { $gte: yesterday },
    });

    if (result.error || !result.data) {
      return [];
    }

    return result.data.map((inquiry) => this.createVOCItem(
      'inquiry',
      inquiry.id,
      inquiry.content
    ));
  }

  /**
   * 리뷰에서 VOC 추출
   */
  private async extractFromReviews(): Promise<VOCItem[]> {
    const db = this.getDatabase('reviews');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.findMany<{
      id: string;
      content: string;
      rating: number;
      sentiment: SentimentType;
      collected_at: Date;
    }>({
      collected_at: { $gte: yesterday },
    });

    if (result.error || !result.data) {
      return [];
    }

    // 중립/부정적 리뷰만 VOC로 추출
    return result.data
      .filter((review) => review.sentiment !== SentimentType.POSITIVE || review.rating <= 3)
      .map((review) => this.createVOCItem('review', review.id, review.content));
  }

  /**
   * 클레임에서 VOC 추출
   */
  private async extractFromClaims(): Promise<VOCItem[]> {
    const db = this.getDatabase('claims');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.findMany<{
      id: string;
      description: string;
      type: string;
      created_at: Date;
    }>({
      created_at: { $gte: yesterday },
    });

    if (result.error || !result.data) {
      return [];
    }

    return result.data.map((claim) => this.createVOCItem(
      'claim',
      claim.id,
      claim.description
    ));
  }

  /**
   * VOC 항목 생성
   */
  private createVOCItem(
    source: 'inquiry' | 'review' | 'claim' | 'social',
    sourceId: string,
    content: string
  ): VOCItem {
    const analysis = this.analyzeContent(content);

    return {
      id: uuidv4(),
      source,
      sourceId,
      category: analysis.category,
      type: analysis.type,
      content,
      extractedKeywords: analysis.keywords,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      importance: analysis.importance,
      actionRequired: analysis.importance === 'high' || analysis.importance === 'critical',
      createdAt: new Date(),
      analyzedAt: new Date(),
    };
  }

  /**
   * 콘텐츠 분석
   */
  private analyzeContent(content: string): {
    category: VOCCategory;
    type: VOCType;
    keywords: string[];
    sentiment: SentimentType;
    sentimentScore: number;
    importance: 'low' | 'medium' | 'high' | 'critical';
  } {
    const lowerContent = content.toLowerCase();

    // 카테고리 분류
    const category = this.classifyCategory(lowerContent);

    // 유형 분류
    const type = this.classifyType(lowerContent);

    // 키워드 추출
    const keywords = this.extractKeywords(lowerContent);

    // 감정 분석
    const { sentiment, sentimentScore } = this.analyzeSentiment(lowerContent);

    // 중요도 판단
    const importance = this.assessImportance(sentiment, type, content.length);

    return { category, type, keywords, sentiment, sentimentScore, importance };
  }

  /**
   * 카테고리 분류
   */
  private classifyCategory(content: string): VOCCategory {
    const categoryKeywords: Record<VOCCategory, string[]> = {
      [VOCCategory.PRODUCT_QUALITY]: ['품질', '불량', '하자', '마감', '재질'],
      [VOCCategory.PRODUCT_FUNCTION]: ['기능', '작동', '고장', '안되', '안됨'],
      [VOCCategory.PACKAGING]: ['포장', '박스', '파손', '포장재'],
      [VOCCategory.DELIVERY]: ['배송', '배달', '택배', '도착', '지연'],
      [VOCCategory.PRICE]: ['가격', '비싸', '할인', '쿠폰'],
      [VOCCategory.CS]: ['상담', '응대', '답변', '연락'],
      [VOCCategory.WEBSITE]: ['사이트', '앱', '주문', '결제', '오류'],
      [VOCCategory.OTHER]: [],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => content.includes(kw))) {
        return category as VOCCategory;
      }
    }

    return VOCCategory.OTHER;
  }

  /**
   * 유형 분류
   */
  private classifyType(content: string): VOCType {
    const praiseKeywords = ['좋아', '최고', '만족', '감사', '추천'];
    const complaintKeywords = ['불만', '화나', '실망', '최악', '짜증'];
    const suggestionKeywords = ['제안', '건의', '바랍니다', '했으면', '개선'];

    if (praiseKeywords.some((kw) => content.includes(kw))) {
      return VOCType.PRAISE;
    }
    if (complaintKeywords.some((kw) => content.includes(kw))) {
      return VOCType.COMPLAINT;
    }
    if (suggestionKeywords.some((kw) => content.includes(kw))) {
      return VOCType.SUGGESTION;
    }

    return VOCType.INQUIRY;
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(content: string): string[] {
    const allKeywords = [
      '배송', '품질', '가격', '포장', '서비스', '응대', '불량', '교환', '환불',
      '사이즈', '색상', '재질', '디자인', '착용감', '마감', '냄새', '오염'
    ];

    return allKeywords.filter((kw) => content.includes(kw));
  }

  /**
   * 감정 분석
   */
  private analyzeSentiment(content: string): { sentiment: SentimentType; sentimentScore: number } {
    const positiveWords = ['좋아', '만족', '최고', '감사', '추천', '좋은', '빠른'];
    const negativeWords = ['불만', '실망', '최악', '별로', '화나', '짜증', '불량', '문제'];

    let score = 0;
    for (const word of positiveWords) {
      if (content.includes(word)) score += 0.2;
    }
    for (const word of negativeWords) {
      if (content.includes(word)) score -= 0.2;
    }

    score = Math.max(-1, Math.min(1, score));

    let sentiment: SentimentType;
    if (score > 0.2) sentiment = SentimentType.POSITIVE;
    else if (score < -0.2) sentiment = SentimentType.NEGATIVE;
    else sentiment = SentimentType.NEUTRAL;

    return { sentiment, sentimentScore: score };
  }

  /**
   * 중요도 판단
   */
  private assessImportance(
    sentiment: SentimentType,
    type: VOCType,
    contentLength: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (type === VOCType.COMPLAINT && sentiment === SentimentType.NEGATIVE) {
      if (contentLength > 200) return 'critical';
      return 'high';
    }

    if (type === VOCType.COMPLAINT) return 'medium';
    if (type === VOCType.SUGGESTION) return 'medium';

    return 'low';
  }

  /**
   * VOC 항목 분석 및 저장
   */
  private async analyzeVOCItem(item: VOCItem): Promise<void> {
    const db = this.getDatabase('voc_items');
    await db.create({
      ...item,
      created_at: item.createdAt,
      analyzed_at: item.analyzedAt,
    });
  }

  /**
   * VOC 리포트 생성
   */
  async generateVOCReport(period: 'daily' | 'weekly' | 'monthly'): Promise<VOCAnalysisReport> {
    this.logger.info('Generating VOC report...', { period });

    const db = this.getDatabase('voc_items');

    // 기간 설정
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const result = await db.findMany<VOCItem>({
      analyzed_at: { $gte: startDate },
    });

    const items = result.data || [];

    // 카테고리별 집계
    const byCategory = {} as Record<VOCCategory, number>;
    const byType = {} as Record<VOCType, number>;

    for (const item of items) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    // 감정 분포
    const positiveCount = items.filter((i) => i.sentiment === SentimentType.POSITIVE).length;
    const neutralCount = items.filter((i) => i.sentiment === SentimentType.NEUTRAL).length;
    const negativeCount = items.filter((i) => i.sentiment === SentimentType.NEGATIVE).length;

    // 주요 이슈 추출
    const issueMap = new Map<string, { count: number; category: VOCCategory }>();
    for (const item of items) {
      for (const keyword of item.extractedKeywords) {
        const existing = issueMap.get(keyword);
        if (existing) {
          existing.count++;
        } else {
          issueMap.set(keyword, { count: 1, category: item.category });
        }
      }
    }

    const topIssues = Array.from(issueMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([issue, data]) => ({
        issue,
        count: data.count,
        category: data.category,
        priority: data.count > 10 ? 'high' as const : data.count > 5 ? 'medium' as const : 'low' as const,
      }));

    // 인사이트 생성
    const insights = this.generateInsights(items, topIssues);
    const recommendations = this.generateRecommendations(topIssues);

    return {
      period: { start: startDate, end: now },
      totalItems: items.length,
      byCategory,
      byType,
      sentimentTrend: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
        trend: negativeCount > positiveCount ? 'declining' : positiveCount > negativeCount * 2 ? 'improving' : 'stable',
      },
      topIssues,
      insights,
      recommendations,
    };
  }

  /**
   * 인사이트 생성
   */
  private generateInsights(items: VOCItem[], topIssues: { issue: string; count: number }[]): string[] {
    const insights: string[] = [];

    if (items.length > 0) {
      const negativeRatio = items.filter((i) => i.sentiment === SentimentType.NEGATIVE).length / items.length;
      if (negativeRatio > 0.3) {
        insights.push(`부정적 의견이 ${Math.round(negativeRatio * 100)}%로 높은 편입니다. 원인 분석이 필요합니다.`);
      }
    }

    if (topIssues.length > 0) {
      insights.push(`가장 많이 언급된 키워드는 "${topIssues[0].issue}"입니다.`);
    }

    return insights;
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(topIssues: { issue: string; category: VOCCategory }[]): string[] {
    const recommendations: string[] = [];

    for (const issue of topIssues.slice(0, 3)) {
      switch (issue.category) {
        case VOCCategory.DELIVERY:
          recommendations.push('배송 프로세스 점검 및 택배사 성과 리뷰');
          break;
        case VOCCategory.PRODUCT_QUALITY:
          recommendations.push('품질 관리 프로세스 강화');
          break;
        case VOCCategory.CS:
          recommendations.push('고객 응대 교육 및 응답 시간 개선');
          break;
      }
    }

    return [...new Set(recommendations)];
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'analyzing',
      message: 'VOC 분석 중...',
    };
  }
}

export default VOCAnalyzerSubAgent;
