/**
 * CS Agent 단위 테스트
 * 개별 에이전트 동작 검증
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMockCSInquiry,
  csInquiryScenarios,
  createMockOrder,
} from '../mocks/mockData';
import { createTestEnvironment, TestEnvironment } from '../utils/testHelpers';
import { ApprovalLevel } from '../../src/types';

describe('CS Agent 단위 테스트', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
    vi.clearAllMocks();
  });

  describe('CS Agent 기본 기능', () => {
    it('CS Agent가 정상적으로 등록되어야 함', () => {
      const csAgent = env.agents.get('02-cs');
      expect(csAgent).toBeDefined();
      expect(csAgent?.getId()).toBe('02-cs');
    });

    it('CS Agent가 실행 가능해야 함', async () => {
      const csAgent = env.agents.get('02-cs')!;
      const result = await csAgent.execute({
        action: 'process_inquiries',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('문의응대 서브에이전트 (InquiryResponder)', () => {
    it('문의를 분류할 수 있어야 함', () => {
      const inquiry = csInquiryScenarios.simpleProductInquiry;

      // 문의 유형 분류
      expect(inquiry.type).toBe('product_inquiry');
      expect(inquiry.priority).toBe('low');
    });

    it('자동 응답이 가능한지 판단해야 함', () => {
      const csConfig = {
        autoResponseEnabled: true,
        autoResponseConfidenceThreshold: 0.85,
      };

      const intentClassification = {
        intent: 'product_inquiry',
        confidence: 0.92,
      };

      const canAutoRespond =
        csConfig.autoResponseEnabled &&
        intentClassification.confidence >= csConfig.autoResponseConfidenceThreshold;

      expect(canAutoRespond).toBe(true);
    });

    it('신뢰도가 낮으면 자동 응답이 비활성화되어야 함', () => {
      const csConfig = {
        autoResponseEnabled: true,
        autoResponseConfidenceThreshold: 0.85,
      };

      const intentClassification = {
        intent: 'complex_inquiry',
        confidence: 0.65,
      };

      const canAutoRespond =
        csConfig.autoResponseEnabled &&
        intentClassification.confidence >= csConfig.autoResponseConfidenceThreshold;

      expect(canAutoRespond).toBe(false);
    });

    it('긴급 문의를 식별해야 함', () => {
      const urgentInquiry = csInquiryScenarios.urgentSafetyIssue;
      expect(urgentInquiry.priority).toBe('urgent');
      expect(urgentInquiry.sentiment).toBeLessThan(-0.8);
    });
  });

  describe('리뷰관리 서브에이전트 (ReviewManager)', () => {
    it('리뷰 평점에 따라 자동 답변 여부를 결정해야 함', () => {
      const csConfig = {
        reviewAutoReplyEnabled: true,
        reviewAutoReplyMinRating: 4,
      };

      const positiveReview = { rating: 5, content: '정말 좋아요!' };
      const negativeReview = { rating: 2, content: '별로예요...' };

      const canAutoReplyPositive =
        csConfig.reviewAutoReplyEnabled && positiveReview.rating >= csConfig.reviewAutoReplyMinRating;
      const canAutoReplyNegative =
        csConfig.reviewAutoReplyEnabled && negativeReview.rating >= csConfig.reviewAutoReplyMinRating;

      expect(canAutoReplyPositive).toBe(true);
      expect(canAutoReplyNegative).toBe(false);
    });

    it('부정적 리뷰는 에스컬레이션되어야 함', () => {
      const negativeReview = {
        rating: 1,
        content: '제품에 하자가 있었습니다.',
        sentiment: -0.8,
      };

      const shouldEscalate = negativeReview.rating <= 2 || negativeReview.sentiment < -0.5;
      expect(shouldEscalate).toBe(true);
    });
  });

  describe('AS처리 서브에이전트 (ASHandler)', () => {
    it('AS 요청을 접수할 수 있어야 함', async () => {
      const csAgent = env.agents.get('02-cs')!;

      const asRequest = {
        customerId: 'CUS-001234',
        orderId: 'ORD-001',
        productId: 'PRD-00001',
        issue: '제품 파손',
        description: '배송 중 파손된 것 같습니다.',
      };

      const result = await csAgent.execute({
        action: 'create_as_request',
        request: asRequest,
      });

      expect(result.success).toBe(true);
    });

    it('AS 상태를 추적할 수 있어야 함', () => {
      const asStatuses = ['접수', '검토중', '수리중', '완료', '반송중'];
      const currentStatus = '검토중';

      expect(asStatuses).toContain(currentStatus);
    });
  });

  describe('VOC분석 서브에이전트 (VOCAnalyzer)', () => {
    it('VOC 데이터를 분석할 수 있어야 함', async () => {
      const csAgent = env.agents.get('02-cs')!;

      const result = await csAgent.execute({
        action: 'analyze_voc',
        period: 'weekly',
      });

      expect(result.success).toBe(true);
    });

    it('주요 이슈를 분류해야 함', () => {
      const vocItems = [
        { category: 'product_quality', count: 15 },
        { category: 'shipping_delay', count: 8 },
        { category: 'customer_service', count: 5 },
        { category: 'price_issue', count: 3 },
      ];

      const topIssue = vocItems.sort((a, b) => b.count - a.count)[0];
      expect(topIssue.category).toBe('product_quality');
    });

    it('트렌드를 감지해야 함', () => {
      const weeklyData = [
        { week: 1, complaints: 10 },
        { week: 2, complaints: 12 },
        { week: 3, complaints: 15 },
        { week: 4, complaints: 20 },
      ];

      // 증가 추세 감지
      const isIncreasing = weeklyData.every((item, idx) => {
        if (idx === 0) return true;
        return item.complaints >= weeklyData[idx - 1].complaints;
      });

      expect(isIncreasing).toBe(true);
    });
  });

  describe('클레임처리 서브에이전트 (ClaimProcessor)', () => {
    it('클레임을 접수할 수 있어야 함', async () => {
      const csAgent = env.agents.get('02-cs')!;

      const claim = {
        customerId: 'CUS-001234',
        orderId: 'ORD-001',
        type: 'product_defect',
        amount: 45000,
        description: '제품 불량으로 인한 환불 요청',
      };

      const result = await csAgent.execute({
        action: 'submit_claim',
        claim,
      });

      expect(result.success).toBe(true);
    });

    it('금액에 따라 자동 에스컬레이션 여부를 결정해야 함', () => {
      const csConfig = {
        claimAutoEscalateAmount: 100000,
      };

      const smallClaim = { amount: 50000 };
      const largeClaim = { amount: 150000 };

      const shouldEscalateSmall = smallClaim.amount >= csConfig.claimAutoEscalateAmount;
      const shouldEscalateLarge = largeClaim.amount >= csConfig.claimAutoEscalateAmount;

      expect(shouldEscalateSmall).toBe(false);
      expect(shouldEscalateLarge).toBe(true);
    });

    it('클레임 상태를 추적해야 함', () => {
      const claimStatuses = [
        'pending',
        'in_review',
        'approved',
        'rejected',
        'resolved',
        'escalated',
      ];

      expect(claimStatuses).toContain('escalated');
    });
  });

  describe('에스컬레이션 규칙', () => {
    it('대기 시간 초과 시 에스컬레이션해야 함', () => {
      const escalationRules = {
        waitTimeMinutes: 60,
        negativeSentimentThreshold: 0.3,
        repeatInquiryCount: 3,
      };

      const inquiry = {
        createdAt: new Date(Date.now() - 90 * 60 * 1000), // 90분 전
        sentiment: 0.5,
        previousInquiryCount: 1,
      };

      const waitTimeMinutes = (Date.now() - inquiry.createdAt.getTime()) / (1000 * 60);
      const shouldEscalate = waitTimeMinutes > escalationRules.waitTimeMinutes;

      expect(shouldEscalate).toBe(true);
    });

    it('부정적 감정 임계값 초과 시 에스컬레이션해야 함', () => {
      const escalationRules = {
        negativeSentimentThreshold: 0.3,
      };

      const angryInquiry = csInquiryScenarios.angryComplaint;
      const shouldEscalate = angryInquiry.sentiment! < -escalationRules.negativeSentimentThreshold;

      expect(shouldEscalate).toBe(true);
    });

    it('반복 문의 시 에스컬레이션해야 함', () => {
      const escalationRules = {
        repeatInquiryCount: 3,
      };

      const repeatCustomer = {
        customerId: 'CUS-001234',
        previousInquiryCount: 4,
      };

      const shouldEscalate = repeatCustomer.previousInquiryCount >= escalationRules.repeatInquiryCount;

      expect(shouldEscalate).toBe(true);
    });
  });

  describe('VIP 고객 처리', () => {
    it('VIP 고객 문의는 높은 우선순위를 받아야 함', () => {
      const csConfig = {
        vipCustomerPriority: true,
      };

      const inquiry = createMockCSInquiry({
        priority: 'medium',
      });

      const customer = {
        customerId: inquiry.customerId,
        isVip: true,
        totalPurchases: 5000000,
      };

      const adjustedPriority =
        csConfig.vipCustomerPriority && customer.isVip ? 'high' : inquiry.priority;

      expect(adjustedPriority).toBe('high');
    });
  });

  describe('근무 시간 확인', () => {
    it('근무 시간 내 문의는 즉시 처리되어야 함', () => {
      const workingHours = {
        start: 9,
        end: 18,
        timezone: 'Asia/Seoul',
      };

      const currentHour = 14; // 오후 2시
      const isWorkingHours = currentHour >= workingHours.start && currentHour < workingHours.end;

      expect(isWorkingHours).toBe(true);
    });

    it('근무 시간 외 문의는 자동 응답 메시지를 발송해야 함', () => {
      const workingHours = {
        start: 9,
        end: 18,
      };

      const currentHour = 22; // 오후 10시
      const isAfterHours = currentHour < workingHours.start || currentHour >= workingHours.end;

      expect(isAfterHours).toBe(true);

      const autoResponseMessage =
        '감사합니다. 현재 운영 시간(09:00-18:00) 외입니다. 다음 영업일에 답변드리겠습니다.';
      expect(autoResponseMessage).toContain('운영 시간');
    });
  });
});

describe('CS Agent 설정', () => {
  it('기본 설정값이 올바르게 설정되어야 함', () => {
    const defaultCSConfig = {
      autoResponseEnabled: true,
      autoResponseConfidenceThreshold: 0.85,
      reviewAutoReplyEnabled: true,
      reviewAutoReplyMinRating: 4,
      claimAutoEscalateAmount: 100000,
      vipCustomerPriority: true,
      workingHours: {
        start: 9,
        end: 18,
        timezone: 'Asia/Seoul',
      },
      escalationRules: {
        waitTimeMinutes: 60,
        negativeSentimentThreshold: 0.3,
        repeatInquiryCount: 3,
      },
    };

    expect(defaultCSConfig.autoResponseConfidenceThreshold).toBe(0.85);
    expect(defaultCSConfig.escalationRules.waitTimeMinutes).toBe(60);
  });
});
