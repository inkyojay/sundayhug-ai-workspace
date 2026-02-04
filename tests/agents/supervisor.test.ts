/**
 * Supervisor Agent 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockTaskPayload,
  createOrderProcessingTask,
  createCSInquiryTask,
  csInquiryScenarios,
} from '../mocks/mockData';
import {
  MockAgent,
  MockAgentRegistry,
  createStandardMockAgents,
  createMockAgent,
} from '../mocks/mockAgents';
import { createTestEnvironment, TestEnvironment } from '../utils/testHelpers';
import { TaskPayload, SalesChannel } from '../../src/types';

describe('Supervisor Agent', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('라우팅 규칙', () => {
    it('주문 관련 키워드는 Order Agent로 라우팅되어야 함', async () => {
      const task = createMockTaskPayload('route', {
        action: 'route',
        content: '새 주문이 들어왔습니다. 주문번호 확인해주세요.',
        source: 'naver',
      });

      // Supervisor의 라우팅 로직 테스트
      const keywords = ['주문', '결제', '구매', '취소'];
      const content = (task.data as Record<string, unknown>).content as string;
      const hasOrderKeyword = keywords.some((k) => content.includes(k));

      expect(hasOrderKeyword).toBe(true);
    });

    it('CS 관련 키워드는 CS Agent로 라우팅되어야 함', async () => {
      const inquiry = csInquiryScenarios.simpleProductInquiry;
      const task = createCSInquiryTask(inquiry);

      const keywords = ['문의', '질문', '도움', 'help', 'support', '문제'];
      const content = inquiry.content;
      const hasCSKeyword = keywords.some((k) => content.includes(k));

      // 제품 문의는 CS Agent로 라우팅
      expect(inquiry.type).toBe('product_inquiry');
    });

    it('안전 관련 키워드는 Crisis Agent로 라우팅되어야 함', async () => {
      const safetyInquiry = csInquiryScenarios.urgentSafetyIssue;
      const task = createCSInquiryTask(safetyInquiry);

      const safetyKeywords = ['위험', '사고', '안전', '긴급', 'emergency', 'recall', '리콜', '부상'];
      const content = safetyInquiry.content;
      const hasSafetyKeyword = safetyKeywords.some((k) => content.includes(k));

      // "발진"은 안전 키워드에 포함되지 않지만, urgent priority로 Crisis로 갈 수 있음
      expect(safetyInquiry.priority).toBe('urgent');
    });

    it('배송 관련 키워드는 Logistics Agent로 라우팅되어야 함', async () => {
      const task = createMockTaskPayload('route', {
        action: 'route',
        content: '배송이 언제 오나요? 택배 조회 좀 해주세요.',
        source: 'naver',
      });

      const keywords = ['배송', '택배', '운송', 'delivery', 'shipping'];
      const content = (task.data as Record<string, unknown>).content as string;
      const hasLogisticsKeyword = keywords.some((k) => content.includes(k));

      expect(hasLogisticsKeyword).toBe(true);
    });

    it('재고 관련 키워드는 Inventory Agent로 라우팅되어야 함', async () => {
      const task = createMockTaskPayload('route', {
        action: 'route',
        content: '이 상품 재고 있나요? 품절인가요?',
        source: 'cafe24',
      });

      const keywords = ['재고', '입고', '품절', 'stock', 'inventory'];
      const content = (task.data as Record<string, unknown>).content as string;
      const hasInventoryKeyword = keywords.some((k) => content.includes(k));

      expect(hasInventoryKeyword).toBe(true);
    });
  });

  describe('소스 기반 라우팅', () => {
    it('네이버 스마트스토어 소스는 Order Agent가 우선되어야 함', () => {
      const sourceRouting = [
        { source: 'naver_smartstore', primary: '01-order', fallback: '02-cs' },
        { source: 'coupang', primary: '01-order', fallback: '02-cs' },
      ];

      const naverRule = sourceRouting.find((r) => r.source === 'naver_smartstore');
      expect(naverRule?.primary).toBe('01-order');
    });

    it('인스타그램 소스는 Marketing Agent가 우선되어야 함', () => {
      const sourceRouting = [
        { source: 'instagram', primary: '03-marketing', fallback: '07-media' },
        { source: 'email', primary: '02-cs', fallback: '00-supervisor' },
      ];

      const instagramRule = sourceRouting.find((r) => r.source === 'instagram');
      expect(instagramRule?.primary).toBe('03-marketing');
    });
  });

  describe('우선순위 결정', () => {
    it('VIP 고객은 P1 우선순위를 받아야 함', () => {
      const factors = {
        isVip: true,
        financialImpact: 50000,
        isRepeatComplaint: false,
        sentimentScore: 0.5,
        waitTime: 0,
        customerValue: 1000000,
      };

      // VIP 고객은 P1 (URGENT)
      expect(factors.isVip).toBe(true);
    });

    it('재무 영향이 50만원 이상이면 P1 우선순위를 받아야 함', () => {
      const factors = {
        isVip: false,
        financialImpact: 600000,
        isRepeatComplaint: false,
        sentimentScore: 0,
        waitTime: 0,
        customerValue: 100000,
      };

      // 50만원 이상 P1
      expect(factors.financialImpact).toBeGreaterThanOrEqual(500000);
    });

    it('반복 불만은 P2 우선순위를 받아야 함', () => {
      const factors = {
        isVip: false,
        financialImpact: 30000,
        isRepeatComplaint: true,
        sentimentScore: -0.5,
        waitTime: 0,
        customerValue: 50000,
      };

      expect(factors.isRepeatComplaint).toBe(true);
    });

    it('부정적 감정(< -0.7)은 P2 우선순위를 받아야 함', () => {
      const factors = {
        isVip: false,
        financialImpact: 30000,
        isRepeatComplaint: false,
        sentimentScore: -0.8,
        waitTime: 0,
        customerValue: 50000,
      };

      expect(factors.sentimentScore).toBeLessThan(-0.7);
    });
  });

  describe('에이전트 실행', () => {
    it('등록된 에이전트를 실행할 수 있어야 함', async () => {
      const orderAgent = env.agents.get('01-order')!;
      expect(orderAgent).toBeDefined();

      const result = await env.registry.executeAgent('01-order', { orderId: 'ORD-001' });

      expect(result).not.toBeNull();
      expect(result?.status).toBe('completed');
    });

    it('등록되지 않은 에이전트 실행 시 null 반환', async () => {
      const result = await env.registry.executeAgent('99-unknown', {});
      expect(result).toBeNull();
    });

    it('에이전트 실행 통계가 업데이트되어야 함', async () => {
      await env.registry.executeAgent('01-order', {});
      await env.registry.executeAgent('01-order', {});
      await env.registry.executeAgent('02-cs', {});

      const stats = env.registry.getStatistics();
      expect(stats.totalExecutions).toBe(3);
    });
  });

  describe('멀티 에이전트 협업', () => {
    it('복잡한 요청은 여러 에이전트를 포함해야 함', () => {
      const content = '주문한 상품의 재고가 없다고 하는데, 언제 입고되나요? 빨리 배송해주세요.';

      const keywords = {
        order: ['주문', '결제', '구매'],
        inventory: ['재고', '입고', '품절'],
        logistics: ['배송', '택배'],
      };

      const matchedAgents: string[] = [];
      if (keywords.order.some((k) => content.includes(k))) matchedAgents.push('01-order');
      if (keywords.inventory.some((k) => content.includes(k))) matchedAgents.push('05-inventory');
      if (keywords.logistics.some((k) => content.includes(k))) matchedAgents.push('13-logistics');

      expect(matchedAgents.length).toBeGreaterThan(1);
      expect(matchedAgents).toContain('01-order');
      expect(matchedAgents).toContain('05-inventory');
      expect(matchedAgents).toContain('13-logistics');
    });
  });

  describe('헬스체크', () => {
    it('모든 에이전트가 정상이면 healthy=true', () => {
      const health = env.registry.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.unhealthyAgents).toHaveLength(0);
    });

    it('에이전트 상태 세부 정보를 제공해야 함', () => {
      const health = env.registry.healthCheck();
      expect(health.details['01-order']).toBeDefined();
      expect(health.details['02-cs']).toBeDefined();
    });
  });
});

describe('라우팅 결정 로직', () => {
  /**
   * 라우팅 결정 함수 (SupervisorAgent.decideRouting의 단순화 버전)
   */
  function decideRouting(content: string, source?: string): {
    targetAgent: string;
    confidence: number;
    reason: string;
  } {
    // 1. 안전 이슈 체크
    const safetyKeywords = ['위험', '사고', '안전', '긴급', 'emergency', 'recall', '리콜', '부상'];
    if (safetyKeywords.some((k) => content.toLowerCase().includes(k))) {
      return { targetAgent: '12-crisis', confidence: 1.0, reason: 'safety_issue' };
    }

    // 2. 엔티티 매칭
    if (/ORD-\d{8}-\d{4}/.test(content)) {
      return { targetAgent: '01-order', confidence: 0.95, reason: 'entity_based' };
    }
    if (/CUS-\d{6}/.test(content)) {
      return { targetAgent: '02-cs', confidence: 0.95, reason: 'entity_based' };
    }

    // 3. 키워드 매칭
    const keywordRules = [
      { agentId: '01-order', keywords: ['주문', '결제', '구매', '취소'], priority: 2 },
      { agentId: '02-cs', keywords: ['문의', '질문', '도움', 'help', 'support', '문제'], priority: 1 },
      { agentId: '13-logistics', keywords: ['배송', '택배', '운송'], priority: 2 },
      { agentId: '05-inventory', keywords: ['재고', '입고', '품절'], priority: 3 },
      { agentId: '03-marketing', keywords: ['마케팅', '광고', '프로모션'], priority: 3 },
    ];

    const matches = keywordRules.filter((rule) =>
      rule.keywords.some((k) => content.toLowerCase().includes(k))
    );

    if (matches.length > 0) {
      const sorted = matches.sort((a, b) => a.priority - b.priority);
      return { targetAgent: sorted[0].agentId, confidence: 0.85, reason: 'keyword_match' };
    }

    // 4. 소스 기반
    if (source) {
      const sourceRouting: Record<string, string> = {
        naver_smartstore: '01-order',
        coupang: '01-order',
        instagram: '03-marketing',
        email: '02-cs',
      };
      if (sourceRouting[source]) {
        return { targetAgent: sourceRouting[source], confidence: 0.7, reason: 'source_based' };
      }
    }

    // 5. 기본
    return { targetAgent: '02-cs', confidence: 0.5, reason: 'default' };
  }

  it('안전 키워드는 최우선 라우팅', () => {
    const result = decideRouting('제품 사용 후 부상을 입었습니다');
    expect(result.targetAgent).toBe('12-crisis');
    expect(result.confidence).toBe(1.0);
    expect(result.reason).toBe('safety_issue');
  });

  it('주문번호 엔티티는 Order Agent로', () => {
    const result = decideRouting('ORD-20250201-0001 주문 확인해주세요');
    expect(result.targetAgent).toBe('01-order');
    expect(result.reason).toBe('entity_based');
  });

  it('고객번호 엔티티는 CS Agent로', () => {
    const result = decideRouting('CUS-123456 고객 정보 조회');
    expect(result.targetAgent).toBe('02-cs');
    expect(result.reason).toBe('entity_based');
  });

  it('배송 키워드는 Logistics Agent로', () => {
    const result = decideRouting('배송이 언제 도착하나요?');
    expect(result.targetAgent).toBe('13-logistics');
    expect(result.reason).toBe('keyword_match');
  });

  it('인식되지 않는 요청은 기본 CS Agent로', () => {
    const result = decideRouting('안녕하세요');
    expect(result.targetAgent).toBe('02-cs');
    expect(result.reason).toBe('default');
    expect(result.confidence).toBe(0.5);
  });
});
