/**
 * 채팅 서비스
 *
 * Claude API와 통신하여 AI 응답을 가져옵니다.
 * 현재는 Mock 응답을 반환하며, 실제 API 연동은 추후 구현됩니다.
 */

import type { ChatMessage, ToolResult } from '../types';

// API 응답 타입
interface ChatResponse {
  content: string;
  toolResults?: ToolResult[];
}

// API 설정 (추후 환경변수로 이동)
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
};

/**
 * 채팅 서비스 클래스
 */
class ChatService {
  /**
   * 메시지를 전송하고 AI 응답을 받습니다
   */
  async sendMessage(
    content: string,
    _history: ChatMessage[]
  ): Promise<ChatResponse> {
    // TODO: 실제 API 연동 시 이 부분을 교체
    // return this.callClaudeAPI(content, _history);

    // Mock 응답 (개발용)
    return this.getMockResponse(content);
  }

  /**
   * 실제 Claude API 호출 (추후 구현)
   * @internal 현재는 미사용, 향후 Claude API 연동 시 활성화
   */
  protected async callClaudeAPI(
    content: string,
    history: ChatMessage[]
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_CONFIG.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
        history: history.map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Mock 응답 생성 (개발/테스트용)
   */
  private async getMockResponse(content: string): Promise<ChatResponse> {
    // 응답 지연 시뮬레이션
    await this.delay(800 + Math.random() * 1200);

    // 키워드 기반 응답 분기
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('주문') || lowerContent.includes('order')) {
      return this.getOrderMockResponse();
    }

    if (lowerContent.includes('고객') || lowerContent.includes('customer')) {
      return this.getCustomerMockResponse();
    }

    if (lowerContent.includes('재고') || lowerContent.includes('inventory')) {
      return this.getInventoryMockResponse();
    }

    if (lowerContent.includes('매출') || lowerContent.includes('revenue')) {
      return this.getAnalyticsMockResponse();
    }

    // 기본 응답
    return {
      content: this.getRandomGreeting(content),
    };
  }

  private getOrderMockResponse(): ChatResponse {
    return {
      content:
        '주문 정보를 조회했습니다. 최근 주문 3건의 정보를 결과 패널에서 확인해주세요.',
      toolResults: [
        {
          toolName: 'order-search',
          displayType: 'table',
          data: [
            {
              주문번호: 'ORD-2024-001',
              고객명: '김철수',
              금액: 125000,
              상태: '배송중',
            },
            {
              주문번호: 'ORD-2024-002',
              고객명: '이영희',
              금액: 89000,
              상태: '준비중',
            },
            {
              주문번호: 'ORD-2024-003',
              고객명: '박민수',
              금액: 256000,
              상태: '배송완료',
            },
          ],
        },
      ],
    };
  }

  private getCustomerMockResponse(): ChatResponse {
    return {
      content: '고객 정보를 조회했습니다. 상세 정보는 결과 패널을 확인해주세요.',
      toolResults: [
        {
          toolName: 'customer-info',
          displayType: 'card',
          data: {
            이름: '김철수',
            이메일: 'chulsoo@example.com',
            전화번호: '010-1234-5678',
            등급: 'VIP',
            총주문금액: 1250000,
            주문횟수: 15,
            가입일: '2023-01-15',
          },
        },
      ],
    };
  }

  private getInventoryMockResponse(): ChatResponse {
    return {
      content:
        '재고 현황을 확인했습니다. 부족 재고 3건이 있습니다. 결과 패널에서 확인해주세요.',
      toolResults: [
        {
          toolName: 'inventory-check',
          displayType: 'table',
          data: [
            { 상품코드: 'SKU-001', 상품명: '베이직 티셔츠', 재고: 5, 상태: '부족' },
            { 상품코드: 'SKU-002', 상품명: '청바지', 재고: 23, 상태: '정상' },
            { 상품코드: 'SKU-003', 상품명: '후드집업', 재고: 2, 상태: '부족' },
            { 상품코드: 'SKU-004', 상품명: '맨투맨', 재고: 45, 상태: '정상' },
          ],
        },
      ],
    };
  }

  private getAnalyticsMockResponse(): ChatResponse {
    return {
      content:
        '이번 달 매출 분석 결과입니다. 전월 대비 15% 증가했습니다. 상세 내용은 결과 패널을 확인해주세요.',
      toolResults: [
        {
          toolName: 'analytics',
          displayType: 'card',
          data: {
            총매출: 45600000,
            주문건수: 324,
            평균주문금액: 140740,
            전월대비: '+15%',
            신규고객: 48,
            재구매율: '42%',
          },
        },
      ],
    };
  }

  private getRandomGreeting(userMessage: string): string {
    const greetings = [
      `네, "${userMessage}"에 대해 말씀해 주셨네요. 더 자세한 정보가 필요하시면 말씀해 주세요!`,
      `알겠습니다! 주문 조회, 고객 검색, 재고 확인, 매출 분석 등의 기능을 사용하실 수 있습니다. 어떤 것을 도와드릴까요?`,
      `안녕하세요! 저는 썬데이허그 AI 어시스턴트입니다. 무엇을 도와드릴까요?`,
      `말씀하신 내용을 확인했습니다. 구체적인 작업을 요청해 주시면 바로 처리해 드리겠습니다.`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 스트리밍 응답 (추후 구현)
   */
  async *streamMessage(
    content: string,
    _history: ChatMessage[]
  ): AsyncGenerator<string> {
    // TODO: 실제 스트리밍 API 연동
    const response = await this.getMockResponse(content);
    const words = response.content.split(' ');

    for (const word of words) {
      await this.delay(50);
      yield word + ' ';
    }
  }
}

// 싱글톤 인스턴스 export
export const chatService = new ChatService();
export default chatService;
