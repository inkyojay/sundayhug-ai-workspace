// 모든 타입 export
export * from './database';

// 채팅 관련 타입
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolResults?: ToolResult[];
  createdAt: Date;
}

export interface ToolResult {
  toolName: string;
  data: unknown;
  displayType: 'card' | 'table' | 'chart' | 'text';
}

// 대시보드 통계 타입
export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingTickets: number;
  lowStockItems: number;
  pendingApprovals: number;
}

// 필터 타입
export interface OrderFilter {
  channel?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface TicketFilter {
  status?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// 페이지네이션 타입
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
