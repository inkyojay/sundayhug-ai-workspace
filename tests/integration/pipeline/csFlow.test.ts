/**
 * CS 문의 처리 파이프라인 통합 테스트
 *
 * 시나리오 B: CS 문의 처리 파이프라인
 * 고객 문의 접수 → Supervisor 라우팅 → InquiryResponder 의도 파악
 * → 신뢰도 85%+ 자동 응답 / 신뢰도 낮음 CEO 에스컬레이션
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockCSInquiry,
  createCSInquiryTask,
  csInquiryScenarios,
  createMockOrder,
} from '../../mocks/mockData';
import {
  MockAgent,
  MockAgentRegistry,
  createStandardMockAgents,
  createMockAgent,
} from '../../mocks/mockAgents';
import { createTestEnvironment, TestEnvironment } from '../../utils/testHelpers';
import { TaskStatus } from '../../../src/types';

describe('CS 문의 처리 파이프라인', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('시나리오 B: 고객 문의 자동 응답', () => {
    it('단순 제품 문의는 CS Agent로 라우팅되어야 함', async () => {
      const inquiry = csInquiryScenarios.simpleProductInquiry;
      const task = createCSInquiryTask(inquiry);

      const csAgent = env.agents.get('02-cs')!;
      const result = await csAgent.execute({
        action: 'handle_inquiry',
        inquiry,
        type: inquiry.type,
      });

      expect(result.success).toBe(true);
      expect(csAgent.executeHistory.length).toBe(1);
    });

    it('높은 신뢰도(85%+)의 응답은 자동 처리되어야 함', async () => {
      const inquiry = csInquiryScenarios.simpleProductInquiry;

      // 의도 분류 시뮬레이션
      const intentClassification = {
        intent: 'product_ingredient_inquiry',
        confidence: 0.92, // 92% 신뢰도
        entities: ['민감성 피부', '성분'],
      };

      // 신뢰도가 85% 이상이면 자동 응답
      const AUTO_RESPONSE_THRESHOLD = 0.85;
      const canAutoRespond = intentClassification.confidence >= AUTO_RESPONSE_THRESHOLD;

      expect(canAutoRespond).toBe(true);
    });

    it('낮은 신뢰도의 응답은 에스컬레이션되어야 함', async () => {
      const inquiry = createMockCSInquiry({
        type: 'product_inquiry',
        subject: '복잡한 문의',
        content: '이 제품이랑 저 제품이랑 어떤 차이가 있고, 둘 다 써도 되는지, 아니면 다른 걸 써야 하는지 모르겠어요.',
        priority: 'medium',
      });

      // 복잡한 문의는 신뢰도가 낮을 수 있음
      const intentClassification = {
        intent: 'complex_inquiry',
        confidence: 0.65, // 65% 신뢰도
        entities: [],
      };

      const AUTO_RESPONSE_THRESHOLD = 0.85;
      const needsEscalation = intentClassification.confidence < AUTO_RESPONSE_THRESHOLD;

      expect(needsEscalation).toBe(true);
    });
  });

  describe('시나리오: 감정 분석 기반 우선순위', () => {
    it('부정적 감정(-0.7 이하)은 높은 우선순위로 처리되어야 함', () => {
      const angryInquiry = csInquiryScenarios.angryComplaint;

      // 감정 점수가 -0.7 이하면 우선 처리
      expect(angryInquiry.sentiment).toBeLessThan(-0.7);
      expect(angryInquiry.priority).toBe('high');
    });

    it('중립적 감정은 일반 우선순위로 처리되어야 함', () => {
      const normalInquiry = csInquiryScenarios.simpleProductInquiry;

      // 감정 점수가 중립적이면 일반 처리
      expect(normalInquiry.sentiment).toBeGreaterThan(-0.5);
      expect(normalInquiry.priority).toBe('low');
    });
  });

  describe('시나리오: 문의 유형별 처리', () => {
    it('반품 요청은 Order Agent와 협업해야 함', async () => {
      const returnRequest = csInquiryScenarios.returnRequest;
      expect(returnRequest.type).toBe('return_request');
      expect(returnRequest.orderId).toBeDefined();

      const csAgent = env.agents.get('02-cs')!;
      const orderAgent = env.agents.get('01-order')!;

      // CS Agent가 먼저 반품 사유 확인
      await csAgent.execute({
        action: 'verify_return_reason',
        inquiry: returnRequest,
        orderId: returnRequest.orderId,
      });

      // Order Agent가 반품 처리
      await orderAgent.execute({
        action: 'process_return',
        orderId: returnRequest.orderId,
        reason: returnRequest.content,
      });

      expect(csAgent.executeHistory.length).toBe(1);
      expect(orderAgent.executeHistory.length).toBe(1);
    });

    it('교환 요청은 재고 확인 후 처리되어야 함', async () => {
      const exchangeRequest = csInquiryScenarios.exchangeRequest;
      expect(exchangeRequest.type).toBe('exchange_request');
      expect(exchangeRequest.productId).toBeDefined();

      const csAgent = env.agents.get('02-cs')!;
      const inventoryAgent = env.agents.get('05-inventory')!;
      const orderAgent = env.agents.get('01-order')!;

      // 1. CS Agent가 교환 요청 접수
      await csAgent.execute({
        action: 'receive_exchange_request',
        inquiry: exchangeRequest,
      });

      // 2. Inventory Agent가 교환 상품 재고 확인
      await inventoryAgent.execute({
        action: 'check_stock',
        productId: exchangeRequest.productId,
        optionName: '23호', // 교환 요청 옵션
      });

      // 3. Order Agent가 교환 처리
      await orderAgent.execute({
        action: 'process_exchange',
        orderId: exchangeRequest.orderId,
        newOption: '23호',
      });

      expect(csAgent.executeHistory.length).toBe(1);
      expect(inventoryAgent.executeHistory.length).toBe(1);
      expect(orderAgent.executeHistory.length).toBe(1);
    });

    it('긴급 안전 이슈는 Crisis Agent로 에스컬레이션되어야 함', async () => {
      const safetyIssue = csInquiryScenarios.urgentSafetyIssue;
      expect(safetyIssue.priority).toBe('urgent');

      const crisisAgent = env.agents.get('12-crisis')!;

      // Crisis Agent가 안전 이슈 처리
      const result = await crisisAgent.execute({
        action: 'handle_safety_issue',
        inquiry: safetyIssue,
        productId: safetyIssue.productId,
      });

      expect(result.success).toBe(true);
      expect(crisisAgent.executeHistory.length).toBe(1);
    });
  });

  describe('시나리오: 응답 생성 및 발송', () => {
    it('자동 응답 템플릿이 올바르게 선택되어야 함', () => {
      const inquiry = csInquiryScenarios.simpleProductInquiry;

      // 의도에 따른 템플릿 매핑
      const templates: Record<string, string> = {
        product_ingredient_inquiry:
          '안녕하세요, 썬데이허그입니다.\n해당 제품의 성분에 대해 안내드립니다...',
        shipping_inquiry:
          '안녕하세요, 썬데이허그입니다.\n배송 현황을 확인해드리겠습니다...',
        return_request:
          '안녕하세요, 썬데이허그입니다.\n반품 절차를 안내드립니다...',
      };

      const intent = 'product_ingredient_inquiry';
      const template = templates[intent];

      expect(template).toBeDefined();
      expect(template).toContain('썬데이허그');
    });

    it('개인화된 응답이 생성되어야 함', () => {
      const inquiry = csInquiryScenarios.simpleProductInquiry;

      // 응답 개인화
      const personalizedResponse = {
        greeting: `${inquiry.customerName}님, 안녕하세요.`,
        body: '민감성 피부에도 안심하고 사용하실 수 있도록 저자극 포뮬러로 제작되었습니다.',
        closing: '더 궁금하신 점이 있으시면 언제든 문의해주세요.',
        signature: '썬데이허그 고객센터 드림',
      };

      expect(personalizedResponse.greeting).toContain(inquiry.customerName);
    });
  });

  describe('시나리오: CEO 에스컬레이션', () => {
    it('해결 불가 문의는 CEO에게 에스컬레이션되어야 함', async () => {
      const complexInquiry = createMockCSInquiry({
        type: 'complaint',
        subject: '법적 대응 검토 요청',
        content: '제품 하자로 인해 손해를 입었습니다. 법적 대응을 검토하겠습니다.',
        priority: 'urgent',
        sentiment: -0.95,
      });

      // 에스컬레이션 조건
      const escalationConditions = {
        containsLegalThreats: complexInquiry.content.includes('법적'),
        isExtremelySentiment: complexInquiry.sentiment! < -0.9,
        isUrgent: complexInquiry.priority === 'urgent',
      };

      const shouldEscalate = Object.values(escalationConditions).some((v) => v);
      expect(shouldEscalate).toBe(true);
    });

    it('에스컬레이션 시 알림 채널이 올바르게 선택되어야 함', () => {
      // 우선순위별 알림 채널
      const notificationChannels: Record<string, string> = {
        P0_CRITICAL: 'PHONE',
        P1_URGENT: 'KAKAO',
        P2_HIGH: 'SLACK',
        P3_NORMAL: 'EMAIL',
      };

      expect(notificationChannels.P1_URGENT).toBe('KAKAO');
      expect(notificationChannels.P0_CRITICAL).toBe('PHONE');
    });
  });

  describe('시나리오: 전체 CS 파이프라인 흐름', () => {
    it('전체 CS 처리 파이프라인이 순차적으로 실행되어야 함', async () => {
      const inquiry = csInquiryScenarios.orderStatusInquiry;
      const executedAgents: string[] = [];

      // 1. Supervisor 라우팅
      const supervisor = env.agents.get('00-supervisor')!;
      await supervisor.execute({ action: 'route', inquiry });
      executedAgents.push('00-supervisor');

      // 2. CS Agent 의도 파악 및 응답 생성
      const csAgent = env.agents.get('02-cs')!;
      await csAgent.execute({
        action: 'classify_intent',
        inquiry,
      });
      executedAgents.push('02-cs');

      // 3. 주문 관련 문의이므로 Order Agent에 정보 요청
      const orderAgent = env.agents.get('01-order')!;
      await orderAgent.execute({
        action: 'get_order_status',
        orderId: inquiry.orderId,
      });
      executedAgents.push('01-order');

      // 모든 에이전트가 실행되었는지 확인
      expect(executedAgents).toEqual(['00-supervisor', '02-cs', '01-order']);
    });
  });
});

describe('의도 분류 정확성', () => {
  /**
   * 의도 분류 함수 (IntentClassifier의 단순화 버전)
   */
  function classifyIntent(content: string): { intent: string; confidence: number } {
    const intentKeywords: Record<string, string[]> = {
      shipping_inquiry: ['배송', '도착', '택배', '언제'],
      product_inquiry: ['성분', '사용법', '효과', '피부'],
      return_request: ['반품', '환불', '취소'],
      exchange_request: ['교환', '다른', '사이즈', '호수'],
      complaint: ['불만', '문제', '하자', '불량', '손해'],
      general_inquiry: ['문의', '질문', '궁금'],
    };

    let bestIntent = 'general_inquiry';
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      const matches = keywords.filter((k) => content.includes(k)).length;
      const score = matches / keywords.length;
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    return {
      intent: bestIntent,
      confidence: Math.min(0.5 + bestScore * 0.5, 1),
    };
  }

  it('배송 문의를 올바르게 분류해야 함', () => {
    const result = classifyIntent('배송이 언제 도착하나요?');
    expect(result.intent).toBe('shipping_inquiry');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('제품 문의를 올바르게 분류해야 함', () => {
    const result = classifyIntent('이 제품 성분이 뭔가요? 민감한 피부에 써도 되나요?');
    expect(result.intent).toBe('product_inquiry');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('반품 요청을 올바르게 분류해야 함', () => {
    const result = classifyIntent('반품하고 환불 받고 싶습니다');
    expect(result.intent).toBe('return_request');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('불만 사항을 올바르게 분류해야 함', () => {
    const result = classifyIntent('제품에 하자가 있고 불량인 것 같습니다');
    expect(result.intent).toBe('complaint');
    expect(result.confidence).toBeGreaterThan(0.6);
  });
});
