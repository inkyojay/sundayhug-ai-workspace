/**
 * 썬데이허그 AI 에이전트 시스템 - Router 서브 에이전트
 *
 * LANE 5: Integration & Orchestration
 * 요청 분류 및 적절한 에이전트로 라우팅을 담당하는 서브 에이전트
 */

import { SubAgent, SubAgentConfig, ParentAgentRef } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  ApprovalLevel,
  TaskPayload,
} from '../../types';
import {
  RoutingDecision,
  RoutingReason,
  RoutingRules,
  KeywordRoutingRule,
  EntityRoutingRule,
} from './types';
import { metricsCollector } from '../../monitoring';
import { systemLogger } from '../../utils/logger';

/**
 * Router 설정
 */
interface RouterConfig {
  /** 라우팅 규칙 */
  routingRules: RoutingRules;
  /** 최소 신뢰도 임계값 */
  minConfidenceThreshold: number;
  /** 캐시 TTL (밀리초) */
  cacheTTL: number;
}

/**
 * 기본 Router 설정
 */
const defaultRouterConfig: RouterConfig = {
  routingRules: {
    keywordRouting: [],
    entityRouting: [],
    sourceRouting: [],
    defaultAgent: '02-cs',
    safetyKeywords: ['위험', '사고', '안전', '긴급'],
    safetyAgent: '12-crisis',
  },
  minConfidenceThreshold: 0.6,
  cacheTTL: 60000,
};

/**
 * 라우팅 캐시 엔트리
 */
interface RoutingCacheEntry {
  decision: RoutingDecision;
  timestamp: number;
}

/**
 * Router 서브 에이전트 클래스
 */
export class RouterSubAgent extends SubAgent {
  private routerConfig: RouterConfig;
  private routingCache: Map<string, RoutingCacheEntry> = new Map();
  private routingHistory: Array<{
    timestamp: Date;
    content: string;
    decision: RoutingDecision;
  }> = [];

  /**
   * RouterSubAgent 생성자
   */
  constructor(parentRef: ParentAgentRef, config?: Partial<RouterConfig>) {
    const subAgentConfig: SubAgentConfig = {
      id: '00-01-router',
      name: 'Router',
      description: '요청 분류 및 라우팅 결정',
      approvalLevel: ApprovalLevel.NONE,
      enabled: true,
      timeout: 30000,
      maxRetries: 2,
      retryDelay: 500,
      parentRef,
      autoReportResults: true,
    };

    super(subAgentConfig);
    this.routerConfig = { ...defaultRouterConfig, ...config };

    systemLogger.info('RouterSubAgent initialized');
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing RouterSubAgent...');
    // 캐시 정리 스케줄러
    setInterval(() => this.cleanCache(), this.routerConfig.cacheTTL);
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('Cleaning up RouterSubAgent...');
    this.routingCache.clear();
    await this.cleanupSubAgent();
  }

  /**
   * 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const data = context.data || {};
      const request = data.request as TaskPayload;

      if (!request) {
        return this.createErrorResult('NO_REQUEST', 'No request to route', startTime, false);
      }

      // 라우팅 결정
      const decision = await this.route(request);

      // 메트릭 기록
      metricsCollector.incCounter('router_decisions', 1, {
        targetAgent: decision.targetAgent,
        reason: decision.reason,
      });

      // 이력 기록
      this.recordHistory(this.extractContent(request), decision);

      return this.createSuccessResult(
        {
          decision,
          cached: false,
        },
        startTime
      );
    } catch (error) {
      return this.createErrorResult(
        'ROUTING_ERROR',
        (error as Error).message,
        startTime,
        true
      );
    }
  }

  // ===========================================================================
  // 라우팅 메서드
  // ===========================================================================

  /**
   * 라우팅 결정
   */
  async route(request: TaskPayload): Promise<RoutingDecision> {
    const content = this.extractContent(request);
    const cacheKey = this.generateCacheKey(content);

    // 캐시 확인
    const cached = this.routingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.routerConfig.cacheTTL) {
      this.logger.debug('Routing cache hit', { cacheKey });
      return cached.decision;
    }

    // 새로운 라우팅 결정
    const decision = this.analyzeAndRoute(request, content);

    // 캐시 저장
    this.routingCache.set(cacheKey, {
      decision,
      timestamp: Date.now(),
    });

    return decision;
  }

  /**
   * 분석 및 라우팅
   */
  private analyzeAndRoute(request: TaskPayload, content: string): RoutingDecision {
    // 1. 안전 이슈 최우선 체크
    if (this.checkSafetyIssue(content)) {
      return this.createSafetyDecision();
    }

    // 2. 엔티티 기반 라우팅
    const entityDecision = this.routeByEntity(content);
    if (entityDecision) {
      return entityDecision;
    }

    // 3. 키워드 기반 라우팅
    const keywordDecision = this.routeByKeyword(content);
    if (keywordDecision) {
      return keywordDecision;
    }

    // 4. 소스 기반 라우팅
    const source = (request.data as Record<string, unknown>)?.source as string | undefined;
    if (source) {
      const sourceDecision = this.routeBySource(source);
      if (sourceDecision) {
        return sourceDecision;
      }
    }

    // 5. 의도 분석 기반 라우팅
    const intentDecision = this.routeByIntent(content);
    if (intentDecision) {
      return intentDecision;
    }

    // 6. 기본 라우팅
    return this.createDefaultDecision();
  }

  /**
   * 안전 이슈 체크
   */
  private checkSafetyIssue(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.routerConfig.routingRules.safetyKeywords.some((keyword) =>
      lowerContent.includes(keyword.toLowerCase())
    );
  }

  /**
   * 안전 결정 생성
   */
  private createSafetyDecision(): RoutingDecision {
    return {
      targetAgent: this.routerConfig.routingRules.safetyAgent,
      confidence: 1.0,
      alternativeAgents: [],
      requiresMultiAgent: false,
      reason: RoutingReason.SAFETY_ISSUE,
    };
  }

  /**
   * 엔티티 기반 라우팅
   */
  private routeByEntity(content: string): RoutingDecision | null {
    for (const rule of this.routerConfig.routingRules.entityRouting) {
      const regex = new RegExp(rule.pattern, 'i');
      const match = content.match(regex);

      if (match) {
        return {
          targetAgent: rule.targetAgent,
          confidence: 0.95,
          alternativeAgents: [],
          requiresMultiAgent: false,
          reason: RoutingReason.ENTITY_BASED,
          metadata: {
            entityType: rule.entityType,
            entityValue: match[0],
          },
        };
      }
    }
    return null;
  }

  /**
   * 키워드 기반 라우팅
   */
  private routeByKeyword(content: string): RoutingDecision | null {
    const lowerContent = content.toLowerCase();
    const matches: KeywordRoutingRule[] = [];

    for (const rule of this.routerConfig.routingRules.keywordRouting) {
      const matchedKeywords = rule.keywords.filter((keyword) =>
        lowerContent.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          ...rule,
          keywords: matchedKeywords,
        });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // 우선순위 정렬 (낮은 값이 높은 우선순위)
    matches.sort((a, b) => a.priority - b.priority);

    const primaryMatch = matches[0];
    const alternativeAgents = matches.slice(1).map((m) => m.agentId);

    // 여러 키워드 매치 시 멀티 에이전트 고려
    const requiresMultiAgent = matches.length > 1 && this.isComplexContent(content);

    return {
      targetAgent: primaryMatch.agentId,
      confidence: this.calculateKeywordConfidence(primaryMatch, content),
      alternativeAgents,
      requiresMultiAgent,
      involvedAgents: requiresMultiAgent ? matches.map((m) => m.agentId) : undefined,
      reason: RoutingReason.KEYWORD_MATCH,
      metadata: {
        matchedKeywords: primaryMatch.keywords,
      },
    };
  }

  /**
   * 소스 기반 라우팅
   */
  private routeBySource(source: string): RoutingDecision | null {
    const rule = this.routerConfig.routingRules.sourceRouting.find(
      (r) => r.source.toLowerCase() === source.toLowerCase()
    );

    if (!rule) {
      return null;
    }

    return {
      targetAgent: rule.primary,
      confidence: 0.7,
      alternativeAgents: [rule.fallback],
      requiresMultiAgent: false,
      reason: RoutingReason.SOURCE_BASED,
      metadata: { source },
    };
  }

  /**
   * 의도 분석 기반 라우팅
   */
  private routeByIntent(content: string): RoutingDecision | null {
    // 간단한 의도 패턴 매칭
    const intentPatterns: Array<{ pattern: RegExp; agent: string; confidence: number }> = [
      { pattern: /환불|취소|반품/i, agent: '02-cs', confidence: 0.8 },
      { pattern: /주문\s*(하고|할게|합니다)/i, agent: '01-order', confidence: 0.85 },
      { pattern: /언제\s*도착|배송\s*현황/i, agent: '13-logistics', confidence: 0.8 },
      { pattern: /재고\s*있/i, agent: '05-inventory', confidence: 0.75 },
      { pattern: /할인|쿠폰|프로모션/i, agent: '03-marketing', confidence: 0.7 },
    ];

    for (const { pattern, agent, confidence } of intentPatterns) {
      if (pattern.test(content)) {
        return {
          targetAgent: agent,
          confidence,
          alternativeAgents: [],
          requiresMultiAgent: false,
          reason: RoutingReason.KEYWORD_MATCH, // 의도도 키워드 기반으로 분류
        };
      }
    }

    return null;
  }

  /**
   * 기본 결정 생성
   */
  private createDefaultDecision(): RoutingDecision {
    return {
      targetAgent: this.routerConfig.routingRules.defaultAgent,
      confidence: 0.5,
      alternativeAgents: ['00-supervisor'],
      requiresMultiAgent: false,
      reason: RoutingReason.DEFAULT,
    };
  }

  // ===========================================================================
  // 유틸리티 메서드
  // ===========================================================================

  /**
   * 콘텐츠 추출
   */
  private extractContent(request: TaskPayload): string {
    const data = request.data as Record<string, unknown> | undefined;
    if (!data) return '';

    const parts: string[] = [];
    if (typeof data.content === 'string') parts.push(data.content);
    if (typeof data.message === 'string') parts.push(data.message);
    if (typeof data.text === 'string') parts.push(data.text);
    if (typeof data.query === 'string') parts.push(data.query);
    if (typeof data.title === 'string') parts.push(data.title);

    return parts.join(' ');
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(content: string): string {
    // 간단한 해시 생성 (실제로는 더 나은 해시 알고리즘 사용 권장)
    const normalized = content.toLowerCase().trim().slice(0, 200);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `route_${hash}`;
  }

  /**
   * 복잡한 콘텐츠인지 판단
   */
  private isComplexContent(content: string): boolean {
    const wordCount = content.split(/\s+/).length;
    const questionCount = (content.match(/\?/g) || []).length;
    return wordCount > 30 || questionCount > 1;
  }

  /**
   * 키워드 신뢰도 계산
   */
  private calculateKeywordConfidence(rule: KeywordRoutingRule, content: string): number {
    const lowerContent = content.toLowerCase();
    const matchCount = rule.keywords.filter((k) =>
      lowerContent.includes(k.toLowerCase())
    ).length;

    // 매치된 키워드 비율과 우선순위 기반 신뢰도
    const matchRatio = matchCount / rule.keywords.length;
    const priorityBonus = Math.max(0, (5 - rule.priority) * 0.05);

    return Math.min(0.95, 0.7 + matchRatio * 0.2 + priorityBonus);
  }

  /**
   * 캐시 정리
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.routingCache.entries()) {
      if (now - entry.timestamp > this.routerConfig.cacheTTL) {
        this.routingCache.delete(key);
      }
    }
  }

  /**
   * 이력 기록
   */
  private recordHistory(content: string, decision: RoutingDecision): void {
    this.routingHistory.push({
      timestamp: new Date(),
      content: content.slice(0, 100),
      decision,
    });

    // 최대 1000개 유지
    if (this.routingHistory.length > 1000) {
      this.routingHistory.shift();
    }
  }

  // ===========================================================================
  // 공개 API
  // ===========================================================================

  /**
   * 라우팅 규칙 설정
   */
  setRoutingRules(rules: Partial<RoutingRules>): void {
    this.routerConfig.routingRules = {
      ...this.routerConfig.routingRules,
      ...rules,
    };
    this.routingCache.clear();
    this.logger.info('Routing rules updated');
  }

  /**
   * 키워드 규칙 추가
   */
  addKeywordRule(rule: KeywordRoutingRule): void {
    this.routerConfig.routingRules.keywordRouting.push(rule);
    this.logger.info('Keyword rule added', { agentId: rule.agentId });
  }

  /**
   * 엔티티 규칙 추가
   */
  addEntityRule(rule: EntityRoutingRule): void {
    this.routerConfig.routingRules.entityRouting.push(rule);
    this.logger.info('Entity rule added', { entityType: rule.entityType });
  }

  /**
   * 라우팅 이력 조회
   */
  getRoutingHistory(limit: number = 100): typeof this.routingHistory {
    return this.routingHistory.slice(-limit);
  }

  /**
   * 라우팅 통계
   */
  getRoutingStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const entry of this.routingHistory) {
      const agent = entry.decision.targetAgent;
      stats[agent] = (stats[agent] || 0) + 1;
    }

    return stats;
  }
}

export default RouterSubAgent;
