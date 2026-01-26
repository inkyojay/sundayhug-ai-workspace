import { supabase } from './supabase';
import type { CSTicket, TicketStatus, TicketPriority } from '../types/database';

// 더미 CS 티켓 데이터
export const dummyCSTickets: CSTicket[] = [
  {
    id: '1',
    ticket_code: 'CS-2024-001',
    customer_id: 'cust-1',
    order_id: '1',
    ticket_type: 'inquiry',
    status: 'open',
    priority: 'high',
    subject: '배송 지연 문의',
    ai_category: '배송',
    ai_sentiment: 'negative',
    created_at: '2024-01-27T09:00:00Z',
    updated_at: '2024-01-27T09:00:00Z',
  },
  {
    id: '2',
    ticket_code: 'CS-2024-002',
    customer_id: 'cust-2',
    order_id: '2',
    ticket_type: 'refund',
    status: 'in_progress',
    priority: 'critical',
    subject: '상품 불량으로 환불 요청',
    ai_category: '환불/교환',
    ai_sentiment: 'negative',
    created_at: '2024-01-27T10:30:00Z',
    updated_at: '2024-01-27T11:00:00Z',
  },
  {
    id: '3',
    ticket_code: 'CS-2024-003',
    customer_id: 'cust-3',
    order_id: null,
    ticket_type: 'inquiry',
    status: 'waiting_customer',
    priority: 'medium',
    subject: '상품 사용 방법 문의',
    ai_category: '상품문의',
    ai_sentiment: 'neutral',
    created_at: '2024-01-27T11:00:00Z',
    updated_at: '2024-01-27T12:00:00Z',
  },
  {
    id: '4',
    ticket_code: 'CS-2024-004',
    customer_id: 'cust-4',
    order_id: '4',
    ticket_type: 'exchange',
    status: 'open',
    priority: 'high',
    subject: '사이즈 교환 요청',
    ai_category: '환불/교환',
    ai_sentiment: 'neutral',
    created_at: '2024-01-27T13:00:00Z',
    updated_at: '2024-01-27T13:00:00Z',
  },
  {
    id: '5',
    ticket_code: 'CS-2024-005',
    customer_id: 'cust-5',
    order_id: '5',
    ticket_type: 'complaint',
    status: 'escalated',
    priority: 'critical',
    subject: '잘못된 상품 배송',
    ai_category: '배송',
    ai_sentiment: 'negative',
    created_at: '2024-01-27T14:00:00Z',
    updated_at: '2024-01-27T15:00:00Z',
  },
  {
    id: '6',
    ticket_code: 'CS-2024-006',
    customer_id: 'cust-6',
    order_id: null,
    ticket_type: 'inquiry',
    status: 'resolved',
    priority: 'low',
    subject: '회원 등급 문의',
    ai_category: '회원',
    ai_sentiment: 'positive',
    created_at: '2024-01-26T09:00:00Z',
    updated_at: '2024-01-26T10:00:00Z',
  },
  {
    id: '7',
    ticket_code: 'CS-2024-007',
    customer_id: 'cust-7',
    order_id: '7',
    ticket_type: 'inquiry',
    status: 'closed',
    priority: 'medium',
    subject: '적립금 사용 문의',
    ai_category: '결제',
    ai_sentiment: 'neutral',
    created_at: '2024-01-25T15:00:00Z',
    updated_at: '2024-01-25T16:00:00Z',
  },
  {
    id: '8',
    ticket_code: 'CS-2024-008',
    customer_id: 'cust-8',
    order_id: null,
    ticket_type: 'inquiry',
    status: 'open',
    priority: 'medium',
    subject: '재입고 알림 신청',
    ai_category: '상품문의',
    ai_sentiment: 'positive',
    created_at: '2024-01-27T16:00:00Z',
    updated_at: '2024-01-27T16:00:00Z',
  },
];

// CS 서비스 함수들
export const csService = {
  // 티켓 목록 조회
  async getTickets(params?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase.from('cs_tickets').select('*');

      if (params?.status) {
        query = query.eq('status', params.status);
      }
      if (params?.priority) {
        query = query.eq('priority', params.priority);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }
      if (params?.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || dummyCSTickets, error: null };
    } catch {
      return { data: dummyCSTickets, error: null };
    }
  },

  // 티켓 상세 조회
  async getTicketById(id: string) {
    try {
      const { data, error } = await supabase
        .from('cs_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch {
      const ticket = dummyCSTickets.find((t) => t.id === id);
      return { data: ticket || null, error: null };
    }
  },

  // 대기 중인 티켓 통계
  async getPendingStats() {
    try {
      const { data, error } = await supabase
        .from('cs_tickets')
        .select('*')
        .in('status', ['open', 'in_progress', 'escalated']);

      if (error) throw error;

      const tickets = data as CSTicket[] | null;
      const pendingCount = tickets?.filter((t) => t.status === 'open').length || 0;
      const inProgressCount = tickets?.filter((t) => t.status === 'in_progress').length || 0;
      const escalatedCount = tickets?.filter((t) => t.status === 'escalated').length || 0;
      const criticalCount = tickets?.filter((t) => t.priority === 'critical').length || 0;

      return {
        data: { pendingCount, inProgressCount, escalatedCount, criticalCount, total: tickets?.length || 0 },
        error: null,
      };
    } catch {
      // 더미 데이터로 통계 계산
      return {
        data: {
          pendingCount: 3,
          inProgressCount: 2,
          escalatedCount: 1,
          criticalCount: 2,
          total: 6
        },
        error: null,
      };
    }
  },

  // 티켓 상태 업데이트
  async updateTicketStatus(id: string, status: TicketStatus) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cs_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

// 티켓 상태 라벨 매핑
export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: '대기중',
  in_progress: '처리중',
  waiting_customer: '고객응답대기',
  resolved: '해결됨',
  closed: '종료',
  escalated: '에스컬레이션',
};

// 티켓 상태별 색상
export const ticketStatusColors: Record<TicketStatus, 'success' | 'warning' | 'error' | 'info' | 'light'> = {
  open: 'warning',
  in_progress: 'info',
  waiting_customer: 'light',
  resolved: 'success',
  closed: 'light',
  escalated: 'error',
};

// 티켓 우선순위 라벨 매핑
export const ticketPriorityLabels: Record<TicketPriority, string> = {
  critical: '긴급',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

// 티켓 우선순위별 색상
export const ticketPriorityColors: Record<TicketPriority, 'success' | 'warning' | 'error' | 'info' | 'light'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'light',
};

// 티켓 타입 라벨
export const ticketTypeLabels: Record<string, string> = {
  inquiry: '문의',
  complaint: '불만',
  refund: '환불',
  exchange: '교환',
  suggestion: '건의',
};

export default csService;
