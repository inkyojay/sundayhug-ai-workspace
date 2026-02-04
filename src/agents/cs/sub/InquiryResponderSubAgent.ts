/**
 * 문의응대 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 카톡/게시판/이메일 문의 자동응답
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  Inquiry,
  InquiryChannel,
  InquiryType,
  InquiryStatus,
  InquiryPriority,
  InquiryResponse,
  AIResponseResult,
} from '../types';

/**
 * 자동 응답 설정
 */
interface AutoResponseConfig {
  autoResponseEnabled: boolean;
  confidenceThreshold: number;
}

/**
 * FAQ 템플릿
 */
interface FAQTemplate {
  id: string;
  type: InquiryType;
  keywords: string[];
  question: string;
  answer: string;
}

/**
 * InquiryResponderSubAgent 클래스
 * 고객 문의에 자동 응답하는 서브에이전트
 */
export class InquiryResponderSubAgent extends SubAgent {
  private autoResponseConfig: AutoResponseConfig;
  private faqTemplates: FAQTemplate[] = [];

  constructor(config: SubAgentConfig, autoResponseConfig?: Partial<AutoResponseConfig>) {
    super(config);
    this.autoResponseConfig = {
      autoResponseEnabled: true,
      confidenceThreshold: 0.85,
      ...autoResponseConfig,
    };
    this.initializeFAQTemplates();
  }

  /**
   * FAQ 템플릿 초기화
   */
  private initializeFAQTemplates(): void {
    this.faqTemplates = [
      {
        id: 'faq-delivery-1',
        type: InquiryType.DELIVERY,
        keywords: ['배송', '언제', '도착', '배달'],
        question: '배송은 언제 되나요?',
        answer: '안녕하세요, 썬데이허그입니다.\n\n주문하신 상품은 결제 완료 후 1-2 영업일 내 출고되며, 출고 후 1-2일 내 배송 완료됩니다.\n\n배송 현황은 주문내역에서 운송장 번호로 확인하실 수 있습니다.\n\n추가 문의사항이 있으시면 말씀해 주세요. 감사합니다.',
      },
      {
        id: 'faq-return-1',
        type: InquiryType.RETURN_EXCHANGE,
        keywords: ['반품', '교환', '환불', '취소'],
        question: '반품/교환은 어떻게 하나요?',
        answer: '안녕하세요, 썬데이허그입니다.\n\n반품/교환은 상품 수령 후 7일 이내 접수 가능합니다.\n\n[반품/교환 신청 방법]\n1. 마이페이지 > 주문내역에서 해당 주문 선택\n2. 반품/교환 신청 버튼 클릭\n3. 사유 선택 및 접수 완료\n\n접수 후 택배 기사님이 방문 수거해 드립니다.\n\n추가 문의사항이 있으시면 말씀해 주세요. 감사합니다.',
      },
      {
        id: 'faq-product-1',
        type: InquiryType.PRODUCT,
        keywords: ['재입고', '품절', '재고', '언제 들어와'],
        question: '품절 상품 재입고는 언제 되나요?',
        answer: '안녕하세요, 썬데이허그입니다.\n\n문의하신 상품의 재입고 일정을 확인하여 안내드리겠습니다.\n\n상품 상세페이지에서 "재입고 알림" 신청을 해주시면, 입고 시 알림을 받으실 수 있습니다.\n\n추가 문의사항이 있으시면 말씀해 주세요. 감사합니다.',
      },
    ];
  }

  protected async initialize(): Promise<void> {
    this.logger.info('InquiryResponderSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('InquiryResponderSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'process_new_inquiries':
        const processResult = await this.processNewInquiries();
        return this.createSuccessResult(processResult, startTime);

      case 'generate_response':
        const { inquiryId } = context.data as { inquiryId: string };
        const responseResult = await this.generateResponse(inquiryId);
        return this.createSuccessResult(responseResult, startTime);

      default:
        const defaultResult = await this.processNewInquiries();
        return this.createSuccessResult(defaultResult, startTime);
    }
  }

  /**
   * 신규 문의 처리
   */
  async processNewInquiries(): Promise<{ handled: number; escalated: number }> {
    this.logger.info('Processing new inquiries...');

    const db = this.getDatabase('inquiries');
    const result = await db.findMany<Inquiry>({
      status: InquiryStatus.NEW,
    });

    if (result.error || !result.data) {
      return { handled: 0, escalated: 0 };
    }

    let handled = 0;
    let escalated = 0;

    for (const inquiry of result.data) {
      try {
        const aiResult = await this.analyzeAndRespond(inquiry);

        if (aiResult.autoRespond && this.autoResponseConfig.autoResponseEnabled) {
          // 자동 응답
          await this.sendAutoResponse(inquiry, aiResult.suggestedResponse);
          handled++;
        } else if (aiResult.requiresHumanReview) {
          // 에스컬레이션
          await this.escalateInquiry(inquiry, aiResult.reasoning || '수동 검토 필요');
          escalated++;
        } else {
          // 응답 대기
          await this.markAsInProgress(inquiry, aiResult.suggestedResponse);
          handled++;
        }
      } catch (error) {
        this.logger.error('Failed to process inquiry', error as Error, { inquiryId: inquiry.id });
      }
    }

    return { handled, escalated };
  }

  /**
   * AI 응답 생성
   */
  async generateResponse(inquiryId: string): Promise<{ response: string; confidence: number }> {
    const db = this.getDatabase('inquiries');
    const result = await db.findById<Inquiry>(inquiryId);

    if (result.error || !result.data) {
      return { response: '', confidence: 0 };
    }

    const aiResult = await this.analyzeAndRespond(result.data);
    return {
      response: aiResult.suggestedResponse,
      confidence: aiResult.confidence,
    };
  }

  /**
   * 문의 분석 및 응답 생성
   */
  private async analyzeAndRespond(inquiry: Inquiry): Promise<AIResponseResult> {
    // 1. 문의 유형 분류
    const classifiedType = this.classifyInquiryType(inquiry.content);

    // 2. 키워드 매칭으로 FAQ 찾기
    const matchedFAQ = this.findMatchingFAQ(inquiry.content, classifiedType);

    // 3. 응답 생성
    if (matchedFAQ) {
      const confidence = this.calculateConfidence(inquiry.content, matchedFAQ);

      return {
        inquiryId: inquiry.id,
        suggestedResponse: this.personalizeResponse(matchedFAQ.answer, inquiry),
        confidence,
        autoRespond: confidence >= this.autoResponseConfig.confidenceThreshold,
        requiresHumanReview: confidence < 0.5,
        reasoning: `FAQ 매칭: ${matchedFAQ.id}`,
        relatedFAQs: [matchedFAQ.id],
      };
    }

    // FAQ 매칭 실패 시
    return {
      inquiryId: inquiry.id,
      suggestedResponse: this.generateGenericResponse(inquiry),
      confidence: 0.3,
      autoRespond: false,
      requiresHumanReview: true,
      reasoning: '매칭되는 FAQ가 없습니다. 수동 응답 필요.',
    };
  }

  /**
   * 문의 유형 분류
   */
  private classifyInquiryType(content: string): InquiryType {
    const lowerContent = content.toLowerCase();

    const typeKeywords: Record<InquiryType, string[]> = {
      [InquiryType.DELIVERY]: ['배송', '배달', '도착', '운송장', '택배'],
      [InquiryType.RETURN_EXCHANGE]: ['반품', '교환', '환불', '취소', '반송'],
      [InquiryType.PRODUCT]: ['상품', '제품', '사이즈', '색상', '재질', '재입고'],
      [InquiryType.PAYMENT]: ['결제', '카드', '입금', '계좌', '영수증'],
      [InquiryType.CANCEL]: ['취소', '주문취소'],
      [InquiryType.AS]: ['수리', 'as', 'a/s', '고장', '불량'],
      [InquiryType.COMPLAINT]: ['불만', '항의', '실망', '화가', '최악'],
      [InquiryType.RECOMMENDATION]: ['추천', '어울리', '어떤게'],
      [InquiryType.STOCK]: ['재고', '재입고', '품절'],
      [InquiryType.GENERAL]: [],
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some((keyword) => lowerContent.includes(keyword))) {
        return type as InquiryType;
      }
    }

    return InquiryType.GENERAL;
  }

  /**
   * FAQ 매칭
   */
  private findMatchingFAQ(content: string, type: InquiryType): FAQTemplate | null {
    const lowerContent = content.toLowerCase();

    // 해당 유형의 FAQ 중 키워드 매칭
    const typeMatched = this.faqTemplates.filter((faq) => faq.type === type);

    for (const faq of typeMatched) {
      const matchCount = faq.keywords.filter((keyword) => lowerContent.includes(keyword)).length;
      if (matchCount >= 2) {
        return faq;
      }
    }

    // 전체 FAQ에서 키워드 매칭
    for (const faq of this.faqTemplates) {
      const matchCount = faq.keywords.filter((keyword) => lowerContent.includes(keyword)).length;
      if (matchCount >= 2) {
        return faq;
      }
    }

    return null;
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(content: string, faq: FAQTemplate): number {
    const lowerContent = content.toLowerCase();
    const matchedKeywords = faq.keywords.filter((keyword) => lowerContent.includes(keyword));
    const matchRatio = matchedKeywords.length / faq.keywords.length;

    // 기본 신뢰도 (키워드 매칭 비율 기반)
    let confidence = 0.5 + matchRatio * 0.4;

    // 문의 길이가 너무 길면 신뢰도 감소 (복잡한 문의일 가능성)
    if (content.length > 200) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 응답 개인화
   */
  private personalizeResponse(template: string, inquiry: Inquiry): string {
    return template
      .replace('{customerName}', inquiry.customerName || '고객')
      .replace('{orderId}', inquiry.orderId || '');
  }

  /**
   * 일반 응답 생성
   */
  private generateGenericResponse(inquiry: Inquiry): string {
    return `안녕하세요, 썬데이허그입니다.

문의해 주셔서 감사합니다.
확인 후 빠른 시일 내에 답변드리겠습니다.

추가 문의사항이 있으시면 말씀해 주세요.
감사합니다.`;
  }

  /**
   * 자동 응답 발송
   */
  private async sendAutoResponse(inquiry: Inquiry, response: string): Promise<void> {
    const db = this.getDatabase('inquiries');

    const newResponse: InquiryResponse = {
      id: `resp-${Date.now()}`,
      content: response,
      respondedBy: 'ai',
      agentId: this.config.id,
      createdAt: new Date(),
    };

    await db.update({ id: inquiry.id }, {
      status: InquiryStatus.ANSWERED,
      responses: [...inquiry.responses, newResponse],
      updated_at: new Date(),
    });

    // TODO: 실제 채널로 응답 발송 (카카오톡, 이메일 등)
    this.logger.info('Auto response sent', { inquiryId: inquiry.id });
  }

  /**
   * 문의 에스컬레이션
   */
  private async escalateInquiry(inquiry: Inquiry, reason: string): Promise<void> {
    const db = this.getDatabase('inquiries');

    await db.update({ id: inquiry.id }, {
      status: InquiryStatus.ESCALATED,
      priority: InquiryPriority.HIGH,
      metadata: { ...inquiry.metadata, escalationReason: reason },
      updated_at: new Date(),
    });

    this.logger.info('Inquiry escalated', { inquiryId: inquiry.id, reason });
  }

  /**
   * 처리 중 상태로 변경
   */
  private async markAsInProgress(inquiry: Inquiry, suggestedResponse: string): Promise<void> {
    const db = this.getDatabase('inquiries');

    await db.update({ id: inquiry.id }, {
      status: InquiryStatus.IN_PROGRESS,
      metadata: { ...inquiry.metadata, suggestedResponse },
      updated_at: new Date(),
    });
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'responding',
      message: '문의 응답 처리 중...',
    };
  }
}

export default InquiryResponderSubAgent;
