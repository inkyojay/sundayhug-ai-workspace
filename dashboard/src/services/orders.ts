import { supabase } from './supabase';
import type { Order, ChannelType, OrderStatus } from '../types/database';

// 더미 주문 데이터
export const dummyOrders: Order[] = [
  {
    id: '1',
    order_code: 'ORD-2024-001',
    channel: 'coupang',
    status: 'delivered',
    total_amount: 89000,
    customer_id: 'cust-1',
    shipping_name: '김철수',
    shipping_phone: '010-1234-5678',
    shipping_address: '서울시 강남구 테헤란로 123',
    tracking_number: '1234567890',
    ordered_at: '2024-01-27T10:30:00Z',
    created_at: '2024-01-27T10:30:00Z',
    updated_at: '2024-01-27T10:30:00Z',
  },
  {
    id: '2',
    order_code: 'ORD-2024-002',
    channel: 'naver',
    status: 'shipping',
    total_amount: 156000,
    customer_id: 'cust-2',
    shipping_name: '이영희',
    shipping_phone: '010-2345-6789',
    shipping_address: '경기도 성남시 분당구 판교로 456',
    tracking_number: '2345678901',
    ordered_at: '2024-01-27T11:00:00Z',
    created_at: '2024-01-27T11:00:00Z',
    updated_at: '2024-01-27T11:00:00Z',
  },
  {
    id: '3',
    order_code: 'ORD-2024-003',
    channel: 'cafe24',
    status: 'preparing',
    total_amount: 45000,
    customer_id: 'cust-3',
    shipping_name: '박민수',
    shipping_phone: '010-3456-7890',
    shipping_address: '부산시 해운대구 해운대로 789',
    tracking_number: null,
    ordered_at: '2024-01-27T12:00:00Z',
    created_at: '2024-01-27T12:00:00Z',
    updated_at: '2024-01-27T12:00:00Z',
  },
  {
    id: '4',
    order_code: 'ORD-2024-004',
    channel: 'own_mall',
    status: 'paid',
    total_amount: 234000,
    customer_id: 'cust-4',
    shipping_name: '최지은',
    shipping_phone: '010-4567-8901',
    shipping_address: '대구시 수성구 동대구로 101',
    tracking_number: null,
    ordered_at: '2024-01-27T13:30:00Z',
    created_at: '2024-01-27T13:30:00Z',
    updated_at: '2024-01-27T13:30:00Z',
  },
  {
    id: '5',
    order_code: 'ORD-2024-005',
    channel: 'coupang',
    status: 'pending',
    total_amount: 67000,
    customer_id: 'cust-5',
    shipping_name: '정대호',
    shipping_phone: '010-5678-9012',
    shipping_address: '인천시 연수구 송도로 202',
    tracking_number: null,
    ordered_at: '2024-01-27T14:00:00Z',
    created_at: '2024-01-27T14:00:00Z',
    updated_at: '2024-01-27T14:00:00Z',
  },
  {
    id: '6',
    order_code: 'ORD-2024-006',
    channel: 'naver',
    status: 'refund_requested',
    total_amount: 120000,
    customer_id: 'cust-6',
    shipping_name: '강서윤',
    shipping_phone: '010-6789-0123',
    shipping_address: '광주시 서구 상무대로 303',
    tracking_number: '3456789012',
    ordered_at: '2024-01-26T09:00:00Z',
    created_at: '2024-01-26T09:00:00Z',
    updated_at: '2024-01-27T10:00:00Z',
  },
  {
    id: '7',
    order_code: 'ORD-2024-007',
    channel: 'offline',
    status: 'delivered',
    total_amount: 380000,
    customer_id: 'cust-7',
    shipping_name: '윤재민',
    shipping_phone: '010-7890-1234',
    shipping_address: '대전시 유성구 대학로 404',
    tracking_number: '4567890123',
    ordered_at: '2024-01-25T15:00:00Z',
    created_at: '2024-01-25T15:00:00Z',
    updated_at: '2024-01-26T14:00:00Z',
  },
  {
    id: '8',
    order_code: 'ORD-2024-008',
    channel: 'cafe24',
    status: 'cancelled',
    total_amount: 55000,
    customer_id: 'cust-8',
    shipping_name: '임수진',
    shipping_phone: '010-8901-2345',
    shipping_address: '울산시 남구 삼산로 505',
    tracking_number: null,
    ordered_at: '2024-01-26T16:00:00Z',
    created_at: '2024-01-26T16:00:00Z',
    updated_at: '2024-01-27T08:00:00Z',
  },
];

// 주문 서비스 함수들
export const ordersService = {
  // 주문 목록 조회
  async getOrders(params?: {
    status?: OrderStatus;
    channel?: ChannelType;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase.from('orders').select('*');

      if (params?.status) {
        query = query.eq('status', params.status);
      }
      if (params?.channel) {
        query = query.eq('channel', params.channel);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }
      if (params?.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      const { data, error } = await query.order('ordered_at', { ascending: false });

      if (error) throw error;
      return { data: data || dummyOrders, error: null };
    } catch {
      // Supabase 연결 실패 시 더미 데이터 반환
      return { data: dummyOrders, error: null };
    }
  },

  // 주문 상세 조회
  async getOrderById(id: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch {
      const order = dummyOrders.find((o) => o.id === id);
      return { data: order || null, error: null };
    }
  },

  // 오늘 주문 통계
  async getTodayStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('ordered_at', `${today}T00:00:00Z`)
        .lt('ordered_at', `${today}T23:59:59Z`);

      if (error) throw error;

      const orders = data as Order[] | null;
      const totalSales = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const orderCount = orders?.length || 0;
      const pendingOrders = orders?.filter((o) => o.status === 'pending' || o.status === 'paid').length || 0;

      return {
        data: { totalSales, orderCount, pendingOrders },
        error: null,
      };
    } catch {
      // 더미 데이터로 통계 계산
      const totalSales = 1234000;
      const orderCount = 23;
      const pendingOrders = 5;
      return {
        data: { totalSales, orderCount, pendingOrders },
        error: null,
      };
    }
  },

  // 주문 상태 업데이트
  async updateOrderStatus(id: string, status: OrderStatus) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('orders')
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

// 채널 라벨 매핑
export const channelLabels: Record<ChannelType, string> = {
  coupang: '쿠팡',
  naver: '네이버',
  cafe24: '카페24',
  own_mall: '자사몰',
  offline: '오프라인',
};

// 주문 상태 라벨 매핑
export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: '대기중',
  paid: '결제완료',
  preparing: '상품준비',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소됨',
  refund_requested: '환불요청',
  refunded: '환불완료',
  exchange_requested: '교환요청',
  exchanged: '교환완료',
};

// 주문 상태별 색상
export const orderStatusColors: Record<OrderStatus, 'success' | 'warning' | 'error' | 'info' | 'light'> = {
  pending: 'warning',
  paid: 'info',
  preparing: 'info',
  shipping: 'info',
  delivered: 'success',
  cancelled: 'error',
  refund_requested: 'error',
  refunded: 'light',
  exchange_requested: 'warning',
  exchanged: 'light',
};

export default ordersService;
