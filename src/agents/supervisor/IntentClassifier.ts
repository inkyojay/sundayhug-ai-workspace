/**
 * 썬데이허그 AI 에이전트 시스템 - 의도 분류기
 *
 * 사용자 입력을 분석하여 의도를 분류하고 적절한 에이전트를 결정합니다.
 * 키워드 매칭 + 엔티티 추출 + 컨텍스트 분석을 통해 정확한 라우팅을 수행합니다.
 */

import {
  IntentCategory,
  IntentResult,
  ExtractedEntity,
  EntityType,
  ConversationContext,
  PriorityLevel,
} from './types';
import {
  AGENT_REGISTRY,
  KEYWORD_AGENT_MAP,
  AMBIGUOUS_KEYWORD_RULES,
  getAgentsByKeyword,
  getAmbiguousRule,
  getWorkflowByTrigger,
  getPriorityBoost,
} from './KeywordMapping';
import { systemLogger } from '../../utils/logger';

// =============================================================================
// 엔티티 추출 패턴
// =============================================================================

/**
 * 엔티티 추출을 위한 정규식 패턴
 */
const ENTITY_PATTERNS: Map<EntityType, RegExp[]> = new Map([
  // 주문번호 패턴
  [EntityType.ORDER_ID, [
    /ORD-\d{4}-\d{6}/gi,                    // ORD-2024-123456
    /주문번호\s*[:\s]?\s*(\d{10,})/gi,        // 주문번호: 1234567890
    /주문\s*#?\s*(\d{8,})/gi,                // 주문 #12345678
    /[A-Z]{2,3}-\d{8,}/gi,                  // CP-12345678 (쿠팡)
  ]],

  // 고객 ID 패턴
  [EntityType.CUSTOMER_ID, [
    /고객번호\s*[:\s]?\s*(\d+)/gi,
    /회원번호\s*[:\s]?\s*(\d+)/gi,
    /CUS-\d{6,}/gi,
  ]],

  // 상품 ID 패턴
  [EntityType.PRODUCT_ID, [
    /SKU-\d{4,}/gi,
    /상품번호\s*[:\s]?\s*(\d+)/gi,
    /상품코드\s*[:\s]?\s*([A-Z0-9-]+)/gi,
    /PRD-\d{4,}/gi,
  ]],

  // 전화번호 패턴
  [EntityType.PHONE_NUMBER, [
    /01[0-9]-?\d{3,4}-?\d{4}/g,            // 010-1234-5678
    /\d{2,3}-\d{3,4}-\d{4}/g,              // 02-123-4567
  ]],

  // 날짜 패턴
  [EntityType.DATE, [
    /\d{4}[-./]\d{1,2}[-./]\d{1,2}/g,      // 2024-01-15
    /\d{1,2}월\s*\d{1,2}일/g,               // 1월 15일
    /오늘|어제|내일|모레|그제/g,
    /이번\s*주|지난\s*주|다음\s*주/g,
    /이번\s*달|지난\s*달|다음\s*달/g,
  ]],

  // 금액 패턴
  [EntityType.AMOUNT, [
    /\d{1,3}(,\d{3})*원/g,                 // 10,000원
    /\d+원/g,                              // 10000원
    /₩\s*\d{1,3}(,\d{3})*/g,              // ₩10,000
  ]],

  // 수량 패턴
  [EntityType.QUANTITY, [
    /\d+\s*(개|EA|ea|박스|세트|묶음)/g,
    /수량\s*[:\s]?\s*\d+/gi,
  ]],

  // 채널 패턴
  [EntityType.CHANNEL, [
    /쿠팡|coupang/gi,
    /네이버|naver|스마트스토어/gi,
    /카페24|cafe24/gi,
    /지마켓|gmarket/gi,
    /11번가|11st/gi,
    /옥션|auction/gi,
  ]],

  // 운송장 번호 패턴
  [EntityType.TRACKING_NUMBER, [
    /운송장\s*[:\s]?\s*(\d{10,14})/gi,
    /송장번호\s*[:\s]?\s*(\d{10,14})/gi,
    /\d{12,14}/g,                          // 12-14자리 숫자
  ]],
]);

// =============================================================================
// 의도 카테고리별 키워드
// =============================================================================

const INTENT_KEYWORDS: Map<IntentCategory, string[]> = new Map([
  [IntentCategory.ORDER_CREATE, ['새 주문', '신규 주문', '주문 생성', '주문 들어옴']],
  [IntentCategory.ORDER_CANCEL, ['주문 취소', '취소해줘', '취소 요청', '주문취소']],
  [IntentCategory.ORDER_MODIFY, ['배송지 변경', '배송지 수정', '주소 변경', '수정해줘']],
  [IntentCategory.ORDER_REFUND, ['환불', '환불해줘', '환불 처리', '환불 요청']],
  [IntentCategory.ORDER_TRACKING, ['배송 조회', '배송 추적', '어디까지', '언제 오나']],

  [IntentCategory.CS_INQUIRY, ['문의', '질문', '궁금', '알려줘', '어떻게']],
  [IntentCategory.CS_COMPLAINT, ['불만', '화나', '짜증', '클레임', '컴플레인', '항의']],
  [IntentCategory.CS_EXCHANGE, ['교환', '교환해줘', '바꿔줘', '교환 요청']],
  [IntentCategory.CS_RETURN, ['반품', '반품해줘', '돌려보내', '반송']],

  [IntentCategory.INVENTORY_CHECK, ['재고 확인', '재고 조회', '몇 개 남았', '재고 있']],
  [IntentCategory.INVENTORY_UPDATE, ['재고 수정', '재고 조정', '입고', '출고']],
  [IntentCategory.INVENTORY_ALERT, ['품절', '재고 부족', '안전재고', '재고 알림']],

  [IntentCategory.ACCOUNTING_SETTLEMENT, ['정산', '정산금', '수수료', '입금']],
  [IntentCategory.ACCOUNTING_REPORT, ['매출', '수익', '손익', '재무']],
  [IntentCategory.ACCOUNTING_TAX, ['세금', '부가세', '세금계산서', '현금영수증']],

  [IntentCategory.MARKETING_CAMPAIGN, ['캠페인', '프로모션', '이벤트', '광고']],
  [IntentCategory.MARKETING_ANALYSIS, ['마케팅 분석', 'ROAS', 'CTR', '광고 성과']],
  [IntentCategory.MARKETING_CONTENT, ['콘텐츠', '상세페이지', 'SNS', '포스팅']],

  [IntentCategory.LOGISTICS_SHIPPING, ['배송', '출고', '발송', '택배']],
  [IntentCategory.LOGISTICS_WAREHOUSE, ['창고', '출고지', '재고 위치']],

  [IntentCategory.ANALYTICS_SALES, ['매출 분석', '판매 분석', '실적', '성과']],
  [IntentCategory.ANALYTICS_CUSTOMER, ['고객 분석', '구매 패턴', '고객 세그먼트']],
  [IntentCategory.ANALYTICS_PRODUCT, ['상품 분석', '베스트셀러', '상품 성과']],

  [IntentCategory.SYSTEM_STATUS, ['시스템 상태', '헬스 체크', '서버 상태']],
  [IntentCategory.SYSTEM_CONFIG, ['설정', '환경설정', '옵션']],
]);

// =============================================================================
// IntentClassifier 클래스
// =============================================================================

/**
 * 의도 분류기
 * 사용자 입력을 분석하여 의도를 분류하고 적절한 에이전트를 결정합니다.
 */
export class IntentClassifier {
  /** 최소 신뢰도 임계값 */
  private readonly MIN_CONFIDENCE = 0.3;

  /** 애매함 판단 임계값 */
  private readonly AMBIGUITY_THRESHOLD = 0.7;

  /** 대화 컨텍스트 */
  private context?: ConversationContext;

  constructor() {
    systemLogger.info('IntentClassifier initialized');
  }

  // ===========================================================================
  // 메인 분류 메서드
  // ===========================================================================

  /**
   * 사용자 입력 분류
   * @param input - 사용자 입력 텍스트
   * @param context - 대화 컨텍스트 (선택)
   * @returns 의도 분류 결과
   */
  async classify(input: string, context?: ConversationContext): Promise<IntentResult> {
    this.context = context;
    const normalizedInput = this.normalizeInput(input);

    systemLogger.debug('Classifying input', { input: normalizedInput });

    // 1. 엔티티 추출
    const entities = this.extractEntities(normalizedInput);

    // 2. 키워드 기반 에이전트 매칭
    const keywordMatches = this.matchKeywords(normalizedInput);

    // 3. 의도 카테고리 분류
    const intentCategory = this.classifyIntent(normalizedInput);

    // 4. 워크플로우 매칭
    const workflow = getWorkflowByTrigger(normalizedInput);

    // 5. 애매한 키워드 처리
    const ambiguousResolution = this.resolveAmbiguousKeywords(
      normalizedInput,
      entities,
      keywordMatches
    );

    // 6. 최종 에이전트 결정
    const primaryAgent = this.determinePrimaryAgent(
      keywordMatches,
      intentCategory,
      ambiguousResolution,
      entities
    );

    // 7. 신뢰도 계산
    const confidence = this.calculateConfidence(
      keywordMatches,
      entities,
      intentCategory,
      primaryAgent
    );

    // 8. 대안 에이전트 목록 생성
    const alternatives = this.getAlternativeAgents(
      keywordMatches,
      primaryAgent.agentId,
      intentCategory
    );

    // 9. 애매함 여부 및 명확화 질문 결정
    const isAmbiguous = confidence < this.AMBIGUITY_THRESHOLD || alternatives.length > 2;
    const clarificationQuestion = isAmbiguous
      ? this.generateClarificationQuestion(normalizedInput, alternatives)
      : undefined;

    // 10. 필요한 추가 컨텍스트 결정
    const requiredContext = this.determineRequiredContext(
      intentCategory,
      entities
    );

    const result: IntentResult = {
      primaryIntent: intentCategory,
      primaryAgentId: primaryAgent.agentId,
      confidence,
      alternativeAgents: alternatives,
      entities,
      requiredContext,
      isAmbiguous,
      clarificationQuestion,
      suggestedWorkflowId: workflow?.id,
    };

    systemLogger.info('Classification completed', {
      intent: intentCategory,
      agent: primaryAgent.agentId,
      confidence,
      isAmbiguous,
    });

    return result;
  }

  // ===========================================================================
  // 입력 정규화
  // ===========================================================================

  /**
   * 입력 텍스트 정규화
   */
  private normalizeInput(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')       // 연속 공백 제거
      .replace(/[~!@#$%^&*()]+/g, ' '); // 특수문자 제거 (하이픈 제외)
  }

  // ===========================================================================
  // 엔티티 추출
  // ===========================================================================

  /**
   * 텍스트에서 엔티티 추출
   */
  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [entityType, patterns] of ENTITY_PATTERNS) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(text)) !== null) {
          const value = match[1] || match[0];

          // 중복 체크
          const isDuplicate = entities.some(
            (e) => e.type === entityType && e.value === value
          );

          if (!isDuplicate) {
            entities.push({
              type: entityType,
              value: value.replace(/[-\s]/g, ''),
              originalText: match[0],
              confidence: this.calculateEntityConfidence(entityType, value),
              startIndex: match.index,
              endIndex: match.index + match[0].length,
            });
          }
        }
      }
    }

    return entities;
  }

  /**
   * 엔티티 신뢰도 계산
   */
  private calculateEntityConfidence(type: EntityType, value: string): number {
    switch (type) {
      case EntityType.ORDER_ID:
        return value.startsWith('ORD-') ? 0.95 : 0.7;
      case EntityType.PHONE_NUMBER:
        return value.length >= 10 ? 0.9 : 0.6;
      case EntityType.TRACKING_NUMBER:
        return value.length >= 12 ? 0.85 : 0.5;
      default:
        return 0.7;
    }
  }

  // ===========================================================================
  // 키워드 매칭
  // ===========================================================================

  /**
   * 키워드 기반 에이전트 매칭
   */
  private matchKeywords(text: string): Map<string, { score: number; keywords: string[] }> {
    const matches = new Map<string, { score: number; keywords: string[] }>();
    const words = text.split(/\s+/);

    // 단일 단어 매칭
    for (const word of words) {
      const mappings = getAgentsByKeyword(word);
      for (const mapping of mappings) {
        const existing = matches.get(mapping.agentId) || { score: 0, keywords: [] };
        existing.score += mapping.priority * 0.1;
        existing.keywords.push(word);
        matches.set(mapping.agentId, existing);
      }
    }

    // 복합 키워드 매칭 (2-gram)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const mappings = getAgentsByKeyword(bigram);
      for (const mapping of mappings) {
        const existing = matches.get(mapping.agentId) || { score: 0, keywords: [] };
        existing.score += mapping.priority * 0.15; // 복합 키워드 가중치
        existing.keywords.push(bigram);
        matches.set(mapping.agentId, existing);
      }
    }

    // 에이전트 정보의 키워드와 직접 매칭
    for (const agent of AGENT_REGISTRY) {
      for (const keyword of agent.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          const existing = matches.get(agent.id) || { score: 0, keywords: [] };
          existing.score += agent.priority * 0.12;
          if (!existing.keywords.includes(keyword)) {
            existing.keywords.push(keyword);
          }
          matches.set(agent.id, existing);
        }
      }
    }

    return matches;
  }

  // ===========================================================================
  // 의도 카테고리 분류
  // ===========================================================================

  /**
   * 의도 카테고리 분류
   */
  private classifyIntent(text: string): IntentCategory {
    const scores = new Map<IntentCategory, number>();

    for (const [category, keywords] of INTENT_KEYWORDS) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      if (score > 0) {
        scores.set(category, score);
      }
    }

    // 가장 높은 점수의 카테고리 반환
    let maxCategory = IntentCategory.UNKNOWN;
    let maxScore = 0;

    for (const [category, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        maxCategory = category;
      }
    }

    // 점수가 낮으면 UNKNOWN 반환
    if (maxScore < 1) {
      return IntentCategory.UNKNOWN;
    }

    return maxCategory;
  }

  // ===========================================================================
  // 애매한 키워드 해결
  // ===========================================================================

  /**
   * 애매한 키워드 해결
   */
  private resolveAmbiguousKeywords(
    text: string,
    entities: ExtractedEntity[],
    keywordMatches: Map<string, { score: number; keywords: string[] }>
  ): { agentId: string; reason: string } | null {
    // 애매한 키워드 찾기
    const words = text.split(/\s+/);
    for (const word of words) {
      const rule = getAmbiguousRule(word);
      if (!rule) continue;

      // 컨텍스트 규칙 평가
      for (const contextRule of rule.contextRules) {
        if (this.evaluateContextCondition(contextRule.condition, text, entities)) {
          return {
            agentId: contextRule.agentId,
            reason: `컨텍스트 규칙 일치: ${word} + ${JSON.stringify(contextRule.condition)}`,
          };
        }
      }

      // 기본 에이전트 반환
      return {
        agentId: rule.defaultAgentId,
        reason: `기본 라우팅: ${word}`,
      };
    }

    return null;
  }

  /**
   * 컨텍스트 조건 평가
   */
  private evaluateContextCondition(
    condition: { type: string; entityType?: EntityType; keyword?: string },
    text: string,
    entities: ExtractedEntity[]
  ): boolean {
    switch (condition.type) {
      case 'entity_exists':
        return entities.some((e) => e.type === condition.entityType);

      case 'keyword_present':
        return condition.keyword
          ? text.toLowerCase().includes(condition.keyword.toLowerCase())
          : false;

      case 'previous_intent':
        // 이전 의도 확인 (컨텍스트 필요)
        return this.context?.recentIntents.includes(condition.entityType as unknown as IntentCategory) || false;

      default:
        return false;
    }
  }

  // ===========================================================================
  // 주요 에이전트 결정
  // ===========================================================================

  /**
   * 주요 에이전트 결정
   */
  private determinePrimaryAgent(
    keywordMatches: Map<string, { score: number; keywords: string[] }>,
    intentCategory: IntentCategory,
    ambiguousResolution: { agentId: string; reason: string } | null,
    entities: ExtractedEntity[]
  ): { agentId: string; reason: string } {
    // 1. 애매한 키워드 해결 결과 우선
    if (ambiguousResolution) {
      return ambiguousResolution;
    }

    // 2. 의도 카테고리 기반 에이전트 찾기
    const categoryAgents = AGENT_REGISTRY.filter((a) =>
      a.categories.includes(intentCategory)
    );

    if (categoryAgents.length === 1) {
      return {
        agentId: categoryAgents[0].id,
        reason: `의도 카테고리 일치: ${intentCategory}`,
      };
    }

    // 3. 키워드 매칭 점수 기반
    let bestAgent = '';
    let bestScore = 0;

    for (const [agentId, match] of keywordMatches) {
      if (match.score > bestScore) {
        bestScore = match.score;
        bestAgent = agentId;
      }
    }

    if (bestAgent && bestScore >= this.MIN_CONFIDENCE) {
      return {
        agentId: bestAgent,
        reason: `키워드 점수: ${bestScore.toFixed(2)}`,
      };
    }

    // 4. 엔티티 기반 추론
    if (entities.some((e) => e.type === EntityType.ORDER_ID)) {
      return { agentId: 'order-agent', reason: '주문번호 엔티티 감지' };
    }

    if (entities.some((e) => e.type === EntityType.TRACKING_NUMBER)) {
      return { agentId: 'logistics-agent', reason: '운송장번호 엔티티 감지' };
    }

    if (entities.some((e) => e.type === EntityType.PRODUCT_ID)) {
      return { agentId: 'inventory-agent', reason: '상품번호 엔티티 감지' };
    }

    // 5. 기본값: CS 에이전트 (일반 문의로 처리)
    return { agentId: 'cs-agent', reason: '기본 라우팅 (일반 문의)' };
  }

  // ===========================================================================
  // 신뢰도 계산
  // ===========================================================================

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(
    keywordMatches: Map<string, { score: number; keywords: string[] }>,
    entities: ExtractedEntity[],
    intentCategory: IntentCategory,
    primaryAgent: { agentId: string; reason: string }
  ): number {
    let confidence = 0;

    // 키워드 매칭 점수
    const agentMatch = keywordMatches.get(primaryAgent.agentId);
    if (agentMatch) {
      confidence += Math.min(agentMatch.score * 0.3, 0.4);
    }

    // 의도 카테고리 일치
    if (intentCategory !== IntentCategory.UNKNOWN) {
      confidence += 0.25;
    }

    // 엔티티 추출
    if (entities.length > 0) {
      confidence += Math.min(entities.length * 0.1, 0.2);
    }

    // 에이전트 카테고리 일치
    const agentInfo = AGENT_REGISTRY.find((a) => a.id === primaryAgent.agentId);
    if (agentInfo?.categories.includes(intentCategory)) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  // ===========================================================================
  // 대안 에이전트
  // ===========================================================================

  /**
   * 대안 에이전트 목록 생성
   */
  private getAlternativeAgents(
    keywordMatches: Map<string, { score: number; keywords: string[] }>,
    primaryAgentId: string,
    intentCategory: IntentCategory
  ): { agentId: string; confidence: number; reason: string }[] {
    const alternatives: { agentId: string; confidence: number; reason: string }[] = [];

    // 키워드 매칭된 에이전트 중 상위 3개
    const sortedMatches = Array.from(keywordMatches.entries())
      .filter(([agentId]) => agentId !== primaryAgentId)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 3);

    for (const [agentId, match] of sortedMatches) {
      alternatives.push({
        agentId,
        confidence: Math.min(match.score * 0.3, 0.8),
        reason: `키워드 일치: ${match.keywords.join(', ')}`,
      });
    }

    // 같은 의도 카테고리의 에이전트
    const categoryAgents = AGENT_REGISTRY.filter(
      (a) => a.id !== primaryAgentId && a.categories.includes(intentCategory)
    );

    for (const agent of categoryAgents) {
      if (!alternatives.some((a) => a.agentId === agent.id)) {
        alternatives.push({
          agentId: agent.id,
          confidence: 0.5,
          reason: `같은 카테고리: ${intentCategory}`,
        });
      }
    }

    return alternatives.slice(0, 4);
  }

  // ===========================================================================
  // 명확화 질문 생성
  // ===========================================================================

  /**
   * 명확화 질문 생성
   */
  private generateClarificationQuestion(
    input: string,
    alternatives: { agentId: string; confidence: number; reason: string }[]
  ): string {
    if (alternatives.length === 0) {
      return '어떤 작업을 원하시나요? 좀 더 구체적으로 말씀해주세요.';
    }

    const options = alternatives.map((alt, idx) => {
      const agent = AGENT_REGISTRY.find((a) => a.id === alt.agentId);
      return `${idx + 1}. ${agent?.name || alt.agentId} - ${agent?.scope || ''}`;
    });

    return `어떤 작업을 원하시나요?\n\n${options.join('\n')}\n\n번호로 선택하거나 더 구체적으로 말씀해주세요.`;
  }

  // ===========================================================================
  // 필요 컨텍스트 결정
  // ===========================================================================

  /**
   * 필요한 추가 컨텍스트 결정
   */
  private determineRequiredContext(
    intentCategory: IntentCategory,
    entities: ExtractedEntity[]
  ): string[] {
    const required: string[] = [];

    // 주문 관련 의도인데 주문번호가 없는 경우
    if (
      [
        IntentCategory.ORDER_CANCEL,
        IntentCategory.ORDER_MODIFY,
        IntentCategory.ORDER_REFUND,
        IntentCategory.ORDER_TRACKING,
      ].includes(intentCategory)
    ) {
      if (!entities.some((e) => e.type === EntityType.ORDER_ID)) {
        required.push('주문번호');
      }
    }

    // 재고 관련 의도인데 상품번호가 없는 경우
    if (
      [
        IntentCategory.INVENTORY_CHECK,
        IntentCategory.INVENTORY_UPDATE,
      ].includes(intentCategory)
    ) {
      if (!entities.some((e) => e.type === EntityType.PRODUCT_ID)) {
        required.push('상품번호 또는 상품명');
      }
    }

    // 배송 추적인데 운송장 번호가 없는 경우
    if (intentCategory === IntentCategory.ORDER_TRACKING) {
      if (!entities.some((e) => e.type === EntityType.TRACKING_NUMBER)) {
        required.push('운송장번호');
      }
    }

    return required;
  }

  // ===========================================================================
  // 우선순위 결정
  // ===========================================================================

  /**
   * 요청 우선순위 결정
   */
  determinePriority(input: string, intentCategory: IntentCategory): PriorityLevel {
    // 1. 긴급 키워드 체크
    const keywordPriority = getPriorityBoost(input);
    if (keywordPriority !== undefined) {
      return keywordPriority;
    }

    // 2. 의도 카테고리 기반 기본 우선순위
    const categoryPriorities: Partial<Record<IntentCategory, PriorityLevel>> = {
      [IntentCategory.CS_COMPLAINT]: PriorityLevel.P1_HIGH,
      [IntentCategory.ORDER_CANCEL]: PriorityLevel.P2_MEDIUM,
      [IntentCategory.ORDER_REFUND]: PriorityLevel.P2_MEDIUM,
      [IntentCategory.CS_EXCHANGE]: PriorityLevel.P2_MEDIUM,
      [IntentCategory.CS_RETURN]: PriorityLevel.P2_MEDIUM,
      [IntentCategory.INVENTORY_ALERT]: PriorityLevel.P1_HIGH,
      [IntentCategory.ANALYTICS_SALES]: PriorityLevel.P3_LOW,
      [IntentCategory.ANALYTICS_CUSTOMER]: PriorityLevel.P3_LOW,
      [IntentCategory.MARKETING_CONTENT]: PriorityLevel.P4_BACKGROUND,
    };

    return categoryPriorities[intentCategory] ?? PriorityLevel.P3_LOW;
  }
}

// 싱글톤 인스턴스
let intentClassifierInstance: IntentClassifier | null = null;

/**
 * IntentClassifier 싱글톤 인스턴스 가져오기
 */
export function getIntentClassifier(): IntentClassifier {
  if (!intentClassifierInstance) {
    intentClassifierInstance = new IntentClassifier();
  }
  return intentClassifierInstance;
}

export default IntentClassifier;
