/**
 * 썬데이허그 AI 에이전트 시스템 - Social Listening SubAgent
 *
 * 소셜 리스닝 담당 서브 에이전트입니다.
 * - 커뮤니티 모니터링 (맘카페, 블로그, SNS)
 * - 브랜드/제품 언급 수집
 * - 트렌드 및 감성 분석
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, DateRange } from '../../../types';
import {
  SocialMention,
  TrendAnalysis,
} from '../types';

/**
 * Social Listening SubAgent 클래스
 */
export class SocialListeningSubAgent extends SubAgent {
  /** 모니터링 키워드 */
  private monitoringKeywords: string[] = [
    '썬데이허그', 'sundayhug', '아기침대', '백색소음기', '슬리핑백',
  ];

  /** 경쟁사 키워드 */
  private competitorKeywords: string[] = [
    // 경쟁사 브랜드명 (실제 구현 시 설정에서 로드)
  ];

  constructor(config: SubAgentConfig) {
    super(config);
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    this.logger.info('Social Listening SubAgent initializing...');
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = context.data?.taskType as string;

    try {
      let result: unknown;

      switch (taskType) {
        case 'collect_mentions':
          result = await this.collectMentions();
          break;
        case 'analyze_trends':
          result = await this.analyzeTrends(context.data);
          break;
        case 'sentiment_analysis':
          result = await this.analyzeSentiment(context.data);
          break;
        default:
          result = await this.getDailyMentions();
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('Social Listening SubAgent cleanup...');
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 멘션 수집
   */
  async collectMentions(): Promise<{ collected: number; platforms: Record<string, number> }> {
    this.logger.info('Collecting social mentions...');

    const platforms = ['instagram', 'blog', 'cafe', 'twitter', 'youtube'];
    const platformCounts: Record<string, number> = {};
    let totalCollected = 0;

    for (const platform of platforms) {
      const mentions = await this.collectPlatformMentions(platform);
      platformCounts[platform] = mentions.length;
      totalCollected += mentions.length;

      // 데이터베이스에 저장
      const db = this.getDatabase('social_mentions');
      for (const mention of mentions) {
        await db.create(mention);
      }
    }

    this.logger.info(`Collected ${totalCollected} mentions across ${platforms.length} platforms`);

    return { collected: totalCollected, platforms: platformCounts };
  }

  /**
   * 플랫폼별 멘션 수집
   */
  private async collectPlatformMentions(platform: string): Promise<SocialMention[]> {
    // 실제 구현 시 각 플랫폼 API 또는 크롤링
    const mentions: SocialMention[] = [];

    for (const keyword of this.monitoringKeywords) {
      const results = await this.searchPlatform(platform, keyword);
      mentions.push(...results);
    }

    // 중복 제거
    const uniqueMentions = this.deduplicateMentions(mentions);

    // 감성 분석 적용
    for (const mention of uniqueMentions) {
      const sentiment = await this.analyzeMentionSentiment(mention.content);
      mention.sentiment = sentiment.label;
      mention.sentimentScore = sentiment.score;
    }

    return uniqueMentions;
  }

  /**
   * 플랫폼 검색
   */
  private async searchPlatform(platform: string, keyword: string): Promise<SocialMention[]> {
    // 실제 구현 시 각 플랫폼 API 호출
    return [];
  }

  /**
   * 멘션 중복 제거
   */
  private deduplicateMentions(mentions: SocialMention[]): SocialMention[] {
    const seen = new Set<string>();
    return mentions.filter(m => {
      if (seen.has(m.url)) return false;
      seen.add(m.url);
      return true;
    });
  }

  /**
   * 멘션 감성 분석
   */
  private async analyzeMentionSentiment(content: string): Promise<{
    label: 'positive' | 'neutral' | 'negative';
    score: number;
  }> {
    // 실제 구현 시 NLP 모델 사용
    // 간단한 키워드 기반 분석 예시
    const positiveKeywords = ['좋아요', '추천', '만족', '최고', '감사', '예뻐요', '편해요'];
    const negativeKeywords = ['별로', '실망', '불만', '나빠요', '불편', '환불', '클레임'];

    const lowerContent = content.toLowerCase();
    const positiveCount = positiveKeywords.filter(k => lowerContent.includes(k)).length;
    const negativeCount = negativeKeywords.filter(k => lowerContent.includes(k)).length;

    if (positiveCount > negativeCount) {
      return { label: 'positive', score: Math.min(1, 0.5 + positiveCount * 0.1) };
    } else if (negativeCount > positiveCount) {
      return { label: 'negative', score: Math.max(-1, -0.5 - negativeCount * 0.1) };
    }
    return { label: 'neutral', score: 0 };
  }

  /**
   * 일일 멘션 조회
   */
  async getDailyMentions(): Promise<{
    mentions: SocialMention[];
    trendAnalysis?: TrendAnalysis;
  }> {
    const db = this.getDatabase('social_mentions');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 최근 24시간 멘션 조회
    const { data: mentions } = await db.findAll<SocialMention>({});

    const recentMentions = (mentions || []).filter(
      m => new Date(m.collectedAt) >= oneDayAgo
    );

    // 간단한 트렌드 분석
    const trendAnalysis = this.generateQuickTrendAnalysis(recentMentions);

    return { mentions: recentMentions, trendAnalysis };
  }

  /**
   * 빠른 트렌드 분석 생성
   */
  private generateQuickTrendAnalysis(mentions: SocialMention[]): TrendAnalysis {
    const now = new Date();
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const keywordCounts: Record<string, number> = {};

    for (const mention of mentions) {
      sentimentCounts[mention.sentiment]++;
      for (const keyword of mention.keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }

    const total = mentions.length || 1;

    return {
      period: {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: now,
      },
      keywordTrends: Object.entries(keywordCounts)
        .map(([keyword, count]) => ({
          keyword,
          count,
          trend: 'stable' as const,
          changePercent: 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      sentimentDistribution: {
        positive: sentimentCounts.positive / total,
        neutral: sentimentCounts.neutral / total,
        negative: sentimentCounts.negative / total,
      },
      topTopics: [],
      insights: this.generateInsights(sentimentCounts, keywordCounts),
    };
  }

  /**
   * 인사이트 생성
   */
  private generateInsights(
    sentiments: Record<string, number>,
    keywords: Record<string, number>
  ): string[] {
    const insights: string[] = [];

    // 감성 인사이트
    const total = sentiments.positive + sentiments.neutral + sentiments.negative;
    if (total > 0) {
      const positiveRatio = sentiments.positive / total;
      if (positiveRatio > 0.7) {
        insights.push('고객 반응이 매우 긍정적입니다. 현재 마케팅 전략을 유지하세요.');
      } else if (positiveRatio < 0.3) {
        insights.push('부정적 반응이 증가하고 있습니다. 원인 분석이 필요합니다.');
      }
    }

    // 키워드 인사이트
    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (topKeywords.length > 0) {
      insights.push(`가장 많이 언급된 키워드: ${topKeywords.map(k => k[0]).join(', ')}`);
    }

    return insights;
  }

  /**
   * 트렌드 분석
   */
  async analyzeTrends(data?: Record<string, unknown>): Promise<TrendAnalysis> {
    const keywords = data?.keywords as string[] || this.monitoringKeywords;
    const includeBrandMentions = data?.includeBrandMentions !== false;
    const days = data?.days as number || 7;

    this.logger.info('Analyzing trends...', { keywords, days });

    const db = this.getDatabase('social_mentions');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 기간 내 멘션 조회
    const { data: allMentions } = await db.findAll<SocialMention>({});
    const mentions = (allMentions || []).filter(
      m => new Date(m.collectedAt) >= startDate
    );

    // 키워드 트렌드 계산
    const keywordTrends = await this.calculateKeywordTrends(mentions, keywords, days);

    // 감성 분포 계산
    const sentimentDistribution = this.calculateSentimentDistribution(mentions);

    // 토픽 추출
    const topTopics = await this.extractTopTopics(mentions);

    // 경쟁사 분석 (옵션)
    const competitorMentions = includeBrandMentions
      ? await this.analyzeCompetitorMentions(mentions)
      : undefined;

    return {
      period: { start: startDate, end: new Date() },
      keywordTrends,
      sentimentDistribution,
      topTopics,
      competitorMentions,
      insights: this.generateComprehensiveInsights(
        keywordTrends,
        sentimentDistribution,
        topTopics
      ),
    };
  }

  /**
   * 키워드 트렌드 계산
   */
  private async calculateKeywordTrends(
    mentions: SocialMention[],
    keywords: string[],
    days: number
  ): Promise<TrendAnalysis['keywordTrends']> {
    const trends: TrendAnalysis['keywordTrends'] = [];

    const halfPoint = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000);

    for (const keyword of keywords) {
      const matchingMentions = mentions.filter(
        m => m.content.toLowerCase().includes(keyword.toLowerCase())
      );

      const recentCount = matchingMentions.filter(
        m => new Date(m.collectedAt) >= halfPoint
      ).length;
      const olderCount = matchingMentions.filter(
        m => new Date(m.collectedAt) < halfPoint
      ).length;

      const changePercent = olderCount > 0
        ? ((recentCount - olderCount) / olderCount) * 100
        : recentCount > 0 ? 100 : 0;

      trends.push({
        keyword,
        count: matchingMentions.length,
        trend: changePercent > 10 ? 'rising' : changePercent < -10 ? 'falling' : 'stable',
        changePercent: Math.round(changePercent),
      });
    }

    return trends.sort((a, b) => b.count - a.count);
  }

  /**
   * 감성 분포 계산
   */
  private calculateSentimentDistribution(mentions: SocialMention[]): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const mention of mentions) {
      counts[mention.sentiment]++;
    }

    const total = mentions.length || 1;
    return {
      positive: counts.positive / total,
      neutral: counts.neutral / total,
      negative: counts.negative / total,
    };
  }

  /**
   * 주요 토픽 추출
   */
  private async extractTopTopics(mentions: SocialMention[]): Promise<TrendAnalysis['topTopics']> {
    const topicCounts: Record<string, { count: number; sentimentSum: number }> = {};

    for (const mention of mentions) {
      for (const keyword of mention.keywords) {
        if (!topicCounts[keyword]) {
          topicCounts[keyword] = { count: 0, sentimentSum: 0 };
        }
        topicCounts[keyword].count++;
        topicCounts[keyword].sentimentSum += mention.sentimentScore;
      }
    }

    return Object.entries(topicCounts)
      .map(([topic, data]) => ({
        topic,
        mentions: data.count,
        sentiment: data.sentimentSum / data.count,
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  }

  /**
   * 경쟁사 멘션 분석
   */
  private async analyzeCompetitorMentions(
    mentions: SocialMention[]
  ): Promise<TrendAnalysis['competitorMentions']> {
    const competitorData: Record<string, { count: number; sentimentSum: number }> = {};

    for (const keyword of this.competitorKeywords) {
      const matchingMentions = mentions.filter(
        m => m.content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchingMentions.length > 0) {
        competitorData[keyword] = {
          count: matchingMentions.length,
          sentimentSum: matchingMentions.reduce((sum, m) => sum + m.sentimentScore, 0),
        };
      }
    }

    return Object.entries(competitorData).map(([competitor, data]) => ({
      competitor,
      count: data.count,
      sentiment: data.sentimentSum / data.count,
    }));
  }

  /**
   * 종합 인사이트 생성
   */
  private generateComprehensiveInsights(
    keywordTrends: TrendAnalysis['keywordTrends'],
    sentimentDistribution: TrendAnalysis['sentimentDistribution'],
    topTopics: TrendAnalysis['topTopics']
  ): string[] {
    const insights: string[] = [];

    // 상승 트렌드 인사이트
    const risingTrends = keywordTrends.filter(k => k.trend === 'rising');
    if (risingTrends.length > 0) {
      insights.push(
        `급상승 키워드: ${risingTrends.map(k => `${k.keyword}(+${k.changePercent}%)`).join(', ')}`
      );
    }

    // 감성 인사이트
    if (sentimentDistribution.positive > 0.6) {
      insights.push('전반적으로 긍정적인 브랜드 이미지가 형성되어 있습니다.');
    } else if (sentimentDistribution.negative > 0.3) {
      insights.push('부정적 반응 비율이 높습니다. 고객 불만 요인을 점검하세요.');
    }

    // 토픽 인사이트
    const hotTopics = topTopics.filter(t => t.mentions > 5);
    if (hotTopics.length > 0) {
      insights.push(`주요 관심 토픽: ${hotTopics.map(t => t.topic).join(', ')}`);
    }

    return insights;
  }

  /**
   * 감성 분석 (개별 멘션)
   */
  async analyzeSentiment(data?: Record<string, unknown>): Promise<{
    mentionId: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    keywords: string[];
  }> {
    const mentionId = data?.mentionId as string;
    const content = data?.content as string;

    const sentiment = await this.analyzeMentionSentiment(content);
    const keywords = this.extractKeywords(content);

    // 멘션 업데이트
    if (mentionId) {
      const db = this.getDatabase('social_mentions');
      await db.update(mentionId, {
        sentiment: sentiment.label,
        sentimentScore: sentiment.score,
        keywords,
        processed: true,
      });
    }

    return {
      mentionId: mentionId || '',
      ...sentiment,
      keywords,
    };
  }

  /**
   * 키워드 추출
   */
  private extractKeywords(content: string): string[] {
    // 실제 구현 시 NLP 사용
    const words = content.split(/\s+/).filter(w => w.length > 2);
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * 모니터링 키워드 설정
   */
  setMonitoringKeywords(keywords: string[]): void {
    this.monitoringKeywords = keywords;
    this.logger.info('Monitoring keywords updated', { keywords });
  }

  /**
   * 경쟁사 키워드 설정
   */
  setCompetitorKeywords(keywords: string[]): void {
    this.competitorKeywords = keywords;
    this.logger.info('Competitor keywords updated', { keywords });
  }
}

export default SocialListeningSubAgent;
